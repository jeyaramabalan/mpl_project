// mpl-project/mpl-backend/server.js

// --- Core Modules ---
const http = require('http'); // For creating HTTP server for Express & Socket.IO
const express = require('express'); // Web framework
const { Server } = require("socket.io"); // Socket.IO server
const cors = require('cors'); // Middleware for enabling Cross-Origin Resource Sharing
require('dotenv').config(); // Load environment variables from .env file

// --- Custom Modules ---
const pool = require('./config/db'); // Database connection pool (ensures DB connects on start)
const initializeSocket = require('./socket/socketHandler'); // Socket.IO event handling logic
const { protect } = require('./middleware/authMiddleware'); // Admin authentication middleware

// --- Route Imports ---
// Public Routes (Accessible without login)
const playerRoutes = require('./routes/players');
const matchRoutes = require('./routes/matches');
const ratingRoutes = require('./routes/ratings'); // Contains public GET and protected POST

// Admin Auth Route (Login endpoint is public)
const adminAuthRoutes = require('./routes/admin/auth');

// Protected Admin Routes (Require admin login via 'protect' middleware)
const adminSeasonRoutes = require('./routes/admin/seasons');
const adminTeamRoutes = require('./routes/admin/teams');
const adminScoringRoutes = require('./routes/admin/scoring');
const adminMatchRoutes = require('./routes/admin/matchesAdmin');
// TODO: Import other admin routes (e.g., payments, player management) if created

// --- App & Server Initialization ---
const app = express(); // Create Express application instance
const server = http.createServer(app); // Create HTTP server instance using the Express app

// Initialize Socket.IO server, attaching it to the HTTP server
const io = new Server(server, {
    // Configure CORS for Socket.IO connections to allow requests from the frontend URL
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173", // Allow frontend origin
        methods: ["GET", "POST"] // Allowed HTTP methods for CORS negotiation
    },
    // Optional: Adjust ping settings if needed for network stability
    // pingTimeout: 60000, // Time without pong before connection considered closed
    // pingInterval: 25000 // How often pings are sent
});


// --- Global Middleware ---
// Enable CORS for all API routes (restrict origin in production)
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));

// Parse incoming JSON request bodies
app.use(express.json());

// Parse incoming URL-encoded request bodies (e.g., from standard HTML forms)
app.use(express.urlencoded({ extended: true }));


// --- API Route Definitions ---

// Root/Health Check Route
app.get('/api', (req, res) => res.json({ message: 'MPL API is alive and kicking!' }));

// Mount Public Routes
app.use('/api/players', playerRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/ratings', ratingRoutes); // Remember POST is protected internally if auth middleware added

// Mount Admin Authentication Routes (Login is public)
app.use('/api/admin/auth', adminAuthRoutes);

// Mount Protected Admin Routes (Apply 'protect' middleware here globally)
app.use('/api/admin/seasons', protect, adminSeasonRoutes);
app.use('/api/admin/teams', protect, adminTeamRoutes);
app.use('/api/admin/scoring', protect, adminScoringRoutes);
app.use('/api/admin/matches', protect, adminMatchRoutes);
// TODO: Mount other protected admin routes here...
// Example: app.use('/api/admin/payments', protect, paymentRoutes);


// --- Initialize Socket.IO Event Handlers ---
initializeSocket(io); // Pass the initialized Socket.IO server instance


// --- Error Handling Middleware ---

// 404 Not Found Handler (Catch-all for routes not defined above)
app.use((req, res, next) => {
    res.status(404).json({ message: `Resource not found at ${req.originalUrl}` });
});

// Global Error Handler (Catches errors passed via next(error))
// Must have 4 arguments (err, req, res, next)
app.use((err, req, res, next) => {
    console.error("--- Global Error Handler Caught Error ---");
    console.error(`Timestamp: ${new Date().toISOString()}`);
    console.error(`Route: ${req.method} ${req.originalUrl}`);
    // Log the error stack trace for debugging
    console.error("Stack Trace:", err.stack || err); // Log stack or error itself

    // Determine status code: use error's status code if available, otherwise default to 500
    const statusCode = err.statusCode || 500;

    // Send standardized error response
    res.status(statusCode).json({
        message: err.message || 'An unexpected internal server error occurred.',
        // Optionally include stack trace in development environment ONLY
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });
});


// --- Start the HTTP Server ---
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

server.listen(PORT, () => {
    console.log(`-------------------------------------------------------`);
    console.log(` MPL Server running on port ${PORT} in ${NODE_ENV} mode`);
    console.log(` API available at http://localhost:${PORT}/api`);
    console.log(` Frontend expected at ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    console.log(`-------------------------------------------------------`);
});


// --- Graceful Shutdown Handling (Optional but Recommended) ---
const shutdown = (signal) => {
    console.log(`\n${signal} signal received. Shutting down gracefully...`);
    server.close(() => {
        console.log('HTTP server closed.');
        // Close database connection pool
        pool.end(err => {
             if (err) {
                 console.error('Error closing database pool:', err.message);
             } else {
                console.log('Database pool closed.');
             }
             process.exit(0); // Exit process cleanly
        });
    });
};

// Listen for termination signals
process.on('SIGTERM', () => shutdown('SIGTERM')); // Standard termination signal
process.on('SIGINT', () => shutdown('SIGINT')); // Ctrl+C in terminal