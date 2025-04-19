// mpl-project/mpl-backend/routes/admin/auth.js
const express = require('express');
const { loginAdmin, registerAdmin } = require('../../controllers/admin/authController');
// const { protect } = require('../../middleware/authMiddleware'); // Only if registration needs protection

const router = express.Router();

// @route   POST /api/admin/auth/login
// @desc    Authenticate admin user and return JWT token
// @access  Public
router.post('/login', loginAdmin);

// @route   POST /api/admin/auth/register
// @desc    Register a new admin user (Use with extreme caution!)
// @access  Public / Potentially Admin Only (Add 'protect' middleware if needed)
// WARNING: Exposing admin registration publicly is a security risk.
// Consider creating admins via a command-line script or securing this endpoint.
// router.post('/register', registerAdmin);


module.exports = router;