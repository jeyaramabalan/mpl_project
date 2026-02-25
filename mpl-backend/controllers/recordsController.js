// mpl-backend/controllers/recordsController.js
// Records page: batting, bowling, fielding, team, and awards (MoM, MVP, Impact, Best Debut).
// GET /api/records?season_id=X|all&scope=individual|team

const pool = require('../config/db');
const { ballsToOversDecimal, formatOversDisplay } = require('../utils/statsCalculations');

const MIN_BALLS_SR = 30;
const MIN_OVERS_ECON = 5;
const TOP_LIMIT = 15;

function seasonFilter(seasonId) {
    if (seasonId === 'all' || seasonId === null) return { clause: '', params: [] };
    return { clause: 'AND m.season_id = ?', params: [parseInt(seasonId)] };
}

/**
 * @route   GET /api/records?season_id=X|all&scope=individual|team
 */
exports.getRecords = async (req, res, next) => {
    const { season_id, scope } = req.query;
    const seasonId = season_id === 'all' || !season_id ? 'all' : season_id;
    const isTeam = scope === 'team';

    if (season_id && season_id !== 'all' && isNaN(parseInt(season_id))) {
        return res.status(400).json({ message: 'Invalid season_id.' });
    }

    const { clause: seasonClause, params: seasonParams } = seasonFilter(seasonId);

    try {
        const result = {
            season_id: seasonId === 'all' ? null : parseInt(seasonId),
            scope: isTeam ? 'team' : 'individual',
            batting: {},
            bowling: {},
            fielding: {},
            team: {},
            awards: {},
        };

        // ---------- INDIVIDUAL RECORDS (from playermatchstats + matches) ----------
        if (!isTeam) {
            const baseJoin = `
                FROM playermatchstats pms
                JOIN players p ON pms.player_id = p.player_id
                JOIN matches m ON pms.match_id = m.match_id
            `;
            const baseWhere = ` WHERE m.status = 'Completed' ${seasonClause}`;
            const baseParams = [...seasonParams];

            // Highest Individual Score (best single match score)
            const [highestScore] = await pool.query(
                `SELECT p.player_id, p.name as player_name, pms.match_id, pms.runs_scored as value, m.match_datetime, t1.name as team1_name, t2.name as team2_name
                ${baseJoin}
                LEFT JOIN teams t1 ON m.team1_id = t1.team_id
                LEFT JOIN teams t2 ON m.team2_id = t2.team_id
                ${baseWhere}
                ORDER BY pms.runs_scored DESC LIMIT ?`,
                [...baseParams, TOP_LIMIT]
            );
            result.batting.highestScore = highestScore;

            // Most Runs (aggregate)
            const [mostRuns] = await pool.query(
                `SELECT p.player_id, p.name as player_name,
                 SUM(COALESCE(pms.runs_scored, 0)) as value,
                 COUNT(DISTINCT pms.match_id) as matches
                ${baseJoin} ${baseWhere}
                GROUP BY p.player_id, p.name
                HAVING value > 0
                ORDER BY value DESC LIMIT ?`,
                [...baseParams, TOP_LIMIT]
            );
            result.batting.mostRuns = mostRuns.map(r => ({ ...r, value: Number(r.value), matches: r.matches }));

            // Highest Strike Rate (min 30 balls) — ORDER BY uses full expression (MySQL can reject alias ref to group function)
            const [srRows] = await pool.query(
                `SELECT p.player_id, p.name as player_name,
                 SUM(COALESCE(pms.runs_scored, 0)) as runs,
                 SUM(COALESCE(pms.balls_faced, 0)) as balls
                ${baseJoin} ${baseWhere}
                GROUP BY p.player_id, p.name
                HAVING SUM(COALESCE(pms.balls_faced, 0)) >= ?
                ORDER BY (SUM(COALESCE(pms.runs_scored, 0)) / NULLIF(SUM(COALESCE(pms.balls_faced, 0)), 0) * 100) DESC LIMIT ?`,
                [...baseParams, MIN_BALLS_SR, TOP_LIMIT]
            );
            result.batting.highestStrikeRate = srRows.map(r => {
                const balls = Number(r.balls) || 0;
                const runs = Number(r.runs) || 0;
                return {
                    player_id: r.player_id,
                    player_name: r.player_name,
                    value: balls > 0 ? parseFloat((runs / balls * 100).toFixed(2)) : 0,
                    runs,
                    balls,
                };
            });

            // Most Fours, Most Twos
            const [mostFours] = await pool.query(
                `SELECT p.player_id, p.name as player_name, SUM(COALESCE(pms.fours, 0)) as value ${baseJoin} ${baseWhere} GROUP BY p.player_id, p.name HAVING value > 0 ORDER BY value DESC LIMIT ?`,
                [...baseParams, TOP_LIMIT]
            );
            result.batting.mostFours = mostFours.map(r => ({ ...r, value: Number(r.value) }));

            const [mostTwos] = await pool.query(
                `SELECT p.player_id, p.name as player_name, SUM(COALESCE(pms.twos, 0)) as value ${baseJoin} ${baseWhere} GROUP BY p.player_id, p.name HAVING value > 0 ORDER BY value DESC LIMIT ?`,
                [...baseParams, TOP_LIMIT]
            );
            result.batting.mostTwos = mostTwos.map(r => ({ ...r, value: Number(r.value) }));

            // Most Ducks (is_out and runs_scored = 0 in same match)
            const [mostDucks] = await pool.query(
                `SELECT p.player_id, p.name as player_name, COUNT(*) as value
                ${baseJoin} ${baseWhere} AND pms.is_out = 1 AND COALESCE(pms.runs_scored, 0) = 0
                GROUP BY p.player_id, p.name
                ORDER BY value DESC LIMIT ?`,
                [...baseParams, TOP_LIMIT]
            );
            result.batting.mostDucks = mostDucks.map(r => ({ ...r, value: Number(r.value) }));

            // Best Bowling Figures (per match: wickets desc, runs asc)
            const [bestBowlingRows] = await pool.query(
                `SELECT p.player_id, p.name as player_name, pms.match_id, pms.wickets_taken as wickets, pms.runs_conceded as runs, m.match_datetime, t1.name as team1_name, t2.name as team2_name
                ${baseJoin}
                LEFT JOIN teams t1 ON m.team1_id = t1.team_id
                LEFT JOIN teams t2 ON m.team2_id = t2.team_id
                ${baseWhere} AND pms.wickets_taken > 0
                ORDER BY pms.wickets_taken DESC, pms.runs_conceded ASC LIMIT ?`,
                [...baseParams, TOP_LIMIT]
            );
            result.bowling.bestBowlingFigures = bestBowlingRows.map(r => ({
                ...r,
                value: `${r.wickets}/${r.runs}`,
                wickets: Number(r.wickets),
                runs: Number(r.runs),
            }));

            // Most Wickets
            const [mostWickets] = await pool.query(
                `SELECT p.player_id, p.name as player_name, SUM(COALESCE(pms.wickets_taken, 0)) as value, COUNT(DISTINCT pms.match_id) as matches
                ${baseJoin} ${baseWhere}
                GROUP BY p.player_id, p.name
                HAVING value > 0
                ORDER BY value DESC LIMIT ?`,
                [...baseParams, TOP_LIMIT]
            );
            result.bowling.mostWickets = mostWickets.map(r => ({ ...r, value: Number(r.value), matches: r.matches }));

            // Best Economy (min 2 overs) — HAVING/ORDER BY use full expressions to avoid MySQL alias-on-group-function issues
            const ballsExpr = `SUM(FLOOR(COALESCE(pms.overs_bowled,0)) * 6 + LEAST(5, ROUND((COALESCE(pms.overs_bowled,0) - FLOOR(COALESCE(pms.overs_bowled,0))) * 10)))`;
            const [econRows] = await pool.query(
                `SELECT p.player_id, p.name as player_name,
                 SUM(COALESCE(pms.runs_conceded, 0)) as runs,
                 ${ballsExpr} as balls
                ${baseJoin} ${baseWhere}
                GROUP BY p.player_id, p.name
                HAVING ${ballsExpr} >= ?
                ORDER BY (SUM(COALESCE(pms.runs_conceded, 0)) / (${ballsExpr} / 6)) ASC LIMIT ?`,
                [...baseParams, MIN_OVERS_ECON * 6, TOP_LIMIT]
            );
            result.bowling.bestEconomy = econRows.map(r => {
                const balls = Number(r.balls) || 0;
                const overs = balls / 6;
                const runs = Number(r.runs) || 0;
                return {
                    player_id: r.player_id,
                    player_name: r.player_name,
                    value: overs > 0 ? parseFloat((runs / overs).toFixed(2)) : null,
                    runs,
                    overs: formatOversDisplay(ballsToOversDecimal(balls)),
                };
            });

            // Most Maidens
            const [mostMaidens] = await pool.query(
                `SELECT p.player_id, p.name as player_name, SUM(COALESCE(pms.maidens, 0)) as value ${baseJoin} ${baseWhere} GROUP BY p.player_id, p.name HAVING value > 0 ORDER BY value DESC LIMIT ?`,
                [...baseParams, TOP_LIMIT]
            );
            result.bowling.mostMaidens = mostMaidens.map(r => ({ ...r, value: Number(r.value) }));

            // Most 3-wicket hauls, 5-wicket hauls
            const [threeHauls] = await pool.query(
                `SELECT p.player_id, p.name as player_name, COUNT(*) as value
                ${baseJoin} ${baseWhere} AND pms.wickets_taken >= 3
                GROUP BY p.player_id, p.name ORDER BY value DESC LIMIT ?`,
                [...baseParams, TOP_LIMIT]
            );
            result.bowling.mostThreeWicketHauls = threeHauls.map(r => ({ ...r, value: Number(r.value) }));

            const [fiveHauls] = await pool.query(
                `SELECT p.player_id, p.name as player_name, COUNT(*) as value
                ${baseJoin} ${baseWhere} AND pms.wickets_taken >= 5
                GROUP BY p.player_id, p.name ORDER BY value DESC LIMIT ?`,
                [...baseParams, TOP_LIMIT]
            );
            result.bowling.mostFiveWicketHauls = fiveHauls.map(r => ({ ...r, value: Number(r.value) }));

            // Fielding: Most Catches, Run-outs, Stumpings, Best Fielding Impact
            const [mostCatches] = await pool.query(
                `SELECT p.player_id, p.name as player_name, SUM(COALESCE(pms.catches, 0)) as value ${baseJoin} ${baseWhere} GROUP BY p.player_id, p.name HAVING value > 0 ORDER BY value DESC LIMIT ?`,
                [...baseParams, TOP_LIMIT]
            );
            result.fielding.mostCatches = mostCatches.map(r => ({ ...r, value: Number(r.value) }));

            const [mostRunOuts] = await pool.query(
                `SELECT p.player_id, p.name as player_name, SUM(COALESCE(pms.run_outs, 0)) as value ${baseJoin} ${baseWhere} GROUP BY p.player_id, p.name HAVING value > 0 ORDER BY value DESC LIMIT ?`,
                [...baseParams, TOP_LIMIT]
            );
            result.fielding.mostRunOuts = mostRunOuts.map(r => ({ ...r, value: Number(r.value) }));

            const [mostStumpings] = await pool.query(
                `SELECT p.player_id, p.name as player_name, SUM(COALESCE(pms.stumps, 0)) as value ${baseJoin} ${baseWhere} GROUP BY p.player_id, p.name HAVING value > 0 ORDER BY value DESC LIMIT ?`,
                [...baseParams, TOP_LIMIT]
            );
            result.fielding.mostStumpings = mostStumpings.map(r => ({ ...r, value: Number(r.value) }));

            const [bestFieldingImpact] = await pool.query(
                `SELECT p.player_id, p.name as player_name, SUM(COALESCE(pms.fielding_impact_points, 0)) as value ${baseJoin} ${baseWhere} GROUP BY p.player_id, p.name HAVING value > 0 ORDER BY value DESC LIMIT ?`,
                [...baseParams, TOP_LIMIT]
            );
            result.fielding.bestFieldingImpact = bestFieldingImpact.map(r => ({ ...r, value: parseFloat(Number(r.value).toFixed(2)) }));

            // Awards: Most MoM
            const momWhere = seasonId === 'all' ? 'WHERE m.status = ?' : 'WHERE m.status = ? AND m.season_id = ?';
            const momParams = seasonId === 'all' ? ['Completed'] : ['Completed', parseInt(seasonId)];
            const [mostMoM] = await pool.query(
                `SELECT m.man_of_the_match_player_id as player_id, p.name as player_name, COUNT(*) as value
                FROM matches m
                JOIN players p ON p.player_id = m.man_of_the_match_player_id
                ${momWhere}
                GROUP BY m.man_of_the_match_player_id, p.name
                ORDER BY value DESC LIMIT ?`,
                [...momParams, TOP_LIMIT]
            );
            result.awards.mostMoM = mostMoM.map(r => ({ ...r, value: Number(r.value) }));

            // Highest Impact (All-Time or season) - reuse leaderboard-style aggregation
            const impactWhere = seasonId === 'all' ? 'WHERE m.status = ?' : 'WHERE m.status = ? AND m.season_id = ?';
            const impactParams = seasonId === 'all' ? ['Completed'] : ['Completed', parseInt(seasonId)];
            const [highestImpact] = await pool.query(
                `SELECT p.player_id, p.name as player_name,
                 SUM(COALESCE(pms.batting_impact_points, 0) + COALESCE(pms.bowling_impact_points, 0) + COALESCE(pms.fielding_impact_points, 0)) as value,
                 COUNT(DISTINCT pms.match_id) as matches
                FROM playermatchstats pms
                JOIN players p ON pms.player_id = p.player_id
                JOIN matches m ON pms.match_id = m.match_id
                ${impactWhere}
                GROUP BY p.player_id, p.name
                ORDER BY value DESC LIMIT ?`,
                [...impactParams, TOP_LIMIT]
            );
            result.awards.highestImpact = highestImpact.map(r => ({ ...r, value: parseFloat(Number(r.value).toFixed(2)), matches: r.matches }));

            // MVP Season: rank by MoM count then total impact for selected season
            if (seasonId !== 'all') {
                const sid = parseInt(seasonId);
                const [mvpSeason] = await pool.query(
                    `SELECT p.player_id, p.name as player_name,
                     (SELECT COUNT(*) FROM matches m2 WHERE m2.man_of_the_match_player_id = p.player_id AND m2.season_id = ? AND m2.status = 'Completed') as mom_count,
                     COALESCE((SELECT SUM(pms.batting_impact_points + pms.bowling_impact_points + pms.fielding_impact_points)
                       FROM playermatchstats pms JOIN matches m ON pms.match_id = m.match_id WHERE pms.player_id = p.player_id AND m.season_id = ? AND m.status = 'Completed'), 0) as total_impact
                    FROM players p
                    WHERE p.player_id IN (SELECT man_of_the_match_player_id FROM matches WHERE season_id = ? AND status = 'Completed' AND man_of_the_match_player_id IS NOT NULL)
                    ORDER BY mom_count DESC, total_impact DESC LIMIT ?`,
                    [sid, sid, sid, TOP_LIMIT]
                );
                result.awards.mvpSeason = mvpSeason.map(r => ({
                    player_id: r.player_id,
                    player_name: r.player_name,
                    mom_count: Number(r.mom_count),
                    total_impact: parseFloat(Number(r.total_impact).toFixed(2)),
                }));
            } else {
                result.awards.mvpSeason = [];
            }

            // Best Debut Season: first-time players in latest completed season only
            const [latestSeasonRow] = await pool.query(
                `SELECT MAX(m.season_id) as season_id FROM matches m WHERE m.status = 'Completed'`
            );
            const latestCompletedSeasonId = latestSeasonRow[0]?.season_id;
            if (latestCompletedSeasonId) {
                const [debutants] = await pool.query(
                    `SELECT p.player_id, p.name as player_name,
                     SUM(COALESCE(pms.runs_scored, 0)) as runs,
                     SUM(COALESCE(pms.wickets_taken, 0)) as wickets,
                     SUM(COALESCE(pms.batting_impact_points, 0) + COALESCE(pms.bowling_impact_points, 0) + COALESCE(pms.fielding_impact_points, 0)) as total_impact
                    FROM playermatchstats pms
                    JOIN players p ON pms.player_id = p.player_id
                    JOIN matches m ON pms.match_id = m.match_id AND m.season_id = ?
                    WHERE p.player_id NOT IN (
                      SELECT DISTINCT pms2.player_id FROM playermatchstats pms2
                      JOIN matches m2 ON pms2.match_id = m2.match_id
                      WHERE m2.season_id < ?
                    )
                    GROUP BY p.player_id, p.name
                    ORDER BY total_impact DESC, runs DESC LIMIT ?`,
                    [latestCompletedSeasonId, latestCompletedSeasonId, TOP_LIMIT]
                );
                result.awards.bestDebut = debutants.map(r => ({
                    ...r,
                    season_id: latestCompletedSeasonId,
                    runs: Number(r.runs),
                    wickets: Number(r.wickets),
                    total_impact: parseFloat(Number(r.total_impact).toFixed(2)),
                }));
            } else {
                result.awards.bestDebut = [];
            }
        }

        // ---------- TEAM RECORDS ----------
        const teamSeasonClause = seasonId === 'all' ? '' : 'AND m.season_id = ?';
        const teamSeasonParams = seasonId === 'all' ? [] : [parseInt(seasonId)];

        // Highest Team Score: each innings total with batting team
        const [inningsTotals] = await pool.query(
            `SELECT b.match_id, b.inning_number, SUM(b.runs_scored + COALESCE(b.extra_runs, 0)) AS total
             FROM ballbyball b JOIN matches m ON b.match_id = m.match_id
             WHERE m.status = 'Completed' ${teamSeasonClause}
             GROUP BY b.match_id, b.inning_number`,
            teamSeasonParams
        );
        const matchInnings = {};
        inningsTotals.forEach(row => {
            if (!matchInnings[row.match_id]) matchInnings[row.match_id] = {};
            matchInnings[row.match_id][row.inning_number] = Number(row.total);
        });
        const [matchToss] = await pool.query(
            `SELECT m.match_id, m.team1_id, m.team2_id, m.decision, m.toss_winner_team_id, t1.name as team1_name, t2.name as team2_name
             FROM matches m
             LEFT JOIN teams t1 ON m.team1_id = t1.team_id
             LEFT JOIN teams t2 ON m.team2_id = t2.team_id
             WHERE m.status = 'Completed' ${teamSeasonClause}`,
            teamSeasonParams
        );
        const allTeamScores = [];
        matchToss.forEach(m => {
            const team1BatFirst = (m.decision === 'Bat' && m.toss_winner_team_id === m.team1_id) || (m.decision === 'Bowl' && m.toss_winner_team_id === m.team2_id);
            const inn1 = (matchInnings[m.match_id] || {})[1] || 0;
            const inn2 = (matchInnings[m.match_id] || {})[2] || 0;
            allTeamScores.push({ team_id: m.team1_id, team_name: m.team1_name, match_id: m.match_id, value: team1BatFirst ? inn1 : inn2 });
            allTeamScores.push({ team_id: m.team2_id, team_name: m.team2_name, match_id: m.match_id, value: team1BatFirst ? inn2 : inn1 });
        });
        result.team.highestScore = allTeamScores.filter(r => r.value > 0).sort((a, b) => b.value - a.value).slice(0, TOP_LIMIT);

        // Most Titles: group by team name (not ID) so same name across seasons counts as one
        const [titles] = await pool.query(
            `SELECT wt.name as team_name, COUNT(*) as value
             FROM matches m
             JOIN teams wt ON m.winner_team_id = wt.team_id
             WHERE m.status = 'Completed' AND m.winner_team_id IS NOT NULL
             AND m.match_id IN (SELECT MAX(m2.match_id) FROM matches m2 GROUP BY m2.season_id)
             ${seasonId === 'all' ? '' : 'AND m.season_id = ?'}
             GROUP BY wt.name
             ORDER BY value DESC LIMIT ?`,
            seasonId === 'all' ? [TOP_LIMIT] : [...teamSeasonParams, TOP_LIMIT]
        );
        result.team.mostTitles = titles.map(r => ({ team_name: r.team_name, value: Number(r.value) }));

        // Best NRR: for a specific season use /api/standings from frontend; we don't duplicate NRR calc here
        result.team.bestNRR = [];

        res.json(result);
    } catch (error) {
        console.error('Get Records Error:', error);
        next(error);
    }
};
