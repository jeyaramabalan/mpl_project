import React, { useEffect, useState } from 'react';
import api from '../../services/api';

function AdminImpactSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [recalcLoading, setRecalcLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [matchId, setMatchId] = useState('');
    const [seasonId, setSeasonId] = useState('');
    const [seasons, setSeasons] = useState([]);
    const [settings, setSettings] = useState({
        batting_dot_ball: -0.25,
        batting_one_run: 1,
        batting_two_runs: 3,
        batting_four_runs: 6,
        bowling_legal_dot: 1,
        bowling_extra_dot: -0.5,
        bowling_legal_one: 0,
        bowling_extra_one: -1,
        bowling_two_conceded: -1,
        bowling_four_conceded: -2,
        bowling_extra_other: -1,
        bowling_wicket_bonus: 6,
        fielding_catch_stumping: 5,
        super_over_batting_multiplier: 1.5,
        super_over_bowling_multiplier: 1.5,
    });

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const { data } = await api.get('/admin/scoring/impact-settings');
                setSettings({
                    batting_dot_ball: Number(data.batting_dot_ball ?? -0.25),
                    batting_one_run: Number(data.batting_one_run ?? 1),
                    batting_two_runs: Number(data.batting_two_runs ?? 3),
                    batting_four_runs: Number(data.batting_four_runs ?? 6),
                    bowling_legal_dot: Number(data.bowling_legal_dot ?? 1),
                    bowling_extra_dot: Number(data.bowling_extra_dot ?? -0.5),
                    bowling_legal_one: Number(data.bowling_legal_one ?? 0),
                    bowling_extra_one: Number(data.bowling_extra_one ?? -1),
                    bowling_two_conceded: Number(data.bowling_two_conceded ?? -1),
                    bowling_four_conceded: Number(data.bowling_four_conceded ?? -2),
                    bowling_extra_other: Number(data.bowling_extra_other ?? -1),
                    bowling_wicket_bonus: Number(data.bowling_wicket_bonus ?? 6),
                    fielding_catch_stumping: Number(data.fielding_catch_stumping ?? 5),
                    super_over_batting_multiplier: Number(data.super_over_batting_multiplier ?? 1.5),
                    super_over_bowling_multiplier: Number(data.super_over_bowling_multiplier ?? 1.5),
                });
                const seasonsRes = await api.get('/admin/seasons');
                const seasonList = Array.isArray(seasonsRes.data) ? seasonsRes.data : [];
                setSeasons(seasonList);
                if (seasonList.length > 0) setSeasonId(String(seasonList[0].season_id));
            } catch (err) {
                setError(err?.response?.data?.message || err.message || 'Failed to load impact settings.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setMessage('');
        try {
            const payload = {
                batting_dot_ball: Number(settings.batting_dot_ball),
                batting_one_run: Number(settings.batting_one_run),
                batting_two_runs: Number(settings.batting_two_runs),
                batting_four_runs: Number(settings.batting_four_runs),
                bowling_legal_dot: Number(settings.bowling_legal_dot),
                bowling_extra_dot: Number(settings.bowling_extra_dot),
                bowling_legal_one: Number(settings.bowling_legal_one),
                bowling_extra_one: Number(settings.bowling_extra_one),
                bowling_two_conceded: Number(settings.bowling_two_conceded),
                bowling_four_conceded: Number(settings.bowling_four_conceded),
                bowling_extra_other: Number(settings.bowling_extra_other),
                bowling_wicket_bonus: Number(settings.bowling_wicket_bonus),
                fielding_catch_stumping: Number(settings.fielding_catch_stumping),
                super_over_batting_multiplier: Number(settings.super_over_batting_multiplier),
                super_over_bowling_multiplier: Number(settings.super_over_bowling_multiplier),
            };
            const { data } = await api.put('/admin/scoring/impact-settings', payload);
            setSettings({
                batting_dot_ball: Number(data.settings.batting_dot_ball),
                batting_one_run: Number(data.settings.batting_one_run),
                batting_two_runs: Number(data.settings.batting_two_runs),
                batting_four_runs: Number(data.settings.batting_four_runs),
                bowling_legal_dot: Number(data.settings.bowling_legal_dot),
                bowling_extra_dot: Number(data.settings.bowling_extra_dot),
                bowling_legal_one: Number(data.settings.bowling_legal_one),
                bowling_extra_one: Number(data.settings.bowling_extra_one),
                bowling_two_conceded: Number(data.settings.bowling_two_conceded),
                bowling_four_conceded: Number(data.settings.bowling_four_conceded),
                bowling_extra_other: Number(data.settings.bowling_extra_other),
                bowling_wicket_bonus: Number(data.settings.bowling_wicket_bonus),
                fielding_catch_stumping: Number(data.settings.fielding_catch_stumping),
                super_over_batting_multiplier: Number(data.settings.super_over_batting_multiplier),
                super_over_bowling_multiplier: Number(data.settings.super_over_bowling_multiplier),
            });
            setMessage('Impact settings saved.');
        } catch (err) {
            setError(err?.response?.data?.message || err.message || 'Failed to save impact settings.');
        } finally {
            setSaving(false);
        }
    };

    const handleRecalculate = async (e) => {
        e.preventDefault();
        const mid = Number(matchId);
        if (!Number.isFinite(mid) || mid <= 0) {
            setError('Enter a valid match ID.');
            return;
        }
        setRecalcLoading(true);
        setError('');
        setMessage('');
        try {
            const { data } = await api.post(
                `/admin/scoring/recalculate/${mid}`,
                {},
                { timeout: 120000 } // match-level recalc can take longer than default 10s
            );
            setMessage(data?.message || `Recalculation completed for match ${mid}.`);
        } catch (err) {
            setError(err?.response?.data?.message || err.message || 'Recalculation failed.');
        } finally {
            setRecalcLoading(false);
        }
    };

    const handleRecalculateSeason = async (e) => {
        e.preventDefault();
        const sid = Number(seasonId);
        if (!Number.isFinite(sid) || sid <= 0) {
            setError('Select a valid season.');
            return;
        }
        setRecalcLoading(true);
        setError('');
        setMessage('');
        try {
            const { data } = await api.post(
                `/admin/scoring/recalculate/season/${sid}`,
                {},
                { timeout: 300000 } // season recalc can be lengthy
            );
            setMessage(data?.message || `Recalculation completed for season ${sid}.`);
        } catch (err) {
            setError(err?.response?.data?.message || err.message || 'Season recalculation failed.');
        } finally {
            setRecalcLoading(false);
        }
    };

    const handleRecalculateAll = async (e) => {
        e.preventDefault();
        if (!window.confirm('Recalculate all seasons? This may take time.')) return;
        setRecalcLoading(true);
        setError('');
        setMessage('');
        try {
            const { data } = await api.post(
                '/admin/scoring/recalculate/all',
                {},
                { timeout: 900000 } // all-seasons recalc may take several minutes
            );
            setMessage(data?.message || 'Recalculation completed for all seasons.');
        } catch (err) {
            setError(err?.response?.data?.message || err.message || 'Global recalculation failed.');
        } finally {
            setRecalcLoading(false);
        }
    };

    if (loading) return <div>Loading impact settings...</div>;

    return (
        <div>
            <h2>Impact Settings</h2>
            {error && <p className="error-message">{error}</p>}
            {message && <p style={{ color: 'green' }}>{message}</p>}

            <form onSubmit={handleSave} style={{ marginBottom: '1.5rem' }}>
                <h3>Impact Inputs</h3>
                <p style={{ marginTop: 0 }}>Configure batting, bowling, wicket, fielding and super over multipliers.</p>
                <h4 style={{ marginBottom: '0.5rem' }}>Batting</h4>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label htmlFor="bat-dot">Dot ball:</label>
                    <input id="bat-dot" type="number" step="0.25" value={settings.batting_dot_ball} onChange={(e) => setSettings((s) => ({ ...s, batting_dot_ball: e.target.value }))} disabled={saving} />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label htmlFor="bat-1">1 run:</label>
                    <input id="bat-1" type="number" step="0.25" value={settings.batting_one_run} onChange={(e) => setSettings((s) => ({ ...s, batting_one_run: e.target.value }))} disabled={saving} />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label htmlFor="bat-2">2 runs:</label>
                    <input id="bat-2" type="number" step="0.25" value={settings.batting_two_runs} onChange={(e) => setSettings((s) => ({ ...s, batting_two_runs: e.target.value }))} disabled={saving} />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label htmlFor="bat-4">4 runs:</label>
                    <input id="bat-4" type="number" step="0.25" value={settings.batting_four_runs} onChange={(e) => setSettings((s) => ({ ...s, batting_four_runs: e.target.value }))} disabled={saving} />
                </div>
                <h4 style={{ marginBottom: '0.5rem' }}>Bowling</h4>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label htmlFor="bowl-legal-dot">Legal dot ball:</label>
                    <input id="bowl-legal-dot" type="number" step="0.25" value={settings.bowling_legal_dot} onChange={(e) => setSettings((s) => ({ ...s, bowling_legal_dot: e.target.value }))} disabled={saving} />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label htmlFor="bowl-extra-dot">Wide/No-ball (0 conceded):</label>
                    <input id="bowl-extra-dot" type="number" step="0.25" value={settings.bowling_extra_dot} onChange={(e) => setSettings((s) => ({ ...s, bowling_extra_dot: e.target.value }))} disabled={saving} />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label htmlFor="bowl-legal-1">Legal 1 conceded:</label>
                    <input id="bowl-legal-1" type="number" step="0.25" value={settings.bowling_legal_one} onChange={(e) => setSettings((s) => ({ ...s, bowling_legal_one: e.target.value }))} disabled={saving} />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label htmlFor="bowl-extra-1">Wide/No-ball (1 conceded):</label>
                    <input id="bowl-extra-1" type="number" step="0.25" value={settings.bowling_extra_one} onChange={(e) => setSettings((s) => ({ ...s, bowling_extra_one: e.target.value }))} disabled={saving} />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label htmlFor="bowl-2">2 conceded:</label>
                    <input id="bowl-2" type="number" step="0.25" value={settings.bowling_two_conceded} onChange={(e) => setSettings((s) => ({ ...s, bowling_two_conceded: e.target.value }))} disabled={saving} />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label htmlFor="bowl-4">4 conceded:</label>
                    <input id="bowl-4" type="number" step="0.25" value={settings.bowling_four_conceded} onChange={(e) => setSettings((s) => ({ ...s, bowling_four_conceded: e.target.value }))} disabled={saving} />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label htmlFor="bowl-extra-other">Wide/No-ball (other runs):</label>
                    <input id="bowl-extra-other" type="number" step="0.25" value={settings.bowling_extra_other} onChange={(e) => setSettings((s) => ({ ...s, bowling_extra_other: e.target.value }))} disabled={saving} />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label htmlFor="bowl-wk">Wicket bonus (non run-out):</label>
                    <input id="bowl-wk" type="number" step="0.25" value={settings.bowling_wicket_bonus} onChange={(e) => setSettings((s) => ({ ...s, bowling_wicket_bonus: e.target.value }))} disabled={saving} />
                </div>
                <h4 style={{ marginBottom: '0.5rem' }}>Fielding</h4>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label htmlFor="field-cs">Caught/Stumped:</label>
                    <input id="field-cs" type="number" step="0.25" value={settings.fielding_catch_stumping} onChange={(e) => setSettings((s) => ({ ...s, fielding_catch_stumping: e.target.value }))} disabled={saving} />
                </div>
                <h4 style={{ marginBottom: '0.5rem' }}>Super Over Multipliers</h4>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label htmlFor="bat-mult">Batting multiplier:</label>
                    <input
                        id="bat-mult"
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={settings.super_over_batting_multiplier}
                        onChange={(e) => setSettings((s) => ({ ...s, super_over_batting_multiplier: e.target.value }))}
                        disabled={saving}
                    />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label htmlFor="bowl-mult">Bowling multiplier:</label>
                    <input
                        id="bowl-mult"
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={settings.super_over_bowling_multiplier}
                        onChange={(e) => setSettings((s) => ({ ...s, super_over_bowling_multiplier: e.target.value }))}
                        disabled={saving}
                    />
                </div>
                <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
            </form>

            <form onSubmit={handleRecalculate}>
                <h3>Recalculate Match Stats</h3>
                <p style={{ marginTop: 0 }}>Runs PMS resync + impact recompute from ball-by-ball.</p>
                <input
                    type="number"
                    min="1"
                    placeholder="Match ID"
                    value={matchId}
                    onChange={(e) => setMatchId(e.target.value)}
                    disabled={recalcLoading}
                />
                <button type="submit" disabled={recalcLoading} style={{ marginLeft: '0.5rem' }}>
                    {recalcLoading ? 'Recalculating...' : 'Recalculate'}
                </button>
            </form>

            <form onSubmit={handleRecalculateSeason} style={{ marginTop: '1.5rem' }}>
                <h3>Recalculate Season Stats</h3>
                <p style={{ marginTop: 0 }}>Runs recalculation for all matches in a season.</p>
                <select
                    value={seasonId}
                    onChange={(e) => setSeasonId(e.target.value)}
                    disabled={recalcLoading || seasons.length === 0}
                >
                    {seasons.length === 0 && <option value="">No seasons available</option>}
                    {seasons.map((s) => (
                        <option key={s.season_id} value={s.season_id}>
                            {s.name} ({s.year})
                        </option>
                    ))}
                </select>
                <button type="submit" disabled={recalcLoading || !seasonId} style={{ marginLeft: '0.5rem' }}>
                    {recalcLoading ? 'Recalculating...' : 'Recalculate Season'}
                </button>
            </form>

            <form onSubmit={handleRecalculateAll} style={{ marginTop: '1.5rem' }}>
                <h3>Recalculate All-Time Stats</h3>
                <p style={{ marginTop: 0 }}>Runs recalculation for all matches across all seasons.</p>
                <button type="submit" disabled={recalcLoading}>
                    {recalcLoading ? 'Recalculating...' : 'Recalculate All Seasons'}
                </button>
            </form>
        </div>
    );
}

export default AdminImpactSettingsPage;
