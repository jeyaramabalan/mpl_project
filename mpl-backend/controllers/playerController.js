// mpl-project/mpl-backend/controllers/playerController.js
const pool = require('../config/db');

/**
 * @desc    Register a new player
 * @route   POST /api/players
 * @access  Public/Admin (Adjust route access control as needed)
 */
exports.registerPlayer = async (req, res, next) => {
    const { name, email, phone, base_price, role } = req.body;

    // --- Validation ---
    if (!name) {
        return res.status(400).json({ message: 'Player name is required.' });
    }
    // Make email unique and required if used for identification/login later
    // if (!email) {
    //     return res.status(400).json({ message: 'Player email is required.' });
    // }
    // if (email && !/\S+@\S+\.\S+/.test(email)) { // Basic email format check
    //    return res.status(400).json({ message: 'Please provide a valid email address.' });
    // }
    const validRoles = ['Batsman', 'Bowler', 'AllRounder', 'WicketKeeper', null]; // Allow null
     if (role && !validRoles.includes(role)) {
        return res.status(400).json({ message: `Invalid role. Must be one of: ${validRoles.slice(0,-1).join(', ')} or empty.` });
    }
    // --- End Validation ---

    try {
        // Insert player data
        const [result] = await pool.query(
            'INSERT INTO Players (name, email, phone, base_price, role) VALUES (?, ?, ?, ?, ?)',
            [
                name,
                email || null, // Allow null email if not required
                phone || null,
                base_price === undefined || base_price === null ? 100.00 : base_price, // Default base price
                role || null
            ]
        );
        const playerId = result.insertId;

        // Fetch the newly created player to return in the response
        const [newPlayer] = await pool.query('SELECT * FROM Players WHERE player_id = ?', [playerId]);
        if (newPlayer.length === 0) throw new Error('Failed to retrieve newly registered player.');

        res.status(201).json({ message: 'Player registered successfully', player: newPlayer[0] });

    } catch (error) {
        console.error("Player Registration Error:", error);
        // Handle potential unique constraint violation (e.g., on email if made unique)
        if (error.code === 'ER_DUP_ENTRY' && error.message.includes("key 'email'")) {
             return res.status(400).json({ message: 'This email address is already registered.' });
        }
        next(error); // Pass other errors to global handler
    }
};

/**
 * @desc    Get all players (basic list)
 * @route   GET /api/players
 * @access  Public
 */
exports.getAllPlayers = async (req, res, next) => {
    try {
        // Select fewer fields for list view for efficiency
        const [players] = await pool.query('SELECT player_id, name, role FROM Players ORDER BY name ASC');
        res.json(players);
    } catch (error) {
        console.error("Get All Players Error:", error);
         next(error);
    }
};

/**
 * @desc    Get details of a single player by ID
 * @route   GET /api/players/:id
 * @access  Public
 */
exports.getPlayerById = async (req, res, next) => {
     const { id } = req.params;
     if (isNaN(parseInt(id))) {
         return res.status(400).json({ message: 'Invalid Player ID.' });
     }

    try {
        const [players] = await pool.query('SELECT * FROM Players WHERE player_id = ?', [id]);
        if (players.length === 0) {
            return res.status(404).json({ message: 'Player not found.' });
        }
        res.json(players[0]);
    } catch (error) {
        console.error("Get Player By ID Error:", error);
        next(error);
    }
};

/**
 * @desc    Get aggregated player statistics (career or filtered by season)
 * @route   GET /api/players/:id/stats?season_id=X
 * @access  Public
 */
exports.getPlayerStats = async (req, res, next) => {
    const playerId = req.params.id;
    const { season_id } = req.query; // Optional query parameter for season filtering

    if (isNaN(parseInt(playerId))) {
        return res.status(400).json({ message: 'Invalid Player ID.' });
    }
     if (season_id && isNaN(parseInt(season_id))) {
        return res.status(400).json({ message: 'Invalid Season ID provided in query parameter.' });
    }

    try {
        // Base query aggregates stats from PlayerMatchStats joined with Players
        // COALESCE is used to return 0 instead of NULL for players with no stats yet
        let query = `
            SELECT
                p.player_id, p.name, p.role, -- Include basic player info
                COUNT(DISTINCT pms.match_id) as matches_played,
                -- Batting Stats
                COALESCE(SUM(pms.runs_scored), 0) as total_runs,
                COALESCE(SUM(pms.balls_faced), 0) as total_balls_faced,
                COALESCE(SUM(pms.fours), 0) as total_fours,
                COALESCE(SUM(pms.sixes), 0) as total_sixes,
                COALESCE(SUM(CASE WHEN pms.is_out = TRUE THEN 1 ELSE 0 END), 0) as times_out,
                -- Bowling Stats
                COALESCE(SUM(pms.wickets_taken), 0) as total_wickets,
                COALESCE(SUM(pms.runs_conceded), 0) as total_runs_conceded,
                COALESCE(SUM(pms.overs_bowled), 0.0) as total_overs_bowled, -- Decimal overs (e.g., 4.5 for 4 overs 5 balls)
                COALESCE(SUM(pms.maidens), 0) as total_maidens,
                COALESCE(SUM(pms.wides), 0) as total_wides,
                COALESCE(SUM(pms.no_balls), 0) as total_no_balls,
                -- Fielding Stats
                COALESCE(SUM(pms.catches), 0) as total_catches,
                COALESCE(SUM(pms.stumps), 0) as total_stumps,
                COALESCE(SUM(pms.run_outs), 0) as total_run_outs
            FROM Players p
            LEFT JOIN PlayerMatchStats pms ON p.player_id = pms.player_id
        `;
        const params = [];

        // Conditionally add JOIN to Matches if filtering by season_id
        if (season_id) {
             query += ' LEFT JOIN Matches m ON pms.match_id = m.match_id';
        }

        // WHERE clause always filters by player_id
        let whereClause = ' WHERE p.player_id = ?';
        params.push(playerId);

        // Add season filter to WHERE clause if provided
        if (season_id) {
            whereClause += ' AND m.season_id = ?';
            params.push(season_id);
        }

        query += whereClause + ' GROUP BY p.player_id, p.name, p.role'; // Group by player details

        const [statsArr] = await pool.query(query, params);

        // Handle case where player exists but has no stats (or no stats for the specific season)
        if (statsArr.length === 0) {
             // Check if the player actually exists in the Players table
             const [playerCheck] = await pool.query('SELECT player_id, name, role FROM Players WHERE player_id = ?', [playerId]);
             if (playerCheck.length === 0) {
                 // Player ID does not exist at all
                 return res.status(404).json({ message: 'Player not found.' });
             } else {
                 // Player exists, but no stats recorded (or none for the chosen season)
                 // Return basic player info with zeroed stats
                 return res.json({
                     ...playerCheck[0], // Include player_id, name, role
                     matches_played: 0, total_runs: 0, total_balls_faced: 0, total_fours: 0, total_sixes: 0, times_out: 0,
                     total_wickets: 0, total_runs_conceded: 0, total_overs_bowled: 0.0, total_maidens: 0, total_wides: 0, total_no_balls: 0,
                     total_catches: 0, total_stumps: 0, total_run_outs: 0,
                     // Set derived stats to null or 0 as appropriate
                     batting_average: null, batting_strike_rate: null, bowling_average: null, bowling_economy_rate: null, bowling_strike_rate: null
                 });
             }
        }

        // Process the results if stats were found
        let stats = statsArr[0];

        // --- Calculate Derived Statistics ---
        // Batting Average: Runs / Times Out (handle division by zero, infinity if not out)
        stats.batting_average = stats.times_out > 0
            ? (stats.total_runs / stats.times_out)
            : (stats.matches_played > 0 ? Infinity : null); // Indicate Not Out average or null if no matches

        // Batting Strike Rate: (Runs / Balls Faced) * 100 (handle division by zero)
        stats.batting_strike_rate = stats.total_balls_faced > 0
            ? (stats.total_runs / stats.total_balls_faced * 100)
            : null;

        // Bowling: Calculate total balls bowled from decimal overs
        // Example: 4.5 overs = 4 * 6 + 5 = 29 balls
        const totalBallsBowled = Math.floor(stats.total_overs_bowled) * 6 + Math.round((stats.total_overs_bowled % 1) * 10);

        // Bowling Average: Runs Conceded / Wickets Taken (handle division by zero)
        stats.bowling_average = stats.total_wickets > 0
            ? (stats.total_runs_conceded / stats.total_wickets)
            : null; // Null if no wickets taken

        // Bowling Economy Rate: (Runs Conceded / Overs Bowled (as proper overs)) (handle division by zero)
        const properOversBowled = totalBallsBowled / 6;
        stats.bowling_economy_rate = properOversBowled > 0
            ? (stats.total_runs_conceded / properOversBowled)
            : null; // Null if no overs bowled

        // Bowling Strike Rate: Balls Bowled / Wickets Taken (handle division by zero)
        stats.bowling_strike_rate = stats.total_wickets > 0
            ? (totalBallsBowled / stats.total_wickets)
            : null; // Null if no wickets taken

        // --- Formatting Derived Stats (optional) ---
         if (stats.batting_average === Infinity) {
             stats.batting_average_display = "Not Out"; // Provide a display string
             stats.batting_average = null; // Keep numerical value null for sorting/calculations
         } else if (stats.batting_average !== null) {
            stats.batting_average = parseFloat(stats.batting_average.toFixed(2));
            stats.batting_average_display = stats.batting_average;
         } else {
             stats.batting_average_display = "-";
         }

        stats.batting_strike_rate = stats.batting_strike_rate !== null ? parseFloat(stats.batting_strike_rate.toFixed(2)) : null;
        stats.bowling_average = stats.bowling_average !== null ? parseFloat(stats.bowling_average.toFixed(2)) : null;
        stats.bowling_economy_rate = stats.bowling_economy_rate !== null ? parseFloat(stats.bowling_economy_rate.toFixed(2)) : null;
        stats.bowling_strike_rate = stats.bowling_strike_rate !== null ? parseFloat(stats.bowling_strike_rate.toFixed(2)) : null;

        res.json(stats); // Return the stats object including derived values

    } catch (error) {
        console.error("Get Player Stats Error:", error);
        next(error);
    }
};


/**
 * @desc    Update player details
 * @route   PUT /api/players/:id
 * @access  Admin (Protected)
 */
exports.updatePlayer = async (req, res, next) => {
    const { id } = req.params;
    const { name, email, phone, base_price, role } = req.body;

    if (isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'Invalid Player ID.' });
    }
    // Check if any valid update data is provided
    if (name === undefined && email === undefined && phone === undefined && base_price === undefined && role === undefined) {
        return res.status(400).json({ message: 'No update data provided.' });
    }
     // Optional: Validate email format, role value etc. if provided

    try {
        // Check if player exists
        const [existing] = await pool.query('SELECT player_id FROM Players WHERE player_id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Player not found.' });
        }

        // Build fields to update dynamically
        const fieldsToUpdate = {};
        if (name !== undefined) fieldsToUpdate.name = name;
        if (email !== undefined) fieldsToUpdate.email = email || null; // Allow setting email to null if needed
        if (phone !== undefined) fieldsToUpdate.phone = phone || null;
        if (base_price !== undefined) fieldsToUpdate.base_price = base_price;
        if (role !== undefined) fieldsToUpdate.role = role || null; // Allow setting role to null

        // Perform update if there are fields to change
        if (Object.keys(fieldsToUpdate).length > 0) {
            const [result] = await pool.query('UPDATE Players SET ? WHERE player_id = ?', [fieldsToUpdate, id]);
             if (result.affectedRows === 0) {
                console.warn(`Update Player ${id}: Affected rows was 0. Data might be unchanged.`);
             }
        } else {
            // No actual changes were requested if fieldsToUpdate is empty
             return res.status(304).json({ message: 'No changes detected.' }); // Not Modified
        }

        // Fetch updated player details
        const [updatedPlayer] = await pool.query('SELECT * FROM Players WHERE player_id = ?', [id]);
        res.json({ message: 'Player updated successfully', player: updatedPlayer[0] });

    } catch (error) {
        console.error("Update Player Error:", error);
         if (error.code === 'ER_DUP_ENTRY' && error.message.includes("key 'email'")) {
             return res.status(400).json({ message: 'Cannot update: Email address is already in use by another player.' });
        }
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

    // WARNING: Deleting a player can cause issues if they are referenced in Teams (as captain),
    // TeamPlayers, Matches (as MoM), PlayerMatchStats, PlayerRatings, Payments.
    // Ensure your FOREIGN KEY constraints are set appropriately (e.g., ON DELETE SET NULL or ON DELETE RESTRICT).
    // Consider logical deletion (adding an 'is_active' flag) instead of physical deletion.

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Check if player exists
         const [existing] = await connection.query('SELECT player_id FROM Players WHERE player_id = ?', [id]);
        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Player not found.' });
        }

        // --- Handle Foreign Key References BEFORE deleting the player ---
        // Example: Set captain_player_id to NULL in Teams table if this player is captain
        await connection.query('UPDATE Teams SET captain_player_id = NULL WHERE captain_player_id = ?', [id]);
        // Example: Set man_of_the_match_player_id to NULL in Matches
        await connection.query('UPDATE Matches SET man_of_the_match_player_id = NULL WHERE man_of_the_match_player_id = ?', [id]);

        // Decide how to handle other references based on your constraints:
        // - TeamPlayers: DELETE CASCADE might be appropriate if player deletion means removal from all teams.
        // - PlayerMatchStats: Usually keep these stats, so FK should NOT be CASCADE. Deletion might fail if stats exist unless FK allows SET NULL or RESTRICT isn't used.
        // - PlayerRatings: Can either CASCADE delete ratings given/received, or SET NULL on rater/rated IDs.
        // - Payments: Probably RESTRICT deletion or SET NULL on player_id.

        // Assuming TeamPlayers should be deleted if player is deleted (Check schema constraint first!)
        // await connection.query('DELETE FROM TeamPlayers WHERE player_id = ?', [id]);
        // Assuming PlayerRatings should be deleted (Check schema constraint first!)
        // await connection.query('DELETE FROM PlayerRatings WHERE rated_player_id = ? OR rater_player_id = ?', [id, id]);
        // PlayerMatchStats and Payments might prevent deletion if not handled by schema constraints


        // Finally, attempt to delete the player
        const [result] = await connection.query('DELETE FROM Players WHERE player_id = ?', [id]);

        if (result.affectedRows === 0) {
             await connection.rollback();
             // This might happen if the player was already deleted or FK constraints blocked it
             return res.status(404).json({ message: 'Player not found or could not be deleted (possibly due to existing references like match stats).' });
        }

        await connection.commit();
        res.status(200).json({ message: 'Player deleted successfully.' }); // Or 204 No Content

    } catch (error) {
        await connection.rollback();
        console.error("Delete Player Error:", error);
        // Handle specific foreign key constraint violation errors
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ message: 'Cannot delete player. They are referenced in other records (e.g., match stats, payments) that prevent deletion. Check foreign key constraints or remove references first.' });
        }
        next(error);
    } finally {
        connection.release();
    }
};