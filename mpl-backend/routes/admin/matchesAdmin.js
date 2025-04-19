// mpl-project/mpl-backend/routes/admin/matchesAdmin.js
const express = require('express');
const {
    createMatch,
    getAllMatches, // Can reuse logic from public controller if desired
    getMatchById,
    updateMatch,
    deleteMatch
} = require('../../controllers/admin/matchAdminController'); // Point to the new controller

const router = express.Router();

// These routes will be protected by the 'protect' middleware in server.js

router.route('/')
    .post(createMatch)
    .get(getAllMatches); // List matches with filters for admin view

router.route('/:id')
    .get(getMatchById) // Get specific match details for editing
    .put(updateMatch)  // Update scheduled match details
    .delete(deleteMatch); // Delete a scheduled match

module.exports = router;