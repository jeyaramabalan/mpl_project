// mpl-project/mpl-backend/routes/players.js
const express = require('express');
const {
    registerPlayer,
    getAllPlayers,
    getPlayerById,
    getPlayerStats,
    updatePlayer, // Assuming implementation exists
    deletePlayer // Assuming implementation exists
} = require('../controllers/playerController');
const { protect } = require('../middleware/authMiddleware'); // For admin-only actions

const router = express.Router();

// --- Public Routes ---

// GET /api/players - Get a list of all registered players
router.get('/', getAllPlayers);

// GET /api/players/:id - Get details of a specific player by ID
router.get('/:id', getPlayerById);

// GET /api/players/:id/stats?season_id=X - Get stats for a player (career or specific season)
router.get('/:id/stats', getPlayerStats);


// --- Potentially Public or Protected Routes ---

// POST /api/players - Register a new player
// Access Control Decision: Should this be public self-registration or admin-only?
// If admin-only, add 'protect' middleware here.
router.post('/', protect, registerPlayer); 


// --- Admin Only Routes (Protected) ---

// PUT /api/players/:id - Update player details
router.put('/:id', protect, updatePlayer);

// DELETE /api/players/:id - Delete a player (Use with caution!)
router.delete('/:id', protect, deletePlayer);


module.exports = router;