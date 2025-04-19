// mpl-project/mpl-backend/routes/ratings.js
const express = require('express');
const {
    submitRating,
    getPlayerRatings,
    getAveragePlayerRating
} = require('../controllers/ratingController');

// --- TODO: Import appropriate authentication middleware ---
// Choose one or both depending on who can rate:
// const { protect } = require('../middleware/authMiddleware'); // If only Admins can submit ratings
// const { protectPlayer } = require('../middleware/playerAuthMiddleware'); // If Players can submit ratings (needs implementation)

const router = express.Router();

// --- Public Routes (for viewing ratings) ---

// GET /api/ratings/player/:playerId
// Get all ratings received by a specific player (can filter by ?season_id=X)
router.get('/player/:playerId', getPlayerRatings);

// GET /api/ratings/player/:playerId/average
// Get the average rating for a specific player (can filter by ?season_id=X)
router.get('/player/:playerId/average', getAveragePlayerRating);


// --- Protected Route (for submitting ratings) ---

// POST /api/ratings
// Submit a rating for a player. Requires the rater to be authenticated.
// router.post('/', protectPlayer, submitRating); // Example using player auth
router.post('/', (req, res) => { // Placeholder until auth is decided/implemented
    res.status(501).json({ message: 'Rating submission requires authentication and is not fully implemented yet.' });
});
// router.post('/', protect, submitRating); // Example using admin auth (if admin enters ratings)


module.exports = router;