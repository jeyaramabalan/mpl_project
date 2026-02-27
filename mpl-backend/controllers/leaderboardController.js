// mpl-project/mpl-backend/controllers/leaderboardController.js
const pool = require('../config/db');
const { ballsToOversDecimal } = require('../utils/statsCalculations');

const calculateSR = (runs, balls) => (balls > 0 ? (runs / balls * 100) : 0);
const calculateAvg = (runs, outs) => (outs > 0 ? (runs / outs) : (runs > 0 ? Infinity : 0)); // Handle infinity for not out
const calculateEcon = (runs, oversDecimal) => {
    if (oversDecimal <= 0) return null;
    const completedOvers = Math.floor(oversDecimal);
    const ballsInPartialOver = Math.round((oversDecimal - completedOvers) * 10);
    const totalBalls = (completedOvers * 6) + ballsInPartialOver;
    if (totalBalls === 0) return null;
    const properOvers = totalBalls / 6;
    return runs / properOvers;
};
// Helper function to format overs display
const formatOversDisplay = (oversDecimal) => {
    if (oversDecimal == null || isNaN(oversDecimal)) return "-";
    const completedOvers = Math.floor(oversDecimal);
    const ballsInPartialOver = Math.round((oversDecimal - completedOvers) * 10);
    if (ballsInPartialOver >= 6) return `${completedOvers + 1}.0`; // Handle cases like 4.6 -> 5.0
    return `${completedOvers}.${ballsInPartialOver}`;
};

/**
 * @desc    Get leaderboards (Batting, Bowling, Impact) for a season OR for all-time
 * @route   GET /api/leaderboard?season_id=X or /api/leaderboard?season_id=all
 * @access  Public
 */
exports.getLeaderboard = async (req, res, next) => { // Renamed for consistency with frontend
    const { season_id } = req.query;

    if (!season_id) {
        return res.status(400).json({ message: 'season_id query parameter is required.' });
    }
    
    // --- START OF MERGED CHANGES ---

    // Allow 'all' as a valid season_id, otherwise it must be a number
    if (season_id !== 'all' && isNaN(parseInt(season_id))) {
        return res.status(400).json({ message: 'Valid season_id query parameter is required.' });
    }

    try {
        let seasonFilterQuery = '';
        let queryParams = [];

        if (season_id !== 'all') {
            const seasonIdNum = parseInt(season_id);
            seasonFilterQuery = `WHERE m.season_id = ?`;
            queryParams.push(seasonIdNum);
        }
        // If season_id is 'all', the filter remains empty, and queryParams is empty.

        const baseQuery = `
            SELECT
                p.player_id,
                p.name as player_name,
                COUNT(DISTINCT pms.match_id) as matches_played,
                COUNT(DISTINCT CASE WHEN pms.balls_faced > 0 THEN pms.match_id END) as innings_batted,
                SUM(COALESCE(pms.runs_scored, 0)) as total_runs,
                SUM(COALESCE(pms.balls_faced, 0)) as total_balls_faced,
                SUM(CASE WHEN pms.is_out = TRUE THEN 1 ELSE 0 END) as times_out,
                MAX(COALESCE(pms.runs_scored, 0)) as highest_score, -- Simple Max, not considering not outs
                SUM(COALESCE(pms.fours, 0)) as total_fours,
                SUM(COALESCE(pms.twos, 0)) as total_twos,
                SUM(COALESCE(pms.wickets_taken, 0)) as total_wickets,
                SUM(COALESCE(pms.runs_conceded, 0)) as total_runs_conceded,
                COALESCE(SUM(FLOOR(COALESCE(pms.overs_bowled, 0)) * 6 + LEAST(5, ROUND((COALESCE(pms.overs_bowled, 0) - FLOOR(COALESCE(pms.overs_bowled, 0))) * 10))), 0) as total_balls_bowled,
                SUM(COALESCE(pms.maidens, 0)) as total_maidens,
                SUM(COALESCE(pms.batting_impact_points, 0)) as total_batting_impact,
                SUM(COALESCE(pms.bowling_impact_points, 0)) as total_bowling_impact,
                SUM(COALESCE(pms.fielding_impact_points, 0)) as total_fielding_impact,
                SUM(COALESCE(pms.batting_impact_points, 0) + COALESCE(pms.bowling_impact_points, 0) + COALESCE(pms.fielding_impact_points, 0)) as total_impact
            FROM playermatchstats pms
            JOIN players p ON pms.player_id = p.player_id
            JOIN matches m ON pms.match_id = m.match_id
            ${seasonFilterQuery}
            GROUP BY p.player_id, p.name
        `;

        const [allStats] = await pool.query(baseQuery, queryParams);

        // --- END OF MERGED CHANGES ---
        // (The rest of your processing logic remains the same)

        // Process for leaderboards
        const battingLeaders = allStats
            .filter(s => s.total_runs > 0 || s.matches_played > 0)
            .map(s => {
                const innings = Number(s.innings_batted) || 0;
                const runs = s.total_runs || 0;
                const dismissals = Number(s.times_out) || 0; // innings - not outs
                const avg = dismissals > 0 ? calculateAvg(runs, dismissals) : Infinity; // Infinity => \"Not Out\" in UI
                return {
                    player_id: s.player_id,
                    player_name: s.player_name,
                    matches: s.matches_played,
                    innings,
                    runs,
                    avg,
                    sr: calculateSR(s.total_runs, s.total_balls_faced),
                    hs: s.highest_score,
                    fours: s.total_fours,
                    twos: s.total_twos,
                };
            })
            .sort((a, b) => b.runs - a.runs);

        const bowlingLeaders = allStats
            .filter(s => (s.total_balls_bowled ?? 0) > 0)
            .map(s => {
                const totalOversBowled = ballsToOversDecimal(s.total_balls_bowled ?? 0);
                return {
                    player_id: s.player_id,
                    player_name: s.player_name,
                    matches: s.matches_played,
                    wickets: s.total_wickets,
                    runs: s.total_runs_conceded,
                    overs: formatOversDisplay(totalOversBowled),
                    econ: calculateEcon(s.total_runs_conceded, totalOversBowled),
                };
            })
            .sort((a, b) => b.wickets - a.wickets || (a.econ ?? 999) - (b.econ ?? 999));

        const impactLeaders = allStats
             .map(s => {
                const matches = s.matches_played || 0;
                const totalImpact = s.total_impact || 0;
                const avgImpactPerMatch = matches > 0 ? totalImpact / matches : null;
                return {
                    player_id: s.player_id,
                    player_name: s.player_name,
                    matches,
                    total_impact: totalImpact,
                    bat_impact: s.total_batting_impact,
                    bowl_impact: s.total_bowling_impact,
                    field_impact: s.total_fielding_impact,
                    avg_impact_per_match: avgImpactPerMatch,
                };
             })
             .sort((a, b) => b.total_impact - a.total_impact);

        // Highest Bid Players
        // season_id !== 'all'  -> top absolute bid for that season (one row per player, MAX purchase_price)
        // season_id === 'all'  -> average bid across all seasons (AVG purchase_price), plus seasons count
        let highestBidLeaders = [];
        if (season_id === 'all') {
            const [rows] = await pool.query(
                `
                SELECT
                    tp.player_id,
                    p.name AS player_name,
                    AVG(tp.purchase_price) AS bid_value,
                    COUNT(DISTINCT tp.season_id) AS seasons
                FROM teamplayers tp
                JOIN players p ON tp.player_id = p.player_id
                WHERE tp.purchase_price IS NOT NULL
                  AND tp.purchase_price > 0
                GROUP BY tp.player_id, p.name
                ORDER BY bid_value DESC
                `
            );
            highestBidLeaders = rows.map(r => ({
                player_id: r.player_id,
                player_name: r.player_name,
                bid_value: r.bid_value,
                seasons: r.seasons,
                avg_impact_per_match: null,
            }));
        } else {
            const seasonIdNum = parseInt(season_id);
            const [rows] = await pool.query(
                `
                SELECT
                    tp.player_id,
                    p.name AS player_name,
                    MAX(tp.purchase_price) AS bid_value
                FROM teamplayers tp
                JOIN players p ON tp.player_id = p.player_id
                WHERE tp.season_id = ?
                  AND tp.purchase_price IS NOT NULL
                  AND tp.purchase_price > 0
                GROUP BY tp.player_id, p.name
                ORDER BY bid_value DESC
                `,
                [seasonIdNum]
            );
            highestBidLeaders = rows.map(r => ({
                player_id: r.player_id,
                player_name: r.player_name,
                bid_value: r.bid_value,
                avg_impact_per_match: null,
            }));
        }

        // Fill avg_impact_per_match via a separate query (avoids correlated subquery issues in MySQL)
        if (highestBidLeaders.length > 0) {
            const playerIds = highestBidLeaders.map(r => r.player_id);
            const placeholders = playerIds.map(() => '?').join(',');
            let impactQuery = `
                SELECT player_id,
                    SUM(COALESCE(batting_impact_points,0) + COALESCE(bowling_impact_points,0) + COALESCE(fielding_impact_points,0)) AS total_impact,
                    COUNT(DISTINCT match_id) AS match_count
                FROM playermatchstats
                WHERE player_id IN (${placeholders})
                GROUP BY player_id
            `;
            const impactParams = [...playerIds];
            if (season_id !== 'all') {
                const seasonIdNum = parseInt(season_id);
                impactQuery = `
                    SELECT pms.player_id,
                        SUM(COALESCE(pms.batting_impact_points,0) + COALESCE(pms.bowling_impact_points,0) + COALESCE(pms.fielding_impact_points,0)) AS total_impact,
                        COUNT(DISTINCT pms.match_id) AS match_count
                    FROM playermatchstats pms
                    JOIN matches m ON pms.match_id = m.match_id AND m.season_id = ?
                    WHERE pms.player_id IN (${placeholders})
                    GROUP BY pms.player_id
                `;
                impactParams.unshift(seasonIdNum);
            }
            const [impactRows] = await pool.query(impactQuery, impactParams);
            const impactByPlayer = {};
            impactRows.forEach(row => {
                const avg = row.match_count > 0 ? row.total_impact / row.match_count : null;
                impactByPlayer[row.player_id] = avg != null ? parseFloat(Number(avg).toFixed(2)) : null;
            });
            highestBidLeaders.forEach(r => {
                r.avg_impact_per_match = impactByPlayer[r.player_id] ?? null;
            });
        }

        res.json({
            batting: battingLeaders,
            bowling: bowlingLeaders,
            impact: impactLeaders,
            highest_bid: highestBidLeaders
        });

    } catch (error) {
        console.error("Get Leaderboards Error:", error);
        next(error);
    }
};