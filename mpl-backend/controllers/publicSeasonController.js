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
        const [seasons] = await pool.query('SELECT season_id, name, year FROM seasons ORDER BY year DESC');
        res.json(seasons);
    } catch (error) {
        console.error("Get Public Seasons Error:", error);
        next(error);
    }
};

/**
 * Calendar years that appear on at least one completed match (for leaderboards / records filters).
 * @route GET /api/seasons/match-years
 */
exports.getMatchYears = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT DISTINCT YEAR(match_datetime) AS y
             FROM matches
             WHERE status = 'Completed' AND match_datetime IS NOT NULL
             ORDER BY y DESC`
        );
        const years = rows.map((r) => r.y).filter((y) => y != null);
        res.json(years);
    } catch (error) {
        console.error('Get match years error:', error);
        next(error);
    }
};