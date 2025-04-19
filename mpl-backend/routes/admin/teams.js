// mpl-project/mpl-backend/routes/admin/teams.js
const express = require('express');
const {
    addTeamToSeason,
    getTeamsForSeason,
    updateTeam,
    getTeamDetails,
    addPlayerToTeam,
    removePlayerFromTeam,
    // deleteTeam // Implement if needed
} = require('../../controllers/admin/teamController');

const router = express.Router();

// Note: 'protect' middleware is applied in server.js

// --- Team Management ---

// POST /api/admin/teams
// Add a new team to a specific season (expects season_id in body)
router.post('/', addTeamToSeason);

// GET /api/admin/teams?season_id=X
// Get teams, requires filtering by season_id query parameter
router.get('/', getTeamsForSeason);

// GET /api/admin/teams/:id?season_id=X
// Get details of a specific team AND its players for a specific season
router.get('/:id', getTeamDetails);

// PUT /api/admin/teams/:id
// Update basic team details (name, captain, budget)
router.put('/:id', updateTeam);

// DELETE /api/admin/teams/:id
// Delete a team (implement controller logic, consider implications)
// router.delete('/:id', deleteTeam);


// --- Team Player Management (within a team/season) ---

// POST /api/admin/teams/players
// Add a player to a team for a specific season (expects team_id, player_id, season_id in body)
router.post('/players', addPlayerToTeam);

// DELETE /api/admin/teams/players/:teamPlayerId
// Remove a player assignment using the unique ID from the TeamPlayers table
router.delete('/players/:teamPlayerId', removePlayerFromTeam);


module.exports = router;