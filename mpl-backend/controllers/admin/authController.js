// mpl-project/mpl-backend/controllers/admin/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../../config/db');
require('dotenv').config();

// --- Helper Function ---
// Generates a JWT token containing the admin ID
const generateToken = (id) => {
    if (!process.env.JWT_SECRET) {
        console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
        process.exit(1); // Exit if secret is missing
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d', // Token validity period (e.g., 30 days)
    });
};


// --- Controller Functions ---

/**
 * @desc    Authenticate admin & get token
 * @route   POST /api/admin/auth/login
 * @access  Public
 */
/* exports.loginAdmin = async (req, res, next) => {
    const { username, password } = req.body;

    // Basic input validation
    if (!username || !password) {
        return res.status(400).json({ message: 'Please provide username and password' });
    }

    try {
        // Find admin by username in the database
        const [admins] = await pool.query('SELECT admin_id, username, email, password_hash FROM admins WHERE username = ?', [username]);

        // Check if admin exists
        if (admins.length === 0) {
             return res.status(401).json({ message: 'Invalid credentials' }); // Use generic message for security
        }

        const admin = admins[0];

        // Compare provided password with the stored hash
        const isMatch = await bcrypt.compare(password, admin.password_hash);

        if (isMatch) {
            // Passwords match - generate token and send response
            res.json({
                admin_id: admin.admin_id,
                username: admin.username,
                email: admin.email,
                token: generateToken(admin.admin_id), // Generate and include the JWT
            });
        } else {
            // Passwords don't match
            res.status(401).json({ message: 'Invalid credentials' }); // Generic message
        }
    } catch (error) {
        console.error('Admin Login Error:', error);
        next(error); // Pass error to the global error handler
    }
}; */

exports.loginAdmin = async (req, res, next) => {
    const { username, password } = req.body;
    console.log(`[Backend Login] Attempting login for username: ${username}`); // <-- ADD THIS

    if (!username || !password) {
        console.log("[Backend Login] Missing username or password."); // <-- ADD THIS
        return res.status(400).json({ message: 'Please provide username and password' });
    }

    try {
        const [admins] = await pool.query('SELECT admin_id, username, email, password_hash FROM admins WHERE username = ?', [username]);

        if (admins.length === 0) {
             console.log("[Backend Login] Admin user not found in DB."); // <-- ADD THIS
             return res.status(401).json({ message: 'Invalid credentials' }); // User not found
        }

        const admin = admins[0];
        console.log("[Backend Login] Admin found:", { id: admin.admin_id, user: admin.username }); // <-- ADD THIS
        console.log("[Backend Login] Comparing provided password with hash:", admin.password_hash); // <-- ADD THIS

        const isMatch = await bcrypt.compare(password, admin.password_hash);
        console.log("[Backend Login] Password comparison result (isMatch):", isMatch); // <-- ADD THIS

        if (isMatch) {
            console.log("[Backend Login] Password MATCH! Generating token."); // <-- ADD THIS
            res.json({
                admin_id: admin.admin_id,
                username: admin.username,
                email: admin.email,
                token: generateToken(admin.admin_id),
            });
        } else {
            console.log("[Backend Login] Password DOES NOT MATCH."); // <-- ADD THIS
            res.status(401).json({ message: 'Invalid credentials' }); // Password incorrect
        }
    } catch (error) {
        console.error('[Backend Login] Error during login process:', error); // <-- ADD THIS
        next(error); // Pass to global error handler
    }
};


/**
 * @desc    Register a new admin (Use with caution!)
 * @route   POST /api/admin/auth/register
 * @access  Protected / Development Only (adjust route access control)
 */
exports.registerAdmin = async (req, res, next) => {
    const { username, email, password } = req.body;

     // Input validation
     if (!username || !email || !password) {
        return res.status(400).json({ message: 'Please provide username, email, and password' });
    }
     if (password.length < 8) { // Enforce minimum password length
         return res.status(400).json({ message: 'Password must be at least 8 characters long' });
     }
     // Basic email format validation (can be more robust)
     if (!/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    try {
        // Check if username or email already exists
        const [existingAdmin] = await pool.query('SELECT admin_id FROM admins WHERE username = ? OR email = ?', [username, email]);
        if (existingAdmin.length > 0) {
            return res.status(400).json({ message: 'Admin with that username or email already exists' });
        }

        // Hash the password before storing
        const salt = await bcrypt.genSalt(10); // Standard salt rounds
        const password_hash = await bcrypt.hash(password, salt);

        // Insert the new admin into the database
        const [result] = await pool.query(
            'INSERT INTO admins (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, password_hash]
        );

        const newAdminId = result.insertId;

        // Fetch the newly created admin's info (excluding hash)
        const [newAdmin] = await pool.query('SELECT admin_id, username, email FROM admins WHERE admin_id = ?', [newAdminId]);

        if (newAdmin.length > 0) {
             // Respond with new admin details and a token (log them in immediately)
             res.status(201).json({
                admin_id: newAdmin[0].admin_id,
                username: newAdmin[0].username,
                email: newAdmin[0].email,
                token: generateToken(newAdmin[0].admin_id)
            });
        } else {
             // Should not happen if insert succeeded, but handle defensively
             throw new Error('Failed to retrieve newly created admin after insertion.');
        }

    } catch (error) {
        console.error('Admin Registration Error:', error);
        // Handle specific database errors (like duplicate entry if check failed due to race condition)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Admin with that username or email already exists.' });
        }
        next(error); // Pass other errors to global handler
    }
};