// mpl-project/mpl-backend/controllers/leaderboardController.js
const pool = require('../config/db');

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

/**
 * @desc    Get leaderboards (Batting, Bowling, Impact) for a season
 * @route   GET /api/leaderboard?season_id=X
 * @access  Public
 */
exports.getLeaderboards = async (req, res, next) => {
    const { season_id } = req.query;

    if (!season_id || isNaN(parseInt(season_id))) {
        return res.status(400).json({ message: 'Valid season_id query parameter is required.' });
    }

    try {
        const seasonIdNum = parseInt(season_id);

        // Base query joining PlayerMatchStats and Players, filtered by season
        const baseQuery = `
            SELECT
                p.player_id,
                p.name as player_name,
                COUNT(DISTINCT pms.match_id) as matches_played,
                SUM(COALESCE(pms.runs_scored, 0)) as total_runs,
                SUM(COALESCE(pms.balls_faced, 0)) as total_balls_faced,
                SUM(CASE WHEN pms.is_out = TRUE THEN 1 ELSE 0 END) as times_out,
                MAX(COALESCE(pms.runs_scored, 0)) as highest_score, -- Simple Max, not considering not outs
                SUM(COALESCE(pms.fours, 0)) as total_fours,
                SUM(COALESCE(pms.sixes, 0)) as total_sixes,
                SUM(COALESCE(pms.wickets_taken, 0)) as total_wickets,
                SUM(COALESCE(pms.runs_conceded, 0)) as total_runs_conceded,
                SUM(COALESCE(pms.overs_bowled, 0)) as total_overs_bowled, -- Sum of decimals
                SUM(COALESCE(pms.maidens, 0)) as total_maidens,
                SUM(COALESCE(pms.batting_impact_points, 0)) as total_batting_impact,
                SUM(COALESCE(pms.bowling_impact_points, 0)) as total_bowling_impact,
                SUM(COALESCE(pms.fielding_impact_points, 0)) as total_fielding_impact,
                SUM(COALESCE(pms.batting_impact_points, 0) + COALESCE(pms.bowling_impact_points, 0) + COALESCE(pms.fielding_impact_points, 0)) as total_impact
            FROM PlayerMatchStats pms
            JOIN Players p ON pms.player_id = p.player_id
            JOIN Matches m ON pms.match_id = m.match_id
            WHERE m.season_id = ?
            GROUP BY p.player_id, p.name
        `;

        const [allStats] = await pool.query(baseQuery, [seasonIdNum]);

        // Process for leaderboards
        const battingLeaders = allStats
            .filter(s => s.total_runs > 0 || s.matches_played > 0) // Consider players who played
            .map(s => ({
                player_id: s.player_id,
                player_name: s.player_name,
                matches: s.matches_played,
                runs: s.total_runs,
                avg: calculateAvg(s.total_runs, s.times_out),
                sr: calculateSR(s.total_runs, s.total_balls_faced),
                hs: s.highest_score, // Simple highest for now
                fours: s.total_fours,
                sixes: s.total_sixes,
            }))
            .sort((a, b) => b.runs - a.runs) // Sort by runs descending
            .slice(0, 20); // Limit to top 20

        const bowlingLeaders = allStats
            .filter(s => s.total_overs_bowled > 0) // Consider only players who bowled
            .map(s => ({
                player_id: s.player_id,
                player_name: s.player_name,
                matches: s.matches_played,
                wickets: s.total_wickets,
                runs: s.total_runs_conceded,
                overs: formatOversDisplay(s.total_overs_bowled), // Format overs
                econ: calculateEcon(s.total_runs_conceded, s.total_overs_bowled),
                // avg: calculateBowlAvg(s.total_runs_conceded, s.total_wickets), // Need helper
                // sr: calculateBowlSR(s.total_overs_bowled, s.total_wickets) // Need helper
            }))
            .sort((a, b) => b.wickets - a.wickets || (a.econ ?? 999) - (b.econ ?? 999)) // Sort by wickets, then econ asc
            .slice(0, 20); // Limit

        const impactLeaders = allStats
             .map(s => ({
                player_id: s.player_id,
                player_name: s.player_name,
                matches: s.matches_played,
                total_impact: s.total_impact,
                bat_impact: s.total_batting_impact,
                bowl_impact: s.total_bowling_impact,
                field_impact: s.total_fielding_impact,
             }))
             .sort((a, b) => b.total_impact - a.total_impact) // Sort by total impact desc
             .slice(0, 20); // Limit

        res.json({
            batting: battingLeaders,
            bowling: bowlingLeaders,
            impact: impactLeaders
        });

    } catch (error) {
        console.error("Get Leaderboards Error:", error);
        next(error);
    }
};

// Helper function to format overs display (duplicate from above, consider moving to shared utils)
const formatOversDisplay = (oversDecimal) => {
    if (oversDecimal == null || isNaN(oversDecimal)) return "-";
    const completedOvers = Math.floor(oversDecimal);
    const ballsInPartialOver = Math.round((oversDecimal - completedOvers) * 10);
    if (ballsInPartialOver === 0 && oversDecimal === completedOvers) return `${completedOvers}.0`;
    return `${completedOvers}.${ballsInPartialOver}`;
};