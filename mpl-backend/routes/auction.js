// Public auction view: current player, bid, team (read-only)
const express = require('express');
const { getAuctionState } = require('../controllers/admin/auctionController');

const router = express.Router();
router.get('/state', getAuctionState);

module.exports = router;
