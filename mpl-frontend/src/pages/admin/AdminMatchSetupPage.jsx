// mpl-project/mpl-frontend/src/pages/admin/AdminMatchSetupPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import LoadingFallback from '../../components/LoadingFallback';

function AdminMatchSetupPage() {
    const [matches, setMatches] = useState([]); // Matches in 'Scheduled' state
    const [selectedMatchId, setSelectedMatchId] = useState('');
    const [selectedMatchDetails, setSelectedMatchDetails] = useState(null); // Holds { team1_id, team1_name, team2_id, team2_name }

    // Form state
    const [tossWinnerTeamId, setTossWinnerTeamId] = useState('');
    const [decision, setDecision] = useState(''); // 'Bat' or 'Bowl'

    // UI State
    const [loading, setLoading] = useState(true); // Loading matches list
    const [submitting, setSubmitting] = useState(false); // Submitting setup form
    const [error, setError] = useState('');

    const navigate = useNavigate();

    // Fetch scheduled matches on component mount
    useEffect(() => {
        const fetchScheduledMatches = async () => {
            setLoading(true);
            setError('');
            try {
                const { data } = await api.get('/admin/scoring/setup-list');
                setMatches(data);
                // Reset selection if list reloads? Optional.
                // setSelectedMatchId('');
                // setSelectedMatchDetails(null);
            } catch (err) {
                console.error("Failed to fetch scheduled matches:", err);
                setError(typeof err === 'string' ? err : 'Failed to load matches ready for setup.');
            } finally {
                setLoading(false);
            }
        };
        fetchScheduledMatches();
    }, []); // Run only once on mount

    // Update selected match details when dropdown changes
    useEffect(() => {
        if (selectedMatchId) {
            const match = matches.find(m => m.match_id === parseInt(selectedMatchId));
            setSelectedMatchDetails(match || null);
            setTossWinnerTeamId('');
            setDecision('');
            setError('');
        } else {
            setSelectedMatchDetails(null);
        }
    }, [selectedMatchId, matches]);

    // Form submit handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // --- Validation ---
        if (!selectedMatchId) {
            setError('Please select a match.');
            return;
        }
        if (!tossWinnerTeamId) {
            setError('Please select the toss winner.');
            return;
        }
        if (!decision) {
            setError('Please select the decision (Bat/Bowl).');
            return;
        }
        // --- End Validation ---

        setSubmitting(true);
        try {
            const payload = {
                toss_winner_team_id: parseInt(tossWinnerTeamId),
                decision: decision,
            };
            console.log(`Submitting setup for Match ${selectedMatchId}:`, payload);

            // Make API call to submit setup
            const { data } = await api.post(`/admin/scoring/matches/${selectedMatchId}/setup`, payload);

            console.log("Match setup successful:", data);

            // Navigate to live scoring page, passing the initial state received from backend
            navigate(`/admin/scoring/live/${selectedMatchId}`, {
                state: { initialState: data.initialState }
            });

        } catch (err) {
            console.error("Failed to submit match setup:", err);
            // If err is string (from interceptor), use it, else extract message
            const errorMessage = typeof err === 'string' ? err : (err.response?.data?.message || err.message || 'Failed to submit setup. Please try again.');
            setError(errorMessage);
            setSubmitting(false); // Stop submitting indicator on error
        }
        // No finally block for setSubmitting(false) because we navigate away on success
    };


    // --- Render Logic ---
    if (loading) return <LoadingFallback message="Loading available matches..." />;


    return (
        <div>
            <h2>Setup Match Scoring</h2>
            {error && <p className="error-message">{error}</p>}

            {/* Match Selection Dropdown */}
            <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="match-select">Select Match to Setup:</label>
                <select
                    id="match-select"
                    value={selectedMatchId}
                    onChange={(e) => setSelectedMatchId(e.target.value)}
                    required
                    disabled={submitting}
                >
                    <option value="">-- Select a Match --</option>
                    {matches.length > 0 ? (
                        matches.map(match => {
                            const dt = new Date(match.match_datetime);
                            const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const matchNum = match.match_number ?? match.matchNumber ?? match.match_id;
                            return (
                                <option key={match.match_id} value={match.match_id}>
                                    Match {matchNum} · {timeStr} - {match.team1_name} vs {match.team2_name}
                                </option>
                            );
                        })
                    ) : (
                        <option value="" disabled>No scheduled matches found</option>
                    )}
                </select>
            </div>

            {/* Setup Form (shown only when a match is selected) */}
            {selectedMatchDetails && (
                <form onSubmit={handleSubmit}>
                    <h3>Setup for Match {selectedMatchDetails.match_number ?? selectedMatchDetails.matchNumber ?? '—'}: {selectedMatchDetails.team1_name} vs {selectedMatchDetails.team2_name}</h3>

                    {/* Toss Winner Selection */}
                    <div>
                        <label htmlFor="toss-winner">Toss Winner:</label>
                        <select
                            id="toss-winner"
                            value={tossWinnerTeamId}
                            onChange={(e) => setTossWinnerTeamId(e.target.value)}
                            required
                            disabled={submitting}
                        >
                            <option value="">-- Select Toss Winner --</option>
                            <option value={selectedMatchDetails.team1_id}>{selectedMatchDetails.team1_name}</option>
                            <option value={selectedMatchDetails.team2_id}>{selectedMatchDetails.team2_name}</option>
                        </select>
                    </div>

                    {/* Decision Selection */}
                    <div>
                        <label htmlFor="decision">Decision:</label>
                        <select
                            id="decision"
                            value={decision}
                            onChange={(e) => setDecision(e.target.value)}
                            required
                            disabled={submitting}
                        >
                            <option value="">-- Select Decision --</option>
                            <option value="Bat">Bat</option>
                            <option value="Bowl">Bowl</option>
                        </select>
                    </div>

                    {/* Super Over (from schedule, read-only) */}
                    <div>
                        <strong>Super Over:</strong>{' '}
                        {selectedMatchDetails.super_over_number != null && selectedMatchDetails.super_over_number >= 1 && selectedMatchDetails.super_over_number <= 5
                            ? `Over #${selectedMatchDetails.super_over_number}`
                            : '–'}
                    </div>

                    {/* Submit Button */}
                    <button type="submit" disabled={submitting || !selectedMatchId}>
                        {submitting ? 'Submitting Setup...' : 'Confirm Setup & Proceed to Live Scoring'}
                    </button>
                </form>
            )}
        </div>
    );
}

export default AdminMatchSetupPage;