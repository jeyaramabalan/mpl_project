// src/pages/admin/AdminResolveMatchPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import LoadingFallback from '../../components/LoadingFallback';

function AdminResolveMatchPage() {
    const [seasons, setseasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');
    const [matches, setmatches] = useState([]); // matches needing resolution
    const [selectedMatch, setSelectedMatch] = useState(null); // Full details of the selected match
    const [loadingseasons, setLoadingseasons] = useState(true);
    const [loadingmatches, setLoadingmatches] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [resolutionStatus, setResolutionStatus] = useState('Completed'); // Completed | Abandoned
    const [winnerTeamId, setWinnerTeamId] = useState(''); // team_id or '' for tie/abandoned
    const [resultSummary, setResultSummary] = useState('');
    const [momPlayerId, setMomPlayerId] = useState(''); // Optional

    // Fetch seasons
    useEffect(() => {
        const fetchseasons = async () => {
            setLoadingseasons(true);
            try {
                const { data } = await api.get('/admin/seasons');
                setseasons(data);
                if (data.length > 0) setSelectedSeason(data[0].season_id);
            } catch (err) { setError('Failed to load seasons.'); }
            finally { setLoadingseasons(false); }
        };
        fetchseasons();
    }, []);

    // Fetch matches needing resolution when season changes
    const fetchmatchesToResolve = useCallback(async () => {
        if (!selectedSeason) {
            setmatches([]); return;
        }
        setLoadingmatches(true); setError(''); setmatches([]); setSelectedMatch(null); // Reset
        try {
            // Fetch matches that are Tied (winner is NULL but status is Completed) OR Abandoned OR maybe Stuck in Live/Break?
            // Adjust the statuses based on what you want admins to be able to resolve
            const statusesToFetch = ['Completed', 'Abandoned', 'Live', 'InningsBreak', 'Setup']; // Example
            const params = {
                season_id: selectedSeason,
                // Query multiple statuses if your API supports it, otherwise fetch all and filter locally
                // status: statusesToFetch.join(',') // Example if API supports comma-separated statuses
            };
             // Fetch ALL matches for the season and filter locally for now
             const { data } = await api.get('/admin/matches', { params });

             // Filter for matches that might need resolution
             const filteredmatches = data.filter(m =>
                (m.status === 'Completed' && m.winner_team_id === null) || // Tied matches
                 m.status === 'Abandoned' || // Already abandoned
                 m.status === 'Live' || // Stuck Live?
                 m.status === 'InningsBreak' || // Stuck in Break?
                 m.status === 'Setup' // Stuck in Setup?
                // Add any other statuses you want to allow resolution for
             );
             setmatches(filteredmatches);

        } catch (err) { setError(typeof err === 'string' ? err : 'Failed to load matches.'); }
        finally { setLoadingmatches(false); }
    }, [selectedSeason]);

    useEffect(() => {
        fetchmatchesToResolve();
    }, [fetchmatchesToResolve]);

    // Handle match selection
    const handleMatchSelect = (matchId) => {
        const match = matches.find(m => m.match_id === parseInt(matchId));
        setSelectedMatch(match || null);
        // Reset form fields when selecting a new match
        setResolutionStatus('Completed');
        setWinnerTeamId(match?.winner_team_id ?? ''); // Pre-fill if already set
        setResultSummary(match?.result_summary || '');
        setMomPlayerId(match?.man_of_the_match_player_id || '');
        setError('');
    };

    // Handle form submission
    const handleSubmitResolution = async (e) => {
        e.preventDefault();
        if (!selectedMatch) return;
        setError('');
        setSubmitting(true);

        // Basic validation
        if (resolutionStatus === 'Completed' && !resultSummary) {
            setError('Result summary is required for Completed status.');
            setSubmitting(false);
            return;
        }
        if (resolutionStatus === 'Completed' && winnerTeamId === '') {
             if (!window.confirm("You haven't selected a winner. Is this match a Tie?")) {
                 setSubmitting(false);
                 return;
             }
        }


        const payload = {
            status: resolutionStatus,
            winner_team_id: winnerTeamId === '' ? null : parseInt(winnerTeamId),
            result_summary: resultSummary,
            man_of_the_match_player_id: momPlayerId === '' ? null : parseInt(momPlayerId),
        };

        try {
            await api.put(`/admin/matches/${selectedMatch.match_id}/resolve`, payload);
            alert('Match resolved successfully!');
            setSelectedMatch(null); // Clear selection
            fetchmatchesToResolve(); // Refresh the list
        } catch (err) {
            setError(typeof err === 'string' ? err : 'Failed to resolve match.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="admin-resolve-match-page">
            <h2>Resolve Match Result</h2>

            {loadingseasons ? <LoadingFallback /> : (
                <div className="filter-section">
                    <label htmlFor="season-select-resolve">Select Season:</label>
                    <select id="season-select-resolve" value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)} disabled={loadingmatches || submitting}>
                        <option value="">-- Select Season --</option>
                        {seasons.map(s => (<option key={s.season_id} value={s.season_id}>{s.name} ({s.year})</option>))}
                    </select>
                </div>
            )}

            {error && <p className="error-message">{error}</p>}

            {loadingmatches && <LoadingFallback message="Loading matches..." />}

            {!loadingmatches && selectedSeason && matches.length === 0 && (
                <p>No matches found needing resolution for this season.</p>
            )}

            {!loadingmatches && matches.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <label htmlFor="match-select-resolve">Select Match to Resolve:</label>
                    <select id="match-select-resolve" value={selectedMatch?.match_id || ''} onChange={(e) => handleMatchSelect(e.target.value)} disabled={submitting}>
                        <option value="">-- Select Match --</option>
                        {matches.map(m => (
                            <option key={m.match_id} value={m.match_id}>
                                ID: {m.match_id} ({m.team1_name} vs {m.team2_name}) - Status: {m.status}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {selectedMatch && (
                <form onSubmit={handleSubmitResolution}>
                    <h3>Resolving: {selectedMatch.team1_name} vs {selectedMatch.team2_name} (ID: {selectedMatch.match_id})</h3>
                    <p>Current Status: {selectedMatch.status}</p>

                    <div>
                        <label htmlFor="resolutionStatus">Set Final Status:*</label>
                        <select id="resolutionStatus" value={resolutionStatus} onChange={(e) => setResolutionStatus(e.target.value)} required disabled={submitting}>
                            <option value="Completed">Completed</option>
                            <option value="Abandoned">Abandoned</option>
                        </select>
                    </div>

                    {resolutionStatus === 'Completed' && (
                        <div>
                            <label htmlFor="winnerTeamId">Winner:</label>
                            <select id="winnerTeamId" value={winnerTeamId} onChange={(e) => setWinnerTeamId(e.target.value)} disabled={submitting}>
                                <option value="">-- Select Winner (or leave for Tie) --</option>
                                <option value={selectedMatch.team1_id}>{selectedMatch.team1_name}</option>
                                <option value={selectedMatch.team2_id}>{selectedMatch.team2_name}</option>
                            </select>
                        </div>
                    )}

                    <div>
                        <label htmlFor="resultSummary">Result Summary:*</label>
                        <input type="text" id="resultSummary" value={resultSummary} onChange={(e) => setResultSummary(e.target.value)} required={resolutionStatus === 'Completed'} disabled={submitting} placeholder={resolutionStatus === 'Abandoned' ? 'Reason for abandonment (optional)' : 'E.g., Team X won by Y runs/wickets'} />
                    </div>

                    {resolutionStatus === 'Completed' && (
                         <div>
                            <label htmlFor="momPlayerId">Man of the Match (Player ID - Optional):</label>
                            <input type="number" id="momPlayerId" value={momPlayerId} onChange={(e) => setMomPlayerId(e.target.value)} disabled={submitting} placeholder="Enter Player ID"/>
                             {/* TODO: Replace with a searchable player dropdown filtered by teams in match */}
                         </div>
                    )}

                    <button type="submit" disabled={submitting || !selectedMatch}>
                        {submitting ? 'Saving Resolution...' : 'Save Resolution'}
                    </button>
                </form>
            )}
        </div>
    );
}

export default AdminResolveMatchPage;