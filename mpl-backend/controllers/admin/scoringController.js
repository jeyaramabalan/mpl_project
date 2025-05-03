// mpl-project/mpl-backend/controllers/admin/scoringController.js
const pool = require('../../config/db');

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

// --- NEW HELPER: Calculate Impact Points (Updated Logic) ---
/**
 * Calculates impact points based on the outcome of a single ball using the revised rules.
 * @param {object} ballData - Details of the ball event.
 * @returns {object} - Object containing points for batsman, bowler, fielder.
 */
function calculateImpactPoints(ballData) {
    const points = { batsman: 0, bowler: 0, fielder: 0 };
    // Destructure with default values for safety
    const { runs_scored = 0, is_extra = false, extra_type = null, extra_runs = 0, is_wicket = false, wicket_type = null, is_bye = false } = ballData;

    // Runs scored off the bat (excluding byes/leg-byes and non-NoBall extras)
    const runsOffBat = (!is_bye && !is_extra) ? runs_scored : ((!is_bye && is_extra && extra_type === 'NoBall') ? runs_scored : 0);
    // Runs conceded by the bowler (includes runs off bat on NB, and extra runs for NB/Wide, excludes byes)
    const runsConcededByBowler = (!is_bye ? runsOffBat : 0) + (is_extra ? (extra_runs || 0) : 0);

    // --- Batting Points (Applied only for legal deliveries where runs are scored off the bat) ---
    if (!is_extra && !is_bye) {
        if (runsOffBat === 0) {
            points.batsman = -0.5;
        } else if (runsOffBat === 1) {
            points.batsman = 1;
        } else if (runsOffBat === 2) {
            points.batsman = 3;
        } else if (runsOffBat === 4) {
            points.batsman = 6; // Changed from 7
        } else if (runsOffBat === 8) {
            points.batsman = 10; // Changed from 15 (Represents 4 runs in Super Over resulting in 8 actual runs)
        }
        // Add more conditions here if other run values (e.g., 6) have specific points
    }

    // --- Bowling Points (Byes are ignored) ---
    if (!is_bye) {
        if (runsConcededByBowler === 0) {
            if (!is_extra) { // Legal Dot Ball
                points.bowler = 1; // Changed from 2
            } else { // Extra (Wide/NoBall) that conceded 0 runs (e.g., wide not run)
                points.bowler = -0.5; // New Rule
            }
        } else if (runsConcededByBowler === 1) {
            if (!is_extra) { // 1 run conceded (legal)
                points.bowler = 0; // No change
            } else { // 1 run conceded (extra - e.g. Wide run, NB run)
                points.bowler = -1; // New Rule
            }
        } else if (runsConcededByBowler === 2) {
            points.bowler = -1; // Changed from -3
        } else if (runsConcededByBowler === 4) {
            points.bowler = -2; // Changed from -6
        } else if (runsConcededByBowler === 8) {
            points.bowler = -4; // Changed from -12
        } else if (runsConcededByBowler > 0 && is_extra) {
            // Catch-all for other run amounts conceded on extras, if any
            points.bowler = -1; // Apply the general -1 for extras with runs > 0 if specific value not matched
        }
        // Add other specific run values if needed (e.g., 6 runs conceded)
    }

    // Wicket points for bowler (excluding run outs)
    if (is_wicket && !['Run Out'].includes(wicket_type)) {
        points.bowler += 10; // Changed from 15
    }

    // --- Fielding Points ---
    if (is_wicket && (wicket_type === 'Caught' || wicket_type === 'Stumped')) {
        points.fielder = 5; // Changed from 4
    }
    // Add points for Run Outs for fielder if applicable

    return points;
}

// --- NEW HELPER: Calculate Impact Points ---
/**
 * Calculates impact points based on the outcome of a single ball.
 * @param {object} ballData - Details of the ball event.
 * @returns {object} - Object containing points for batsman, bowler, fielder.
 */

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
        const query = `
            SELECT m.match_id, m.match_datetime, t1.name as team1_name, t2.name as team2_name, t1.team_id as team1_id, t2.team_id as team2_id
            FROM Matches m
            JOIN Teams t1 ON m.team1_id = t1.team_id
            JOIN Teams t2 ON m.team2_id = t2.team_id
            WHERE m.status = 'Scheduled'
            ORDER BY m.match_datetime ASC
        `;
        console.log('--- Executing setup list query ---'); // Log Query Execution
        const [matches] = await pool.query(query);
        console.log(`--- Query finished, found ${matches.length} matches ---`); // Log Query Result
        res.json(matches);
        console.log('--- Response sent from getMatchesForSetup ---'); // Log Response Sent
    } catch (error) {
        console.error("Get Matches for Setup Error:", error); // Log Error Details
        console.log('--- Error in getMatchesForSetup, calling next() ---'); // Log Error Handling
        next(error);
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
    const { toss_winner_team_id, decision, super_over_number } = req.body;

    // Validation
    if (isNaN(matchId)) return res.status(400).json({ message: 'Invalid Match ID.' });
    if (!toss_winner_team_id || isNaN(parseInt(toss_winner_team_id))) return res.status(400).json({ message: 'Valid Toss Winner Team ID is required.' });
    if (!decision || !['Bat', 'Bowl'].includes(decision)) return res.status(400).json({ message: 'Decision must be "Bat" or "Bowl".' });
    if (super_over_number == null || isNaN(parseInt(super_over_number)) || super_over_number < 1 || super_over_number > 5) return res.status(400).json({ message: 'Super Over number must be between 1 and 5.' });

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        console.log(`--- Starting Setup for Match ${matchId} ---`);

        // 1. Check Match Status & Get Details
        const [matchCheck] = await connection.query('SELECT status, team1_id, team2_id, season_id FROM Matches WHERE match_id = ? FOR UPDATE', [matchId]);
        if (matchCheck.length === 0) throw new Error('Match not found.');
        if (matchCheck[0].status !== 'Scheduled') throw new Error(`Match cannot be set up. Current status: ${matchCheck[0].status}`);
        const { team1_id, team2_id, season_id } = matchCheck[0];

        // 2. Validate Toss Winner ID
        if (parseInt(toss_winner_team_id) !== team1_id && parseInt(toss_winner_team_id) !== team2_id) throw new Error('Toss winner ID does not match teams in the match.');

        // 3. Update Match Table
        console.log(`--- Updating Match ${matchId} status to Setup ---`);
        await connection.query(
            'UPDATE Matches SET status = ?, toss_winner_team_id = ?, decision = ?, super_over_number = ? WHERE match_id = ?',
            ['Setup', parseInt(toss_winner_team_id), decision, parseInt(super_over_number), matchId]
        );

        // 4. Create initial PlayerMatchStats entries
        console.log(`--- Fetching players for teams ${team1_id} and ${team2_id} ---`);
        const [team1Players] = await connection.query('SELECT player_id FROM TeamPlayers WHERE team_id = ? AND season_id = ?', [team1_id, season_id]);
        const [team2Players] = await connection.query('SELECT player_id FROM TeamPlayers WHERE team_id = ? AND season_id = ?', [team2_id, season_id]);
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
                connection.query('INSERT INTO PlayerMatchStats (match_id, player_id, team_id, batting_impact_points, bowling_impact_points, fielding_impact_points) VALUES (?, ?, ?, 0, 0, 0)', [matchId, p.player_id, p.team_id])
                    .catch(err => { if (err.code === 'ER_DUP_ENTRY') { console.warn(`PlayerMatchStats entry exists for match ${matchId}, player ${p.player_id}. Ignoring.`); return null; } throw err; })
            );
            await Promise.all(statsInsertPromises);
            console.log(`--- PlayerMatchStats initialization complete ---`);
        }

        // 5. Commit
        await connection.commit();
        console.log(`--- Match ${matchId} setup committed ---`);

        // 6. Prepare Initial State for Frontend/Sockets
        const fetchPlayerNames = async (playerIds) => { if (!playerIds || playerIds.length === 0) return []; const placeholders = playerIds.map(() => '?').join(','); const [names] = await pool.query(`SELECT player_id, name FROM Players WHERE player_id IN (${placeholders})`, playerIds.map(p => p.player_id)); return names; };
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
        const [matches] = await pool.query('SELECT m.*, t1.name as team1_name, t2.name as team2_name FROM Matches m join teams t1 on m.team1_id = t1.team_id join teams t2 on m.team2_id = t2.team_id WHERE m.match_id = ? ;', [matchId]);
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
<<<<<<< HEAD
                team1_name: team1Data[0]?.name || `${team1_id}`, team2_name: team2Data[0]?.name || `${team2_id}`,
=======
                team1_name: team1_name, team2_name: team2_name,
>>>>>>> aae5381670ae7999c1b9746a968ae88b919109ec
            });
        }

        // --- 2. Determine Current Inning & Teams (for Setup, Live, InningsBreak, Completed) ---

        let inningNumber = 1; // Default to 1

        if (status === 'InningsBreak' || status === 'Completed') {
            // If the match status clearly indicates inning 2 has started or finished
            inningNumber = 2;
        } else if (status === 'Live') {
            // If live, check the inning of the last recorded ball
            const [lastBall] = await pool.query('SELECT inning_number FROM BallByBall WHERE match_id = ? ORDER BY ball_id DESC LIMIT 1', [matchId]);
            if (lastBall.length > 0) {
                // Trust the inning number of the last ball bowled if status is Live
                inningNumber = lastBall[0].inning_number;
            } // If no last ball and Live, default inning 1 is correct
        } // If status is Setup, default inning 1 is correct

        // --- Determine batting/bowling teams based on the determined inningNumber ---
        let battingTeamId, bowlingTeamId,battingTeamName, bowlingTeamName;
        if (inningNumber === 1) {
            battingTeamId = (decision === 'Bat') ? toss_winner_team_id : (toss_winner_team_id == team1_id ? team2_id : team1_id);
            bowlingTeamId = (battingTeamId == team1_id) ? team2_id : team1_id;
            battingTeamName = (decision === 'Bat'&& toss_winner_team_id == team1_id) ? team1_name : team2_name;
            bowlingTeamName = (battingTeamId == team1_id) ? team2_name : team1_name;
        }
        else {
            bowlingTeamId = (decision === 'Bat') ? toss_winner_team_id : (toss_winner_team_id == team1_id ? team2_id : team1_id);
            battingTeamId = (bowlingTeamId == team1_id) ? team2_id : team1_id;
            bowlingTeamName = (decision === 'Bat' && toss_winner_team_id == team1_id ) ? team1_name : team2_name;
            battingTeamName = (bowlingTeamId == team1_id) ? team2_name : team1_name;
        }
        console.log(`--- getLiveMatchState: Determined Inning=${inningNumber}, Batting=${battingTeamId}, Bowling=${bowlingTeamId} ---`);

        /*
        let inningNumber = 1;
        // Determine inning based on status and ball data
        if (status === 'InningsBreak' || status === 'Completed') {
            inningNumber = 2;
        } else if (status === 'Live') {
            const [lastBall] = await pool.query('SELECT inning_number FROM BallByBall WHERE match_id = ? ORDER BY ball_id DESC LIMIT 1', [matchId]);
            if (lastBall.length > 0) {
                inningNumber = lastBall[0].inning_number;
                // If last ball was inning 1, check if inning 1 should have ended
                if (inningNumber === 1) {
                    const maxWickets = 5; const maxOvers = 5;
                    const [inn1Stats] = await pool.query(`
                        SELECT
                            COUNT(CASE WHEN pms.is_out = TRUE THEN 1 END) as wickets,
                            MAX(b.over_number) as last_over_num,
                            (SELECT COUNT(*) FROM BallByBall b2 WHERE b2.match_id = ? AND b2.inning_number = 1 AND b2.over_number = MAX(b.over_number) AND (b2.is_extra = false OR b2.extra_type = 'NoBall')) as balls_in_last_over
                        FROM PlayerMatchStats pms
                        LEFT JOIN BallByBall b ON pms.match_id = b.match_id AND pms.team_id = ? AND b.inning_number = 1
                        WHERE pms.match_id = ? AND pms.team_id = ?
                     `, [matchId, (decision === 'Bat' ? toss_winner_team_id : (toss_winner_team_id == team1_id ? team2_id : team1_id)), matchId, (decision === 'Bat' ? toss_winner_team_id : (toss_winner_team_id == team1_id ? team2_id : team1_id))]);

                    if (inn1Stats[0].wickets >= maxWickets || (inn1Stats[0].last_over_num === maxOvers && inn1Stats[0].balls_in_last_over >= 6)) {
                        console.warn(`Match ${matchId}: Status is Live, but Inning 1 seems complete based on DB. Setting inningNumber=2 for state recovery.`);
                        inningNumber = 2; // Correct state for processing
                    }
                }
            } else {
                inningNumber = 1; // Live but no balls bowled yet
            }
        } else if (status === 'Setup') {
            inningNumber = 1;
        }

        let battingTeamId, bowlingTeamId;
        if (inningNumber === 1) {
            battingTeamId = (decision === 'Bat') ? toss_winner_team_id : (toss_winner_team_id == team1_id ? team2_id : team1_id);
            bowlingTeamId = (battingTeamId == team1_id) ? team2_id : team1_id;
        } else { // Inning 2 (or break/completed)
            bowlingTeamId = (decision === 'Bat') ? toss_winner_team_id : (toss_winner_team_id == team1_id ? team2_id : team1_id);
            battingTeamId = (bowlingTeamId == team1_id) ? team2_id : team1_id;
        }
        console.log(`--- getLiveMatchState: Determined Inning=${inningNumber}, Batting=${battingTeamId}, Bowling=${bowlingTeamId} ---`);
        */
        // --- 3. Calculate Current Score, Wickets, Overs, Target ---
        const [summaryScoreData] = await pool.query(`SELECT SUM(runs_scored + extra_runs) as totalScore FROM BallByBall WHERE match_id = ? AND inning_number = ?`, [matchId, inningNumber]);
        const [summaryWicketData] = await pool.query(`SELECT COUNT(*) as totalWickets FROM PlayerMatchStats WHERE match_id = ? AND team_id = ? AND is_out = TRUE`, [matchId, battingTeamId]);
        const score = summaryScoreData[0]?.totalScore || 0;
        const wickets = summaryWicketData[0]?.totalWickets || 0;

        // Calculate current overs/balls display (using corrected logic)
        const maxOvers = 5;
        let displayOver = 0;
        let displayBall = 0;
        const [overProgressData] = await pool.query(`
             SELECT over_number, COUNT(*) as legal_balls
             FROM BallByBall
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
        console.log(`--- getLiveMatchState: Calculated Score=${score}/${wickets}, Overs=${displayOver}.${displayBall} ---`);

        let targetScore = null;
        if (inningNumber === 2 || status === 'InningsBreak' || status === 'Completed') {
            const [scoreDataInning1] = await pool.query(`SELECT SUM(runs_scored + extra_runs) as score FROM BallByBall WHERE match_id = ? AND inning_number = 1`, [matchId]);
            targetScore = Number((scoreDataInning1[0]?.score || 0)) + 1;
            console.log(`--- getLiveMatchState: Target Score = ${targetScore} ---`);
        }

        // --- 4. Fetch Player Lists, Out Batsmen, Bowler Stats ---
        const fetchPlayerNames = async (playerIds) => { if (!playerIds || playerIds.length === 0) return []; const placeholders = playerIds.map(() => '?').join(','); const [names] = await pool.query(`SELECT player_id, name FROM Players WHERE player_id IN (${placeholders})`, playerIds.map(p => p.player_id || p)); return names; };
        const [team1PlayersDb] = await pool.query('SELECT player_id FROM TeamPlayers WHERE team_id = ? AND season_id = ?', [team1_id, season_id]);
        const [team2PlayersDb] = await pool.query('SELECT player_id FROM TeamPlayers WHERE team_id = ? AND season_id = ?', [team2_id, season_id]);
        const team1PlayerDetails = await fetchPlayerNames(team1PlayersDb);
        const team2PlayerDetails = await fetchPlayerNames(team2PlayersDb);
        const battingPlayersList = battingTeamId === team1_id ? team1PlayerDetails : team2PlayerDetails;
        const bowlingPlayersList = bowlingTeamId === team1_id ? team1PlayerDetails : team2PlayerDetails;

        const [batsmenOutStats] = await pool.query(`SELECT player_id FROM PlayerMatchStats WHERE match_id = ? AND team_id = ? AND is_out = TRUE`, [matchId, battingTeamId]);
        const batsmenOutIds = batsmenOutStats.map(b => b.player_id);

        const [currentBowlerStats] = await pool.query(`SELECT ps.player_id, FLOOR(ps.overs_bowled) as completed_overs,p.name as player_name FROM PlayerMatchStats ps join players p on ps.player_id = p.player_id  WHERE ps.match_id = ? AND ps.team_id = ? AND ps.overs_bowled > 0`, [matchId, bowlingTeamId]);
        console.log(`--- getLiveMatchState: Fetched ${batsmenOutIds.length} out batsmen, ${currentBowlerStats.length} bowlers with stats ---`);

        // --- 5. Fetch Recent Commentary ---
        const [recentCommentaryData] = await pool.query(`SELECT ball_id, commentary_text FROM BallByBall WHERE match_id = ? ORDER BY ball_id DESC LIMIT 10`, [matchId]);
        const recentBallsSummary = recentCommentaryData.length > 0 ? recentCommentaryData.slice().reverse().map(b => b.commentary_text?.split(':')[0] || '?').join(', ') : '';
        const lastBallCommentary = recentCommentaryData[0]?.commentary_text || (status === 'Setup' ? 'Match setup complete. Select opening players.' : 'No commentary yet.');
        console.log(`--- getLiveMatchState: Last commentary event: ${lastBallCommentary} ---`);

        // --- 6. Construct and Return State ---
        const fullLiveState = {
            matchId: matchId, status: status, inningNumber: inningNumber,
            score: score, wickets: wickets,
            overs: displayOver, balls: displayBall, target: targetScore, superOver: super_over_number,
            battingTeamId: battingTeamId, bowlingTeamId: bowlingTeamId,
            battingTeamName: battingTeamName, bowlingTeamName: bowlingTeamName,
            lastBallCommentary: lastBallCommentary, recentBallsSummary: recentBallsSummary,
            bowlerStats: currentBowlerStats, batsmenOutIds: batsmenOutIds,
            playersBattingTeam: battingPlayersList, playersBowlingTeam: bowlingPlayersList,
            seasonId: season_id,
            resultSummary: match.result_summary, winnerTeamId: match.winner_team_id
        };
        console.log(`--- getLiveMatchState: Sending full state for match ${matchId} ---`);
        res.json(fullLiveState);

    } catch (error) {
        console.error(`Error in getLiveMatchState for Match ${matchId}:`, error);
        next(error);
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
            const [impactStats] = await connection.query(`SELECT player_id, team_id, (batting_impact_points + bowling_impact_points + fielding_impact_points) as total_impact FROM PlayerMatchStats WHERE match_id = ? ORDER BY total_impact DESC`, [matchId]);
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
        await connection.query('UPDATE Matches SET status = ?, winner_team_id = ?, result_summary = ?, man_of_the_match_player_id = ? WHERE match_id = ?', ['Completed', winner_team_id || null, result_summary || null, finalManOfTheMatchPlayerId, matchId]);

        // 2. Update PlayerMatchStats
        if (playerStats && Array.isArray(playerStats)) {
            console.log(`--- Updating PlayerMatchStats for ${playerStats.length} players ---`);
            const updatePromises = playerStats.map(stat => {
                const { player_id, team_id, ...statsToUpdate } = stat;
                const numericFields = ['runs_scored', 'balls_faced', 'fours', 'sixes', 'wickets_taken', 'runs_conceded', 'overs_bowled', 'maidens', 'wides', 'no_balls', 'catches', 'stumps', 'run_outs'];
                numericFields.forEach(field => { statsToUpdate[field] = statsToUpdate[field] ?? 0; });
                statsToUpdate.is_out = statsToUpdate.is_out ?? false;
                statsToUpdate.how_out = statsToUpdate.how_out || null;
                return connection.query(
                    `INSERT INTO PlayerMatchStats (match_id, player_id, team_id, runs_scored, balls_faced, fours, sixes, is_out, how_out, wickets_taken, runs_conceded, overs_bowled, maidens, wides, no_balls, catches, stumps, run_outs)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                     runs_scored = VALUES(runs_scored), balls_faced = VALUES(balls_faced), fours = VALUES(fours), sixes = VALUES(sixes), is_out = VALUES(is_out), how_out = VALUES(how_out), wickets_taken = VALUES(wickets_taken), runs_conceded = VALUES(runs_conceded), overs_bowled = VALUES(overs_bowled), maidens = VALUES(maidens), wides = VALUES(wides), no_balls = VALUES(no_balls), catches = VALUES(catches), stumps = VALUES(stumps), run_outs = VALUES(run_outs)`,
                    [matchId, player_id, team_id, statsToUpdate.runs_scored, statsToUpdate.balls_faced, statsToUpdate.fours, statsToUpdate.sixes, statsToUpdate.is_out, statsToUpdate.how_out, statsToUpdate.wickets_taken, statsToUpdate.runs_conceded, statsToUpdate.overs_bowled, statsToUpdate.maidens, statsToUpdate.wides, statsToUpdate.no_balls, statsToUpdate.catches, statsToUpdate.stumps, statsToUpdate.run_outs]
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
        const [matches] = await connection.query('SELECT status, super_over_number, team1_id, team2_id, toss_winner_team_id, decision, season_id FROM Matches WHERE match_id = ? FOR UPDATE', [matchId]);
        if (matches.length === 0) throw new Error('Match not found.');
        const match = matches[0];
        let currentStatus = match.status;
        let updatedStatus = currentStatus; // Will update if status changes
        let targetScore = null;
        let battingTeamId, bowlingTeamId;
        const { team1_id, team2_id, toss_winner_team_id, decision, season_id } = match;
        if (inningNumber == 1) { battingTeamId = (decision === 'Bat') ? toss_winner_team_id : (toss_winner_team_id == team1_id ? team2_id : team1_id); bowlingTeamId = (battingTeamId == team1_id) ? team2_id : team1_id; }
        else { bowlingTeamId = (decision === 'Bat') ? toss_winner_team_id : (toss_winner_team_id == team1_id ? team2_id : team1_id); battingTeamId = (bowlingTeamId == team1_id) ? team2_id : team1_id; const [scoreData] = await connection.query(`SELECT SUM(runs_scored + extra_runs) as score FROM BallByBall WHERE match_id = ? AND inning_number = 1`, [matchId]); targetScore = Number((scoreData[0]?.score || 0)) + 1; }
        console.log(`--- Scoring Ball: Match ${matchId}, Inning ${inningNumber}, Status ${currentStatus}, Batting ${battingTeamId}, Bowling ${bowlingTeamId} ---`);

        // --- 2. Handle Status Transition & Validation ---
        let dbOverNumber = 1; let dbBallNumberInOver = 1; let logicalOver = 0; let logicalBallInOver = 0; let nextInningNumber = inningNumber;
        let previousOverBowlerId = null; // ADDED: Track the bowler of the last ball of the previous over

        if (currentStatus === 'Setup' && inningNumber == 1) { await connection.query("UPDATE Matches SET status = 'Live' WHERE match_id = ?", [matchId]); currentStatus = 'Live'; updatedStatus = 'Live'; console.log(`Match ${matchId}: Status -> Live (Inning 1 Start)`); }
        else if (currentStatus === 'InningsBreak' && inningNumber == 2) { await connection.query("UPDATE Matches SET status = 'Live' WHERE match_id = ?", [matchId]); currentStatus = 'Live'; updatedStatus = 'Live'; console.log(`Match ${matchId}: Status -> Live (Inning 2 Start). Target: ${targetScore}.`); }
        else if (currentStatus === 'Live') {
            const [batsmanOutCheck] = await connection.query(`SELECT 1 FROM PlayerMatchStats WHERE match_id = ? AND player_id = ? AND team_id = ? AND is_out = TRUE`, [matchId, batsmanOnStrikePlayerId, battingTeamId]); if (batsmanOutCheck.length > 0) throw new Error(`Batsman ${batsmanOnStrikePlayerId} is already out.`);

            // --- Determine Over/Ball Sequence FIRST ---
            // We need dbOverNumber before checking bowler eligibility for the *new* over
            const [lastBallInfo] = await connection.query(`SELECT over_number, ball_number_in_over, bowler_player_id FROM BallByBall WHERE match_id = ? AND inning_number = ? ORDER BY ball_id DESC LIMIT 1`, [matchId, inningNumber]); // Fetch bowler_id too
            if (lastBallInfo.length > 0) {
                const lastBall = lastBallInfo[0];
                const [legalBallsData] = await connection.query(`SELECT COUNT(*) as count FROM BallByBall WHERE match_id = ? AND inning_number = ? AND over_number = ? AND (is_extra = false)`, [matchId, inningNumber, lastBall.over_number]);
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
            const [bowlerOversData] = await connection.query(`SELECT ps.player_id, FLOOR(ps.overs_bowled) as completed_overs,p.name as player_name FROM PlayerMatchStats ps join players p on ps.player_id = p.player_id  WHERE ps.match_id = ? AND ps.team_id = ? AND ps.overs_bowled > 0`, [matchId, bowlingTeamId]);
            let twoOverBowlerExists = false; let currentBowlerCompletedOvers = 0;
            let didCurrentBowlerBowlSuperOver = false; // ADDED: Check if current bowler bowled the super over

            bowlerOversData.forEach(b => {
                if (b.completed_overs >= 2) twoOverBowlerExists = true;
                if (b.player_id === bowlerPlayerId) {
                    currentBowlerCompletedOvers = b.completed_overs;
                    // Check if this bowler bowled the designated super over
                    // We need to query BallByBall again for this specific bowler and super over number
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
                `SELECT 1 FROM BallByBall b
                 JOIN Matches m ON b.match_id = m.match_id
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
            // --- End Bowler Eligibility Checks ---

        }

        else {
            throw new Error(`Match scoring not allowed. Status: '${currentStatus}'.`);
        }

        // --- 3. Calculate Runs & Legality ---
        let actualRunsOffBat = (!isBye && !isExtra) ? runsScored : ((!isBye && isExtra && extraType === 'NoBall') ? runsScored : 0);

        //let isLegalDelivery = !(isExtra && (extraType === 'Wide'||extraType === 'NoBall'));
        let isLegalDelivery = !(isExtra)
        let isSuperOverBall = dbOverNumber === match.super_over_number;
        if (isSuperOverBall && (!isExtra || extraType === 'NoBall') && !isBye && actualRunsOffBat > 0) actualRunsOffBat *= 2;
        const runsForBowler = actualRunsOffBat + (parseInt(extraRuns) || 0);
        if (isSuperOverBall && (isExtra) > 0) extraRuns *= 2;
        if (isSuperOverBall && isBye) extraRuns = extraRuns + 2

        // --- 4. Generate Commentary ---
        let logicalBallDisplay = logicalBallInOver + (isLegalDelivery ? 1 : 0);
        if (logicalBallDisplay > 6) logicalBallDisplay = 1;
        let commentary = `${logicalOver}.${logicalBallDisplay}: Ball. `;
        if (isWicket) commentary += `WICKET! (${wicketType}).${fielderPlayerId ? ` Fielder: ${fielderPlayerId}.` : ''} `;
        if (isExtra) commentary += `${extraType}! +${extraRuns || 0}. `;
        if (!isExtra && !isBye && runsScored > 0) commentary += `${runsScored} run${runsScored !== 1 ? 's' : ''}${isSuperOverBall ? ' (Super Over!) - ' + actualRunsOffBat + ' runs' : ''}. `;
        if (isBye) commentary += `${runsScored} bye${runsScored !== 1 ? 's' : ''}. `;
        if (extraType === 'NoBall' && runsScored > 0 && !isBye) commentary += `(+${runsScored} off bat${isSuperOverBall ? ' Super Over! - ' + actualRunsOffBat + ' runs' : ''}). `;
        if (extraType === 'NoBall' && runsScored > 0 && isBye) commentary += `(+${runsScored} bye). `;
        if (isWicket && wicketType === 'Hit Outside') commentary = `${logicalOver}.${logicalBallDisplay}: Ball. WICKET! (Hit Outside). `;
        commentary = commentary.trim();

        // --- 5. Insert into BallByBall table ---
        const finalFielderId = (isWicket && ['Caught', 'Stumped'].includes(wicketType)) ? fielderPlayerId : null;
        console.log(`--- Inserting Ball: ${commentary} ---`);
        const [ballResult] = await connection.query(`INSERT INTO BallByBall (match_id, inning_number, over_number, ball_number_in_over, bowler_player_id, batsman_on_strike_player_id, runs_scored, is_bye, is_extra, extra_type, extra_runs, is_wicket, wicket_type, fielder_player_id, commentary_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [matchId, inningNumber, dbOverNumber, dbBallNumberInOver, bowlerPlayerId, batsmanOnStrikePlayerId, actualRunsOffBat, isBye || false, isExtra || false, extraType || null, parseInt(extraRuns || 0), isWicket || false, wicketType || null, finalFielderId, commentary]); const newBallId = ballResult.insertId;

        // --- 6. Calculate Impact Points --- 
        const impactPoints = calculateImpactPoints({ runs_scored: runsScored, is_extra: isExtra, extra_type: extraType, extra_runs: extraRuns, is_wicket: isWicket, wicket_type: wicketType, is_bye: isBye });
        console.log(`--- Impact Points for ball ${newBallId}: Bat=${impactPoints.batsman}, Bowl=${impactPoints.bowler}, Field=${impactPoints.fielder} ---`);

        // --- 7. Update PlayerMatchStats (MODIFIED for Impact Points) ---
        console.log(`--- Updating Stats: Batsman=${batsmanOnStrikePlayerId}, Bowler=${bowlerPlayerId}, Fielder=${finalFielderId || 'N/A'} ---`);
        // Update Batsman: Add batting_impact_points update
        await connection.query(`UPDATE PlayerMatchStats SET runs_scored = runs_scored + ?, balls_faced = balls_faced + ?, fours = fours + ?, sixes = sixes + ?, is_out = IF(? = TRUE, TRUE, is_out), how_out = IF(? = TRUE, ?, how_out), batting_impact_points = batting_impact_points + ? WHERE match_id = ? AND player_id = ?`,
            [actualRunsOffBat, isLegalDelivery ? 1 : 0, (runsScored == 4 && !isExtra && !isBye) ? 1 : 0, (runsScored == 6 && !isExtra && !isBye) ? 1 : 0, isWicket, isWicket, wicketType || null, impactPoints.batsman, matchId, batsmanOnStrikePlayerId]); // Added impactPoints.batsman

        // Update Bowler: Add bowling_impact_points update
        const [currentBowlerStatsData] = await connection.query('SELECT overs_bowled FROM PlayerMatchStats WHERE match_id = ? AND player_id = ?', [matchId, bowlerPlayerId]); const currentOversDecimal = currentBowlerStatsData[0]?.overs_bowled || 0.0; const newOversDecimal = calculateNewOversDecimal(currentOversDecimal, isLegalDelivery);
        await connection.query(`UPDATE PlayerMatchStats SET overs_bowled = ?, runs_conceded = runs_conceded + ?, wickets_taken = wickets_taken + ?, wides = wides + ?, no_balls = no_balls + ?, maidens = maidens + ?, bowling_impact_points = bowling_impact_points + ? WHERE match_id = ? AND player_id = ?`,
            [newOversDecimal, runsForBowler, (isWicket && !['Run Out'].includes(wicketType)) ? 1 : 0, extraType === 'Wide' ? 1 : 0, extraType === 'NoBall' ? 1 : 0, 0 /* Maiden TBD */, impactPoints.bowler, matchId, bowlerPlayerId]); // Added impactPoints.bowler

        // Update Fielder: Add fielding_impact_points update
        if (finalFielderId && impactPoints.fielder !== 0) {
            await connection.query(`UPDATE PlayerMatchStats SET catches = catches + ?, stumps = stumps + ?, fielding_impact_points = fielding_impact_points + ? WHERE match_id = ? AND player_id = ?`,
                [wicketType === 'Caught' ? 1 : 0, wicketType === 'Stumped' ? 1 : 0, impactPoints.fielder, matchId, finalFielderId]); // Added impactPoints.fielder
        }

        // --- 8. Check for End of Innings/Match & Calculate MoM ---
        let matchCompleted = false;
        let inningsEnded = false;
        let resultSummary = null;
        let winnerTeamId = null;
        const maxOvers = 5;
        const maxWickets = 5;
        const [progressInfo] = await connection.query(`SELECT COUNT(*) as wickets_this_inning FROM PlayerMatchStats WHERE match_id = ? AND team_id = ? AND is_out = TRUE`, [matchId, battingTeamId]); const [legalBallsDataCurrent] = await connection.query(`SELECT COUNT(*) as count FROM BallByBall WHERE match_id = ? AND inning_number = ? AND over_number = ? AND (is_extra = false)`, [matchId, inningNumber, dbOverNumber]);
        const totalWicketsThisInning = progressInfo[0].wickets_this_inning || 0;
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
                const [finalScores] = await connection.query(`SELECT inning_number, SUM(runs_scored + extra_runs) as total_score FROM BallByBall WHERE match_id = ? GROUP BY inning_number ORDER BY inning_number`, [matchId]); const inn1Score = finalScores.find(s => s.inning_number === 1)?.total_score || 0; const inn2Score = finalScores.find(s => s.inning_number === 2)?.total_score || 0;
                if (inn2Score >= targetScore) {
                    winnerTeamId = battingTeamId;
                    winnerTeamName = winnerTeamId;
                    try {
                        const [t1] = await connection.query('SELECT name FROM Teams WHERE team_id = ?', [winnerTeamId]);
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
                        const [t1] = await connection.query('SELECT name FROM Teams WHERE team_id = ?', [winnerTeamId]);
                        if (t1.length > 0) winnerTeamName = t1[0].name;

                    } catch (nameError) {
                        console.error("Error fetching team names for result summary:", nameError);
                        // Continue with IDs if names can't be fetched
                    }
                    resultSummary = `${winnerTeamName} won by ${inn1Score - inn2Score} runs.`;
                }
                else {
                    resultSummary = 'Match Tied.'; winnerTeamId = null;
                }
                console.log(`Match ${matchId}: Innings 2 ended. Status -> Completed. Result: ${resultSummary}`);
            }
        } else if (inningNumber === 2 && targetScore !== null) {
            const [currentInningScoreData] = await connection.query(`SELECT SUM(runs_scored + extra_runs) as score FROM BallByBall WHERE match_id = ? AND inning_number = 2`, [matchId]); const currentInningScore = currentInningScoreData[0]?.score || 0;
            if (currentInningScore >= targetScore) 
                { 
                    inningsEnded = true; 
                    matchCompleted = true; 
                    updatedStatus = 'Completed'; 
                    winnerTeamId = battingTeamId;
                    winnerTeamName = winnerTeamId;
                    try {
                        const [t1] = await connection.query('SELECT name FROM Teams WHERE team_id = ?', [winnerTeamId]);
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

        // --- Calculate MoM IF Match Completed --- // <<< INSERT THIS BLOCK
        if (matchCompleted) {
            console.log(`--- Match ${matchId} Completed. Calculating Man of the Match ---`);
            const [impactStats] = await connection.query(`
                SELECT player_id, team_id, (batting_impact_points + bowling_impact_points + fielding_impact_points) as total_impact
                FROM PlayerMatchStats WHERE match_id = ? ORDER BY total_impact DESC
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
            await connection.query("UPDATE Matches SET status = ?, winner_team_id = ?, result_summary = ?, man_of_the_match_player_id = ? WHERE match_id = ?",
                [updatedStatus, winnerTeamId, resultSummary, manOfTheMatchPlayerId, matchId]); // Added manOfTheMatchPlayerId
        }
        if (inningsEnded || matchCompleted) { await connection.query("UPDATE BallByBall SET commentary_text = ? WHERE ball_id = ?", [commentary.trim(), newBallId]); }
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
        const [lastBallArr] = await connection.query(`SELECT * FROM BallByBall WHERE match_id = ? ORDER BY ball_id DESC LIMIT 1 FOR UPDATE`, [matchId]);
        if (lastBallArr.length === 0) throw new Error('No balls recorded yet to undo.');
        const lastBall = lastBallArr[0];
        const { ball_id, inningNumber, over_number, bowler_player_id, batsman_on_strike_player_id, runs_scored, is_bye, is_extra, extra_type, extra_runs, is_wicket, wicket_type, fielder_player_id } = lastBall;
        const isExtra = is_extra;
        const extraType = extra_type;
        const extraRuns = extra_runs;
        const isWicket = is_wicket;
        const wicketType = wicket_type;
        const isBye = is_bye;
        console.log(`--- Undoing Ball ID: ${ball_id}, Inning: ${inningNumber}, Over: ${over_number} ---`);

        // 2. Fetch Match state & details
        const [matches] = await connection.query('SELECT status, team1_id, team2_id, toss_winner_team_id, decision, season_id, winner_team_id, result_summary, super_over_number FROM Matches WHERE match_id = ? FOR UPDATE', [matchId]);
        if (matches.length === 0) throw new Error('Match not found.');
        const match = matches[0];
        let currentStatus = match.status;
        if (!['Live', 'InningsBreak', 'Completed'].includes(currentStatus)) throw new Error(`Cannot undo ball. Match status is '${currentStatus}'.`);

        // Determine batting/bowling team
        let battingTeamId, bowlingTeamId;
        if (inningNumber == 1) { battingTeamId = (match.decision === 'Bat') ? match.toss_winner_team_id : (match.toss_winner_team_id == match.team1_id ? match.team2_id : match.team1_id); bowlingTeamId = (battingTeamId == match.team1_id) ? match.team2_id : match.team1_id; }
        else { bowlingTeamId = (match.decision === 'Bat') ? match.toss_winner_team_id : (match.toss_winner_team_id == match.team1_id ? match.team2_id : match.team1_id); battingTeamId = (bowlingTeamId == match.team1_id) ? match.team2_id : match.team1_id; }
        console.log(`--- Undo Context: Batting=${battingTeamId}, Bowling=${bowlingTeamId} ---`);

        // --- 3. Reverse PlayerMatchStats changes ---
        console.log(`--- Reverting Player Stats ---`);
        let isLegalDelivery = !(isExtra && extraType === 'Wide');
        let actualRunsOffBat = (!isBye && !isExtra) ? runs_scored : ((!isBye && isExtra && extraType === 'NoBall') ? runs_scored : 0);
        let isSuperOverBall = over_number === match.super_over_number;
        if (isSuperOverBall && !isExtra && !isBye && actualRunsOffBat > 0) actualRunsOffBat /= 2; // Revert double runs
        const runsForBowler = actualRunsOffBat + (parseInt(extraRuns) || 0);
        // Revert Batsman
        await connection.query(`UPDATE PlayerMatchStats SET runs_scored = GREATEST(0, runs_scored - ?), balls_faced = GREATEST(0, balls_faced - ?), fours = GREATEST(0, fours - ?), sixes = GREATEST(0, sixes - ?), is_out = IF(? = TRUE AND how_out = ?, FALSE, is_out), how_out = IF(? = TRUE AND how_out = ?, NULL, how_out) WHERE match_id = ? AND player_id = ?`, [actualRunsOffBat, isLegalDelivery ? 1 : 0, (runs_scored == 4 && !isExtra && !isBye) ? 1 : 0, (runs_scored == 6 && !isExtra && !isBye) ? 1 : 0, isWicket, wicketType, isWicket, wicketType, matchId, batsman_on_strike_player_id]);
        // Revert Bowler (using accurate reversal logic)
        const [bowlerStatsData] = await connection.query('SELECT overs_bowled FROM PlayerMatchStats WHERE match_id = ? AND player_id = ?', [matchId, bowler_player_id]);
        const currentOversDecimal = bowlerStatsData.length > 0 ? (bowlerStatsData[0].overs_bowled || 0) : 0;
        let previousOversDecimal = currentOversDecimal; if (isLegalDelivery && currentOversDecimal > 0) { const currentOvers = Math.floor(currentOversDecimal); const currentBalls = Math.round((currentOversDecimal - currentOvers) * 10); if (currentBalls === 1 && currentOvers > 0) { previousOversDecimal = parseFloat(`${currentOvers - 1}.5`); } else if (currentBalls > 0) { previousOversDecimal = parseFloat(`${currentOvers}.${currentBalls - 1}`); } else { /* Edge case 0.0 remains 0.0 */ previousOversDecimal = 0.0; } }
        await connection.query(`UPDATE PlayerMatchStats SET overs_bowled = ?, runs_conceded = GREATEST(0, runs_conceded - ?), wickets_taken = GREATEST(0, wickets_taken - ?), wides = GREATEST(0, wides - ?), no_balls = GREATEST(0, no_balls - ?) WHERE match_id = ? AND player_id = ?`, [Math.max(0, previousOversDecimal), runsForBowler, (isWicket && !['Run Out'].includes(wicketType)) ? 1 : 0, extraType === 'Wide' ? 1 : 0, extraType === 'NoBall' ? 1 : 0, matchId, bowler_player_id]);
        // Revert Fielder
        if (isWicket && fielder_player_id) { await connection.query(`UPDATE PlayerMatchStats SET catches = GREATEST(0, catches - ?), stumps = GREATEST(0, stumps - ?) WHERE match_id = ? AND player_id = ?`, [wicketType === 'Caught' ? 1 : 0, wicketType === 'Stumped' ? 1 : 0, matchId, fielder_player_id]); }
        console.log(`--- Player Stats Reverted ---`);

        
        // Calculate Impact Points to Reverse // <<< INSERT THIS BLOCK
        const impactPointsToReverse = calculateImpactPoints({ runs_scored: lastBall.runs_scored, is_extra: lastBall.is_extra, extra_type: lastBall.extra_type, extra_runs: lastBall.extra_runs, is_wicket: lastBall.is_wicket, wicket_type: lastBall.wicket_type, is_bye: lastBall.is_bye });
        console.log(`--- Reversing Impact: Bat=${impactPointsToReverse.batsman}, Bowl=${impactPointsToReverse.bowler}, Field=${impactPointsToReverse.fielder} ---`);

        // Revert Batsman: Subtract batting_impact_points
        await connection.query(`UPDATE PlayerMatchStats SET runs_scored = GREATEST(0, runs_scored - ?), balls_faced = GREATEST(0, balls_faced - ?), fours = GREATEST(0, fours - ?), sixes = GREATEST(0, sixes - ?), is_out = IF(? = TRUE AND how_out = ?, FALSE, is_out), how_out = IF(? = TRUE AND how_out = ?, NULL, how_out), batting_impact_points = batting_impact_points - ? WHERE match_id = ? AND player_id = ?`,
            [actualRunsOffBat, isLegalDelivery ? 1 : 0, (lastBall.runs_scored == 4 && !lastBall.is_extra && !lastBall.is_bye) ? 1 : 0, (lastBall.runs_scored == 6 && !lastBall.is_extra && !lastBall.is_bye) ? 1 : 0, lastBall.is_wicket, lastBall.wicket_type, lastBall.is_wicket, lastBall.wicket_type, impactPointsToReverse.batsman, matchId, lastBall.batsman_on_strike_player_id]); // Subtracted impact

        // Revert Bowler: Subtract bowling_impact_points
        // ... (calculate previousOversDecimal as before) ...
        await connection.query(`UPDATE PlayerMatchStats SET overs_bowled = ?, runs_conceded = GREATEST(0, runs_conceded - ?), wickets_taken = GREATEST(0, wickets_taken - ?), wides = GREATEST(0, wides - ?), no_balls = GREATEST(0, no_balls - ?), bowling_impact_points = bowling_impact_points - ? WHERE match_id = ? AND player_id = ?`,
            [Math.max(0, previousOversDecimal), runsForBowler, (lastBall.is_wicket && !['Run Out'].includes(lastBall.wicket_type)) ? 1 : 0, lastBall.extra_type === 'Wide' ? 1 : 0, lastBall.extra_type === 'NoBall' ? 1 : 0, impactPointsToReverse.bowler, matchId, lastBall.bowler_player_id]); // Subtracted impact

        // Revert Fielder: Subtract fielding_impact_points
        if (lastBall.is_wicket && fielder_player_id && impactPointsToReverse.fielder !== 0) {
            await connection.query(`UPDATE PlayerMatchStats SET catches = GREATEST(0, catches - ?), stumps = GREATEST(0, stumps - ?), fielding_impact_points = fielding_impact_points - ? WHERE match_id = ? AND player_id = ?`,
                [lastBall.wicket_type === 'Caught' ? 1 : 0, lastBall.wicket_type === 'Stumped' ? 1 : 0, impactPointsToReverse.fielder, matchId, fielder_player_id]); // Subtracted impact
        }

        // --- 4. Delete the last BallByBall record ---
        console.log(`--- Deleting Ball ID: ${ball_id} ---`);
        await connection.query("DELETE FROM BallByBall WHERE ball_id = ?", [ball_id]);

        // --- 5. Revert Match Status if necessary ---
        let newStatus = currentStatus; let revertStatus = false; const maxOvers = 5; const maxWickets = 5;
        const [prevProgressInfo] = await connection.query(`SELECT COUNT(*) as wickets_this_inning FROM PlayerMatchStats WHERE match_id = ? AND team_id = ? AND is_out = TRUE`, [matchId, battingTeamId]);
        const [prevOverProgress] = await pool.query(`SELECT over_number, COUNT(*) as legal_balls FROM BallByBall WHERE match_id = ? AND inning_number = ? AND (is_extra = false) GROUP BY over_number ORDER BY over_number DESC LIMIT 1`, [matchId, inningNumber]);
        const prevLastLegalOverNum = prevOverProgress[0]?.over_number || 0;
        const ballsInPrevLastLegalOver = prevOverProgress[0]?.legal_balls || 0;

        let prevInningsEndReason = null;
        if ((prevProgressInfo[0].wickets_this_inning || 0) >= maxWickets) {
            prevInningsEndReason = 'Wickets';
        }

        else if (prevLastLegalOverNum > maxOvers || (prevLastLegalOverNum === maxOvers && ballsInPrevLastLegalOver >= 6)) {
            prevInningsEndReason = 'Overs Completed';
        }

        if (currentStatus === 'InningsBreak' && inningNumber === 1 && !prevInningsEndReason) {
            revertStatus = true;
        }
        else if (currentStatus === 'Completed' && inningNumber === 2) {
            let wasTargetAchievedBefore = false;
            if (!prevInningsEndReason) { // Check target achievement only if innings didn't end for other reasons
                const [prevInn2ScoreData] = await connection.query(`SELECT SUM(runs_scored + extra_runs) as score FROM BallByBall WHERE match_id = ? AND inning_number = 2`, [matchId]); // Score AFTER deleting ball
                const prevInn2Score = prevInn2ScoreData[0]?.score || 0;
                const [inn1ScoreData] = await connection.query(`SELECT SUM(runs_scored + extra_runs) as score FROM BallByBall WHERE match_id = ? AND inning_number = 1`, [matchId]);
                const targetScore = Number((inn1ScoreData[0]?.score || 0)) + 1;
                wasTargetAchievedBefore = prevInn2Score >= targetScore;
            }
            if (!prevInningsEndReason && !wasTargetAchievedBefore) {
                revertStatus = true;
            }
        }

        //if (revertStatus) { newStatus = 'Live'; console.log(`--- Reverting Match Status from ${currentStatus} to Live ---`); await connection.query("UPDATE Matches SET status = 'Live', winner_team_id = NULL, result_summary = NULL, man_of_the_match_player_id = NULL WHERE match_id = ?", [matchId]); }

        if (revertStatus) {
            newStatus = 'Live'; console.log(`--- Reverting Match Status from ${currentStatus} to Live ---`);
            // set MoM to NULL as well
            await connection.query("UPDATE Matches SET status = 'Live', winner_team_id = NULL, result_summary = NULL, man_of_the_match_player_id = NULL WHERE match_id = ?", [matchId]);
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