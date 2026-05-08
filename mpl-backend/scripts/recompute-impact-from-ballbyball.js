/**
 * Recompute batting/bowling/fielding impact points on playermatchstats from ballbyball
 * using the shared calculateImpactPoints() rules (face runs only; super_over_runs ignored).
 * Adds manual fielding adjustments from ballbyball.fielding_adjustment_* when present.
 *
 * Optionally refreshes Man of the Match for Completed matches (same logic as scoreSingleBall).
 *
 * Usage:
 *   cd mpl-backend && node scripts/recompute-impact-from-ballbyball.js
 *   node scripts/recompute-impact-from-ballbyball.js --match-id=111
 *   node scripts/recompute-impact-from-ballbyball.js --skip-mom
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { calculateImpactPoints, impactInputFromBallRow } = require('../utils/impactPoints');
const { getImpactSettings, applySuperOverImpactMultiplier } = require('../utils/impactSettings');

function add(map, playerId, delta) {
    const id = Number(playerId);
    if (!Number.isFinite(id)) return;
    map[id] = (map[id] || 0) + delta;
}

async function recomputeMomIfCompleted(connection, matchId) {
    const [rows] = await connection.query('SELECT status, winner_team_id FROM matches WHERE match_id = ?', [matchId]);
    if (!rows.length || rows[0].status !== 'Completed') return;

    const winnerTeamId = rows[0].winner_team_id;
    const [impactStats] = await connection.query(
        `SELECT player_id, team_id, (COALESCE(batting_impact_points,0) + COALESCE(bowling_impact_points,0) + COALESCE(fielding_impact_points,0)) as total_impact
         FROM playermatchstats WHERE match_id = ? ORDER BY total_impact DESC`,
        [matchId]
    );
    if (!impactStats.length) return;

    const highest = Number(impactStats[0].total_impact);
    let candidates = impactStats.filter((p) => Number(p.total_impact) === highest);
    let momId = candidates[0].player_id;
    if (winnerTeamId) {
        const fromWinner = candidates.filter((p) => Number(p.team_id) === Number(winnerTeamId));
        if (fromWinner.length) momId = fromWinner[0].player_id;
    }
    await connection.query('UPDATE matches SET man_of_the_match_player_id = ? WHERE match_id = ?', [momId, matchId]);
    console.log(`  MoM set to player_id ${momId} for match ${matchId}`);
}

async function recomputeOneMatch(connection, matchId, options) {
    const { skipMom } = options;

    const [balls] = await connection.query(
        `SELECT * FROM ballbyball WHERE match_id = ? ORDER BY ball_id ASC`,
        [matchId]
    );
    if (balls.length === 0) {
        console.log(`  Match ${matchId}: no balls, skipping.`);
        return;
    }

    const [hasAdj] = await connection.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ballbyball' AND COLUMN_NAME = 'fielding_adjustment_player_id'`
    );
    const hasFieldingAdjustment = hasAdj.length > 0;

    const bat = {};
    const bowl = {};
    const field = {};

    const [mRows] = await connection.query('SELECT super_over_number FROM matches WHERE match_id = ? LIMIT 1', [matchId]);
    const superOverNumber = Number(mRows[0]?.super_over_number || -1);
    const impactSettings = await getImpactSettings(connection);

    for (const b of balls) {
        const input = impactInputFromBallRow(b);
        const basePts = calculateImpactPoints(input, impactSettings);
        const isSuperOverBall = Number(b.over_number) === superOverNumber;
        const pts = applySuperOverImpactMultiplier(basePts, isSuperOverBall, impactSettings);

        add(bat, b.batsman_on_strike_player_id, pts.batsman);
        add(bowl, b.bowler_player_id, pts.bowler);

        if (b.fielder_player_id && pts.fielder !== 0) {
            add(field, b.fielder_player_id, pts.fielder);
        }

        if (hasFieldingAdjustment && b.fielding_adjustment_player_id != null && b.fielding_adjustment_points != null) {
            const adj = Number(b.fielding_adjustment_points);
            if (Number.isFinite(adj) && adj !== 0) {
                add(field, b.fielding_adjustment_player_id, adj);
            }
        }
    }

    await connection.query(
        `UPDATE playermatchstats SET batting_impact_points = 0, bowling_impact_points = 0, fielding_impact_points = 0 WHERE match_id = ?`,
        [matchId]
    );

    const [pmsRows] = await connection.query('SELECT player_id FROM playermatchstats WHERE match_id = ?', [matchId]);
    for (const row of pmsRows) {
        const pid = row.player_id;
        const b = bat[pid] || 0;
        const bw = bowl[pid] || 0;
        const f = field[pid] || 0;
        if (b === 0 && bw === 0 && f === 0) continue;
        await connection.query(
            `UPDATE playermatchstats SET batting_impact_points = ?, bowling_impact_points = ?, fielding_impact_points = ?
             WHERE match_id = ? AND player_id = ?`,
            [b, bw, f, matchId, pid]
        );
    }

    if (!skipMom) {
        await recomputeMomIfCompleted(connection, matchId);
    }
}

async function main() {
    const matchArg = process.argv.find((a) => a.startsWith('--match-id='));
    const matchIdFilter = matchArg ? parseInt(matchArg.split('=')[1], 10) : null;
    const skipMom = process.argv.includes('--skip-mom');

    if (matchArg && !Number.isFinite(matchIdFilter)) {
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
        let matchIds;
        if (matchIdFilter != null) {
            matchIds = [matchIdFilter];
        } else {
            const [rows] = await pool.query(
                `SELECT DISTINCT m.match_id FROM matches m
                 INNER JOIN ballbyball b ON b.match_id = m.match_id
                 ORDER BY m.match_id`
            );
            matchIds = rows.map((r) => r.match_id);
        }

        console.log(`Recomputing impact for ${matchIds.length} match(es)...`);

        for (const mid of matchIds) {
            await conn.beginTransaction();
            try {
                await recomputeOneMatch(conn, mid, { skipMom });
                await conn.commit();
                console.log(`Match ${mid}: impact recomputed.`);
            } catch (e) {
                await conn.rollback();
                console.error(`Match ${mid} failed:`, e.message);
                throw e;
            }
        }

        console.log('Done.');
    } finally {
        conn.release();
        await pool.end();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
