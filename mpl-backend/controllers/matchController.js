// mpl-project/mpl-backend/controllers/matchController.js
const pool = require('../config/db');

/**
 * @desc    Get match fixtures (list view, can be filtered)
 * @route   GET /api/matches?season_id=X&status=Y&team_id=Z
 * @access  Public
 */
exports.getFixtures = async (req, res, next) => {
    // Extract potential query parameters for filtering
    const { season_id, status, team_id } = req.query;
    try {
        // Base query joining necessary tables for display
        let query = `
            SELECT
                m.match_id, m.match_datetime, m.status, m.venue, m.result_summary,
                m.season_id, s.name as season_name,
                m.team1_id, t1.name as team1_name,
                m.team2_id, t2.name as team2_name,
                m.winner_team_id, wt.name as winner_team_name,
                m.man_of_the_match_player_id, mom.name as man_of_the_match_name
            FROM matches m
            JOIN seasons s ON m.season_id = s.season_id
            JOIN teams t1 ON m.team1_id = t1.team_id
            JOIN teams t2 ON m.team2_id = t2.team_id
            LEFT JOIN teams wt ON m.winner_team_id = wt.team_id
            LEFT JOIN players mom ON m.man_of_the_match_player_id = mom.player_id

        `;
        const params = [];
        const conditions = [];

        // Add conditions based on query parameters
        if (season_id && !isNaN(parseInt(season_id))) {
            conditions.push('m.season_id = ?');
            params.push(parseInt(season_id));
        }
        if (status) {
             // Optional: Validate status against allowed enum values
             const validStatuses = ['Scheduled', 'Setup', 'Live', 'Completed', 'Abandoned'];
             if (validStatuses.includes(status)) {
                conditions.push('m.status = ?');
                params.push(status);
             } else {
                 console.warn(`Invalid status filter ignored: ${status}`);
             }
        }
        if (team_id && !isNaN(parseInt(team_id))) {
            // Filter matches where the team is either team1 or team2
            conditions.push('(m.team1_id = ? OR m.team2_id = ?)');
            params.push(parseInt(team_id), parseInt(team_id));
        }

        // Append WHERE clause if conditions exist
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Add ordering (e.g., show upcoming first, then recent completed)
        query += ' ORDER BY CASE m.status WHEN "Live" THEN 1 WHEN "Setup" THEN 2 WHEN "Scheduled" THEN 3 ELSE 4 END, m.match_datetime DESC';

        const [matches] = await pool.query(query, params);
        res.json(matches);
    } catch (error) {
        console.error("Get Fixtures Error:", error);
        next(error);
    }
};

/**
 * @desc    Get full details for a single match (for viewer detail page)
 * @route   GET /api/matches/:id
 * @access  Public

exports.getMatchDetails = async (req, res, next) => {
    const { id } = req.params; // Match ID

     if (isNaN(parseInt(id))) {
         return res.status(400).json({ message: 'Invalid Match ID.' });
     }

    try {
         // Query to fetch comprehensive match details
         const query = `
            SELECT
                m.*, -- Select all columns from matches table
                s.name as season_name,
                t1.name as team1_name,
                t2.name as team2_name,
                twt.name as toss_winner_name, -- Name of team that won toss
                wt.name as winner_team_name,  -- Name of winning team (if completed)
                mom.name as man_of_the_match_name -- Name of MoM (if set)
            FROM matches m
            JOIN seasons s ON m.season_id = s.season_id
            JOIN teams t1 ON m.team1_id = t1.team_id
            JOIN teams t2 ON m.team2_id = t2.team_id
            LEFT JOIN teams twt ON m.toss_winner_team_id = twt.team_id
            LEFT JOIN teams wt ON m.winner_team_id = wt.team_id
            LEFT JOIN players mom ON m.man_of_the_match_player_id = mom.player_id
            WHERE m.match_id = ?
        `;
        const [matches] = await pool.query(query, [id]);

        // Check if match was found
        if (matches.length === 0) {
            return res.status(404).json({ message: 'Match not found.' });
        }
        const matchDetails = matches[0];

        // If the match is completed, also fetch the detailed player stats for the scorecard
        let playerStats = [];
        if (matchDetails.status === 'Completed') {
             const [stats] = await pool.query(
                `SELECT
                    pms.*, -- Select all columns from playermatchstats
                    p.name as player_name,
                     -- Determine which team (1 or 2) this player belongs to for display grouping
                    CASE WHEN pms.team_id = m.team1_id THEN 1 ELSE 2 END as team_number
                 FROM playermatchstats pms
                 JOIN players p ON pms.player_id = p.player_id
                 JOIN matches m ON pms.match_id = m.match_id -- Join matches to determine team number
                 WHERE pms.match_id = ?
                 ORDER BY team_number, p.name`, // Order by team, then player name for scorecard
                [id]
            );
            playerStats = stats;
        }

        // Return the combined match details and player stats (if available)
        res.json({ ...matchDetails, playerStats });

    } catch (error) {
        console.error("Get Match Details Error:", error);
        next(error);
    }
};
*/

exports.getMatchDetails = async (req, res, next) => {
    const { id } = req.params; // Match ID
    if (isNaN(parseInt(id))) { return res.status(400).json({ message: 'Invalid Match ID.' }); }

    try {
        // Query to fetch comprehensive match details
        const query = `
           SELECT m.*, s.name as season_name, t1.name as team1_name, t2.name as team2_name,
                  twt.name as toss_winner_name, wt.name as winner_team_name, mom.name as man_of_the_match_name
           FROM matches m
           JOIN seasons s ON m.season_id = s.season_id
           JOIN teams t1 ON m.team1_id = t1.team_id
           JOIN teams t2 ON m.team2_id = t2.team_id
           LEFT JOIN teams twt ON m.toss_winner_team_id = twt.team_id
           LEFT JOIN teams wt ON m.winner_team_id = wt.team_id
           LEFT JOIN players mom ON m.man_of_the_match_player_id = mom.player_id
           WHERE m.match_id = ?
       `;
        const [matches] = await pool.query(query, [id]);

        if (matches.length === 0) { return res.status(404).json({ message: 'Match not found.' }); }
        let matchDetails = matches[0]; // Use let to allow modification

        // If the match is completed, also fetch the detailed player stats and final summaries
        let playerStats = [];
        if (matchDetails.status === 'Completed') {
            const [stats] = await pool.query(
               `SELECT pms.*, p.name as player_name, CASE WHEN pms.team_id = m.team1_id THEN 1 ELSE 2 END as team_number
                FROM playermatchstats pms
                JOIN players p ON pms.player_id = p.player_id
                JOIN matches m ON pms.match_id = m.match_id
                WHERE pms.match_id = ?
                ORDER BY team_number, p.name`, [id]
           );
            playerStats = stats;

            // --- CORRECTED & ENHANCED: Calculate Final Innings Summaries from ballbyball ---
            console.log(`Calculating final summaries for completed match ${id}`);
            const [inningsSummaries] = await pool.query(`
                SELECT
                    inning_number,
                    SUM(runs_scored + extra_runs) as total_score,
                    SUM(is_wicket) as total_wickets,
                    COUNT(CASE WHEN is_extra = false OR extra_type = 'NoBall' THEN 1 END) as total_legal_balls
                FROM ballbyball
                WHERE match_id = ?
                GROUP BY inning_number
                ORDER BY inning_number
            `, [id]);

            // Attach summaries to the matchDetails object
            matchDetails.innings_summaries = inningsSummaries.map(summary => {
                const overs = Math.floor(summary.total_legal_balls / 6);
                const balls = summary.total_legal_balls % 6;
                return {
                    inning_number: summary.inning_number,
                    score: parseInt(summary.total_score), // Ensure it's a number
                    wickets: parseInt(summary.total_wickets), // Ensure it's a number
                    overs_display: `${overs}.${balls}`
                };
            });
            console.log("Calculated Innings Summaries:", matchDetails.innings_summaries);
            // --- END ---
        }

        res.json({ ...matchDetails, playerStats });

    } catch (error) { console.error("Get Match Details Error:", error); next(error); }
};

// @desc    Get ball-by-ball commentary for a match
// @route   GET /api/matches/:id/commentary
// @access  Public
exports.getMatchCommentary = async (req, res, next) => {
    const { id } = req.params;
     if (isNaN(parseInt(id))) return res.status(400).json({ message: 'Invalid Match ID format.' });

    try {
        const [commentary] = await pool.query(
            `SELECT
                b.*,
                batsman.name as batsman_name,
                bowler.name as bowler_name,
                fielder.name as fielder_name
             FROM ballbyball b
             JOIN players batsman ON b.batsman_on_strike_player_id = batsman.player_id
             JOIN players bowler ON b.bowler_player_id = bowler.player_id
             LEFT JOIN players fielder ON b.fielder_player_id = fielder.player_id
             WHERE b.match_id = ?
             ORDER BY b.inning_number ASC, b.over_number ASC, b.ball_number_in_over ASC, b.ball_id ASC`,
            [id]
        );

        res.json(commentary);

    } catch (error) {
        console.error(`Get Commentary Error for Match ${id}:`, error);
        next(error);
    }
};

exports.getMatchState = async (req, res, next) => {
  const { id } = req.params;
  if (isNaN(parseInt(id))) return res.status(400).json({ message: 'Invalid Match ID.' });

  try {
    // Get match status
    const [matchRows] = await pool.query(`SELECT status, team1_id, team2_id FROM matches WHERE match_id = ?`, [id]);
    if (matchRows.length === 0) return res.status(404).json({ message: 'Match not found.' });

    const match = matchRows[0];

    // Get latest ball(s) for commentary
    const [balls] = await pool.query(`
      SELECT b.*, batsman.name as batsman_name, bowler.name as bowler_name, fielder.name as fielder_name
      FROM ballbyball b
      JOIN players batsman ON b.batsman_on_strike_player_id = batsman.player_id
      JOIN players bowler ON b.bowler_player_id = bowler.player_id
      LEFT JOIN players fielder ON b.fielder_player_id = fielder.player_id
      WHERE b.match_id = ?
      ORDER BY b.inning_number ASC, b.over_number ASC, b.ball_number_in_over ASC, b.ball_id ASC
    `, [id]);

    const latestBall = balls[0];

    // Calculate live score
    const [scoreRows] = await pool.query(`
      SELECT
        SUM(runs_scored + extra_runs) as score,
        SUM(is_wicket) as wickets,
        COUNT(CASE WHEN is_extra = false OR extra_type = 'NoBall' THEN 1 END) as legal_balls
      FROM ballbyball
      WHERE match_id = ?
    `, [id]);

    const scoreData = scoreRows[0];
    const overs = Math.floor(scoreData.legal_balls / 6);
    const ballsInOver = scoreData.legal_balls % 6;

    res.json({
  matchId: parseInt(id),
  status: match.status,
  score: scoreData.score || 0,
  wickets: scoreData.wickets || 0,
  overs,
  balls: ballsInOver,
  battingTeamId: match.team1_id,
  bowlingTeamId: match.team2_id,
  commentary: balls // ✅ now includes all commentary
});

  } catch (error) {
    console.error(`Get Match State Error for Match ${id}:`, error);
    next(error);
  }
};

// --- Placeholder Admin Functions (Implement if creating/managing matches via API) ---

/**
 * @desc    Create a new match fixture
 * @route   POST /api/matches
 * @access  Admin (Protected)
 */
// exports.createMatch = async (req, res, next) => { ... }

/**
 * @desc    Update match details (datetime, venue etc.)
 * @route   PUT /api/matches/:id
 * @access  Admin (Protected)
 */
// exports.updateMatch = async (req, res, next) => { ... }

/**
 * @desc    Delete a match fixture
 * @route   DELETE /api/matches/:id
 * @access  Admin (Protected)
 */
// exports.deleteMatch = async (req, res, next) => { ... }