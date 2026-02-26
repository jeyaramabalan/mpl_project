// mpl-project/mpl-frontend/src/pages/admin/AdminSchedulePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { toList } from '../../utils/apiResponse';
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
    const [showCreateScheduleModal, setShowCreateScheduleModal] = useState(false);
    const [createScheduleForm, setCreateScheduleForm] = useState({ matches_per_team: 6, start_date: '', venue: 'Bowyer Park' });
    const [createScheduleLoading, setCreateScheduleLoading] = useState(false);
    const [sortBy, setSortBy] = useState('match_id');
    const [sortOrder, setSortOrder] = useState('asc');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [seasonsRes, teamsRes] = await Promise.all([
                api.get('/admin/seasons'),
                api.get('/admin/teams')
            ]);

            const seasons = toList(seasonsRes.data);
            const teams = toList(teamsRes.data);

            // Sort seasons descending by season_id or start_date
            const sortedSeasons = [...seasons].sort((a, b) => (b.season_id || 0) - (a.season_id || 0));
            setSeasons(sortedSeasons);
            setAllTeams(teams);

            if (sortedSeasons.length > 0) {
                const firstId = sortedSeasons[0].season_id;
                const firstNum = firstId != null && Number.isInteger(Number(firstId)) ? Number(firstId) : null;
                if (!selectedSeasonFilter) {
                    if (firstNum != null) setSelectedSeasonFilter(firstNum);
                } else if (firstNum != null) {
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
            setMatches(toList(data));
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

    const handleCreateScheduleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedSeasonFilter || !createScheduleForm.matches_per_team) return;
        setCreateScheduleLoading(true);
        setError('');
        try {
            const payload = {
                season_id: parseInt(selectedSeasonFilter),
                matches_per_team: parseInt(createScheduleForm.matches_per_team),
            };
            if (createScheduleForm.start_date) payload.start_date = createScheduleForm.start_date;
            if (createScheduleForm.venue) payload.venue = createScheduleForm.venue;
            await api.post('/admin/matches/generate-schedule', payload);
            setShowCreateScheduleModal(false);
            setCreateScheduleForm({ matches_per_team: 6, start_date: '', venue: 'Bowyer Park' });
            fetchMatches(selectedSeasonFilter);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create schedule.');
        } finally {
            setCreateScheduleLoading(false);
        }
    };


    return (
        <div>
            <h2>Manage Match Schedule</h2>

            {error && <p className="error-message">{error}</p>}

            <ConfirmDialog open={!!deleteMatchTarget} title="Delete match" message={deleteMatchTarget ? `Delete match ID ${deleteMatchTarget.match_id} (${deleteMatchTarget.team1_name} vs ${deleteMatchTarget.team2_name})? This cannot be undone.` : ''} confirmLabel="Delete" cancelLabel="Cancel" variant="danger" onConfirm={handleDeleteMatch} onCancel={() => setDeleteMatchTarget(null)} />

            {showCreateScheduleModal && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => !createScheduleLoading && setShowCreateScheduleModal(false)}>
                    <div className="modal-content mpl-card" style={{ padding: '1.5rem', minWidth: '320px', maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>Create schedule</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--mpl-grey-600)', marginBottom: '1rem' }}>Matches start at 8:00 AM London time, 30 minutes apart. A random super over (1–5) is assigned per match. Cannot create for a completed season.</p>
                        <form onSubmit={handleCreateScheduleSubmit}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label htmlFor="matches_per_team">Number of league matches per team *</label>
                                <input
                                    id="matches_per_team"
                                    type="number"
                                    min="1"
                                    value={createScheduleForm.matches_per_team}
                                    onChange={e => setCreateScheduleForm(prev => ({ ...prev, matches_per_team: e.target.value }))}
                                    required
                                    disabled={createScheduleLoading}
                                    style={{ display: 'block', marginTop: '0.25rem', padding: '0.4rem', width: '100%' }}
                                />
                                <small style={{ color: 'var(--mpl-grey-600)' }}>For N teams, use a multiple of (N-1), e.g. 3 or 6 for 4 teams.</small>
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label htmlFor="start_date">Start date (optional)</label>
                                <input
                                    id="start_date"
                                    type="date"
                                    value={createScheduleForm.start_date}
                                    onChange={e => setCreateScheduleForm(prev => ({ ...prev, start_date: e.target.value }))}
                                    disabled={createScheduleLoading}
                                    style={{ display: 'block', marginTop: '0.25rem', padding: '0.4rem', width: '100%' }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label htmlFor="venue">Venue (optional)</label>
                                <input
                                    id="venue"
                                    type="text"
                                    value={createScheduleForm.venue}
                                    onChange={e => setCreateScheduleForm(prev => ({ ...prev, venue: e.target.value }))}
                                    disabled={createScheduleLoading}
                                    placeholder="Bowyer Park"
                                    style={{ display: 'block', marginTop: '0.25rem', padding: '0.4rem', width: '100%' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setShowCreateScheduleModal(false)} disabled={createScheduleLoading}>Cancel</button>
                                <button type="submit" disabled={createScheduleLoading}>{createScheduleLoading ? 'Creating...' : 'Create schedule'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Filter and Add Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                 <div>
                     <label htmlFor="season-filter">Filter by Season:</label>
                     <select
                         id="season-filter"
                         value={selectedSeasonFilter}
                         onChange={(e) => { setSelectedSeasonFilter(e.target.value); setEditingMatch(null); setShowAddForm(false); setShowCreateScheduleModal(false); }}
                         disabled={loading}
                     >
                         <option value="">-- Select a Season --</option>
                         {seasons.map(s => <option key={s.season_id} value={s.season_id}>{s.name} ({s.year})</option>)}
                     </select>
                 </div>
                 <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => setShowCreateScheduleModal(true)}
                        disabled={loading || !selectedSeasonFilter || (seasons.find(s => s.season_id == selectedSeasonFilter)?.status === 'Completed') || matches.length > 0}
                        style={{ backgroundColor: 'var(--mpl-turquoise)', color: '#fff' }}
                        title={matches.length > 0 ? 'Schedule already created for this season' : undefined}
                    >
                        Create schedule
                    </button>
                    <button onClick={() => { setShowAddForm(true); setEditingMatch(null); }} disabled={loading || formLoading}>
                        + Add New Match
                    </button>
                 </div>
            </div>
            {selectedSeasonFilter && seasons.find(s => s.season_id == selectedSeasonFilter)?.status === 'Completed' && (
                <p style={{ marginBottom: '1rem', color: 'var(--mpl-grey-600, #666)', fontSize: '0.9rem' }}>Schedule cannot be created for a completed season.</p>
            )}

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

            {!loading && matches.length > 0 && (() => {
                const sortKeys = {
                    match_id: (m) => m.match_id,
                    match_datetime: (m) => new Date(m.match_datetime).getTime(),
                    team1_name: (m) => (m.team1_name || '').toLowerCase(),
                    team2_name: (m) => (m.team2_name || '').toLowerCase(),
                    venue: (m) => (m.venue || '').toLowerCase(),
                    status: (m) => (m.status || '').toLowerCase(),
                    super_over_number: (m) => (m.super_over_number != null ? m.super_over_number : -1)
                };
                const getter = sortKeys[sortBy];
                const sorted = [...matches].sort((a, b) => {
                    const va = getter ? getter(a) : a[sortBy];
                    const vb = getter ? getter(b) : b[sortBy];
                    const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
                    return sortOrder === 'asc' ? cmp : -cmp;
                });
                const handleSort = (key) => {
                    if (sortBy === key) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                    else { setSortBy(key); setSortOrder('asc'); }
                };
                const SortableTh = ({ colKey, label }) => (
                    <th onClick={() => handleSort(colKey)} style={{ cursor: 'pointer', userSelect: 'none' }} title={`Sort by ${label} (${sortBy === colKey ? (sortOrder === 'asc' ? 'descending' : 'ascending') : 'ascending'})`}>
                        {label} {sortBy === colKey ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ''}
                    </th>
                );
                return (
                <table>
                    <thead>
                        <tr>
                            <SortableTh colKey="match_id" label="ID" />
                            <SortableTh colKey="match_datetime" label="Date & Time" />
                            <SortableTh colKey="team1_name" label="Team 1" />
                            <SortableTh colKey="team2_name" label="Team 2" />
                            <SortableTh colKey="venue" label="Venue" />
                            <SortableTh colKey="status" label="Status" />
                            <SortableTh colKey="super_over_number" label="Super Over" />
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(match => (
                            <tr key={match.match_id}>
                                <td>{match.match_id}</td>
                                <td>{new Date(match.match_datetime).toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'short', timeStyle: 'short' })}</td>
                                <td>{match.team1_name}</td>
                                <td>{match.team2_name}</td>
                                <td>{match.venue}</td>
                                <td>{match.status}</td>
                                <td>{match.super_over_number != null ? match.super_over_number : '–'}</td>
                                <td>
                                    {match.status !== 'Completed' && (
                                        <button
                                            onClick={() => handleEditClick(match)}
                                            disabled={formLoading || !!editingMatch}
                                            style={{ padding: '0.3em 0.6em', fontSize: '0.9rem', marginRight: '0.5rem' }}
                                        >
                                            Edit
                                        </button>
                                    )}
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
                );
            })()}
        </div>
    );
}

export default AdminSchedulePage;