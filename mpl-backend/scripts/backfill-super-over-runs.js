/**
 * One-time backfill: super-over balls previously stored doubled values in runs_scored/extra_runs.
 * Splits into face values + super_over_runs (team total unchanged).
 *
 * Usage: cd mpl-backend && node scripts/backfill-super-over-runs.js
 * Requires: add-super-over-runs-column.sql applied; DB_* in .env
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

function splitLegacySuperOverRow(b) {
    const R = Number(b.runs_scored) || 0;
    const E = Number(b.extra_runs) || 0;
    const total = R + E;
    const isBye = !!b.is_bye;
    const isExtra = !!b.is_extra;
    const et = b.extra_type;

    if (isBye) {
        return { runs_scored: 0, extra_runs: 1, super_over_runs: Math.max(0, total - 1) };
    }
    if (isExtra && et === 'Wide') {
        const fe = E / 2;
        return { runs_scored: 0, extra_runs: fe, super_over_runs: Math.max(0, total - fe) };
    }
    if (isExtra && et === 'NoBall') {
        const fo = R / 2;
        const fe = E / 2;
        return { runs_scored: fo, extra_runs: fe, super_over_runs: Math.max(0, total - fo - fe) };
    }
    const fo = R / 2;
    return { runs_scored: fo, extra_runs: E, super_over_runs: Math.max(0, total - fo - E) };
}

async function main() {
    const pool = await mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });
    const [balls] = await pool.query(`
        SELECT b.ball_id, b.runs_scored, b.extra_runs, b.is_bye, b.is_extra, b.extra_type
        FROM ballbyball b
        JOIN matches m ON b.match_id = m.match_id
        WHERE b.over_number = m.super_over_number
          AND m.super_over_number IS NOT NULL
    `);
    for (const row of balls) {
        const u = splitLegacySuperOverRow(row);
        await pool.query(
            `UPDATE ballbyball SET runs_scored = ?, extra_runs = ?, super_over_runs = ? WHERE ball_id = ?`,
            [u.runs_scored, u.extra_runs, u.super_over_runs, row.ball_id]
        );
    }
    console.log(`Backfill: updated ${balls.length} balls in super-over overs.`);
    console.log('Note: playermatchstats may still reflect old logic until recomputed from balls if needed.');
    await pool.end();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
