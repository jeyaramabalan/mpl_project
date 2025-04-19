// mpl-project/mpl-backend/controllers/admin/matchAdminController.js
const pool = require('../../config/db');

// Helper function to validate team IDs exist for a specific season
async function validateTeamsForSeason(teamIds, seasonId, connection) {
    // Ensure inputs are valid before proceeding
    if (!seasonId || isNaN(parseInt(seasonId))) {
        throw new Error('Invalid Season ID provided for team validation.');
    }
    if (!teamIds || !Array.isArray(teamIds) || teamIds.length === 0) {
        return true; // No teams to validate
    }

    // Filter out null/undefined/non-numeric IDs and get unique ones
    const uniqueTeamIds = [...new Set(teamIds
        .filter(id => id != null && !isNaN(parseInt(id)))
        .map(id => parseInt(id))
    )];

    if (uniqueTeamIds.length === 0) {
        return true; // Only invalid IDs were passed
    }

    const placeholders = uniqueTeamIds.map(() => '?').join(',');
    const sql = `SELECT COUNT(DISTINCT team_id) as count FROM Teams WHERE season_id = ? AND team_id IN (${placeholders})`;
    const params = [parseInt(seasonId), ...uniqueTeamIds];

    // Use provided connection (if in transaction) or default pool
    const db = connection || pool;
    const [rows] = await db.query(sql, params);
    return rows[0].count === uniqueTeamIds.length;
}


// @desc    Create a new match schedule entry
// @route   POST /api/admin/matches
// @access  Admin
exports.createMatch = async (req, res, next) => {
    // Ensure required fields are present and have basic validity
    const { season_id, team1_id, team2_id, match_datetime, venue } = req.body;
    if (!season_id || !team1_id || !team2_id || !match_datetime) {
        return res.status(400).json({ message: 'Season ID, Team 1 ID, Team 2 ID, and Match Datetime are required.' });
    }
    if (isNaN(parseInt(season_id)) || isNaN(parseInt(team1_id)) || isNaN(parseInt(team2_id))) {
        return res.status(400).json({ message: 'Season ID and Team IDs must be valid numbers.' });
    }
    if (parseInt(team1_id) === parseInt(team2_id)) {
        return res.status(400).json({ message: 'Team 1 and Team 2 cannot be the same.' });
    }
    if (isNaN(new Date(match_datetime).getTime())) {
        return res.status(400).json({ message: 'Invalid Match Datetime format provided.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Validate season exists
        const [seasonCheck] = await connection.query('SELECT 1 FROM Seasons WHERE season_id = ?', [season_id]);
        if (seasonCheck.length === 0) {
            throw new Error(`Season with ID ${season_id} not found.`);
        }

        // Validate teams exist for this season
        const teamsValid = await validateTeamsForSeason([team1_id, team2_id], season_id, connection);
        if (!teamsValid) {
            throw new Error('One or both Team IDs are invalid or do not belong to the selected season.');
        }

        // Insert the match
        const [result] = await connection.query(
            `INSERT INTO Matches (season_id, team1_id, team2_id, match_datetime, venue, status)
             VALUES (?, ?, ?, ?, ?, 'Scheduled')`,
            [parseInt(season_id), parseInt(team1_id), parseInt(team2_id), match_datetime, venue || 'Metalworks Box Arena']
        );
        const newMatchId = result.insertId;

        await connection.commit();

        // Fetch the created match with team names to return it
        const [newMatch] = await pool.query(
             `SELECT m.*, t1.name as team1_name, t2.name as team2_name
              FROM Matches m
              JOIN Teams t1 ON m.team1_id = t1.team_id
              JOIN Teams t2 ON m.team2_id = t2.team_id
              WHERE m.match_id = ?`, [newMatchId]);

        // Check if the fetch returned the match (it should)
        if (newMatch.length === 0) {
             console.error(`Consistency Error: Match ID ${newMatchId} created but could not be fetched immediately.`);
             // Still send success, but log the warning
             return res.status(201).json({ message: 'Match scheduled successfully, but failed to retrieve details immediately.', matchId: newMatchId });
        }

        res.status(201).json({ message: 'Match scheduled successfully', match: newMatch[0] });

    } catch (error) {
        await connection.rollback(); // Ensure rollback on error
        console.error("Create Match Controller Error:", error);
        // Pass a more specific error if possible, otherwise a generic one
        next(new Error(error.message || 'Database error occurred while scheduling match.'));
    } finally {
        connection.release(); // Ensure connection is always released
    }
};


// @desc    Get all matches (Admin view, can filter)
// @route   GET /api/admin/matches?season_id=X&status=Y&team_id=Z
// @access  Admin
exports.getAllMatches = async (req, res, next) => {
    const { season_id, status, team_id } = req.query;
     try {
        let query = `
            SELECT
                m.match_id, m.match_datetime, m.status, m.venue, m.result_summary,
                m.season_id, s.name as season_name,
                t1.name as team1_name, t1.team_id as team1_id,
                t2.name as team2_name, t2.team_id as team2_id,
                wt.name as winner_team_name,
                mom.name as man_of_the_match_name
            FROM Matches m
            JOIN Seasons s ON m.season_id = s.season_id
            JOIN Teams t1 ON m.team1_id = t1.team_id
            JOIN Teams t2 ON m.team2_id = t2.team_id
            LEFT JOIN Teams wt ON m.winner_team_id = wt.team_id
            LEFT JOIN Players mom ON m.man_of_the_match_player_id = mom.player_id
        `;
        const params = [];
        const conditions = [];

        if (season_id) {
             if (isNaN(parseInt(season_id))) return res.status(400).json({ message: 'Invalid Season ID format.' });
             conditions.push('m.season_id = ?'); params.push(parseInt(season_id));
        }
        if (status) {
             const allowedStatus = ['Scheduled', 'Setup', 'Live', 'Completed', 'Abandoned'];
             if (!allowedStatus.includes(status)) return res.status(400).json({ message: `Invalid status filter. Allowed: ${allowedStatus.join(', ')}` });
             conditions.push('m.status = ?'); params.push(status);
        }
        if (team_id) {
             if (isNaN(parseInt(team_id))) return res.status(400).json({ message: 'Invalid Team ID format.' });
             conditions.push('(m.team1_id = ? OR m.team2_id = ?)'); params.push(parseInt(team_id), parseInt(team_id));
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        // Default ordering
        query += ' ORDER BY m.match_datetime ASC, m.match_id ASC';

        const [matches] = await pool.query(query, params);
        res.json(matches);
    } catch (error) {
        console.error("Get All Matches (Admin) Controller Error:", error);
        next(error); // Pass to global error handler
    }
};

// @desc    Get a single match by ID (Admin view)
// @route   GET /api/admin/matches/:id
// @access  Admin
 exports.getMatchById = async (req, res, next) => {
     const { id } = req.params;
     if (isNaN(parseInt(id))) {
         return res.status(400).json({ message: 'Invalid Match ID format.' });
     }
    try {
         let query = `
            SELECT m.*, s.name as season_name, t1.name as team1_name, t2.name as team2_name
            FROM Matches m
            JOIN Seasons s ON m.season_id = s.season_id
            JOIN Teams t1 ON m.team1_id = t1.team_id
            JOIN Teams t2 ON m.team2_id = t2.team_id
            WHERE m.match_id = ?`;
        const [matches] = await pool.query(query, [id]);

        if (matches.length === 0) {
            return res.status(404).json({ message: 'Match not found' });
        }
        res.json(matches[0]); // Send the found match details
    } catch (error) {
        console.error(`Get Match By ID (Admin) Controller Error for ID ${id}:`, error);
        next(error);
    }
 };


// @desc    Update a match schedule entry
// @route   PUT /api/admin/matches/:id
// @access  Admin
exports.updateMatch = async (req, res, next) => {
    const matchId = parseInt(req.params.id);
    if (isNaN(matchId)) {
        return res.status(400).json({ message: 'Invalid Match ID format.' });
    }

    const { team1_id, team2_id, match_datetime, venue, status } = req.body;

    // --- Input Validation ---
    const validFieldsProvided = [team1_id, team2_id, match_datetime, venue, status].some(f => f !== undefined);
    if (!validFieldsProvided) {
        return res.status(400).json({ message: 'No fields provided for update.' });
    }
    if (match_datetime && isNaN(new Date(match_datetime).getTime())) {
        return res.status(400).json({ message: 'Invalid Match Datetime format.' });
    }
    // Allow setting only 'Scheduled' or 'Abandoned' via this update route for safety
    const allowedStatusUpdates = ['Scheduled', 'Abandoned'];
    if (status !== undefined && !allowedStatusUpdates.includes(status)) {
        return res.status(400).json({ message: `Status can only be explicitly updated to: ${allowedStatusUpdates.join(', ')} via this route.` });
    }
    if (team1_id !== undefined && isNaN(parseInt(team1_id))) return res.status(400).json({ message: 'Invalid Team 1 ID format.' });
    if (team2_id !== undefined && isNaN(parseInt(team2_id))) return res.status(400).json({ message: 'Invalid Team 2 ID format.' });
    // --- End Input Validation ---

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Fetch existing match for validation
        const [existingMatches] = await connection.query(
            'SELECT season_id, status, team1_id as current_team1, team2_id as current_team2 FROM Matches WHERE match_id = ? FOR UPDATE',
            [matchId]
        );
        if (existingMatches.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Match not found.' });
        }
        const { season_id, current_status, current_team1, current_team2 } = existingMatches[0];

        // --- Business Logic Validation ---
        if (current_status !== 'Scheduled' && (team1_id !== undefined || team2_id !== undefined || match_datetime !== undefined)) {
            await connection.rollback();
            return res.status(400).json({ message: `Cannot change teams or datetime for a match that is already '${current_status}'. You can only update venue or status (to Abandoned/Scheduled).` });
        }
        // --- End Business Logic Validation ---

        // Prepare fields to update and validate teams
        const fieldsToUpdate = {};
        const teamsToValidate = [];
        let finalTeam1 = current_team1;
        let finalTeam2 = current_team2;

        if (team1_id !== undefined) { fieldsToUpdate.team1_id = parseInt(team1_id); teamsToValidate.push(parseInt(team1_id)); finalTeam1 = parseInt(team1_id); }
        if (team2_id !== undefined) { fieldsToUpdate.team2_id = parseInt(team2_id); teamsToValidate.push(parseInt(team2_id)); finalTeam2 = parseInt(team2_id); }
        if (match_datetime !== undefined) fieldsToUpdate.match_datetime = match_datetime;
        if (venue !== undefined) fieldsToUpdate.venue = venue;
        if (status !== undefined) fieldsToUpdate.status = status;

        // Validate teams if any team ID was provided
        if (teamsToValidate.length > 0) {
             const teamsValid = await validateTeamsForSeason(teamsToValidate, season_id, connection);
             if (!teamsValid) {
                 throw new Error('One or both provided Team IDs are invalid for the match\'s season.');
             }
        }

        // Ensure final teams aren't the same
        if (finalTeam1 === finalTeam2) {
            throw new Error('Team 1 and Team 2 cannot be the same.');
        }

        // Proceed with update if there are fields to change
        if (Object.keys(fieldsToUpdate).length > 0) {
            const [result] = await connection.query('UPDATE Matches SET ? WHERE match_id = ?', [fieldsToUpdate, matchId]);
            if (result.changedRows === 0 && result.affectedRows > 0){
                 console.log(`Update Match ${matchId}: Data provided was same as existing data.`);
                 // Optionally return 304 Not Modified or proceed to fetch and return 200 OK
            } else if (result.affectedRows === 0) {
                 // This case is less likely if the FOR UPDATE select succeeded
                 console.warn(`Update Match ${matchId}: Affected rows was 0, potentially match ID gone?`);
            }
        } else {
            // This condition should ideally not be reached due to initial check, but as safeguard:
            await connection.rollback();
            return res.status(304).json({ message: 'No effective changes provided.' });
        }

        await connection.commit();

        // Fetch updated match data with team names to return
        const [updatedMatch] = await pool.query(
            `SELECT m.*, t1.name as team1_name, t2.name as team2_name
             FROM Matches m
             JOIN Teams t1 ON m.team1_id = t1.team_id
             JOIN Teams t2 ON m.team2_id = t2.team_id
             WHERE m.match_id = ?`, [matchId]);

        res.json({ message: 'Match updated successfully', match: updatedMatch[0] });

    } catch (error) {
        await connection.rollback(); // Rollback on any error
        console.error(`Update Match ${matchId} Controller Error:`, error);
        next(new Error(error.message || 'Database error occurred while updating match.'));
    } finally {
        connection.release(); // Release connection
    }
};


// @desc    Delete a match schedule entry
// @route   DELETE /api/admin/matches/:id
// @access  Admin
exports.deleteMatch = async (req, res, next) => {
     const matchId = parseInt(req.params.id);
     if (isNaN(matchId)) {
         return res.status(400).json({ message: 'Invalid Match ID format.' });
     }

    const connection = await pool.getConnection();
    try {
         await connection.beginTransaction();

         // Check if match exists and its status before attempting delete
         const [existingMatches] = await connection.query('SELECT status FROM Matches WHERE match_id = ? FOR UPDATE', [matchId]);
        if (existingMatches.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Match not found.' });
        }

         // Business Rule: Only allow deleting 'Scheduled' matches
         const current_status = existingMatches[0].status;
         if (current_status !== 'Scheduled') {
             await connection.rollback();
             return res.status(400).json({ message: `Cannot delete match. Only 'Scheduled' matches can be deleted (current status: '${current_status}').` });
         }

        // Foreign keys to BallByBall and PlayerMatchStats should have ON DELETE CASCADE set in schema
        const [result] = await connection.query('DELETE FROM Matches WHERE match_id = ?', [matchId]);

        if (result.affectedRows === 0) {
            // Should not happen if the SELECT FOR UPDATE found the row
            await connection.rollback();
            return res.status(404).json({ message: 'Match found but could not be deleted.' });
        }

        await connection.commit();
        res.status(200).json({ message: `Scheduled Match ID ${matchId} deleted successfully.` }); // Use 200 OK for successful delete

    } catch (error) {
         await connection.rollback();
         console.error(`Delete Match ${matchId} Controller Error:`, error);
         // Handle specific DB errors if necessary
         next(error);
    } finally {
        connection.release();
    }
};