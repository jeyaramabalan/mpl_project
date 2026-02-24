// mpl-project/mpl-frontend/src/pages/admin/AdminTeamsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import LoadingFallback from '../../components/LoadingFallback';
import SearchablePlayerSelect from '../../components/SearchablePlayerSelect';
import ConfirmDialog from '../../components/ConfirmDialog';

// --- Reusable Components (Consider moving to components folder) ---
const TeamForm = ({ onSubmit, initialData = {}, seasons = [], players = [], loading }) => {
    const [formData, setFormData] = useState({
        name: initialData.name || '',
        season_id: initialData.season_id || (seasons.length > 0 ? seasons[0].season_id : ''), // Default to first season?
        budget: initialData.budget || '300.00', // Default budget?
        captain_player_id: initialData.captain_player_id || '', // Keep as string, handle null on submit
    });

     // Update form if initialData changes (when editing)
     useEffect(() => {
        setFormData({
            name: initialData.name || '',
            season_id: initialData.season_id || (seasons.length > 0 ? seasons[0].season_id : ''),
            budget: initialData.budget || '300.00',
            captain_player_id: initialData.captain_player_id || '',
        });
    }, [initialData, seasons]);


    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            captain_player_id: formData.captain_player_id ? parseInt(formData.captain_player_id) : null, // Ensure number or null
            season_id: parseInt(formData.season_id),
            budget: parseFloat(formData.budget)
        };
        onSubmit(payload);
    };

    return (
        <form onSubmit={handleSubmit}>
            {!initialData.team_id && ( // Only show Season select when adding
                <div>
                    <label htmlFor="season_id">Season:</label>
                    <select id="season_id" name="season_id" value={formData.season_id} onChange={handleChange} required disabled={loading || !!initialData.team_id}>
                        <option value="" disabled>Select Season</option>
                        {seasons.map(s => <option key={s.season_id} value={s.season_id}>{s.name} ({s.year})</option>)}
                    </select>
                </div>
            )}
            <div>
                <label htmlFor="name">Team Name:</label>
                <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required disabled={loading} />
            </div>
            <div>
                <label htmlFor="budget">Budget:</label>
                <input type="number" id="budget" name="budget" value={formData.budget} onChange={handleChange} step="0.01" disabled={loading} />
            </div>
            <div>
                <SearchablePlayerSelect
                    id="captain_player_id"
                    label="Captain (Optional)"
                    players={players}
                    value={formData.captain_player_id}
                    onChange={(v) => setFormData({ ...formData, captain_player_id: v })}
                    placeholder="Select captain..."
                    disabled={loading}
                />
            </div>
            <button type="submit" disabled={loading}>{loading ? 'Saving...' : (initialData.team_id ? 'Update Team' : 'Add Team')}</button>
        </form>
    );
};

const PlayerAssignment = ({ teamId, seasonId, teamPlayers = [], availablePlayers = [], onAssign, onBulkAssign, onRemove, loading, lockAssignments = false }) => {
     const [selectedPlayerId, setSelectedPlayerId] = useState('');
     const [purchasePrice, setPurchasePrice] = useState('');
     const [removeTarget, setRemoveTarget] = useState(null);
     const [bulkSelectedIds, setBulkSelectedIds] = useState(new Set());
     const [bulkPurchasePrice, setBulkPurchasePrice] = useState('');

     const handleAssign = (e) => {
         e.preventDefault();
         if (!selectedPlayerId) return;
         onAssign({
             team_id: teamId,
             player_id: parseInt(selectedPlayerId),
             season_id: seasonId,
             purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
         });
         setSelectedPlayerId('');
         setPurchasePrice('');
     };

     const toggleBulkSelect = (playerId) => {
         setBulkSelectedIds(prev => {
             const next = new Set(prev);
             if (next.has(playerId)) next.delete(playerId);
             else next.add(playerId);
             return next;
         });
     };

     const handleBulkAssign = (e) => {
         e.preventDefault();
         if (bulkSelectedIds.size === 0 || !onBulkAssign) return;
         onBulkAssign(teamId, seasonId, Array.from(bulkSelectedIds), bulkPurchasePrice ? parseFloat(bulkPurchasePrice) : null);
         setBulkSelectedIds(new Set());
         setBulkPurchasePrice('');
     };

    return (
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
             <h4>Manage Players for this Team ({teamPlayers.length} assigned)</h4>
             {teamPlayers.length > 0 ? (
                 <ul>
                    {teamPlayers.map(p => (
                        <li key={p.team_player_id} style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>
                                <Link to={`/players/${p.player_id}`}>{p.name}</Link>
                                {p.is_captain ? ' (C)' : null}
                                {p.purchase_price && ` - $${p.purchase_price}`}
                            </span>
                             <button type="button" onClick={() => setRemoveTarget({ team_player_id: p.team_player_id, name: p.name })} disabled={loading || lockAssignments} title={lockAssignments ? 'Squad locked for completed season' : ''} style={{ backgroundColor: '#dc3545', padding: '0.2em 0.5em', fontSize: '0.8rem' }}>Remove</button>
                        </li>
                    ))}
                 </ul>
            ) : <p>No players assigned to this team for this season yet.</p>}

            <ConfirmDialog open={!!removeTarget} title="Remove player" message={removeTarget ? `Remove ${removeTarget.name} from this team?` : ''} confirmLabel="Remove" cancelLabel="Cancel" onConfirm={() => { if (removeTarget) { onRemove(removeTarget.team_player_id); setRemoveTarget(null); } }} onCancel={() => setRemoveTarget(null)} />

             {!lockAssignments && (
             <form onSubmit={handleAssign} style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '0.5rem' }}>
                <SearchablePlayerSelect players={availablePlayers} value={selectedPlayerId} onChange={setSelectedPlayerId} placeholder="Select player to add..." disabled={loading || availablePlayers.length === 0} />
                 <input type="number" placeholder="Purchase Price (Optional)" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} step="0.01" style={{ width: '140px', padding: '0.5rem' }} disabled={loading} />
                 <button type="submit" disabled={loading || !selectedPlayerId}>Assign Player</button>
            </form>
             )}

            {!lockAssignments && availablePlayers.length > 0 && (
                <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '6px' }}>
                    <h5 style={{ marginTop: 0 }}>Bulk assign players</h5>
                    <p style={{ fontSize: '0.9rem', color: '#555' }}>Select players below and assign them all to this team.</p>
                    <div style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: '0.5rem' }}>
                        {availablePlayers.map(p => (
                            <label key={p.player_id} style={{ display: 'block', marginBottom: '0.25rem' }}>
                                <input type="checkbox" checked={bulkSelectedIds.has(p.player_id)} onChange={() => toggleBulkSelect(p.player_id)} disabled={loading} /> {p.name}
                            </label>
                        ))}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="number" placeholder="Purchase price (optional, for all)" value={bulkPurchasePrice} onChange={(e) => setBulkPurchasePrice(e.target.value)} step="0.01" style={{ width: '160px', padding: '0.4rem' }} disabled={loading} />
                        <button type="button" onClick={handleBulkAssign} disabled={loading || bulkSelectedIds.size === 0}>{bulkSelectedIds.size === 0 ? 'Assign selected' : `Assign ${bulkSelectedIds.size} player(s)`}</button>
                    </div>
                </div>
            )}

        </div>
    );
};


// --- Main Page Component ---
function AdminTeamsPage() {
    const [seasons, setSeasons] = useState([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState('');
    const [teams, setTeams] = useState([]);
    const [allPlayers, setAllPlayers] = useState([]); // All registered players
    const [assignedPlayerIds, setAssignedPlayerIds] = useState(new Set()); // Set of player IDs already in a team for the selected season
    const [loadingSeasons, setLoadingSeasons] = useState(true);
    const [loadingTeams, setLoadingTeams] = useState(false);
    const [loadingPlayers, setLoadingPlayers] = useState(false);
    const [error, setError] = useState('');

    const [editingTeam, setEditingTeam] = useState(null);
    const [deleteTeamTarget, setDeleteTeamTarget] = useState(null);

    // Fetch seasons on mount (all seasons; completed ones are read-only)
    useEffect(() => {
        const fetchSeasons = async () => {
            setLoadingSeasons(true);
            try {
                const { data } = await api.get('/admin/seasons');
                // Optional: sort descending by start_date or season_id (depending on your schema)
                const sortedSeasons = [...data].sort((a, b) => b.season_id - a.season_id);
                setSeasons(sortedSeasons);
                if (sortedSeasons.length > 0) {
                    setSelectedSeasonId(sortedSeasons[0].season_id);
                }
            } catch (err) {
                setError(typeof err === 'string' ? err : 'Failed to load seasons.');
            } finally {
                setLoadingSeasons(false);
            }
        };
        fetchSeasons();
    }, []);

    // Fetch all players (needed for assignment dropdown)
     useEffect(() => {
        const fetchAllPlayers = async () => {
            setLoadingPlayers(true);
            try {
                const { data } = await api.get('/players'); // Fetch all players
                setAllPlayers(data);
            } catch (err) {
                setError(typeof err === 'string' ? err : 'Failed to load player list.');
            } finally {
                setLoadingPlayers(false);
            }
        };
        fetchAllPlayers();
    }, []);


    // Fetch teams and player assignments when selectedSeasonId changes
    const fetchTeamsAndAssignments = useCallback(async () => {
        if (!selectedSeasonId) {
            setTeams([]);
            setAssignedPlayerIds(new Set());
            return;
        }
        setLoadingTeams(true);
        setError('');
        setEditingTeam(null); // Clear editing state when season changes
        try {
            // Fetch teams for the selected season
            const { data: teamsData } = await api.get(`/admin/teams?season_id=${selectedSeasonId}`);
            setTeams(teamsData);

            // Fetch ALL player assignments for this season to know who is available
            let allAssignmentsForSeason = [];
            // Need an endpoint for this, or iterate through teamsData if it includes players?
            // Assuming an endpoint /api/admin/seasons/:seasonId/assignments exists (adjust as needed)
            // const { data: assignmentData } = await api.get(`/admin/seasons/${selectedSeasonId}/assignments`);
            // For now, let's derive from the teamsData if possible, or make multiple calls (less efficient)
            const playerIdsInTeams = new Set();
            for (const team of teamsData) {
                try {
                     // Use the existing getTeamDetails endpoint (or modify getTeamsForSeason to include players)
                     const { data: teamDetails } = await api.get(`/admin/teams/${team.team_id}?season_id=${selectedSeasonId}`);
                     teamDetails.players.forEach(p => playerIdsInTeams.add(p.player_id));
                     // Find the team in state and update its players list (important for PlayerAssignment component)
                     setTeams(currentTeams => currentTeams.map(t => t.team_id === team.team_id ? { ...t, players: teamDetails.players } : t));

                } catch (detailErr) {
                    console.error(`Failed to get player details for team ${team.team_id}`, detailErr);
                    // Continue fetching other teams
                }
            }
            setAssignedPlayerIds(playerIdsInTeams);


        } catch (err) {
            console.error("Failed to fetch teams or assignments:", err);
            setError(typeof err === 'string' ? err : 'Failed to load teams for the selected season.');
            setTeams([]);
             setAssignedPlayerIds(new Set());
        } finally {
            setLoadingTeams(false);
        }
    }, [selectedSeasonId]);

    useEffect(() => {
        fetchTeamsAndAssignments();
    }, [fetchTeamsAndAssignments]);


    // --- Handler Functions ---
    const handleTeamSubmit = async (payload) => {
        setLoadingTeams(true); // Use main loading flag?
        setError('');
        try {
            if (editingTeam) {
                // Update existing team
                await api.put(`/admin/teams/${editingTeam.team_id}`, payload);
            } else {
                // Create new team
                await api.post(`/admin/teams`, payload);
            }
            setEditingTeam(null); // Reset editing state
            fetchTeamsAndAssignments(); // Refresh list
        } catch (err) {
             setError(typeof err === 'string' ? err : `Failed to ${editingTeam ? 'update' : 'add'} team.`);
        } finally {
            setLoadingTeams(false);
        }
    };

    const handleAssignPlayer = async (assignmentData) => {
         setLoadingTeams(true); // Indicate loading
         setError('');
        try {
            await api.post('/admin/teams/players', assignmentData);
            fetchTeamsAndAssignments(); // Refresh assignments and team player lists
        } catch (err) {
             setError(typeof err === 'string' ? err : 'Failed to assign player.');
        } finally {
             setLoadingTeams(false);
        }
    };

    const handleRemovePlayer = async (teamPlayerId) => {
        setLoadingTeams(true);
        setError('');
        try {
            await api.delete(`/admin/teams/players/${teamPlayerId}`);
            fetchTeamsAndAssignments();
        } catch (err) {
            setError(typeof err === 'string' ? err : 'Failed to remove player.');
        } finally {
            setLoadingTeams(false);
        }
    };

    const handleBulkAssign = async (teamId, seasonId, playerIds, purchasePrice) => {
        setLoadingTeams(true);
        setError('');
        try {
            for (const playerId of playerIds) {
                await api.post('/admin/teams/players', { team_id: teamId, player_id: playerId, season_id: seasonId, purchase_price: purchasePrice ?? null });
            }
            fetchTeamsAndAssignments();
        } catch (err) {
            setError(typeof err === 'string' ? err : (err.response?.data?.message || 'Failed to assign one or more players.'));
        } finally {
            setLoadingTeams(false);
        }
    };

    const handleDeleteTeam = async () => {
        if (!deleteTeamTarget) return;
        setLoadingTeams(true);
        setError('');
        try {
            await api.delete(`/admin/teams/${deleteTeamTarget.team_id}`);
            setDeleteTeamTarget(null);
            setEditingTeam(null);
            fetchTeamsAndAssignments();
        } catch (err) {
            setError(typeof err === 'string' ? err : (err?.response?.data?.message || err?.message || 'Failed to delete team.'));
        } finally {
            setLoadingTeams(false);
        }
    };


    // --- Calculate Available Players ---
    const availablePlayersForAssignment = allPlayers.filter(
        p => !assignedPlayerIds.has(p.player_id)
    );

    const selectedSeason = seasons.find(s => s.season_id === parseInt(selectedSeasonId));
    const isSeasonCompleted = selectedSeason?.status === 'Completed';

    // --- Render ---
    if (loadingSeasons) return <LoadingFallback message="Loading seasons..." />;

    return (
        <div>
            <h2>Manage Teams & Player Assignments</h2>

            {/* Season Selector */}
            <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="season-select-teams">Select Season:</label>
                <select
                    id="season-select-teams"
                    value={selectedSeasonId}
                    onChange={(e) => setSelectedSeasonId(e.target.value)}
                    disabled={loadingTeams}
                >
                    <option value="">-- Select a Season --</option>
                    {seasons.map(s => <option key={s.season_id} value={s.season_id}>{s.name} ({s.year})</option>)}
                </select>
            </div>

             {error && <p className="error-message">{error}</p>}

             {selectedSeasonId && isSeasonCompleted && (
                 <p style={{ padding: '0.75rem', background: 'var(--mpl-grey-200)', borderRadius: '6px', marginBottom: '1rem' }}>
                     This season is completed. Teams and squad assignments cannot be changed.
                 </p>
             )}

             {/* Add/Edit Team Form */}
             {selectedSeasonId && !isSeasonCompleted && (
                 <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #eee', borderRadius: '5px' }}>
                     <h3>{editingTeam ? `Editing Team: ${editingTeam.name}` : 'Add New Team'}</h3>
                     <TeamForm
                         onSubmit={handleTeamSubmit}
                         initialData={editingTeam ? { ...editingTeam, season_id: selectedSeasonId } : { season_id: selectedSeasonId } }
                         seasons={seasons}
                         players={allPlayers}
                         loading={loadingTeams}
                     />
                     {editingTeam && <button onClick={() => setEditingTeam(null)} style={{marginTop: '0.5rem', backgroundColor: '#6c757d'}}>Cancel Edit</button>}
                 </div>
             )}


            {/* Teams List for Selected Season */}
            {selectedSeasonId && loadingTeams && <LoadingFallback message="Loading teams..." />}
            {selectedSeasonId && !loadingTeams && teams.length === 0 && <p>No teams found for this season. Add one above.</p>}

            <ConfirmDialog open={!!deleteTeamTarget} title="Delete team" message={deleteTeamTarget ? `Delete team "${deleteTeamTarget.name}"? This cannot be undone.` : ''} confirmLabel="Delete" cancelLabel="Cancel" variant="danger" onConfirm={handleDeleteTeam} onCancel={() => setDeleteTeamTarget(null)} />

            {selectedSeasonId && !loadingTeams && teams.length > 0 && (
                <div>
                    <h3>Teams in Selected Season</h3>
                    {teams.map(team => (
                        <div key={team.team_id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem', borderRadius: '5px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h4>{team.name}</h4>
                                    <p>Captain: {team.captain_name || 'None'} (ID: {team.captain_player_id || 'N/A'})</p>
                                    <p>Budget: ${team.budget ? parseFloat(team.budget).toFixed(2) : 'N/A'}</p>
                                </div>
                                <div>
                                     <button onClick={() => setEditingTeam(team)} disabled={loadingTeams || !!editingTeam || isSeasonCompleted} title={isSeasonCompleted ? 'Completed season: editing locked' : ''}>Edit Team</button>
                                     <button type="button" onClick={() => setDeleteTeamTarget(team)} disabled={loadingTeams || !!editingTeam || isSeasonCompleted} title={isSeasonCompleted ? 'Completed season: deletion locked' : ''} style={{ marginLeft: '0.5rem', backgroundColor: '#dc3545' }}>Delete Team</button>
                                </div>
                            </div>

                            {/* Player Assignment Section */}
                             <PlayerAssignment
                                teamId={team.team_id}
                                seasonId={parseInt(selectedSeasonId)}
                                teamPlayers={team.players || []}
                                availablePlayers={availablePlayersForAssignment}
                                onAssign={handleAssignPlayer}
                                onBulkAssign={handleBulkAssign}
                                onRemove={handleRemovePlayer}
                                loading={loadingTeams || loadingPlayers}
                                lockAssignments={isSeasonCompleted}
                             />
                         </div>
                    ))}
                </div>
            )}

        </div>
    );
}

export default AdminTeamsPage;