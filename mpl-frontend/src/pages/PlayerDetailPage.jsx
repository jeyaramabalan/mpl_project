// mpl-project/mpl-frontend/src/pages/PlayerDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import LoadingFallback from '../components/LoadingFallback';

function PlayerDetailPage() {
   const { id: playerId } = useParams(); // Get player ID from URL parameter
   const [player, setPlayer] = useState(null);
   const [stats, setStats] = useState(null); // Holds aggregated stats
   const [ratings, setRatings] = useState({ average_rating: null, total_ratings: 0 }); // Holds rating info
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');

   // TODO: State for selected season to view stats/ratings for
   // const [selectedSeason, setSelectedSeason] = useState('career'); // 'career' or season_id

   useEffect(() => {
       const fetchPlayerData = async () => {
           if (!playerId) return;
           setLoading(true);
           setError('');
           try {
               console.log(`Fetching data for player ID: ${playerId}`);
               // Fetch player details, career stats, and career average rating in parallel
               const [playerRes, statsRes, ratingRes] = await Promise.all([
                   api.get(`/players/${playerId}`),
                   api.get(`/players/${playerId}/stats`), // Fetch career stats by default
                   api.get(`/ratings/player/${playerId}/average`) // Fetch career average rating
               ]);

               console.log("Player data fetched:", playerRes.data);
               console.log("Stats data fetched:", statsRes.data);
                console.log("Rating data fetched:", ratingRes.data);

               setPlayer(playerRes.data);
               setStats(statsRes.data);
               setRatings(ratingRes.data);

           } catch (err) {
               console.error("Failed to fetch player data:", err);
                const errorMessage = typeof err === 'string' ? err : (err.response?.status === 404 ? 'Player not found.' : (err.message || 'Failed to load player data.'));
                setError(errorMessage);
                // If 404, clear potentially stale data
                if (err.response?.status === 404) {
                   setPlayer(null);
                   setStats(null);
                   setRatings({ average_rating: null, total_ratings: 0 });
                }
           } finally {
               setLoading(false);
           }
       };

       fetchPlayerData();
   }, [playerId]); // Re-run effect if the player ID changes

   // --- TODO: Function to fetch stats/ratings for a specific season ---
   // const fetchSeasonData = async (seasonId) => { ... }


   // --- Render Logic ---
   if (loading) return <LoadingFallback />;
   if (error && !player) return <div className="error-message">Error: {error}</div>; // Show error only if player couldn't load at all

    // Handle case where player exists but might have errors loading stats/ratings
    if (!player) {
         return <div className="error-message">Player not found.</div>;
    }


   return (
       <div>
           <h1>{player.name}</h1>
            {error && <p className="error-message">Could not load all data: {error}</p>} {/* Show non-critical errors */}
           <p><strong>Role:</strong> {player.role || 'N/A'}</p>
           <p><strong>Email:</strong> {player.email || 'N/A'}</p>
           <p><strong>Phone:</strong> {player.phone || 'N/A'}</p>
           <p>
     <strong>Base Price:</strong> {
         // Check if base_price exists and is not null/undefined
         player.base_price != null
             // If it exists, try parsing it as a float
             ? !isNaN(parseFloat(player.base_price)) // Check if parsing results in a valid number
                 // If valid number, format it; otherwise show 'Invalid' or 'N/A'
                 ? `$${parseFloat(player.base_price).toFixed(2)}`
                 : 'Invalid Price Data'
             // If base_price was null/undefined initially, show 'N/A'
             : 'N/A'
         }
        </p>

           <hr />

           {/* TODO: Add Season Selector Dropdown */}
           {/* <select onChange={(e) => setSelectedSeason(e.target.value)} value={selectedSeason}>
               <option value="career">Career Stats</option>
                Fetch seasons list here
           </select> */}

           <h2>Statistics (Career)</h2>
           {stats ? (
                <table>
                   <thead>
                       <tr>
                           <th>Matches</th>
                           <th>Runs</th>
                           <th>Avg</th>
                           <th>SR</th>
                           <th>Wkts</th>
                           <th>Econ</th>
                           {/* Add more headers: 4s, 6s, Bowl Avg, Bowl SR, Catches etc. */}
                       </tr>
                   </thead>
                   <tbody>
                       <tr>
                           <td>{stats.matches_played ?? '-'}</td>
                           <td>{stats.total_runs ?? '-'}</td>
                           <td>{stats.batting_average_display ?? '-'}</td>
                           <td>{stats.batting_strike_rate ?? '-'}</td>
                           <td>{stats.total_wickets ?? '-'}</td>
                           <td>{stats.bowling_economy_rate ?? '-'}</td>
                            {/* Add more data cells */}
                       </tr>
                   </tbody>
                </table>
           ) : (
               <p>No statistics available yet.</p>
           )}

           <hr />

            <h2>Player Rating (Career)</h2>
            {ratings.total_ratings > 0 ? (
                <p>
                   Average Rating: <strong>{ratings.average_rating} / 5</strong> (based on {ratings.total_ratings} rating{ratings.total_ratings === 1 ? '' : 's'})
                </p>
            ) : (
                <p>No ratings submitted yet.</p>
            )}

            {/* --- TODO: Implement Rating Submission --- */}
            {/* This section requires player authentication */}
            {/* <div>
               <h3>Rate this player (Season X):</h3>
               <form onSubmit={handleRatingSubmit}>
                    Star rating component
                    Comment textarea
                   <button type="submit">Submit Rating</button>
               </form>
            </div> */}

            {/* TODO: Display list of ratings received (if needed) */}

            {/* TODO: Add link to player's match history? */}

            <Link to="/players" style={{ display: 'block', marginTop: '1.5rem' }}>&larr; Back to Players List</Link>
       </div>
   );
}

export default PlayerDetailPage;