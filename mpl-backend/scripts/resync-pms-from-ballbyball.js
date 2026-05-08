/**
 * Recompute playermatchstats batting (face runs only) and bowling runs_conceded (excludes super_over_runs)
 * from ballbyball. Run after super-over column + backfill.
 *
 * Usage:
 *   cd mpl-backend && node scripts/resync-pms-from-ballbyball.js
 *   node scripts/resync-pms-from-ballbyball.js --match-id=111
 *
 * Requires DB_* in .env
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
    const matchArg = process.argv.find((a) => a.startsWith('--match-id='));
    const matchId = matchArg ? parseInt(matchArg.split('=')[1], 10) : null;
    if (matchArg && !Number.isFinite(matchId)) {
        console.error('Invalid --match-id');
        process.exit(1);
    }

    const pool = await mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [cols] = await conn.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'playermatchstats' AND COLUMN_NAME = 'legal_balls_faced'`
        );
        const hasLegalBalls = cols.length > 0;

        // 1) Batting: clear for players who never faced a ball in this match scope
        await conn.query(
            `UPDATE playermatchstats pms
             SET runs_scored = 0, balls_faced = 0, fours = 0, twos = 0${hasLegalBalls ? ', legal_balls_faced = 0' : ''}
             WHERE EXISTS (SELECT 1 FROM ballbyball b WHERE b.match_id = pms.match_id)
             ${matchId != null ? 'AND pms.match_id = ?' : ''}
             AND NOT EXISTS (
               SELECT 1 FROM ballbyball b2
               WHERE b2.match_id = pms.match_id AND b2.batsman_on_strike_player_id = pms.player_id
             )`,
            matchId != null ? [matchId] : []
        );

        // 2) Batting: set from balls (face off bat only)
        const batSql = `
            UPDATE playermatchstats pms
            INNER JOIN (
              SELECT b.match_id, b.batsman_on_strike_player_id AS player_id,
                SUM(CASE WHEN COALESCE(b.is_bye,0)=0 AND COALESCE(b.is_extra,0)=0 THEN b.runs_scored
                         WHEN COALESCE(b.is_bye,0)=0 AND b.extra_type = 'NoBall' THEN b.runs_scored
                         ELSE 0 END) AS runs_scored,
                SUM(CASE WHEN COALESCE(b.is_extra,0)=0 OR b.extra_type = 'NoBall' THEN 1 ELSE 0 END) AS balls_faced,
                SUM(CASE WHEN COALESCE(b.is_bye,0)=0 AND COALESCE(b.is_extra,0)=0 AND b.runs_scored = 4 THEN 1
                         WHEN COALESCE(b.is_bye,0)=0 AND b.extra_type = 'NoBall' AND b.runs_scored = 4 THEN 1 ELSE 0 END) AS fours,
                SUM(CASE WHEN COALESCE(b.is_bye,0)=0 AND COALESCE(b.is_extra,0)=0 AND b.runs_scored = 2 THEN 1
                         WHEN COALESCE(b.is_bye,0)=0 AND b.extra_type = 'NoBall' AND b.runs_scored = 2 THEN 1 ELSE 0 END) AS twos
                ${hasLegalBalls ? `, SUM(CASE WHEN COALESCE(b.is_extra,0)=0 THEN 1 ELSE 0 END) AS legal_balls_faced` : ''}
              FROM ballbyball b
              ${matchId != null ? 'WHERE b.match_id = ?' : ''}
              GROUP BY b.match_id, b.batsman_on_strike_player_id
            ) agg ON pms.match_id = agg.match_id AND pms.player_id = agg.player_id
            SET pms.runs_scored = agg.runs_scored,
                pms.balls_faced = agg.balls_faced,
                pms.fours = agg.fours,
                pms.twos = agg.twos
                ${hasLegalBalls ? ', pms.legal_balls_faced = agg.legal_balls_faced' : ''}
        `;
        await conn.query(batSql, matchId != null ? [matchId] : []);

        // 3) Bowling: clear runs_conceded for players who never bowled
        await conn.query(
            `UPDATE playermatchstats pms
             SET runs_conceded = 0
             WHERE EXISTS (SELECT 1 FROM ballbyball b WHERE b.match_id = pms.match_id)
             ${matchId != null ? 'AND pms.match_id = ?' : ''}
             AND NOT EXISTS (
               SELECT 1 FROM ballbyball b2
               WHERE b2.match_id = pms.match_id AND b2.bowler_player_id = pms.player_id
             )`,
            matchId != null ? [matchId] : []
        );

        // 4) Bowling: conceded = face off bat + extras; NOT super_over_runs
        const bowlSql = `
            UPDATE playermatchstats pms
            INNER JOIN (
              SELECT b.match_id, b.bowler_player_id AS player_id,
                SUM(
                  (CASE WHEN COALESCE(b.is_bye,0)=0 THEN
                    CASE WHEN COALESCE(b.is_extra,0)=0 THEN b.runs_scored
                         WHEN b.extra_type = 'NoBall' THEN b.runs_scored
                         ELSE 0 END
                   ELSE 0 END) +
                  (CASE WHEN COALESCE(b.is_extra,0)=1 THEN COALESCE(b.extra_runs,0) ELSE 0 END)
                ) AS runs_conceded
              FROM ballbyball b
              ${matchId != null ? 'WHERE b.match_id = ?' : ''}
              GROUP BY b.match_id, b.bowler_player_id
            ) agg ON pms.match_id = agg.match_id AND pms.player_id = agg.player_id
            SET pms.runs_conceded = agg.runs_conceded
        `;
        await conn.query(bowlSql, matchId != null ? [matchId] : []);

        await conn.commit();
        console.log(
            matchId != null
                ? `resync-pms-from-ballbyball: completed for match_id ${matchId}.`
                : 'resync-pms-from-ballbyball: completed for all matches with ballbyball.'
        );
    } catch (e) {
        await conn.rollback();
        console.error(e);
        process.exit(1);
    } finally {
        conn.release();
        await pool.end();
    }
}

main();
