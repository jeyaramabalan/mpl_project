// mpl-project/mpl-backend/controllers/admin/scoringController.js
const pool = require('../../config/db');
const { calculateImpactPoints } = require('../../utils/impactPoints');
const { promisify } = require('util');
const { execFile } = require('child_process');
const {
    getImpactSettings: loadImpactSettings,
    upsertImpactSettings,
    applySuperOverImpactMultiplier,
} = require('../../utils/impactSettings');
const execFileAsync = promisify(execFile);

// --- Helper functions (PLACEHOLDERS - Ensure you have actual implementations) ---
async function validateTeamsForSeason(teamIds, seasonId, connection) {
    // Example basic check, replace with your actual validation logic
    if (!seasonId || !Array.isArray(teamIds)) return false;
    console.log(`Placeholder validation for teams ${teamIds.join(',')} in season ${seasonId}`);
    return true; // Assume valid for now
}

function calculateNewOversDecimal(currentOversDecimal, isLegalDelivery) {
    // Example calculation, replace with your actual logic
    const completedOvers = Math.floor(currentOversDecimal);
    const ballsInCurrentOver = Math.round((currentOversDecimal - completedOvers) * 10);
    if (isLegalDelivery) {
        if (ballsInCurrentOver >= 5) { // Assume 6 balls per over
            return parseFloat(completedOvers + 1);
        } else {
            return parseFloat(`${completedOvers}.${ballsInCurrentOver + 1}`);
        }
    }
    return currentOversDecimal;
}

/**
 * MPL: "Legal delivery" excludes wide and no-ball (both are is_extra).
 * "Balls faced" for a batter = legal deliveries + no-balls; wides do not count as balls faced.
 * Source of truth: ballbyball (avoids drift from playermatchstats.legal_balls_faced).
 */
/** No-ball counts as a ball faced but not a legal delivery (extra_type may vary in legacy rows). */
const SQL_LEGAL_DELIVERY = 'CASE WHEN COALESCE(is_extra, 0) = 0 THEN 1 ELSE 0 END';
const SQL_BALLS_FACED = `CASE
    WHEN COALESCE(is_extra, 0) = 0 THEN 1
    WHEN LOWER(TRIM(COALESCE(extra_type, ''))) IN ('noball', 'no ball') OR extra_type = 'NoBall' THEN 1
    ELSE 0
END`;

/** Team runs per ball (face runs + extras + MPL super-over bonus bucket). */
const SQL_INNINGS_RUNS_PER_BALL = 'runs_scored + extra_runs + COALESCE(super_over_runs, 0)';

/** MySQL may return player_id as number, string, or BigInt — Map keys must match batsmanStats lookups. */
function normalizePlayerId(id) {
    if (id == null || id === '') return NaN;
    if (typeof id === 'bigint') return Number(id);
    const n = Number(id);
    return Number.isFinite(n) ? n : NaN;
}

/**
 * UI legal count: prefer current-inning BBB; if none (0) use match-wide (same idea as resolveLegalBallsForBatsman).
 * Must stay consistent with resolveLegalBallsForBatsman + retire button.
 */
function pickLegalBallsForUi(legInn, legMatch) {
    const li = Number(legInn) || 0;
    const lm = Number(legMatch) || 0;
    return li > 0 ? li : lm;
}

function pickBallsFacedForUi(facedInn, facedMatch, legInn) {
    const fi = Number(facedInn) || 0;
    const fm = Number(facedMatch) || 0;
    const li = Number(legInn) || 0;
    return fi > 0 || li > 0 ? fi : fm;
}

async function getBatsmanInningsStatsFromBallByBall(queryable, matchId, inningNumber) {
    const [rows] = await queryable.query(
        `SELECT
            batsman_on_strike_player_id AS player_id,
            SUM(${SQL_LEGAL_DELIVERY}) AS legal_deliveries,
            SUM(${SQL_BALLS_FACED}) AS deliveries_faced
         FROM ballbyball
         WHERE match_id = ? AND inning_number = ?
         GROUP BY batsman_on_strike_player_id`,
        [matchId, inningNumber]
    );
    const map = new Map();
    (rows || []).forEach((r) => {
        const pid = normalizePlayerId(r.player_id);
        if (Number.isNaN(pid)) return;
        map.set(pid, {
            legal: parseInt(r.legal_deliveries, 10) || 0,
            faced: parseInt(r.deliveries_faced, 10) || 0,
        });
    });
    return map;
}

/** Whole-match totals (used when inning_number on rows disagrees with current inning — avoids wiping PMS / showing 0 legal). */
async function getBatsmanMatchTotalsFromBallByBall(queryable, matchId) {
    const [rows] = await queryable.query(
        `SELECT
            batsman_on_strike_player_id AS player_id,
            SUM(${SQL_LEGAL_DELIVERY}) AS legal_deliveries,
            SUM(${SQL_BALLS_FACED}) AS deliveries_faced
         FROM ballbyball
         WHERE match_id = ?
         GROUP BY batsman_on_strike_player_id`,
        [matchId]
    );
    const map = new Map();
    (rows || []).forEach((r) => {
        const pid = normalizePlayerId(r.player_id);
        if (Number.isNaN(pid)) return;
        map.set(pid, {
            legal: parseInt(r.legal_deliveries, 10) || 0,
            faced: parseInt(r.deliveries_faced, 10) || 0,
        });
    });
    return map;
}

async function countLegalDeliveriesForBatsmanInInnings(queryable, matchId, inningNumber, batsmanPlayerId) {
    const pid = normalizePlayerId(batsmanPlayerId);
    if (Number.isNaN(pid)) return 0;
    const [rows] = await queryable.query(
        `SELECT COUNT(*) AS c FROM ballbyball
         WHERE match_id = ? AND inning_number = ? AND batsman_on_strike_player_id = ?
           AND COALESCE(is_extra, 0) = 0`,
        [matchId, inningNumber, pid]
    );
    return parseInt(rows[0]?.c, 10) || 0;
}

async function countLegalDeliveriesForBatsmanMatch(queryable, matchId, batsmanPlayerId) {
    const pid = normalizePlayerId(batsmanPlayerId);
    if (Number.isNaN(pid)) return 0;
    const [rows] = await queryable.query(
        `SELECT COUNT(*) AS c FROM ballbyball
         WHERE match_id = ? AND batsman_on_strike_player_id = ?
           AND COALESCE(is_extra, 0) = 0`,
        [matchId, pid]
    );
    return parseInt(rows[0]?.c, 10) || 0;
}

/**
 * Same effective legal count as striker UI (pickLegalBallsForUi): inning-scoped, else match-wide.
 * Keeps submit validation, retire API, and (X legal) label in sync.
 */
async function resolveLegalBallsForBatsman(queryable, matchId, inningNumber, batsmanPlayerId) {
    const inn = await countLegalDeliveriesForBatsmanInInnings(queryable, matchId, inningNumber, batsmanPlayerId);
    const all = await countLegalDeliveriesForBatsmanMatch(queryable, matchId, batsmanPlayerId);
    return pickLegalBallsForUi(inn, all);
}

// --- Impact points: shared helper in utils/impactPoints.js (face runs only; not affected by super_over_runs) ---

// --- End Helper Functions ---


// --- getMatchesForSetup (Includes Correct Logging) ---
/**
 * @desc    Get matches in 'Scheduled' status, ready for setup.
 * @route   GET /api/admin/scoring/setup-list
 * @access  Admin (Protected)
 */
exports.getMatchesForSetup = async (req, res, next) => {
    console.log('--- ENTERING getMatchesForSetup ---'); // Log Entry
    try {
        // Match number = position in full season (all statuses) by match_datetime, so completed Match 1 won't shift numbers
        const query = `
            SELECT m.match_id, m.season_id, m.match_datetime, m.super_over_number, t1.name as team1_name, t2.name as team2_name, t1.team_id as team1_id, t2.team_id as team2_id,
                (SELECT COUNT(*) FROM matches m2
                 WHERE m2.season_id = m.season_id
                   AND (m2.match_datetime < m.match_datetime OR (m2.match_datetime = m.match_datetime AND m2.match_id <= m.match_id))
                ) AS match_number
            FROM matches m
            JOIN teams t1 ON m.team1_id = t1.team_id
            JOIN teams t2 ON m.team2_id = t2.team_id
            WHERE m.status = 'Scheduled'
            ORDER BY m.season_id ASC, m.match_datetime ASC
        `;
        console.log('--- Executing setup list query ---'); // Log Query Execution
        const [rows] = await pool.query(query);
        const matches = rows.map((row) => ({
            match_id: row.match_id,
            season_id: row.season_id,
            match_datetime: row.match_datetime,
            super_over_number: row.super_over_number,
            team1_name: row.team1_name,
            team2_name: row.team2_name,
            team1_id: row.team1_id,
            team2_id: row.team2_id,
            match_number: row.match_number != null ? Number(row.match_number) : null,
        }));
        console.log(`--- Query finished, found ${matches.length} matches ---`); // Log Query Result
        res.json(matches);
        console.log('--- Response sent from getMatchesForSetup ---'); // Log Response Sent
    } catch (error) {
        console.error("Get Matches for Setup Error:", error); // Log Error Details
        console.log('--- Error in getMatchesForSetup, calling next() ---'); // Log Error Handling
        next(error);
    }
};

/**
 * @desc    Get matches that can be resumed for scoring.
 * @route   GET /api/admin/scoring/resume-list
 * @access  Admin (Protected)
 */
exports.getMatchesForResume = async (req, res, next) => {
    console.log('--- ENTERING getMatchesForResume ---');
    try {
        const query = `
            SELECT m.match_id, m.season_id, m.match_datetime, m.status, m.super_over_number,
                   t1.name as team1_name, t2.name as team2_name, t1.team_id as team1_id, t2.team_id as team2_id,
                   (SELECT COUNT(*) FROM matches m2
                    WHERE m2.season_id = m.season_id
                      AND (m2.match_datetime < m.match_datetime OR (m2.match_datetime = m.match_datetime AND m2.match_id <= m.match_id))
                   ) AS match_number
            FROM matches m
            JOIN teams t1 ON m.team1_id = t1.team_id
            JOIN teams t2 ON m.team2_id = t2.team_id
            WHERE m.status IN ('Setup', 'Live', 'InningsBreak')
            ORDER BY
                CASE m.status
                    WHEN 'Live' THEN 1
                    WHEN 'InningsBreak' THEN 2
                    WHEN 'Setup' THEN 3
                    ELSE 4
                END,
                m.match_datetime ASC
        `;
        const [rows] = await pool.query(query);
        const matches = rows.map((row) => ({
            match_id: row.match_id,
            season_id: row.season_id,
            match_datetime: row.match_datetime,
            status: row.status,
            super_over_number: row.super_over_number,
            team1_name: row.team1_name,
            team2_name: row.team2_name,
            team1_id: row.team1_id,
            team2_id: row.team2_id,
            match_number: row.match_number != null ? Number(row.match_number) : null,
        }));
        console.log(`--- Resume list query finished, found ${matches.length} matches ---`);
        res.json(matches);
    } catch (error) {
        console.error("Get Matches for Resume Error:", error);
        next(error);
    }
};

exports.getImpactSettings = async (req, res, next) => {
    try {
        const settings = await loadImpactSettings(pool);
        res.json(settings);
    } catch (error) {
        next(error);
    }
};

exports.updateImpactSettings = async (req, res, next) => {
    try {
        const payload = {
            batting_dot_ball: Number(req.body?.batting_dot_ball),
            batting_one_run: Number(req.body?.batting_one_run),
            batting_two_runs: Number(req.body?.batting_two_runs),
            batting_four_runs: Number(req.body?.batting_four_runs),
            bowling_legal_dot: Number(req.body?.bowling_legal_dot),
            bowling_extra_dot: Number(req.body?.bowling_extra_dot),
            bowling_legal_one: Number(req.body?.bowling_legal_one),
            bowling_extra_one: Number(req.body?.bowling_extra_one),
            bowling_two_conceded: Number(req.body?.bowling_two_conceded),
            bowling_four_conceded: Number(req.body?.bowling_four_conceded),
            bowling_extra_other: Number(req.body?.bowling_extra_other),
            bowling_wicket_bonus: Number(req.body?.bowling_wicket_bonus),
            fielding_catch_stumping: Number(req.body?.fielding_catch_stumping),
            super_over_batting_multiplier: Number(req.body?.super_over_batting_multiplier),
            super_over_bowling_multiplier: Number(req.body?.super_over_bowling_multiplier),
        };
        const invalid = Object.entries(payload).find(([, v]) => !Number.isFinite(v));
        if (invalid) {
            return res.status(400).json({ message: `Invalid value for ${invalid[0]}.` });
        }
        if (payload.super_over_batting_multiplier <= 0 || payload.super_over_bowling_multiplier <= 0) {
            return res.status(400).json({ message: 'Super over multipliers must be positive numbers.' });
        }
        await upsertImpactSettings(pool, payload);
        const latest = await loadImpactSettings(pool);
        res.json({ message: 'Impact settings updated.', settings: latest });
    } catch (error) {
        next(error);
    }
};

exports.recalculateMatchStats = async (req, res) => {
    const matchId = parseInt(req.params.matchId, 10);
    if (!Number.isFinite(matchId)) return res.status(400).json({ message: 'Invalid Match ID.' });
    try {
        const scriptsDir = require('path').join(__dirname, '../../scripts');
        await execFileAsync(process.execPath, ['resync-pms-from-ballbyball.js', `--match-id=${matchId}`], { cwd: scriptsDir });
        await execFileAsync(process.execPath, ['recompute-impact-from-ballbyball.js', `--match-id=${matchId}`], { cwd: scriptsDir });
        res.json({ message: `Recalculation complete for match ${matchId}.` });
    } catch (error) {
        const message = error?.stderr?.trim() || error?.stdout?.trim() || error.message || 'Recalculation failed.';
        res.status(500).json({ message });
    }
};

async function runRecalcForMatchIds(matchIds) {
    const scriptsDir = require('path').join(__dirname, '../../scripts');
    for (const mid of matchIds) {
        await execFileAsync(process.execPath, ['resync-pms-from-ballbyball.js', `--match-id=${mid}`], { cwd: scriptsDir });
        await execFileAsync(process.execPath, ['recompute-impact-from-ballbyball.js', `--match-id=${mid}`], { cwd: scriptsDir });
    }
}

exports.recalculateSeasonStats = async (req, res) => {
    const seasonId = parseInt(req.params.seasonId, 10);
    if (!Number.isFinite(seasonId)) return res.status(400).json({ message: 'Invalid Season ID.' });
    try {
        const [rows] = await pool.query('SELECT match_id FROM matches WHERE season_id = ? ORDER BY match_id', [seasonId]);
        const matchIds = rows.map((r) => Number(r.match_id)).filter(Number.isFinite);
        if (matchIds.length === 0) {
            return res.status(404).json({ message: `No matches found for season ${seasonId}.` });
        }
        await runRecalcForMatchIds(matchIds);
        res.json({ message: `Recalculation complete for season ${seasonId}.`, matches_processed: matchIds.length });
    } catch (error) {
        const message = error?.stderr?.trim() || error?.stdout?.trim() || error.message || 'Season recalculation failed.';
        res.status(500).json({ message });
    }
};

exports.recalculateAllStats = async (_req, res) => {
    try {
        const scriptsDir = require('path').join(__dirname, '../../scripts');
        await execFileAsync(process.execPath, ['resync-pms-from-ballbyball.js'], { cwd: scriptsDir });
        await execFileAsync(process.execPath, ['recompute-impact-from-ballbyball.js'], { cwd: scriptsDir });
        res.json({ message: 'Recalculation complete for all seasons.' });
    } catch (error) {
        const message = error?.stderr?.trim() || error?.stdout?.trim() || error.message || 'Global recalculation failed.';
        res.status(500).json({ message });
    }
};

// --- submitMatchSetup ---
/**
 * @desc    Submit toss winner, decision, and super over number. Sets up player stats entries.
 * @route   POST /api/admin/scoring/matches/:matchId/setup
 * @access  Admin (Protected)
 */
exports.submitMatchSetup = async (req, res, next) => {
    const matchId = parseInt(req.params.matchId);
    const { toss_winner_team_id, decision } = req.body;

    // Validation
    if (isNaN(matchId)) return res.status(400).json({ message: 'Invalid Match ID.' });
    if (!toss_winner_team_id || isNaN(parseInt(toss_winner_team_id))) return res.status(400).json({ message: 'Valid Toss Winner Team ID is required.' });
    if (!decision || !['Bat', 'Bowl'].includes(decision)) return res.status(400).json({ message: 'Decision must be "Bat" or "Bowl".' });

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        console.log(`--- Starting Setup for Match ${matchId} ---`);

        // 1. Check Match Status & Get Details (use super_over_number from schedule)
        const [matchCheck] = await connection.query('SELECT status, team1_id, team2_id, season_id, super_over_number FROM matches WHERE match_id = ? FOR UPDATE', [matchId]);
        if (matchCheck.length === 0) throw new Error('Match not found.');
        if (matchCheck[0].status !== 'Scheduled') throw new Error(`Match cannot be set up. Current status: ${matchCheck[0].status}`);
        const { team1_id, team2_id, season_id, super_over_number: dbSuperOver } = matchCheck[0];
        // Super over must be 1–4 only (Over 5 cannot be Super Over per rules)
        const super_over_number = (dbSuperOver != null && dbSuperOver >= 1 && dbSuperOver <= 4) ? parseInt(dbSuperOver) : 1;

        // 2. Validate Toss Winner ID
        if (parseInt(toss_winner_team_id) !== team1_id && parseInt(toss_winner_team_id) !== team2_id) throw new Error('Toss winner ID does not match teams in the match.');

        // 3. Update Match Table (only status, toss winner, decision; keep existing super_over_number from schedule)
        console.log(`--- Updating Match ${matchId} status to Setup ---`);
        await connection.query(
            'UPDATE matches SET status = ?, toss_winner_team_id = ?, decision = ? WHERE match_id = ?',
            ['Setup', parseInt(toss_winner_team_id), decision, matchId]
        );

        // 4. Create initial PlayerMatchStats entries
        console.log(`--- Fetching players for teams ${team1_id} and ${team2_id} ---`);
        const [team1Players] = await connection.query('SELECT player_id FROM teamplayers WHERE team_id = ? AND season_id = ?', [team1_id, season_id]);
        const [team2Players] = await connection.query('SELECT player_id FROM teamplayers WHERE team_id = ? AND season_id = ?', [team2_id, season_id]);
        const allPlayers = [
            ...team1Players.map(p => ({ player_id: p.player_id, team_id: team1_id })),
            ...team2Players.map(p => ({ player_id: p.player_id, team_id: team2_id }))
        ];

        if (allPlayers.length === 0) {
            console.warn(`Match ${matchId} setup: No players found assigned. Skipping PlayerMatchStats initialization.`);
        } else {
            console.log(`--- Initializing PlayerMatchStats for ${allPlayers.length} players ---`);
            const statsInsertPromises = allPlayers.map(p =>
                // MODIFIED: Add impact points initialized to 0
                connection.query('INSERT INTO playermatchstats (match_id, player_id, team_id, batting_impact_points, bowling_impact_points, fielding_impact_points) VALUES (?, ?, ?, 0, 0, 0)', [matchId, p.player_id, p.team_id])
                    .catch(err => { if (err.code === 'ER_DUP_ENTRY') { console.warn(`PlayerMatchStats entry exists for match ${matchId}, player ${p.player_id}. Ignoring.`); return null; } throw err; })
            );
            await Promise.all(statsInsertPromises);
            console.log(`--- PlayerMatchStats initialization complete ---`);
        }

        // 5. Commit
        await connection.commit();
        console.log(`--- Match ${matchId} setup committed ---`);

        // 6. Prepare Initial State for Frontend/Sockets
        const fetchPlayerNames = async (playerIds) => { if (!playerIds || playerIds.length === 0) return []; const placeholders = playerIds.map(() => '?').join(','); const [names] = await pool.query(`SELECT player_id, name FROM players WHERE player_id IN (${placeholders})`, playerIds.map(p => p.player_id)); return names; };
        const battingTeamDbList = (decision === 'Bat' && toss_winner_team_id == team1_id) || (decision === 'Bowl' && toss_winner_team_id != team1_id) ? team1Players : team2Players;
        const bowlingTeamDbList = (decision === 'Bat' && toss_winner_team_id == team1_id) || (decision === 'Bowl' && toss_winner_team_id != team1_id) ? team2Players : team1Players;
        const battingTeamPlayerDetails = await fetchPlayerNames(battingTeamDbList);
        const bowlingTeamPlayerDetails = await fetchPlayerNames(bowlingTeamDbList);

        const initialState = {
            matchId: matchId, seasonId: season_id, status: 'Setup', inningNumber: 1,
            score: 0, wickets: 0, overs: 0, balls: 0, superOver: parseInt(super_over_number), target: null,
            battingTeamId: (decision === 'Bat') ? toss_winner_team_id : (toss_winner_team_id == team1_id ? team2_id : team1_id),
            bowlingTeamId: (decision === 'Bowl') ? toss_winner_team_id : (toss_winner_team_id == team1_id ? team2_id : team1_id),
            playersBattingTeam: battingTeamPlayerDetails, playersBowlingTeam: bowlingTeamPlayerDetails,
            batsmenOutIds: [], bowlerStats: [],
            lastBallCommentary: "Match setup complete. Select opening players.", recentBallsSummary: "",
        };
        console.log(`--- Sending initial state for Match ${matchId} ---`);
        res.status(200).json({ message: 'Match setup successful. Ready for live scoring.', initialState });

    } catch (error) {
        await connection.rollback();
        console.error(`Error setting up match ${matchId}:`, error);
        const statusCode = error.message.includes('not found') ? 404 : (error.message.includes('already set up') || error.message.includes('Current status') || error.message.includes('does not match')) ? 400 : 500;
        res.status(statusCode).json({ message: error.message || 'Database error occurred during match setup.' });
    } finally {
        if (connection) connection.release();
    }
};

// --- NEW: getLiveMatchState ---
/**
 * @desc    Get the current detailed state of a match for resuming scoring or display.
 * @route   GET /api/admin/scoring/matches/:matchId/state
 * @access  Admin (Protected)
 */
exports.getLiveMatchState = async (req, res, next) => {
    const matchId = parseInt(req.params.matchId);
    if (isNaN(matchId)) return res.status(400).json({ message: 'Invalid Match ID.' });

    console.log(`--- ENTERING getLiveMatchState for Match ${matchId} ---`);

    try {
        // --- 1. Fetch Basic Match Details ---
        const [matches] = await pool.query('SELECT m.*, t1.name as team1_name, t2.name as team2_name FROM matches m join teams t1 on m.team1_id = t1.team_id join teams t2 on m.team2_id = t2.team_id WHERE m.match_id = ? ;', [matchId]);
        if (matches.length === 0) {
            console.log(`--- getLiveMatchState: Match ${matchId} not found ---`);
            return res.status(404).json({ message: 'Match not found.' });
        }
        const match = matches[0];
        const { status, team1_id, team2_id, team1_name, team2_name, toss_winner_team_id, decision, season_id, super_over_number } = match;
        console.log(`--- getLiveMatchState: Match ${matchId} Status: ${status} ---`);

        // --- Handle simple statuses first (Scheduled, Abandoned) ---
        if (status === 'Scheduled' || status === 'Abandoned') {
            console.log(`--- getLiveMatchState: Returning minimal state for status ${status} ---`);
            return res.json({
                matchId: matchId, status: status, seasonId: season_id, superOver: super_over_number,
                team1_id: team1_id, team2_id: team2_id,

                team1_name: team1_name, team2_name: team2_name,
            });
        }

        // --- 2. Determine Current Inning & Teams (for Setup, Live, InningsBreak, Completed) ---

        let inningNumber = 1; // Default to 1

        if (status === 'InningsBreak' || status === 'Completed') {
            // If the match status clearly indicates inning 2 has started or finished
            inningNumber = 2;
        } else if (status === 'Live') {
            // If live, check the inning of the last recorded ball
            const [lastBall] = await pool.query('SELECT inning_number FROM ballbyball WHERE match_id = ? ORDER BY ball_id DESC LIMIT 1', [matchId]);
            if (lastBall.length > 0) {
                // Trust the inning number of the last ball bowled if status is Live
                inningNumber = lastBall[0].inning_number;
            } // If no last ball and Live, default inning 1 is correct
        } // If status is Setup, default inning 1 is correct

        // --- Determine batting/bowling teams based on the determined inningNumber ---
        let battingTeamId, bowlingTeamId, battingTeamName, bowlingTeamName;
        if (inningNumber === 1) {
            battingTeamId = (decision === 'Bat') ? toss_winner_team_id : (toss_winner_team_id == team1_id ? team2_id : team1_id);
            bowlingTeamId = (battingTeamId == team1_id) ? team2_id : team1_id;
            battingTeamName = (decision === 'Bat' && toss_winner_team_id == team1_id) ? team1_name : team2_name;
            bowlingTeamName = (battingTeamId == team1_id) ? team2_name : team1_name;
        }
        else {
            bowlingTeamId = (decision === 'Bat') ? toss_winner_team_id : (toss_winner_team_id == team1_id ? team2_id : team1_id);
            battingTeamId = (bowlingTeamId == team1_id) ? team2_id : team1_id;
            bowlingTeamName = (decision === 'Bat' && toss_winner_team_id == team1_id) ? team1_name : team2_name;
            battingTeamName = (bowlingTeamId == team1_id) ? team2_name : team1_name;
        }
        console.log(`--- getLiveMatchState: Determined Inning=${inningNumber}, Batting=${battingTeamId}, Bowling=${bowlingTeamId} ---`);

        // --- 3. Calculate Current Score, Wickets, Overs, Target ---
        const [summaryScoreData] = await pool.query(`SELECT SUM(${SQL_INNINGS_RUNS_PER_BALL}) as totalScore FROM ballbyball WHERE match_id = ? AND inning_number = ?`, [matchId, inningNumber]);
        const [summaryWicketData] = await pool.query(`SELECT COUNT(*) as totalWickets FROM playermatchstats WHERE match_id = ? AND team_id = ? AND is_out = TRUE`, [matchId, battingTeamId]);
        const score = summaryScoreData[0]?.totalScore || 0;
        let wickets = summaryWicketData[0]?.totalWickets || 0;
        const [bbbWicketRows] = await pool.query(
            `SELECT COUNT(*) AS c FROM ballbyball WHERE match_id = ? AND inning_number = ? AND COALESCE(is_wicket, 0) = 1`,
            [matchId, inningNumber]
        );
        const wicketsFromBbb = parseInt(bbbWicketRows[0]?.c, 10) || 0;
        wickets = Math.max(wickets, wicketsFromBbb);
        const [ballsInInningsRow] = await pool.query(
            `SELECT COUNT(*) AS c FROM ballbyball WHERE match_id = ? AND inning_number = ?`,
            [matchId, inningNumber]
        );
        const ballsInCurrentInnings = Number(ballsInInningsRow[0]?.c) || 0;

        // Calculate current overs/balls display (using corrected logic)
        const maxOvers = 5;
        let displayOver = 0;
        let displayBall = 0;
        const [overProgressData] = await pool.query(`
             SELECT over_number, COUNT(*) as legal_balls
             FROM ballbyball
             WHERE match_id = ? AND inning_number = ? AND (is_extra = false)
             GROUP BY over_number ORDER BY over_number DESC LIMIT 1
         `, [matchId, inningNumber]);

        if (overProgressData.length > 0) {
            const lastLegalOverNum = overProgressData[0].over_number;
            const ballsInLastLegalOver = overProgressData[0].legal_balls;
            if (ballsInLastLegalOver >= 6) {
                displayOver = Math.min(maxOvers, lastLegalOverNum); // Show completed overs
                displayBall = 0;
            } else {
                displayOver = Math.min(maxOvers, lastLegalOverNum - 1); // Show previously completed
                displayBall = ballsInLastLegalOver;
            }
        } // If no legal balls, displayOver and displayBall remain 0

        // Handle end of innings display override
        if (status === 'InningsBreak' || status === 'Completed') {
            displayOver = maxOvers; // Show 5.0 at end of innings
            displayBall = 0;
        }
        // Cap display at maxOvers.0 so we never show e.g. 5.5 or 6.0 for a 5-over innings
        if (displayOver > maxOvers || (displayOver === maxOvers && displayBall > 0)) {
            displayOver = maxOvers;
            displayBall = 0;
        }
        console.log(`--- getLiveMatchState: Calculated Score=${score}/${wickets}, Overs=${displayOver}.${displayBall} ---`);

        let targetScore = 0;
        if (inningNumber === 2 || status === 'InningsBreak' || status === 'Completed') {
            const [scoreDataInning1] = await pool.query(`SELECT SUM(${SQL_INNINGS_RUNS_PER_BALL}) as score FROM ballbyball WHERE match_id = ? AND inning_number = 1`, [matchId]);
            targetScore = Number((scoreDataInning1[0]?.score || 0)) + 1;
            console.log(`--- getLiveMatchState: Target Score = ${targetScore} ---`);
        }

        // --- 4. Fetch Player Lists, Out Batsmen, Bowler Stats ---
        const fetchPlayerNames = async (playerIds) => { if (!playerIds || playerIds.length === 0) return []; const placeholders = playerIds.map(() => '?').join(','); const [names] = await pool.query(`SELECT player_id, name FROM players WHERE player_id IN (${placeholders})`, playerIds.map(p => p.player_id || p)); return names; };
        const [team1PlayersDb] = await pool.query('SELECT player_id FROM teamplayers WHERE team_id = ? AND season_id = ?', [team1_id, season_id]);
        const [team2PlayersDb] = await pool.query('SELECT player_id FROM teamplayers WHERE team_id = ? AND season_id = ?', [team2_id, season_id]);
        const team1PlayerDetails = await fetchPlayerNames(team1PlayersDb);
        const team2PlayerDetails = await fetchPlayerNames(team2PlayersDb);
        const battingPlayersList = battingTeamId === team1_id ? team1PlayerDetails : team2PlayerDetails;
        const bowlingPlayersList = bowlingTeamId === team1_id ? team1PlayerDetails : team2PlayerDetails;

        const [batsmenOutStats] = await pool.query(`SELECT player_id FROM playermatchstats WHERE match_id = ? AND team_id = ? AND is_out = TRUE`, [matchId, battingTeamId]);
        const [batsmenOutFromBbb] = await pool.query(
            `SELECT DISTINCT batsman_on_strike_player_id AS player_id
             FROM ballbyball
             WHERE match_id = ? AND inning_number = ? AND COALESCE(is_wicket, 0) = 1`,
            [matchId, inningNumber]
        );
        const outIdSet = new Set([
            ...(batsmenOutStats || []).map((b) => Number(b.player_id)),
            ...(batsmenOutFromBbb || []).map((b) => Number(b.player_id)),
        ]);
        const batsmenOutIds = [...outIdSet];

        // Retired batters (must retire after 12 legal balls; excluded from batting until all others out)
        let batsmenRetiredIds = [];
        let retirementOrder = [];
        try {
            const [retiredStats] = await pool.query(`SELECT player_id, COALESCE(retirement_sequence, 0) as retirement_sequence FROM playermatchstats WHERE match_id = ? AND team_id = ? AND COALESCE(retired, 0) = 1`, [matchId, battingTeamId]);
            batsmenRetiredIds = (retiredStats || []).map(b => b.player_id);
            retirementOrder = (retiredStats || []).sort((a, b) => (a.retirement_sequence || 0) - (b.retirement_sequence || 0)).map(b => b.player_id);
        } catch (e) {
            // Columns retired/retirement_sequence may not exist before migration
        }

        const [currentBowlerStats] = await pool.query(`SELECT ps.player_id, FLOOR(ps.overs_bowled) as completed_overs,p.name as player_name FROM playermatchstats ps join players p on ps.player_id = p.player_id  WHERE ps.match_id = ? AND ps.team_id = ? AND ps.overs_bowled > 0`, [matchId, bowlingTeamId]);
        console.log(`--- getLiveMatchState: Fetched ${batsmenOutIds.length} out batsmen, ${batsmenRetiredIds.length} retired, ${currentBowlerStats.length} bowlers with stats ---`);

        // Last over bowler and bowlers-by-over for eligibility (Over 5: exclude 4th over bowler and Super Over bowler; overs 1–4: four different bowlers)
        let lastOverBowlerId = null;
        let nextBallStartsNewOver = false; // true only when last ball was 6th legal of over (so next ball is ball 1 of new over)
        const bowlersByOver = {};
        if (['Live', 'InningsBreak', 'Completed'].includes(status)) {
            const [overBowlersRows] = await pool.query(`
                SELECT over_number, MIN(bowler_player_id) AS bowler_player_id FROM ballbyball
                WHERE match_id = ? AND inning_number = ?
                GROUP BY over_number
            `, [matchId, inningNumber]);
            (overBowlersRows || []).forEach(row => {
                bowlersByOver[row.over_number] = [row.bowler_player_id];
            });
            const [lastBallRow] = await pool.query(`SELECT bowler_player_id, over_number FROM ballbyball WHERE match_id = ? AND inning_number = ? ORDER BY ball_id DESC LIMIT 1`, [matchId, inningNumber]);
            if (lastBallRow.length > 0) {
                lastOverBowlerId = lastBallRow[0].bowler_player_id;
                const lastOverNum = lastBallRow[0].over_number;
                const [legalInLastOver] = await pool.query(
                    `SELECT COUNT(*) AS cnt FROM ballbyball WHERE match_id = ? AND inning_number = ? AND over_number = ? AND (is_extra = false)`,
                    [matchId, inningNumber, lastOverNum]
                );
                nextBallStartsNewOver = (legalInLastOver[0]?.cnt || 0) >= 6;
            }
        }

        // Batsman stats for current innings — legal vs balls faced come from ball-by-ball (MPL: wide ≠ legal, wide ≠ ball faced; no-ball ≠ legal but = ball faced)
        let batsmanStats = [];
        try {
            const [batsmanStatsRows] = await pool.query(`SELECT player_id, balls_faced, COALESCE(legal_balls_faced, 0) as legal_balls_faced, COALESCE(retired, 0) as retired FROM playermatchstats WHERE match_id = ? AND team_id = ?`, [matchId, battingTeamId]);
            batsmanStats = (batsmanStatsRows || []).map(r => ({ player_id: r.player_id, balls_faced: r.balls_faced || 0, legal_balls_faced: r.legal_balls_faced || 0, retired: !!r.retired }));
        } catch (e) {
            // retired column may not exist before migration
            const [batsmanStatsRows] = await pool.query(`SELECT player_id, balls_faced FROM playermatchstats WHERE match_id = ? AND team_id = ?`, [matchId, battingTeamId]);
            batsmanStats = (batsmanStatsRows || []).map(r => ({ player_id: r.player_id, balls_faced: r.balls_faced || 0, legal_balls_faced: 0, retired: false }));
        }
        const inningsBbbStats = await getBatsmanInningsStatsFromBallByBall(pool, matchId, inningNumber);
        const matchBbbStats = await getBatsmanMatchTotalsFromBallByBall(pool, matchId);
        batsmanStats = batsmanStats.map((row) => {
            const pid = normalizePlayerId(row.player_id);
            if (Number.isNaN(pid)) return { ...row };
            const bInn = inningsBbbStats.get(pid);
            const bMatch = matchBbbStats.get(pid);
            const legInn = bInn ? (bInn.legal || 0) : 0;
            const legMatch = bMatch ? (bMatch.legal || 0) : 0;
            const facedInn = bInn ? (bInn.faced || 0) : 0;
            const facedMatch = bMatch ? (bMatch.faced || 0) : 0;
            const legal = pickLegalBallsForUi(legInn, legMatch);
            const faced = pickBallsFacedForUi(facedInn, facedMatch, legInn);
            if (legal === 0 && faced === 0) {
                return { ...row };
            }
            return { ...row, legal_balls_faced: legal, balls_faced: faced };
        });

        // --- 5. Fetch Recent Commentary ---
        //const [recentCommentaryData] = await pool.query(`SELECT ball_id, commentary_text FROM ballbyball WHERE match_id = ? ORDER BY ball_id DESC LIMIT 10`, [matchId]);
        //const recentBallsSummary = recentCommentaryData.length > 0 ? recentCommentaryData.slice().reverse().map(b => b.commentary_text?.split(':')[0] || '?').join(', ') : '';
        //const lastBallCommentary = recentCommentaryData[0]?.commentary_text || (status === 'Setup' ? 'Match setup complete. Select opening players.' : 'No commentary yet.');
        //console.log(`--- getLiveMatchState: Last commentary event: ${lastBallCommentary} ---`);

        // --- 5. Fetch Recent Commentary with Enriched Ball Summary ---
        // MERGE FIX: This query now gets the full ball object and joins with matches 
        // to determine if a ball was part of the super over. Limit is increased.
        const [recentCommentaryData] = await pool.query(`
            SELECT b.*, (b.over_number = m.super_over_number) AS is_super_over_ball
            FROM ballbyball b
            JOIN matches m ON b.match_id = m.match_id
            WHERE b.match_id = ?
            ORDER BY b.ball_id DESC
            LIMIT 50
        `, [matchId]);

        const recentBallsSummary = recentCommentaryData.length > 0
            ? recentCommentaryData.slice().reverse().map(ball => {
                const ballLabel = `${ball.over_number}.${ball.ball_number_in_over}`;
                let summary = '';

                // Handle wicket
                if (ball.is_wicket) {
                    summary = 'WKT';
                } else {
                    const totalOnBall =
                        Number(ball.runs_scored || 0) +
                        Number(ball.extra_runs || 0) +
                        Number(ball.super_over_runs || 0);
                    summary = `${totalOnBall}`;

                    // Add bye if applicable
                    if (ball.is_bye) {
                        summary += ' BYE';
                    }

                    // Add extras
                    if (ball.is_extra && ball.extra_type) {
                        summary += `+${ball.extra_type === 'NoBall' ? 'NB' : 'WD'}`;
                    }
                }

                return `${summary}`;
            }).join(', ')
            : '';

        const lastBallCommentary = recentCommentaryData[0]?.commentary_text || (
            status === 'Setup' ? 'Match setup complete. Select opening players.' : 'No commentary yet.'
        );

        const lastBallRow = recentCommentaryData[0];
        const lastBallFieldingAdjustment =
            lastBallRow &&
            (lastBallRow.fielding_adjustment_type != null || lastBallRow.fielding_adjustment_points != null)
                ? {
                    type: lastBallRow.fielding_adjustment_type,
                    points:
                        lastBallRow.fielding_adjustment_points != null
                            ? Number(lastBallRow.fielding_adjustment_points)
                            : null,
                }
                : null;

        // For admin UI + fielding-bonus validation only (does not affect ball scoring)
        const lastBallIsWicket = !!(lastBallRow && (lastBallRow.is_wicket === true || lastBallRow.is_wicket === 1 || lastBallRow.is_wicket === '1'));
        const lastBallWicketType = lastBallRow?.wicket_type != null ? String(lastBallRow.wicket_type) : null;
        const lastBallIsCaughtWicket = lastBallIsWicket && lastBallWicketType === 'Caught';
        const lastBallFielderPlayerId =
            lastBallRow?.fielder_player_id != null && lastBallRow.fielder_player_id !== ''
                ? Number(lastBallRow.fielder_player_id)
                : null;

        console.log(`--- getLiveMatchState: Last commentary event: ${lastBallCommentary} ---`);

        // Super over must be 1–4 only (normalize legacy data that may have 5)
        const superOverNormalized = (super_over_number >= 1 && super_over_number <= 4) ? super_over_number : 1;

        // --- 6. Construct and Return State ---
        const fullLiveState = {
            matchId: matchId, status: status, inningNumber: inningNumber,
            score: score, wickets: wickets, ballsInCurrentInnings,
            overs: displayOver, balls: displayBall, target: targetScore, superOver: superOverNormalized,
            battingTeamId: battingTeamId, bowlingTeamId: bowlingTeamId,
            battingTeamName: battingTeamName, bowlingTeamName: bowlingTeamName,
            team1_id: match.team1_id, team2_id: match.team2_id, team1_name: match.team1_name, team2_name: match.team2_name,
            toss_winner_team_id: match.toss_winner_team_id, decision: match.decision,
            lastBallCommentary: lastBallCommentary, recentBallsSummary: recentBallsSummary,
            lastBallFieldingAdjustment,
            lastBallIsWicket,
            lastBallWicketType,
            lastBallIsCaughtWicket,
            lastBallFielderPlayerId: Number.isFinite(lastBallFielderPlayerId) ? lastBallFielderPlayerId : null,
            bowlerStats: currentBowlerStats, batsmenOutIds: batsmenOutIds,
            batsmenRetiredIds: batsmenRetiredIds || [], retirementOrder: retirementOrder || [],
            batsmanStats: batsmanStats || [], lastOverBowlerId, nextBallStartsNewOver, bowlersByOver: bowlersByOver || {},
            playersBattingTeam: battingPlayersList, playersBowlingTeam: bowlingPlayersList,
            seasonId: season_id,
            resultSummary: match.result_summary, winnerTeamId: match.winner_team_id
        };
                // MERGE FIX: If the match is completed, calculate and add the authoritative 
        // first innings score to the state object for the summary page display.
        if (status === 'Completed') {
            const [scoreDataInning1] = await pool.query(`SELECT SUM(${SQL_INNINGS_RUNS_PER_BALL}) as score FROM ballbyball WHERE match_id = ? AND inning_number = 1`, [matchId]);
            fullLiveState.innings1_score = Number(scoreDataInning1[0]?.score) || 0;
        }

        console.log(`--- getLiveMatchState: Sending full state for match ${matchId} ---`);
        res.json(fullLiveState);

    } catch (error) {
        console.error(`Error in getLiveMatchState for Match ${matchId}:`, error);
        next(error);
    }
};

/**
 * @desc    Update toss decision (toss winner + Bat/Bowl) only when no ball has been bowled.
 * @route   PATCH /api/admin/scoring/matches/:matchId/toss
 * @access  Admin (Protected)
 */
exports.updateToss = async (req, res, next) => {
    const matchId = parseInt(req.params.matchId);
    const { toss_winner_team_id, decision } = req.body;

    if (isNaN(matchId)) return res.status(400).json({ message: 'Invalid Match ID.' });
    if (!toss_winner_team_id || isNaN(parseInt(toss_winner_team_id))) return res.status(400).json({ message: 'Valid Toss Winner Team ID is required.' });
    if (!decision || !['Bat', 'Bowl'].includes(decision)) return res.status(400).json({ message: 'Decision must be "Bat" or "Bowl".' });

    try {
        const [matchRows] = await pool.query(
            'SELECT status, team1_id, team2_id FROM matches WHERE match_id = ?',
            [matchId]
        );
        if (matchRows.length === 0) return res.status(404).json({ message: 'Match not found.' });
        const match = matchRows[0];
        const { status, team1_id, team2_id } = match;

        const allowedStatuses = ['Setup', 'Live'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: `Toss can only be changed when match is in Setup or Live with no balls bowled. Current status: ${status}.` });
        }

        const [ballCount] = await pool.query('SELECT COUNT(*) as cnt FROM ballbyball WHERE match_id = ?', [matchId]);
        if ((ballCount[0]?.cnt || 0) > 0) {
            return res.status(400).json({ message: 'Toss cannot be changed after the first ball has been bowled.' });
        }

        if (parseInt(toss_winner_team_id) !== team1_id && parseInt(toss_winner_team_id) !== team2_id) {
            return res.status(400).json({ message: 'Toss winner ID does not match either team in the match.' });
        }

        await pool.query(
            'UPDATE matches SET toss_winner_team_id = ?, decision = ? WHERE match_id = ?',
            [parseInt(toss_winner_team_id), decision, matchId]
        );
        console.log(`--- Match ${matchId}: Toss updated to winner=${toss_winner_team_id}, decision=${decision} ---`);
        res.status(200).json({ message: 'Toss updated successfully.' });
    } catch (error) {
        console.error(`Error updating toss for Match ${matchId}:`, error);
        next(error);
    }
};

/**
 * @desc    Revert match to Scheduled (clear toss, remove scoring data). Only when no ball has been bowled.
 * @route   POST /api/admin/scoring/matches/:matchId/revert-to-scheduled
 * @access  Admin (Protected)
 */
exports.revertToScheduled = async (req, res, next) => {
    const matchId = parseInt(req.params.matchId);
    if (isNaN(matchId)) return res.status(400).json({ message: 'Invalid Match ID.' });

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [matchRows] = await connection.query(
            'SELECT status FROM matches WHERE match_id = ? FOR UPDATE',
            [matchId]
        );
        if (matchRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Match not found.' });
        }
        const status = matchRows[0].status;

        const allowedStatuses = ['Setup', 'Live'];
        if (!allowedStatuses.includes(status)) {
            await connection.rollback();
            return res.status(400).json({ message: `Match can only be reverted to Scheduled when status is Setup or Live with no balls bowled. Current status: ${status}.` });
        }

        const [ballCount] = await connection.query('SELECT COUNT(*) as cnt FROM ballbyball WHERE match_id = ?', [matchId]);
        if ((ballCount[0]?.cnt || 0) > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Cannot revert to Scheduled after any ball has been bowled.' });
        }

        await connection.query(
            'UPDATE matches SET status = ?, toss_winner_team_id = NULL, decision = NULL WHERE match_id = ?',
            ['Scheduled', matchId]
        );
        await connection.query('DELETE FROM playermatchstats WHERE match_id = ?', [matchId]);
        await connection.query('DELETE FROM ballbyball WHERE match_id = ?', [matchId]);
        await connection.commit();
        console.log(`--- Match ${matchId}: Reverted to Scheduled ---`);
        res.status(200).json({ message: 'Match reverted to Scheduled. You can run setup again from the Setup page.' });
    } catch (error) {
        await connection.rollback();
        console.error(`Error reverting Match ${matchId} to Scheduled:`, error);
        next(error);
    } finally {
        connection.release();
    }
};

/**
 * @desc    Retire batter (after 12 legal balls per MPL rules). Marks batter as retired and sets retirement order for return.
 * @route   POST /api/admin/scoring/matches/:matchId/retire-batter
 * @access  Admin (Protected)
 */
exports.retireBatter = async (req, res, next) => {
    const matchId = parseInt(req.params.matchId);
    const batsmanPlayerId = req.body?.batsmanPlayerId != null ? parseInt(req.body.batsmanPlayerId) : null;
    if (isNaN(matchId) || !batsmanPlayerId || isNaN(batsmanPlayerId)) {
        return res.status(400).json({ message: 'Valid match ID and batsmanPlayerId are required.' });
    }
    try {
        const [matchRows] = await pool.query(
            'SELECT status, team1_id, team2_id, toss_winner_team_id, decision FROM matches WHERE match_id = ?',
            [matchId]
        );
        if (matchRows.length === 0) return res.status(404).json({ message: 'Match not found.' });
        const match = matchRows[0];
        if (match.status !== 'Live') {
            return res.status(400).json({ message: 'Batter can only be retired during live play.' });
        }
        const [lastBall] = await pool.query('SELECT inning_number FROM ballbyball WHERE match_id = ? ORDER BY ball_id DESC LIMIT 1', [matchId]);
        const inningNumber = lastBall.length > 0 ? lastBall[0].inning_number : 1;
        const battingTeamId = (inningNumber === 1 && match.decision === 'Bat') || (inningNumber === 2 && match.decision === 'Bowl')
            ? match.toss_winner_team_id
            : (match.toss_winner_team_id === match.team1_id ? match.team2_id : match.team1_id);
        let row;
        try {
            const [pms] = await pool.query(
                'SELECT is_out, COALESCE(retired, 0) AS retired FROM playermatchstats WHERE match_id = ? AND player_id = ? AND team_id = ?',
                [matchId, batsmanPlayerId, battingTeamId]
            );
            if (pms.length === 0) return res.status(404).json({ message: 'Player not found in batting team for this match.' });
            row = pms[0];
        } catch (e) {
            const [pms] = await pool.query(
                'SELECT is_out FROM playermatchstats WHERE match_id = ? AND player_id = ? AND team_id = ?',
                [matchId, batsmanPlayerId, battingTeamId]
            );
            if (pms.length === 0) return res.status(404).json({ message: 'Player not found in batting team for this match.' });
            row = { ...pms[0], retired: 0 };
        }
        const legalBalls = await resolveLegalBallsForBatsman(pool, matchId, inningNumber, batsmanPlayerId);
        if (row.is_out) return res.status(400).json({ message: 'Player is already out.' });
        if (row.retired) return res.status(400).json({ message: 'Player is already retired.' });
        if (legalBalls < 12) return res.status(400).json({ message: `Batter must face at least 12 legal deliveries before retiring (legal balls faced: ${legalBalls}).` });
        const [maxSeq] = await pool.query(
            'SELECT COALESCE(MAX(retirement_sequence), 0) + 1 AS next_seq FROM playermatchstats WHERE match_id = ? AND team_id = ?',
            [matchId, battingTeamId]
        );
        const nextSeq = maxSeq[0]?.next_seq ?? 1;
        await pool.query(
            'UPDATE playermatchstats SET retired = 1, retirement_sequence = ? WHERE match_id = ? AND player_id = ? AND team_id = ?',
            [nextSeq, matchId, batsmanPlayerId, battingTeamId]
        );
        console.log(`--- Match ${matchId}: Batter ${batsmanPlayerId} retired (sequence ${nextSeq}) ---`);
        res.status(200).json({ message: 'Batter retired successfully.', retirementSequence: nextSeq });
    } catch (error) {
        console.error(`Error retiring batter for Match ${matchId}:`, error);
        next(error);
    }
};

const FIELDING_BONUS_GOOD_CATCH = 2;
const FIELDING_BONUS_GOOD_STOP = 1;
const FIELDING_BONUS_MISFIELD = -1;
const FIELDING_BONUS_CATCH_DROP = -2;

const FIELDING_BONUS_LABELS = {
    good_catch: 'good catch',
    good_stop: 'good stop',
    misfield: 'misfield',
    catch_drop: 'catch drop',
};

/** Display titles for commentary line */
const FIELDING_BONUS_COMMENTARY_TITLES = {
    good_catch: 'Good catch',
    good_stop: 'Good stop',
    misfield: 'Misfield',
    catch_drop: 'Catch drop',
};

/**
 * @desc    Manual fielding impact on the **last completed ball** (ballbyball row): +2 / +1 / -1 / -2. Appends commentary. Undo last ball reverses.
 * @route   POST /api/admin/scoring/matches/:matchId/fielding-bonus
 * @access  Admin (Protected)
 */
exports.addFieldingBonus = async (req, res, next) => {
    const matchId = parseInt(req.params.matchId, 10);
    const fielderId = req.body?.fielder_player_id != null ? parseInt(req.body.fielder_player_id, 10) : NaN;
    const bonusType = req.body?.bonus_type;
    if (isNaN(matchId) || isNaN(fielderId)) {
        return res.status(400).json({ message: 'Valid match ID and fielder_player_id are required.' });
    }
    const points = bonusType === 'good_catch' ? FIELDING_BONUS_GOOD_CATCH
        : bonusType === 'good_stop' ? FIELDING_BONUS_GOOD_STOP
        : bonusType === 'misfield' ? FIELDING_BONUS_MISFIELD
        : bonusType === 'catch_drop' ? FIELDING_BONUS_CATCH_DROP
        : null;
    if (points == null) {
        return res.status(400).json({ message: 'bonus_type must be "good_catch", "good_stop", "misfield", or "catch_drop".' });
    }
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [matchRows] = await connection.query(
            'SELECT status, team1_id, team2_id, toss_winner_team_id, decision, season_id FROM matches WHERE match_id = ? FOR UPDATE',
            [matchId]
        );
        if (matchRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Match not found.' });
        }
        const match = matchRows[0];
        if (match.status !== 'Live') {
            await connection.rollback();
            return res.status(400).json({ message: 'Fielding impact can only be added while the match is Live.' });
        }
        const [lastBallRows] = await connection.query(
            `SELECT ball_id, inning_number, fielding_adjustment_type, fielding_adjustment_points,
                    is_wicket, wicket_type, fielder_player_id
             FROM ballbyball WHERE match_id = ? ORDER BY ball_id DESC LIMIT 1 FOR UPDATE`,
            [matchId]
        );
        if (lastBallRows.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Record at least one ball before adding fielding impact.' });
        }
        const ballRow = lastBallRows[0];
        if (ballRow.fielding_adjustment_type != null || ballRow.fielding_adjustment_points != null) {
            await connection.rollback();
            return res.status(400).json({ message: 'The last ball already has a fielding adjustment. Undo that ball or use the next delivery.' });
        }
        if (bonusType === 'good_catch') {
            const isWkt = !!(ballRow.is_wicket === true || ballRow.is_wicket === 1 || ballRow.is_wicket === '1');
            const wt = ballRow.wicket_type != null ? String(ballRow.wicket_type) : '';
            if (!isWkt || wt !== 'Caught') {
                await connection.rollback();
                return res.status(400).json({
                    message: 'Good catch impact only applies when the last completed ball was a Caught wicket.',
                });
            }
        }
        const inningNumber = Number(ballRow.inning_number) || 1;
        const { team1_id, team2_id, toss_winner_team_id, decision, season_id } = match;
        // Must match getLiveMatchState / submitBall: use == for team IDs (MySQL may return strings; strict === breaks bowlingTeamId).
        let bowlingTeamId;
        if (inningNumber === 1) {
            const battingTeamId = (decision === 'Bat') ? toss_winner_team_id : (toss_winner_team_id == team1_id ? team2_id : team1_id);
            bowlingTeamId = (battingTeamId == team1_id) ? team2_id : team1_id;
        } else {
            bowlingTeamId = (decision === 'Bat') ? toss_winner_team_id : (toss_winner_team_id == team1_id ? team2_id : team1_id);
        }
        const [onTeam] = await connection.query(
            'SELECT 1 FROM teamplayers WHERE team_id = ? AND season_id = ? AND player_id = ?',
            [bowlingTeamId, season_id, fielderId]
        );
        if (onTeam.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Player must be on the bowling (fielding) team for this innings.' });
        }
        const [nameRows] = await connection.query('SELECT name FROM players WHERE player_id = ?', [fielderId]);
        const fielderName = nameRows[0]?.name || `Player ${fielderId}`;
        const title = FIELDING_BONUS_COMMENTARY_TITLES[bonusType] || bonusType;
        const impactStr = points >= 0 ? `(+${points} impact)` : `(${points} impact)`;
        const suffix = ` [Fielding: ${title} — ${fielderName} ${impactStr}]`;

        // Update by match + player only (same as bowler/batsman updates). Old code used team_id in WHERE; that
        // failed when JS used === for toss/team IDs but MySQL returned strings, so team_id didn't match.
        const [upd] = await connection.query(
            'UPDATE playermatchstats SET fielding_impact_points = COALESCE(fielding_impact_points, 0) + ? WHERE match_id = ? AND player_id = ?',
            [points, matchId, fielderId]
        );
        if (!upd || upd.affectedRows === 0) {
            try {
                await connection.query(
                    'INSERT INTO playermatchstats (match_id, player_id, team_id, batting_impact_points, bowling_impact_points, fielding_impact_points) VALUES (?, ?, ?, 0, 0, ?)',
                    [matchId, fielderId, bowlingTeamId, points]
                );
            } catch (insertErr) {
                await connection.rollback();
                console.error('addFieldingBonus insert playermatchstats:', insertErr);
                return res.status(400).json({ message: 'Could not update fielder stats. Ensure match setup completed (player in squad).' });
            }
        }
        await connection.query(
            `UPDATE ballbyball SET
                commentary_text = CONCAT(IFNULL(commentary_text, ''), ?),
                fielding_adjustment_player_id = ?,
                fielding_adjustment_type = ?,
                fielding_adjustment_points = ?,
                fielding_adjustment_suffix = ?
             WHERE ball_id = ?`,
            [suffix, fielderId, bonusType, points, suffix, ballRow.ball_id]
        );
        await connection.commit();

        const fullLiveState = await new Promise((resolve, reject) => {
            const mockRes = { json: (data) => resolve(data) };
            exports.getLiveMatchState({ params: { matchId } }, mockRes, reject);
        });
        const io = req.app.get('io');
        if (io && fullLiveState && fullLiveState.status) {
            io.to(`match_${matchId}`).emit('updateScore', fullLiveState);
        }
        const label = FIELDING_BONUS_LABELS[bonusType] || bonusType;
        const signStr = points >= 0 ? `+${points}` : `${points}`;
        res.status(200).json({
            message: `${signStr} fielding impact (${label}) on last ball`,
            points,
            bonus_type: bonusType,
            ball_id: ballRow.ball_id,
            newState: fullLiveState || {},
        });
    } catch (error) {
        await connection.rollback().catch(() => {});
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(500).json({
                message:
                    'Database missing fielding adjustment columns. Run mpl-backend/scripts/add-ball-fielding-adjustment.sql against your MySQL database (see script comments).',
            });
        }
        console.error(`Error adding fielding bonus for Match ${matchId}:`, error);
        next(error);
    } finally {
        connection.release();
    }
};

// --- submitFinalMatchScore ---
/**
 * @desc    Manually submit final match score and details (optional)
 * @route   POST /api/admin/scoring/matches/:matchId/finalize
 * @access  Admin (Protected)
 */
exports.submitFinalMatchScore = async (req, res, next) => {
    const matchId = parseInt(req.params.matchId);
    const { winner_team_id, result_summary, man_of_the_match_player_id, playerStats } = req.body;

    if (isNaN(matchId)) return res.status(400).json({ message: 'Invalid Match ID.' });

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        console.log(`--- Starting Finalize for Match ${matchId} ---`);

        // Recalculate MoM if not provided in request // <<< INSERT/MODIFY THIS BLOCK
        let finalManOfTheMatchPlayerId = man_of_the_match_player_id || null; // Use provided if exists
        if (!finalManOfTheMatchPlayerId) {
            console.log(`--- MoM not provided for finalize, calculating... ---`);
            const [impactStats] = await connection.query(`SELECT player_id, team_id, (batting_impact_points + bowling_impact_points + fielding_impact_points) as total_impact FROM playermatchstats WHERE match_id = ? ORDER BY total_impact DESC`, [matchId]);
            if (impactStats.length > 0) {
                const highestImpact = impactStats[0].total_impact;
                let potentialMoms = impactStats.filter(p => p.total_impact === highestImpact);
                const currentWinnerId = winner_team_id || null; // Use the winner ID from the request
                if (currentWinnerId) {
                    const winningTeamMoms = potentialMoms.filter(p => p.team_id === currentWinnerId);
                    finalManOfTheMatchPlayerId = (winningTeamMoms.length > 0) ? winningTeamMoms[0].player_id : potentialMoms[0].player_id;
                    if (winningTeamMoms.length === 0) console.warn(`MoM Warning: No player from winning team (${currentWinnerId}) had the highest impact score (${highestImpact}). Awarding to highest overall.`);
                } else { // Tie
                    finalManOfTheMatchPlayerId = potentialMoms[0].player_id;
                }
                console.log(`--- Calculated MoM Player ID: ${finalManOfTheMatchPlayerId} ---`);
            } else { console.warn(`--- Could not calculate MoM for Match ${matchId}: No impact stats found. ---`); }
        }

        // 1. Update Match status, winner, result, MoM
        console.log(`--- Updating Match ${matchId} status to Completed ---`);
        await connection.query('UPDATE matches SET status = ?, winner_team_id = ?, result_summary = ?, man_of_the_match_player_id = ? WHERE match_id = ?', ['Completed', winner_team_id || null, result_summary || null, finalManOfTheMatchPlayerId, matchId]);

        // 2. Update PlayerMatchStats
        if (playerStats && Array.isArray(playerStats)) {
            console.log(`--- Updating PlayerMatchStats for ${playerStats.length} players ---`);
            const updatePromises = playerStats.map(stat => {
                const { player_id, team_id, ...statsToUpdate } = stat;
                const numericFields = ['runs_scored', 'balls_faced', 'fours', 'twos', 'wickets_taken', 'runs_conceded', 'overs_bowled', 'maidens', 'wides', 'no_balls', 'catches', 'stumps', 'run_outs'];
                numericFields.forEach(field => { statsToUpdate[field] = statsToUpdate[field] ?? 0; });
                statsToUpdate.is_out = statsToUpdate.is_out ?? false;
                statsToUpdate.how_out = statsToUpdate.how_out || null;
                return connection.query(
                    `INSERT INTO playermatchstats (match_id, player_id, team_id, runs_scored, balls_faced, fours, twos, is_out, how_out, wickets_taken, runs_conceded, overs_bowled, maidens, wides, no_balls, catches, stumps, run_outs)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                     runs_scored = VALUES(runs_scored), balls_faced = VALUES(balls_faced), fours = VALUES(fours), twos = VALUES(twos), is_out = VALUES(is_out), how_out = VALUES(how_out), wickets_taken = VALUES(wickets_taken), runs_conceded = VALUES(runs_conceded), overs_bowled = VALUES(overs_bowled), maidens = VALUES(maidens), wides = VALUES(wides), no_balls = VALUES(no_balls), catches = VALUES(catches), stumps = VALUES(stumps), run_outs = VALUES(run_outs)`,
                    [matchId, player_id, team_id, statsToUpdate.runs_scored, statsToUpdate.balls_faced, statsToUpdate.fours, statsToUpdate.twos, statsToUpdate.is_out, statsToUpdate.how_out, statsToUpdate.wickets_taken, statsToUpdate.runs_conceded, statsToUpdate.overs_bowled, statsToUpdate.maidens, statsToUpdate.wides, statsToUpdate.no_balls, statsToUpdate.catches, statsToUpdate.stumps, statsToUpdate.run_outs]
                );
            });
            await Promise.all(updatePromises);
            console.log(`--- PlayerMatchStats updates complete ---`);
        }

        await connection.commit();
        console.log(`--- Match ${matchId} finalize committed ---`);

        // Emit final state via Socket.IO
        const io = req.app.get('io');
        const roomName = `match_${matchId}`;
        if (io) {
            // Re-fetch the final state to ensure consistency
            const finalState = await exports.getLiveMatchState({ params: { matchId } }, { json: () => { } }, () => { }); // Simulate req/res/next to call internally - needs adjustment if relying on req/res properties
            // A better approach: construct the final state manually here based on committed data
            // For now, just emit a basic ended event
            console.log(`[Backend Emit] Emitting 'matchEnded' to room: ${roomName}`);
            io.to(roomName).emit('matchEnded', { matchId: matchId, status: 'Completed', resultSummary: result_summary });
        }

        res.status(200).json({ message: 'Match finalized successfully.' });

    } catch (error) {
        await connection.rollback();
        console.error(`Error finalizing match ${matchId}:`, error);
        next(error);
    } finally {
        if (connection) connection.release();
    }
};


// --- scoreSingleBall (No changes needed from previous full version) ---
/**
 * @desc    Record details for a single ball bowled & update stats
 * @route   POST /api/admin/scoring/matches/:matchId/ball
 * @access  Admin (Protected)
 */
exports.scoreSingleBall = async (req, res, next) => {
    const matchId = parseInt(req.params.matchId);
    if (isNaN(matchId)) return res.status(400).json({ message: 'Invalid Match ID.' });
    // Batsman Selection Check ---
    if (!req.body.batsmanOnStrikePlayerId || isNaN(parseInt(req.body.batsmanOnStrikePlayerId))) {
        console.warn(`Score attempt for Match ${matchId} without a valid batsman selected.`);
        return res.status(400).json({ message: 'Please select the batsman on strike before recording the ball.' });
    }

    let { inningNumber, bowlerPlayerId, batsmanOnStrikePlayerId, runsScored, isExtra, extraType, extraRuns, isWicket, wicketType, fielderPlayerId, isBye } = req.body;
    console.log(`--- Received scoreSingleBall request for Match ${matchId}:`, req.body); // Log incoming data

    // --- Input Validation & Type Conversion ---
    inningNumber = parseInt(inningNumber); bowlerPlayerId = parseInt(bowlerPlayerId); batsmanOnStrikePlayerId = parseInt(batsmanOnStrikePlayerId);
    runsScored = parseInt(runsScored || 0); extraRuns = parseInt(extraRuns || 0); fielderPlayerId = fielderPlayerId ? parseInt(fielderPlayerId) : null;
    isExtra = !!isExtra; isWicket = !!isWicket; isBye = !!isBye;
    const allowedWicketTypes = ['Bowled', 'Caught', 'Stumped', 'Hit Outside', 'Hit Wicket'];
    if ([inningNumber, bowlerPlayerId, batsmanOnStrikePlayerId].some(val => isNaN(val))) {
        return res.status(400).json({ message: 'Invalid numeric ID.' });
    }

    if (isNaN(runsScored) || isNaN(extraRuns)) {
        return res.status(400).json({ message: 'Invalid numeric runs/extras.' });
    }

    if (isExtra && (!extraType || !['Wide', 'NoBall'].includes(extraType))) {
        return res.status(400).json({ message: 'Valid Extra type required.' });
    }

    if (isWicket && (!wicketType || !allowedWicketTypes.includes(wicketType))) {
        return res.status(400).json({ message: `Wicket type required (${allowedWicketTypes.join(', ')}).` });
    }

    if (wicketType === 'Hit Outside' && runsScored > 0) {
        return res.status(400).json({ message: 'Runs must be 0 if out "Hit Outside".' });
    }

    if (
        (wicketType === 'Caught' || wicketType === 'Stumped') &&
        isWicket &&
        (fielderPlayerId == null || isNaN(fielderPlayerId))
    ) {
        return res.status(400).json({ message: 'Fielder ID required for Caught/Stumped.' });
    }

    if (isWicket && !['Caught', 'Stumped'].includes(wicketType) && fielderPlayerId != null) {
        return res.status(400).json({ message: `Fielder ID not required for ${wicketType}.` });
    }

    if (isBye && isExtra && extraType === 'Wide' && runsScored !== 1) {
        return res.status(400).json({ message: 'Wide + Bye should have runsScored = 1.' });
    }

    if (isBye && isExtra && extraType === 'NoBall' && runsScored !== 1) {
        return res.status(400).json({ message: 'NoBall + Bye should have runsScored = 1.' });
    }

    if (isBye && !isExtra && runsScored !== 1) {
        return res.status(400).json({ message: 'Legal Bye must have runsScored = 1.' });
    }

    if (isBye && isWicket) {
        return res.status(400).json({ message: 'Cannot score Byes on a wicket.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // --- 1. Fetch Match State & Determine Teams ---
        const [matches] = await connection.query('SELECT status, super_over_number, team1_id, team2_id, toss_winner_team_id, decision, season_id FROM matches WHERE match_id = ? FOR UPDATE', [matchId]);
        if (matches.length === 0) throw new Error('Match not found.');
        const match = matches[0];
        let currentStatus = match.status;
        let updatedStatus = currentStatus; // Will update if status changes
        let targetScore = 0;
        let battingTeamId, bowlingTeamId;
        const { team1_id, team2_id, toss_winner_team_id, decision, season_id } = match;
        if (inningNumber == 1) { battingTeamId = (decision === 'Bat') ? toss_winner_team_id : (toss_winner_team_id == team1_id ? team2_id : team1_id); bowlingTeamId = (battingTeamId == team1_id) ? team2_id : team1_id; }
        else { bowlingTeamId = (decision === 'Bat') ? toss_winner_team_id : (toss_winner_team_id == team1_id ? team2_id : team1_id); battingTeamId = (bowlingTeamId == team1_id) ? team2_id : team1_id; const [scoreData] = await connection.query(`SELECT SUM(${SQL_INNINGS_RUNS_PER_BALL}) as score FROM ballbyball WHERE match_id = ? AND inning_number = 1`, [matchId]); targetScore = Number((scoreData[0]?.score || 0)) + 1; }
        console.log(`--- Scoring Ball: Match ${matchId}, Inning ${inningNumber}, Status ${currentStatus}, Batting ${battingTeamId}, Bowling ${bowlingTeamId} ---`);

        // --- 2. Handle Status Transition & Validation ---
        let dbOverNumber = 1; let dbBallNumberInOver = 1; let logicalOver = 0; let logicalBallInOver = 0; let nextInningNumber = inningNumber;
        let previousOverBowlerId = null; // ADDED: Track the bowler of the last ball of the previous over

        if (currentStatus === 'Setup' && inningNumber == 1) { await connection.query("UPDATE matches SET status = 'Live' WHERE match_id = ?", [matchId]); currentStatus = 'Live'; updatedStatus = 'Live'; console.log(`Match ${matchId}: Status -> Live (Inning 1 Start)`); }
        else if (currentStatus === 'InningsBreak' && inningNumber == 2) { await connection.query("UPDATE matches SET status = 'Live' WHERE match_id = ?", [matchId]); currentStatus = 'Live'; updatedStatus = 'Live'; console.log(`Match ${matchId}: Status -> Live (Inning 2 Start). Target: ${targetScore}.`); }
        else if (currentStatus === 'Live') {
            const [batsmanOutCheck] = await connection.query(`SELECT 1 FROM playermatchstats WHERE match_id = ? AND player_id = ? AND team_id = ? AND is_out = TRUE`, [matchId, batsmanOnStrikePlayerId, battingTeamId]); if (batsmanOutCheck.length > 0) throw new Error(`Batsman ${batsmanOnStrikePlayerId} is already out.`);

            // --- Determine Over/Ball Sequence FIRST ---
            // We need dbOverNumber before checking bowler eligibility for the *new* over
            const [lastBallInfo] = await connection.query(`SELECT over_number, ball_number_in_over, bowler_player_id FROM ballbyball WHERE match_id = ? AND inning_number = ? ORDER BY ball_id DESC LIMIT 1`, [matchId, inningNumber]); // Fetch bowler_id too
            if (lastBallInfo.length > 0) {
                const lastBall = lastBallInfo[0];
                const [legalBallsData] = await connection.query(`SELECT COUNT(*) as count FROM ballbyball WHERE match_id = ? AND inning_number = ? AND over_number = ? AND (is_extra = false)`, [matchId, inningNumber, lastBall.over_number]);
                const legalBallsInLastOverCount = legalBallsData[0]?.count || 0;
                dbBallNumberInOver = lastBall.ball_number_in_over + 1;
                if (legalBallsInLastOverCount >= 6) { // If starting a NEW over
                    dbOverNumber = lastBall.over_number + 1;
                    dbBallNumberInOver = 1;
                    logicalOver = lastBall.over_number;
                    logicalBallInOver = 0;
                    previousOverBowlerId = lastBall.bowler_player_id; // Store who bowled the previous over
                } else { // Continuing same over
                    dbOverNumber = lastBall.over_number;
                    logicalOver = lastBall.over_number - 1;
                    logicalBallInOver = legalBallsInLastOverCount;
                    // Keep previousOverBowlerId as null or fetch from the last ball of the *previous* over if needed
                }
            }
            // If no balls bowled yet, dbOverNumber remains 1, previousOverBowlerId remains null
            console.log(`--- Determined Sequence: DB Over=${dbOverNumber}, DB Ball=${dbBallNumberInOver}, Prev Over Bowler=${previousOverBowlerId} ---`);


            // --- Now perform Bowler Eligibility Checks ---
            const [bowlerOversData] = await connection.query(`SELECT ps.player_id, FLOOR(ps.overs_bowled) as completed_overs,p.name as player_name FROM playermatchstats ps join players p on ps.player_id = p.player_id  WHERE ps.match_id = ? AND ps.team_id = ? AND ps.overs_bowled > 0`, [matchId, bowlingTeamId]);
            let twoOverBowlerExists = false; let currentBowlerCompletedOvers = 0;
            let didCurrentBowlerBowlSuperOver = false; // ADDED: Check if current bowler bowled the super over

            bowlerOversData.forEach(b => {
                if (b.completed_overs >= 2) twoOverBowlerExists = true;
                if (b.player_id === bowlerPlayerId) {
                    currentBowlerCompletedOvers = b.completed_overs;
                    // Check if this bowler bowled the designated super over
                    // We need to query ballbyball again for this specific bowler and super over number
                    // This check is done after the loop for clarity
                }
            });

            let bowlerName = bowlerOversData.find(b => b.player_id === bowlerPlayerId)?.player_name

            // Check 1: Max 2 overs
            if (currentBowlerCompletedOvers >= 2) throw new Error(`Bowler ${bowlerName} has already completed 2 overs.`);
            // Check 2: Only one bowler can bowl 2 overs
            if (currentBowlerCompletedOvers >= 1 && twoOverBowlerExists && !bowlerOversData.find(b => b.player_id === bowlerPlayerId && b.completed_overs >= 2)) throw new Error(`Another bowler bowled 2 overs. Bowler ${bowlerPlayerId} can only bowl 1.`);

            // Check 3: Cannot bowl consecutive overs (only applies if starting a new over)
            if (dbBallNumberInOver === 1 && dbOverNumber > 1 && previousOverBowlerId === bowlerPlayerId) { // ADDED CHECK
                throw new Error(`Bowler ${bowlerName} cannot bowl consecutive overs (bowled over ${dbOverNumber - 1}).`);
            }

            // Check 4: Super Over bowler limitation (only applies if they completed at least one over)
            // Fetch if this bowler bowled the super over
            const [superOverCheck] = await connection.query( // ADDED CHECK
                `SELECT 1 FROM ballbyball b
                 JOIN matches m ON b.match_id = m.match_id
                 WHERE b.match_id = ?
                   AND b.inning_number = ?
                   AND b.bowler_player_id = ?
                   AND b.over_number = m.super_over_number
                 LIMIT 1`, [matchId, inningNumber, bowlerPlayerId]
            );
            didCurrentBowlerBowlSuperOver = superOverCheck.length > 0;

            if (didCurrentBowlerBowlSuperOver && currentBowlerCompletedOvers >= 1) { // ADDED CHECK
                throw new Error(`Bowler ${bowlerPlayerId} bowled the super over (over ${match.super_over_number}) and cannot bowl a second over.`);
            }

            // Check 5: First four overs must be bowled by four different bowlers (per MPL rules)
            if (dbBallNumberInOver === 1 && dbOverNumber >= 1 && dbOverNumber <= 4) {
                const [oversBowledByBowler] = await connection.query(
                    `SELECT DISTINCT over_number FROM ballbyball WHERE match_id = ? AND inning_number = ? AND bowler_player_id = ? AND over_number BETWEEN 1 AND 4`,
                    [matchId, inningNumber, bowlerPlayerId]
                );
                if (oversBowledByBowler.length > 0) {
                    throw new Error(`Bowler ${bowlerName} has already bowled one of the first four overs (over ${oversBowledByBowler[0].over_number}). First four overs must be bowled by four different bowlers.`);
                }
            }
            // --- End Bowler Eligibility Checks ---

            // Check: only before a legal delivery (not wide/no-ball). No-balls still allowed after 12 legal; retire counts legal balls only (from ballbyball).
            if (!isExtra) {
                const currentLegalBalls = await resolveLegalBallsForBatsman(connection, matchId, inningNumber, batsmanOnStrikePlayerId);
                let hasReturnedFromRetirement = false;
                try {
                    const [batsmanRow] = await connection.query('SELECT COALESCE(retired, 0) AS retired FROM playermatchstats WHERE match_id = ? AND player_id = ? AND team_id = ?', [matchId, batsmanOnStrikePlayerId, battingTeamId]);
                    hasReturnedFromRetirement = !!(batsmanRow[0] && batsmanRow[0].retired);
                } catch (e) {
                    const [batsmanRow] = await connection.query('SELECT COALESCE(retired, 0) AS retired FROM playermatchstats WHERE match_id = ? AND player_id = ? AND team_id = ?', [matchId, batsmanOnStrikePlayerId, battingTeamId]);
                    hasReturnedFromRetirement = !!(batsmanRow[0] && batsmanRow[0].retired);
                }
                if (currentLegalBalls >= 12 && !hasReturnedFromRetirement) {
                    const [notOutCount] = await connection.query('SELECT COUNT(*) AS cnt FROM playermatchstats WHERE match_id = ? AND team_id = ? AND is_out = FALSE', [matchId, battingTeamId]);
                    const onlyBatterLeft = (notOutCount[0]?.cnt || 0) === 1;
                    if (!onlyBatterLeft) {
                        throw new Error('Batter has already faced 12 legal deliveries and must retire before facing another legal ball. Use "Retire batter" first.');
                    }
                }
            }
        }

        else {
            throw new Error(`Match scoring not allowed. Status: '${currentStatus}'.`);
        }

        // --- 3. Calculate Runs & Legality ---
        // Face values (same as non–super-over for batter/bowler); super-over "double" goes to super_over_runs.
        const faceOffBat = (!isBye && !isExtra) ? runsScored : ((!isBye && isExtra && extraType === 'NoBall') ? runsScored : 0);

        let isLegalDelivery = !(isExtra);
        let countsForBatsmanBall = !isExtra || extraType === 'NoBall';
        const isSuperOverBall = dbOverNumber === match.super_over_number;

        const reqExtraBase = parseInt(extraRuns, 10) || 0;
        let faceExtraRuns = reqExtraBase;
        if (isBye) faceExtraRuns += 1;

        let legacyOff = faceOffBat;
        if (isSuperOverBall && (!isExtra || extraType === 'NoBall') && !isBye && legacyOff > 0) legacyOff *= 2;
        let legacyExtra = reqExtraBase;
        if (isSuperOverBall && isExtra) legacyExtra *= 2;
        if (isSuperOverBall && isBye) legacyExtra += 2;
        else if (!isSuperOverBall && isBye) legacyExtra += 1;

        const legacyTeamTotal = legacyOff + legacyExtra;
        const faceTeamTotal = faceOffBat + faceExtraRuns;
        const superOverRunsToStore = isSuperOverBall ? Math.max(0, legacyTeamTotal - faceTeamTotal) : 0;

        const runsForBowler = (!isBye ? faceOffBat : 0) + (isExtra ? faceExtraRuns : 0);

        const storedRunsOffBat = faceOffBat;
        const storedExtraRuns = faceExtraRuns;

        // --- 4. Generate Commentary ---
        let [playerNamesResult] = []
        if(fielderPlayerId){
            [playerNamesResult] = await connection.query(`select bat.name as batsman_name,bowl.name as bowler_name, fielder.name as fielder_name from players bat join players bowl join players fielder where bat.player_id = ? and bowl.player_id= ? and fielder.player_id= ? LIMIT 1`, [batsmanOnStrikePlayerId, bowlerPlayerId, fielderPlayerId]); // Fetch bowler_id too
        }
        else{
            [playerNamesResult] = await connection.query(`select bat.name as batsman_name,bowl.name as bowler_name from players bat join players bowl where bat.player_id = ? and bowl.player_id= ? LIMIT 1`, [batsmanOnStrikePlayerId, bowlerPlayerId]); // Fetch bowler_id too

        }
        const playerNames = playerNamesResult[0]

        //;
        let logicalBallDisplay = logicalBallInOver + (isLegalDelivery ? 1 : 0);
        if (logicalBallDisplay > 6) logicalBallDisplay = 1;
        let commentary = `${logicalOver}.${logicalBallDisplay}: Ball. `;
        commentary += `${playerNames.bowler_name} to ${playerNames.batsman_name} `
        if (isWicket) commentary += `WICKET! (${wicketType}).${fielderPlayerId ? ` Fielder: ${playerNames.fielder_name}.` : ''} `;
        if (isExtra) commentary += `${extraType}! +${storedExtraRuns || 0}. `;
        if (!isExtra && !isBye && runsScored > 0) {
            commentary += `${runsScored} run${runsScored !== 1 ? 's' : ''}`;
            if (isSuperOverBall && superOverRunsToStore > 0) commentary += ` (Super Over bonus +${superOverRunsToStore} team)`;
            commentary += '. ';
        }
        if (!isExtra && !isBye && runsScored == 0) {
            commentary += `no run`;
            if (isSuperOverBall && superOverRunsToStore > 0) commentary += ` (Super Over bonus +${superOverRunsToStore} team)`;
            commentary += '. ';
        }
        if (isBye) commentary += `${runsScored} bye${runsScored !== 1 ? 's' : ''}. `;
        if (extraType === 'NoBall' && runsScored > 0 && !isBye) {
            commentary += `(+${runsScored} off bat`;
            if (isSuperOverBall && superOverRunsToStore > 0) commentary += `; Super Over bonus +${superOverRunsToStore} team`;
            commentary += '). ';
        }
        if (extraType === 'NoBall' && runsScored > 0 && isBye) commentary += `(+${runsScored} bye). `;
        commentary = commentary.trim();

        // --- 5. Insert into ballbyball table ---
        const finalFielderId = (isWicket && ['Caught', 'Stumped'].includes(wicketType)) ? fielderPlayerId : null;
        console.log(`--- Inserting Ball: ${commentary} ---`);
        const [ballResult] = await connection.query(
            `INSERT INTO ballbyball (match_id, inning_number, over_number, ball_number_in_over, bowler_player_id, batsman_on_strike_player_id, runs_scored, is_bye, is_extra, extra_type, extra_runs, super_over_runs, is_wicket, wicket_type, fielder_player_id, commentary_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [matchId, inningNumber, dbOverNumber, dbBallNumberInOver, bowlerPlayerId, batsmanOnStrikePlayerId, storedRunsOffBat, isBye || false, isExtra || false, extraType || null, parseInt(storedExtraRuns || 0), superOverRunsToStore, isWicket || false, wicketType || null, finalFielderId, commentary]
        );
        const newBallId = ballResult.insertId;

        // --- 6. Calculate Impact Points --- (face runs only; super_over_runs excluded from impact)
        const impactSettings = await loadImpactSettings(connection);
        const baseImpactPoints = calculateImpactPoints({
            runs_scored: runsScored,
            is_extra: isExtra,
            extra_type: extraType,
            extra_runs: isExtra ? faceExtraRuns : 0,
            is_wicket: isWicket,
            wicket_type: wicketType,
            is_bye: isBye,
        }, impactSettings);
        const impactPoints = applySuperOverImpactMultiplier(baseImpactPoints, isSuperOverBall, impactSettings);
        console.log(`--- Impact Points for ball ${newBallId}: Bat=${impactPoints.batsman}, Bowl=${impactPoints.bowler}, Field=${impactPoints.fielder} ---`);

        // --- 7. Update PlayerMatchStats (MODIFIED for Impact Points) ---
        console.log(`--- Updating Stats: Batsman=${batsmanOnStrikePlayerId}, Bowler=${bowlerPlayerId}, Fielder=${finalFielderId || 'N/A'} ---`);
        // Update Batsman: no-ball counts for balls_faced; legal_balls_faced only on legal deliveries (not wide/no-ball)
        const legalBallIncrement = isLegalDelivery ? 1 : 0;
        const wkFlag = isWicket ? 1 : 0;
        try {
            const [batUpd] = await connection.query(
                `UPDATE playermatchstats SET runs_scored = runs_scored + ?, balls_faced = balls_faced + ?, legal_balls_faced = legal_balls_faced + ?, fours = fours + ?, twos = twos + ?, is_out = IF(? = 1, 1, is_out), how_out = IF(? = 1, ?, how_out), batting_impact_points = batting_impact_points + ? WHERE match_id = ? AND player_id = ? AND team_id = ?`,
                [faceOffBat, countsForBatsmanBall ? 1 : 0, legalBallIncrement, (runsScored == 4 && !isBye && (!isExtra || extraType === 'NoBall')) ? 1 : 0, (runsScored == 2 && !isBye && (!isExtra || extraType === 'NoBall')) ? 1 : 0, wkFlag, wkFlag, wicketType || null, impactPoints.batsman, matchId, batsmanOnStrikePlayerId, battingTeamId]
            );
            if (!batUpd || batUpd.affectedRows === 0) {
                console.error(`--- scoreSingleBall: Batsman stats UPDATE affected 0 rows (match ${matchId}, player ${batsmanOnStrikePlayerId}, team ${battingTeamId}) ---`);
            }
        } catch (e) {
            if (e.code !== 'ER_BAD_FIELD_ERROR') throw e;
            const [batUpd] = await connection.query(
                `UPDATE playermatchstats SET runs_scored = runs_scored + ?, balls_faced = balls_faced + ?, fours = fours + ?, twos = twos + ?, is_out = IF(? = 1, 1, is_out), how_out = IF(? = 1, ?, how_out), batting_impact_points = batting_impact_points + ? WHERE match_id = ? AND player_id = ? AND team_id = ?`,
                [faceOffBat, countsForBatsmanBall ? 1 : 0, (runsScored == 4 && !isBye && (!isExtra || extraType === 'NoBall')) ? 1 : 0, (runsScored == 2 && !isBye && (!isExtra || extraType === 'NoBall')) ? 1 : 0, wkFlag, wkFlag, wicketType || null, impactPoints.batsman, matchId, batsmanOnStrikePlayerId, battingTeamId]
            );
            if (!batUpd || batUpd.affectedRows === 0) {
                console.error(`--- scoreSingleBall: Batsman stats UPDATE (no legal_balls_faced col) affected 0 rows ---`);
            }
        }

        // Update Bowler: Add bowling_impact_points update
        const [currentBowlerStatsData] = await connection.query('SELECT overs_bowled FROM playermatchstats WHERE match_id = ? AND player_id = ?', [matchId, bowlerPlayerId]); const currentOversDecimal = currentBowlerStatsData[0]?.overs_bowled || 0.0; const newOversDecimal = calculateNewOversDecimal(currentOversDecimal, isLegalDelivery);
        await connection.query(`UPDATE playermatchstats SET overs_bowled = ?, runs_conceded = runs_conceded + ?, wickets_taken = wickets_taken + ?, wides = wides + ?, no_balls = no_balls + ?, maidens = maidens + ?, bowling_impact_points = bowling_impact_points + ? WHERE match_id = ? AND player_id = ?`,
            [newOversDecimal, runsForBowler, (isWicket && !['Run Out'].includes(wicketType)) ? 1 : 0, extraType === 'Wide' ? 1 : 0, extraType === 'NoBall' ? 1 : 0, 0 /* Maiden TBD */, impactPoints.bowler, matchId, bowlerPlayerId]); // Added impactPoints.bowler

        // Update Fielder: Add fielding_impact_points update
        if (finalFielderId && impactPoints.fielder !== 0) {
            await connection.query(`UPDATE playermatchstats SET catches = catches + ?, stumps = stumps + ?, fielding_impact_points = fielding_impact_points + ? WHERE match_id = ? AND player_id = ?`,
                [wicketType === 'Caught' ? 1 : 0, wicketType === 'Stumped' ? 1 : 0, impactPoints.fielder, matchId, finalFielderId]); // Added impactPoints.fielder
        }

        // --- 8. Check for End of Innings/Match & Calculate MoM ---
        let matchCompleted = false;
        let inningsEnded = false;
        let resultSummary = null;
        let winnerTeamId = null;
        const maxOvers = 5;
        const maxWickets = 5;
        const [progressInfo] = await connection.query(`SELECT COUNT(*) as wickets_this_inning FROM playermatchstats WHERE match_id = ? AND team_id = ? AND is_out = TRUE`, [matchId, battingTeamId]);
        const [bbbWicketsThisInning] = await connection.query(
            `SELECT COUNT(*) AS c FROM ballbyball WHERE match_id = ? AND inning_number = ? AND COALESCE(is_wicket, 0) = 1`,
            [matchId, inningNumber]
        );
        const totalWicketsThisInning = Math.max(
            progressInfo[0].wickets_this_inning || 0,
            parseInt(bbbWicketsThisInning[0]?.c, 10) || 0
        );
        const [legalBallsDataCurrent] = await connection.query(`SELECT COUNT(*) as count FROM ballbyball WHERE match_id = ? AND inning_number = ? AND over_number = ? AND (is_extra = false)`, [matchId, inningNumber, dbOverNumber]);
        const legalBallsThisOver = legalBallsDataCurrent[0].count || 0;
        let inningsEndReason = null;
        if (totalWicketsThisInning >= maxWickets) {
            inningsEndReason = `Wickets (${totalWicketsThisInning}/${maxWickets})`;
        }
        else if (dbOverNumber > maxOvers || (dbOverNumber === maxOvers && legalBallsThisOver >= 6)) {
            inningsEndReason = `Overs Completed (${maxOvers}.0)`;
            console.log("inningsEndReason", inningsEndReason)
        }
        let manOfTheMatchPlayerId = null;


        if (inningsEndReason) {
            inningsEnded = true; commentary += ` INNINGS END (${inningsEndReason}).`;
            if (inningNumber === 1) { updatedStatus = 'InningsBreak'; nextInningNumber = 2; console.log(`Match ${matchId}: Innings 1 ended. Status -> InningsBreak`); }
            else { // Innings 2 ended
                matchCompleted = true; updatedStatus = 'Completed';
                // Calculate winner/result
                const [finalScores] = await connection.query(`SELECT inning_number, SUM(${SQL_INNINGS_RUNS_PER_BALL}) as total_score FROM ballbyball WHERE match_id = ? GROUP BY inning_number ORDER BY inning_number`, [matchId]); 
                //const inn1Score = finalScores.find(s => s.inning_number === 1)?.total_score || 0;
                //const inn2Score = finalScores.find(s => s.inning_number === 2)?.total_score || 0;
                const inn1Score = parseInt(finalScores.find(s => s.inning_number === 1)?.total_score, 10) || 0;
                const inn2Score = parseInt(finalScores.find(s => s.inning_number === 2)?.total_score, 10) || 0;
                console.log("Inn1Score", inn1Score)
                console.log("Inn2Score", inn2Score)
                if (inn2Score >= targetScore) {
                    winnerTeamId = battingTeamId;
                    winnerTeamName = winnerTeamId;
                    try {
                        const [t1] = await connection.query('SELECT name FROM teams WHERE team_id = ?', [winnerTeamId]);
                        if (t1.length > 0) winnerTeamName = t1[0].name;

                    } catch (nameError) {
                        console.error("Error fetching team names for result summary:", nameError);
                        // Continue with IDs if names can't be fetched
                    }
                    resultSummary = `${winnerTeamName} won by ${maxWickets - totalWicketsThisInning} wickets.`;
                }
                else if (inn2Score < inn1Score) {
                    winnerTeamId = bowlingTeamId;
                    winnerTeamName = winnerTeamId;
                    try {
                        const [t1] = await connection.query('SELECT name FROM teams WHERE team_id = ?', [winnerTeamId]);
                        if (t1.length > 0) winnerTeamName = t1[0].name;

                    } catch (nameError) {
                        console.error("Error fetching team names for result summary:", nameError);
                        // Continue with IDs if names can't be fetched
                    }
                    resultSummary = `${winnerTeamName} won by ${inn1Score - inn2Score} runs.`;
                }
                else if (inn2Score == inn1Score){
                    resultSummary = 'Match Tied.'; winnerTeamId = null;
                    console.log(`Match ${matchId}: Innings 2 ended. Status -> Completed. Result: ${resultSummary}`);
                }
                else {
                    resultSummary = 'Error.'; winnerTeamId = null;
                    console.log(`Match ${matchId}: Innings 2 ended. Status -> Completed. Result: ${resultSummary}`);
                }
                
            }
        } else if (inningNumber === 2 && targetScore !== null) {
            const [currentInningScoreData] = await connection.query(`SELECT SUM(${SQL_INNINGS_RUNS_PER_BALL}) as score FROM ballbyball WHERE match_id = ? AND inning_number = 2`, [matchId]); const currentInningScore = currentInningScoreData[0]?.score || 0;
            if (currentInningScore >= targetScore) {
                inningsEnded = true;
                matchCompleted = true;
                updatedStatus = 'Completed';
                winnerTeamId = battingTeamId;
                winnerTeamName = winnerTeamId;
                try {
                    const [t1] = await connection.query('SELECT name FROM teams WHERE team_id = ?', [winnerTeamId]);
                    if (t1.length > 0) winnerTeamName = t1[0].name;

                } catch (nameError) {
                    console.error("Error fetching team names for result summary:", nameError);
                    // Continue with IDs if names can't be fetched
                }
                resultSummary = `${winnerTeamName} won by ${maxWickets - totalWicketsThisInning} wickets.`;
                commentary += ` TARGET ACHIEVED.`;
                console.log(`Match ${matchId}: Target achieved. Status -> Completed. Result: ${resultSummary}`);
            }
        }

        // --- Calculate MoM IF Match Completed --- //
        if (matchCompleted) {
            console.log(`--- Match ${matchId} Completed. Calculating Man of the Match ---`);
            const [impactStats] = await connection.query(`
                SELECT player_id, team_id, (batting_impact_points + bowling_impact_points + fielding_impact_points) as total_impact
                FROM playermatchstats WHERE match_id = ? ORDER BY total_impact DESC
            `, [matchId]);
            if (impactStats.length > 0) {
                const highestImpact = impactStats[0].total_impact;
                let potentialMoms = impactStats.filter(p => p.total_impact === highestImpact);
                if (winnerTeamId) {
                    const winningTeamMoms = potentialMoms.filter(p => p.team_id === winnerTeamId);
                    manOfTheMatchPlayerId = (winningTeamMoms.length > 0) ? winningTeamMoms[0].player_id : potentialMoms[0].player_id;
                    if (winningTeamMoms.length === 0) console.warn(`MoM Warning: No player from winning team (${winnerTeamId}) had highest impact (${highestImpact}). Awarding highest overall.`);
                } else { // Tie
                    manOfTheMatchPlayerId = potentialMoms[0].player_id;
                }
                console.log(`--- Calculated MoM Player ID: ${manOfTheMatchPlayerId} ---`);
            } else { console.warn(`--- Could not calculate MoM for Match ${matchId}: No impact stats found. ---`); }
        }
        // --- End MoM Calculation ---

        // Update Match table (MODIFIED to include MoM)
        if (updatedStatus !== currentStatus || matchCompleted) {
            await connection.query("UPDATE matches SET status = ?, winner_team_id = ?, result_summary = ?, man_of_the_match_player_id = ? WHERE match_id = ?",
                [updatedStatus, winnerTeamId, resultSummary, manOfTheMatchPlayerId, matchId]); // Added manOfTheMatchPlayerId
        }
        if (inningsEnded || matchCompleted) { await connection.query("UPDATE ballbyball SET commentary_text = ? WHERE ball_id = ?", [commentary.trim(), newBallId]); }
        // --- 8. Commit Transaction ---
        await connection.commit();
        console.log(`--- Ball ${newBallId} scoring committed ---`);

        // --- 9. Prepare FULL State for Socket Emission ---
        // Re-fetch the state after commit to ensure consistency
        const stateResponse = await exports.getLiveMatchState({ params: { matchId } }, { json: (data) => data }, () => { }); // Use internal call or refetch logic
        const fullLiveState = stateResponse; // Assuming getLiveMatchState returns the needed state directly
        if (!fullLiveState || !fullLiveState.status) {
            console.error(`!!! Failed to retrieve consistent state after scoring ball ${newBallId} for match ${matchId} !!!`);
            // Handle error - maybe emit old state or an error state?
            // For now, we'll proceed but log the issue.
        } else {
            console.log(`--- Prepared state for emission after ball ${newBallId} ---`);
        }


        // --- 10. Emit update via Socket.IO ---
        const roomName = `match_${matchId}`;
        const io = req.app.get('io');
        console.log(`[Backend Emit] Attempting to emit 'updateScore' to room: ${roomName}`);
        // console.log('[Backend Emit] State being emitted:', JSON.stringify(fullLiveState, null, 2)); // Already logged in getLiveMatchState if called

        if (io && fullLiveState) { // Check if state was retrieved
            io.to(roomName).emit('updateScore', fullLiveState);
            if (updatedStatus === 'InningsBreak' && currentStatus !== 'InningsBreak') io.to(roomName).emit('inningsBreak', fullLiveState);
            if (updatedStatus === 'Completed' && currentStatus !== 'Completed') io.to(roomName).emit('matchEnded', fullLiveState);
            console.log(`[Backend Emit] Successfully emitted 'updateScore' for match ${matchId}.`);
        }
        else if (!io) {
            console.error("[Backend Emit] Socket.IO instance not found. Emission failed!");
        }
        else if (!fullLiveState) {
            console.error(`[Backend Emit] Failed to get consistent state. Emission skipped!`);
        }

        res.status(201).json({ message: 'Ball scored successfully', ballId: newBallId, newState: fullLiveState || {} }); // Return fetched state

    } catch (error) {
        await connection.rollback();
        console.error(`Error scoring ball for Match ${matchId}:`, error);
        const statusCode = error.message.includes('not found') ? 404 : (error.message.includes('invalid') || error.message.includes('allowed') || error.message.includes('required') || error.message.includes('must be') || error.message.includes('quota') || error.message.includes('already out') || error.message.includes('Toss winner ID') || error.message.includes('Decision must be') || error.message.includes('cannot bowl') || error.message.includes('already completed') || error.message.includes('Fielder ID required')) ? 400 : 500;
        const io = req.app.get('io'); const roomName = `match_${matchId}`; if (io) io.to(roomName).emit('scoringError', { message: error.message || 'Scoring error occurred.' });
        res.status(statusCode).json({ message: error.message || 'Database error occurred.' });
    } finally {
        if (connection) connection.release();
    }
};


// --- undoLastBall (No changes needed from previous full version) ---
/**
 * @desc    Undo the last recorded ball event for a match.
 * @route   DELETE /api/admin/scoring/matches/:matchId/ball/last
 * @access  Admin (Protected)
 */
exports.undoLastBall = async (req, res, next) => {
    const matchId = parseInt(req.params.matchId);
    if (isNaN(matchId)) return res.status(400).json({ message: 'Invalid Match ID.' });

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        console.log(`--- Starting UNDO for Match ${matchId} ---`);

        // 1. Find the last ball record
        const [lastBallArr] = await connection.query(`SELECT * FROM ballbyball WHERE match_id = ? ORDER BY ball_id DESC LIMIT 1 FOR UPDATE`, [matchId]);
        if (lastBallArr.length === 0) throw new Error('No balls recorded yet to undo.');
        const lastBall = lastBallArr[0];
        const { ball_id, over_number, bowler_player_id, batsman_on_strike_player_id, runs_scored, is_bye, is_extra, extra_type, extra_runs, is_wicket, wicket_type, fielder_player_id } = lastBall;
        const inningNum = lastBall.inning_number ?? lastBall.inningNumber;
        const isExtra = is_extra;
        const extraType = extra_type;
        const extraRuns = extra_runs;
        const isWicket = is_wicket;
        const wicketType = wicket_type;
        const isBye = is_bye;
        console.log(`--- Undoing Ball ID: ${ball_id}, Inning: ${inningNum}, Over: ${over_number} ---`);

        // 2. Fetch Match state & details
        const [matches] = await connection.query('SELECT status, team1_id, team2_id, toss_winner_team_id, decision, season_id, winner_team_id, result_summary, super_over_number FROM matches WHERE match_id = ? FOR UPDATE', [matchId]);
        if (matches.length === 0) throw new Error('Match not found.');
        const match = matches[0];
        let currentStatus = match.status;
        if (!['Live'].includes(currentStatus)) throw new Error(`Cannot undo ball. Match status is '${currentStatus}'.`);

        // Determine batting/bowling team
        let battingTeamId, bowlingTeamId;
        if (inningNum == 1) { battingTeamId = (match.decision === 'Bat') ? match.toss_winner_team_id : (match.toss_winner_team_id == match.team1_id ? match.team2_id : match.team1_id); bowlingTeamId = (battingTeamId == match.team1_id) ? match.team2_id : match.team1_id; }
        else { bowlingTeamId = (match.decision === 'Bat') ? match.toss_winner_team_id : (match.toss_winner_team_id == match.team1_id ? match.team2_id : match.team1_id); battingTeamId = (bowlingTeamId == match.team1_id) ? match.team2_id : match.team1_id; }
        console.log(`--- Undo Context: Batting=${battingTeamId}, Bowling=${bowlingTeamId} ---`);

        // --- 2b. Reverse manual fielding adjustment on this ball (if any), before other impact reversals ---
        const adjPid = lastBall.fielding_adjustment_player_id;
        const adjPts = lastBall.fielding_adjustment_points;
        if (adjPid != null && adjPts != null && Number(adjPts) !== 0) {
            await connection.query(
                'UPDATE playermatchstats SET fielding_impact_points = fielding_impact_points - ? WHERE match_id = ? AND player_id = ?',
                [Number(adjPts), matchId, adjPid]
            );
            console.log(`--- Reversed manual fielding adjustment: player ${adjPid}, points ${adjPts} ---`);
        }

        // --- 3. Reverse PlayerMatchStats changes ---
        console.log(`--- Reverting Player Stats ---`);
        // Batsman: no-ball counted (ball + fours/twos), wide did not — match record logic.
        let countsForBatsmanBall = !(isExtra && extraType === 'Wide');
        // Bowler: only legal deliveries (no Wide, no NoBall) added to overs — subtract only for those.
        let countsForBowlerOver = !(isExtra);
        const faceOffBat = (!isBye && !isExtra) ? runs_scored : ((!isBye && isExtra && extraType === 'NoBall') ? runs_scored : 0);
        const extraRunsFace = parseInt(extra_runs, 10) || 0;
        const runsForBowler = (!isBye ? faceOffBat : 0) + (isExtra ? extraRunsFace : 0);
        // Revert Batsman (team_id scopes batting squad row; IF uses 1/0 for reliable MySQL binding)
        const wkUndo = isWicket ? 1 : 0;
        await connection.query(
            `UPDATE playermatchstats SET runs_scored = GREATEST(0, runs_scored - ?), balls_faced = GREATEST(0, balls_faced - ?), fours = GREATEST(0, fours - ?), twos = GREATEST(0, twos - ?), is_out = IF(? = 1 AND how_out = ?, FALSE, is_out), how_out = IF(? = 1 AND how_out = ?, NULL, how_out) WHERE match_id = ? AND player_id = ? AND team_id = ?`,
            [faceOffBat, countsForBatsmanBall ? 1 : 0, (runs_scored == 4 && !isBye && (!isExtra || extraType === 'NoBall')) ? 1 : 0, (runs_scored == 2 && !isBye && (!isExtra || extraType === 'NoBall')) ? 1 : 0, wkUndo, wicketType, wkUndo, wicketType, matchId, batsman_on_strike_player_id, battingTeamId]
        );
        if (!isExtra) {
            try {
                await connection.query('UPDATE playermatchstats SET legal_balls_faced = GREATEST(0, legal_balls_faced - 1) WHERE match_id = ? AND player_id = ? AND team_id = ?', [matchId, batsman_on_strike_player_id, battingTeamId]);
            } catch (e) { if (e.code !== 'ER_BAD_FIELD_ERROR') throw e; }
        }
        // Revert Bowler: only subtract from overs when the ball was a legal delivery (not Wide/NoBall)
        const [bowlerStatsData] = await connection.query('SELECT overs_bowled FROM playermatchstats WHERE match_id = ? AND player_id = ?', [matchId, bowler_player_id]);
        const currentOversDecimal = bowlerStatsData.length > 0 ? (bowlerStatsData[0].overs_bowled || 0) : 0;
        let previousOversDecimal = currentOversDecimal; if (countsForBowlerOver && currentOversDecimal > 0) { const currentOvers = Math.floor(currentOversDecimal); const currentBalls = Math.round((currentOversDecimal - currentOvers) * 10); if (currentBalls === 1 && currentOvers > 0) { previousOversDecimal = parseFloat(`${currentOvers - 1}.5`); } else if (currentBalls > 0) { previousOversDecimal = parseFloat(`${currentOvers}.${currentBalls - 1}`); } else { /* Edge case 0.0 remains 0.0 */ previousOversDecimal = 0.0; } }
        await connection.query(`UPDATE playermatchstats SET overs_bowled = ?, runs_conceded = GREATEST(0, runs_conceded - ?), wickets_taken = GREATEST(0, wickets_taken - ?), wides = GREATEST(0, wides - ?), no_balls = GREATEST(0, no_balls - ?) WHERE match_id = ? AND player_id = ?`, [Math.max(0, previousOversDecimal), runsForBowler, (isWicket && !['Run Out'].includes(wicketType)) ? 1 : 0, extraType === 'Wide' ? 1 : 0, extraType === 'NoBall' ? 1 : 0, matchId, bowler_player_id]);
        // Revert Fielder
        if (isWicket && fielder_player_id) { await connection.query(`UPDATE playermatchstats SET catches = GREATEST(0, catches - ?), stumps = GREATEST(0, stumps - ?) WHERE match_id = ? AND player_id = ?`, [wicketType === 'Caught' ? 1 : 0, wicketType === 'Stumped' ? 1 : 0, matchId, fielder_player_id]); }
        console.log(`--- Player Stats Reverted ---`);

        // Calculate Impact Points to Reverse
        const impactSettings = await loadImpactSettings(connection);
        const baseImpactPointsToReverse = calculateImpactPoints({
            runs_scored,
            is_extra: lastBall.is_extra,
            extra_type: lastBall.extra_type,
            extra_runs: lastBall.is_extra ? extraRunsFace : 0,
            is_wicket: lastBall.is_wicket,
            wicket_type: lastBall.wicket_type,
            is_bye: lastBall.is_bye,
        }, impactSettings);
        const [matchOverRow] = await connection.query('SELECT super_over_number FROM matches WHERE match_id = ? LIMIT 1', [matchId]);
        const isSuperOverUndoBall = Number(lastBall.over_number) === Number(matchOverRow[0]?.super_over_number || -1);
        const impactPointsToReverse = applySuperOverImpactMultiplier(baseImpactPointsToReverse, isSuperOverUndoBall, impactSettings);
        console.log(`--- Reversing Impact: Bat=${impactPointsToReverse.batsman}, Bowl=${impactPointsToReverse.bowler}, Field=${impactPointsToReverse.fielder} ---`);
        // Revert Batsman: only subtract batting_impact_points (runs/balls_faced/fours/twos/is_out already reverted above — do not double-decrement)
        await connection.query(`UPDATE playermatchstats SET batting_impact_points = GREATEST(0, batting_impact_points - ?) WHERE match_id = ? AND player_id = ?`,
            [impactPointsToReverse.batsman, matchId, lastBall.batsman_on_strike_player_id]);

        // Revert Bowler: only subtract bowling_impact_points (overs/runs_conceded/wickets/wides/no_balls already reverted above — do not double-decrement)
        await connection.query(`UPDATE playermatchstats SET bowling_impact_points = GREATEST(0, bowling_impact_points - ?) WHERE match_id = ? AND player_id = ?`,
            [impactPointsToReverse.bowler, matchId, lastBall.bowler_player_id]);

        // Revert Fielder: only subtract fielding_impact_points (catches/stumps already reverted above)
        if (lastBall.is_wicket && fielder_player_id && impactPointsToReverse.fielder !== 0) {
            await connection.query(`UPDATE playermatchstats SET fielding_impact_points = GREATEST(0, fielding_impact_points - ?) WHERE match_id = ? AND player_id = ?`,
                [impactPointsToReverse.fielder, matchId, fielder_player_id]);
        }

        // --- 4. Delete the last ballbyball record ---
        console.log(`--- Deleting Ball ID: ${ball_id} ---`);
        await connection.query("DELETE FROM ballbyball WHERE ball_id = ?", [ball_id]);

        // --- 5. Revert Match Status if necessary ---
        let newStatus = currentStatus; let revertStatus = false; const maxOvers = 5; const maxWickets = 5;
        const [prevProgressInfo] = await connection.query(`SELECT COUNT(*) as wickets_this_inning FROM playermatchstats WHERE match_id = ? AND team_id = ? AND is_out = TRUE`, [matchId, battingTeamId]);
        const [prevOverProgress] = await connection.query(`SELECT over_number, COUNT(*) as legal_balls FROM ballbyball WHERE match_id = ? AND inning_number = ? AND (is_extra = false) GROUP BY over_number ORDER BY over_number DESC LIMIT 1`, [matchId, inningNum]);
        const prevLastLegalOverNum = prevOverProgress[0]?.over_number || 0;
        const ballsInPrevLastLegalOver = prevOverProgress[0]?.legal_balls || 0;

        let prevInningsEndReason = null;
        if ((prevProgressInfo[0].wickets_this_inning || 0) >= maxWickets) {
            prevInningsEndReason = 'Wickets';
        }

        else if (prevLastLegalOverNum > maxOvers || (prevLastLegalOverNum === maxOvers && ballsInPrevLastLegalOver >= 6)) {
            prevInningsEndReason = 'Overs Completed';
        }

        if (currentStatus === 'InningsBreak' && inningNum === 1 && !prevInningsEndReason) {
            revertStatus = true;
        }
        else if (currentStatus === 'Completed' && inningNum === 2) {
            let wasTargetAchievedBefore = false;
            if (!prevInningsEndReason) { // Check target achievement only if innings didn't end for other reasons
                const [prevInn2ScoreData] = await connection.query(`SELECT SUM(${SQL_INNINGS_RUNS_PER_BALL}) as score FROM ballbyball WHERE match_id = ? AND inning_number = 2`, [matchId]); // Score AFTER deleting ball
                const prevInn2Score = prevInn2ScoreData[0]?.score || 0;
                const [inn1ScoreData] = await connection.query(`SELECT SUM(${SQL_INNINGS_RUNS_PER_BALL}) as score FROM ballbyball WHERE match_id = ? AND inning_number = 1`, [matchId]);
                const targetScore = Number((inn1ScoreData[0]?.score || 0)) + 1;
                wasTargetAchievedBefore = prevInn2Score >= targetScore;
            }
            if (!prevInningsEndReason && !wasTargetAchievedBefore) {
                revertStatus = true;
            }
        }

        //if (revertStatus) { newStatus = 'Live'; console.log(`--- Reverting Match Status from ${currentStatus} to Live ---`); await connection.query("UPDATE matches SET status = 'Live', winner_team_id = NULL, result_summary = NULL, man_of_the_match_player_id = NULL WHERE match_id = ?", [matchId]); }

        if (revertStatus) {
            newStatus = 'Live'; console.log(`--- Reverting Match Status from ${currentStatus} to Live ---`);
            // set MoM to NULL as well
            await connection.query("UPDATE matches SET status = 'Live', winner_team_id = NULL, result_summary = NULL, man_of_the_match_player_id = NULL WHERE match_id = ?", [matchId]);
        }


        // --- 6. Commit Transaction ---
        await connection.commit();
        console.log(`--- Undo for Ball ID ${ball_id} committed ---`);

        // --- 7. Fetch and Emit the NEW Corrected State ---
        console.log(`--- Fetching corrected state after undo ---`);
        // Use internal call/refetch logic
        const stateResponse = await exports.getLiveMatchState({ params: { matchId } }, { json: (data) => data }, () => { });
        const correctedState = stateResponse;

        if (!correctedState || !correctedState.status) {
            console.error(`!!! Failed to retrieve consistent state after undoing ball ${ball_id} for match ${matchId} !!!`);
        }

        const io = req.app.get('io');
        if (io && correctedState) { const roomName = `match_${matchId}`; io.to(roomName).emit('updateScore', correctedState); console.log(`[Backend Emit] Emitted corrected state for match ${matchId} after undo.`); }
        else if (!io) { console.error("[Backend Emit] Socket.IO instance not found after undo. Emission failed!"); }
        else if (!correctedState) { console.error(`[Backend Emit] Failed to get consistent state after undo. Emission skipped!`); }


        res.status(200).json({ message: 'Last ball undone successfully.', newState: correctedState || {} });

    } catch (error) {
        await connection.rollback();
        console.error(`Error undoing last ball for Match ${matchId}:`, error);
        const statusCode = error.message.includes('not found') ? 404 : (error.message.includes('Cannot undo') ? 400 : 500);
        res.status(statusCode).json({ message: error.message || 'Database error occurred while undoing ball.' });
    } finally {
        if (connection) connection.release();
    }
};