// mpl-project/mpl-backend/routes/admin/seasons.js
const express = require('express');
const {
    createSeason,
    getSeasons,
    getSeasonById,
    updateSeason,
    // deleteSeason // Uncomment if implemented
} = require('../../controllers/admin/seasonController');

const router = express.Router();

// Note: The 'protect' middleware is applied in server.js for all routes in this file.

// Base route: /api/admin/seasons
router.route('/')
    .post(createSeason) // POST /api/admin/seasons - Create a new season
    .get(getSeasons);   // GET /api/admin/seasons - Get all seasons

// Route for specific season by ID: /api/admin/seasons/:id
router.route('/:id')
    .get(getSeasonById) // GET /api/admin/seasons/:id - Get details of one season
    .put(updateSeason)  // PUT /api/admin/seasons/:id - Update a season's details
    // .delete(deleteSeason); // DELETE /api/admin/seasons/:id - Delete a season (implement controller logic first)

module.exports = router;