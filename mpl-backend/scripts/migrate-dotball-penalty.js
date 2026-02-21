/**
 * Migration: Update existing batting impact points for dot ball penalty change
 * Old penalty: -0.5 per dot ball
 * New penalty: -0.25 per dot ball
 * This script adds +0.25 per dot ball to correct historical data.
 *
 * Run from mpl-backend folder: node scripts/migrate-dotball-penalty.js
 */

const pool = require('../config/db');

async function runMigration() {
    const connection = await pool.getConnection();
    try {
        const [result] = await connection.query(`
            UPDATE playermatchstats pms
            INNER JOIN (
                SELECT match_id, batsman_on_strike_player_id AS player_id, COUNT(*) AS dot_count
                FROM ballbyball
                WHERE runs_scored = 0
                  AND COALESCE(is_extra, 0) = 0
                  AND COALESCE(is_bye, 0) = 0
                GROUP BY match_id, batsman_on_strike_player_id
            ) dots ON pms.match_id = dots.match_id AND pms.player_id = dots.player_id
            SET pms.batting_impact_points = pms.batting_impact_points + (0.25 * dots.dot_count)
        `);
        console.log('Migration completed. Rows affected:', result.affectedRows);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    } finally {
        connection.release();
        process.exit(0);
    }
}

runMigration();
