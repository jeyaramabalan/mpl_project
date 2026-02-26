// src/pages/StandingsPage.jsx
// Team Standings: points table for selected season (position, team, played, won, lost, NR, NRR, points).

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toList } from '../utils/apiResponse';
import LoadingFallback from '../components/LoadingFallback';
import './StandingsPage.css';

function StandingsPage() {
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');
    const [standings, setStandings] = useState([]);
    const [loadingSeasons, setLoadingSeasons] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState('');

    // Fetch Seasons
    useEffect(() => {
        const fetchSeasons = async () => {
            setLoadingSeasons(true);
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
                    if (Number.isInteger(num)) setSelectedSeason(num);
                }
            } catch (err) { setError('Failed to load seasons.'); }
            finally { setLoadingSeasons(false); }
        };
        fetchSeasons();
    }, []);

    // Fetch Standings when season changes
    useEffect(() => {
        const seasonNum = parseInt(selectedSeason, 10);
        if (!selectedSeason || !Number.isInteger(seasonNum)) {
            setStandings([]);
            return;
        }

        const fetchStandings = async () => {
            setLoadingData(true); setError(''); setStandings([]);
            try {
                console.log(`Fetching standings for season: ${seasonNum}`);
                const { data } = await api.get(`/standings?season_id=${seasonNum}`);
                const standingsList = toList(data);
                setStandings(standingsList);
                if (standingsList.length === 0 && data != null) {
                    console.warn("Standings API returned 0 items. Response type:", Array.isArray(data) ? 'array' : typeof data, typeof data === 'object' ? ', keys: ' + Object.keys(data || {}).join(', ') : '');
                }
            } catch (err) {
                console.error("Failed to fetch standings:", err);
                setError(typeof err === 'string' ? err : `Failed to load standings.`);
                setStandings([]);
            } finally {
                setLoadingData(false);
            }
        };
        fetchStandings();
    }, [selectedSeason]);

    const teamInitials = (name) => (name || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

    return (
        <div className="standings-page mpl-section">
            <h1 className="mpl-page-title">Team Standings</h1>

            {/* Season dropdown; standings refetch when season changes */}
            {loadingSeasons ? <LoadingFallback /> : (
                <div className="mpl-filters filter-section">
                    <label htmlFor="season-select-standings">Select Season:</label>
                    <select
                        id="season-select-standings"
                        value={selectedSeason}
                        onChange={(e) => setSelectedSeason(e.target.value)}
                        disabled={loadingData}
                    >
                        <option value="">-- Select Season --</option>
                        {seasons.map(s => {
                            const id = s.season_id != null ? Number(s.season_id) : null;
                            if (id == null || !Number.isInteger(id)) return null;
                            return (
                                <option key={id} value={id}>
                                    {s.name} ({s.year})
                                </option>
                            );
                        })}
                    </select>
                </div>
            )}

            {error && <p className="error-message">{error}</p>}

            {loadingData && <LoadingFallback message="Loading standings..." />}

            {!loadingData && selectedSeason && standings.length === 0 && (
                <p>No standings available for this season yet (check if matches are completed).</p>
            )}

            {/* Standings table: Pos, Team, Played, Won, Lost, NR, NRR, Pts */}
            {!loadingData && standings.length > 0 && (
                <div className="table-responsive">
                    <table className="standings-table">
                        <thead>
                            <tr>
                                <th>Pos</th><th>Team</th><th>Played</th><th>Won</th><th>Lost</th><th>NR</th><th>NRR</th><th>Pts</th>
                            </tr>
                        </thead>
                        <tbody>
                            {standings.map((team) => (
                                <tr key={team.team_id}>
                                    <td className="position">{team.position}</td>
                                    <td className="team-name">
                                        <div className="standings-team">
                                            <span className="standings-team-logo-wrap">
                                                {team.team_id ? (
                                                    <>
                                                        <img
                                                            src={`/images/teams/${team.team_id}.jpg`}
                                                            alt={team.name}
                                                            className="standings-team-logo"
                                                            onError={(e) => e.currentTarget.classList.add('is-hidden')}
                                                        />
                                                        <span className="standings-team-logo-fallback" aria-hidden="true">{teamInitials(team.name)}</span>
                                                    </>
                                                ) : (
                                                    <span className="standings-team-logo-fallback" aria-hidden="true">{teamInitials(team.name)}</span>
                                                )}
                                            </span>
                                            <span>{team.name}</span>
                                        </div>
                                    </td>
                                    <td>{team.played}</td>
                                    <td>{team.wins}</td>
                                    <td>{team.losses}</td>
                                    <td>{team.no_result}</td>
                                    <td className="nrr">{team.nrrDisplay}</td>
                                    <td className="points">{team.points}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default StandingsPage;