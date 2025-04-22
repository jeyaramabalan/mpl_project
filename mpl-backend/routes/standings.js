// mpl-project/mpl-backend/routes/standings.js
const express = require('express');
const { getStandings } = require('../controllers/standingsController');

const router = express.Router();

// GET /api/standings?season_id=X
router.get('/', getStandings);

module.exports = router;