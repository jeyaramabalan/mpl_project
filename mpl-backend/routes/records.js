// mpl-backend/routes/records.js
const express = require('express');
const { getRecords } = require('../controllers/recordsController');

const router = express.Router();

// GET /api/records?season_id=X|all&scope=individual|team
router.get('/', getRecords);

module.exports = router;
