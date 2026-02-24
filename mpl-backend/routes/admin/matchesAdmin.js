// mpl-project/mpl-backend/routes/admin/matchesAdmin.js
const express = require('express');
const {
    createMatch,
    getAllMatches,
    getMatchById,
    updateMatch,
    deleteMatch,
    resolveMatch,
    generateSchedule,
} = require('../../controllers/admin/matchAdminController');

const router = express.Router();

router.route('/')
    .post(createMatch)
    .get(getAllMatches);

router.route('/generate-schedule')
    .post(generateSchedule);

router.route('/:id')
    .get(getMatchById) // Get specific match details for editing
    .put(updateMatch)  // Update scheduled match details
    .delete(deleteMatch); // Delete a scheduled match

router.route('/:id/resolve')
    .put(resolveMatch);
module.exports = router;