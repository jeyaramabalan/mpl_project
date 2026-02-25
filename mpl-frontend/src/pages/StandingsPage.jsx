// src/pages/StandingsPage.jsx
// Team Standings: points table for selected season (position, team, played, won, lost, NR, NRR, points).

import React, { useState, useEffect } from 'react';
import api from '../services/api';
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
                // Sort descending by season_id to ensure newest first
                const sortedSeasons = [...data].sort((a, b) => b.season_id - a.season_id);
                setSeasons(sortedSeasons);
                if (sortedSeasons.length > 0) {
                    setSelectedSeason(sortedSeasons[0].season_id); // Default to newest season
                }
            } catch (err) { setError('Failed to load seasons.'); }
            finally { setLoadingSeasons(false); }
        };
        fetchSeasons();
    }, []);

    // Fetch Standings when season changes
    useEffect(() => {
        if (!selectedSeason) {
            setStandings([]); // Clear standings if no season selected
            return;
        };

        const fetchStandings = async () => {
            setLoadingData(true); setError(''); setStandings([]);
            try {
                console.log(`Fetching standings for season: ${selectedSeason}`);
                const { data } = await api.get(`/standings?season_id=${selectedSeason}`);
                setStandings(data);
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
                        {seasons.map(s => (
                            <option key={s.season_id} value={s.season_id}>
                                {s.name} ({s.year})
                            </option>
                        ))}
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
                                    <td className="team-name">{team.name}</td>
                                    <td>{team.played}</td>
                                    <td>{team.wins}</td>
                                    <td>{team.losses}</td>
                                    <td>{team.no_result}</td> {/* Added Data Cell */}
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