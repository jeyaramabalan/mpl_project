// mpl-frontend/src/pages/RecordsPage.jsx
// Records: batting, bowling, fielding, team, and awards (MoM, MVP, Impact, Best Debut).
// Filters: season (or All-Time), scope (Individual / Team).
// Name/Player and Team columns truncated to RECORDS_NAME_MAX_CHARS for compact layout.

const RECORDS_NAME_MAX_CHARS = 15;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { toList } from '../utils/apiResponse';
import LoadingFallback from '../components/LoadingFallback';
import './RecordsPage.css';

function RecordsPage() {
    const [seasons, setSeasons] = useState([]);
    const [matchYears, setMatchYears] = useState([]);
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
                const [pub, yearsRes] = await Promise.all([
                    api.get('/seasons/public'),
                    api.get('/seasons/match-years').catch(() => ({ data: [] })),
                ]);
                const sorted = [...toList(pub.data)].sort((a, b) => (b.season_id || b.id) - (a.season_id || a.id));
                if (isMounted) setSeasons(sorted);
                const yList = Array.isArray(yearsRes.data) ? yearsRes.data : [];
                if (isMounted) setMatchYears(yList.filter((y) => y != null).map((y) => Number(y)).filter((y) => Number.isInteger(y)));
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
                const params = { scope, season_id: 'all' };
                if (seasonId !== 'all') {
                    if (seasonId.startsWith('year:')) {
                        params.year = seasonId.slice(5);
                    } else {
                        const num = parseInt(seasonId, 10);
                        if (Number.isInteger(num)) params.season_id = num;
                    }
                }
                const { data: res } = await api.get('/records', { params });
                if (isMounted) setData(res && typeof res === 'object' ? res : null);
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
        if (scope !== 'team' || seasonId === 'all' || seasonId.startsWith('year:')) {
            setStandings(null);
            return;
        }
        const seasonNum = parseInt(seasonId, 10);
        if (!Number.isInteger(seasonNum)) {
            setStandings(null);
            return;
        }
        let isMounted = true;
        api.get('/standings', { params: { season_id: seasonNum } })
            .then(({ data: list }) => { if (isMounted) setStandings(toList(list)); })
            .catch(() => { if (isMounted) setStandings([]); });
        return () => { isMounted = false; };
    }, [scope, seasonId]);

    const truncateName = (name, maxLen = RECORDS_NAME_MAX_CHARS) => {
        const s = (name || '').trim();
        if (!s) return '-';
        return s.length <= maxLen ? s : s.slice(0, maxLen) + '…';
    };

    const renderPlayerLink = (playerId, name) => {
        const full = name || (playerId ? `Player ${playerId}` : '-');
        const display = truncateName(full);
        return playerId
            ? <Link to={`/players/${playerId}`} title={full}>{display}</Link>
            : display;
    };

    const renderMatchLink = (matchId) =>
        matchId ? <Link to={`/matches/${matchId}`} aria-label={`View match ${matchId}`}>View match</Link> : '—';

    const blockId = (title) => `records-block-${title.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()}`;

    const renderRecordTable = (title, rows, columns) => {
        if (!rows || rows.length === 0) return null;
        const id = blockId(title);
        return (
            <div className="records-block" key={title}>
                <h4 id={id} className="records-block-title">{title}</h4>
                <div className="table-responsive">
                    <table className="records-table" aria-describedby={id}>
                        <caption className="records-table-caption">{title}</caption>
                        <thead>
                            <tr>
                                <th scope="col">#</th>
                                {columns.map((c) => <th key={c.key} scope="col">{c.label}</th>)}
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

    const hasAny = (arr) => Array.isArray(arr) && arr.length > 0;
    const individualBattingBlocks = data && scope === 'individual' && [
        hasAny(data.batting?.highestScore),
        hasAny(data.batting?.mostRuns),
        hasAny(data.batting?.highestStrikeRate),
        hasAny(data.batting?.mostFours),
        hasAny(data.batting?.mostTwos),
        hasAny(data.batting?.mostDucks),
    ].filter(Boolean).length;
    const individualBowlingBlocks = data && scope === 'individual' && [
        hasAny(data.bowling?.bestBowlingFigures),
        hasAny(data.bowling?.mostWickets),
        hasAny(data.bowling?.bestEconomy),
        hasAny(data.bowling?.mostMaidens),
        hasAny(data.bowling?.mostThreeWicketHauls),
        hasAny(data.bowling?.mostFiveWicketHauls),
    ].filter(Boolean).length;
    const individualFieldingBlocks = data && scope === 'individual' && [
        hasAny(data.fielding?.mostCatches),
        hasAny(data.fielding?.mostRunOuts),
        hasAny(data.fielding?.mostStumpings),
        hasAny(data.fielding?.bestFieldingImpact),
    ].filter(Boolean).length;
    const individualAwardsBlocks = data && scope === 'individual' && [
        hasAny(data.awards?.mostMoM),
        hasAny(data.awards?.mvpSeason),
        hasAny(data.awards?.highestImpact),
        hasAny(data.awards?.bestDebut),
        hasAny(data.awards?.partOfChampionSide),
    ].filter(Boolean).length;
    const teamBlocks = data && scope === 'team' && [
        hasAny(data.team?.highestScore),
        hasAny(data.team?.mostTitles),
        seasonId !== 'all' && !seasonId.startsWith('year:') && standings && standings.length > 0,
    ].filter(Boolean).length;

    if (loading && !data) return <LoadingFallback message="Loading records..." />;

    const seasonLabel = seasonId === 'all'
        ? 'All-Time'
        : seasonId.startsWith('year:')
            ? `Calendar year ${seasonId.slice(5)}`
            : (seasons.find(s => (s.season_id ?? s.id) == seasonId)?.name || `Season ${seasonId}`);
    const scopeLabel = scope === 'individual' ? 'Individual' : 'Team';

    return (
        <div className="records-page">
            <h1 className="mpl-page-title">MPL Records</h1>
            <p className="records-intro">Top 15 in each category.</p>
            {error && <p className="error-message">{error}</p>}

            <div className="records-filters-wrap">
                <div className="records-filters">
                    <div className="records-filter-group">
                        <label htmlFor="records-season">Season</label>
                        <select id="records-season" value={seasonId} onChange={(e) => setSeasonId(e.target.value)}>
                            <option value="all">All-Time</option>
                            {seasons.map((s) => {
                                const id = s.season_id ?? s.id;
                                const num = id != null ? Number(id) : null;
                                if (num == null || !Number.isInteger(num)) return null;
                                return (
                                    <option key={num} value={num}>
                                        {s.name || s.season_name || `Season ${num}`} {s.year ? `(${s.year})` : ''}
                                    </option>
                                );
                            })}
                            {matchYears.map((y) => (
                                <option key={`year-${y}`} value={`year:${y}`}>
                                    Calendar year {y}
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
                <p className="records-filter-hint">All-Time includes every season. Calendar year uses completed matches with match date in that year. Switch to Team to see team records.</p>
                {data && <p className="records-filter-summary" aria-live="polite">Showing: {seasonLabel} · {scopeLabel}</p>}
            </div>

            {!data && !loading && !error && <p>No records data.</p>}
            {data && (
                <>
                    {scope === 'individual' && (
                        <>
                            <section className="records-section" aria-labelledby="records-section-batting">
                                <h2 id="records-section-batting" className="records-section-title">Batting</h2>
                                {individualBattingBlocks > 0 ? (
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
                                ) : <p className="records-empty-section">No records for this filter.</p>}
                            </section>

                            <section className="records-section" aria-labelledby="records-section-bowling">
                                <h2 id="records-section-bowling" className="records-section-title">Bowling</h2>
                                {individualBowlingBlocks > 0 ? (
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
                                ) : <p className="records-empty-section">No records for this filter.</p>}
                            </section>

                            <section className="records-section" aria-labelledby="records-section-fielding">
                                <h2 id="records-section-fielding" className="records-section-title">Fielding</h2>
                                {individualFieldingBlocks > 0 ? (
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
                                ) : <p className="records-empty-section">No records for this filter.</p>}
                            </section>

                            <section className="records-section" aria-labelledby="records-section-awards">
                                <h2 id="records-section-awards" className="records-section-title">Impact & Awards</h2>
                                {individualAwardsBlocks > 0 ? (
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
                                    {data.awards?.partOfChampionSide?.length > 0 && renderRecordTable('Part of Champion Side', data.awards.partOfChampionSide, [
                                        { key: 'player_name', label: 'Player', render: (r) => renderPlayerLink(r.player_id, r.player_name) },
                                        { key: 'value', label: 'Titles' },
                                    ])}
                                </div>
                                ) : <p className="records-empty-section">No records for this filter.</p>}
                            </section>
                        </>
                    )}

                    {scope === 'team' && (
                        <section className="records-section records-section--team" aria-labelledby="records-section-team">
                            <h2 id="records-section-team" className="records-section-title">Team Records</h2>
                            {seasonId === 'all' && <p className="records-team-note">Select a season to see Best NRR.</p>}
                            {teamBlocks > 0 ? (
                            <div className="records-grid records-grid--team">
                                {data.team?.highestScore?.length > 0 && renderRecordTable('Highest Team Score', data.team.highestScore, [
                                    { key: 'team_name', label: 'Team', render: (r) => <span title={r.team_name || ''}>{truncateName(r.team_name)}</span> },
                                    { key: 'value', label: 'Score' },
                                    { key: 'match_link', label: 'Match', render: (r) => renderMatchLink(r.match_id) },
                                ])}
                                {data.team?.mostTitles?.length > 0 && renderRecordTable('Most Titles', data.team.mostTitles, [
                                    { key: 'team_name', label: 'Team', render: (r) => <span title={r.team_name || ''}>{truncateName(r.team_name)}</span> },
                                    { key: 'value', label: 'Titles' },
                                ])}
                                {scope === 'team' && seasonId !== 'all' && !seasonId.startsWith('year:') && standings && standings.length > 0 && renderRecordTable('Best NRR (Season)', standings.slice(0, 15).map((s) => ({ team_name: s.name, value: s.nrrDisplay ?? s.nrr, position: s.position })), [
                                    { key: 'team_name', label: 'Team', render: (r) => <span title={r.team_name || ''}>{truncateName(r.team_name)}</span> },
                                    { key: 'value', label: 'NRR' },
                                    { key: 'position', label: 'Pos' },
                                ])}
                            </div>
                            ) : <p className="records-empty-section">No records for this filter.</p>}
                        </section>
                    )}
                </>
            )}
        </div>
    );
}

export default RecordsPage;
