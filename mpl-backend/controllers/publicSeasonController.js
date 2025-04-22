// mpl-backend/controllers/publicSeasonController.js
const pool = require('../config/db');

/**
 * @desc    Get public list of seasons (ID, Name, Year)
 * @route   GET /api/seasons/public
 * @access  Public
 */
exports.getPublicSeasons = async (req, res, next) => {
    try {
        // Select only necessary fields for public view, order by year
        const [seasons] = await pool.query('SELECT season_id, name, year FROM Seasons ORDER BY year DESC');
        res.json(seasons);
    } catch (error) {
        console.error("Get Public Seasons Error:", error);
        next(error);
    }
};