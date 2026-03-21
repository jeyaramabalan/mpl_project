// mpl-project/mpl-backend/routes/admin/auction.js
const express = require('express');
const {
  getRegistrations,
  addRegistration,
  updateRegistration,
  confirmPayment,
  getAuctionPool,
  getAuctionState,
  startAuction,
  placeBid,
  sellPlayer,
  parkUnsoldPlayer,
} = require('../../controllers/admin/auctionController');

const router = express.Router();

router.get('/registrations', getRegistrations);
router.post('/registrations', addRegistration);
router.patch('/registrations/:id', updateRegistration);
router.post('/registrations/:id/confirm-payment', confirmPayment);
router.get('/pool', getAuctionPool);
router.get('/state', getAuctionState);
router.post('/start', startAuction);
router.post('/bid', placeBid);
router.post('/sell', sellPlayer);
router.post('/park', parkUnsoldPlayer);

module.exports = router;
