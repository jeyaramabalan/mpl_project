// mpl-frontend/src/pages/RecordsPage.jsx
// Records: batting, bowling, fielding, team, and awards (MoM, MVP, Impact, Best Debut).
// Filters: season (or All-Time), scope (Individual / Team).

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import LoadingFallback from '../components/LoadingFallback';
import './RecordsPage.css';

function RecordsPage() {
    const [seasons, setSeasons] = useState([]);
    const [seasonId, setSeasonId] = useState('all');
    const [scope, setScope] = useState('individual');
    const [data, setData] = useState(null);
    const [standings, setStandings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;
        const fetchSeasons = async () => {
            try {
                const { data: list } = await api.get('/seasons/public');
                const sorted = [...(list || [])].sort((a, b) => (b.season_id || b.id) - (a.season_id || a.id));
                if (isMounted) setSeasons(sorted);
            } catch (e) {
                if (isMounted) setSeasons([]);
            }
        };
        fetchSeasons();
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError('');
        const fetchRecords = async () => {
            try {
                const params = { season_id: seasonId, scope };
                const { data: res } = await api.get('/records', { params });
                if (isMounted) setData(res);
            } catch (err) {
                if (isMounted) {
                    setError(err?.message || 'Failed to load records.');
                    setData(null);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchRecords();
        return () => { isMounted = false; };
    }, [seasonId, scope]);

    useEffect(() => {
        if (scope !== 'team' || seasonId === 'all') {
            setStandings(null);
            return;
        }
        let isMounted = true;
        api.get('/standings', { params: { season_id: seasonId } })
            .then(({ data: list }) => { if (isMounted) setStandings(list || []); })
            .catch(() => { if (isMounted) setStandings([]); });
        return () => { isMounted = false; };
    }, [scope, seasonId]);

    const renderPlayerLink = (playerId, name) =>
        playerId ? <Link to={`/players/${playerId}`}>{name || `Player ${playerId}`}</Link> : (name || '-');

    const renderMatchLink = (matchId) =>
        matchId ? <Link to={`/matches/${matchId}`}>View</Link> : '—';

    const renderRecordTable = (title, rows, columns) => {
        if (!rows || rows.length === 0) return null;
        return (
            <div className="records-block" key={title}>
                <h4 className="records-block-title">{title}</h4>
                <div className="table-responsive">
                    <table className="records-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => (
                                <tr key={idx}>
                                    <td>{idx + 1}</td>
                                    {columns.map((c) => (
                                        <td key={c.key}>{typeof c.render === 'function' ? c.render(row) : (row[c.key] ?? '-')}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    if (loading && !data) return <LoadingFallback message="Loading records..." />;

    return (
        <div className="records-page">
            <h1 className="mpl-page-title">MPL Records</h1>
            {error && <p className="error-message">{error}</p>}

            <div className="records-filters">
                <div className="records-filter-group">
                    <label htmlFor="records-season">Season</label>
                    <select id="records-season" value={seasonId} onChange={(e) => setSeasonId(e.target.value)}>
                        <option value="all">All-Time</option>
                        {seasons.map((s) => (
                            <option key={s.season_id || s.id} value={s.season_id ?? s.id}>
                                {s.name || s.season_name || `Season ${s.season_id || s.id}`} {s.year ? `(${s.year})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="records-filter-group">
                    <label htmlFor="records-scope">View</label>
                    <select id="records-scope" value={scope} onChange={(e) => setScope(e.target.value)}>
                        <option value="individual">Individual</option>
                        <option value="team">Team</option>
                    </select>
                </div>
            </div>

            {!data && !loading && !error && <p>No records data.</p>}
            {data && (
                <>
                    {scope === 'individual' && (
                        <>
                            <section className="records-section">
                                <h2 className="records-section-title">Batting</h2>
                                <div className="records-grid">
                                    {data.batting?.highestScore?.length > 0 && renderRecordTable('Highest Individual Score', data.batting.highestScore, [
                                        { key: 'player_name', label: 'Player', render: (r) => renderPlayerLink(r.player_id, r.player_name) },
                                        { key: 'value', label: 'Runs' },
                                        { key: 'match_link', label: 'Match', render: (r) => renderMatchLink(r.match_id) },
                                    ])}
                                    {data.batting?.mostRuns?.length > 0 && renderRecordTable('Most Runs', data.batting.mostRuns, [
                                        { key: 'player_name', label: 'Player', render: (r) => renderPlayerLink(r.player_id, r.player_name) },
                                        { key: 'value', label: 'Runs' },
                                        { key: 'matches', label: 'Mat' },
                                    ])}
                                    {data.batting?.highestStrikeRate?.length > 0 && renderRecordTable('Highest Strike Rate (min 30 balls)', data.batting.highestStrikeRate, [
                                        { key: 'player_name', label: 'Player', render: (r) => renderPlayerLink(r.player_id, r.player_name) },
                                        { key: 'value', label: 'SR' },
                                        { key: 'runs', label: 'Runs' },
                                        { key: 'balls', label: 'Balls' },
                                    ])}
                                    {data.batting?.mostFours?.length > 0 && renderRecordTable('Most Fours', data.batting.mostFours, [
                                        { key: 'player_name', label: 'Player', render: (r) => renderPlayerLink(r.player_id, r.player_name) },
                                        { key: 'value', label: '4s' },
                                    ])}
                                    {data.batting?.mostTwos?.length > 0 && renderRecordTable('Most Twos', data.batting.mostTwos, [
                                        { key: 'player_name', label: 'Player', render: (r) => renderPlayerLink(r.player_id, r.player_name) },
                                        { key: 'value', label: '2s' },
                                    ])}
                                    {data.batting?.mostDucks?.length > 0 && renderRecordTable('Most Ducks', data.batting.mostDucks, [
                                        { key: 'player_name', label: 'Player', render: (r) => renderPlayerLink(r.player_id, r.player_name) },
                                        { key: 'value', label: 'Ducks' },
                                    ])}
                                </div>
                            </section>

                            <section className="records-section">
                                <h2 className="records-section-title">Bowling</h2>
                                <div className="records-grid">
                                    {data.bowling?.bestBowlingFigures?.length > 0 && renderRecordTable('Best Bowling Figures', data.bowling.bestBowlingFigures, [
                                        { key: 'player_name', label: 'Player', render: (r) => renderPlayerLink(r.player_id, r.player_name) },
                                        { key: 'value', label: 'Figures' },
                                        { key: 'match_link', label: 'Match', render: (r) => renderMatchLink(r.match_id) },
                                    ])}
                                    {data.bowling?.mostWickets?.length > 0 && renderRecordTable('Most Wickets', data.bowling.mostWickets, [
                                        { key: 'player_name', label: 'Player', render: (r) => renderPlayerLink(r.player_id, r.player_name) },
                                        { key: 'value', label: 'Wkts' },
                                        { key: 'matches', label: 'Mat' },
                                    ])}
                                    {data.bowling?.bestEconomy?.length > 0 && renderRecordTable('Best Economy (min 5 overs)', data.bowling.bestEconomy, [
                                        { key: 'player_name', label: 'Player', render: (r) => renderPlayerLink(r.player_id, r.player_name) },
                                        { key: 'value', label: 'Econ' },
                                        { key: 'overs', label: 'Overs' },
                                    ])}
                                    {data.bowling?.mostMaidens?.length > 0 && renderRecordTable('Most Maidens', data.bowling.mostMaidens, [
                                        { key: 'player_name', label: 'Player', render: (r) => renderPlayerLink(r.player_id, r.player_name) },
                                        { key: 'value', label: 'Maidens' },
                                    ])}
                                    {data.bowling?.mostThreeWicketHauls?.length > 0 && renderRecordTable('Most 3-Wicket Hauls', data.bowling.mostThreeWicketHauls, [
                                        { key: 'player_name', label: 'Player', render: (r) => renderPlayerLink(r.player_id, r.player_name) },
                                        { key: 'value', label: 'Hauls' },
                                    ])}
                                    {data.bowling?.mostFiveWicketHauls?.length > 0 && renderRecordTable('Most 5-Wicket Hauls', data.bowling.mostFiveWicketHauls, [
                                        { key: 'player_name', label: 'Player', render: (r) => renderPlayerLink(r.player_id, r.player_name) },
                                        { key: 'value', label: 'Hauls' },
                                    ])}
                                </div>
                            </section>

                            <section className="records-section">
                                <h2 className="records-section-title">Fielding</h2>
                                <div className="records-grid">
                                    {data.fielding?.mostCatches?.length > 0 && renderRecordTable('Most Catches', data.fielding.mostCatches, [
                                        { key: 'player_name', label: 'Player', render: (r) => renderPlayerLink(r.player_id, r.player_name) },
                                        { key: 'value', label: 'Catches' },
                                    ])}
                                    {data.fielding?.mostRunOuts?.length > 0 && renderRecordTable('Most Run-outs', data.fielding.mostRunOuts, [
                                        { key: 'player_name', label: 'Player', render: (r) => renderPlayerLink(r.player_id, r.player_name) },
                                        { key: 'value', label: 'Run-outs' },
                                    ])}
                                    {data.fielding?.mostStumpings?.length > 0 && renderRecordTable('Most Stumpings', data.fielding.mostStumpings, [
                                        { key: 'player_name', label: 'Player', render: (r) => renderPlayerLink(r.player_id, r.player_name) },
                                        { key: 'value', label: 'Stumpings' },
                                    ])}
                                    {data.fielding?.bestFieldingImpact?.length > 0 && renderRecordTable('Best Fielding Impact', data.fielding.bestFieldingImpact, [
                                        { key: 'player_name', label: 'Player', render: (r) => renderPlayerLink(r.player_id, r.player_name) },
                                        { key: 'value', label: 'Impact' },
                                    ])}
                                </div>
                            </section>

                            <section className="records-section">
                                <h2 className="records-section-title">Impact & Awards</h2>
                                <div className="records-grid">
                                    {data.awards?.mostMoM?.length > 0 && renderRecordTable('Most Player of the Match', data.awards.mostMoM, [
                                        { key: 'player_name', label: 'Player', render: (r) => renderPlayerLink(r.player_id, r.player_name) },
                                        { key: 'value', label: 'MoM' },
                                    ])}
                                    {data.awards?.mvpSeason?.length > 0 && renderRecordTable('MVP (Season) — MoM + Impact', data.awards.mvpSeason, [
                                        { key: 'player_name', label: 'Player', render: (r) => renderPlayerLink(r.player_id, r.player_name) },
                                        { key: 'mom_count', label: 'MoM' },
                                        { key: 'total_impact', label: 'Impact' },
                                    ])}
                                    {data.awards?.highestImpact?.length > 0 && renderRecordTable('Highest Impact', data.awards.highestImpact, [
                                        { key: 'player_name', label: 'Player', render: (r) => renderPlayerLink(r.player_id, r.player_name) },
                                        { key: 'value', label: 'Impact' },
                                        { key: 'matches', label: 'Mat' },
                                    ])}
                                    {data.awards?.bestDebut?.length > 0 && renderRecordTable('Best Debut (Latest Season)', data.awards.bestDebut, [
                                        { key: 'player_name', label: 'Player', render: (r) => renderPlayerLink(r.player_id, r.player_name) },
                                        { key: 'total_impact', label: 'Impact' },
                                        { key: 'runs', label: 'Runs' },
                                        { key: 'wickets', label: 'Wkts' },
                                    ])}
                                </div>
                            </section>
                        </>
                    )}

                    {scope === 'team' && (
                        <section className="records-section records-section--team">
                            <h2 className="records-section-title">Team Records</h2>
                            <div className="records-grid records-grid--team">
                                {data.team?.highestScore?.length > 0 && renderRecordTable('Highest Team Score', data.team.highestScore, [
                                    { key: 'team_name', label: 'Team' },
                                    { key: 'value', label: 'Score' },
                                    { key: 'match_link', label: 'Match', render: (r) => renderMatchLink(r.match_id) },
                                ])}
                                {data.team?.mostTitles?.length > 0 && renderRecordTable('Most Titles', data.team.mostTitles, [
                                    { key: 'team_name', label: 'Team' },
                                    { key: 'value', label: 'Titles' },
                                ])}
                                {scope === 'team' && seasonId !== 'all' && standings && standings.length > 0 && renderRecordTable('Best NRR (Season)', standings.slice(0, 15).map((s) => ({ team_name: s.name, value: s.nrrDisplay ?? s.nrr, position: s.position })), [
                                    { key: 'team_name', label: 'Team' },
                                    { key: 'value', label: 'NRR' },
                                    { key: 'position', label: 'Pos' },
                                ])}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}

export default RecordsPage;
