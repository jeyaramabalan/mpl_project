// src/pages/admin/AdminPlayersPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import LoadingFallback from '../../components/LoadingFallback';

// Reusable Form Component for Add/Edit
const PlayerForm = ({ onSubmit, initialData = {}, loading, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        base_price: '',
        role: '',
    });

    useEffect(() => {
        setFormData({
            name: initialData.name || '',
            base_price: initialData.base_price || '100.00', // Default or existing
            role: initialData.role || '', // Default to empty or existing
        });
    }, [initialData]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            base_price: formData.base_price ? parseFloat(formData.base_price) : null,
            role: formData.role || null, // Send null if empty
        };
        onSubmit(payload);
    };

    const isEditing = !!initialData.player_id;
    const roles = ['Batsman', 'Bowler', 'AllRounder', 'WicketKeeper'];

    return (
        <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>{isEditing ? `Edit Player: ${initialData.name}` : 'Add New Player'}</h3>
            <div>
                <label htmlFor="name">Name:*</label>
                <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required disabled={loading} />
            </div>
            <div>
                <label htmlFor="base_price">Base Price:</label>
                <input type="number" id="base_price" name="base_price" value={formData.base_price} onChange={handleChange} step="0.01" placeholder="e.g., 100.00" disabled={loading} />
            </div>
            <div>
                <label htmlFor="role">Role:</label>
                <select id="role" name="role" value={formData.role} onChange={handleChange} disabled={loading}>
                    <option value="">-- Select Role (Optional) --</option>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
                <button type="submit" disabled={loading}>{loading ? 'Saving...' : (isEditing ? 'Update Player' : 'Add Player')}</button>
                {isEditing && <button type="button" onClick={onCancel} style={{ marginLeft: '1rem', backgroundColor: '#6c757d' }} disabled={loading}>Cancel Edit</button>}
            </div>
        </form>
    );
};


// Main Page Component
function AdminPlayersPage() {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState('');
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);

    const fetchPlayers = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const { data } = await api.get('/players'); // Use public route to get list
            setPlayers(data);
        } catch (err) { setError(typeof err === 'string' ? err : 'Failed to load players.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchPlayers();
    }, [fetchPlayers]);

    const handleFormSubmit = async (payload) => {
        setFormLoading(true); setError('');
        try {
            if (editingPlayer) {
                await api.put(`/players/${editingPlayer.player_id}`, payload); // Use protected PUT
            } else {
                await api.post('/players', payload); // Use protected POST
            }
            setEditingPlayer(null); setShowAddForm(false); fetchPlayers(); // Refresh list
        } catch (err) { setError(typeof err === 'string' ? err : `Failed to ${editingPlayer ? 'update' : 'add'} player.`); }
        finally { setFormLoading(false); }
    };

    const handleEditClick = (player) => {
        setShowAddForm(false); // Close add form if open
        setEditingPlayer(player);
    };

    const handleCancelEdit = () => {
        setEditingPlayer(null);
    };

    const handleDeleteClick = async (playerId) => {
        if (!window.confirm(`Are you sure you want to delete player ID ${playerId}? This may affect related records.`)) return;
        setLoading(true); setError(''); // Use main loading indicator
        try {
            await api.delete(`/players/${playerId}`); // Use protected DELETE
            fetchPlayers(); // Refresh
        } catch (err) { setError(typeof err === 'string' ? err : 'Failed to delete player.'); setLoading(false); }
    };

    return (
        <div>
            <h2>Manage Players</h2>
            {error && <p className="error-message">{error}</p>}

            <div style={{ marginBottom: '1rem', textAlign: 'right' }}>
                <button onClick={() => { setShowAddForm(true); setEditingPlayer(null); }} disabled={loading || formLoading}>+ Add New Player</button>
            </div>

            {(showAddForm || editingPlayer) && (
                <PlayerForm
                    onSubmit={handleFormSubmit}
                    initialData={editingPlayer || {}}
                    loading={formLoading}
                    onCancel={handleCancelEdit}
                />
            )}

            <h3>Player List</h3>
            {loading && <LoadingFallback message="Loading players..." />}
            {!loading && players.length === 0 && <p>No players registered yet.</p>}
            {!loading && players.length > 0 && (
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Current Team</th> {/* Added */}
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {players.map(player => (
                            <tr key={player.player_id}>
                                <td>{player.player_id}</td>
                                <td>{player.name}</td>
                                <td>{player.role || 'N/A'}</td>
                                <td>{player.current_team_name || 'N/A'}</td> {/* Display team name */}
                                <td>
                                    <button onClick={() => handleEditClick(player)} disabled={loading || formLoading || !!editingPlayer} style={{ padding: '0.3em 0.6em', fontSize: '0.9rem', marginRight: '0.5rem' }}>Edit</button>
                                    <button onClick={() => handleDeleteClick(player.player_id)} disabled={loading || formLoading} style={{ padding: '0.3em 0.6em', fontSize: '0.9rem', backgroundColor: '#dc3545' }}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default AdminPlayersPage;

