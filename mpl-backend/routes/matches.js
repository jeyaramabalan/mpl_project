// mpl-project/mpl-backend/routes/matches.js
const express = require('express');
//const { getFixtures, getMatchDetails } = require('../controllers/matchController');
const { getFixtures, getMatchDetails, getMatchCommentary } = require('../controllers/matchController')
// const { protect } = require('../middleware/authMiddleware'); // Maybe needed if creating matches via API

const router = express.Router();

// --- Public Routes ---

// GET /api/matches
// Get list of fixtures (can filter by query params like ?season_id=X&status=Scheduled)
router.get('/', getFixtures);

// GET /api/matches/:id
// Get details for a single match (for viewer page)
router.get('/:id', getMatchDetails);

// Route to get ball-by-ball commentary
router.get('/:id/commentary', getMatchCommentary);

// --- Admin Routes (Example - if creating matches via API) ---
// POST /api/matches
// Create a new match fixture (needs protection)
// router.post('/', protect, createMatch);

// PUT /api/matches/:id
// Update match details (e.g., date/time, venue - needs protection)
// router.put('/:id', protect, updateMatch);

// DELETE /api/matches/:id
// Delete a match fixture (needs protection)
// router.delete('/:id', protect, deleteMatch);


module.exports = router;