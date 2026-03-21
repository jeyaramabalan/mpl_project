// mpl-project/mpl-backend/routes/admin/scoring.js
const express = require('express');
const {
    getMatchesForSetup,
    submitMatchSetup,
    scoreSingleBall,
    submitFinalMatchScore,
    getLiveMatchState,
    undoLastBall,
    updateToss,
    revertToScheduled,
    retireBatter,
    addFieldingBonus
} = require('../../controllers/admin/scoringController');

const router = express.Router();

// Note: 'protect' middleware is applied in server.js

// GET /api/admin/scoring/setup-list
// Get matches in 'Scheduled' state, ready for toss/setup
router.get('/setup-list', getMatchesForSetup);

// POST /api/admin/scoring/matches/:matchId/setup
// Submit toss winner, decision (Bat/Bowl), and Super Over number.
// Transitions match status from 'Scheduled' to 'Setup'.
router.post('/matches/:matchId/setup', submitMatchSetup);

// GET /api/admin/scoring/matches/:matchId/state
// Fetch the current detailed state of a live/in-progress/completed match
router.get('/matches/:matchId/state', getLiveMatchState);

// PATCH /api/admin/scoring/matches/:matchId/toss
// Update toss winner and decision (only when no ball bowled yet)
router.patch('/matches/:matchId/toss', updateToss);

// POST /api/admin/scoring/matches/:matchId/revert-to-scheduled
// Revert match to Scheduled (only when no ball bowled yet)
router.post('/matches/:matchId/revert-to-scheduled', revertToScheduled);

// POST /api/admin/scoring/matches/:matchId/ball
// Route to score a single ball
router.post('/matches/:matchId/ball', scoreSingleBall);

// POST /api/admin/scoring/matches/:matchId/retire-batter
// Retire batter (after 12 legal balls per MPL rules)
router.post('/matches/:matchId/retire-batter', retireBatter);

// POST /api/admin/scoring/matches/:matchId/fielding-bonus — manual fielding impact (good catch/stop, misfield, catch drop)
router.post('/matches/:matchId/fielding-bonus', addFieldingBonus);

// DELETE /api/admin/scoring/matches/:matchId/ball/last <-- Route from previous step
// Undo the last recorded ball event
router.delete('/matches/:matchId/ball/last', undoLastBall);

// POST /api/admin/scoring/matches/:matchId/finalize
// Optional endpoint for admin to manually submit final scores and detailed player stats after a match.
// Useful if live scoring fails, for corrections, or if live scoring isn't used.
// Transitions match status to 'Completed'.
router.post('/matches/:matchId/finalize', submitFinalMatchScore);


module.exports = router;