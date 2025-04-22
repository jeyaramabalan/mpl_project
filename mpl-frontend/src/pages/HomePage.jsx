// src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import LoadingFallback from '../components/LoadingFallback';
import './HomePage.css'; // Import CSS for styling
// import mplLogo from '../assets/mpl-logo.png'; // <-- Import your logo here (adjust path)

function HomePage() {
    const [nextMatch, setNextMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;
        // Defined the function to fetch the match
        const fetchNextMatch = async () => {
            setLoading(true);
            setError('');
            try {
                const { data } = await api.get('/matches?status=Scheduled');

                if (isMounted) {
                    if (data && data.length > 0) {
                        const sortedMatches = data.sort((a, b) => new Date(a.match_datetime) - new Date(b.match_datetime));
                        setNextMatch(sortedMatches[0]);
                    } else {
                        setNextMatch(null);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch next match:", err);
                if (isMounted) setError('Could not load upcoming match info.');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        // Correctly call the defined function
        fetchNextMatch();

        return () => { isMounted = false; };
    }, []); // Empty dependency array ensures this runs only once on mount

    return (
        <div className="home-page">

            {/* Section 1: Welcome & Logo */}
            <section className="welcome-section">
                 {/* Uncomment and adjust path when you have a logo */}
                 {/* <div className="logo-container">
                     <img src={mplLogo} alt="MPL Logo" className="home-logo" />
                 </div> */}
                 <h1>Welcome to the Metalworks Premier League (MPL)!</h1>
                 <p className="tagline">Fostering Community Spirit Through Box Cricket.</p>
                 <p>The MPL aims to organize an engaging and competitive Box Cricket tournament each summer for the residents of Metalworks and nearby apartments.</p>
            </section>

            <hr className="home-divider" />

            {/* Section 2: Upcoming Match / Live Match Indicator */}
            <section className="next-match-section">
                <h2>Next Match</h2>
                {loading && <LoadingFallback />}
                {error && <p className="error-message">{error}</p>}
                {!loading && !error && nextMatch ? (
                    <div className="match-card">
                        <p className="match-teams">{nextMatch.team1_name} vs {nextMatch.team2_name}</p>
                        <p className="match-time">{new Date(nextMatch.match_datetime).toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'})}</p>
                        <p className="match-venue">Venue: {nextMatch.venue}</p>
                        <Link to={`/matches/${nextMatch.match_id}`}>
                            <button className="details-button">View Details</button>
                        </Link>
                    </div>
                ) : (
                    !loading && !error && <p>No upcoming matches scheduled currently.</p>
                )}
                 {/* TODO: Add logic here to check for LIVE matches and display a link/indicator */}
            </section>

            <hr className="home-divider" />

            {/* Section 3: Quick Links */}
            <section className="quick-links-section">
                 <h2>Quick Links</h2>
                 <ul>
                     <li><Link to="/schedule">View Full Schedule & Results</Link></li>
                     <li><Link to="/standings">View Team Standings</Link></li>
                     <li><Link to="/leaderboard">View Player Leaderboards</Link></li>
                     <li><Link to="/players">Browse Players</Link></li>
                     {/* Add link to rules page if you create one */}
                 </ul>
            </section>

        </div>
    );
}
export default HomePage;