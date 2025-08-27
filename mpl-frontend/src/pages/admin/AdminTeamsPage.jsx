// mpl-project/mpl-frontend/src/pages/admin/AdminTeamsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // If linking to team details page
import api from '../../services/api';
import LoadingFallback from '../../components/LoadingFallback';

// --- Reusable Components (Consider moving to components folder) ---
const TeamForm = ({ onSubmit, initialData = {}, seasons = [], loading }) => {
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
                <label htmlFor="captain_player_id">Captain Player ID (Optional):</label>
                <input type="number" id="captain_player_id" name="captain_player_id" value={formData.captain_player_id} onChange={handleChange} disabled={loading} />
                {/* TODO: Replace with Player Search/Select dropdown for better UX */}
            </div>
            <button type="submit" disabled={loading}>{loading ? 'Saving...' : (initialData.team_id ? 'Update Team' : 'Add Team')}</button>
        </form>
    );
};

const PlayerAssignment = ({ teamId, seasonId, teamPlayers = [], availablePlayers = [], onAssign, onRemove, loading }) => {
     const [selectedPlayerId, setSelectedPlayerId] = useState('');
     const [purchasePrice, setPurchasePrice] = useState('');

     const handleAssign = (e) => {
         e.preventDefault();
         if (!selectedPlayerId) return;
         onAssign({
             team_id: teamId,
             player_id: parseInt(selectedPlayerId),
             season_id: seasonId,
             purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
             // is_captain: false // Captain is set via Team edit
         });
         setSelectedPlayerId(''); // Reset form
         setPurchasePrice('');
     };

    return (
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
             <h4>Manage Players for this Team ({teamPlayers.length} assigned)</h4>
             {/* List Assigned Players */}
            {teamPlayers.length > 0 ? (
                 <ul>
                    {teamPlayers.map(p => (
                        <li key={p.team_player_id} style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>
                                <Link to={`/players/${p.player_id}`}>{p.name}</Link>
                                {p.is_captain && ' (C)'}
                                {p.purchase_price && ` - $${p.purchase_price}`}
                            </span>
                             <button
                                onClick={() => onRemove(p.team_player_id)}
                                disabled={loading}
                                style={{ backgroundColor: '#dc3545', padding: '0.2em 0.5em', fontSize: '0.8rem' }}
                            >
                                Remove
                            </button>
                        </li>
                    ))}
                 </ul>
            ) : <p>No players assigned to this team for this season yet.</p>}

            {/* Assign Player Form */}
             <form onSubmit={handleAssign} style={{ marginTop: '1rem' }}>
                <select value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)} required disabled={loading || availablePlayers.length === 0}>
                    <option value="">Select Player to Add</option>
                     {/* Only show players NOT already in ANY team for this season */}
                     {availablePlayers.map(p => <option key={p.player_id} value={p.player_id}>{p.name} ({p.player_id})</option>)}
                 </select>
                 <input
                     type="number"
                     placeholder="Purchase Price (Optional)"
                     value={purchasePrice}
                     onChange={(e) => setPurchasePrice(e.target.value)}
                     step="0.01"
                     style={{marginLeft: '0.5rem', width: '150px'}}
                     disabled={loading}
                 />
                 <button type="submit" disabled={loading || !selectedPlayerId} style={{marginLeft: '0.5rem'}}>Assign Player</button>
            </form>

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

    const [editingTeam, setEditingTeam] = useState(null); // Holds team object if editing

    // Fetch seasons on mount
    useEffect(() => {
        const fetchSeasons = async () => {
            setLoadingSeasons(true);
            try {
                const { data } = await api.get('/admin/seasons?status=Ongoing');
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
         if (!window.confirm("Are you sure you want to remove this player from the team?")) return;
         setLoadingTeams(true);
         setError('');
        try {
            await api.delete(`/admin/teams/players/${teamPlayerId}`);
            fetchTeamsAndAssignments(); // Refresh assignments and team player lists
        } catch (err) {
            setError(typeof err === 'string' ? err : 'Failed to remove player.');
        } finally {
             setLoadingTeams(false);
        }
    };


    // --- Calculate Available Players ---
    const availablePlayersForAssignment = allPlayers.filter(
        p => !assignedPlayerIds.has(p.player_id)
    );


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

             {/* Add/Edit Team Form */}
             {selectedSeasonId && (
                 <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #eee', borderRadius: '5px' }}>
                     <h3>{editingTeam ? `Editing Team: ${editingTeam.name}` : 'Add New Team'}</h3>
                     <TeamForm
                         onSubmit={handleTeamSubmit}
                         initialData={editingTeam ? { ...editingTeam, season_id: selectedSeasonId } : { season_id: selectedSeasonId } } // Pass season_id
                         seasons={seasons} // Pass seasons for the dropdown (only used if adding)
                         loading={loadingTeams}
                     />
                     {editingTeam && <button onClick={() => setEditingTeam(null)} style={{marginTop: '0.5rem', backgroundColor: '#6c757d'}}>Cancel Edit</button>}
                 </div>
             )}


            {/* Teams List for Selected Season */}
            {selectedSeasonId && loadingTeams && <LoadingFallback message="Loading teams..." />}
            {selectedSeasonId && !loadingTeams && teams.length === 0 && <p>No teams found for this season. Add one above.</p>}

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
                                     <button onClick={() => setEditingTeam(team)} disabled={loadingTeams || !!editingTeam}>Edit Team</button>
                                     {/* TODO: Add delete team button */}
                                </div>
                            </div>

                            {/* Player Assignment Section */}
                             <PlayerAssignment
                                teamId={team.team_id}
                                seasonId={parseInt(selectedSeasonId)}
                                teamPlayers={team.players || []} // Ensure players array exists
                                availablePlayers={availablePlayersForAssignment}
                                onAssign={handleAssignPlayer}
                                onRemove={handleRemovePlayer}
                                loading={loadingTeams || loadingPlayers}
                             />
                         </div>
                    ))}
                </div>
            )}

        </div>
    );
}

export default AdminTeamsPage;