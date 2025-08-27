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
                SUM(COALESCE(pms.runs_scored, 0)) as total_runs,
                SUM(COALESCE(pms.balls_faced, 0)) as total_balls_faced,
                SUM(CASE WHEN pms.is_out = TRUE THEN 1 ELSE 0 END) as times_out,
                MAX(COALESCE(pms.runs_scored, 0)) as highest_score, -- Simple Max, not considering not outs
                SUM(COALESCE(pms.fours, 0)) as total_fours,
                SUM(COALESCE(pms.twos, 0)) as total_twos,
                SUM(COALESCE(pms.wickets_taken, 0)) as total_wickets,
                SUM(COALESCE(pms.runs_conceded, 0)) as total_runs_conceded,
                SUM(COALESCE(pms.overs_bowled, 0)) as total_overs_bowled, -- Sum of decimals
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
            .map(s => ({
                player_id: s.player_id,
                player_name: s.player_name,
                matches: s.matches_played,
                runs: s.total_runs,
                avg: calculateAvg(s.total_runs, s.times_out),
                sr: calculateSR(s.total_runs, s.total_balls_faced),
                hs: s.highest_score,
                fours: s.total_fours,
                twos: s.total_twos,
            }))
            .sort((a, b) => b.runs - a.runs)
            .slice(0, 20);

        const bowlingLeaders = allStats
            .filter(s => s.total_overs_bowled > 0)
            .map(s => ({
                player_id: s.player_id,
                player_name: s.player_name,
                matches: s.matches_played,
                wickets: s.total_wickets,
                runs: s.total_runs_conceded,
                overs: formatOversDisplay(s.total_overs_bowled),
                econ: calculateEcon(s.total_runs_conceded, s.total_overs_bowled),
            }))
            .sort((a, b) => b.wickets - a.wickets || (a.econ ?? 999) - (b.econ ?? 999))
            .slice(0, 20);

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
             .sort((a, b) => b.total_impact - a.total_impact)
             .slice(0, 20);

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