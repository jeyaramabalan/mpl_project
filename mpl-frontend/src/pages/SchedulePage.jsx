// mpl-project/mpl-frontend/src/pages/SchedulePage.jsx
// Schedule & Results: list of fixtures with filters (season, status). Links to match details or live/setup.

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import LoadingFallback from '../components/LoadingFallback';

function SchedulePage() {
    const [fixtures, setFixtures] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');
    const [selectedStatus, setSelectedStatus] = useState(''); // 'Scheduled', 'Live', 'Completed', 'Setup', 'Abandoned'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Fetch available seasons for dropdown
    useEffect(() => {
        const fetchSeasons = async () => {
            try {
                const { data } = await api.get('/seasons/public');
                // Sort descending by season_id to ensure newest first
                const sortedSeasons = [...data].sort((a, b) => b.season_id - a.season_id);
                setSeasons(sortedSeasons);
                if (sortedSeasons.length > 0) {
                    setSelectedSeason(sortedSeasons[0].season_id); // Default to newest season
                }
            } catch (err) {
                console.error("Failed to fetch seasons:", err);
                // Don't necessarily block fixture loading if seasons fail
            }
        };
        fetchSeasons();
    }, []);

    // Fetch fixtures based on selected filters
    useEffect(() => {
        const fetchFixtures = async () => {
            // Don't fetch until a season is selected (if seasons are used)
            if (!selectedSeason && seasons.length > 0) return;

            setLoading(true);
            setError('');
            try {
                const params = {};
                if (selectedSeason) params.season_id = selectedSeason;
                if (selectedStatus) params.status = selectedStatus;
                console.log("FETCHING FIXTURES FROM:", '/matches', "with params:", params);
                const { data } = await api.get('/matches', { params });
                setFixtures(data);
            } catch (err) {
                console.error("Failed to fetch fixtures:", err);
                setError(typeof err === 'string' ? err : 'Failed to load schedule. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchFixtures();
    }, [selectedSeason, selectedStatus, seasons]); // Refetch when filters change

    return (
        <div className="mpl-section">
            <h1 className="mpl-page-title">MPL Schedule & Results</h1>

            {/* Filter row: season dropdown and status dropdown; refetch on change */}
            <div className="mpl-filters">
                {seasons.length > 0 && (
                    <div className="mpl-filter-group">
                        <label htmlFor="season-select">Season:</label>
                        <select
                            id="season-select"
                            value={selectedSeason}
                            onChange={(e) => setSelectedSeason(e.target.value)}
                        >
                            <option value="">All Seasons</option>
                            {seasons.map(season => (
                                <option key={season.season_id} value={season.season_id}>
                                    {season.name} ({season.year})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <div className="mpl-filter-group">
                    <label htmlFor="status-select">Status:</label>
                    <select
                        id="status-select"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Live">Live</option>
                        <option value="Completed">Completed</option>
                        <option value="Setup">Setup</option>
                        <option value="Abandoned">Abandoned</option>
                    </select>
                </div>
            </div>

            {loading && <LoadingFallback message="Loading schedule..." />}
            {error && <p className="error-message">Error: {error}</p>}

            {/* Fixtures table: date/time, match, venue, status, and link to details or View Live/View Setup */}
            {!loading && !error && fixtures.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>Date & Time</th>
                            <th>Match</th>
                            <th>Venue</th>
                            <th>Status</th>
                            <th>Result / Link</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fixtures.map((match) => (
                            <tr key={match.match_id}>
                                <td>{new Date(match.match_datetime).toLocaleString()}</td>
                                <td>{match.team1_name} vs {match.team2_name}</td>
                                <td>{match.venue}</td>
                                <td>{match.status}</td>
                                <td>
                                    {match.status === 'Completed' ? (
                                        <>
                                        {match.result_summary || 'View Details'} <br/>
                                        <Link to={`/matches/${match.match_id}`}>Details</Link>
                                        </>
                                    ) : match.status === 'Live' || match.status === 'Setup' ? (
                                        <Link to={`/matches/${match.match_id}`} className="mpl-btn-primary" style={{ padding: '0.35em 0.75em', fontSize: '0.9rem', display: 'inline-block' }}>
                                            {match.status === 'Live' ? 'View Live' : 'View Setup'}
                                        </Link>
                                    ) : (
                                        <Link to={`/matches/${match.match_id}`}>View Details</Link>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                !loading && <p>No fixtures found matching the current filters.</p>
            )}
        </div>
    );
}

export default SchedulePage;