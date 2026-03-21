// mpl-project/mpl-frontend/src/pages/admin/AdminLiveScoringPage.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import LoadingFallback from '../../components/LoadingFallback';
import ConfirmDialog from '../../components/ConfirmDialog';

// --- ScoreDisplay Component (Assume correct from previous versions) ---
const ScoreDisplay = ({ state }) => {
    if (!state) return <div style={{ border: '1px solid #eee', padding: '1rem', marginBottom: '1rem', backgroundColor: '#f9f9f9', borderRadius: '5px', color: '#1a1a1a' }}>Waiting for match state...</div>;
    const status = state.status;
    const battingTeamId = state.battingTeamId;
    const bowlingTeamId = state.bowlingTeamId;
    const battingTeamName = state.battingTeamName;
    const bowlingTeamName = state.bowlingTeamName;

    return (
         <div style={{ border: '1px solid #eee', padding: '1rem', marginBottom: '1rem', backgroundColor: '#f9f9f9', borderRadius: '5px', color: '#1a1a1a' }}>
            <p><strong>Status:</strong> <span style={{ fontWeight: 'bold', color: status === 'Live' ? '#c00' : 'inherit' }}>{status ?? 'Loading...'}</span></p>
            {['Setup', 'Live', 'InningsBreak', 'Completed'].includes(status) && battingTeamId && bowlingTeamId &&
              <p><strong>Batting:</strong> {battingTeamName} | <strong>Bowling:</strong> {bowlingTeamName}</p>
            }
            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0.5rem 0' }}>Score: {state.score ?? 0} / {state.wickets ?? 0}</p>
             <p style={{ fontSize: '1.2rem' }}>Overs: {(() => { const o = state.overs ?? 0; const b = state.balls ?? 0; if (o >= 5) return '5.0'; return `${o}.${b}`; })()} / 5.0</p>
             <p>Super Over: #{state.superOver ?? 'N/A'}</p>
             {state.target != null && state.inningNumber === 2 && <p><strong>Target: {state.target}</strong></p>}
             {state.lastBallCommentary && <p style={{ marginTop: '0.5rem', fontStyle: 'italic', borderTop: '1px dashed #ccc', paddingTop: '0.5rem' }}>{state.lastBallCommentary}</p>}
        </div>
    );
};


// --- RecentBalls Display (Assume correct from previous versions) ---
const RecentBalls = ({ summary }) => {
    if (!summary) return null;
    const balls = summary.split(', ').filter(b => b);
    return (
        <div style={{ marginTop: '10px', fontStyle: 'italic', color: '#555', fontSize:'0.9em' }}>
            Recent: {balls.length > 0 ? balls.join(' | ') : 'No balls recorded yet.'}
        </div>
    );
};

// --- Main Component ---
function AdminLiveScoringPage() {
    const { matchId } = useParams();
    const navigate = useNavigate();
    const { socket, isConnected, connectSocket, joinMatchRoom, leaveMatchRoom } = useSocket();

    const [matchState, setMatchState] = useState(null); // Will be populated by API fetch
    const [isLoading, setIsLoading] = useState(true); // Start loading true
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false); // For disabling buttons during API calls
    const hasJoinedRoom = useRef(false);

    // --- State for Scoring Inputs ---
    const [currentBowlerId, setCurrentBowlerId] = useState(null);
    const [currentBatsmanId, setCurrentBatsmanId] = useState(null);
    const [isWicketEvent, setIsWicketEvent] = useState(false);
    const [selectedWicketType, setSelectedWicketType] = useState('');
    const [selectedFielderId, setSelectedFielderId] = useState('');
    const [bonusFielderId, setBonusFielderId] = useState('');

    // --- State for Change Toss / Revert to Scheduled ---
    const [showTossModal, setShowTossModal] = useState(false);
    const [editTossWinnerTeamId, setEditTossWinnerTeamId] = useState('');
    const [editDecision, setEditDecision] = useState('');
    const [showRevertDialog, setShowRevertDialog] = useState(false);
    // --- Retire batter (after 12 legal balls per MPL rules) ---
    const [showRetireDialog, setShowRetireDialog] = useState(false);

    // --- Refs for comparing previous state ---
    const prevStateRef = useRef(null); // Initialize null
    useEffect(() => { prevStateRef.current = matchState; }, [matchState]);


    // --- Effect to Fetch Initial/Current Match State via API ---
    useEffect(() => {
        let isMounted = true;
        const fetchMatchState = async () => {
            if (!matchId) {
                if(isMounted) setError("No Match ID provided.");
                if(isMounted) setIsLoading(false);
                return;
            }
            // Reset state before fetching
            if (isMounted) setIsLoading(true);
            if (isMounted) setError('');
            if (isMounted) setMatchState(null); // Clear previous state
            hasJoinedRoom.current = false; // Reset room join status
            if (isMounted) setCurrentBowlerId(null); // Reset selections
            if (isMounted) setCurrentBatsmanId(null);
            if (isMounted) setIsWicketEvent(false);
            if (isMounted) setSelectedWicketType('');
            if (isMounted) setSelectedFielderId('');


            try {
                console.log(`AdminLiveScoring: Fetching state for match ${matchId} via API`);
                // Call the new backend endpoint
                const { data: fetchedState } = await api.get(`/admin/scoring/matches/${matchId}/state`);

                if (isMounted) {
                    console.log("AdminLiveScoring: Received state from API:", fetchedState);
                    if (!fetchedState || !fetchedState.status) {
                        throw new Error("Invalid state received from server.");
                    }
                     // Validate status - scoring page only makes sense for certain statuses
                     if (!['Setup', 'Live', 'InningsBreak', 'Completed'].includes(fetchedState.status)) {
                         setError(`Match status is '${fetchedState.status}'. Cannot initiate/resume scoring.`);
                         setMatchState(fetchedState); // Still set state for display purposes
                         setIsLoading(false);
                         return; // Don't proceed further (e.g., joining socket room for scoring)
                     }

                    setMatchState(fetchedState);
                    prevStateRef.current = fetchedState; // Initialize prev state ref
                }
            } catch (err) {
                console.error("AdminLiveScoring: Failed to fetch match state:", err);
                if (isMounted) {
                    const errorMsg = typeof err === 'string' ? err : (err.response?.data?.message || err.message || 'Failed to load match state.');
                    setError(errorMsg);
                    setMatchState(null); // Clear state on error
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchMatchState();

        return () => { isMounted = false; };
    }, [matchId]); // Fetch whenever matchId changes

    const refetchMatchState = useCallback(async () => {
        if (!matchId) return;
        try {
            const { data } = await api.get(`/admin/scoring/matches/${matchId}/state`);
            if (data) setMatchState(data);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to refresh state.');
        }
    }, [matchId]);

    // --- Auto-refresh when match is live: poll state so score and ball-by-ball update even if socket misses
    useEffect(() => {
        if (!matchId || !matchState || !['Live', 'InningsBreak'].includes(matchState.status)) return;
        const interval = setInterval(async () => {
            try {
                const { data } = await api.get(`/admin/scoring/matches/${matchId}/state`);
                if (data && data.matchId === parseInt(matchId)) setMatchState(data);
            } catch (_) { /* ignore */ }
        }, 5000); // every 5 seconds
        return () => clearInterval(interval);
    }, [matchId, matchState?.status]);


    // --- Effect to handle Socket Connection and State Updates ---
    useEffect(() => {
        // **Wait** until loading is complete AND we have a valid matchState with a scoreable status
        const scoreableStatuses = ['Setup', 'Live', 'InningsBreak'];
        if (!socket || !matchId || isLoading || !matchState || !scoreableStatuses.includes(matchState.status)) {
             console.log(`Socket Effect skipped: socket=${!!socket}, matchId=${matchId}, isLoading=${isLoading}, matchState=${!!matchState}, scoreableStatus=${scoreableStatuses.includes(matchState?.status)}`);
             // Cleanup function for when effect doesn't run or dependencies change triggering exit
             return () => {
                 if (socket && hasJoinedRoom.current) {
                    console.log(`Cleanup: Leaving room ${matchId} because component unmounted or state became invalid.`);
                    leaveMatchRoom(matchId);
                    hasJoinedRoom.current = false;
                 }
             }
        }

        const attemptJoinRoom = () => {
            if (isConnected && !hasJoinedRoom.current) {
                console.log(`---> Admin attempting to join room match_${matchId}`);
                joinMatchRoom(matchId);
                hasJoinedRoom.current = true;
            } else if (!isConnected) {
                 console.log("Socket not connected, cannot join room yet.");
            } else if (hasJoinedRoom.current) {
                console.log("Admin already joined room.");
            }
        };

        if (isConnected) {
            attemptJoinRoom();
        } else {
            console.log("Socket connecting...");
            connectSocket(); // Attempt connection if not already connected
        }

        // Define handlers
        const handleConnect = () => {
             console.log("Admin socket connected, attempting join...");
             attemptJoinRoom();
        };
        const handleUpdateScore = (newState) => {
            if (newState && newState.matchId === parseInt(matchId)) {
                console.log('Scorer received state update via Socket:', {score: newState.score, wickets: newState.wickets, overs: newState.overs, balls: newState.balls, status: newState.status});
                const oldState = prevStateRef.current; // Use ref for comparison
                const prevBallsCount = oldState?.balls ?? -1;
                const prevWicketCount = oldState?.wickets ?? 0;
                const oldStatus = oldState?.status;
                const prevOversCount = oldState?.overs ?? -1;

                // Update UI state FIRST - This triggers re-render
                setMatchState(newState);

                // Clear transient form states AFTER state update
                setError(''); // Clear previous errors on successful update
                setIsWicketEvent(false);
                setSelectedWicketType('');
                setSelectedFielderId('');

                // Logic to clear player selections based on state change
                const currentBallsCount = newState.balls ?? -1;
                const currentWicketCount = newState.wickets ?? 0;
                const currentOversCount = newState.overs ?? 0;

                 // Clear bowler if over genuinely completed (balls became 0 AND overs increased) OR innings break started
                 const overCompleted = (currentBallsCount === 0 && prevBallsCount >= 0 && currentOversCount > prevOversCount);
                 const inningsBreakStarted = (newState.status === 'InningsBreak' && oldStatus !== 'InningsBreak');
                if (overCompleted || inningsBreakStarted) {
                    console.log("Clearing bowler selection due to over complete or innings break.");
                    setCurrentBowlerId(null); // Clear bowler state
                }

                 // Clear batsman if wicket fell AND match didn't just end/break/setup
                 const wicketFell = currentWicketCount > prevWicketCount;
                 const shouldClearBatsman = wicketFell && !['Completed', 'InningsBreak', 'Setup'].includes(newState.status);
                 if (shouldClearBatsman) {
                    console.log("Clearing batsman selection due to wicket.");
                    setCurrentBatsmanId(null); // Clear batsman state
                }

            } else {
                 console.log(`Scorer received update for different match (${newState?.matchId}) or invalid data. Ignoring.`);
            }
        };
        const handleInningsBreak = (breakState) => { if (breakState && breakState.matchId === parseInt(matchId)) { console.log("Handling inningsBreak event"); setMatchState(prev => ({...prev, ...breakState})); prevStateRef.current = {...(prevStateRef.current || {}), ...breakState}; setCurrentBowlerId(null); setCurrentBatsmanId(null); }};
        const handleMatchEnded = (endState) => { if (endState && endState.matchId === parseInt(matchId)) { console.log("Handling matchEnded event"); setMatchState(prev => ({...prev, ...endState})); prevStateRef.current = {...(prevStateRef.current || {}), ...endState}; }};
        const handleScoringError = (errorMsg) => { console.error('Socket scoring error:', errorMsg); setError(`Scoring Error (Live): ${errorMsg.message || 'Unknown error'}`); };

        // Register listeners
        socket.on('connect', handleConnect);
        socket.on('updateScore', handleUpdateScore);
        socket.on('inningsBreak', handleInningsBreak);
        socket.on('matchEnded', handleMatchEnded);
        socket.on('scoringError', handleScoringError);

        // Component unmount cleanup
        return () => {
             console.log(`Admin scoring page unmounting/deps changing. Leaving room ${matchId}.`);
             if(socket && hasJoinedRoom.current) leaveMatchRoom(matchId);
             hasJoinedRoom.current = false;
             // Unregister listeners
             if(socket) {
                 socket.off('connect', handleConnect);
                 socket.off('updateScore', handleUpdateScore);
                 socket.off('inningsBreak', handleInningsBreak);
                 socket.off('matchEnded', handleMatchEnded);
                 socket.off('scoringError', handleScoringError);
             }
        };
    // Dependencies: Ensure all variables used inside effect are listed correctly
    }, [socket, isConnected, matchId, isLoading, matchState, connectSocket, joinMatchRoom, leaveMatchRoom]);


    // Next over number (1–5) for bowler eligibility: overs completed + 1
    const nextOverNumber = useMemo(() => Math.min(5, (matchState?.overs ?? 0) + 1), [matchState?.overs]);

    // --- Calculate Eligible Players ---
    /** Stable numeric id for Set / Map lookups (API may return string or number). */
    const numId = (id) => (id == null || id === '' ? NaN : Number(id));

    const eligibleBowlers = useMemo(() => {
        if (!matchState?.playersBowlingTeam) return [];
        const bowlerStatsMap = new Map(
            (matchState.bowlerStats || []).map((s) => [numId(s.player_id), s.completed_overs || 0])
        );
        const twoOverBowlerExists = matchState.bowlerStats?.some((s) => (s.completed_overs || 0) >= 2) || false;
        const twoOverBowlerId = twoOverBowlerExists
            ? numId(matchState.bowlerStats?.find((s) => (s.completed_overs || 0) >= 2)?.player_id)
            : null;
        const lastOverBowlerId = matchState?.lastOverBowlerId != null ? numId(matchState.lastOverBowlerId) : null;
        const bowlersByOver = matchState?.bowlersByOver || {};
        // Only exclude last-over bowler when the last ball completed an over (6 legal balls). After a wide/nb we may have 0 legal balls in current over but same bowler continues.
        const atStartOfNewOver = !!matchState?.nextBallStartsNewOver;
        return matchState.playersBowlingTeam.filter((player) => {
            const pid = numId(player.player_id);
            const completedOvers = bowlerStatsMap.get(pid) || 0;
            if (completedOvers >= 2) return false;
            if (completedOvers >= 1 && twoOverBowlerExists && pid !== twoOverBowlerId) return false;
            // Cannot bowl consecutive overs (only when selecting bowler for a new over, not mid-over)
            if (atStartOfNewOver && lastOverBowlerId !== null && lastOverBowlerId === pid) return false;
            // Over 5: cannot bowl if bowled over 4 or Super Over (per MPL rules)
            if (nextOverNumber === 5) {
                const bowledOver4 = (bowlersByOver[4] || []).map(numId).includes(pid);
                const superOver = matchState?.superOver ?? 1;
                const bowledSuperOver = (bowlersByOver[superOver] || []).map(numId).includes(pid);
                if (bowledOver4 || bowledSuperOver) return false;
            }
            // Overs 1–4: four different bowlers — exclude if already bowled any other of 1–4
            if (nextOverNumber >= 1 && nextOverNumber <= 4) {
                for (let o = 1; o <= 4; o++) {
                    if (o !== nextOverNumber && (bowlersByOver[o] || []).map(numId).includes(pid)) return false;
                }
            }
            return true;
        });
    }, [matchState?.playersBowlingTeam, matchState?.bowlerStats, matchState?.lastOverBowlerId, matchState?.nextBallStartsNewOver, matchState?.bowlersByOver, matchState?.superOver, nextOverNumber]);

    const availableBatsmen = useMemo(() => {
        if (!matchState?.playersBattingTeam) return [];
        const outIds = new Set((matchState.batsmenOutIds || []).map(numId).filter((n) => !Number.isNaN(n)));
        const retiredIds = new Set((matchState.batsmenRetiredIds || []).map(numId).filter((n) => !Number.isNaN(n)));
        const retirementOrder = (matchState?.retirementOrder || []).map(numId).filter((n) => !Number.isNaN(n));
        const notOut = matchState.playersBattingTeam.filter((p) => !outIds.has(numId(p.player_id)));
        // Before any ball in this innings: show everyone not out (ignore retirement — avoids bad/stale retired flags hiding squad)
        const beforeAnyBallInInnings = (matchState.ballsInCurrentInnings ?? 0) === 0;
        if (beforeAnyBallInInnings) return notOut;
        const nonRetiredNotOut = notOut.filter((p) => !retiredIds.has(numId(p.player_id)));
        const retiredNotOut = notOut.filter((p) => retiredIds.has(numId(p.player_id)));
        if (nonRetiredNotOut.length > 0) return nonRetiredNotOut;
        if (retiredNotOut.length > 0) {
            if (retirementOrder.length > 0) {
                return retirementOrder
                    .filter((id) => retiredIds.has(id))
                    .map((id) => matchState.playersBattingTeam.find((p) => numId(p.player_id) === id))
                    .filter(Boolean);
            }
            return retiredNotOut;
        }
        return [];
    }, [matchState?.playersBattingTeam, matchState?.batsmenOutIds, matchState?.batsmenRetiredIds, matchState?.retirementOrder, matchState?.ballsInCurrentInnings]);


    // --- Ball API Submission Handler ---
    const submitBallData = useCallback(async (ballDetails) => {
        setError('');
        if (!currentBowlerId) { setError("Please select the Bowler."); return; }
        if (!currentBatsmanId) { setError("Please select the batter."); return; }
        // Allow submission if Live OR Setup (to trigger start) OR InningsBreak (to trigger start)
        if (!matchState || !['Setup', 'Live', 'InningsBreak'].includes(matchState.status)) { setError(`Cannot score: Status is '${matchState?.status || 'Unknown'}'.`); return; }
        if (ballDetails.isWicket && !ballDetails.wicketType) { setError("Wicket Type missing."); return; }
        if (ballDetails.isExtra && !ballDetails.extraType) { setError("Extra Type missing."); return; }
        if (['Caught','Stumped'].includes(ballDetails.wicketType) && ballDetails.isWicket && !ballDetails.fielderPlayerId) { setError("Fielder needed for Caught/Stumped."); return; }

        setIsSubmitting(true);
        const payload = {
            inningNumber: matchState.status === 'InningsBreak' ? 2 : (matchState.inningNumber || 1),
            bowlerPlayerId: parseInt(currentBowlerId),
            batsmanOnStrikePlayerId: parseInt(currentBatsmanId),
            runsScored: ballDetails.runsScored ?? 0,
            isExtra: ballDetails.isExtra ?? false,
            extraType: ballDetails.extraType || null,
            extraRuns: ballDetails.extraRuns || 0,
            isWicket: ballDetails.isWicket ?? false,
            wicketType: ballDetails.wicketType || null,
            fielderPlayerId: ballDetails.fielderPlayerId ? parseInt(ballDetails.fielderPlayerId) : null,
            isBye: ballDetails.isBye ?? false,
        };
        console.log("Submitting Ball Data:", payload);
        try {
            await api.post(`/admin/scoring/matches/${matchId}/ball`, payload);
            setIsWicketEvent(false); setSelectedWicketType(''); setSelectedFielderId('');
            const { data: fetchedState } = await api.get(`/admin/scoring/matches/${matchId}/state`);
            if (!fetchedState || !fetchedState.status) {
                throw new Error("Invalid state received from server.");
            }
             // Validate status - scoring page only makes sense for certain statuses
             if (!['Setup', 'Live', 'InningsBreak', 'Completed'].includes(fetchedState.status)) {
                 setError(`Match status is '${fetchedState.status}'. Cannot initiate/resume scoring.`);
                 setMatchState(fetchedState); // Still set state for display purposes
                 setIsLoading(false);
                 return; // Don't proceed further (e.g., joining socket room for scoring)
             }

            setMatchState(fetchedState);
            if(payload.wicketType!==null){
                setCurrentBatsmanId(null)
            }
            prevStateRef.current = fetchedState; 
        } catch (err) {
            console.error("Error submitting ball:", err);
            const errorMsg = typeof err === 'string' ? err : (err?.message || 'Failed to score ball.');
            setError(errorMsg);
            alert(errorMsg)
        } finally {
            setIsSubmitting(false);
        }
    }, [matchState, matchId, currentBowlerId, currentBatsmanId]);

    // --- Retire batter: 12 legal deliveries (excludes wide/no-ball); balls_faced still includes NB for stats ---
    const strikerLegalBalls = useMemo(() => {
        if (!currentBatsmanId || !matchState?.batsmanStats) return 0;
        const s = matchState.batsmanStats.find(x => x.player_id === parseInt(currentBatsmanId, 10));
        if (s == null) return 0;
        return s.legal_balls_faced != null ? Number(s.legal_balls_faced) : Number(s.balls_faced || 0);
    }, [currentBatsmanId, matchState?.batsmanStats]);
    const strikerBallsFacedTotal = useMemo(() => {
        if (!currentBatsmanId || !matchState?.batsmanStats) return 0;
        return matchState.batsmanStats.find(s => s.player_id === parseInt(currentBatsmanId, 10))?.balls_faced ?? 0;
    }, [currentBatsmanId, matchState?.batsmanStats]);
    const isLastAvailableBatter = availableBatsmen.length === 1 && availableBatsmen[0]?.player_id === parseInt(currentBatsmanId, 10);
    const hasReturnedFromRetirement = (matchState?.batsmenRetiredIds || []).includes(parseInt(currentBatsmanId, 10));
    const canRetireBatter = matchState?.status === 'Live' && currentBatsmanId && strikerLegalBalls >= 12 && !isLastAvailableBatter && !hasReturnedFromRetirement;
    const handleRetireBatter = useCallback(async () => {
        if (!currentBatsmanId || !matchId) return;
        setError('');
        setIsSubmitting(true);
        try {
            await api.post(`/admin/scoring/matches/${matchId}/retire-batter`, { batsmanPlayerId: parseInt(currentBatsmanId, 10) });
            setShowRetireDialog(false);
            setCurrentBatsmanId(null);
            const { data } = await api.get(`/admin/scoring/matches/${matchId}/state`);
            if (data) setMatchState(data);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to retire batter.';
            setError(msg);
            setShowRetireDialog(false);
        } finally {
            setIsSubmitting(false);
        }
    }, [matchId, currentBatsmanId]);

    // --- Handlers for UI Controls ---
    const handleLegalBall = (runs) =>
        submitBallData({ runsScored: runs, isBye: false });
      
      const handleBye = (runs) =>
        submitBallData({ runsScored: runs, isBye: true });
      
      const handleWideClick = () =>
        submitBallData({
          isExtra: true,
          extraType: "Wide",
          extraRuns: 1,
          runsScored: 0,
          isBye: false,
        });
      
      const handleWideByeClick = (byes) =>
        submitBallData({
          isExtra: true,
          extraType: "Wide",
          extraRuns: 1,
          runsScored: byes,
          isBye: true,
        });
      
      const handleNoBallClick = (runs) =>
        submitBallData({
          isExtra: true,
          extraType: "NoBall",
          extraRuns: 1,
          runsScored: runs,
          isBye: false,
        });
      
      const handleNoBallByeClick = (byes) =>
        submitBallData({
          isExtra: true,
          extraType: "NoBall",
          extraRuns: 1,
          runsScored: byes,
          isBye: true,
        });
      
      const handleWicketConfirm = () => {
        if (!selectedWicketType) {
          setError("Wicket type needed");
          return;
        }
        if (
          ["Caught", "Stumped"].includes(selectedWicketType) &&
          !selectedFielderId
        ) {
          setError("Fielder needed");
          return;
        }
        submitBallData({
          isWicket: true,
          wicketType: selectedWicketType,
          fielderPlayerId: selectedFielderId,
          runsScored: 0,
          isBye: false,
          isExtra: false,
        });
      };
      
      const handleUndo = async () => {
        if (
          !matchState ||
          !["Live", "InningsBreak", "Completed"].includes(matchState.status)
        ) {
          setError("Cannot undo ball in current match state.");
          return;
        }
      
        /* Basic check - might still fail if DB is empty */
        if (
          matchState.score === 0 &&
          matchState.wickets === 0 &&
          matchState.overs === 0 &&
          matchState.balls === 0 &&
          matchState.inningNumber === 1 &&
          matchState.status !== "Completed"
        ) {
          setError("No balls seem to have been bowled yet to undo.");
          return;
        }
      
        if (!window.confirm("Are you sure you want to undo the last recorded ball?"))
          return;
        setError("");
        setIsSubmitting(true);
      
        try {
         await api.delete(`/admin/scoring/matches/${matchId}/ball/last`); 
          setIsWicketEvent(false);
          setSelectedWicketType('');
          setSelectedFielderId(''); 
          const { data: fetchedState } = await api.get(`/admin/scoring/matches/${matchId}/state`);
            if (!fetchedState || !fetchedState.status) {
                throw new Error("Invalid state received from server.");
            }
             // Validate status - scoring page only makes sense for certain statuses
             if (!['Setup', 'Live', 'InningsBreak', 'Completed'].includes(fetchedState.status)) {
                 setError(`Match status is '${fetchedState.status}'. Cannot initiate/resume scoring.`);
                 setMatchState(fetchedState); // Still set state for display purposes
                 setIsLoading(false);
                 return; // Don't proceed further (e.g., joining socket room for scoring)
             }

            setMatchState(fetchedState);
            prevStateRef.current = fetchedState; 
        } catch (err) { 
            console.error("Error undoing ball:", err); 
            const errorMsg = typeof err === 'string' ? err : (err.response?.data?.message || 'Failed to undo last ball.'); 
            setError(errorMsg); 
        } finally 
        { 
            setIsSubmitting(false); 
        } 
    };

    const noBallsBowledYet = matchState && (
        matchState.status === 'Setup' || (
            matchState.status === 'Live' &&
            (matchState.score ?? 0) === 0 &&
            (matchState.overs ?? 0) === 0 &&
            (matchState.balls ?? 0) === 0
        )
    );
    const canChangeTossOrRevert = !!noBallsBowledYet;

    const handleOpenTossModal = () => {
        setEditTossWinnerTeamId(String(matchState?.toss_winner_team_id ?? ''));
        setEditDecision(matchState?.decision ?? '');
        setShowTossModal(true);
        setError('');
    };

    const handleTossSubmit = async (e) => {
        e.preventDefault();
        if (!editTossWinnerTeamId || !editDecision) {
            setError('Select toss winner and decision.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            await api.patch(`/admin/scoring/matches/${matchId}/toss`, {
                toss_winner_team_id: parseInt(editTossWinnerTeamId),
                decision: editDecision,
            });
            setShowTossModal(false);
            await refetchMatchState();
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to update toss.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRevertConfirm = async () => {
        setShowRevertDialog(false);
        setIsSubmitting(true);
        setError('');
        try {
            await api.post(`/admin/scoring/matches/${matchId}/revert-to-scheduled`);
            navigate('/admin/scoring/setup');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to revert match.');
            setIsSubmitting(false);
        }
    };

    const handleFieldingBonus = async (bonusType) => {
        if (!matchId || !bonusFielderId) {
            setError('Select a fielder for the fielding bonus.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            const { data } = await api.post(`/admin/scoring/matches/${matchId}/fielding-bonus`, {
                fielder_player_id: parseInt(bonusFielderId, 10),
                bonus_type: bonusType,
            });
            if (data?.newState) setMatchState(data.newState);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to add fielding bonus.');
        } finally {
            setIsSubmitting(false);
        }
    };


    // --- Render Logic ---
    if (isLoading) return <LoadingFallback message="Loading match state..." />;
    if (error && !matchState) return <div><p className="error-message">{error}</p><button onClick={() => navigate('/admin/scoring/setup')}>Back to Setup List</button></div>;
    if (!matchState) return <div>Match data could not be loaded. Ensure the Match ID is correct and the match exists.</div>;

    const currentStatus = matchState.status;
    const isScoringPossible = ['Setup', 'Live', 'InningsBreak'].includes(currentStatus);
    // Corrected: Check if players are selected
    const selectionRequiredNow = isScoringPossible && (!currentBowlerId || !currentBatsmanId);
    // Disable all when submitting or no players; legal runs/byes blocked at 12 legal until retire (WD/NB still allowed)
    const controlsDisabled = isSubmitting || !currentBowlerId || !currentBatsmanId;
    const legalRunsBlocked = canRetireBatter;
    const showStatusMessageArea = ['InningsBreak', 'Completed', 'Abandoned'].includes(currentStatus); // Show message for these states

    // Styles
    const buttonGroupStyle = { marginBottom: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' };
    const buttonStyle = { minWidth: '55px', padding: '0.5em 0.8em', fontSize: '0.9rem'};
    const labelStyle = { fontWeight: 'bold', marginRight: '10px', minWidth: '80px', textAlign: 'right'};

    return (
        <div>
            <h2>Live Scoring — Match {matchId}</h2>
            <p style={{ marginTop: '0.25rem', marginBottom: '1rem' }}>
                <Link to="/admin/scoring/setup">← Back to Setup</Link>
            </p>
            {canChangeTossOrRevert && (
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button type="button" onClick={handleOpenTossModal} disabled={isSubmitting} style={{ padding: '0.4em 0.8em' }}>Change toss</button>
                    <button type="button" onClick={() => setShowRevertDialog(true)} disabled={isSubmitting} style={{ padding: '0.4em 0.8em', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px' }}>Revert to Scheduled</button>
                </div>
            )}
            {error && <p className="error-message">{error}</p>}
            <ScoreDisplay state={matchState} />

            {/* Player Selection Area */}
            {isScoringPossible && (
                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', margin: '1rem 0', padding: '1rem', border: '1px solid #eee', borderRadius: '5px', backgroundColor: selectionRequiredNow ? '#fffadf' : 'transparent', color: selectionRequiredNow ? '#1a1a1a' : 'var(--mpl-text)' }}>
                     {/* Bowler Select */}
                     <div><label htmlFor="bowler-select">{currentStatus === 'InningsBreak' ? 'Opening Bowler (Inn 2):*' : (currentStatus === 'Setup' ? 'Select Opening Bowler:*' : 'Current Bowler:*')}</label><br/><select id="bowler-select" value={currentBowlerId} onChange={(e) => setCurrentBowlerId(e.target.value)} disabled={isSubmitting || (currentStatus === 'Live' && matchState.balls !== 0 && currentBowlerId)} style={{borderColor: selectionRequiredNow && !currentBowlerId ? 'orange' : 'initial', minWidth: '150px'}}> <option value="">-- Select --</option> {eligibleBowlers.map(p => <option key={`bowl-${p.player_id}`} value={p.player_id}>{p.name}</option>)} </select>{selectionRequiredNow && !currentBowlerId && <span style={{color: 'orange', marginLeft: '5px', fontWeight:'bold'}}>☜ Required!</span>}{currentBowlerId && currentStatus === 'Live' && <span style={{fontSize: '0.8em', marginLeft: '5px'}}>({matchState?.bowlerStats?.find(b=>b.player_id == currentBowlerId)?.completed_overs || 0}/ {matchState?.bowlerStats?.some(b=>b.completed_overs >= 2 && b.player_id != currentBowlerId) ? '1' : '2'} ov)</span>}</div>
                     {/* Batter select */}
                     <div><label htmlFor="batsman-select">{currentStatus === 'InningsBreak' ? 'Opening batter (Inn 2):*' : (currentStatus === 'Setup' ? 'Select opening batter:*' : 'Batter on strike:*')}</label><br/><select id="batsman-select" value={currentBatsmanId} onChange={(e) => setCurrentBatsmanId(e.target.value)} disabled={isSubmitting} style={{borderColor: selectionRequiredNow && !currentBatsmanId ? 'red' : 'initial', minWidth: '150px'}}> <option value="">-- Select --</option> {availableBatsmen.map(p => <option key={`bat-${p.player_id}`} value={p.player_id}>{p.name}</option>)} </select>{selectionRequiredNow && !currentBatsmanId && <span style={{color: 'red', marginLeft: '5px', fontWeight:'bold'}}>☜ Required!</span>}{currentBatsmanId && currentStatus === 'Live' && <span style={{fontSize: '0.8em', marginLeft: '5px'}}>({strikerLegalBalls} legal{strikerBallsFacedTotal !== strikerLegalBalls ? `, ${strikerBallsFacedTotal} balls faced` : ''})</span>}{canRetireBatter && <><span style={{marginLeft: '8px'}} /><button type="button" onClick={() => setShowRetireDialog(true)} disabled={isSubmitting} style={{padding: '0.35em 0.6em', fontSize: '0.85rem', backgroundColor: '#856404', color: '#fff', border: 'none', borderRadius: '4px'}}>Retire batter</button></>}</div>
                 </div>
            )}

            {/* Scoring Controls Container (Rendered if scoring is possible: Setup, Live, InningsBreak) */}
            {isScoringPossible ? (
               <div style={{ border: '1px solid #ccc', padding: '1rem', marginTop: '1rem', borderRadius: '5px', color: 'var(--mpl-text)' }}>
                    <h4>Record Ball Event</h4>
                    {/* Fieldset handles disabling based on CORRECTED controlsDisabled */}
                    <fieldset disabled={controlsDisabled}>
                        <legend style={{fontWeight: 'bold', color: selectionRequiredNow ? 'var(--mpl-danger)' : canRetireBatter ? 'var(--mpl-heading)' : 'var(--mpl-text)'}}>
                            {selectionRequiredNow ? 'Select Players Above!' : canRetireBatter ? 'Retire batter (12 legal deliveries) before more legal balls — wides/no-balls still allowed.' : 'Choose Event:'}
                        </legend>
                        {/* Buttons are only rendered *inside* the fieldset if players ARE selected */}
                        {!selectionRequiredNow && ( <> {/* Legal Runs / Byes — blocked at 12 legal until retire */} <div style={buttonGroupStyle}> <span style={labelStyle}>Runs/Byes:</span> {[0, 1, 2, 4].map(r => (<button type="button" key={`run-${r}`} onClick={() => handleLegalBall(r)} disabled={legalRunsBlocked} style={buttonStyle}>{r}</button>))} <button type="button" key="bye-1" onClick={() => handleBye(1)} disabled={legalRunsBlocked} style={buttonStyle}>1b</button> </div> {/* Extras — still allowed after 12 legal */} <div style={buttonGroupStyle}> <span style={labelStyle}>Extras:</span> <button type="button" onClick={handleWideClick} style={buttonStyle}>WD</button> <button type="button" onClick={() => handleWideByeClick(1)} style={buttonStyle}>WD+1b</button> <button type="button" onClick={() => handleNoBallClick(0)} style={buttonStyle}>NB+0</button> <button type="button" onClick={() => handleNoBallByeClick(1)} style={buttonStyle}>NB+1b</button> {[1, 2, 4].map(r => (<button type="button" key={`nb-${r}`} onClick={() => handleNoBallClick(r)} style={buttonStyle}>NB+{r}</button>))} </div> {/* Wicket Toggle & Details */} <div style={{ margin: '1rem 0' }}> <button type="button" onClick={() => setIsWicketEvent(!isWicketEvent)} disabled={legalRunsBlocked} style={{backgroundColor: isWicketEvent ? '#d1ecf1' : '#ffc107', marginRight: '1rem', padding: '0.5em 1em'}}>{isWicketEvent ? 'Cancel Wicket' : 'Record Wicket'}</button> {isWicketEvent && ( <div style={{border: '1px dashed gray', padding: '1rem', marginTop: '0.5rem', display: 'inline-block', verticalAlign: 'top'}}> <label htmlFor="wicket-type">Type:* </label> <select id="wicket-type" value={selectedWicketType} onChange={e => {setSelectedWicketType(e.target.value); if(!['Caught', 'Stumped'].includes(e.target.value)) setSelectedFielderId('');}}> <option value="">--Select--</option> <option value="Bowled">Bowled</option><option value="Caught">Caught</option><option value="Stumped">Stumped</option><option value="Hit Outside">Hit Outside</option><option value="Hit Wicket">Hit Wicket</option> </select> {(selectedWicketType === 'Caught' || selectedWicketType === 'Stumped') && ( <div style={{marginTop: '0.5rem'}}> <label htmlFor="fielder-select">Fielder:* </label> <select id="fielder-select" value={selectedFielderId} onChange={e => setSelectedFielderId(e.target.value)}> <option value="">--Select Fielder--</option> {matchState?.playersBowlingTeam?.map(p => <option key={`field-${p.player_id}`} value={p.player_id}>{p.name}</option>)} </select> </div> )} <button type="button" onClick={handleWicketConfirm} disabled={!selectedWicketType || (['Caught','Stumped'].includes(selectedWicketType) && !selectedFielderId)} style={{backgroundColor: '#dc3545', marginTop: '1rem'}}>Confirm Wicket</button> </div> )} </div> </> )}
                    </fieldset>
                    {isSubmitting && <LoadingFallback message="Submitting..." />}
                    {currentStatus === 'Live' && (
                        <div
                            style={{
                                marginTop: '1.25rem',
                                padding: '1rem',
                                border: '1px dashed var(--mpl-border)',
                                borderRadius: '8px',
                                backgroundColor: 'var(--mpl-surface)',
                            }}
                        >
                            <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--mpl-text)' }}>Fielding impact (manual)</h4>
                            <p style={{ fontSize: '0.88rem', color: 'var(--mpl-text-muted)', marginTop: 0, marginBottom: '0.75rem' }}>
                                Applies to the <strong>last completed ball</strong> (extra +2/+1/−1/−2 on top of normal ball impact, e.g. +5 for a catch). Choose a <strong>bowling-team</strong> fielder, then an action — commentary is appended to that ball. Does not add a delivery. One adjustment per ball; if you miss timing, skip it.
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                                <label htmlFor="bonus-fielder-select" style={{ fontWeight: 600 }}>Fielder (bowling team):</label>
                                <select
                                    id="bonus-fielder-select"
                                    value={bonusFielderId}
                                    onChange={(e) => setBonusFielderId(e.target.value)}
                                    disabled={isSubmitting}
                                    style={{ minWidth: '200px' }}
                                >
                                    <option value="">-- Select fielder --</option>
                                    {(matchState?.playersBowlingTeam || []).map((p) => (
                                        <option key={`bonus-f-${p.player_id}`} value={p.player_id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem' }}>
                                <button
                                    type="button"
                                    onClick={() => handleFieldingBonus('good_catch')}
                                    disabled={isSubmitting || !bonusFielderId}
                                    style={{ padding: '0.45em 0.85em', backgroundColor: '#0d6efd', color: '#fff', border: 'none', borderRadius: '6px' }}
                                >
                                    Good catch (+2)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleFieldingBonus('good_stop')}
                                    disabled={isSubmitting || !bonusFielderId}
                                    style={{ padding: '0.45em 0.85em', backgroundColor: '#198754', color: '#fff', border: 'none', borderRadius: '6px' }}
                                >
                                    Good stop (+1)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleFieldingBonus('misfield')}
                                    disabled={isSubmitting || !bonusFielderId}
                                    style={{ padding: '0.45em 0.85em', backgroundColor: '#fd7e14', color: '#fff', border: 'none', borderRadius: '6px' }}
                                >
                                    Misfield (−1)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleFieldingBonus('catch_drop')}
                                    disabled={isSubmitting || !bonusFielderId}
                                    style={{ padding: '0.45em 0.85em', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px' }}
                                >
                                    Catch drop (−2)
                                </button>
                            </div>
                        </div>
                    )}
                    {/* Undo Button */}
                    {(currentStatus === 'Live' || currentStatus === 'InningsBreak' || currentStatus === 'Completed') && (
                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #ccc' }}>
                            <button type="button" onClick={handleUndo} disabled={isSubmitting} style={{backgroundColor: '#6c757d'}}>Undo Last Ball</button>
                        </div>
                    )}
                    <RecentBalls summary={matchState?.recentBallsSummary} />
               </div>
            ) : ( // Handle ONLY non-scoreable states like Completed, Abandoned, Scheduled
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
                    <p><strong>
                        {currentStatus === 'Completed' ? `Match Completed. ${matchState.resultSummary || ''}` :
                         currentStatus === 'Abandoned' ? 'Match Abandoned.' :
                         currentStatus === 'Scheduled' ? 'Match is Scheduled. Go to Setup page.' :
                         `Scoring inactive (Status: ${currentStatus}).`}
                    </strong></p>
                     {currentStatus === 'Completed' && <button onClick={() => navigate(`/matches/${matchId}`)}>View Final Scorecard</button>}
                     {currentStatus !== 'Completed' && <button onClick={() => navigate('/admin/scoring/setup')}>Back to Setup List</button>}
                </div>
            )}

            {showTossModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => !isSubmitting && setShowTossModal(false)}>
                    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', minWidth: '280px' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>Change toss</h3>
                        <form onSubmit={handleTossSubmit}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label htmlFor="edit-toss-winner">Toss winner: </label>
                                <select id="edit-toss-winner" value={editTossWinnerTeamId} onChange={e => setEditTossWinnerTeamId(e.target.value)} required style={{ minWidth: '180px' }}>
                                    <option value="">-- Select --</option>
                                    {matchState?.team1_id != null && <option value={matchState.team1_id}>{matchState.team1_name}</option>}
                                    {matchState?.team2_id != null && <option value={matchState.team2_id}>{matchState.team2_name}</option>}
                                </select>
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label htmlFor="edit-decision">Decision: </label>
                                <select id="edit-decision" value={editDecision} onChange={e => setEditDecision(e.target.value)} required style={{ minWidth: '120px' }}>
                                    <option value="">-- Select --</option>
                                    <option value="Bat">Bat</option>
                                    <option value="Bowl">Bowl</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setShowTossModal(false)} disabled={isSubmitting}>Cancel</button>
                                <button type="submit" disabled={isSubmitting}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={showRevertDialog}
                title="Revert to Scheduled"
                message="Put this match back to Scheduled? You can run setup again from the Setup page."
                confirmLabel="Revert to Scheduled"
                cancelLabel="Cancel"
                variant="danger"
                onConfirm={handleRevertConfirm}
                onCancel={() => setShowRevertDialog(false)}
            />
            <ConfirmDialog
                open={showRetireDialog}
                title="Retire batter"
                message="Retire this batter (after 12 legal balls per MPL rules)? They can return in retirement order if all other wickets fall."
                confirmLabel="Retire"
                cancelLabel="Cancel"
                variant="warning"
                onConfirm={handleRetireBatter}
                onCancel={() => setShowRetireDialog(false)}
            />
        </div>
    );
}

export default AdminLiveScoringPage;