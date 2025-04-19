// mpl-project/mpl-frontend/src/pages/admin/AdminSeasonsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import LoadingFallback from '../../components/LoadingFallback';

function AdminSeasonsPage() {
    const [seasons, setSeasons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(null); // Holds season_id if editing, else null
    const [formData, setFormData] = useState({ year: '', name: '', start_date: '', end_date: '', status: 'Planned' });

    const fetchSeasons = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/admin/seasons');
            setSeasons(data);
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

    // TODO: Implement handleDelete

    return (
        <div>
            <h2>Manage Seasons</h2>

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
                 {isEditing && <button type="button" onClick={resetForm} style={{ marginLeft: '1rem', backgroundColor: '#6c757d' }}>Cancel Edit</button>}
            </form>


            {/* Seasons List */}
            <h3>Existing Seasons</h3>
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
                        {seasons.map(season => (
                            <tr key={season.season_id}>
                                <td>{season.year}</td>
                                <td>{season.name}</td>
                                <td>{season.start_date ? new Date(season.start_date).toLocaleDateString() : 'N/A'}</td>
                                <td>{season.end_date ? new Date(season.end_date).toLocaleDateString() : 'N/A'}</td>
                                <td>{season.status}</td>
                                <td>
                                    <button onClick={() => handleEditClick(season)} disabled={loading || isEditing === season.season_id} style={{padding: '0.3em 0.6em', fontSize: '0.9rem'}}>Edit</button>
                                    {/* TODO: Add Delete Button */}
                                     {/* <button onClick={() => handleDelete(season.season_id)} disabled={loading} style={{backgroundColor: '#dc3545', marginLeft: '0.5rem'}}>Delete</button> */}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                 !loading && <p>No seasons found.</p>
            )}
        </div>
    );
}

export default AdminSeasonsPage;