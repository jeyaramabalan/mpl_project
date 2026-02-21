// src/pages/PlayerDetailPage.jsx
// Player Profile: two-column layout (player info left, statistics right), impact points, themed statistics cards.

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import LoadingFallback from '../components/LoadingFallback';
import './PlayerDetailPage.css';

function PlayerDetailPage() {
   const { id: playerId } = useParams();
   const [player, setPlayer] = useState(null);
   const [stats, setStats] = useState(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');

   // Fetch player details and stats
   useEffect(() => {
       let isMounted = true;
       const fetchPlayerData = async () => {
           if (!playerId) return;
           setLoading(true);
           setError('');
           setPlayer(null);
           setStats(null);

           try {
               console.log(`Fetching data for player ID: ${playerId}`);

               const results = await Promise.all([
                   api.get(`/players/${playerId}`).catch(err => {
                       console.error(`Failed to fetch player details for ${playerId}:`, err);
                       throw { isCritical: true, status: err.response?.status, message: err.response?.data?.message || err.message || 'Failed to load player details.' };
                   }),
                   api.get(`/players/${playerId}/stats`).catch(err => {
                       console.warn(`Could not fetch player stats for ${playerId}:`, err.message);
                       if(isMounted) setError(prev => prev ? `${prev}, Player Stats` : 'Could not load player stats.');
                       return null;
                   })
               ]);

               if (isMounted) {
                   const playerRes = results[0];
                   const statsRes = results[1];

                   setPlayer(playerRes?.data || null);
                   setStats(statsRes?.data || null);

                   if (!playerRes?.data) {
                        setError(prev => prev ? `${prev}, Invalid player data received.` : 'Invalid player data received.');
                        setPlayer(null);
                   }
               }
           } catch (err) {
               console.error("Failed to fetch player data:", err);
               const errorMessage = err?.message || 'Failed to load player data.';
               if (isMounted) setError(errorMessage);
               if (isMounted) { setPlayer(null); setStats(null); }
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
                     
                     {/* Profile Picture: circular image placeholder (add image URL when available) */}
                     <div className="player-profile-picture">
                         {player.profile_image_url ? (
                             <img src={player.profile_image_url} alt={player.name} />
                         ) : (
                             <div className="player-avatar-placeholder">
                                 {(player.name || 'P').charAt(0).toUpperCase()}
                             </div>
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
                                        {/* Batting sub-table */}
                                        <table className="stats-sub-table">
                                            <thead>
                                                <tr>
                                                    <th>Mat</th>
                                                    <th>Runs</th>
                                                    <th>HS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>{stats.matches_played ?? '-'}</td>
                                                    <td>{stats.total_runs ?? '-'}</td>
                                                    <td>{stats.highest_score ?? '-'}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        
                                        {/* Bowling sub-table (within Batting card) */}
                                        <table className="stats-sub-table">
                                            <thead>
                                                <tr>
                                                    <th>Mat</th>
                                                    <th>Avg</th>
                                                    <th>SR</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>{stats.matches_played ?? '-'}</td>
                                                    <td>{stats.batting_average_display ?? '-'}</td>
                                                    <td>{stats.batting_strike_rate ?? '-'}</td>
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
                                            {/* Batting stats sub-table (within Bowling card) */}
                                            <table className="stats-sub-table">
                                                <thead>
                                                    <tr>
                                                        <th>Runs</th>
                                                        <th>Runs</th>
                                                        <th>SR</th>
                                                        <th>4s</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td>{stats.total_runs ?? '-'}</td>
                                                        <td>{stats.total_runs ?? '-'}</td>
                                                        <td>{stats.batting_strike_rate ?? '-'}</td>
                                                        <td>{stats.total_fours ?? '-'}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            
                                            {/* Bowling sub-table */}
                                            <table className="stats-sub-table">
                                                <thead>
                                                    <tr>
                                                        <th>Overs Bowled</th>
                                                        <th>Wkts</th>
                                                        <th>Econ</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td>{stats.total_overs_bowled != null && !isNaN(parseFloat(stats.total_overs_bowled)) ? parseFloat(stats.total_overs_bowled).toFixed(1) : '-'}</td>
                                                        <td>{stats.total_wickets ?? '-'}</td>
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
                             <>
                                 {/* Impact values list */}
                                 <ul className="impact-list">
                                     <li>
                                         <span className="impact-label">Batting Impact:</span>
                                         <span className="impact-value">{stats.total_batting_impact != null && !isNaN(parseFloat(stats.total_batting_impact)) ? parseFloat(stats.total_batting_impact).toFixed(1) : '0.0'}</span>
                                     </li>
                                     <li>
                                         <span className="impact-label">Bowling Impact:</span>
                                         <span className="impact-value">{stats.total_bowling_impact != null && !isNaN(parseFloat(stats.total_bowling_impact)) ? parseFloat(stats.total_bowling_impact).toFixed(1) : '0.0'}</span>
                                     </li>
                                     <li>
                                         <span className="impact-label">Fielding Impact:</span>
                                         <span className="impact-value">{stats.total_fielding_impact != null && !isNaN(parseFloat(stats.total_fielding_impact)) ? parseFloat(stats.total_fielding_impact).toFixed(1) : '0.0'}</span>
                                     </li>
                                 </ul>

                                 {/* Visual impact representations with icons */}
                                 <div className="impact-visual">
                                     <div className="impact-item batting-impact">
                                         <span className="impact-icon">🏏</span>
                                         <span className="impact-text">Batting Impact: {stats.total_batting_impact != null && !isNaN(parseFloat(stats.total_batting_impact)) ? parseFloat(stats.total_batting_impact).toFixed(1) : '0.0'}</span>
                                     </div>
                                     <div className="impact-item fielding-impact">
                                         <span className="impact-icon">👤</span>
                                         <span className="impact-text">Fielding Impact: {stats.total_fielding_impact != null && !isNaN(parseFloat(stats.total_fielding_impact)) ? parseFloat(stats.total_fielding_impact).toFixed(1) : '0.0'}</span>
                                     </div>
                                 </div>
                             </>
                         ) : (
                             <p className="no-stats">Impact point data not available.</p>
                         )}
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
