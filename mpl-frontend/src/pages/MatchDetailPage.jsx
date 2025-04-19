// mpl-project/mpl-frontend/src/pages/MatchDetailPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import LoadingFallback from '../components/LoadingFallback';

// --- Reusable Score Display Component (Keep as is or enhance) ---
const ScoreDisplay = ({ state, matchDetails }) => {
    if (!state && !matchDetails) return <p>Loading score display...</p>;

    const displayData = state || matchDetails; // Prioritize live state
    const status = displayData?.status;

    if (!status) return <p>Waiting for match status...</p>;

    const getPlayerName = (playerId, playersList) => playersList?.find(p => p.player_id === parseInt(playerId))?.name || `ID: ${playerId}`;

    // Determine team names (handle case where team player lists might not be in live state)
    const team1Name = matchDetails?.team1_name || `Team ${displayData?.team1_id || '1'}`;
    const team2Name = matchDetails?.team2_name || `Team ${displayData?.team2_id || '2'}`;
    const battingTeamName = displayData?.battingTeamId === matchDetails?.team1_id ? team1Name : (displayData?.battingTeamId === matchDetails?.team2_id ? team2Name : `Team ${displayData?.battingTeamId || '?'}`);
    const bowlingTeamName = displayData?.bowlingTeamId === matchDetails?.team1_id ? team1Name : (displayData?.bowlingTeamId === matchDetails?.team2_id ? team2Name : `Team ${displayData?.bowlingTeamId || '?'}`);


    return (
         <div style={{ border: '1px solid #eee', padding: '1rem', marginBottom: '1rem', backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
            {(status === 'Live' || status === 'InningsBreak') && <p><strong>Batting:</strong> {battingTeamName} | <strong>Bowling:</strong> {bowlingTeamName}</p>}
            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
                 Score: {displayData?.score ?? 'N/A'} / {displayData?.wickets ?? 'N/A'}
            </p>
             <p style={{ fontSize: '1.2rem' }}>
                Overs: {displayData?.overs ?? 'N/A'}.{displayData?.balls ?? 'N/A'} / 5.0
             </p>
             {displayData?.target && displayData?.inningNumber === 2 && <p><strong>Target: {displayData.target}</strong></p>}
             {/* Display LATEST commentary event from the live state */}
             {displayData?.lastBallCommentary && <p style={{ marginTop: '0.5rem', fontStyle: 'italic', borderTop: '1px dashed #ccc', paddingTop: '0.5rem' }}>{displayData.lastBallCommentary}</p>}
        </div>
    );
};

// --- Reusable Stats Table (Keep as is or enhance) ---
const StatsTable = ({ statsArray, teamName }) => {
    if (!statsArray || statsArray.length === 0) return <p>No detailed stats available for {teamName}.</p>;
    return (
        <>
        <h4>{teamName} Scorecard</h4>
        <table>
            <thead>
                <tr>
                    <th>Player</th><th>How Out</th><th>Runs</th><th>Balls</th><th>4s</th><th>Overs</th><th>Runs Con.</th><th>Wkts</th><th>Catches</th>
                </tr>
            </thead>
            <tbody>
                {statsArray.map(stat => (
                    <tr key={`${stat.player_id}-${stat.match_id}-${stat.team_id}`}>
                        <td>{stat.player_name}</td>
                        <td>{stat.is_out ? (stat.how_out || 'Out') : 'Not Out'}</td>
                        <td>{stat.runs_scored ?? 0}</td><td>{stat.balls_faced ?? 0}</td><td>{stat.fours ?? 0}</td>
                        <td>{stat.overs_bowled ? parseFloat(stat.overs_bowled).toFixed(1) : '-'}</td>
                        <td>{stat.runs_conceded ?? '-'}</td><td>{stat.wickets_taken ?? '-'}</td><td>{stat.catches ?? 0}</td>
                    </tr>
                ))}
            </tbody>
        </table>
        </>
    );
};


// --- Main Component ---
function MatchDetailPage() {
    const { matchId } = useParams();
    const { socket, isConnected, connectSocket, joinMatchRoom, leaveMatchRoom } = useSocket();

    const [matchDetails, setMatchDetails] = useState(null); // Base details + final stats (from API)
    const [liveScoreState, setLiveScoreState] = useState(null); // Latest overall state (from Socket)
    const [commentary, setCommentary] = useState([]); // Ball-by-ball log
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const hasJoinedRoom = useRef(false);
    const commentaryContainerRef = useRef(null); // Ref for scrolling commentary

    // --- Fetch initial match details AND historical commentary ---
    useEffect(() => {
        let isMounted = true;
        const fetchMatchData = async () => {
            if (!matchId) return;
            setLoading(true); setError(''); setLiveScoreState(null); setCommentary([]); hasJoinedRoom.current = false;
            console.log(`Viewer: Fetching initial data for match ${matchId}`);

            try {
                const [detailsRes, commentaryRes] = await Promise.all([
                     api.get(`/matches/${matchId}`),
                     api.get(`/matches/${matchId}/commentary`).catch(() => ({ data: [] })) // Fetch historical commentary
                ]);

                if (isMounted) {
                    const matchData = detailsRes.data;
                    setMatchDetails(matchData);
                    // Set initial commentary list (API returns oldest first, reverse for display newest first)
                    setCommentary(commentaryRes.data?.reverse() || []);

                    // Set initial display state
                    if (matchData.status === 'Completed') {
                         console.log("Viewer: Setting state from completed match data (API)");
                         setLiveScoreState(matchData); // Use full completed data
                    } else if (matchData.status === 'Live' || matchData.status === 'Setup' || matchData.status === 'InningsBreak') {
                        console.log(`Viewer: Match status from API: ${matchData.status}. Waiting for live socket state.`);
                        // Set a base state, socket will overwrite with live details
                        setLiveScoreState({
                            status: matchData.status,
                            score: 0, wickets: 0, overs: 0, balls: 0, inningNumber: 1,
                            matchId: parseInt(matchId), superOver: matchData.super_over_number,
                            battingTeamId: null, bowlingTeamId: null, // Socket should provide these
                            lastBallCommentary: 'Waiting for live updates...'
                        });
                    } else {
                         // Scheduled status
                         setLiveScoreState({ status: matchData.status });
                    }
                }
            } catch (err) {
                 console.error("Viewer: Failed to fetch match data:", err);
                 if (isMounted) setError(typeof err === 'string' ? err : 'Failed to load match data.');
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchMatchData();

        return () => { isMounted = false; }; // Cleanup flag
    }, [matchId]); // Refetch only if matchId changes


    // --- Socket Connection and Event Handling ---
    useEffect(() => {
        if (!socket || !matchId || matchDetails?.status === 'Completed' || matchDetails?.status === 'Abandoned') return;

        const attemptJoinRoom = () => {
            if (isConnected && !hasJoinedRoom.current) {
                console.log(`Viewer joining room ${matchId}`);
                joinMatchRoom(matchId);
                hasJoinedRoom.current = true;
            }
        };

        if (isConnected) attemptJoinRoom();
        else connectSocket();

        const handleConnect = () => attemptJoinRoom();
        const handleUpdateScore = (newState) => {
            if (newState && newState.matchId === parseInt(matchId)) {
                console.log('Viewer received score update via socket:', newState);
                setLiveScoreState(newState); // Update main display state

                // Prepend latest commentary if available and different from the last one shown
                if (newState.lastBallCommentary && (!commentary.length || commentary[0]?.commentary_text !== newState.lastBallCommentary)) {
                    setCommentary(prevComm => [
                        { ball_id: `live-${Date.now()}-${Math.random()}`, commentary_text: newState.lastBallCommentary }, // Temporary unique key for live updates
                        ...prevComm
                    ].slice(0, 100)); // Limit commentary history in state to prevent memory issues
                }
            }
        };
        const handleMatchLive = (liveState) => { if (liveState && liveState.matchId === parseInt(matchId)) setLiveScoreState(liveState); };
        const handleInningsBreak = (breakState) => { if (breakState && breakState.matchId === parseInt(matchId)) setLiveScoreState(prev => ({...prev, ...breakState})); };
        const handleMatchEnded = (endState) => { if (endState && endState.matchId === parseInt(matchId)) setLiveScoreState(prev => ({...prev, ...endState})); };


        socket.on('connect', handleConnect);
        socket.on('updateScore', handleUpdateScore);
        socket.on('matchLive', handleMatchLive);
        socket.on('inningsBreak', handleInningsBreak); // Listen for specific event
        socket.on('matchEnded', handleMatchEnded);     // Listen for specific event

        // Component unmount cleanup
        return () => {
            console.log(`Viewer leaving room ${matchId} on unmount/dependency change.`);
             if(hasJoinedRoom.current) leaveMatchRoom(matchId);
             hasJoinedRoom.current = false;
             socket.off('connect', handleConnect);
             socket.off('updateScore', handleUpdateScore);
             socket.off('matchLive', handleMatchLive);
             socket.off('inningsBreak', handleInningsBreak);
             socket.off('matchEnded', handleMatchEnded);
        };
    }, [socket, isConnected, matchId, matchDetails, connectSocket, joinMatchRoom, leaveMatchRoom, commentary]); // Added commentary to deps


    // --- Auto-scroll Commentary ---
    useEffect(() => {
        if (commentaryContainerRef.current) {
            // Scroll to the top when new commentary is added
            commentaryContainerRef.current.scrollTop = 0;
        }
    }, [commentary]); // Run when commentary state changes


    // --- Render Logic ---
    if (loading) return <LoadingFallback />;
    if (error && !matchDetails) return <p className="error-message">Error: {error}</p>;
    if (!matchDetails) return <div>Match details could not be loaded.</div>;

    const displayState = liveScoreState || matchDetails;
    const displayStatus = displayState?.status || matchDetails.status;

    return (
        <div>
            <h2>{matchDetails.team1_name} vs {matchDetails.team2_name}</h2>
            <p>({matchDetails.season_name})</p>
            <p><strong>Status:</strong> <span style={{ fontWeight: 'bold', color: displayStatus === 'Live' ? 'red' : 'inherit' }}>{displayStatus}</span></p>
            <p><strong>Date:</strong> {new Date(matchDetails.match_datetime).toLocaleString()}</p>
             <p><strong>Venue:</strong> {matchDetails.venue}</p>
             {matchDetails.toss_winner_name && <p><strong>Toss:</strong> {matchDetails.toss_winner_name} won and chose to {matchDetails.decision}</p>}
             {matchDetails.super_over_number && <p><strong>Super Over:</strong> Over #{matchDetails.super_over_number}</p>}

            <hr style={{ margin: '1.5rem 0' }} />

            <h3>{displayStatus === 'Live' ? 'Live Score' : 'Score'}</h3>
             {(displayStatus !== 'Scheduled') && <ScoreDisplay state={liveScoreState} matchDetails={matchDetails} />}
             {displayStatus === 'Scheduled' && <p>Match scheduled to start soon.</p>}


            {displayStatus === 'Completed' && (
                <div style={{ marginTop: '1rem' }}>
                    <h3>Result</h3>
                    <p style={{fontWeight: 'bold'}}>{matchDetails.result_summary || 'Result not yet available.'}</p>
                    {matchDetails.man_of_the_match_name && <p><strong>Man of the Match:</strong> {matchDetails.man_of_the_match_name}</p>}
                 </div>
            )}

             {/* --- Ball-by-Ball Commentary Section --- */}
             {(displayStatus !== 'Scheduled') && (
                 <div style={{marginTop: '2rem'}}>
                      <h3>Ball-by-Ball</h3>
                      <div ref={commentaryContainerRef} style={{ height: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '0.5rem 1rem', backgroundColor: '#fdfdfd', borderRadius: '5px' }}>
                         {commentary.length > 0 ? (
                             commentary.map((ball) => (
                                  <p key={ball.ball_id} style={{ borderBottom: '1px dashed #eee', paddingBottom: '0.3rem', marginBottom: '0.3rem', fontSize:'0.9rem' }}>
                                      {ball.commentary_text}
                                  </p>
                             ))
                          ) : (
                              <p>Waiting for commentary...</p>
                          )}
                     </div>
                 </div>
              )}


            {/* --- Detailed Scorecards (If Completed) --- */}
             {displayStatus === 'Completed' && matchDetails.playerStats && (
                <div style={{marginTop: '2rem'}}>
                    <h3>Detailed Scorecard</h3>
                    <StatsTable statsArray={matchDetails.playerStats.team1} teamName={matchDetails.team1_name} />
                    <StatsTable statsArray={matchDetails.playerStats.team2} teamName={matchDetails.team2_name} />
                </div>
             )}

             <div style={{marginTop: '2rem'}}>
                 <Link to="/schedule"><button>← Back to Schedule</button></Link>
            </div>
        </div>
    );
}
export default MatchDetailPage;