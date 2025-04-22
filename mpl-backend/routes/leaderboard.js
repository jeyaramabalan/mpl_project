// mpl-project/mpl-backend/routes/leaderboard.js
const express = require('express');
const { getLeaderboards } = require('../controllers/leaderboardController');

const router = express.Router();

// GET /api/leaderboard?season_id=X
// Get batting, bowling, and impact leaderboards for a specific season
router.get('/', getLeaderboards);

module.exports = router;