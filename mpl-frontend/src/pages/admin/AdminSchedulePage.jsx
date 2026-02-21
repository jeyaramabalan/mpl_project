// mpl-project/mpl-frontend/src/pages/admin/AdminSchedulePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import LoadingFallback from '../../components/LoadingFallback';
import ConfirmDialog from '../../components/ConfirmDialog';

// --- Match Form Component ---
const MatchForm = ({ onSubmit, initialData = {}, seasons = [], teams = [], loading, onCancel }) => {
    const [formData, setFormData] = useState({
        season_id: '',
        team1_id: '',
        team2_id: '',
        match_datetime: '',
        venue: 'Bowyer Park',
        // status: 'Scheduled' // Status generally not editable here
    });
     const [filteredTeams, setFilteredTeams] = useState([]);

    // Effect to initialize form when initialData or seasons change
    useEffect(() => {
        const initialSeason = initialData.season_id || (seasons.length > 0 ? seasons[0].season_id : '');
        setFormData({
            season_id: initialSeason,
            team1_id: initialData.team1_id || '',
            team2_id: initialData.team2_id || '',
            match_datetime: initialData.match_datetime ? initialData.match_datetime.substring(0, 16) : '', // Format for datetime-local T separation
            venue: initialData.venue || 'Bowyer Park',
            status: initialData.status || 'Scheduled' // Keep track of status for display/logic
        });
    }, [initialData, seasons]);

     // Effect to update available teams when selected season changes
     useEffect(() => {
         if (formData.season_id) {
            const seasonTeams = teams.filter(t => t.season_id === parseInt(formData.season_id));
            setFilteredTeams(seasonTeams);
             // Reset team selections if the currently selected teams are not in the newly selected season
             if (formData.team1_id && !seasonTeams.some(t => t.team_id === parseInt(formData.team1_id))) {
                setFormData(prev => ({ ...prev, team1_id: '' }));
             }
              if (formData.team2_id && !seasonTeams.some(t => t.team_id === parseInt(formData.team2_id))) {
                setFormData(prev => ({ ...prev, team2_id: '' }));
             }
         } else {
             setFilteredTeams([]);
              setFormData(prev => ({ ...prev, team1_id: '', team2_id: '' })); // Clear teams if no season
         }
     }, [formData.season_id, teams]);


    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
         if (!formData.season_id || !formData.team1_id || !formData.team2_id || !formData.match_datetime) {
             alert("Please fill in all required fields (Season, Team 1, Team 2, Date & Time).");
             return;
         }
         if (formData.team1_id === formData.team2_id) {
             alert("Team 1 and Team 2 cannot be the same.");
             return;
         }
         // Format datetime for backend (YYYY-MM-DD HH:MM:SS)
         const payload = {
             ...formData,
             season_id: parseInt(formData.season_id),
             team1_id: parseInt(formData.team1_id),
             team2_id: parseInt(formData.team2_id),
             match_datetime: formData.match_datetime.replace('T', ' ') + ':00'
         };
         // Remove status if we don't want to send it during create/update of schedule
         delete payload.status;

        onSubmit(payload);
    };

    const isEditing = !!initialData.match_id;

    return (
        <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>{isEditing ? `Edit Match ID: ${initialData.match_id}` : 'Schedule New Match'}</h3>
             <div>
                 <label htmlFor="season_id">Season:*</label>
                 <select id="season_id" name="season_id" value={formData.season_id} onChange={handleChange} required disabled={loading || isEditing}> {/* Disable season change when editing */}
                     <option value="">-- Select Season --</option>
                     {seasons.map(s => <option key={s.season_id} value={s.season_id}>{s.name} ({s.year})</option>)}
                 </select>
             </div>
             <div>
                 <label htmlFor="team1_id">Team 1:*</label>
                 <select id="team1_id" name="team1_id" value={formData.team1_id} onChange={handleChange} required disabled={loading || !formData.season_id || (isEditing && formData.status !== 'Scheduled')}>
                     <option value="">-- Select Team 1 --</option>
                     {filteredTeams.map(t => <option key={'t1-'+t.team_id} value={t.team_id}>{t.name}</option>)}
                 </select>
             </div>
             <div>
                 <label htmlFor="team2_id">Team 2:*</label>
                 <select id="team2_id" name="team2_id" value={formData.team2_id} onChange={handleChange} required disabled={loading || !formData.season_id || (isEditing && formData.status !== 'Scheduled')}>
                     <option value="">-- Select Team 2 --</option>
                      {/* Filter out selected team 1 */}
                     {filteredTeams.filter(t => t.team_id !== parseInt(formData.team1_id)).map(t => <option key={'t2-'+t.team_id} value={t.team_id}>{t.name}</option>)}
                 </select>
             </div>
             <div>
                 <label htmlFor="match_datetime">Date & Time:*</label>
                 <input
                    type="datetime-local"
                    id="match_datetime"
                    name="match_datetime"
                    value={formData.match_datetime}
                    onChange={handleChange}
                    required
                    disabled={loading || (isEditing && formData.status !== 'Scheduled')}
                 />
             </div>
             <div>
                 <label htmlFor="venue">Venue:</label>
                 <input
                    type="text"
                    id="venue"
                    name="venue"
                    value={formData.venue}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder='Defaults to Bowyer Park'
                 />
             </div>
             {/* Optionally allow editing status back to Scheduled or to Abandoned if needed */}
             {/* {isEditing && (
                 <div>
                     <label htmlFor="status">Status:</label>
                     <select name="status" value={formData.status} onChange={handleChange} disabled={loading}>
                         <option value="Scheduled">Scheduled</option>
                         <option value="Abandoned">Abandoned</option>
                     </select>
                 </div>
             )} */}
             <div style={{ marginTop: '1.5rem' }}>
                 <button type="submit" disabled={loading}>{loading ? 'Saving...' : (isEditing ? 'Update Match' : 'Add Match')}</button>
                 {isEditing && <button type="button" onClick={onCancel} style={{ marginLeft: '1rem', backgroundColor: '#6c757d' }} disabled={loading}>Cancel Edit</button>}
             </div>
        </form>
    );
};


// --- Main Page Component ---
function AdminSchedulePage() {
    const [seasons, setSeasons] = useState([]);
    const [allTeams, setAllTeams] = useState([]); // Fetch all teams for form dropdowns
    const [matches, setMatches] = useState([]); // Matches displayed in the list
    const [selectedSeasonFilter, setSelectedSeasonFilter] = useState(''); // Filter list by season
    const [editingMatch, setEditingMatch] = useState(null); // Holds match object if editing
    const [loading, setLoading] = useState(true); // Combined loading state
    const [formLoading, setFormLoading] = useState(false); // Specific loading for form submission
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [deleteMatchTarget, setDeleteMatchTarget] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [seasonsRes, teamsRes] = await Promise.all([
                api.get('/admin/seasons'),
                api.get('/admin/teams')
            ]);

            const seasons = seasonsRes.data || [];
            const teams = teamsRes.data || [];

            // Sort seasons descending by season_id or start_date
            const sortedSeasons = [...seasons].sort((a, b) => b.season_id - a.season_id);
            setSeasons(sortedSeasons);
            setAllTeams(teams);

            if (sortedSeasons.length > 0) {
                if (!selectedSeasonFilter) {
                    setSelectedSeasonFilter(sortedSeasons[0].season_id); // Safely set default
                } else {
                    fetchMatches(selectedSeasonFilter); // Season already selected
                }
            } else {
                setMatches([]); // No seasons, no matches
                setLoading(false);
            }

        } catch (err) {
            console.error("Failed to load initial data:", err);
            setError(typeof err === 'string' ? err : 'Failed to load necessary data (Seasons/Teams).');
            setLoading(false);
        }
    }, [selectedSeasonFilter]);

    const fetchMatches = useCallback(async (seasonId) => {
         if (!seasonId) {
             setMatches([]);
             setLoading(false); // Ensure loading stops if no season is selected
             return;
         };
         // Keep main loading true until matches are fetched
         // setLoading(true); // Already set in fetchData or handled separately
         setError('');
        try {
            const { data } = await api.get(`/admin/matches?season_id=${seasonId}`);
            setMatches(data);
        } catch (err) {
            console.error(`Failed to fetch matches for season ${seasonId}:`, err);
            setError(typeof err === 'string' ? err : 'Failed to load match schedule.');
        } finally {
             setLoading(false); // Final loading state update
        }
    }, []);

    // Initial data fetch on mount
    useEffect(() => {
        fetchData();
    }, [fetchData]); // fetchData is memoized by useCallback

     // Fetch matches when filter changes
     useEffect(() => {
        if (selectedSeasonFilter) {
             setLoading(true); // Show loading when filter changes
             fetchMatches(selectedSeasonFilter);
        } else {
             setMatches([]); // Clear matches if no season selected
             setLoading(false); // Stop loading if no filter selected after initial load
        }
    }, [selectedSeasonFilter, fetchMatches]);

    // --- Handlers ---
    const handleFormSubmit = async (payload) => {
        setFormLoading(true);
        setError('');
        try {
            if (editingMatch) {
                // Update existing match
                await api.put(`/admin/matches/${editingMatch.match_id}`, payload);
            } else {
                // Create new match
                await api.post(`/admin/matches`, payload);
            }
            setEditingMatch(null); // Close form
            setShowAddForm(false); // Close add form if open
            fetchMatches(selectedSeasonFilter || payload.season_id); // Refresh list for current/new season
        } catch (err) {
             setError(typeof err === 'string' ? err : `Failed to ${editingMatch ? 'update' : 'add'} match.`);
        } finally {
             setFormLoading(false);
        }
    };

    const handleEditClick = (match) => {
        setShowAddForm(false); // Hide add form if open
        setEditingMatch(match); // Set the match to edit, form will populate
    };

    const handleCancelEdit = () => {
        setEditingMatch(null);
    };

    const handleDeleteMatch = async () => {
        if (!deleteMatchTarget) return;
        setError('');
        setLoading(true);
        try {
            await api.delete(`/admin/matches/${deleteMatchTarget.match_id}`);
            setDeleteMatchTarget(null);
            fetchMatches(selectedSeasonFilter);
        } catch (err) {
            setError(typeof err === 'string' ? err : (err.response?.data?.message || 'Failed to delete match.'));
            setLoading(false);
        }
    };


    return (
        <div>
            <h2>Manage Match Schedule</h2>

            {error && <p className="error-message">{error}</p>}

            <ConfirmDialog open={!!deleteMatchTarget} title="Delete match" message={deleteMatchTarget ? `Delete match ID ${deleteMatchTarget.match_id} (${deleteMatchTarget.team1_name} vs ${deleteMatchTarget.team2_name})? This cannot be undone.` : ''} confirmLabel="Delete" cancelLabel="Cancel" variant="danger" onConfirm={handleDeleteMatch} onCancel={() => setDeleteMatchTarget(null)} />

            {/* Filter and Add Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                 <div>
                     <label htmlFor="season-filter">Filter by Season:</label>
                     <select
                         id="season-filter"
                         value={selectedSeasonFilter}
                         onChange={(e) => { setSelectedSeasonFilter(e.target.value); setEditingMatch(null); setShowAddForm(false); }} // Reset forms on filter change
                         disabled={loading}
                     >
                         <option value="">-- Select a Season --</option>
                         {seasons.map(s => <option key={s.season_id} value={s.season_id}>{s.name} ({s.year})</option>)}
                     </select>
                 </div>
                <button onClick={() => { setShowAddForm(true); setEditingMatch(null); }} disabled={loading || formLoading}>
                    + Add New Match
                </button>
            </div>

            {/* Add/Edit Form Area */}
            {(showAddForm || editingMatch) && (
                <MatchForm
                     onSubmit={handleFormSubmit}
                     initialData={editingMatch || {}} // Pass empty object if adding
                     seasons={seasons}
                     teams={allTeams} // Pass all teams
                     loading={formLoading}
                     onCancel={handleCancelEdit}
                 />
            )}

             {/* Matches List */}
            <h3>Match List {selectedSeasonFilter ? `(${seasons.find(s=>s.season_id==selectedSeasonFilter)?.name})` : ''}</h3>
            {loading && <LoadingFallback message="Loading matches..." />}
             {!loading && matches.length === 0 && selectedSeasonFilter && <p>No matches scheduled for this season yet.</p>}
             {!loading && !selectedSeasonFilter && <p>Please select a season to view the schedule.</p>}

            {!loading && matches.length > 0 && (
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Date & Time</th>
                            <th>Team 1</th>
                            <th>Team 2</th>
                            <th>Venue</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {matches.map(match => (
                            <tr key={match.match_id}>
                                <td>{match.match_id}</td>
                                <td>{new Date(match.match_datetime).toLocaleString()}</td>
                                <td>{match.team1_name}</td>
                                <td>{match.team2_name}</td>
                                <td>{match.venue}</td>
                                <td>{match.status}</td>
                                <td>
                                    <button
                                        onClick={() => handleEditClick(match)}
                                        disabled={formLoading || !!editingMatch} // Disable if already editing another
                                        style={{ padding: '0.3em 0.6em', fontSize: '0.9rem', marginRight: '0.5rem' }}
                                    >
                                        Edit
                                    </button>
                                     {/* Allow deleting only scheduled matches */}
                                     {match.status === 'Scheduled' && (
                                        <button
                                            onClick={() => setDeleteMatchTarget(match)}
                                            disabled={loading || formLoading}
                                            style={{ padding: '0.3em 0.6em', fontSize: '0.9rem', backgroundColor: '#dc3545' }}
                                        >
                                            Delete
                                        </button>
                                     )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default AdminSchedulePage;