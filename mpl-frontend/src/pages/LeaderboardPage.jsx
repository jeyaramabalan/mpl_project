// src/pages/LeaderboardPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import LoadingFallback from '../components/LoadingFallback';
import './LeaderboardPage.css'; // Create this CSS file

const LeaderboardTable = ({ title, data, columns }) => {
    if (!data) return <p>Loading {title}...</p>;
    if (data.length === 0) return <p>No data available for {title}.</p>;

    return (
        <div className="leaderboard-category">
            <h3>{title}</h3>
            <div className="table-responsive">
                <table className="leaderboard-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            {columns.map((col) => <th key={col.key}>{col.header}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((player, index) => (
                            <tr key={player.player_id}>
                                <td>{index + 1}</td>
                                {columns.map((col) => (
                                    <td key={col.key}>
                                        {col.key === 'player_name' ? (
                                            <Link to={`/players/${player.player_id}`}>{player[col.key]}</Link>
                                        ) : col.key === 'avg' ? (
                                            player[col.key] === Infinity ? "Not Out" : (player[col.key]?.toFixed(2) ?? '-')
                                        ) : col.key === 'sr' || col.key === 'econ' ? (
                                            player[col.key]?.toFixed(2) ?? '-'
                                         ) : (
                                             player[col.key] ?? '-'
                                         )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

function LeaderboardPage() {
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');
    const [leaderboardData, setLeaderboardData] = useState({ batting: null, bowling: null, impact: null });
    const [loadingSeasons, setLoadingSeasons] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('batting'); // 'batting', 'bowling', 'impact'

    // Fetch Seasons
    useEffect(() => {
        const fetchSeasons = async () => {
            setLoadingSeasons(true);
            try {
                const { data } = await api.get('/seasons/public'); // Use admin route to get all seasons
                setSeasons(data);
                if (data.length > 0) {
                    setSelectedSeason(data[0].season_id); // Default to first/latest season
                }
            } catch (err) { setError('Failed to load seasons.'); }
            finally { setLoadingSeasons(false); }
        };
        fetchSeasons();
    }, []);

    // Fetch Leaderboard Data when season changes
    useEffect(() => {
        if (!selectedSeason) return;

        const fetchLeaderboards = async () => {
            setLoadingData(true);
            setError('');
            setLeaderboardData({ batting: null, bowling: null, impact: null }); // Clear old data
            try {
                const { data } = await api.get(`/leaderboard?season_id=${selectedSeason}`);
                setLeaderboardData({
                    batting: data.batting || [],
                    bowling: data.bowling || [],
                    impact: data.impact || []
                });
            } catch (err) {
                setError(typeof err === 'string' ? err : `Failed to load leaderboards for season ${selectedSeason}.`);
                setLeaderboardData({ batting: [], bowling: [], impact: [] }); // Set empty on error
            } finally {
                setLoadingData(false);
            }
        };
        fetchLeaderboards();
    }, [selectedSeason]);

    const battingColumns = [
        { key: 'player_name', header: 'Player' },
        { key: 'matches', header: 'Mat' },
        { key: 'runs', header: 'Runs' },
        { key: 'hs', header: 'HS' },
        { key: 'avg', header: 'Avg' },
        { key: 'sr', header: 'SR' },
        { key: 'fours', header: '4s' },
        { key: 'sixes', header: '6s' },
    ];

    const bowlingColumns = [
        { key: 'player_name', header: 'Player' },
        { key: 'matches', header: 'Mat' },
        { key: 'overs', header: 'Overs' },
        { key: 'wickets', header: 'Wkts' },
        { key: 'runs', header: 'Runs' },
        { key: 'econ', header: 'Econ' },
        // Add Avg, SR if calculated
    ];

    const impactColumns = [
         { key: 'player_name', header: 'Player' },
         { key: 'matches', header: 'Mat' },
         { key: 'total_impact', header: 'Total Impact' },
         { key: 'bat_impact', header: 'Batting' },
         { key: 'bowl_impact', header: 'Bowling' },
         { key: 'field_impact', header: 'Fielding' },
    ];


    return (
        <div className="leaderboard-page">
            <h2>Season Leaderboards</h2>

            {loadingSeasons ? <LoadingFallback /> : (
                <div className="filter-section">
                    <label htmlFor="season-select-leaderboard">Select Season:</label>
                    <select
                        id="season-select-leaderboard"
                        value={selectedSeason}
                        onChange={(e) => setSelectedSeason(e.target.value)}
                        disabled={loadingData}
                    >
                        <option value="" disabled>-- Select --</option>
                        {seasons.map(s => (
                            <option key={s.season_id} value={s.season_id}>
                                {s.name} ({s.year})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {error && <p className="error-message">{error}</p>}

            {selectedSeason && (
                 <>
                    <div className="tabs">
                        <button onClick={() => setActiveTab('batting')} className={activeTab === 'batting' ? 'active' : ''}>Top Batters</button>
                        <button onClick={() => setActiveTab('bowling')} className={activeTab === 'bowling' ? 'active' : ''}>Top Bowlers</button>
                        <button onClick={() => setActiveTab('impact')} className={activeTab === 'impact' ? 'active' : ''}>Impact Leaders</button>
                    </div>

                    <div className="leaderboard-content">
                        {loadingData ? <LoadingFallback message="Loading leaderboard data..." /> : (
                            <>
                                {activeTab === 'batting' && <LeaderboardTable title="Top Run Scorers" data={leaderboardData.batting} columns={battingColumns} />}
                                {activeTab === 'bowling' && <LeaderboardTable title="Top Wicket Takers" data={leaderboardData.bowling} columns={bowlingColumns} />}
                                {activeTab === 'impact' && <LeaderboardTable title="Top Impact Players" data={leaderboardData.impact} columns={impactColumns} />}
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default LeaderboardPage;