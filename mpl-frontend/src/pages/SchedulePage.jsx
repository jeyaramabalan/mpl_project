// mpl-project/mpl-frontend/src/pages/SchedulePage.jsx
// Schedule & Results: list of fixtures with filters (season, status). Links to match details or live/setup.

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { toList } from '../utils/apiResponse';
import LoadingFallback from '../components/LoadingFallback';
import './SchedulePage.css';

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
                const list = toList(data);
                const sortedSeasons = [...list].sort((a, b) => (b.season_id || 0) - (a.season_id || 0));
                setSeasons(sortedSeasons);
                if (list.length === 0 && data != null) {
                    console.warn("Seasons API returned 0 items. Response type:", Array.isArray(data) ? 'array' : typeof data, typeof data === 'object' ? ', keys: ' + Object.keys(data || {}).join(', ') : '');
                }
                if (sortedSeasons.length > 0) {
                    const firstId = sortedSeasons[0].season_id;
                    const num = Number(firstId);
                    if (Number.isInteger(num)) setSelectedSeason(String(num));
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
            setLoading(true);
            setError('');
            try {
                const params = {};
                const seasonNum = parseInt(selectedSeason, 10);
                if (selectedSeason && Number.isInteger(seasonNum)) params.season_id = seasonNum;
                if (selectedStatus) params.status = selectedStatus;
                console.log("FETCHING FIXTURES FROM:", '/matches', "with params:", params);
                const { data } = await api.get('/matches', { params });
                const fixturesList = toList(data);
                setFixtures(fixturesList);
                if (fixturesList.length === 0 && data != null) {
                    console.warn("Matches API returned 0 items. Response type:", Array.isArray(data) ? 'array' : typeof data, typeof data === 'object' ? ', keys: ' + Object.keys(data || {}).join(', ') : '');
                }
            } catch (err) {
                console.error("Failed to fetch fixtures:", err);
                setError(typeof err === 'string' ? err : 'Failed to load schedule. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchFixtures();
    }, [selectedSeason, selectedStatus]); // Refetch when filters change (seasons omitted to avoid double fetch when seasons load)

    const teamInitials = (name) => (name || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

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
                            {seasons.map(season => {
                                const id = season.season_id != null ? Number(season.season_id) : null;
                                if (id == null || !Number.isInteger(id)) return null;
                                return (
                                    <option key={id} value={id}>
                                        {season.name} ({season.year})
                                    </option>
                                );
                            })}
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
            {!loading && !error && Array.isArray(fixtures) && fixtures.length > 0 ? (
                <div className="table-responsive">
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
                                <td>
                                    <div className="schedule-match-teams">
                                        <div className="schedule-team">
                                            <span className="schedule-team-logo-wrap">
                                                {match.team1_id ? (
                                                    <>
                                                        <img
                                                            src={`/images/teams/${match.team1_id}.jpg`}
                                                            alt={match.team1_name}
                                                            className="schedule-team-logo"
                                                            onError={(e) => e.currentTarget.classList.add('is-hidden')}
                                                        />
                                                        <span className="schedule-team-logo-fallback" aria-hidden="true">{teamInitials(match.team1_name)}</span>
                                                    </>
                                                ) : (
                                                    <span className="schedule-team-logo-fallback" aria-hidden="true">{teamInitials(match.team1_name)}</span>
                                                )}
                                            </span>
                                            <span>{match.team1_name}</span>
                                        </div>
                                        <span className="schedule-vs">vs</span>
                                        <div className="schedule-team">
                                            <span className="schedule-team-logo-wrap">
                                                {match.team2_id ? (
                                                    <>
                                                        <img
                                                            src={`/images/teams/${match.team2_id}.jpg`}
                                                            alt={match.team2_name}
                                                            className="schedule-team-logo"
                                                            onError={(e) => e.currentTarget.classList.add('is-hidden')}
                                                        />
                                                        <span className="schedule-team-logo-fallback" aria-hidden="true">{teamInitials(match.team2_name)}</span>
                                                    </>
                                                ) : (
                                                    <span className="schedule-team-logo-fallback" aria-hidden="true">{teamInitials(match.team2_name)}</span>
                                                )}
                                            </span>
                                            <span>{match.team2_name}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>{match.venue}</td>
                                <td>
                                    {match.status === 'Live' ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                            <span className="live-badge" style={{ backgroundColor: '#dc3545', color: '#fff', padding: '0.2em 0.5em', borderRadius: '4px', fontWeight: 700, fontSize: '0.85rem' }}>LIVE</span>
                                            {match.status}
                                        </span>
                                    ) : (
                                        match.status
                                    )}
                                </td>
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
                </div>
            ) : (
                !loading && <p>No fixtures found matching the current filters.</p>
            )}
        </div>
    );
}

export default SchedulePage;