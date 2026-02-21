// src/pages/HomePage.jsx
// Landing page: hero, upcoming match cards, next match strip, quick access cards, news & updates.
// Fetches scheduled matches from API for hero strip, match cards, and next match.

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import LoadingFallback from '../components/LoadingFallback';
import './HomePage.css';

function HomePage() {
    const [matches, setMatches] = useState([]);
    const [liveMatches, setLiveMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;
        const fetchMatches = async () => {
            setLoading(true);
            setError('');
            try {
                const { data } = await api.get('/matches', { params: { status: 'Scheduled' } });
                if (isMounted && data && Array.isArray(data)) {
                    const sorted = [...data].sort((a, b) => new Date(a.match_datetime) - new Date(b.match_datetime));
                    setMatches(sorted);
                } else if (isMounted) {
                    setMatches([]);
                }
            } catch (err) {
                console.error('Failed to fetch matches:', err);
                if (isMounted) setError('Could not load upcoming matches.');
                setMatches([]);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchMatches();
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        let isMounted = true;
        const fetchLive = async () => {
            try {
                const { data } = await api.get('/matches', { params: { status: 'Live' } });
                if (isMounted && data && Array.isArray(data)) setLiveMatches(data);
                else if (isMounted) setLiveMatches([]);
            } catch {
                if (isMounted) setLiveMatches([]);
            }
        };
        fetchLive();
        const interval = setInterval(fetchLive, 30000);
        return () => { isMounted = false; clearInterval(interval); };
    }, []);

    // First match = "next match"; first 3 = cards in upcoming section
    const nextMatch = matches.length > 0 ? matches[0] : null;
    const upcomingThree = matches.slice(0, 3);

    // Helpers for formatting match date/time and team initials for avatar placeholders
    const formatMatchDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    };
    const formatMatchTime = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };
    const initials = (name) => (name || '').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="home-page">
            {/* Hero: full-width band with title, subtitle, and optional match strip from next match */}
            <section className="home-hero">
                <div className="home-hero-overlay" />
                <div className="home-hero-content">
                    <h1 className="home-hero-title">Welcome to the</h1>
                    <h1 className="home-hero-title-accent">Metalworks Premier League!</h1>
                    <p className="home-hero-subtitle">Featuring Community Spirit Through Box Cricket</p>
                    {liveMatches.length > 0 && (
                        <div className="home-hero-strip home-live-strip" style={{ backgroundColor: 'var(--mpl-danger, #dc3545)', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: '6px', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 700, marginRight: '0.5rem' }}>LIVE</span>
                            {liveMatches.map(m => (
                                <Link key={m.match_id} to={`/matches/${m.match_id}`} style={{ color: '#fff', textDecoration: 'underline', marginRight: '1rem' }}>
                                    {m.team1_name} vs {m.team2_name}
                                </Link>
                            ))}
                        </div>
                    )}
                    {nextMatch && (
                        <div className="home-hero-strip">
                            Match 1: {nextMatch.team1_name} vs {nextMatch.team2_name} — {formatMatchDate(nextMatch.match_datetime)}
                        </div>
                    )}
                </div>
            </section>

            {/* Upcoming matches: up to 3 cards (team initials, label, date, View Match); then View Full Schedule button */}
            <section className="home-section home-matches">
                <div className="home-matches-timeline">
                    {loading && <LoadingFallback />}
                    {error && <p className="error-message">{error}</p>}
                    {!loading && !error && upcomingThree.length > 0 && (
                        <>
                            <div className="home-match-cards">
                                {upcomingThree.map((match, idx) => (
                                    <div key={match.match_id} className="home-match-card mpl-card">
                                        <div className="home-match-avatars">
                                            <span className="home-match-avatar" title={match.team1_name}>{initials(match.team1_name)}</span>
                                            <span className="home-match-vs">vs</span>
                                            <span className="home-match-avatar" title={match.team2_name}>{initials(match.team2_name)}</span>
                                        </div>
                                        <p className="home-match-label">Match {idx + 1}</p>
                                        <p className="home-match-teams">{match.team1_name} vs. {match.team2_name}</p>
                                        <p className="home-match-date">{formatMatchDate(match.match_datetime)}</p>
                                        <Link to={`/matches/${match.match_id}`} className="mpl-btn-primary home-match-btn">View Match</Link>
                                    </div>
                                ))}
                            </div>
                            <div className="home-matches-connector" aria-hidden="true">
                                <span className="home-connector-dot" />
                                <span className="home-connector-line" />
                                <span className="home-connector-dot" />
                                <span className="home-connector-line" />
                                <span className="home-connector-dot" />
                            </div>
                            <div className="home-view-schedule-wrap">
                                <Link to="/schedule" className="mpl-btn-primary home-view-schedule">View Full Schedule</Link>
                            </div>
                        </>
                    )}
                    {!loading && !error && upcomingThree.length === 0 && (
                        <p className="home-no-matches">No upcoming matches scheduled. <Link to="/schedule">View schedule</Link>.</p>
                    )}
                </div>
            </section>

            {/* Next Match: two panels side-by-side — "Next Match:" label (grey) and match details (teal) */}
            <section className="home-section home-next-match-wrap">
                <div className="home-next-match-label-box">
                    <span className="home-next-match-label">Next Match:</span>
                </div>
                <div className="home-next-match-value-box">
                    {loading && <span>Loading…</span>}
                    {!loading && nextMatch ? (
                        <>
                            <p className="home-next-match-teams">{nextMatch.team1_name} vs. {nextMatch.team2_name}</p>
                            <p className="home-next-match-datetime">{formatMatchDate(nextMatch.match_datetime)}, {formatMatchTime(nextMatch.match_datetime)}</p>
                        </>
                    ) : (
                        !loading && <p className="home-next-match-teams">No upcoming match</p>
                    )}
                </div>
            </section>

            {/* Quick Access: 4 cards — Schedule, Team Standings, Player Leaderboards, Browse Players */}
            <section className="home-section home-quick-access">
                <h2 className="mpl-page-title">Quick Access</h2>
                <div className="home-quick-grid">
                    <Link to="/schedule" className="home-quick-card mpl-card">
                        <span className="home-quick-icon" aria-hidden="true">📅</span>
                        <span className="home-quick-label">Schedule</span>
                    </Link>
                    <Link to="/standings" className="home-quick-card mpl-card">
                        <span className="home-quick-icon" aria-hidden="true">🛡️</span>
                        <span className="home-quick-label">Team Standings</span>
                    </Link>
                    <Link to="/leaderboard" className="home-quick-card mpl-card">
                        <span className="home-quick-icon" aria-hidden="true">🏆</span>
                        <span className="home-quick-label">Player Leaderboards</span>
                    </Link>
                    <Link to="/players" className="home-quick-card mpl-card">
                        <span className="home-quick-icon" aria-hidden="true">👤</span>
                        <span className="home-quick-label">Browse Players</span>
                    </Link>
                </div>
            </section>

            {/* News & Updates: placeholder cards; can later be driven by API or CMS */}
            <section className="home-section home-news">
                <h2 className="mpl-page-title">News & Updates</h2>
                <div className="home-news-grid">
                    <article className="home-news-card mpl-card">
                        <div className="home-news-img home-news-img-placeholder" />
                        <h3 className="home-news-title">Sherma&apos;s Century Leads Titans to Victory!</h3>
                    </article>
                    <article className="home-news-card mpl-card">
                        <div className="home-news-img home-news-img-placeholder" />
                        <h3 className="home-news-title">Team Celebrations — Season Highlights</h3>
                    </article>
                    <article className="home-news-card mpl-card">
                        <div className="home-news-img home-news-img-placeholder" />
                        <h3 className="home-news-title">New Match Rules for 2025 Season</h3>
                    </article>
                </div>
            </section>
        </div>
    );
}

export default HomePage;
