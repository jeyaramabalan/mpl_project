// mpl-project/mpl-frontend/src/pages/admin/AdminSeasonsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { toList } from '../../utils/apiResponse';
import LoadingFallback from '../../components/LoadingFallback';

function AdminSeasonsPage() {
    const [seasons, setSeasons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(null);
    const [formData, setFormData] = useState({ year: '', name: '', start_date: '', end_date: '', status: 'Planned' });
    const [deleteSeasonTarget, setDeleteSeasonTarget] = useState(null);
    const [destructivePassword, setDestructivePassword] = useState('');
    const [deleteWithDataLoading, setDeleteWithDataLoading] = useState(false);

    const fetchSeasons = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/admin/seasons');
            setSeasons(toList(data));
        } catch (err) {
            console.error("Failed to fetch seasons:", err);
            setError(typeof err === 'string' ? err : 'Failed to load seasons.');
        } finally {
            setLoading(false);
        }
    }, []);



    useEffect(() => {
        fetchSeasons();
    }, [fetchSeasons]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setIsEditing(null);
        setFormData({ year: '', name: '', start_date: '', end_date: '', status: 'Planned' });
    };

    const handleEditClick = (season) => {
        setIsEditing(season.season_id);
        setFormData({
            year: season.year, // Year usually not editable once set
            name: season.name,
            start_date: season.start_date ? season.start_date.split('T')[0] : '', // Format for date input
            end_date: season.end_date ? season.end_date.split('T')[0] : '',     // Format for date input
            status: season.status,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true); // Indicate activity

        const payload = { ...formData };
        // Ensure dates are null if empty, backend handles this but good practice
        if (!payload.start_date) delete payload.start_date;
        if (!payload.end_date) delete payload.end_date;
        if (!isEditing) { // Don't send year if editing
             if (!payload.year || isNaN(parseInt(payload.year))) {
                 setError('Valid Year is required for new season.');
                 setLoading(false);
                 return;
             }
        } else {
            delete payload.year; // Don't allow changing year
        }


        try {
            if (isEditing) {
                // Update existing season
                await api.put(`/admin/seasons/${isEditing}`, payload);
                console.log("Season updated successfully");
            } else {
                // Create new season
                await api.post('/admin/seasons', payload);
                console.log("Season created successfully");
            }
            resetForm();
            fetchSeasons(); // Refresh the list
        } catch (err) {
             console.error(`Failed to ${isEditing ? 'update' : 'create'} season:`, err);
             setError(typeof err === 'string' ? err : `Failed to ${isEditing ? 'update' : 'create'} season.`);
        } finally {
             setLoading(false); // Ensure loading is turned off even on error
        }
    };

    const handleDeleteSeason = async () => {
        if (!deleteSeasonTarget) return;
        const seasonId = deleteSeasonTarget.season_id;
        setError('');
        setDeleteWithDataLoading(true);
        try {
            await api.post(`/admin/seasons/${seasonId}/delete-with-data`, {
                destructive_password: destructivePassword,
            });
            setDeleteSeasonTarget(null);
            setDestructivePassword('');
            if (isEditing === seasonId) resetForm();
            fetchSeasons();
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to delete season.';
            setError(msg);
            if (err?.response?.status !== 403) setDeleteWithDataLoading(false);
        } finally {
            setDeleteWithDataLoading(false);
        }
    };

    const closeDeleteModal = () => {
        setDeleteSeasonTarget(null);
        setDestructivePassword('');
        setError('');
    };

    return (
        <div>
            <h2>Manage Seasons</h2>

            {/* Delete season and all data — requires destructive action password */}
            {deleteSeasonTarget && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => !deleteWithDataLoading && closeDeleteModal()}>
                    <div className="mpl-card" style={{ padding: '1.5rem', minWidth: 320, maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>Delete season and all data</h3>
                        <p style={{ marginBottom: '1rem' }}>This will <strong>permanently delete</strong> season &quot;{deleteSeasonTarget.name}&quot; ({deleteSeasonTarget.year}) and <strong>all related data</strong>: matches, ball-by-ball, schedules, teams, squads, registrations, auction. This cannot be undone.</p>
                        <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Enter the destructive action password to confirm:</p>
                        <input
                            type="password"
                            value={destructivePassword}
                            onChange={(e) => setDestructivePassword(e.target.value)}
                            placeholder="Password"
                            disabled={deleteWithDataLoading}
                            style={{ display: 'block', width: '100%', marginBottom: '1rem', padding: '0.5rem' }}
                            autoComplete="off"
                        />
                        {error && <p className="error-message" style={{ marginBottom: '0.5rem' }}>{error}</p>}
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={closeDeleteModal} disabled={deleteWithDataLoading}>Cancel</button>
                            <button type="button" onClick={handleDeleteSeason} disabled={deleteWithDataLoading || !destructivePassword.trim()} style={{ backgroundColor: '#dc3545', color: '#fff' }}>
                                {deleteWithDataLoading ? 'Deleting...' : 'Delete everything'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Form */}
            <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '5px' }}>
                <h3>{isEditing ? 'Edit Season' : 'Add New Season'}</h3>
                 {error && <p className="error-message">{error}</p>}
                <div>
                    <label htmlFor="year">Year:</label>
                    <input
                        type="number"
                        id="year"
                        name="year"
                        value={formData.year}
                        onChange={handleInputChange}
                        required={!isEditing} // Required only when adding
                        disabled={!!isEditing} // Disable editing year
                        placeholder="e.g., 2024"
                    />
                </div>
                 <div>
                    <label htmlFor="name">Season Name:</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., MPL Summer 2024"
                    />
                </div>
                 <div>
                    <label htmlFor="start_date">Start Date:</label>
                    <input
                        type="date"
                        id="start_date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleInputChange}
                    />
                </div>
                 <div>
                    <label htmlFor="end_date">End Date:</label>
                    <input
                        type="date"
                        id="end_date"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleInputChange}
                    />
                </div>
                 <div>
                    <label htmlFor="status">Status:</label>
                    <select id="status" name="status" value={formData.status} onChange={handleInputChange}>
                        <option value="Planned">Planned</option>
                        <option value="RegistrationOpen">Registration Open</option>
                        <option value="Auction">Auction</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Completed">Completed</option>
                    </select>
                </div>
                 <button type="submit" disabled={loading}>{loading ? 'Saving...' : (isEditing ? 'Update Season' : 'Add Season')}</button>
                 {isEditing && formData.status === 'Completed' && <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: 'var(--mpl-text-muted)' }}>Completed seasons are locked; save will be rejected.</span>}
                 {isEditing && <button type="button" onClick={resetForm} style={{ marginLeft: '1rem', backgroundColor: '#6c757d' }}>Cancel Edit</button>}
            </form>


            {/* Seasons List */}
            <h3>Existing Seasons</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--mpl-text-muted)', marginBottom: '0.5rem' }}>Delete removes the season and all related data (matches, balls, teams, payments, auction). You must enter the destructive action password.</p>
             {loading && seasons.length === 0 && <LoadingFallback message="Loading seasons..." />} {/* Show loading only if list is empty */}

            {seasons.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>Year</th>
                            <th>Name</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {seasons.map(season => {
                            const isCompleted = season.status === 'Completed';
                            return (
                            <tr key={season.season_id}>
                                <td>{season.year}</td>
                                <td>{season.name}</td>
                                <td>{season.start_date ? new Date(season.start_date).toLocaleDateString() : 'N/A'}</td>
                                <td>{season.end_date ? new Date(season.end_date).toLocaleDateString() : 'N/A'}</td>
                                <td>{season.status}</td>
                                <td>
                                    <button onClick={() => handleEditClick(season)} disabled={loading || isEditing === season.season_id || isCompleted} title={isCompleted ? 'Completed seasons cannot be edited' : ''} style={{padding: '0.3em 0.6em', fontSize: '0.9rem'}}>Edit</button>
                                    <button type="button" onClick={() => { setDeleteSeasonTarget(season); setError(''); setDestructivePassword(''); }} disabled={loading || isCompleted} title={isCompleted ? 'Completed seasons cannot be deleted' : 'Delete season and all related data (password required)'} style={{ backgroundColor: '#dc3545', marginLeft: '0.5rem', padding: '0.3em 0.6em', fontSize: '0.9rem' }}>Delete</button>
                                </td>
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
            ) : (
                 !loading && <p>No seasons found.</p>
            )}
        </div>
    );
}

export default AdminSeasonsPage;