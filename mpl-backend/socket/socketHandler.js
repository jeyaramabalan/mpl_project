// mpl-project/mpl-backend/socket/socketHandler.js
const pool = require('../config/db');

// WARNING: In-memory store is simple for development but NOT suitable for production.
// Consider Redis or another external store for managing live match states.
let liveMatchesState = {};
// Structure Example (Will be updated by backend API emits now):
// liveMatchesState = {
//   "match_1": { // Keyed by matchId
//     matchId: 1, seasonId: 1, status: 'Live', innings: 1, score: 45, wickets: 1, overs: 4, balls: 6, // Note: overs/balls represent *completed*
//     battingTeamId: 1, bowlingTeamId: 2, superOver: 3, target: null,
//     playersBattingTeam: [{player_id: 101, name: 'Rohit Sharma'}, ...],
//     playersBowlingTeam: [{player_id: 102, name: 'Virat Kohli'}, ...],
//     batsmanStrike: { id: 101, name: 'Rohit Sharma', runs: 35, balls: 20 }, // Might be simplified or part of players list
//     bowler: { id: 110, name: 'Yuzvendra Chahal', oversDecimal: 0.0, runs: 8, wickets: 0 }, // Simplified
//     lastEvent: "Ball 4.6: WICKET! Caught (Hit Six). Innings End.",
//     lastBallCommentary: "Over 4.6: Chahal to Rohit Sharma, WICKET! Caught by Kohli (Hit Six!)", // From BallByBall table via backend emit
//     recentCommentary: ["Over 4.6: ...", "Over 4.5: ..."] // Array of recent commentary strings
//   },
//   ...
// }


function initializeSocket(io) {
    console.log('[Socket Handler] Initialized and Ready for connections.');

    io.on('connection', (socket) => {
        console.log(`[Socket Connect] New connection. ID: ${socket.id}`);

        // --- Room Management ---
        socket.on('joinMatchRoom', (matchId) => {
            if (!matchId) {
                console.warn(`[Socket Join] Invalid matchId received from ${socket.id}`);
                return;
            }
            const roomName = `match_${matchId}`;
            socket.join(roomName);
            console.log(`[Socket Join] ${socket.id} joined room: ${roomName}`);

            // Send the current cached state of the match *to the user who just joined*
            if (liveMatchesState[matchId]) {
                socket.emit('updateScore', liveMatchesState[matchId]); // Send the last known full state
                console.log(`[Socket State] Sent cached state of match ${matchId} to ${socket.id}`);
            } else {
                 console.log(`[Socket State] No cached state found for match ${matchId} to send on join.`);
                 // The client might fetch initial state via HTTP if needed
                 // socket.emit('matchStateUnavailable', { matchId: matchId, message: "Match is not currently live or state unavailable." });
            }
        });

        socket.on('leaveMatchRoom', (matchId) => {
             if (!matchId) {
                 console.warn(`[Socket Leave] Invalid matchId received from ${socket.id}`);
                 return;
             }
            const roomName = `match_${matchId}`;
            socket.leave(roomName);
            console.log(`[Socket Leave] ${socket.id} left room: ${roomName}`);
        });


        // --- Match Lifecycle Actions ---

        // Event triggered by admin scorer UI when Match Setup is confirmed and scoring should begin
        // The 'initialState' comes from the successful response of the '/setup' API call
        socket.on('startMatchScoring', (matchId, initialState) => {
            if (!matchId || !initialState) {
                console.error(`[Socket Start] Invalid startMatchScoring event data received from ${socket.id}`);
                socket.emit('scoringError', { message: 'Invalid data for starting match.' });
                return;
            }
            // Basic validation of initialState structure
            if (!initialState.playersBattingTeam || !initialState.playersBowlingTeam || initialState.superOver == null) {
                 console.error(`[Socket Start] Incomplete initialState received for match ${matchId}`);
                 socket.emit('scoringError', { message: 'Incomplete initial state received.' });
                 return;
            }

            console.log(`[Socket Start] Initializing live state for Match ${matchId} requested by ${socket.id}`);

            // Initialize or overwrite the live state in memory
            // This state will be updated by 'updateScore' events triggered by the backend API
            liveMatchesState[matchId] = {
                ...initialState, // Contains teams, players, superOver etc. from setup API response
                status: 'Live', // Explicitly set status to Live
                score: 0,
                wickets: 0,
                overs: 0, // Completed overs
                balls: 0, // Balls in current over (starts at 0 before first ball)
                inningNumber: 1, // Assume starting first innings
                target: null, // Target will be set after first innings if applicable
                batsmanStrike: null, // Needs assignment via Admin UI
                batsmanNonStrike: null, // N/A for single batsman format
                bowler: null, // Needs assignment via Admin UI
                lastEvent: 'Match scoring started! Select opening players.',
                lastBallCommentary: null, // Will be updated by backend
                recentCommentary: [], // Initialize empty array for recent commentary
            };

            // Broadcast to everyone in the room that the match is now live with its initial state
            const roomName = `match_${matchId}`;
            io.to(roomName).emit('matchLive', liveMatchesState[matchId]); // Signal the match is officially live
            io.to(roomName).emit('updateScore', liveMatchesState[matchId]); // Send the initial full state
            console.log(`[Socket Start] Match ${matchId} initialized to Live state. State broadcasted.`);
        });


        // --- IMPORTANT: 'scoreBall' listener is REMOVED ---
        // The logic for processing a ball, updating the database (BallByBall, PlayerMatchStats),
        // calculating the new state, and determining end of over/innings/match
        // now resides in the backend HTTP endpoint controller: `controllers/admin/scoringController.js -> scoreSingleBall`.
        // That controller function, AFTER successfully committing database changes,
        // should retrieve the updated state and emit an 'updateScore' event using `req.app.get('io')`.
        // This socket handler now primarily *listens* for those 'updateScore' events broadcasted by the backend API.

        // Optional: You might add listeners here for *other* events emitted by the backend controller,
        // for example, if you wanted a specific 'inningsEnded' or 'matchEnded' event.
        // socket.on('inningsEnded', (data) => { ... });
        // socket.on('matchEnded', (data) => { ... });


        // --- Disconnect Handling ---
        socket.on('disconnect', (reason) => {
            console.log(`[Socket Disconnect] ID: ${socket.id}, Reason: ${reason}`);
            // No specific cleanup needed for liveMatchesState here unless tracking individual user sessions
        });

        // --- Connection Error Handling ---
        socket.on('connect_error', (err) => {
            console.error(`[Socket Connect Error] ID: ${socket.id}, Error: ${err.message}`);
        });

    }); // End of io.on('connection')
}

// This function is called from server.js to attach the handler to the Socket.IO server instance
module.exports = initializeSocket;