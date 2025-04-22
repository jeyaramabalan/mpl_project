// mpl-project/mpl-backend/controllers/admin/teamController.js
const pool = require('../../config/db');

/**
 * @desc    Add a new team to a specific season
 * @route   POST /api/admin/teams
 * @access  Admin (Protected)
 */
exports.addTeamToSeason = async (req, res, next) => {
    const { season_id, name, captain_player_id, budget } = req.body;

    // Validation
    if (!season_id || !name) {
        return res.status(400).json({ message: 'Season ID and Team Name are required.' });
    }
    if (isNaN(parseInt(season_id))) {
        return res.status(400).json({ message: 'Invalid Season ID.' });
    }
    // Optional: Validate budget format, captain_player_id if provided

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Check if season exists
        const [seasonCheck] = await connection.query('SELECT 1 FROM Seasons WHERE season_id = ?', [season_id]);
        if (seasonCheck.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: `Season with ID ${season_id} does not exist.` });
        }

        // Optional: Check if captain player exists if ID is provided
        if (captain_player_id) {
             const [playerCheck] = await connection.query('SELECT 1 FROM Players WHERE player_id = ?', [captain_player_id]);
             if (playerCheck.length === 0) {
                await connection.rollback();
                return res.status(400).json({ message: `Captain Player with ID ${captain_player_id} does not exist.` });
             }
             // More complex: Check if captain player is already in another team for this season? Handled later when adding player.
        }

        // Insert the new team
        const [result] = await connection.query(
            'INSERT INTO Teams (season_id, name, captain_player_id, budget) VALUES (?, ?, ?, ?)',
            [season_id, name, captain_player_id || null, budget === undefined || budget === null ? 10000.00 : budget] // Default budget if not provided
        );
        const teamId = result.insertId;

        // Fetch the newly created team to return
        const [newTeam] = await connection.query('SELECT * FROM Teams WHERE team_id = ?', [teamId]);

        await connection.commit();
        res.status(201).json({ message: 'Team added successfully', team: newTeam[0] });

    } catch (error) {
        await connection.rollback(); // Rollback transaction on any error
        console.error("Add Team Error:", error);
        // Handle specific FK errors if checks above missed something
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ message: 'Invalid Season ID or Captain Player ID provided.' });
        }
        next(error);
    } finally {
        connection.release(); // Always release the connection
    }
};

/**
 * @desc    Get teams, requires filtering by season_id query parameter
 * @route   GET /api/admin/teams?season_id=X
 * @access  Admin (Protected)
 */
exports.getTeamsForSeason = async (req, res, next) => {
    const { season_id } = req.query; // Get season_id if provided

    try {
        // Base query including season and captain info
        let query = `
          SELECT t.*, s.name as season_name, p.name as captain_name
          FROM Teams t
          JOIN Seasons s ON t.season_id = s.season_id
          LEFT JOIN Players p ON t.captain_player_id = p.player_id
          `;
        const params = [];

        // --- MODIFICATION START ---
        // Only add the WHERE clause if season_id IS provided
        if (season_id) {
            if (isNaN(parseInt(season_id))) {
                return res.status(400).json({ message: 'Invalid Season ID format provided in query.' });
            }
            query += ' WHERE t.season_id = ?';
            params.push(season_id);
        }
        // --- MODIFICATION END ---

        query += ' ORDER BY s.year DESC, t.name ASC'; // Order by season then team name

        const [teams] = await pool.query(query, params);
        res.json(teams);
    } catch (error) {
        console.error("Get Teams Error:", error);
        next(error);
    }
};

/**
 * @desc    Get full details of a single team AND its players for a specific season
 * @route   GET /api/admin/teams/:id?season_id=X
 * @access  Admin (Protected)
 */
exports.getTeamDetails = async (req, res, next) => {
     const { id } = req.params; // Team ID
     const { season_id } = req.query; // Season context is crucial

     if (isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'Invalid Team ID.' });
     }
     if (!season_id || isNaN(parseInt(season_id))) {
         return res.status(400).json({ message: 'Valid Season ID query parameter is required.' });
     }

    try {
        // Fetch team details
        const [teams] = await pool.query(
            `SELECT t.*, p.name as captain_name
             FROM Teams t
             LEFT JOIN Players p ON t.captain_player_id = p.player_id
             WHERE t.team_id = ? AND t.season_id = ?`, // Ensure team belongs to the requested season
            [id, season_id]
        );

        if (teams.length === 0) {
            // Team might exist but not for this season, or doesn't exist at all
            return res.status(404).json({ message: `Team with ID ${id} not found for season ${season_id}.` });
        }
        const teamDetails = teams[0];

        // Fetch players associated with this team FOR THIS SPECIFIC SEASON from TeamPlayers
        const [players] = await pool.query(
            `SELECT
                p.player_id, p.name, p.role,
                tp.team_player_id, tp.purchase_price, tp.is_captain
             FROM Players p
             JOIN TeamPlayers tp ON p.player_id = tp.player_id
             WHERE tp.team_id = ? AND tp.season_id = ?
             ORDER BY p.name`,
            [id, season_id]
        );

        // Combine team details and player list
        res.json({ ...teamDetails, players: players });

    } catch (error) {
        console.error("Get Team Details Error:", error);
        next(error);
    }
};


/**
 * @desc    Update team's basic details (name, captain, budget)
 * @route   PUT /api/admin/teams/:id
 * @access  Admin (Protected)
 */
exports.updateTeam = async (req, res, next) => {
     const { id } = req.params; // Team ID
     const { name, captain_player_id, budget } = req.body; // Fields that can be updated

     if (isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'Invalid Team ID.' });
     }
     // Check if at least one field is provided
     if (name === undefined && captain_player_id === undefined && budget === undefined) {
         return res.status(400).json({ message: 'No update data provided (name, captain_player_id, budget).' });
     }
     // Optional: Validate budget format if provided

     const connection = await pool.getConnection();
     try {
         await connection.beginTransaction();

         // Get current team info, especially season_id
         const [existingTeamArr] = await connection.query('SELECT team_id, season_id FROM Teams WHERE team_id = ?', [id]);
         if (existingTeamArr.length === 0) {
             await connection.rollback();
             return res.status(404).json({ message: 'Team not found.' });
         }
         const teamSeasonId = existingTeamArr[0].season_id;

         // Prepare fields for the main Teams table update
         const teamFieldsToUpdate = {};
         if (name !== undefined) teamFieldsToUpdate.name = name;
         if (budget !== undefined) teamFieldsToUpdate.budget = budget;
         // Captain update needs special handling below

         // Handle Captain Change
         if (captain_player_id !== undefined) {
             const newCaptainId = captain_player_id === null || captain_player_id === '' ? null : parseInt(captain_player_id);

             // If setting a new captain (not null)
             if (newCaptainId !== null) {
                 // 1. Check if the new captain player exists
                 const [playerCheck] = await connection.query('SELECT 1 FROM Players WHERE player_id = ?', [newCaptainId]);
                 if (playerCheck.length === 0) {
                     await connection.rollback();
                     return res.status(400).json({ message: `Player ID ${newCaptainId} does not exist.` });
                 }
                 // 2. Check if the new captain is actually ON THIS TEAM for THIS SEASON
                 const [teamPlayerCheck] = await connection.query(
                     'SELECT 1 FROM TeamPlayers WHERE team_id = ? AND player_id = ? AND season_id = ?',
                     [id, newCaptainId, teamSeasonId]
                 );
                 if (teamPlayerCheck.length === 0) {
                     await connection.rollback();
                     return res.status(400).json({ message: `Player ID ${newCaptainId} is not assigned to this team (ID ${id}) for season ${teamSeasonId}. Cannot set as captain.` });
                 }
                 // 3. Update the captain_player_id in the Teams table
                 teamFieldsToUpdate.captain_player_id = newCaptainId;
                 // 4. Update the is_captain flag in TeamPlayers (set new captain, unset old)
                 await connection.query('UPDATE TeamPlayers SET is_captain = FALSE WHERE team_id = ? AND season_id = ?', [id, teamSeasonId]);
                 await connection.query('UPDATE TeamPlayers SET is_captain = TRUE WHERE team_id = ? AND player_id = ? AND season_id = ?', [id, newCaptainId, teamSeasonId]);
             } else {
                 // Setting captain to NULL
                 teamFieldsToUpdate.captain_player_id = null;
                  // 4. Ensure no player is marked as captain in TeamPlayers
                 await connection.query('UPDATE TeamPlayers SET is_captain = FALSE WHERE team_id = ? AND season_id = ?', [id, teamSeasonId]);
             }
         } // End of captain handling


         // Update the Teams table if there are fields to update
         if (Object.keys(teamFieldsToUpdate).length > 0) {
             const [updateResult] = await connection.query('UPDATE Teams SET ? WHERE team_id = ?', [teamFieldsToUpdate, id]);
             if (updateResult.affectedRows === 0) {
                 // This might happen if only captain was changed (as it doesn't affect Teams row directly if already set)
                 // Or if data was identical. Log a warning.
                 console.warn(`Update Team ${id}: Affected rows was 0 for Teams table update.`);
             }
         }

         await connection.commit();

         // Fetch the final updated team details to return
         const [finalTeam] = await connection.query(
             `SELECT t.*, p.name as captain_name
              FROM Teams t
              LEFT JOIN Players p ON t.captain_player_id = p.player_id
              WHERE t.team_id = ?`, [id]
          );

         res.json({ message: 'Team updated successfully', team: finalTeam[0] });

    } catch (error) {
        await connection.rollback();
        console.error("Update Team Error:", error);
        if (error.code === 'ER_NO_REFERENCED_ROW_2') { // Can happen if invalid player ID is somehow used
            return res.status(400).json({ message: 'Invalid data reference (e.g., non-existent Player ID).' });
        }
        next(error);
    } finally {
        connection.release();
    }
};


/**
 * @desc    Add a player to a team for a specific season (creates TeamPlayers entry)
 * @route   POST /api/admin/teams/players
 * @access  Admin (Protected)
 */
exports.addPlayerToTeam = async (req, res, next) => {
    const { team_id, player_id, season_id, purchase_price, is_captain } = req.body;

    if (!team_id || !player_id || !season_id) { return res.status(400).json({ message: 'Team ID, Player ID, and Season ID are required.' }); }
    if (isNaN(parseInt(team_id)) || isNaN(parseInt(player_id)) || isNaN(parseInt(season_id))) { return res.status(400).json({ message: 'Invalid ID format provided.' }); }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // Pre-checks (team exists, player exists, player not already assigned) - Keep as before
        const [teamCheck] = await connection.query('SELECT 1 FROM Teams WHERE team_id = ? AND season_id = ?', [team_id, season_id]); if (teamCheck.length === 0) { await connection.rollback(); return res.status(400).json({ message: `Team ID ${team_id} not found for season ${season_id}.` }); }
        const [playerCheck] = await connection.query('SELECT 1 FROM Players WHERE player_id = ?', [player_id]); if (playerCheck.length === 0) { await connection.rollback(); return res.status(400).json({ message: `Player ID ${player_id} does not exist.` }); }
        const [existingAssignment] = await connection.query('SELECT team_id FROM TeamPlayers WHERE player_id = ? AND season_id = ?', [player_id, season_id]); if (existingAssignment.length > 0) { await connection.rollback(); return res.status(400).json({ message: `Player ${player_id} is already assigned to team ${existingAssignment[0].team_id} for season ${season_id}. Remove them first.` }); }

        // Captain handling (Keep as before)
        if (is_captain) { await connection.query('UPDATE TeamPlayers SET is_captain = FALSE WHERE team_id = ? AND season_id = ?', [team_id, season_id]); await connection.query('UPDATE Teams SET captain_player_id = ? WHERE team_id = ?', [player_id, team_id]); }

        // Insert into TeamPlayers (Keep as before)
        const [result] = await connection.query( 'INSERT INTO TeamPlayers (team_id, player_id, season_id, purchase_price, is_captain) VALUES (?, ?, ?, ?, ?)', [team_id, player_id, season_id, purchase_price === undefined ? null : purchase_price, is_captain || false] );
        const teamPlayerId = result.insertId;

        // MODIFIED: Update the player's current_team_id
        // Consider if you only want the *latest* season's team assignment to set this.
        // This logic sets it regardless of season order. Adjust if needed.
        await connection.query('UPDATE Players SET current_team_id = ? WHERE player_id = ?', [team_id, player_id]);
        console.log(`Updated player ${player_id}'s current_team_id to ${team_id}`);

        await connection.commit();
        res.status(201).json({ message: 'Player added to team successfully', teamPlayerId: teamPlayerId });

    } catch (error) { await connection.rollback(); /* ... error handling ... */ }
    finally { connection.release(); }
};

/**
 * @desc    Remove a player from a team for a specific season (deletes TeamPlayers entry)
 * @route   DELETE /api/admin/teams/players/:teamPlayerId
 * @access  Admin (Protected)
 */
exports.removePlayerFromTeam = async (req, res, next) => {
    const { teamPlayerId } = req.params;

    if (isNaN(parseInt(teamPlayerId))) { return res.status(400).json({ message: 'Invalid Team Player Assignment ID.' }); }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // Get assignment details (Keep as before)
        const [assignmentInfo] = await connection.query(`SELECT tp.player_id, tp.team_id, t.captain_player_id FROM TeamPlayers tp JOIN Teams t ON tp.team_id = t.team_id WHERE tp.team_player_id = ?`, [teamPlayerId]);
        if (assignmentInfo.length === 0) { await connection.rollback(); return res.status(404).json({ message: 'Team player assignment not found.' }); }
        const { player_id, team_id, captain_player_id } = assignmentInfo[0];

        // Delete assignment (Keep as before)
        const [deleteResult] = await connection.query('DELETE FROM TeamPlayers WHERE team_player_id = ?', [teamPlayerId]);
        if (deleteResult.affectedRows === 0) { await connection.rollback(); return res.status(404).json({ message: 'Team player assignment could not be deleted (not found?).' }); }

        // Handle captain (Keep as before)
        if (player_id === captain_player_id) { await connection.query('UPDATE Teams SET captain_player_id = NULL WHERE team_id = ?', [team_id]); }

        // MODIFIED: Clear player's current_team_id ONLY if it matched the team they were removed from
        await connection.query('UPDATE Players SET current_team_id = NULL WHERE player_id = ? AND current_team_id = ?', [player_id, team_id]);
        console.log(`Cleared current_team_id for player ${player_id} if it was ${team_id}`);

        await connection.commit();
        res.status(200).json({ message: 'Player removed from team successfully.' });

    } catch (error) { await connection.rollback(); console.error("Remove Player from Team Error:", error); next(error); }
    finally { connection.release(); }
};

/**
 * @desc    Delete a team (Use with caution!)
 * @route   DELETE /api/admin/teams/:id
 * @access  Admin (Protected)
 */
// exports.deleteTeam = async (req, res, next) => {
//     const { id } = req.params;
//     if (isNaN(parseInt(id))) {
//         return res.status(400).json({ message: 'Invalid Team ID.' });
//     }
//     // WARNING: Deleting a team will likely cascade delete TeamPlayers,
//     // and might fail if the team is involved in Matches unless those have ON DELETE SET NULL/CASCADE.
//     // CHECK YOUR SCHEMA CONSTRAINTS CAREFULLY!
//     try {
//         // Check existence first
//         const [existing] = await pool.query('SELECT team_id FROM Teams WHERE team_id = ?', [id]);
//         if (existing.length === 0) {
//             return res.status(404).json({ message: 'Team not found.' });
//         }
//         // Perform delete
//         const [result] = await pool.query('DELETE FROM Teams WHERE team_id = ?', [id]);
//         if (result.affectedRows === 0) {
//              return res.status(404).json({ message: 'Team not found or could not be deleted.' });
//         }
//         res.status(200).json({ message: 'Team deleted successfully.' });
//     } catch (error) {
//         console.error("Delete Team Error:", error);
//         // Handle FK constraint errors (e.g., if team is in use in Matches table)
//         if (error.code === 'ER_ROW_IS_REFERENCED_2') {
//             return res.status(400).json({ message: 'Cannot delete team. It is referenced in existing matches or other records.' });
//         }
//         next(error);
//     }
// };
