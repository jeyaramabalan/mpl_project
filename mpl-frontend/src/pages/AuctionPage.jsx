// mpl-project/mpl-frontend/src/pages/AuctionPage.jsx
// Public view: current player (name, profile), current bid, current bidding team, player stats and performance charts. Read-only.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import api from '../services/api';
import { toList } from '../utils/apiResponse';
import LoadingFallback from '../components/LoadingFallback';
import './PlayerDetailPage.css';

const CHART_COLORS = {
  batting: '#42A5F5',
  bowling: '#EF5350',
  fielding: '#66BB6A',
  runs: 'var(--mpl-turquoise)',
  totalImpact: 'var(--mpl-gunmetal)',
  wickets: 'var(--mpl-turquoise-hover)',
  economy: 'var(--mpl-turquoise-hover)',
};

function economyRate(runsConceded, oversBowled) {
  if (oversBowled == null || oversBowled <= 0 || isNaN(oversBowled)) return null;
  const completedOvers = Math.floor(oversBowled);
  const ballsInPartialOver = Math.round((oversBowled - completedOvers) * 10);
  const totalBalls = completedOvers * 6 + ballsInPartialOver;
  if (totalBalls === 0) return null;
  return parseFloat(((runsConceded || 0) / (totalBalls / 6)).toFixed(2));
}

export default function AuctionPage() {
  const [searchParams] = useSearchParams();
  const seasonIdParam = searchParams.get('season_id');
  const [seasons, setSeasons] = useState([]);
  const [seasonId, setSeasonId] = useState(seasonIdParam || '');
  const [state, setState] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [byMatch, setByMatch] = useState(null);
  const [bySeason, setBySeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSeasons = useCallback(async () => {
    try {
      const { data } = await api.get('/seasons/public');
      const list = toList(data);
      setSeasons(list);
      const available = list.filter(s => s.status !== 'Completed');
      if (!seasonIdParam && available.length > 0) {
        setSeasonId(String(available[0].season_id));
      } else if (seasonIdParam && available.some(s => s.season_id == seasonIdParam)) {
        setSeasonId(seasonIdParam);
      } else if (available.length > 0) {
        setSeasonId(String(available[0].season_id));
      }
    } catch (e) {
      setError(e?.message || 'Failed to load seasons.');
    } finally {
      setLoading(false);
    }
  }, [seasonIdParam]);

  const fetchState = useCallback(async () => {
    if (!seasonId) return;
    try {
      const { data } = await api.get(`/auction/state?season_id=${seasonId}`);
      setState(data);
    } catch (e) {
      setState(null);
    }
  }, [seasonId]);

  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  const auctionSeasons = useMemo(() => seasons.filter(s => s.status !== 'Completed'), [seasons]);
  useEffect(() => {
    if (seasons.length > 0 && seasonId && !auctionSeasons.some(s => s.season_id == seasonId)) {
      setSeasonId(auctionSeasons.length > 0 ? String(auctionSeasons[0].season_id) : '');
    }
  }, [auctionSeasons, seasonId, seasons.length]);

  useEffect(() => {
    fetchState();
    const t = setInterval(fetchState, 3000);
    return () => clearInterval(t);
  }, [fetchState]);

  const currentPlayerId = state?.currentPlayer?.player_id;
  useEffect(() => {
    if (!currentPlayerId || state?.state?.status !== 'active') {
      setPlayerStats(null);
      setByMatch(null);
      setBySeason(null);
      return;
    }
    let cancelled = false;
    Promise.all([
      api.get(`/players/${currentPlayerId}/stats`).then(r => r.data).catch(() => null),
      api.get(`/players/${currentPlayerId}/stats/by-match`, { params: { limit: 5 } }).then(r => r.data?.matches ?? null).catch(() => null),
      api.get(`/players/${currentPlayerId}/stats/by-season`, { params: { limit: 5 } }).then(r => r.data?.seasons ?? null).catch(() => null),
    ]).then(([stats, matches, seasonsData]) => {
      if (cancelled) return;
      setPlayerStats(stats);
      setByMatch(Array.isArray(matches) ? matches : null);
      setBySeason(Array.isArray(seasonsData) ? seasonsData : null);
    });
    return () => { cancelled = true; };
  }, [currentPlayerId, state?.state?.status]);

  if (loading) return <LoadingFallback message="Loading..." />;

  return (
    <div className="auction-page" style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem' }}>
      <h1>Auction – Live</h1>
      {error && <p className="error-message">{error}</p>}
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="pub-season">Season: </label>
        <select
          id="pub-season"
          value={seasonId}
          onChange={(e) => setSeasonId(e.target.value)}
        >
          <option value="">-- Select --</option>
          {auctionSeasons.map(s => (
            <option key={s.season_id} value={s.season_id}>{s.name} ({s.year})</option>
          ))}
        </select>
      </div>
      {!seasonId && <p>Select a season to view the auction.</p>}
      {seasonId && state && Array.isArray(state.team_rosters) && state.team_rosters.length > 0 && (
        <section
          className="auction-squads-preview"
          style={{
            marginBottom: '1.25rem',
            padding: '1rem 1.25rem',
            border: '1px solid var(--mpl-border)',
            borderRadius: 12,
            background: 'var(--mpl-surface)',
          }}
        >
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Squads so far</h2>
          <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--mpl-text-muted)' }}>
            Captain at £0; auction players with purchase price.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {state.team_rosters.map((tr) => (
              <div
                key={tr.team_id}
                style={{
                  border: '1px solid var(--mpl-border)',
                  borderRadius: 8,
                  padding: '0.65rem 0.75rem',
                  fontSize: '0.9rem',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>{tr.name}</div>
                <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                  {tr.captain && (
                    <li>
                      <strong>{tr.captain.name}</strong> (C) — £{tr.captain.price}
                    </li>
                  )}
                  {!tr.captain && <li style={{ color: 'var(--mpl-text-muted)' }}>Captain TBC</li>}
                  {(tr.purchases || []).map((p) => (
                    <li key={p.player_id}>
                      {p.name} — £{p.purchase_price}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
      {seasonId && state && (
        <div className="auction-live-box" style={{ padding: '1.5rem', border: '1px solid var(--mpl-border)', borderRadius: 12, background: 'var(--mpl-surface)' }}>
          {state.state?.status === 'completed' && (
            <p style={{ fontWeight: 600 }}>Auction completed.</p>
          )}
          {state.currentPlayer && state.state?.status === 'active' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <img
                  src={`/images/players/${state.currentPlayer.player_id}.jpg`}
                  alt={state.currentPlayer.name}
                  style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
                />
                <div style={{ display: 'none', width: 80, height: 80, borderRadius: '50%', background: 'var(--mpl-turquoise)', color: '#fff', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                  {state.currentPlayer.name?.charAt(0) || '?'}
                </div>
                <div>
                  <h2 style={{ margin: 0 }}>{state.currentPlayer.name}</h2>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem' }}>
                    Current bid: <strong>£{state.state.current_bid}</strong>
                  </p>
                  {state.currentTeamName && (
                    <p style={{ margin: '0.25rem 0 0 0' }}>Leading: <strong>{state.currentTeamName}</strong></p>
                  )}
                </div>
              </div>

              {playerStats != null && (
                <section className="player-stats-section" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--mpl-border)', paddingTop: '1.5rem' }}>
                  <h2 className="section-title">Statistics (Career)</h2>
                  {playerStats.matches_played >= 0 ? (
                    <>
                      <div className="stats-card mpl-card">
                        <div className="stats-card-header batting-header">
                          <span className="stats-card-icon">🏏</span>
                          <span>Batting</span>
                        </div>
                        <div className="stats-card-content">
                          <table className="stats-sub-table">
                            <thead>
                              <tr>
                                <th>Mat</th>
                                <th>Runs</th>
                                <th>HS</th>
                                <th>Avg</th>
                                <th>SR</th>
                                <th>4s</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>{playerStats.matches_played ?? '-'}</td>
                                <td>{playerStats.total_runs ?? '-'}</td>
                                <td>{playerStats.highest_score ?? '-'}</td>
                                <td>{playerStats.batting_average_display ?? '-'}</td>
                                <td>{playerStats.batting_strike_rate ?? '-'}</td>
                                <td>{playerStats.total_fours ?? '-'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                      {playerStats.bowling_breakdown && (
                        <div className="stats-card mpl-card">
                          <div className="stats-card-header bowling-header">
                            <span className="stats-card-icon">⚾</span>
                            <span>Bowling</span>
                          </div>
                          <div className="stats-card-content">
                            <table className="stats-sub-table">
                              <thead>
                                <tr>
                                  <th>Overs</th>
                                  <th>Maidens</th>
                                  <th>Wickets</th>
                                  <th>Runs</th>
                                  <th>Econ</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>{playerStats.bowling_breakdown.total?.overs_display ?? '-'}</td>
                                  <td>{playerStats.bowling_breakdown.total?.maidens ?? '-'}</td>
                                  <td>{playerStats.bowling_breakdown.total?.wickets ?? '-'}</td>
                                  <td>{playerStats.bowling_breakdown.total?.runs ?? '-'}</td>
                                  <td>{playerStats.bowling_breakdown.total?.economy != null ? parseFloat(playerStats.bowling_breakdown.total.economy).toFixed(2) : '-'}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      <div className="impact-visual" style={{ marginTop: '1rem' }}>
                        <h2 className="section-title" style={{ marginBottom: '0.75rem' }}>Impact (Career)</h2>
                        <div className="impact-item batting-impact">
                          <span className="impact-icon">🏏</span>
                          <span className="impact-text">Batting: {playerStats.total_batting_impact != null && !isNaN(parseFloat(playerStats.total_batting_impact)) ? parseFloat(playerStats.total_batting_impact).toFixed(1) : '0.0'}</span>
                        </div>
                        <div className="impact-item bowling-impact">
                          <span className="impact-icon">⚾</span>
                          <span className="impact-text">Bowling: {playerStats.total_bowling_impact != null && !isNaN(parseFloat(playerStats.total_bowling_impact)) ? parseFloat(playerStats.total_bowling_impact).toFixed(1) : '0.0'}</span>
                        </div>
                        <div className="impact-item fielding-impact">
                          <span className="impact-icon">👤</span>
                          <span className="impact-text">Fielding: {playerStats.total_fielding_impact != null && !isNaN(parseFloat(playerStats.total_fielding_impact)) ? parseFloat(playerStats.total_fielding_impact).toFixed(1) : '0.0'}</span>
                        </div>
                      </div>

                      {(byMatch?.length > 0 || bySeason?.length > 0) && (
                        <section className="player-charts-section" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--mpl-border)', paddingTop: '1.5rem' }}>
                          <h2 className="section-title">Performance Charts</h2>
                          <div className="player-detail-charts">
                            {byMatch && byMatch.length > 0 && (
                              <>
                                <div className="chart-card mpl-card">
                                  <h3 className="chart-title">Last {byMatch.length} Matches – Batting (Runs)</h3>
                                  <div className="chart-wrapper">
                                    <ResponsiveContainer width="100%" height={220}>
                                      <BarChart data={[...byMatch].reverse().map((m, i) => ({ name: m.opponent_team_name || `Match ${i + 1}`, runs: m.runs_scored ?? 0 }))} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--mpl-grey-300, #d0d0d0)" />
                                        <XAxis dataKey="name" tick={{ fill: 'var(--mpl-text, #1a1a1a)', fontSize: 12 }} />
                                        <YAxis tick={{ fill: 'var(--mpl-text, #1a1a1a)', fontSize: 12 }} />
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--mpl-white)', color: 'var(--mpl-text)', border: '1px solid var(--mpl-grey-300)' }} />
                                        <Bar dataKey="runs" name="Runs" fill={CHART_COLORS.runs} radius={[4, 4, 0, 0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                                <div className="chart-card mpl-card">
                                  <h3 className="chart-title">Last {byMatch.length} Matches – Impact (per match)</h3>
                                  <div className="chart-wrapper">
                                    <ResponsiveContainer width="100%" height={220}>
                                      <BarChart data={[...byMatch].reverse().map((m, i) => ({ name: m.opponent_team_name || `Match ${i + 1}`, Bat: m.batting_impact_points ?? 0, Bowl: m.bowling_impact_points ?? 0, Field: m.fielding_impact_points ?? 0 }))} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--mpl-grey-300)" />
                                        <XAxis dataKey="name" tick={{ fill: 'var(--mpl-text)', fontSize: 12 }} />
                                        <YAxis tick={{ fill: 'var(--mpl-text)', fontSize: 12 }} />
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--mpl-white)', color: 'var(--mpl-text)', border: '1px solid var(--mpl-grey-300)' }} />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <Bar dataKey="Bat" stackId="a" fill={CHART_COLORS.batting} radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="Bowl" stackId="a" fill={CHART_COLORS.bowling} radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="Field" stackId="a" fill={CHART_COLORS.fielding} radius={[4, 4, 0, 0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                                <div className="chart-card mpl-card">
                                  <h3 className="chart-title">Last {byMatch.length} Matches – Bowling (Wickets)</h3>
                                  <div className="chart-wrapper">
                                    <ResponsiveContainer width="100%" height={220}>
                                      <BarChart data={[...byMatch].reverse().map((m, i) => ({ name: m.opponent_team_name || `Match ${i + 1}`, wickets: m.wickets_taken ?? 0 }))} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--mpl-grey-300)" />
                                        <XAxis dataKey="name" tick={{ fill: 'var(--mpl-text)', fontSize: 12 }} />
                                        <YAxis tick={{ fill: 'var(--mpl-text)', fontSize: 12 }} allowDecimals={false} />
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--mpl-white)', color: 'var(--mpl-text)', border: '1px solid var(--mpl-grey-300)' }} />
                                        <Bar dataKey="wickets" name="Wickets" fill={CHART_COLORS.wickets} radius={[4, 4, 0, 0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                                <div className="chart-card mpl-card">
                                  <h3 className="chart-title">Last {byMatch.length} Matches – Bowling (Economy)</h3>
                                  <div className="chart-wrapper">
                                    <ResponsiveContainer width="100%" height={220}>
                                      <BarChart data={[...byMatch].reverse().map((m, i) => ({ name: m.opponent_team_name || `Match ${i + 1}`, economy: economyRate(m.runs_conceded, m.overs_bowled) ?? 0 }))} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--mpl-grey-300)" />
                                        <XAxis dataKey="name" tick={{ fill: 'var(--mpl-text)', fontSize: 12 }} />
                                        <YAxis tick={{ fill: 'var(--mpl-text)', fontSize: 12 }} />
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--mpl-white)', color: 'var(--mpl-text)', border: '1px solid var(--mpl-grey-300)' }} formatter={(value) => [value != null ? parseFloat(value).toFixed(2) : '-', 'Economy']} />
                                        <Bar dataKey="economy" name="Economy" fill={CHART_COLORS.economy} radius={[4, 4, 0, 0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                              </>
                            )}
                            {bySeason && bySeason.length > 0 && (
                              <>
                                <div className="chart-card mpl-card">
                                  <h3 className="chart-title">Last {bySeason.length} Seasons – Total Impact</h3>
                                  <div className="chart-wrapper">
                                    <ResponsiveContainer width="100%" height={220}>
                                      <BarChart data={[...bySeason].reverse().map(s => ({ name: s.name || `Season ${s.year}`, impact: s.total_impact ?? 0 }))} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--mpl-grey-300)" />
                                        <XAxis dataKey="name" tick={{ fill: 'var(--mpl-text)', fontSize: 11 }} />
                                        <YAxis tick={{ fill: 'var(--mpl-text)', fontSize: 12 }} />
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--mpl-white)', color: 'var(--mpl-text)', border: '1px solid var(--mpl-grey-300)' }} />
                                        <Bar dataKey="impact" name="Impact" fill={CHART_COLORS.totalImpact} radius={[4, 4, 0, 0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                                <div className="chart-card mpl-card">
                                  <h3 className="chart-title">Last {bySeason.length} Seasons – Batting (Runs)</h3>
                                  <div className="chart-wrapper">
                                    <ResponsiveContainer width="100%" height={220}>
                                      <BarChart data={[...bySeason].reverse().map(s => ({ name: s.name || `Season ${s.year}`, runs: s.total_runs ?? 0 }))} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--mpl-grey-300)" />
                                        <XAxis dataKey="name" tick={{ fill: 'var(--mpl-text)', fontSize: 11 }} />
                                        <YAxis tick={{ fill: 'var(--mpl-text)', fontSize: 12 }} />
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--mpl-white)', color: 'var(--mpl-text)', border: '1px solid var(--mpl-grey-300)' }} />
                                        <Bar dataKey="runs" name="Runs" fill={CHART_COLORS.runs} radius={[4, 4, 0, 0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                                <div className="chart-card mpl-card">
                                  <h3 className="chart-title">Last {bySeason.length} Seasons – Batting (Strike rate)</h3>
                                  <div className="chart-wrapper">
                                    <ResponsiveContainer width="100%" height={220}>
                                      <BarChart data={[...bySeason].reverse().map(s => {
                                        const runs = s.total_runs ?? 0;
                                        const balls = s.total_balls_faced ?? 0;
                                        const sr = balls > 0 ? parseFloat(((runs / balls) * 100).toFixed(2)) : 0;
                                        return { name: s.name || `Season ${s.year}`, strikeRate: sr };
                                      })} margin={{ top: 8, right: 16, left: 8, bottom: 24 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--mpl-grey-300)" />
                                        <XAxis dataKey="name" tick={{ fill: 'var(--mpl-text)', fontSize: 11 }} />
                                        <YAxis tick={{ fill: 'var(--mpl-text)', fontSize: 12 }} />
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--mpl-white)', color: 'var(--mpl-text)', border: '1px solid var(--mpl-grey-300)' }} formatter={(value) => [value != null ? parseFloat(value).toFixed(2) : '-', 'Strike rate']} />
                                        <Bar dataKey="strikeRate" name="Strike rate" fill={CHART_COLORS.batting} radius={[4, 4, 0, 0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </section>
                      )}
                    </>
                  ) : (
                    <p className="no-stats">No detailed statistics available yet.</p>
                  )}
                </section>
              )}
            </>
          )}
          {(!state.currentPlayer || state.state?.status !== 'active') && state.state?.status !== 'completed' && (
            <p>No player on the block right now.</p>
          )}
        </div>
      )}
    </div>
  );
}
