// mpl-project/mpl-backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

// Middleware to protect routes requiring ADMIN login
exports.protect = async (req, res, next) => {
    let token;

    // Check for token in Authorization header (Bearer scheme)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extract token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify the token using the secret key
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Fetch admin user details from DB using ID from token payload
            // Exclude password hash for security
            const [admins] = await pool.query('SELECT admin_id, username, email FROM admins WHERE admin_id = ?', [decoded.id]);

            if (admins.length === 0) {
                 // If user associated with token no longer exists
                 return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            // Attach admin user information to the request object for later use
            req.admin = admins[0];
            next(); // Proceed to the next middleware or route handler

        } catch (error) {
            // Handle different JWT errors
            console.error('Authentication Error:', error.message);
            if (error.name === 'JsonWebTokenError') {
                 return res.status(401).json({ message: 'Not authorized, invalid token' });
            }
             if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Not authorized, token expired' });
            }
            // Generic failure
            return res.status(401).json({ message: 'Not authorized, token validation failed' });
        }
    }

    // If no token is found in the header
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

// Placeholder for Player Authentication (if needed later for features like player rating)
// exports.protectPlayer = async (req, res, next) => {
//     // Similar logic, but verify player token and fetch player details
//     // from the Players table instead of Admins table.
// };