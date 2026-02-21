// mpl-project/mpl-frontend/src/pages/MatchDetailPage.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import api from "../services/api";
import LoadingFallback from "../components/LoadingFallback";
import InningsScorecard from "../components/InningsScorecard";
import BowlingScorecard from "../components/BowlingScorecard";
import FallOfWickets from "../components/FallOfWickets"; // This import is now correct
import "./MatchDetailPage.css";

// --- CommentaryItem Component ---
const CommentaryItem = ({ ball }) => {
  const getBadge = () => {
    if (ball.is_super_over_ball) return <div className="ball-badge super-over">SO</div>;
    if (ball.is_wicket) return <div className="ball-badge wicket">W</div>;
    if (ball.is_extra && ball.extra_type === 'Wide') return <div className="ball-badge wide">WD</div>;
    if (ball.is_extra && ball.extra_type === 'NoBall') return <div className="ball-badge no-ball">NB</div>;
    if (ball.is_bye) return <div className="ball-badge bye">BYE</div>;
    if (ball.runs_scored === 4) return <div className="ball-badge four">4</div>;
    if (ball.runs_scored === 2) return <div className="ball-badge two">2</div>;
    if (ball.runs_scored === 1) return <div className="ball-badge run">1</div>;
    if (ball.runs_scored === 0) return <div className="ball-badge dot"> • </div>;
    return <div className="ball-badge run">{ball.runs_scored}</div>;
  };
  const overDisplay = `${Math.floor(ball.over_number - 1)}.${ball.ball_number_in_over}`;
  return (
    <div className="commentary-item">
      <div className="commentary-over">{overDisplay}</div>
      {getBadge()}
      <p className="commentary-text-content">{ball.commentary_text}</p>
    </div>
  );
};

// --- ScoreDisplay Component ---
const ScoreDisplay = ({ state, matchDetails, innings1Data, innings2Data }) => {
  if (!matchDetails) return <p>Loading score display...</p>;
  const status = state?.status || matchDetails.status;
  const displayData = state && status !== "Completed" ? state : matchDetails;
  const team1Name = matchDetails?.team1_name || `Team ${matchDetails?.team1_id || "1"}`;
  const team2Name = matchDetails?.team2_name || `Team ${matchDetails?.team2_id || "2"}`;
  let battingTeamName = `Team ${displayData?.battingTeamId || "?"}`;
  let bowlingTeamName = `Team ${displayData?.bowlingTeamId || "?"}`;
  if (displayData?.battingTeamId) { battingTeamName = displayData.battingTeamId == matchDetails.team1_id ? team1Name : team2Name; }
  if (displayData?.bowlingTeamId) { bowlingTeamName = displayData.bowlingTeamId == matchDetails.team1_id ? team1Name : team2Name; }
  if (status === "Completed") { battingTeamName = innings1Data?.teamName; }
  const lastBallCommentary = state?.commentary && state.commentary.length > 0 ? state.commentary[0].commentary_text : null;
  if (status === "Live" || status === "InningsBreak") {
    return ( <div className="score-summary-box"> {battingTeamName && bowlingTeamName && ( <p className="batting-bowling-info"> <strong>Batting:</strong> {battingTeamName} |{" "} <strong>Bowling:</strong> {bowlingTeamName} </p> )} <p className="main-score"> {displayData?.score ?? "N/A"} / {displayData?.wickets ?? "N/A"} </p> <p className="overs-info"> Overs: {displayData?.overs ?? "N/A"}.{displayData?.balls ?? "N/A"} / 5.0 </p> {displayData?.target > 0 && displayData?.inningNumber === 2 && ( <p className="target-info"> <strong>Target: {displayData.target}</strong> </p> )} {lastBallCommentary && ( <p className="last-ball-commentary"> {lastBallCommentary} </p> )} </div> );
  } else if (status === "Completed") {
    return ( <div className="score-summary-box completed"> <p className="final-innings-score"> <strong>{innings1Data?.teamName || "Innings 1"}:</strong>{" "} {innings1Data?.score ?? "N/A"} / {innings1Data?.wickets ?? "N/A"} ( {innings1Data?.oversDisplay || "?"} ov) </p> <p className="final-innings-score"> <strong>{innings2Data?.teamName || "Innings 2"}:</strong>{" "} {innings2Data?.score ?? "N/A"} / {innings2Data?.wickets ?? "N/A"} ( {innings2Data?.oversDisplay || "?"} ov) </p> {matchDetails.result_summary && ( <p className="result-summary">{matchDetails.result_summary}</p> )} </div> );
  } else {
    return ( <div className="score-summary-box other-status"> <p>Status: {status}</p> {status === "Scheduled" && <p>Match has not started yet.</p>} {status === "Abandoned" && <p>Match was abandoned.</p>} {status === "Setup" && <p>Match setup in progress.</p>} </div> );
  }
};

// --- Main Component ---
const MatchDetailPage = () => {
  const { matchId } = useParams();
  const { socket } = useSocket();
  const [matchDetails, setMatchDetails] = useState(null);
  const [liveScoreState, setLiveScoreState] = useState(null);
  const [displayCommentary, setDisplayCommentary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState('summary');
  const commentaryContainerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const fetchMatchData = async () => {
        if (!matchId) return;
        setLoading(true); setError("");

        try {
            const detailsRes = await api.get(`/matches/${matchId}`);
            if (!isMounted) return;
            let matchData = detailsRes.data;

            if (matchData.status === "Completed" && (!matchData.ballByBall || matchData.ballByBall.length === 0)) {
                const commentaryRes = await api.get(`/matches/${matchId}/commentary`);
                if (commentaryRes.data) {
                    matchData.ballByBall = commentaryRes.data;
                }
            }

            setMatchDetails(matchData);

            if (["Setup", "Live", "InningsBreak", "Completed"].includes(matchData.status)) {
                const stateRes = await api.get(`/matches/${matchId}/state`);
                if (isMounted) {
                    setLiveScoreState(stateRes.data);
                    setDisplayCommentary(stateRes.data?.commentary || []);
                }
            } else {
                setLiveScoreState({ status: matchData.status });
            }

            if (matchData.status === "Completed" && matchData.ballByBall) {
                setDisplayCommentary(matchData.ballByBall.slice().reverse());
                setActiveTab('scorecard');
            }

        } catch (err) {
            if (isMounted) setError("Failed to load match data.");
        } finally {
            if (isMounted) setLoading(false);
        }
    };
    fetchMatchData();
    return () => { isMounted = false; };
  }, [matchId]);

/*  useEffect(() => {
    if (!socket || !matchDetails || !["Setup", "Live", "InningsBreak"].includes(matchDetails.status)) return;
    socket.emit('joinMatchRoom', matchId);
    const handleUpdateScore = (newState) => { if (newState && newState.matchId === parseInt(matchId)) { setLiveScoreState(newState); setDisplayCommentary(newState.commentary || []); } };
    const handleMatchEnded = () => { window.location.reload(); };
    socket.on("updateScore", handleUpdateScore);
    socket.on("matchEnded", handleMatchEnded);
    return () => { socket.emit('leaveMatchRoom', matchId); socket.off("updateScore", handleUpdateScore); socket.off("matchEnded", handleMatchEnded); };
  }, [socket, matchId, matchDetails]); */

  // --- CORRECTED SOCKET useEffect FOR LIVE COMMENTARY ---
    useEffect(() => {
    if (!socket || !matchDetails || !["Setup", "Live", "InningsBreak"].includes(matchDetails.status)) return;
    
    socket.emit('joinMatchRoom', matchId);

    const handleUpdateScore = (newState) => {
        if (newState && newState.matchId === parseInt(matchId)) {
            // Update the main score state
            setLiveScoreState(newState);

            // Get the single newest ball from the incoming update
            const newBall = newState.commentary ? newState.commentary[0] : null;

            // Prepend the new ball to the existing commentary list
            if (newBall) {
                setDisplayCommentary(prevCommentary => {
                    // Prevent adding duplicates if the socket reconnects
                    if (prevCommentary.some(c => c.ball_id === newBall.ball_id)) {
                        return prevCommentary;
                    }
                    return [newBall, ...prevCommentary];
                });
            }
        }
    };

    const handleMatchEnded = () => { window.location.reload(); };
    
    socket.on("updateScore", handleUpdateScore);
    socket.on("matchEnded", handleMatchEnded);
    
    return () => { 
        socket.emit('leaveMatchRoom', matchId); 
        socket.off("updateScore", handleUpdateScore); 
        socket.off("matchEnded", handleMatchEnded); 
    };
  }, [socket, matchId, matchDetails]);

  
  useEffect(() => { if (commentaryContainerRef.current) { commentaryContainerRef.current.scrollTop = 0; } }, [displayCommentary]);

  const formatOversDisplay = (oversDecimal) => { if (oversDecimal == null || isNaN(oversDecimal)) return "?"; const completedOvers = Math.floor(oversDecimal); let ballsInPartialOver = Math.round((oversDecimal - completedOvers) * 10); if (ballsInPartialOver >= 6) { return `${completedOvers + 1}.0`; } return `${completedOvers}.${ballsInPartialOver}`; };

  const processedScorecards = useMemo(() => {
    if (matchDetails?.status !== "Completed" || !matchDetails.ballByBall || !matchDetails.playerStats) {
      return null;
    }

    const { playerStats, ballByBall, team1_id, team2_id, toss_winner_team_id, decision, team1_name, team2_name } = matchDetails;
    const inn1BatTeamId = decision === 'Bat' ? toss_winner_team_id : (toss_winner_team_id === team1_id ? team2_id : team1_id);
    const inn2BatTeamId = inn1BatTeamId === team1_id ? team2_id : team1_id;

    const processInnings = (inningsNumber) => {
      const isFirstInnings = inningsNumber === 1;
      const battingTeamId = isFirstInnings ? inn1BatTeamId : inn2BatTeamId;
      const bowlingTeamId = isFirstInnings ? inn2BatTeamId : inn1BatTeamId;
      const inningsBalls = ballByBall.filter(b => b.inning_number === inningsNumber);
      
      const battingOrderIds = [...new Set(inningsBalls.map(b => b.batsman_on_strike_player_id))];
      const bowlingOrderIds = [...new Set(inningsBalls.map(b => b.bowler_player_id))];
      
      const baseBatStats = playerStats.filter(p => p.team_id === battingTeamId);
      const baseBowlStats = playerStats.filter(p => p.team_id === bowlingTeamId && Number(p.overs_bowled) > 0);

      const batStats = battingOrderIds.map(id => {
          const stat = baseBatStats.find(p => p.player_id === id);
          return stat ? {...stat} : null;
      }).filter(Boolean);

      const bowlStats = bowlingOrderIds.map(id => baseBowlStats.find(p => p.player_id === id)).filter(Boolean);

      baseBatStats.forEach(p => {
          if(!batStats.some(bp => bp.player_id === p.player_id)) {
              batStats.push({...p, did_not_bat: true, runs_scored: '', balls_faced: '', twos: '', fours: ''});
          }
      });

      batStats.forEach(stat => {
        if (stat.is_out) {
          const dismissalBall = inningsBalls.find(b => b.is_wicket && b.batsman_on_strike_player_id === stat.player_id);
          if (dismissalBall) {
            stat.how_out = dismissalBall.how_out || stat.how_out;
            if (dismissalBall.wicket_type === "Caught") stat.how_out = `c ${dismissalBall.fielder_name} b ${dismissalBall.bowler_name}`;
            else if (dismissalBall.wicket_type === "Stumped") stat.how_out = `st ${dismissalBall.fielder_name} b ${dismissalBall.bowler_name}`;
            else if (dismissalBall.wicket_type === "Bowled") stat.how_out = `b ${dismissalBall.bowler_name}`;
            else stat.how_out = dismissalBall.wicket_type.toLowerCase();
          }
        }
      });

      const wides = inningsBalls.filter(b => b.extra_type === 'Wide').reduce((sum, b) => sum + Number(b.extra_runs), 0);
      const noBalls = inningsBalls.filter(b => b.extra_type === 'NoBall').reduce((sum, b) => sum + Number(b.extra_runs), 0);
      const byes = inningsBalls.filter(b => b.is_bye).reduce((sum, b) => sum + Number(b.runs_scored) + Number(b.extra_runs), 0);
      const totalExtras = wides + noBalls + byes;
      const totalScore = inningsBalls.reduce((sum, b) => sum + Number(b.runs_scored) + Number(b.extra_runs), 0);
      let wicketCount = 0; let currentScore = 0; const fallOfWickets = [];
      
      inningsBalls.forEach(ball => {
          currentScore += Number(ball.runs_scored) + Number(ball.extra_runs);
          if (ball.is_wicket) {
              wicketCount++;
              const legalBallsInOver = inningsBalls.filter(b => b.over_number === ball.over_number && !b.is_extra && b.ball_id <= ball.ball_id).length;
              const overDisplay = `${ball.over_number - 1}.${legalBallsInOver}`;
              fallOfWickets.push({ number: wicketCount, score: currentScore, playerName: ball.batsman_name, overs: overDisplay });
          }
      });

      return {
        batStats, bowlStats,
        batTeamName: battingTeamId === team1_id ? team1_name : team2_name,
        bowlTeamName: bowlingTeamId === team1_id ? team1_name : team2_name,
        summary: { extras: totalExtras, extras_detail: `(b ${byes}, wd ${wides}, nb ${noBalls})`, total: totalScore, wickets: wicketCount, overs: formatOversDisplay(Math.min(5.0, baseBowlStats.reduce((sum, p) => sum + Number(p.overs_bowled || 0), 0))) },
        fallOfWickets
      };
    };
    return { innings1: processInnings(1), innings2: processInnings(2) };
  }, [matchDetails]);

  let finalInnings1Data = null;
  let finalInnings2Data = null;
  if (matchDetails?.status === "Completed" && processedScorecards) {
    const inn1Summary = processedScorecards.innings1.summary;
    const inn2Summary = processedScorecards.innings2.summary;
    finalInnings1Data = { teamName: processedScorecards.innings1.batTeamName, score: inn1Summary.total, wickets: inn1Summary.wickets, oversDisplay: inn1Summary.overs };
    finalInnings2Data = { teamName: processedScorecards.innings2.batTeamName, score: inn2Summary.total, wickets: inn2Summary.wickets, oversDisplay: inn2Summary.overs };
  }
  
  if (loading) return <LoadingFallback />;
  if (error) return <p className="error-message">Error: {error}</p>;
  if (!matchDetails) return <div>Match details could not be loaded.</div>;

  const displayStatus = liveScoreState?.status || matchDetails.status;
  
  return (
    <div className="match-detail-page">
      <div className="match-header">
        <h2> {matchDetails.team1_name} vs {matchDetails.team2_name} </h2>
        <p>({matchDetails.season_name})</p>
        <p> <strong>Status:</strong>{" "} <span className={`status-${displayStatus.toLowerCase()}`}> {displayStatus} </span> </p>
        <p> <strong>Date:</strong>{" "} {new Date(matchDetails.match_datetime).toLocaleString()} </p>
        <p> <strong>Venue:</strong> {matchDetails.venue} </p>
        {matchDetails.toss_winner_name && ( <p> <strong>Toss:</strong> {matchDetails.toss_winner_name} won and chose to {matchDetails.decision} </p> )}
        {matchDetails.super_over_number && ( <p> <strong>Super Over:</strong> Over #{matchDetails.super_over_number} </p> )}
      </div>
      
      <div className="score-summary-section">
        <ScoreDisplay state={liveScoreState} matchDetails={matchDetails} innings1Data={finalInnings1Data} innings2Data={finalInnings2Data} />
        {displayStatus === "Completed" && processedScorecards && (
          <div className="extras-breakdown" style={{ marginTop: '0.75rem', fontSize: '0.95rem' }}>
            <p><strong>Extras – Innings 1:</strong> {processedScorecards.innings1.summary.extras} {processedScorecards.innings1.summary.extras_detail}</p>
            <p><strong>Extras – Innings 2:</strong> {processedScorecards.innings2.summary.extras} {processedScorecards.innings2.summary.extras_detail}</p>
          </div>
        )}
        {displayStatus === "Completed" && matchDetails.man_of_the_match_name && ( <p className="mom-info"> <strong>Man of the Match:</strong>{" "} {matchDetails.man_of_the_match_name} </p> )}
      </div>
      
      <nav className="match-tabs">
        <button className={`tab-button ${activeTab === 'scorecard' ? 'active' : ''}`} onClick={() => setActiveTab('scorecard')}>Scorecard</button>
        <button className={`tab-button ${activeTab === 'commentary' ? 'active' : ''}`} onClick={() => setActiveTab('commentary')}>Ball-by-Ball</button>
      </nav>

      <div className="tab-content">
        {activeTab === 'commentary' && (
             <div className="commentary-section">
                <div ref={commentaryContainerRef} className="commentary-box">
                {displayCommentary.length > 0 ? ( displayCommentary.map((ball) => ( <CommentaryItem key={ball.ball_id || `comm-${Math.random()}`} ball={ball} /> )) ) : ( <p>Waiting for commentary...</p> )}
                </div>
            </div>
        )}

        {activeTab === 'scorecard' && displayStatus === "Completed" && processedScorecards && (
          <div className="detailed-scorecards-section">
            <InningsScorecard 
                stats={processedScorecards.innings1.batStats} 
                teamName={processedScorecards.innings1.batTeamName} 
                inningsNumber={1} 
                summary={processedScorecards.innings1.summary}
            />
            <BowlingScorecard 
                stats={processedScorecards.innings1.bowlStats} 
                teamName={processedScorecards.innings1.bowlTeamName} 
                inningsNumber={1} 
            />
            <FallOfWickets wickets={processedScorecards.innings1.fallOfWickets} />
            <hr className="innings-divider" />
            <InningsScorecard 
                stats={processedScorecards.innings2.batStats} 
                teamName={processedScorecards.innings2.batTeamName} 
                inningsNumber={2}
                summary={processedScorecards.innings2.summary}
            />
            <BowlingScorecard 
                stats={processedScorecards.innings2.bowlStats} 
                teamName={processedScorecards.innings2.bowlTeamName} 
                inningsNumber={2}
            />
            <FallOfWickets wickets={processedScorecards.innings2.fallOfWickets} />
          </div>
        )}
        {activeTab === 'scorecard' && displayStatus !== "Completed" && (
            <p style={{marginTop: '2rem', textAlign: 'center'}}>Detailed scorecard will be available after the match is completed.</p>
        )}
      </div>

      <div className="back-link-container">
        <Link to="/schedule"> <button>← Back to Schedule</button> </Link>
      </div>
    </div>
  );
};

export default MatchDetailPage;