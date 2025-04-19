// mpl-project/mpl-backend/config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config(); // Load environment variables from .env file

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root', // Default user if not set in .env
    password: process.env.DB_PASSWORD || '', // Default password if not set
    database: process.env.DB_NAME || 'mpl_db', // Default DB name
    waitForConnections: true,
    connectionLimit: 10, // Adjust based on expected load
    queueLimit: 0, // No limit on connection queue
    timezone: '+00:00' // Use UTC timezone for consistency in date/time storage
});

// Optional: Test the connection on startup
pool.getConnection()
    .then(connection => {
        console.log('MySQL Database connected successfully!');
        connection.release(); // Release the connection back to the pool
    })
    .catch(error => {
        console.error('!!! MySQL Database connection error !!!');
        console.error(`Error Code: ${error.code}`);
        console.error(`Error Message: ${error.message}`);
        // Depending on the error, you might want to exit the process
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('=> Check database username and password in your .env file.');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.error(`=> Database '${process.env.DB_NAME}' not found. Ensure it exists.`);
        } else if (error.code === 'ECONNREFUSED') {
             console.error('=> Connection refused. Ensure MySQL server is running and accessible at the specified host.');
        }
        // Consider exiting if DB is essential for startup: process.exit(1);
    });

module.exports = pool;