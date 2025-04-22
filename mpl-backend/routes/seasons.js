// mpl-backend/routes/seasons.js
const express = require('express');
// Correctly import from the new controller file
const { getPublicSeasons } = require('../controllers/publicSeasonController');

const router = express.Router();

// Public route to get basic season list
// The path here is relative to where it's mounted in server.js (/api/seasons)
// So this handles GET /api/seasons/public
router.get('/public', getPublicSeasons);

module.exports = router;