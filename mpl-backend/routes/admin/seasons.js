// mpl-project/mpl-backend/routes/admin/seasons.js
const express = require('express');
const {
    createSeason,
    getSeasons,
    getSeasonById,
    updateSeason,
    deleteSeason,
    deleteSeasonWithAllData,
} = require('../../controllers/admin/seasonController');

const router = express.Router();

// Note: The 'protect' middleware is applied in server.js for all routes in this file.

// Base route: /api/admin/seasons
router.route('/')
    .post(createSeason) // POST /api/admin/seasons - Create a new season
    .get(getSeasons);   // GET /api/admin/seasons - Get all seasons

// POST /api/admin/seasons/:id/delete-with-data — requires destructive_password in body; wipes all related data (must be before generic :id)
router.post('/:id/delete-with-data', deleteSeasonWithAllData);

// Route for specific season by ID: /api/admin/seasons/:id
router.route('/:id')
    .get(getSeasonById)
    .put(updateSeason)
    .delete(deleteSeason);

module.exports = router;