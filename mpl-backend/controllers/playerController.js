// mpl-project/mpl-backend/controllers/playerController.js
const pool = require('../config/db');
const { formatOversDisplay, calculateAvg, calculateSR, calculateEcon } = require('../utils/statsCalculations'); // Assuming utils file exists

/**
 * @desc    Register a new player
 * @route   POST /api/players
 * @access  Admin Protected (via route)
 */
exports.registerPlayer = async (req, res, next) => {
    const { name, base_price, role } = req.body; // Removed email, phone
    // --- Validation ---
    if (!name) { return res.status(400).json({ message: 'Player name is required.' }); }
    const validRoles = ['Batsman', 'Bowler', 'AllRounder', 'WicketKeeper', null];
    if (role && !validRoles.includes(role)) { return res.status(400).json({ message: `Invalid role. Must be one of: ${validRoles.slice(0,-1).join(', ')} or empty.` }); }
    // --- End Validation ---
    try {
        const [result] = await pool.query('INSERT INTO Players (name, base_price, role, current_team_id) VALUES (?, ?, ?, NULL)', [ name, base_price === undefined || base_price === null ? 100.00 : base_price, role || null ]);
        const playerId = result.insertId;
        const [newPlayer] = await pool.query('SELECT player_id, name, base_price, role, current_team_id FROM players WHERE player_id = ?', [playerId]);
        if (newPlayer.length === 0) throw new Error('Failed to retrieve newly registered player.');
        res.status(201).json({ message: 'Player registered successfully', player: newPlayer[0] });
    } catch (error) { console.error("Player Registration Error:", error); next(error); }
};

/**
 * @desc    Get all players (basic list)
 * @route   GET /api/players
 * @access  Public
 */
exports.getAllPlayers = async (req, res, next) => {
    try {
        const [players] = await pool.query('SELECT p.player_id, p.name, p.role, t.name as current_team_name FROM players p LEFT JOIN teams t ON p.current_team_id = t.team_id ORDER BY p.name ASC');
        res.json(players);
    } catch (error) { console.error("Get All Players Error:", error); next(error); }
};

/**
 * @desc    Get details of a single player by ID
 * @route   GET /api/players/:id
 * @access  Public
 */
exports.getPlayerById = async (req, res, next) => {
     const { id } = req.params; if (isNaN(parseInt(id))) { return res.status(400).json({ message: 'Invalid Player ID.' }); }
    try {
        const playerQuery = ` SELECT p.player_id, p.name, p.base_price, p.role, p.current_team_id, t.name as current_team_name FROM players p LEFT JOIN teams t ON p.current_team_id = t.team_id WHERE p.player_id = ? `;
        const [players] = await pool.query(playerQuery, [id]);
        if (players.length === 0) { return res.status(404).json({ message: 'Player not found.' }); }
        const playerData = players[0];
        const impactQuery = ` SELECT SUM(COALESCE(batting_impact_points, 0) + COALESCE(bowling_impact_points, 0) + COALESCE(fielding_impact_points, 0)) as total_impact, COUNT(DISTINCT match_id) as matches_played FROM playermatchstats WHERE player_id = ? GROUP BY player_id `;
        const [impactRes] = await pool.query(impactQuery, [id]); let averageImpact = 0; if (impactRes.length > 0 && impactRes[0].matches_played > 0) { averageImpact = impactRes[0].total_impact / impactRes[0].matches_played; }
        const responseData = { ...playerData, average_impact: parseFloat(averageImpact.toFixed(2)) };
        res.json(responseData);
    } catch (error) { console.error("Get Player By ID Error:", error); next(error); }
};

/**
 * @desc    Get aggregated player statistics (career or filtered by season)
 * @route   GET /api/players/:id/stats?season_id=X
 * @access  Public
 */
exports.getPlayerStats = async (req, res, next) => {
    const playerId = req.params.id;
    const { season_id } = req.query;
    // Use pool directly unless transaction is needed across queries
    // const connection = await pool.getConnection();

    if (isNaN(parseInt(playerId))) { return res.status(400).json({ message: 'Invalid Player ID.' }); }
    if (season_id && isNaN(parseInt(season_id))) { return res.status(400).json({ message: 'Invalid Season ID provided in query parameter.' }); }

    try {
        // --- Query 1: Fetch Main Aggregated Stats ---
        let query = `
            SELECT
                p.player_id, p.name, p.role,
                COUNT(DISTINCT pms.match_id) as matches_played,
                COALESCE(SUM(pms.runs_scored), 0) as total_runs,
                COALESCE(SUM(pms.balls_faced), 0) as total_balls_faced,
                MAX(COALESCE(pms.runs_scored, 0)) as highest_score,
                COALESCE(SUM(pms.fours), 0) as total_fours,
                COALESCE(SUM(pms.twos), 0) as total_twos,
                COALESCE(SUM(CASE WHEN pms.is_out = TRUE THEN 1 ELSE 0 END), 0) as times_out,
                COALESCE(SUM(pms.wickets_taken), 0) as total_wickets,
                COALESCE(SUM(pms.runs_conceded), 0) as total_runs_conceded,
                COALESCE(SUM(pms.overs_bowled), 0.0) as total_overs_bowled,
                COALESCE(SUM(pms.maidens), 0) as total_maidens,
                COALESCE(SUM(pms.wides), 0) as total_wides,
                COALESCE(SUM(pms.no_balls), 0) as total_no_balls,
                COALESCE(SUM(pms.catches), 0) as total_catches,
                COALESCE(SUM(pms.stumps), 0) as total_stumps,
                COALESCE(SUM(pms.run_outs), 0) as total_run_outs,
                COALESCE(SUM(pms.batting_impact_points), 0) as total_batting_impact,
                COALESCE(SUM(pms.bowling_impact_points), 0) as total_bowling_impact,
                COALESCE(SUM(pms.fielding_impact_points), 0) as total_fielding_impact
            FROM players p
            LEFT JOIN playermatchstats pms ON p.player_id = pms.player_id
        `;
        const params = [];
        let joinClause = '';
        let whereClause = ' WHERE p.player_id = ?'; params.push(playerId);

        if (season_id) {
            joinClause = ' LEFT JOIN matches m ON pms.match_id = m.match_id';
            whereClause += ' AND m.season_id = ?'; params.push(season_id);
        }
        query += joinClause + whereClause + ' GROUP BY p.player_id, p.name, p.role';

        const [statsArr] = await pool.query(query, params); // Use pool

        // --- Handle No Stats Found ---
        if (statsArr.length === 0) {
             const [playerCheck] = await pool.query('SELECT player_id, name, role FROM players WHERE player_id = ?', [playerId]);
             if (playerCheck.length === 0) { return res.status(404).json({ message: 'Player not found.' }); }
             else { return res.json({ ...playerCheck[0], matches_played: 0, total_runs: 0, total_balls_faced: 0, highest_score: 0, total_fours: 0, total_twos: 0, times_out: 0, total_wickets: 0, total_runs_conceded: 0, total_overs_bowled: 0.0, total_maidens: 0, total_wides: 0, total_no_balls: 0, total_catches: 0, total_stumps: 0, total_run_outs: 0, total_batting_impact: 0, total_bowling_impact: 0, total_fielding_impact: 0, average_impact: 0, super_overs_bowled: 0, batting_average: null, batting_strike_rate: null, bowling_average: null, bowling_economy_rate: null, bowling_strike_rate: null }); } // Added super_overs_bowled: 0
        }

        let stats = statsArr[0];

        // --- Query 2: Calculate Super Overs Bowled --- // ADDED THIS QUERY
        let superOverQuery = `
            SELECT COUNT(DISTINCT b.match_id) as super_overs_bowled
            FROM ballbyball b
            JOIN matches m ON b.match_id = m.match_id
            WHERE b.bowler_player_id = ?
              AND b.over_number = m.super_over_number
        `;
        const superOverParams = [playerId];
        if (season_id) {
            superOverQuery += ' AND m.season_id = ?';
            superOverParams.push(season_id);
        }
        const [superOverRes] = await pool.query(superOverQuery, superOverParams);
        stats.super_overs_bowled = superOverRes[0]?.super_overs_bowled || 0; // Add to stats object
        // --- End Super Over Query ---

        // --- Calculate Derived Statistics ---
        stats.batting_average = calculateAvg(stats.total_runs, stats.times_out);
        stats.batting_strike_rate = calculateSR(stats.total_runs, stats.total_balls_faced);
        stats.bowling_economy_rate = calculateEcon(stats.total_runs_conceded, stats.total_overs_bowled);
        const totalImpact = (stats.total_batting_impact || 0) + (stats.total_bowling_impact || 0) + (stats.total_fielding_impact || 0);
        stats.average_impact = stats.matches_played > 0 ? totalImpact / stats.matches_played : 0;

        // --- Formatting ---
        if (stats.batting_average === Infinity) { stats.batting_average_display = "Not Out"; stats.batting_average = null; }
        else { stats.batting_average_display = stats.batting_average !== null ? stats.batting_average.toFixed(2) : '-'; }
        stats.batting_strike_rate = stats.batting_strike_rate !== null ? parseFloat(stats.batting_strike_rate.toFixed(2)) : null;
        stats.bowling_economy_rate = stats.bowling_economy_rate !== null ? parseFloat(stats.bowling_economy_rate.toFixed(2)) : null;
        stats.average_impact = parseFloat(stats.average_impact.toFixed(2));

        res.json(stats);
    } catch (error) { console.error("Get Player Stats Error:", error); next(error); }
    // finally { if (connection) connection.release(); } // Remove if not using connection
};
    
/**
 * @desc    Update player details
 * @route   PUT /api/players/:id
 * @access  Admin (Protected)
 */
exports.updatePlayer = async (req, res, next) => {
    const { id } = req.params;
    // MODIFIED: Removed email, phone
    const { name, base_price, role } = req.body;

    if (isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'Invalid Player ID.' });
    }
    // Check if any valid update data is provided
    if (name === undefined && base_price === undefined && role === undefined) {
        return res.status(400).json({ message: 'No update data provided (name, base_price, role).' });
    }

    try {
        // Check if player exists
        const [existing] = await pool.query('SELECT player_id FROM players WHERE player_id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Player not found.' });
        }

        // Build fields to update dynamically
        const fieldsToUpdate = {};
        if (name !== undefined) fieldsToUpdate.name = name;
        if (base_price !== undefined) fieldsToUpdate.base_price = base_price;
        if (role !== undefined) fieldsToUpdate.role = role || null;

        // Perform update if there are fields to change
        if (Object.keys(fieldsToUpdate).length > 0) {
            const [result] = await pool.query('UPDATE Players SET ? WHERE player_id = ?', [fieldsToUpdate, id]);
             if (result.affectedRows === 0) {
                console.warn(`Update Player ${id}: Affected rows was 0. Data might be unchanged.`);
             }
        } else {
             return res.status(304).json({ message: 'No changes detected.' });
        }

        // Fetch updated player details (excluding sensitive/derived fields)
        const [updatedPlayer] = await pool.query('SELECT player_id, name, base_price, role, current_team_id FROM players WHERE player_id = ?', [id]);
        res.json({ message: 'Player updated successfully', player: updatedPlayer[0] });

    } catch (error) {
        console.error("Update Player Error:", error);
        next(error);
    }
};

/**
 * @desc    Delete a player (Use with caution!)
 * @route   DELETE /api/players/:id
 * @access  Admin (Protected)
 */
exports.deletePlayer = async (req, res, next) => {
    const { id } = req.params;
    if (isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'Invalid Player ID.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Check if player exists
         const [existing] = await connection.query('SELECT player_id FROM players WHERE player_id = ?', [id]);
        if (existing.length === 0) {
            await connection.rollback(); return res.status(404).json({ message: 'Player not found.' });
        }

        // --- Handle Foreign Key References ---
        await connection.query('UPDATE Teams SET captain_player_id = NULL WHERE captain_player_id = ?', [id]);
        await connection.query('UPDATE Matches SET man_of_the_match_player_id = NULL WHERE man_of_the_match_player_id = ?', [id]);
        // Assuming ratings should be kept but reference nulled (adjust if cascading delete is desired)
        // await connection.query('UPDATE PlayerRatings SET rater_player_id = NULL WHERE rater_player_id = ?', [id]);
        // await connection.query('UPDATE PlayerRatings SET rated_player_id = NULL WHERE rated_player_id = ?', [id]);

        // Explicitly delete from TeamPlayers junction table
        await connection.query('DELETE FROM teamplayers WHERE player_id = ?', [id]);
        console.log(`Deleted TeamPlayers entries for player ${id}`);

        // NOTE: Deletion will fail if player has stats in PlayerMatchStats and FK constraint is RESTRICT.
        // Handle this based on your desired behavior (e.g., delete stats too? Disallow player delete?).

        // Finally, attempt to delete the player
        const [result] = await connection.query('DELETE FROM players WHERE player_id = ?', [id]);

        if (result.affectedRows === 0) {
             await connection.rollback();
             return res.status(404).json({ message: 'Player not found or could not be deleted (possibly due to existing references like match stats).' });
        }

        await connection.commit();
        res.status(200).json({ message: 'Player deleted successfully.' });

    } catch (error) {
        await connection.rollback();
        console.error("Delete Player Error:", error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ message: 'Cannot delete player. They are referenced in other records (e.g., match stats, payments) that prevent deletion. Check foreign key constraints or remove references first.' });
        }
        next(error);
    } finally {
        connection.release();
    }
};