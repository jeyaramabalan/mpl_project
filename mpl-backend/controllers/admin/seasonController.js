// mpl-project/mpl-backend/controllers/admin/seasonController.js
const pool = require('../../config/db');

/**
 * @desc    Create a new season
 * @route   POST /api/admin/seasons
 * @access  Admin (Protected)
 */
exports.createSeason = async (req, res, next) => {
    const { year, name, start_date, end_date, status } = req.body;

    // Basic validation
    if (!year || !name) {
        return res.status(400).json({ message: 'Year and Name are required for a season.' });
    }
    if (isNaN(parseInt(year))) {
        return res.status(400).json({ message: 'Year must be a valid number.' });
    }
    // Optional: Validate date formats if provided

    try {
        const [result] = await pool.query(
            'INSERT INTO Seasons (year, name, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)',
            // Provide null for optional fields if they are empty strings or undefined
            [year, name, start_date || null, end_date || null, status || 'Planned']
        );
        const seasonId = result.insertId;
        // Fetch the newly created season to return it in the response
        const [newSeason] = await pool.query('SELECT * FROM Seasons WHERE season_id = ?', [seasonId]);

        if (newSeason.length === 0) {
            // Should not happen if insert was successful
            throw new Error('Failed to retrieve newly created season.');
        }

        res.status(201).json({ message: 'Season created successfully', season: newSeason[0] });
    } catch (error) {
        console.error("Create Season Error:", error);
         if (error.code === 'ER_DUP_ENTRY' && error.message.includes('year')) {
             // Handle unique constraint violation on 'year'
             return res.status(400).json({ message: `Season with year ${year} already exists.` });
        }
        next(error); // Pass other errors to global handler
    }
};

/**
 * @desc    Get all seasons
 * @route   GET /api/admin/seasons
 * @access  Admin (Protected)
 */
exports.getSeasons = async (req, res, next) => {
    try {
        // Order by year descending to show most recent first
        const [seasons] = await pool.query('SELECT * FROM Seasons ORDER BY year DESC');
        res.json(seasons);
    } catch (error) {
        console.error("Get Seasons Error:", error);
        next(error);
    }
};

/**
 * @desc    Get a single season by its ID
 * @route   GET /api/admin/seasons/:id
 * @access  Admin (Protected)
 */
exports.getSeasonById = async (req, res, next) => {
    const { id } = req.params;
    if (isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'Invalid Season ID.' });
    }

    try {
        const [seasons] = await pool.query('SELECT * FROM Seasons WHERE season_id = ?', [id]);
        if (seasons.length === 0) {
            return res.status(404).json({ message: 'Season not found.' });
        }
        res.json(seasons[0]);
    } catch (error) {
        console.error("Get Season By ID Error:", error);
        next(error);
    }
};

/**
 * @desc    Update an existing season's details
 * @route   PUT /api/admin/seasons/:id
 * @access  Admin (Protected)
 */
exports.updateSeason = async (req, res, next) => {
    const { id } = req.params;
    // Only allow updating specific fields, year usually shouldn't change once set.
    const { name, start_date, end_date, status } = req.body;

    if (isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'Invalid Season ID.' });
    }

    // Check if at least one valid field is provided for update
    if (!name && start_date === undefined && end_date === undefined && !status) {
         return res.status(400).json({ message: 'No update data provided (name, start_date, end_date, status).' });
    }

    // Optional: Validate status enum value if provided
    const validStatuses = ['Planned', 'RegistrationOpen', 'Auction', 'Ongoing', 'Completed'];
    if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status value. Must be one of: ${validStatuses.join(', ')}` });
    }

    try {
        // Check if the season exists before attempting to update
        const [existing] = await pool.query('SELECT season_id FROM Seasons WHERE season_id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Season not found.' });
        }

        // Build the SET part of the query dynamically based on provided fields
        const fieldsToUpdate = {};
        if (name) fieldsToUpdate.name = name;
        // Allow setting dates to null
        if (start_date !== undefined) fieldsToUpdate.start_date = start_date || null;
        if (end_date !== undefined) fieldsToUpdate.end_date = end_date || null;
        if (status) fieldsToUpdate.status = status;

        // Perform the update query
        const [result] = await pool.query('UPDATE Seasons SET ? WHERE season_id = ?', [fieldsToUpdate, id]);

         if (result.affectedRows === 0) {
             // This might happen if the data submitted was the same as existing data
             console.warn(`Update Season ${id}: Affected rows was 0. Data might be unchanged.`);
              // Fetch current data to confirm if it matches request or if ID was wrong despite check
             const [currentSeason] = await pool.query('SELECT * FROM Seasons WHERE season_id = ?', [id]);
             return res.json({ message: 'Season data unchanged.', season: currentSeason[0] });

         }

        // Fetch the updated season data to return in the response
        const [updatedSeason] = await pool.query('SELECT * FROM Seasons WHERE season_id = ?', [id]);
        res.json({ message: 'Season updated successfully', season: updatedSeason[0] });

    } catch (error) {
        console.error("Update Season Error:", error);
        next(error);
    }
};


/**
 * @desc    Delete a season (Use with caution!)
 * @route   DELETE /api/admin/seasons/:id
 * @access  Admin (Protected)
 */
// exports.deleteSeason = async (req, res, next) => {
//     const { id } = req.params;
//     if (isNaN(parseInt(id))) {
//         return res.status(400).json({ message: 'Invalid Season ID.' });
//     }
//     // WARNING: Deleting a season might cascade and delete related teams, matches, stats etc.
//     // depending on your FOREIGN KEY constraints (ON DELETE CASCADE). Double-check schema.
//     // Consider logical deletion (setting an 'is_deleted' flag) instead of physical deletion.
//     try {
//          const [existing] = await pool.query('SELECT season_id FROM Seasons WHERE season_id = ?', [id]);
//         if (existing.length === 0) {
//             return res.status(404).json({ message: 'Season not found.' });
//         }

//         // Perform deletion
//         const [result] = await pool.query('DELETE FROM Seasons WHERE season_id = ?', [id]);

//          if (result.affectedRows === 0) {
//              return res.status(404).json({ message: 'Season not found or already deleted.' });
//          }

//         res.status(200).json({ message: 'Season deleted successfully.' }); // Or 204 No Content

//     } catch (error) {
//         console.error("Delete Season Error:", error);
//         // Handle potential foreign key constraint errors if cascade is not set up correctly
//         next(error);
//     }
// };