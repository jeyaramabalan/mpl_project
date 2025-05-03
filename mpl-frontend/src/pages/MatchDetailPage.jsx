// mpl-project/mpl-frontend/src/pages/MatchDetailPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import api from "../services/api";
import LoadingFallback from "../components/LoadingFallback";
import InningsScorecard from "../components/InningsScorecard";
import BowlingScorecard from "../components/BowlingScorecard";
import "./MatchDetailPage.css"; // Import the specific CSS file

// --- ScoreDisplay Component (Handles Live and Completed States, uses correct names) ---
const ScoreDisplay = ({ state, matchDetails, innings1Data, innings2Data }) => {
  if (!matchDetails) return <p>Loading score display...</p>;

  const status =
    state && state.status !== "Completed" ? state.status : matchDetails.status;
  const displayData = state && status !== "Completed" ? state : matchDetails;

  // *** USE matchDetails FOR NAMES when available ***
  const team1Name =
    matchDetails?.team1_name || `Team ${matchDetails?.team1_id || "1"}`;
  const team2Name =
    matchDetails?.team2_name || `Team ${matchDetails?.team2_id || "2"}`;

  let battingTeamName = `Team ${displayData?.battingTeamId || "?"}`;
  let bowlingTeamName = `Team ${displayData?.bowlingTeamId || "?"}`;

  // Determine names based on IDs present in the displayData (live or completed)
  if (displayData?.battingTeamId) {
    battingTeamName =
      displayData.battingTeamId == matchDetails.team1_id
        ? team1Name
        : team2Name;
  }
  if (displayData?.bowlingTeamId) {
    bowlingTeamName =
      displayData.bowlingTeamId == matchDetails.team1_id
        ? team1Name
        : team2Name;
  }
  // For completed state specifically (where live state is null)
  if (status === "Completed") {
    battingTeamName = innings1Data?.teamName; // Use calculated name for first innings
  }

  // --- Live/In-Progress Display ---
  if (status === "Live" || status === "InningsBreak") {
    return (
      <div className="score-summary-box">
        {/* Now uses the determined names */}
        {battingTeamName && bowlingTeamName && (
          <p className="batting-bowling-info">
            <strong>Batting:</strong> {battingTeamName} |{" "}
            <strong>Bowling:</strong> {bowlingTeamName}
          </p>
        )}
        <p className="main-score">
          Score: {displayData?.score ?? "N/A"} / {displayData?.wickets ?? "N/A"}
        </p>
        <p className="overs-info">
          Overs: {displayData?.overs ?? "N/A"}.{displayData?.balls ?? "N/A"} /
          5.0
        </p>
        {displayData?.target && displayData?.inningNumber === 2 && (
          <p className="target-info">
            <strong>Target: {displayData.target}</strong>
          </p>
        )}
        {displayData?.lastBallCommentary && (
          <p className="last-ball-commentary">
            {displayData.lastBallCommentary}
          </p>
        )}
      </div>
    );
  }
  // --- Completed Match Display ---
  else if (status === "Completed") {
    return (
      <div className="score-summary-box completed">
        <p className="final-innings-score">
          <strong>{innings1Data?.teamName || "Innings 1"}:</strong>{" "}
          {innings1Data?.score ?? "N/A"} / {innings1Data?.wickets ?? "N/A"} (
          {innings1Data?.oversDisplay || "?"} ov)
        </p>
        <p className="final-innings-score">
          <strong>{innings2Data?.teamName || "Innings 2"}:</strong>{" "}
          {innings2Data?.score ?? "N/A"} / {innings2Data?.wickets ?? "N/A"} (
          {innings2Data?.oversDisplay || "?"} ov)
        </p>
        {matchDetails.result_summary && (
          <p className="result-summary">{matchDetails.result_summary}</p>
        )}
      </div>
    );
  }
  // --- Fallback/Other Statuses ---
  else {
    return (
      <div className="score-summary-box other-status">
        <p>Status: {status}</p>
        {status === "Scheduled" && <p>Match has not started yet.</p>}
        {status === "Abandoned" && <p>Match was abandoned.</p>}
        {status === "Setup" && <p>Match setup in progress.</p>}
      </div>
    );
  }
};

// --- Main Component ---
const MatchDetailPage = () => {
  const { matchId } = useParams();
  const { socket, isConnected, connectSocket, joinMatchRoom, leaveMatchRoom } =
    useSocket();

  const [matchDetails, setMatchDetails] = useState(null);
  const [liveScoreState, setLiveScoreState] = useState(null);
  const [commentary, setCommentary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hasJoinedRoom = useRef(false);
  const commentaryContainerRef = useRef(null);

  // --- Fetch initial data useEffect ---
  useEffect(() => {
    let isMounted = true;
    const fetchMatchData = async () => {
      if (!matchId) return;
      setLoading(true);
      setError("");
      setLiveScoreState(null);
      setCommentary([]);
      hasJoinedRoom.current = false;
      console.log(`Fetching initial data for match ${matchId}`);
      try {
        const [detailsRes, commentaryRes] = await Promise.all([
          api.get(`/matches/${matchId}`),
          api.get(`/matches/${matchId}/commentary`).catch(() => ({ data: [] })),
        ]);
        if (isMounted) {
          const matchData = detailsRes.data;
          setMatchDetails(matchData);
          setCommentary(commentaryRes.data?.reverse() || []);
          if (matchData.status === "Completed") {
            setLiveScoreState(null);
            console.log("Match completed. Displaying final data.");
          } else if (
            ["Live", "Setup", "InningsBreak"].includes(matchData.status)
          ) {
            console.log(`Match status: ${matchData.status}`);
            try {
              const { data: currentState } = await api.get(
                `/admin/scoring/matches/${matchId}/state`
              );
              if (isMounted && currentState?.status) {
                setLiveScoreState(currentState);
              } else {
                setLiveScoreState({
                  status: matchData.status,
                  matchId: parseInt(matchId),
                  lastBallCommentary: "Waiting for live updates...",
                });
              }
            } catch (stateErr) {
              setLiveScoreState({
                status: matchData.status,
                matchId: parseInt(matchId),
                lastBallCommentary: "Waiting for live updates...",
              });
            }
          } else {
            setLiveScoreState({ status: matchData.status });
          }
        }
      } catch (err) {
        if (isMounted) setError("Failed to load match data.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchMatchData();
    return () => {
      isMounted = false;
    };
  }, [matchId]);

  // --- Socket Connection useEffect ---
  useEffect(() => {
    const scoreableStatuses = ["Setup", "Live", "InningsBreak"];
    if (
      !socket ||
      !matchId ||
      loading ||
      !matchDetails ||
      !scoreableStatuses.includes(matchDetails.status)
    ) {
      return () => {
        if (socket && hasJoinedRoom.current) {
          leaveMatchRoom(matchId);
          hasJoinedRoom.current = false;
        }
      };
    }
    const attemptJoinRoom = () => {
      if (isConnected && !hasJoinedRoom.current) {
        joinMatchRoom(matchId);
        hasJoinedRoom.current = true;
      }
    };
    if (isConnected) {
      attemptJoinRoom();
    } else {
      connectSocket();
    }
    const handleConnect = () => attemptJoinRoom();
    const handleUpdateScore = (newState) => {
      if (newState && newState.matchId === parseInt(matchId)) {
        setLiveScoreState(newState);
        if (
          newState.lastBallCommentary &&
          (!commentary.length ||
            commentary[0]?.commentary_text !== newState.lastBallCommentary)
        ) {
          setCommentary((prevComm) =>
            [
              {
                ball_id: `live-${Date.now()}-${Math.random()}`,
                commentary_text: newState.lastBallCommentary,
              },
              ...prevComm,
            ].slice(0, 100)
          );
        }
      }
    };
    const handleInningsBreak = (breakState) => {
      if (breakState && breakState.matchId === parseInt(matchId)) {
        setLiveScoreState((prev) => ({ ...prev, ...breakState }));
      }
    };
    const handleMatchEnded = (endState) => {
      if (endState && endState.matchId === parseInt(matchId)) {
        setLiveScoreState((prev) => ({
          ...prev,
          ...endState,
        })); /* Optionally refetch */
      }
    };
    socket.on("connect", handleConnect);
    socket.on("updateScore", handleUpdateScore);
    socket.on("inningsBreak", handleInningsBreak);
    socket.on("matchEnded", handleMatchEnded);
    return () => {
      if (socket && hasJoinedRoom.current) {
        leaveMatchRoom(matchId);
      }
      hasJoinedRoom.current = false;
      if (socket) {
        socket.off("connect", handleConnect);
        socket.off("updateScore", handleUpdateScore);
        socket.off("inningsBreak", handleInningsBreak);
        socket.off("matchEnded", handleMatchEnded);
      }
    };
  }, [
    socket,
    isConnected,
    matchId,
    loading,
    matchDetails,
    connectSocket,
    joinMatchRoom,
    leaveMatchRoom,
    commentary,
  ]);

  // --- Auto-scroll Commentary ---
  useEffect(() => {
    if (commentaryContainerRef.current) {
      commentaryContainerRef.current.scrollTop = 0;
    }
  }, [commentary]);

  // --- Calculate Innings Data (Added Overs Calculation) ---
  let innings1BatStats = [];
  let innings2BatStats = [];
  let innings1BowlStats = [];
  let innings2BowlStats = [];
  let innings1TeamName = "";
  let innings2TeamName = "";
  let finalInnings1Data = null;
  let finalInnings2Data = null;


  if (
    matchDetails?.status === "Completed" &&
    matchDetails?.playerStats?.length > 0
  ) {
    const inn1BatTeamId =
      matchDetails.decision === "Bat"
        ? matchDetails.toss_winner_team_id
        : matchDetails.toss_winner_team_id === matchDetails.team1_id
        ? matchDetails.team2_id
        : matchDetails.team1_id;
    const inn2BatTeamId =
      inn1BatTeamId === matchDetails.team1_id
        ? matchDetails.team2_id
        : matchDetails.team1_id;
    innings1TeamName =
      inn1BatTeamId === matchDetails.team1_id
        ? matchDetails.team1_name
        : matchDetails.team2_name;
    innings2TeamName =
      inn2BatTeamId === matchDetails.team1_id
        ? matchDetails.team1_name
        : matchDetails.team2_name;
    innings1BatStats = matchDetails.playerStats.filter(
      (stat) => stat.team_id === inn1BatTeamId
    );
    innings2BatStats = matchDetails.playerStats.filter(
      (stat) => stat.team_id === inn2BatTeamId
    );
    innings1BowlStats = matchDetails.playerStats.filter(
      (stat) => stat.team_id === inn2BatTeamId && stat.overs_bowled > 0
    );
    innings2BowlStats = matchDetails.playerStats.filter(
      (stat) => stat.team_id === inn1BatTeamId && stat.overs_bowled > 0
    );
    const calculateInningsSummary = (batStats) => {
      let score = 0;
      let wickets = 0;
      let totalBalls = 0
      batStats.forEach((stat) => {
        score += stat.runs_scored ?? 0;
        if (stat.is_out) wickets += 1;
        const [oversPart, ballsPart] = stat.overs_bowled.split(".").map(Number);
        const balls = oversPart * 6 + (ballsPart || 0);
        totalBalls += balls;
      });
      const totalOvers = Math.floor(totalBalls / 6);
const remainingBalls = totalBalls % 6;
const overs = `${totalOvers}.${remainingBalls}`;
      return { score, wickets,overs };
    };
    const summary1 = calculateInningsSummary(innings1BatStats);
    const summary2 = calculateInningsSummary(innings2BatStats);
    let totalOversInn2Decimal = innings2BowlStats.reduce(
      (sum, bowler) => sum + (bowler.overs_bowled || 0),
      0
    );
    totalOversInn2Decimal = Math.min(5.0, totalOversInn2Decimal);
    finalInnings1Data = {
      teamName: innings1TeamName,
      score: summary1.score,
      wickets: summary1.wickets,
      oversDisplay: summary2.overs,
    };
    finalInnings2Data = {
      teamName: innings2TeamName,
      score: summary2.score,
      wickets: summary2.wickets,
      oversDisplay: summary1.overs,
    };
  }

  // --- Render Logic ---
  if (loading) return <LoadingFallback />;
  if (error && !matchDetails)
    return <p className="error-message">Error: {error}</p>;
  if (!matchDetails) return <div>Match details could not be loaded.</div>;

  const displayState =
    liveScoreState && matchDetails.status !== "Completed"
      ? liveScoreState
      : matchDetails;
  const displayStatus = displayState?.status || matchDetails.status;

  return (
    <div className="match-detail-page">
      <div className="match-header">
        <h2>
          {matchDetails.team1_name} vs {matchDetails.team2_name}
        </h2>
        <p>({matchDetails.season_name})</p>
        <p>
          <strong>Status:</strong>{" "}
          <span className={`status-${displayStatus?.toLowerCase()}`}>
            {displayStatus}
          </span>
        </p>
        <p>
          <strong>Date:</strong>{" "}
          {new Date(matchDetails.match_datetime).toLocaleString()}
        </p>
        <p>
          <strong>Venue:</strong> {matchDetails.venue}
        </p>
        {matchDetails.toss_winner_name && (
          <p>
            <strong>Toss:</strong> {matchDetails.toss_winner_name} won and chose
            to {matchDetails.decision}
          </p>
        )}
        {matchDetails.super_over_number && (
          <p>
            <strong>Super Over:</strong> Over #{matchDetails.super_over_number}
          </p>
        )}
      </div>
      <hr className="section-divider" />
      <div className="score-summary-section">
        <h3>
          {displayStatus === "Live"
            ? "Live Score"
            : displayStatus === "Completed"
            ? "Final Score"
            : "Score"}
        </h3>
        <ScoreDisplay
          state={liveScoreState}
          matchDetails={matchDetails}
          innings1Data={finalInnings1Data} // Pass calculated data
          innings2Data={finalInnings2Data} // Pass calculated data
        />
        {displayStatus === "Scheduled" && <p>Match scheduled to start soon.</p>}
        {displayStatus === "Completed" &&
          matchDetails.man_of_the_match_name && (
            <p className="mom-info">
              <strong>Man of the Match:</strong>{" "}
              {matchDetails.man_of_the_match_name}
            </p>
          )}
      </div>
      {displayStatus !== "Scheduled" && (
        <div className="commentary-section">
          <h3>Ball-by-Ball</h3>
          <div ref={commentaryContainerRef} className="commentary-box">
            {commentary.length > 0 ? (
              commentary.map((ball, index) => (
                <p
                  key={ball.ball_id || `comm-${index}`}
                  className="commentary-item"
                >
                  {" "}
                  {ball.commentary_text}{" "}
                </p>
              ))
            ) : (
              <p>Waiting for commentary...</p>
            )}
          </div>
        </div>
      )}
      {displayStatus === "Completed" && (
        <div className="detailed-scorecards-section">
          <hr className="section-divider" />
          <h3>Detailed Scorecard</h3>
          <InningsScorecard
            stats={innings1BatStats}
            teamName={innings1TeamName}
            inningsNumber={1}
          />
          <BowlingScorecard
            stats={innings1BowlStats}
            teamName={innings2TeamName}
            inningsNumber={1}
          />
          <hr className="innings-divider" />
          <InningsScorecard
            stats={innings2BatStats}
            teamName={innings2TeamName}
            inningsNumber={2}
          />
          <BowlingScorecard
            stats={innings2BowlStats}
            teamName={innings1TeamName}
            inningsNumber={2}
          />
        </div>
      )}
      <div className="back-link-container">
        <Link to="/schedule">
          <button>← Back to Schedule</button>
        </Link>
      </div>
    </div>
  );
};
export default MatchDetailPage;
