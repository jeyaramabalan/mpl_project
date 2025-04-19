    // mpl-project/mpl-backend/controllers/ratingController.js
const pool = require('../config/db');

/**
 * @desc    Submit a player rating (Requires Authentication of Rater)
 * @route   POST /api/ratings
 * @access  Protected (Player or Admin - depending on chosen auth middleware)
 */
exports.submitRating = async (req, res, next) => {
    // --- !!! Authentication Implementation Needed !!! ---
    // This controller expects authentication middleware to have run first
    // and attached the authenticated user's ID (e.g., player_id or admin_id).
    // Adjust based on your chosen authentication strategy.

    // Example: Assuming player authentication sets `req.user.player_id`
    const raterPlayerId = req.user?.player_id;

    // If using admin auth, the concept of 'rater' might be different,
    // perhaps logging which admin recorded it, not who 'felt' the rating.
    // const recordingAdminId = req.admin?.admin_id;

    // --- Validation ---
    if (!raterPlayerId) { // Check if rater ID is available from auth
        console.warn("Submit Rating attempt without authenticated rater ID.");
        return res.status(401).json({ message: 'Not authorized. You must be logged in to submit a rating.' });
    }

    const { season_id, rated_player_id, rating_value, comment } = req.body;

    if (!season_id || isNaN(parseInt(season_id))) {
        return res.status(400).json({ message: 'Valid Season ID is required.' });
    }
    if (!rated_player_id || isNaN(parseInt(rated_player_id))) {
        return res.status(400).json({ message: 'Valid Rated Player ID is required.' });
    }
    if (rating_value === undefined || rating_value === null || isNaN(parseInt(rating_value)) || rating_value < 1 || rating_value > 5) {
        return res.status(400).json({ message: 'Rating value must be a number between 1 and 5.' });
    }
    // Prevent self-rating
    if (raterPlayerId === parseInt(rated_player_id)) {
         return res.status(400).json({ message: 'You cannot rate yourself.' });
    }
    // --- End Validation ---

    // Optional: More complex validation - check if rater & rated player participated in the given season?
    // const [participationCheck] = await pool.query('SELECT 1 FROM TeamPlayers WHERE season_id = ? AND player_id IN (?, ?)', [season_id, raterPlayerId, rated_player_id]);
    // if (participationCheck.length < 2) { ... return error ... }


    try {
        // Attempt to insert the rating
        await pool.query(
            'INSERT INTO PlayerRatings (season_id, rated_player_id, rater_player_id, rating_value, comment) VALUES (?, ?, ?, ?, ?)',
            [season_id, rated_player_id, raterPlayerId, rating_value, comment || null] // Allow null comment
        );
        res.status(201).json({ message: 'Rating submitted successfully.' });

    } catch (error) {
        console.error("Submit Rating Error:", error);
         // Handle unique constraint violation (player already rated this person for this season)
         if (error.code === 'ER_DUP_ENTRY' && error.message.includes("key 'unique_rating_per_season'")) {
             return res.status(400).json({ message: 'You have already submitted a rating for this player for this season.' });
        }
         // Handle foreign key constraint violations (invalid season or player IDs)
         if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            // Determine which FK failed if possible (more advanced error parsing needed)
            console.warn(`Submit Rating FK Error: season_id=${season_id}, rated_player_id=${rated_player_id}, rater_player_id=${raterPlayerId}`);
            return res.status(400).json({ message: 'Invalid Season ID or Player ID provided.' });
        }
        next(error); // Pass other errors to global handler
    }
};

/**
 * @desc    Get all ratings received by a player (optionally filtered by season)
 * @route   GET /api/ratings/player/:playerId?season_id=X
 * @access  Public
 */
exports.getPlayerRatings = async (req, res, next) => {
    const { playerId } = req.params;
    const { season_id } = req.query; // Optional season filter

     if (isNaN(parseInt(playerId))) {
        return res.status(400).json({ message: 'Invalid Player ID.' });
    }
     if (season_id && isNaN(parseInt(season_id))) {
        return res.status(400).json({ message: 'Invalid Season ID provided in query parameter.' });
    }

    try {
        // Query to get ratings, including info about the season and the rater
        let query = `
            SELECT
                pr.rating_id, pr.rating_value, pr.comment, pr.rated_at,
                pr.season_id, s.name as season_name, s.year as season_year,
                pr.rater_player_id, rater.name as rater_name -- Get rater's details
            FROM PlayerRatings pr
            JOIN Players rater ON pr.rater_player_id = rater.player_id
            JOIN Seasons s ON pr.season_id = s.season_id
            WHERE pr.rated_player_id = ?
        `;
        const params = [playerId];

        // Add season filter if provided
        if (season_id) {
            query += ' AND pr.season_id = ?';
            params.push(season_id);
        }

        // Order results (e.g., most recent first)
        query += ' ORDER BY pr.rated_at DESC';

        const [ratings] = await pool.query(query, params);

        // Check if the rated player exists, even if they have no ratings
        if (ratings.length === 0) {
            const [playerCheck] = await pool.query('SELECT 1 FROM Players WHERE player_id = ?', [playerId]);
             if (playerCheck.length === 0) {
                 return res.status(404).json({ message: 'Player not found.' });
            }
        }

        res.json(ratings); // Return array of ratings (can be empty)

    } catch (error) {
        console.error("Get Player Ratings Error:", error);
        next(error);
    }
};

/**
 * @desc    Get average rating and total count for a player (optionally filtered by season)
 * @route   GET /api/ratings/player/:playerId/average?season_id=X
 * @access  Public
 */
exports.getAveragePlayerRating = async (req, res, next) => {
    const { playerId } = req.params;
    const { season_id } = req.query; // Optional season filter

    if (isNaN(parseInt(playerId))) {
        return res.status(400).json({ message: 'Invalid Player ID.' });
    }
     if (season_id && isNaN(parseInt(season_id))) {
        return res.status(400).json({ message: 'Invalid Season ID provided in query parameter.' });
    }

    try {
        // Query to calculate average and count
        let query = `
            SELECT
                AVG(rating_value) as average_rating,
                COUNT(*) as total_ratings
            FROM PlayerRatings
            WHERE rated_player_id = ?
        `;
        const params = [playerId];

        // Add season filter if provided
        if (season_id) {
            query += ' AND season_id = ?';
            params.push(season_id);
        }

        const [result] = await pool.query(query, params);

        const avgRating = result[0].average_rating;
        const totalRatings = result[0].total_ratings || 0; // Ensure count is 0, not null

        // Check if player exists if no ratings found
         if (totalRatings === 0) {
            const [playerCheck] = await pool.query('SELECT 1 FROM Players WHERE player_id = ?', [playerId]);
             if (playerCheck.length === 0) {
                 return res.status(404).json({ message: 'Player not found.' });
            }
        }

        // Return the calculated average (formatted) and total count
        res.json({
            average_rating: avgRating ? parseFloat(avgRating.toFixed(1)) : null, // Format to 1 decimal place, null if no ratings
            total_ratings: totalRatings
        });

    } catch (error) {
        console.error("Get Average Player Rating Error:", error);
        next(error);
    }
};