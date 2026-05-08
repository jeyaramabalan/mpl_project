// mpl-project/mpl-frontend/src/pages/MatchDetailPage.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceDot,
} from "recharts";
import { useSocket } from "../context/SocketContext";
import api from "../services/api";
import LoadingFallback from "../components/LoadingFallback";
import InningsScorecard from "../components/InningsScorecard";
import { aggregateBattingFromInningsBalls } from "../utils/battingFromBalls";
import BowlingScorecard from "../components/BowlingScorecard";
import FallOfWickets from "../components/FallOfWickets";
import "./MatchDetailPage.css";

// e.g. "2.3" -> 2 + 3/6 = 2.5 (over.ball for worm X-axis)
const oversToDecimal = (oversStr) => {
  const parts = String(oversStr || "0.0").split(".");
  const over = parseInt(parts[0], 10) || 0;
  const ball = parseInt(parts[1], 10) || 0;
  return over + ball / 6;
};

/** How many separate times this batter came on strike in the innings (2+ ⇒ returned after retiring). */
function countStrikerSegmentsForInnings(playerId, inningsBallsSorted) {
  const pid = Number(playerId);
  if (Number.isNaN(pid)) return 0;
  let segments = 0;
  let wasOnStrike = false;
  for (const ball of inningsBallsSorted) {
    const on = Number(ball.batsman_on_strike_player_id) === pid;
    if (on && !wasOnStrike) segments += 1;
    wasOnStrike = on;
  }
  return segments;
}

// Interpolate runs from worm data at given x so wicket dot sits on the line
const wormYAt = (wormData, x, teamKey) => {
  const data = wormData.data;
  if (!data || data.length === 0) return 0;
  const xLo = Math.floor(Math.max(0, x));
  const xHi = Math.ceil(Math.min(5, x));
  const lo = data.find((d) => d.over === xLo);
  const hi = data.find((d) => d.over === xHi);
  if (!lo || !hi) return lo?.[teamKey] ?? hi?.[teamKey] ?? 0;
  if (xLo === xHi) return lo[teamKey] ?? 0;
  const yLo = lo[teamKey] ?? 0;
  const yHi = hi[teamKey] ?? 0;
  return yLo + (yHi - yLo) * ((x - xLo) / (xHi - xLo));
};

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
  // Prefer the over shown in commentary text (logical over/ball); DB columns can disagree after extras.
  const lead = /^(\d+)\.(\d+):/.exec(ball.commentary_text || '');
  const overDisplay = lead
    ? `${lead[1]}.${lead[2]}`
    : `${Math.floor((ball.over_number ?? 1) - 1)}.${ball.ball_number_in_over ?? 0}`;
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

  // Prefer live state for non-completed matches; fall back to matchDetails
  let displayData = state && status !== "Completed" ? state : matchDetails || {};

  // If we are Live/InningsBreak but do not have a proper live state (e.g. older backend),
  // derive per-innings score/overs/wickets directly from ballByBall so we never mix innings.
  if ((status === "Live" || status === "InningsBreak") && (!state || typeof state.score === "undefined") && Array.isArray(matchDetails.ballByBall) && matchDetails.ballByBall.length > 0) {
    const allBalls = matchDetails.ballByBall;
    const currentInningNumber = allBalls.reduce((max, b) => {
      const n = Number(b.inning_number) || 0;
      return n > max ? n : max;
    }, 1);
    const inningBalls = allBalls.filter(b => Number(b.inning_number) === currentInningNumber);
    const score = inningBalls.reduce(
      (sum, b) =>
        sum +
        Number(b.runs_scored || 0) +
        Number(b.extra_runs || 0) +
        Number(b.super_over_runs || 0),
      0
    );
    const wickets = inningBalls.filter(b => b.is_wicket).length;
    const legalBalls = inningBalls.filter(b => !b.is_extra).length;
    const overs = Math.floor(legalBalls / 6);
    const ballsInOver = legalBalls % 6;
    let target = 0;
    if (currentInningNumber === 2) {
      const inn1Score = allBalls
        .filter(b => Number(b.inning_number) === 1)
        .reduce(
          (sum, b) =>
            sum +
            Number(b.runs_scored || 0) +
            Number(b.extra_runs || 0) +
            Number(b.super_over_runs || 0),
          0
        );
      target = inn1Score + 1;
    }
    displayData = {
      ...displayData,
      score,
      wickets,
      overs,
      balls: ballsInOver,
      target,
      inningNumber: currentInningNumber,
    };
  }

  const team1Name = matchDetails?.team1_name || `Team ${matchDetails?.team1_id || "1"}`;
  const team2Name = matchDetails?.team2_name || `Team ${matchDetails?.team2_id || "2"}`;
  let battingTeamName = `Team ${displayData?.battingTeamId || "?"}`;
  let bowlingTeamName = `Team ${displayData?.bowlingTeamId || "?"}`;
  if (displayData?.battingTeamId) { battingTeamName = displayData.battingTeamId == matchDetails.team1_id ? team1Name : team2Name; }
  if (displayData?.bowlingTeamId) { bowlingTeamName = displayData.bowlingTeamId == matchDetails.team1_id ? team1Name : team2Name; }
  if (status === "Completed") { battingTeamName = innings1Data?.teamName; }
  const lastBallCommentary =
    state?.lastBallCommentary ||
    (state?.commentary && state.commentary.length > 0
      ? state.commentary[state.commentary.length - 1].commentary_text
      : null);
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
  const { socket, connectSocket, isConnected } = useSocket();
  const [matchDetails, setMatchDetails] = useState(null);
  const [liveScoreState, setLiveScoreState] = useState(null);
  const [displayCommentary, setDisplayCommentary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  /** Default: ball-by-ball for in-progress matches; fetch sets scorecard when Completed */
  const [activeTab, setActiveTab] = useState('commentary');
  const [momImageError, setMomImageError] = useState(false);
  useEffect(() => { setMomImageError(false); }, [matchId]);
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
                const [stateRes, commRes] = await Promise.all([
                    api.get(`/matches/${matchId}/state`),
                    api.get(`/matches/${matchId}/commentary`).catch(() => ({ data: [] })),
                ]);
                if (isMounted) {
                    setLiveScoreState(stateRes.data);
                    const balls = Array.isArray(commRes.data) ? commRes.data : [];
                    setDisplayCommentary(balls.slice().reverse());
                }
            } else {
                setLiveScoreState({ status: matchData.status });
            }

            if (matchData.status === "Completed" && matchData.ballByBall) {
                setDisplayCommentary(matchData.ballByBall.slice().reverse());
                setActiveTab('scorecard');
            } else if (["Setup", "Live", "InningsBreak"].includes(matchData.status)) {
                setActiveTab('commentary');
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

  // Socket payload matches getLiveMatchState (no full commentary array). Refetch commentary on each update.
  // Re-join room on connect so viewers who loaded before the socket was ready still receive broadcasts.
  useEffect(() => {
    if (!socket || !matchDetails || !["Setup", "Live", "InningsBreak"].includes(matchDetails.status)) return;

    const joinRoom = () => {
      if (socket.connected) socket.emit('joinMatchRoom', matchId);
    };

    const refreshCommentary = async () => {
      try {
        const { data } = await api.get(`/matches/${matchId}/commentary`);
        if (Array.isArray(data)) {
          setDisplayCommentary(data.slice().reverse());
        }
      } catch (e) {
        console.warn('MatchDetail: commentary refresh failed', e?.message || e);
      }
    };

    const handleUpdateScore = (newState) => {
      if (newState && Number(newState.matchId) === Number(matchId)) {
        setLiveScoreState(newState);
        refreshCommentary();
      }
    };

    const handleMatchEnded = () => {
      window.location.reload();
    };

    joinRoom();
    socket.on('connect', joinRoom);
    socket.on('updateScore', handleUpdateScore);
    socket.on('matchEnded', handleMatchEnded);

    return () => {
      socket.off('connect', joinRoom);
      if (socket.connected) socket.emit('leaveMatchRoom', matchId);
      socket.off('updateScore', handleUpdateScore);
      socket.off('matchEnded', handleMatchEnded);
    };
  }, [socket, matchId, matchDetails]);

  /** Backup: HTTP refresh so header + ball list stay aligned if a socket event is missed */
  useEffect(() => {
    if (!matchId || !matchDetails || !['Live', 'InningsBreak', 'Setup'].includes(matchDetails.status)) return;

    const refreshLive = async () => {
      try {
        const [stateRes, commRes] = await Promise.all([
          api.get(`/matches/${matchId}/state`),
          api.get(`/matches/${matchId}/commentary`).catch(() => ({ data: [] })),
        ]);
        if (stateRes?.data) setLiveScoreState(stateRes.data);
        if (Array.isArray(commRes?.data)) setDisplayCommentary(commRes.data.slice().reverse());
      } catch (_) {
        /* ignore */
      }
    };

    // Initial score + commentary already loaded in fetchMatchData; interval covers missed socket events.
    const period = isConnected ? 14000 : 5000;
    const id = setInterval(refreshLive, period);
    return () => clearInterval(id);
  }, [matchId, matchDetails?.status, isConnected]);

  useEffect(() => {
    if (!matchDetails || !['Live', 'InningsBreak', 'Setup'].includes(matchDetails.status)) return;
    connectSocket();
  }, [matchDetails, connectSocket]);


  
  useEffect(() => { if (commentaryContainerRef.current) { commentaryContainerRef.current.scrollTop = 0; } }, [displayCommentary]);

  const formatOversDisplay = (oversDecimal) => { if (oversDecimal == null || isNaN(oversDecimal)) return "?"; const completedOvers = Math.floor(oversDecimal); let ballsInPartialOver = Math.round((oversDecimal - completedOvers) * 10); if (ballsInPartialOver >= 6) { return `${completedOvers + 1}.0`; } return `${completedOvers}.${ballsInPartialOver}`; };
  const teamInitials = (name) => (name || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

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
      const inningsBalls = ballByBall.filter(b => Number(b.inning_number) === inningsNumber);
      
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

      const inningsBallsChrono = [...inningsBalls].sort((a, b) => Number(a.ball_id) - Number(b.ball_id));
      batStats.forEach((stat) => {
        if (stat.did_not_bat || stat.is_out) return;
        const retiredFlag = stat.retired == true || stat.retired === 1 || Number(stat.retired) === 1;
        if (!retiredFlag) return;
        const segments = countStrikerSegmentsForInnings(stat.player_id, inningsBallsChrono);
        if (segments === 1) stat.scorecardDismissal = 'retired';
      });

      batStats.forEach((stat) => {
        if (stat.did_not_bat) return;
        const agg = aggregateBattingFromInningsBalls(stat.player_id, inningsBalls);
        stat.runs_scored = agg.runs;
        stat.balls_faced = agg.ballsFaced;
        stat.fours = agg.fours;
        stat.twos = agg.twos;
      });

      const wides = inningsBalls.filter(b => b.extra_type === 'Wide').reduce((sum, b) => sum + Number(b.extra_runs), 0);
      const noBalls = inningsBalls.filter(b => b.extra_type === 'NoBall').reduce((sum, b) => sum + Number(b.extra_runs), 0);
      const byes = inningsBalls
        .filter(b => b.is_bye)
        .reduce((sum, b) => sum + Number(b.runs_scored || 0) + Number(b.extra_runs || 0), 0);
      const totalExtras = wides + noBalls + byes;
      const superOverRunsInnings = inningsBalls.reduce((sum, b) => sum + Number(b.super_over_runs || 0), 0);
      const ballTotal = (b) =>
        Number(b.runs_scored || 0) + Number(b.extra_runs || 0) + Number(b.super_over_runs || 0);
      const totalScore = inningsBalls.reduce((sum, b) => sum + ballTotal(b), 0);
      let wicketCount = 0; let currentScore = 0; const fallOfWickets = [];
      
      inningsBalls.forEach(ball => {
          currentScore += ballTotal(ball);
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
        summary: {
          extras: totalExtras,
          extras_detail: `(b ${byes}, wd ${wides}, nb ${noBalls})`,
          super_over_runs: superOverRunsInnings,
          total: totalScore,
          wickets: wicketCount,
          overs: formatOversDisplay(Math.min(5.0, baseBowlStats.reduce((sum, p) => sum + Number(p.overs_bowled || 0), 0))),
        },
        fallOfWickets
      };
    };
    return { innings1: processInnings(1), innings2: processInnings(2) };
  }, [matchDetails]);

  // Worm chart: cumulative runs vs overs for both innings (all 5 overs count; super_over_number only marks which over has special rules)
  const wormData = useMemo(() => {
    if (matchDetails?.status !== "Completed" || !matchDetails.ballByBall || !processedScorecards) return null;
    const balls = matchDetails.ballByBall;
    const name1 = processedScorecards.innings1.batTeamName;
    const name2 = processedScorecards.innings2.batTeamName;

    const getCumulativeByOver = (inningNumber) => {
      const result = [0]; // index 0 = after 0 overs
      for (let o = 1; o <= 5; o++) {
        const prev = result[o - 1] ?? 0;
        const runsThisOver = balls
          .filter((b) => Number(b.inning_number) === inningNumber && Number(b.over_number) === o)
          .reduce((s, b) => s + Number(b.runs_scored || 0) + Number(b.extra_runs || 0) + Number(b.super_over_runs || 0), 0);
        result[o] = prev + runsThisOver;
      }
      return result;
    };

    const cumul1 = getCumulativeByOver(1);
    const cumul2 = getCumulativeByOver(2);
    const overs1 = processedScorecards.innings1.summary?.overs;
    const overs2 = processedScorecards.innings2.summary?.overs;
    const end1 = overs1 != null ? oversToDecimal(overs1) : 5;
    const end2 = overs2 != null ? oversToDecimal(overs2) : 5;

    let data = [0, 1, 2, 3, 4, 5].map((over) => {
      const row = { over, [name1]: cumul1[over] ?? 0, [name2]: cumul2[over] ?? 0 };
      // If an innings ended before 5 overs, don't draw that line past their last over (end at 4)
      if (over === 5) {
        if (end1 < 5) row[name1] = null;
        if (end2 < 5) row[name2] = null;
      }
      return row;
    });

    // Ensure last point before 5 shows final total for innings that ended early
    const total1 = processedScorecards.innings1.summary?.total ?? 0;
    const total2 = processedScorecards.innings2.summary?.total ?? 0;
    const row4 = data.find((d) => d.over === 4);
    if (row4) {
      if (end1 < 5) row4[name1] = total1;
      if (end2 < 5) row4[name2] = total2;
    }

    return { data, name1, name2 };
  }, [matchDetails, processedScorecards]);

  let finalInnings1Data = null;
  let finalInnings2Data = null;
  if (matchDetails?.status === "Completed" && processedScorecards) {
    const inn1Summary = processedScorecards.innings1.summary;
    const inn2Summary = processedScorecards.innings2.summary;
    finalInnings1Data = { teamName: processedScorecards.innings1.batTeamName, score: inn1Summary.total, wickets: inn1Summary.wickets, oversDisplay: inn1Summary.overs };
    finalInnings2Data = { teamName: processedScorecards.innings2.batTeamName, score: inn2Summary.total, wickets: inn2Summary.wickets, oversDisplay: inn2Summary.overs };
  }

  const momImpactSummary = useMemo(() => {
    if (matchDetails?.status !== 'Completed' || !matchDetails.man_of_the_match_player_id || !matchDetails.playerStats?.length) return null;
    const momId = matchDetails.man_of_the_match_player_id;
    const momStats = matchDetails.playerStats.find(p => p.player_id === momId);
    if (!momStats) return null;
    const bat = Number(momStats.batting_impact_points) || 0;
    const bowl = Number(momStats.bowling_impact_points) || 0;
    const field = Number(momStats.fielding_impact_points) || 0;
    if (bat === 0 && bowl === 0 && field === 0) return null;
    const top = bat >= bowl && bat >= field ? 'batting' : bowl >= field ? 'bowling' : 'fielding';
    if (top === 'batting') {
      const runs = Number(momStats.runs_scored) ?? 0;
      const balls = Number(momStats.balls_faced) ?? 0;
      return { label: 'Batting', text: `${runs} run${runs !== 1 ? 's' : ''} in ${balls} ball${balls !== 1 ? 's' : ''}` };
    }
    if (top === 'bowling') {
      const wkts = Number(momStats.wickets_taken) ?? 0;
      const runs = Number(momStats.runs_conceded) ?? 0;
      const overs = Number(momStats.overs_bowled) ?? 0;
      const ovStr = formatOversDisplay(overs);
      return { label: 'Bowling', text: `${wkts} for ${runs} in ${ovStr} over${ovStr === '1.0' || ovStr === '1' ? '' : 's'}` };
    }
    const catches = Number(momStats.catches) ?? 0;
    const stumps = Number(momStats.stumps) ?? 0;
    const runOuts = Number(momStats.run_outs) ?? 0;
    const parts = [];
    if (catches) parts.push(`${catches} catch${catches !== 1 ? 'es' : ''}`);
    if (stumps) parts.push(`${stumps} stumping${stumps !== 1 ? 's' : ''}`);
    if (runOuts) parts.push(`${runOuts} run-out${runOuts !== 1 ? 's' : ''}`);
    return { label: 'Fielding', text: parts.length ? parts.join(', ') : '—' };
  }, [matchDetails]);

  if (loading) return <LoadingFallback />;
  if (error) return <p className="error-message">Error: {error}</p>;
  if (!matchDetails) return <div>Match details could not be loaded.</div>;

  const displayStatus = liveScoreState?.status || matchDetails.status;
  
  return (
    <div className="match-detail-page">
      <div className="match-header">
        <div className="match-header-teams">
          <div className="match-header-team">
            <span className="match-header-team-logo-wrap">
              {matchDetails.team1_id ? (
                <>
                  <img
                    src={`/images/teams/${matchDetails.team1_id}.jpg`}
                    alt={matchDetails.team1_name}
                    className="match-header-team-logo"
                    onError={(e) => e.currentTarget.classList.add('is-hidden')}
                  />
                  <span className="match-header-team-logo-fallback" aria-hidden="true">{teamInitials(matchDetails.team1_name)}</span>
                </>
              ) : (
                <span className="match-header-team-logo-fallback" aria-hidden="true">{teamInitials(matchDetails.team1_name)}</span>
              )}
            </span>
            <span>{matchDetails.team1_name}</span>
          </div>
          <span className="match-header-vs">vs</span>
          <div className="match-header-team">
            <span className="match-header-team-logo-wrap">
              {matchDetails.team2_id ? (
                <>
                  <img
                    src={`/images/teams/${matchDetails.team2_id}.jpg`}
                    alt={matchDetails.team2_name}
                    className="match-header-team-logo"
                    onError={(e) => e.currentTarget.classList.add('is-hidden')}
                  />
                  <span className="match-header-team-logo-fallback" aria-hidden="true">{teamInitials(matchDetails.team2_name)}</span>
                </>
              ) : (
                <span className="match-header-team-logo-fallback" aria-hidden="true">{teamInitials(matchDetails.team2_name)}</span>
              )}
            </span>
            <span>{matchDetails.team2_name}</span>
          </div>
        </div>
        <p>({matchDetails.season_name})</p>
        <p> <strong>Status:</strong>{" "} <span className={`status-${displayStatus.toLowerCase()}`}> {displayStatus} </span> </p>
        <p> <strong>Date:</strong>{" "} {new Date(matchDetails.match_datetime).toLocaleString()} </p>
        <p> <strong>Venue:</strong> {matchDetails.venue} </p>
        {matchDetails.toss_winner_name && ( <p> <strong>Toss:</strong> {matchDetails.toss_winner_name} won and chose to {matchDetails.decision} </p> )}
        {matchDetails.super_over_number && ( <p> <strong>Super Over:</strong> Over #{matchDetails.super_over_number} </p> )}
      </div>
      
      <div className="score-summary-section">
        <ScoreDisplay state={liveScoreState} matchDetails={matchDetails} innings1Data={finalInnings1Data} innings2Data={finalInnings2Data} />
        {displayStatus === "Completed" && (processedScorecards || matchDetails.man_of_the_match_name) && (
          <div className="extras-mom-section">
            {matchDetails.man_of_the_match_name && (
              <div className="extras-mom-photo">
                {matchDetails.man_of_the_match_player_id && !momImageError ? (
                  <img
                    src={`/images/players/${matchDetails.man_of_the_match_player_id}.jpg`}
                    alt={matchDetails.man_of_the_match_name}
                    className="extras-mom-avatar extras-mom-avatar-img"
                    onError={() => setMomImageError(true)}
                  />
                ) : (
                  <div className="extras-mom-avatar" title={matchDetails.man_of_the_match_name}>
                    {(matchDetails.man_of_the_match_name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            )}
            <div className="extras-mom-text">
              {matchDetails.man_of_the_match_name && (
                <>
                  <p className="mom-info"><strong>Man of the Match:</strong>{" "}{matchDetails.man_of_the_match_name}</p>
                  {momImpactSummary && (
                    <p className="mom-impact-summary" style={{ fontSize: '0.95rem' }}>
                      <strong>Top impact – {momImpactSummary.label}:</strong>{" "}{momImpactSummary.text}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      <nav className="match-tabs" role="tablist" aria-label="Match details">
        <button
            type="button"
            role="tab"
            id="tab-scorecard"
            aria-selected={activeTab === 'scorecard'}
            aria-controls="panel-scorecard"
            className={`tab-button ${activeTab === 'scorecard' ? 'active' : ''}`}
            onClick={() => setActiveTab('scorecard')}
            tabIndex={activeTab === 'scorecard' ? 0 : -1}
        >Scorecard</button>
        <button
            type="button"
            role="tab"
            id="tab-commentary"
            aria-selected={activeTab === 'commentary'}
            aria-controls="panel-commentary"
            className={`tab-button ${activeTab === 'commentary' ? 'active' : ''}`}
            onClick={() => setActiveTab('commentary')}
            tabIndex={activeTab === 'commentary' ? 0 : -1}
        >Ball-by-Ball</button>
        <button
            type="button"
            role="tab"
            id="tab-worm"
            aria-selected={activeTab === 'worm'}
            aria-controls="panel-worm"
            className={`tab-button ${activeTab === 'worm' ? 'active' : ''}`}
            onClick={() => setActiveTab('worm')}
            tabIndex={activeTab === 'worm' ? 0 : -1}
        >Worm</button>
      </nav>

      <div className="tab-content">
        {activeTab === 'commentary' && (
             <div id="panel-commentary" role="tabpanel" aria-labelledby="tab-commentary" className="commentary-section">
                <div ref={commentaryContainerRef} className="commentary-box">
                {displayCommentary.length > 0 ? ( displayCommentary.map((ball, idx) => ( <CommentaryItem key={ball.ball_id ?? `comm-${idx}`} ball={ball} /> )) ) : ( <p>Waiting for commentary...</p> )}
                </div>
            </div>
        )}

        {activeTab === 'scorecard' && displayStatus === "Completed" && processedScorecards && (
          <div id="panel-scorecard" role="tabpanel" aria-labelledby="tab-scorecard" className="detailed-scorecards-section">
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

        {activeTab === 'worm' && displayStatus === "Completed" && wormData && processedScorecards && (
          <div id="panel-worm" role="tabpanel" aria-labelledby="tab-worm" className="worm-section">
            <h3 className="worm-title">Worm</h3>
            <div className="worm-chart-wrapper">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={wormData.data} margin={{ top: 12, right: 20, left: 8, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--mpl-grey-300, #555)" />
                  <XAxis dataKey="over" type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fill: 'var(--mpl-text, #e8e8e8)', fontSize: 12 }} label={{ value: 'Overs', position: 'insideBottom', offset: -6, fill: 'var(--mpl-text-muted, #a0a0a0)' }} />
                  <YAxis tick={{ fill: 'var(--mpl-text, #e8e8e8)', fontSize: 12 }} label={{ value: 'Runs', angle: -90, position: 'insideLeft', fill: 'var(--mpl-text-muted, #a0a0a0)' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--mpl-white)', color: 'var(--mpl-text)', border: '1px solid var(--mpl-grey-300)' }} labelFormatter={(v) => `Over ${v}`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} verticalAlign="top" align="right" layout="horizontal" />
                  <Line type="monotone" dataKey={wormData.name1} name={wormData.name1} stroke="var(--mpl-turquoise)" strokeWidth={2} dot={{ r: 4, fill: "var(--mpl-turquoise)" }} connectNulls={false} />
                  <Line type="monotone" dataKey={wormData.name2} name={wormData.name2} stroke="var(--mpl-vanilla)" strokeWidth={2} dot={{ r: 4, fill: "var(--mpl-vanilla)" }} connectNulls={false} />
                  {[
                    ...(processedScorecards.innings1.fallOfWickets || []).map((w) => ({ x: oversToDecimal(w.overs), y: wormYAt(wormData, oversToDecimal(w.overs), wormData.name1), fill: "var(--mpl-turquoise)" })),
                    ...(processedScorecards.innings2.fallOfWickets || []).map((w) => ({ x: oversToDecimal(w.overs), y: wormYAt(wormData, oversToDecimal(w.overs), wormData.name2), fill: "var(--mpl-vanilla)" })),
                  ].map((dot, i) => (
                    <ReferenceDot key={`wicket-${i}`} x={dot.x} y={dot.y} r={8} fill={dot.fill} stroke="var(--mpl-danger, #c53030)" strokeWidth={2} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {activeTab === 'worm' && (displayStatus !== "Completed" || !wormData) && (
          <p style={{ marginTop: '2rem', textAlign: 'center' }}>Worm chart will be available after the match is completed.</p>
        )}
      </div>

      <div className="back-link-container">
        <Link to="/schedule"> <button>← Back to Schedule</button> </Link>
      </div>
    </div>
  );
};

export default MatchDetailPage;