// src/pages/PlayerDetailPage.jsx
// Player Profile: two-column layout (player info left, statistics right), impact points, themed statistics cards, charts.

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    CartesianGrid,
} from 'recharts';
import api from '../services/api';
import LoadingFallback from '../components/LoadingFallback';
import './PlayerDetailPage.css';

const CHART_COLORS = {
    batting: 'var(--mpl-green, #2d8a6e)',
    bowling: 'var(--mpl-teal, #2a9d8f)',
    fielding: 'var(--mpl-green-light, #3db39e)',
    runs: 'var(--mpl-green, #2d8a6e)',
    totalImpact: 'var(--mpl-navy, #0f2847)',
    wickets: 'var(--mpl-teal, #2a9d8f)',
    economy: 'var(--mpl-green-light, #3db39e)',
};

function economyRate(runsConceded, oversBowled) {
    if (oversBowled == null || oversBowled <= 0) return null;
    return parseFloat((runsConceded || 0) / oversBowled).toFixed(2);
}

function PlayerDetailPage() {
   const { id: playerId } = useParams();
   const [player, setPlayer] = useState(null);
   const [stats, setStats] = useState(null);
   const [byMatch, setByMatch] = useState(null);
   const [bySeason, setBySeason] = useState(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');
   const [playerImageError, setPlayerImageError] = useState(false);

   // Fetch player details, stats, by-match, and by-season
   useEffect(() => {
       let isMounted = true;
       const fetchPlayerData = async () => {
           if (!playerId) return;
           setLoading(true);
           setError('');
           setPlayer(null);
           setStats(null);
           setByMatch(null);
           setBySeason(null);
           setPlayerImageError(false);

           try {
               const results = await Promise.all([
                   api.get(`/players/${playerId}`).catch(err => {
                       console.error(`Failed to fetch player details for ${playerId}:`, err);
                       throw { isCritical: true, status: err.response?.status, message: err.response?.data?.message || err.message || 'Failed to load player details.' };
                   }),
                   api.get(`/players/${playerId}/stats`).catch(() => null),
                   api.get(`/players/${playerId}/stats/by-match`, { params: { limit: 5 } }).catch(() => null),
                   api.get(`/players/${playerId}/stats/by-season`, { params: { limit: 5 } }).catch(() => null),
               ]);

               if (isMounted) {
                   setPlayer(results[0]?.data || null);
                   setStats(results[1]?.data || null);
                   setByMatch(results[2]?.data?.matches ?? null);
                   setBySeason(results[3]?.data?.seasons ?? null);
                   if (results[1]?.data == null && results[1] !== undefined) {
                       setError(prev => prev ? `${prev}, Player Stats` : 'Could not load player stats.');
                   }
                   if (!results[0]?.data) {
                        setError(prev => prev ? `${prev}, Invalid player data received.` : 'Invalid player data received.');
                        setPlayer(null);
                   }
               }
           } catch (err) {
               console.error("Failed to fetch player data:", err);
               const errorMessage = err?.message || 'Failed to load player data.';
               if (isMounted) setError(errorMessage);
               if (isMounted) { setPlayer(null); setStats(null); setByMatch(null); setBySeason(null); }
           } finally {
               if (isMounted) setLoading(false);
           }
       };
       fetchPlayerData();
       return () => { isMounted = false; };
   }, [playerId]);

   // Render loading state
   if (loading) return <LoadingFallback />;

   // Render error if player data couldn't be loaded
   if (error && !player) return <div className="error-message" style={{ textAlign: 'center' }}>Error: {error}</div>;

   // Player not found
   if (!player) return <div style={{ textAlign: 'center' }}>Player not found.</div>;

   return (
       <div className="player-detail-page mpl-section">
            {/* Show non-critical errors (like stats failing) if player data loaded */}
            {error && !error.includes('Player not found') && <p className="error-message">Could not load all data: {error}</p>}

            <div className="player-layout">
                 {/* Left Column: Player Profile (name, picture, details) */}
                 <div className="player-info-column">
                     <h1 className="player-name">{player.name || 'Player Name Missing'}</h1>
                     
                     {/* Profile Picture: /images/players/{id}.jpg with letter fallback */}
                     <div className="player-profile-picture">
                         {playerImageError ? (
                             <div className="player-avatar-placeholder">
                                 {(player.name || 'P').charAt(0).toUpperCase()}
                             </div>
                         ) : (
                             <img
                                 src={`/images/players/${player.player_id}.jpg`}
                                 alt={player.name || 'Player'}
                                 onError={() => setPlayerImageError(true)}
                             />
                         )}
                     </div>

                     {/* Player Details: Role, Current Team, Average Impact, Base Price */}
                     <ul className="player-details-list">
                         <li>
                             <span className="detail-label">Role:</span>
                             <span className="detail-value">{player.role || 'N/A'}</span>
                         </li>
                         <li>
                             <span className="detail-label">Current Team:</span>
                             <span className="detail-value">{player.current_team_name || 'Unassigned'}</span>
                         </li>
                         <li>
                             <span className="detail-label">Average Impact:</span>
                             <span className="detail-value">{player.average_impact?.toFixed(2) ?? 'N/A'}</span>
                         </li>
                         <li>
                             <span className="detail-label">Base Price:</span>
                             <span className="detail-value">{player.base_price != null ? `$${parseFloat(player.base_price).toFixed(2)}` : '$0.00'}</span>
                         </li>
                     </ul>
                 </div>

                 {/* Right Column: Statistics and Impact Points */}
                 <div className="player-stats-column">
                     {/* Statistics Section: Batting and Bowling cards */}
                     <section className="player-stats-section">
                         <h2 className="section-title">Statistics (Career)</h2>
                         
                         {stats && stats.matches_played >= 0 ? (
                            <>
                                {/* Batting Statistics Card */}
                                <div className="stats-card mpl-card">
                                    <div className="stats-card-header batting-header">
                                        <span className="stats-card-icon">🏏</span>
                                        <span>Batting Statistics</span>
                                    </div>
                                    <div className="stats-card-content">
                                        <table className="stats-sub-table">
                                            <thead>
                                                <tr>
                                                    <th>Mat</th>
                                                    <th>Runs</th>
                                                    <th>HS</th>
                                                    <th>Avg</th>
                                                    <th>SR</th>
                                                    <th>4s</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>{stats.matches_played ?? '-'}</td>
                                                    <td>{stats.total_runs ?? '-'}</td>
                                                    <td>{stats.highest_score ?? '-'}</td>
                                                    <td>{stats.batting_average_display ?? '-'}</td>
                                                    <td>{stats.batting_strike_rate ?? '-'}</td>
                                                    <td>{stats.total_fours ?? '-'}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Bowling Statistics Card */}
                                {stats.total_overs_bowled != null && stats.total_overs_bowled > 0 && (
                                    <div className="stats-card mpl-card">
                                        <div className="stats-card-header bowling-header">
                                            <span className="stats-card-icon">⚾</span>
                                            <span>Bowling Statistics</span>
                                        </div>
                                        <div className="stats-card-content">
                                            <table className="stats-sub-table">
                                                <thead>
                                                    <tr>
                                                        <th>Matches</th>
                                                        <th>Overs</th>
                                                        <th>Super Overs</th>
                                                        <th>Wkts</th>
                                                        <th>Runs</th>
                                                        <th>Econ</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td>{stats.matches_played ?? '-'}</td>
                                                        <td>{stats.total_overs_bowled != null && !isNaN(parseFloat(stats.total_overs_bowled)) ? parseFloat(stats.total_overs_bowled).toFixed(1) : '-'}</td>
                                                        <td>{stats.super_overs_bowled ?? '-'}</td>
                                                        <td>{stats.total_wickets ?? '-'}</td>
                                                        <td>{stats.total_runs_conceded ?? '-'}</td>
                                                        <td>{stats.bowling_economy_rate ?? '-'}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                         ) : (
                             <p className="no-stats">No detailed statistics available yet.</p>
                         )}
                     </section>

                    {/* Impact Points Section */}
                     <section className="player-impact-section">
                         <h2 className="section-title">Impact Points (Career)</h2>
                         
                         {stats ? (
                             <div className="impact-visual">
                                 <div className="impact-item batting-impact">
                                     <span className="impact-icon">🏏</span>
                                     <span className="impact-text">Batting Impact: {stats.total_batting_impact != null && !isNaN(parseFloat(stats.total_batting_impact)) ? parseFloat(stats.total_batting_impact).toFixed(1) : '0.0'}</span>
                                 </div>
                                 <div className="impact-item bowling-impact">
                                     <span className="impact-icon">⚾</span>
                                     <span className="impact-text">Bowling Impact: {stats.total_bowling_impact != null && !isNaN(parseFloat(stats.total_bowling_impact)) ? parseFloat(stats.total_bowling_impact).toFixed(1) : '0.0'}</span>
                                 </div>
                                 <div className="impact-item fielding-impact">
                                     <span className="impact-icon">👤</span>
                                     <span className="impact-text">Fielding Impact: {stats.total_fielding_impact != null && !isNaN(parseFloat(stats.total_fielding_impact)) ? parseFloat(stats.total_fielding_impact).toFixed(1) : '0.0'}</span>
                                 </div>
                             </div>
                         ) : (
                             <p className="no-stats">Impact point data not available.</p>
                         )}
                     </section>

                    {/* Charts: Last 5 matches batting, last 5 matches impact, last 5 seasons impact, career impact breakdown */}
                    <section className="player-charts-section">
                        <h2 className="section-title">Performance Charts</h2>
                        <div className="player-detail-charts">
                            {byMatch && byMatch.length > 0 && (
                                <>
                                    <div className="chart-card mpl-card">
                                        <h3 className="chart-title">Last {byMatch.length} Matches – Batting (Runs)</h3>
                                        <div className="chart-wrapper">
                                            <ResponsiveContainer width="100%" height={220}>
                                                <BarChart data={[...byMatch].reverse().map((m, i) => ({ name: `Match ${i + 1}`, runs: m.runs_scored ?? 0, balls: m.balls_faced ?? 0, fours: m.fours ?? 0 }))} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--mpl-grey-300, #d0d0d0)" />
                                                    <XAxis dataKey="name" tick={{ fill: 'var(--mpl-text, #1a1a1a)', fontSize: 12 }} />
                                                    <YAxis tick={{ fill: 'var(--mpl-text, #1a1a1a)', fontSize: 12 }} />
                                                    <Tooltip contentStyle={{ backgroundColor: 'var(--mpl-white)', color: 'var(--mpl-text)', border: '1px solid var(--mpl-grey-300)' }} formatter={(value, name) => [value, name === 'runs' ? 'Runs' : name === 'balls' ? 'Balls' : '4s']} />
                                                    <Bar dataKey="runs" name="Runs" fill={CHART_COLORS.runs} radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="chart-card mpl-card">
                                        <h3 className="chart-title">Last {byMatch.length} Matches – Impact (per match)</h3>
                                        <div className="chart-wrapper">
                                            <ResponsiveContainer width="100%" height={220}>
                                                <BarChart data={[...byMatch].reverse().map((m, i) => ({ name: `Match ${i + 1}`, Bat: m.batting_impact_points ?? 0, Bowl: m.bowling_impact_points ?? 0, Field: m.fielding_impact_points ?? 0, Total: (m.batting_impact_points ?? 0) + (m.bowling_impact_points ?? 0) + (m.fielding_impact_points ?? 0) }))} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--mpl-grey-300)" />
                                                    <XAxis dataKey="name" tick={{ fill: 'var(--mpl-text)', fontSize: 12 }} />
                                                    <YAxis tick={{ fill: 'var(--mpl-text)', fontSize: 12 }} />
                                                    <Tooltip contentStyle={{ backgroundColor: 'var(--mpl-white)', color: 'var(--mpl-text)', border: '1px solid var(--mpl-grey-300)' }} />
                                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                                    <Bar dataKey="Bat" stackId="a" fill={CHART_COLORS.batting} radius={[0, 0, 0, 0]} />
                                                    <Bar dataKey="Bowl" stackId="a" fill={CHART_COLORS.bowling} radius={[0, 0, 0, 0]} />
                                                    <Bar dataKey="Field" stackId="a" fill={CHART_COLORS.fielding} radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="chart-card mpl-card">
                                        <h3 className="chart-title">Last {byMatch.length} Matches – Bowling (Wickets)</h3>
                                        <div className="chart-wrapper">
                                            <ResponsiveContainer width="100%" height={220}>
                                                <BarChart data={[...byMatch].reverse().map((m, i) => ({ name: `Match ${i + 1}`, wickets: m.wickets_taken ?? 0 }))} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--mpl-grey-300)" />
                                                    <XAxis dataKey="name" tick={{ fill: 'var(--mpl-text)', fontSize: 12 }} />
                                                    <YAxis tick={{ fill: 'var(--mpl-text)', fontSize: 12 }} allowDecimals={false} />
                                                    <Tooltip contentStyle={{ backgroundColor: 'var(--mpl-white)', color: 'var(--mpl-text)', border: '1px solid var(--mpl-grey-300)' }} />
                                                    <Bar dataKey="wickets" name="Wickets" fill={CHART_COLORS.wickets} radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="chart-card mpl-card">
                                        <h3 className="chart-title">Last {byMatch.length} Matches – Bowling (Economy)</h3>
                                        <div className="chart-wrapper">
                                            <ResponsiveContainer width="100%" height={220}>
                                                <BarChart data={[...byMatch].reverse().map((m, i) => ({ name: `Match ${i + 1}`, economy: economyRate(m.runs_conceded, m.overs_bowled) != null ? parseFloat(economyRate(m.runs_conceded, m.overs_bowled)) : 0, runs: m.runs_conceded ?? 0, overs: m.overs_bowled ?? 0 }))} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--mpl-grey-300)" />
                                                    <XAxis dataKey="name" tick={{ fill: 'var(--mpl-text)', fontSize: 12 }} />
                                                    <YAxis tick={{ fill: 'var(--mpl-text)', fontSize: 12 }} />
                                                    <Tooltip contentStyle={{ backgroundColor: 'var(--mpl-white)', color: 'var(--mpl-text)', border: '1px solid var(--mpl-grey-300)' }} formatter={(value, name) => [name === 'economy' ? parseFloat(value).toFixed(2) : value, name === 'economy' ? 'Economy' : name === 'runs' ? 'Runs conceded' : 'Overs']} />
                                                    <Bar dataKey="economy" name="Economy" fill={CHART_COLORS.economy} radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </>
                            )}
                            {bySeason && bySeason.length > 0 && (
                                <div className="chart-card mpl-card">
                                    <h3 className="chart-title">Last {bySeason.length} Seasons – Total Impact</h3>
                                    <div className="chart-wrapper">
                                        <ResponsiveContainer width="100%" height={220}>
                                            <BarChart data={[...bySeason].reverse().map((s, i) => ({ name: s.name || `Season ${s.year}`, impact: s.total_impact ?? 0, runs: s.total_runs ?? 0 }))} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--mpl-grey-300)" />
                                                <XAxis dataKey="name" tick={{ fill: 'var(--mpl-text)', fontSize: 11 }} />
                                                <YAxis tick={{ fill: 'var(--mpl-text)', fontSize: 12 }} />
                                                <Tooltip contentStyle={{ backgroundColor: 'var(--mpl-white)', color: 'var(--mpl-text)', border: '1px solid var(--mpl-grey-300)' }} formatter={(value, name) => [value, name === 'impact' ? 'Impact' : 'Runs']} />
                                                <Bar dataKey="impact" name="Impact" fill={CHART_COLORS.totalImpact} radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}
                            {bySeason && bySeason.length > 0 && (
                                <>
                                    <div className="chart-card mpl-card">
                                        <h3 className="chart-title">Last {bySeason.length} Seasons – Batting (Runs)</h3>
                                        <div className="chart-wrapper">
                                            <ResponsiveContainer width="100%" height={220}>
                                                <BarChart data={[...bySeason].reverse().map((s) => ({ name: s.name || `Season ${s.year}`, runs: s.total_runs ?? 0 }))} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--mpl-grey-300)" />
                                                    <XAxis dataKey="name" tick={{ fill: 'var(--mpl-text)', fontSize: 11 }} />
                                                    <YAxis tick={{ fill: 'var(--mpl-text)', fontSize: 12 }} />
                                                    <Tooltip contentStyle={{ backgroundColor: 'var(--mpl-white)', color: 'var(--mpl-text)', border: '1px solid var(--mpl-grey-300)' }} />
                                                    <Bar dataKey="runs" name="Runs" fill={CHART_COLORS.runs} radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="chart-card mpl-card">
                                        <h3 className="chart-title">Last {bySeason.length} Seasons – Batting (Strike rate)</h3>
                                        <div className="chart-wrapper">
                                            <ResponsiveContainer width="100%" height={220}>
                                                <BarChart data={[...bySeason].reverse().map((s) => {
                                                    const runs = s.total_runs ?? 0;
                                                    const balls = s.total_balls_faced ?? 0;
                                                    const sr = balls > 0 ? parseFloat(((runs / balls) * 100).toFixed(2)) : 0;
                                                    return { name: s.name || `Season ${s.year}`, strikeRate: sr, runs, balls };
                                                })} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--mpl-grey-300)" />
                                                    <XAxis dataKey="name" tick={{ fill: 'var(--mpl-text)', fontSize: 11 }} />
                                                    <YAxis tick={{ fill: 'var(--mpl-text)', fontSize: 12 }} />
                                                    <Tooltip contentStyle={{ backgroundColor: 'var(--mpl-white)', color: 'var(--mpl-text)', border: '1px solid var(--mpl-grey-300)' }} formatter={(value, name) => [name === 'strikeRate' ? `${parseFloat(value).toFixed(2)}` : value, name === 'strikeRate' ? 'Strike rate' : name === 'runs' ? 'Runs' : 'Balls']} />
                                                    <Bar dataKey="strikeRate" name="Strike rate" fill={CHART_COLORS.batting} radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </>
                            )}
                            {bySeason && bySeason.length > 0 && (() => {
                                const hasBowling = bySeason.some(s => (s.total_overs_bowled ?? 0) > 0);
                                if (!hasBowling) return null;
                                return (
                                    <>
                                        <div className="chart-card mpl-card">
                                            <h3 className="chart-title">Last {bySeason.length} Seasons – Bowling (Wickets)</h3>
                                            <div className="chart-wrapper">
                                                <ResponsiveContainer width="100%" height={220}>
                                                    <BarChart data={[...bySeason].reverse().map((s) => ({ name: s.name || `Season ${s.year}`, wickets: s.total_wickets ?? 0 }))} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--mpl-grey-300)" />
                                                        <XAxis dataKey="name" tick={{ fill: 'var(--mpl-text)', fontSize: 11 }} />
                                                        <YAxis tick={{ fill: 'var(--mpl-text)', fontSize: 12 }} allowDecimals={false} />
                                                        <Tooltip contentStyle={{ backgroundColor: 'var(--mpl-white)', color: 'var(--mpl-text)', border: '1px solid var(--mpl-grey-300)' }} />
                                                        <Bar dataKey="wickets" name="Wickets" fill={CHART_COLORS.wickets} radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                        <div className="chart-card mpl-card">
                                            <h3 className="chart-title">Last {bySeason.length} Seasons – Bowling (Economy)</h3>
                                            <div className="chart-wrapper">
                                                <ResponsiveContainer width="100%" height={220}>
                                                    <BarChart data={[...bySeason].reverse().map((s) => {
                                                        const overs = s.total_overs_bowled ?? 0;
                                                        const econ = overs > 0 ? parseFloat(((s.total_runs_conceded ?? 0) / overs).toFixed(2)) : 0;
                                                        return { name: s.name || `Season ${s.year}`, economy: econ, runs: s.total_runs_conceded ?? 0, overs };
                                                    })} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--mpl-grey-300)" />
                                                        <XAxis dataKey="name" tick={{ fill: 'var(--mpl-text)', fontSize: 11 }} />
                                                        <YAxis tick={{ fill: 'var(--mpl-text)', fontSize: 12 }} />
                                                        <Tooltip contentStyle={{ backgroundColor: 'var(--mpl-white)', color: 'var(--mpl-text)', border: '1px solid var(--mpl-grey-300)' }} formatter={(value, name) => [name === 'economy' ? parseFloat(value).toFixed(2) : value, name === 'economy' ? 'Economy' : name === 'runs' ? 'Runs conceded' : 'Overs']} />
                                                        <Bar dataKey="economy" name="Economy" fill={CHART_COLORS.economy} radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                            {stats && (() => {
                                const careerPieData = [
                                    { name: 'Batting', value: Math.max(0, parseFloat(stats.total_batting_impact) || 0), color: CHART_COLORS.batting },
                                    { name: 'Bowling', value: Math.max(0, parseFloat(stats.total_bowling_impact) || 0), color: CHART_COLORS.bowling },
                                    { name: 'Fielding', value: Math.max(0, parseFloat(stats.total_fielding_impact) || 0), color: CHART_COLORS.fielding },
                                ].filter(d => d.value > 0);
                                if (careerPieData.length === 0) return null;
                                return (
                                    <div className="chart-card mpl-card chart-card-pie">
                                        <h3 className="chart-title">Career Impact Breakdown</h3>
                                        <div className="chart-wrapper chart-wrapper-pie">
                                            <ResponsiveContainer width="100%" height={240}>
                                                <PieChart>
                                                    <Pie
                                                        data={careerPieData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={56}
                                                        outerRadius={80}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                        nameKey="name"
                                                        label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                                                    >
                                                        {careerPieData.map((entry) => (
                                                            <Cell key={entry.name} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ backgroundColor: 'var(--mpl-white)', color: 'var(--mpl-text)', border: '1px solid var(--mpl-grey-300)' }} formatter={(value) => [parseFloat(value).toFixed(1), 'Impact']} />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                );
                            })()}
                            {(!byMatch || byMatch.length === 0) && (!bySeason || bySeason.length === 0) && (!stats || (parseFloat(stats.total_batting_impact) || 0) + (parseFloat(stats.total_bowling_impact) || 0) + (parseFloat(stats.total_fielding_impact) || 0) === 0) && (
                                <p className="no-stats">No chart data available yet.</p>
                            )}
                        </div>
                    </section>
                 </div>
            </div>

            {/* Back to Players List button */}
            <div className="back-button-wrapper">
                <Link to="/players" className="mpl-btn-primary back-button">Back to Players List</Link>
            </div>
       </div>
   );
}

export default PlayerDetailPage;
