// mpl-project/mpl-backend/routes/leaderboard.js
const express = require('express');
// FIX: Changed getLeaderboards to getLeaderboard to match the controller export
const { getLeaderboard } = require('../controllers/leaderboardController');

const router = express.Router();

// GET /api/leaderboard?season_id=X
// Get batting, bowling, and impact leaderboards for a specific season or all-time
// FIX: Changed getLeaderboards to getLeaderboard
router.get('/', getLeaderboard);

module.exports = router;