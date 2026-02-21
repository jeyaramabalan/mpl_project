// src/pages/LeaderboardPage.jsx
// Season Leaderboards: tabs for Top Batters, Top Bowlers, Impact Leaders; season filter; tables with rank and stats.

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import LoadingFallback from '../components/LoadingFallback';
import './LeaderboardPage.css';

/** Sort indicator icons */
const SortIcon = ({ direction }) => (
    <span className="sort-icon" aria-hidden="true">
        {direction === 'asc' ? ' ▲' : direction === 'desc' ? ' ▼' : ' ⇅'}
    </span>
);

/** Reusable table for one leaderboard category (batting, bowling, or impact) with sortable columns */
const LeaderboardTable = ({ title, data, columns }) => {
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('desc');

    if (!data) return <p>Loading {title}...</p>;
    if (data.length === 0) return <p>No data available for {title}.</p>;

    const handleSort = (colKey) => {
        if (sortColumn === colKey) {
            setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortColumn(colKey);
            setSortDirection(colKey === 'player_name' ? 'asc' : 'desc');
        }
    };

    const sortedData = [...data].sort((a, b) => {
        const col = sortColumn;
        if (!col) return 0;

        if (col === 'rank') {
            const aIdx = data.indexOf(a);
            const bIdx = data.indexOf(b);
            return sortDirection === 'asc' ? aIdx - bIdx : bIdx - aIdx;
        }

        let aVal = a[col];
        let bVal = b[col];
        if (col === 'player_name') {
            aVal = (aVal || '').toString().toLowerCase();
            bVal = (bVal || '').toString().toLowerCase();
            const cmp = aVal.localeCompare(bVal);
            return sortDirection === 'asc' ? cmp : -cmp;
        }
        const aNum = Number(aVal);
        const bNum = Number(bVal);
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
        if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
        return 0;
    });

    return (
        <div className="leaderboard-category">
            <h3>{title}</h3>
            <div className="table-responsive">
                <table className="leaderboard-table">
                    <thead>
                        <tr>
                            <th
                                className="sortable"
                                onClick={() => handleSort('rank')}
                                role="columnheader"
                                aria-sort={sortColumn === 'rank' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                            >
                                Rank <SortIcon direction={sortColumn === 'rank' ? sortDirection : null} />
                            </th>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className="sortable"
                                    onClick={() => handleSort(col.key)}
                                    role="columnheader"
                                    aria-sort={sortColumn === col.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                                >
                                    {col.header} <SortIcon direction={sortColumn === col.key ? sortDirection : null} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map((player, index) => (
                            <tr key={player.player_id}>
                                <td>{index + 1}</td>
                                {columns.map((col) => {
                                    const value = player[col.key];
                                    let displayValue = value ?? '-';

                                    // Check if the column is one that needs number formatting
                                    const isNumericColumn = ['avg', 'sr', 'econ', 'total_impact', 'bat_impact', 'bowl_impact', 'field_impact'].includes(col.key);

                                    if (isNumericColumn) {
                                        // Handle the specific case for 'avg' where Infinity means "Not Out"
                                        if (col.key === 'avg' && (value === Infinity || value === 'Infinity')) {
                                            displayValue = "Not Out";
                                        } else {
                                            // THE FIX: Convert value to a Number before calling toFixed
                                            const numericValue = Number(value);
                                            if (!isNaN(numericValue)) {
                                                displayValue = numericValue.toFixed(2);
                                            } else {
                                                displayValue = '-';
                                            }
                                        }
                                    } else if (col.key === 'player_name') {
                                        displayValue = <Link to={`/players/${player.player_id}`}>{value}</Link>;
                                    }

                                    return <td key={col.key}>{displayValue}</td>;
                                })}
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
    const [activeTab, setActiveTab] = useState('batting');

    useEffect(() => {
        const fetchSeasons = async () => {
            setLoadingSeasons(true);
            try {
                const { data } = await api.get('/seasons/public');
                const sortedSeasons = [...data].sort((a, b) => b.season_id - a.season_id);
                setSeasons(sortedSeasons);
                if (sortedSeasons.length > 0) {
                    setSelectedSeason(sortedSeasons[0].season_id);
                } else {
                    setSelectedSeason('all');
                }
            } catch (err) { 
                setError('Failed to load seasons. Displaying all-time stats.'); 
                setSelectedSeason('all');
            }
            finally { setLoadingSeasons(false); }
        };
        fetchSeasons();
    }, []);

    useEffect(() => {
        if (!selectedSeason) return;
        const fetchLeaderboards = async () => {
            setLoadingData(true);
            // Don't clear the season loading error
            // setError(''); 
            setLeaderboardData({ batting: null, bowling: null, impact: null });
            try {
                const { data } = await api.get(`/leaderboard?season_id=${selectedSeason}`);
                setLeaderboardData({
                    batting: data.batting || [],
                    bowling: data.bowling || [],
                    impact: data.impact || []
                });
            } catch (err) {
                setError(`Failed to load leaderboards.`);
                setLeaderboardData({ batting: [], bowling: [], impact: [] });
            } finally {
                setLoadingData(false);
            }
        };
        fetchLeaderboards();
    }, [selectedSeason]);

    const battingColumns = [ { key: 'player_name', header: 'Player' }, { key: 'matches', header: 'Mat' }, { key: 'runs', header: 'Runs' }, { key: 'hs', header: 'HS' }, { key: 'avg', header: 'Avg' }, { key: 'sr', header: 'SR' }, { key: 'twos', header: '2s' }, { key: 'fours', header: '4s' } ];
    const bowlingColumns = [ { key: 'player_name', header: 'Player' }, { key: 'matches', header: 'Mat' }, { key: 'overs', header: 'Overs' }, { key: 'wickets', header: 'Wkts' }, { key: 'runs', header: 'Runs' }, { key: 'econ', header: 'Econ' } ];
    const impactColumns = [ { key: 'player_name', header: 'Player' }, { key: 'matches', header: 'Mat' }, { key: 'total_impact', header: 'Total Impact' }, { key: 'bat_impact', header: 'Batting' }, { key: 'bowl_impact', header: 'Bowling' }, { key: 'field_impact', header: 'Fielding' } ];

    return (
        <div className="leaderboard-page mpl-section">
            <h1 className="mpl-page-title">Season Leaderboards</h1>
            {/* Season selector; "All-Time Stats" option; data refetches when season changes */}
            {loadingSeasons ? <LoadingFallback /> : (
                <div className="mpl-filters filter-section">
                    <label htmlFor="season-select-leaderboard">Select Stats:</label>
                    <select
                        id="season-select-leaderboard"
                        value={selectedSeason}
                        onChange={(e) => setSelectedSeason(e.target.value)}
                        disabled={loadingData}
                    >
                        {seasons.map(s => (
                            <option key={s.season_id} value={s.season_id}>
                                {s.name} ({s.year})
                            </option>
                        ))}
                        <option value="all">
                            All-Time Stats
                        </option>
                    </select>
                </div>
            )}
            {error && <p className="error-message">{error}</p>}
            {selectedSeason && (
                 <>
                    {/* Tabs: switch between batting, bowling, impact leaderboards */}
                    <div className="mpl-tabs tabs">
                        <button type="button" onClick={() => setActiveTab('batting')} className={activeTab === 'batting' ? 'active' : ''}>Top Batters</button>
                        <button type="button" onClick={() => setActiveTab('bowling')} className={activeTab === 'bowling' ? 'active' : ''}>Top Bowlers</button>
                        <button type="button" onClick={() => setActiveTab('impact')} className={activeTab === 'impact' ? 'active' : ''}>Impact Leaders</button>
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