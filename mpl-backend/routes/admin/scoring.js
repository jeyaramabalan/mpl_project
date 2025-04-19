// mpl-project/mpl-backend/routes/admin/scoring.js
const express = require('express');
const {
    getMatchesForSetup,
    submitMatchSetup,
    scoreSingleBall,
    submitFinalMatchScore, // Keep if manual final entry/correction is needed
    getLiveMatchState, // <-- NEW CONTROLLER FUNCTION
    undoLastBall // <-- Endpoint from previous step
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

// GET /api/admin/scoring/matches/:matchId/state  <-- NEW ROUTE
// Fetch the current detailed state of a live/in-progress/completed match
router.get('/matches/:matchId/state', getLiveMatchState);

// POST /api/admin/scoring/matches/:matchId/ball
// Route to score a single ball
router.post('/matches/:matchId/ball', scoreSingleBall);

// DELETE /api/admin/scoring/matches/:matchId/ball/last <-- Route from previous step
// Undo the last recorded ball event
router.delete('/matches/:matchId/ball/last', undoLastBall);

// POST /api/admin/scoring/matches/:matchId/finalize
// Optional endpoint for admin to manually submit final scores and detailed player stats after a match.
// Useful if live scoring fails, for corrections, or if live scoring isn't used.
// Transitions match status to 'Completed'.
router.post('/matches/:matchId/finalize', submitFinalMatchScore);


module.exports = router;