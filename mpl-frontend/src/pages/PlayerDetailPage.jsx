// src/pages/PlayerDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import LoadingFallback from '../components/LoadingFallback';
import './PlayerDetailPage.css'; // Ensure this CSS file exists

function PlayerDetailPage() {
   const { id: playerId } = useParams();
   const [player, setPlayer] = useState(null);
   const [stats, setStats] = useState(null);
   // Keep ratings state in case needed later, but don't fetch/display now
   const [ratings, setRatings] = useState({ average_rating: null, total_ratings: 0 });
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');

   useEffect(() => {
       let isMounted = true;
       const fetchPlayerData = async () => {
           if (!playerId) return;
           // --- Keep the reset logic ---
           setLoading(true); setError(''); setPlayer(null); setStats(null);
           // Removed ratings reset

           try {
               console.log(`Fetching data for player ID: ${playerId}`);

               // --- MODIFIED Promise.all handling ---
               const results = await Promise.all([
                   api.get(`/players/${playerId}`).catch(err => {
                       console.error(`Failed to fetch player details for ${playerId}:`, err);
                       // If player details fail, it's a critical error for this page
                       // We'll throw an error object that the outer catch can handle
                       // Include status if available from the error response
                       throw { isCritical: true, status: err.response?.status, message: err.response?.data?.message || err.message || 'Failed to load player details.' };
                   }),
                   api.get(`/players/${playerId}/stats`).catch(err => {
                       console.warn(`Could not fetch player stats for ${playerId}:`, err.message);
                       // If stats fail, log a warning but allow page to render with basic info
                       if(isMounted) setError(prev => prev ? `${prev}, Player Stats` : 'Could not load player stats.');
                       return null; // Indicate failure for stats call
                   })
                   // Ratings call is already commented out
               ]);

               // results array will contain [playerResponse, statsResponseOrNull]
               // This part only runs if the first promise (player details) succeeded
               if (isMounted) {
                   const playerRes = results[0]; // Should always exist if code reaches here
                   const statsRes = results[1];   // Might be null if stats call failed

                   console.log("Raw playerRes:", playerRes);
                   console.log("Raw statsRes:", statsRes); // Log for debugging

                   // Set state using optional chaining for safety
                   setPlayer(playerRes?.data || null); // Should have data if we got here
                   setStats(statsRes?.data || null);   // Will be null if stats call failed

                   // If primary player data failed somehow (should have been caught), set error
                   if (!playerRes?.data) {
                        setError(prev => prev ? `${prev}, Invalid player data received.` : 'Invalid player data received.');
                        setPlayer(null);
                   }
               }
           } catch (err) {
               // Catch errors from Promise.all (specifically the critical player fetch) or other sync errors
               console.error("Failed to fetch player data (outer catch):", err);
               // Use message from thrown error if available (like from the critical player fetch failure)
               const errorMessage = err?.message || 'Failed to load player data.';
               if (isMounted) setError(errorMessage);
               // Ensure state is reset on critical error
               if (isMounted) { setPlayer(null); setStats(null); }
           } finally {
               if (isMounted) setLoading(false);
           }
       };
       fetchPlayerData();
       return () => { isMounted = false; };
   }, [playerId]);


   // --- Render Logic ---
   if (loading) return <LoadingFallback />;

   // If there was an error AND player data couldn't be loaded at all (player is null)
   if (error && !player) return <div className="error-message" style={{ textAlign: 'center' }}>Error: {error}</div>;

   // If loading finished but player is still null (e.g., 404 not found error was set)
   if (!player) return <div style={{ textAlign: 'center' }}>Player not found.</div>;

   // Player data exists, proceed with rendering
   return (
       <div className="player-detail-page">
            {/* Show non-critical errors (like stats failing) if player data loaded */}
            {error && !error.includes('Player not found') && <p className="error-message">Could not load all data: {error}</p>}

            <div className="player-layout">
                 <div className="player-info-column">
                     <h1>{player.name || 'Player Name Missing'}</h1>
                     <ul className="player-details-list">
                         <li><span className="detail-label">Role:</span><span className="detail-value">{player.role || 'N/A'}</span></li>
                         <li><span className="detail-label">Current Team:</span><span className="detail-value">{player.current_team_name || 'Unassigned'}</span></li>
                         <li><span className="detail-label">Average Impact:</span><span className="detail-value">{player.average_impact?.toFixed(2) ?? 'N/A'}</span></li>
                         <li><span className="detail-label">Base Price:</span><span className="detail-value">{player.base_price != null ? `$${parseFloat(player.base_price).toFixed(2)}` : 'N/A'}</span></li>
                     </ul>
                 </div>

                 <div className="player-stats-column">
                     <section className="player-stats-section">
                         <h2>Statistics (Career)</h2>
                         {/* Check if stats object exists AND matches were played */}
                         {stats && stats.matches_played >= 0 ? (
                            <div className="table-responsive">
                                <table className="stats-table">
                                    <thead>
                                        <tr><th colSpan="6">Batting</th></tr>
                                        <tr><th>Mat</th><th>Runs</th><th>HS</th><th>Avg</th><th>SR</th><th>4s</th></tr>
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
                                    {/* Bowling Section (Conditional) */}
                                    {stats.total_overs_bowled != null && stats.total_overs_bowled > 0 && (
                                        <>
                                            <thead>
                                                <tr><th colSpan="7">Bowling</th></tr> {/* Adjusted colspan */}
                                                <tr><th>Mat</th><th>Overs</th><th>SO Bowled</th><th>Runs</th><th>Wkts</th><th>Econ</th></tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>{stats.matches_played ?? '-'}</td>
                                                    <td>{stats.total_overs_bowled != null && !isNaN(parseFloat(stats.total_overs_bowled)) ? parseFloat(stats.total_overs_bowled).toFixed(1) : '-'}</td>
                                                    <td>{stats.super_overs_bowled ?? '0'}</td>
                                                    <td>{stats.total_runs_conceded ?? '-'}</td>
                                                    <td>{stats.total_wickets ?? '-'}</td>
                                                    <td>{stats.bowling_economy_rate ?? '-'}</td>
                                                </tr>
                                            </tbody>
                                        </>
                                     )}
                                </table>
                            </div>
                         ) : (
                             <p>No detailed statistics available yet.</p>
                         )}
                     </section>

                    <hr className="section-divider" />

                     <section className="player-rating-section">
                         <h2>Impact Points (Career)</h2>
                         {stats ? (
                             <ul className="player-details-list">
                                 <li>
                                     <span className="detail-label">Batting Impact:</span>
                                     <span className="detail-value">{stats.total_batting_impact != null && !isNaN(parseFloat(stats.total_batting_impact)) ? parseFloat(stats.total_batting_impact).toFixed(1) : '0.0'}</span>
                                 </li>
                                 <li>
                                     <span className="detail-label">Bowling Impact:</span>
                                     <span className="detail-value">{stats.total_bowling_impact != null && !isNaN(parseFloat(stats.total_bowling_impact)) ? parseFloat(stats.total_bowling_impact).toFixed(1) : '0.0'}</span>
                                 </li>
                                 <li>
                                     <span className="detail-label">Fielding Impact:</span>
                                     <span className="detail-value">{stats.total_fielding_impact != null && !isNaN(parseFloat(stats.total_fielding_impact)) ? parseFloat(stats.total_fielding_impact).toFixed(1) : '0.0'}</span>
                                 </li>
                             </ul>
                         ) : (
                             <p>Impact point data not available.</p>
                         )}
                     </section>
                 </div>
            </div>

            <Link to="/players" className="back-link">← Back to Players List</Link>
       </div>
   );
}

export default PlayerDetailPage;