// mpl-project/mpl-frontend/src/pages/PlayersPage.jsx
// Players list: table of all players (name, role) with link to player detail page.

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { toList } from '../utils/apiResponse';
import LoadingFallback from '../components/LoadingFallback';

function PlayersPage() {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPlayers = async () => {
            setLoading(true);
            setError('');
            try {
                console.log("Fetching players list...");
                const response = await api.get('/players');
                const data = response.data;
                const list = toList(data);
                setPlayers(list);
                if (list.length === 0 && data != null) {
                    console.warn("Players API returned 0 items. Response type:", Array.isArray(data) ? 'array' : typeof data, typeof data === 'object' ? ', keys: ' + Object.keys(data || {}).join(', ') : '');
                }
                console.log("Players fetched:", list.length);
            } catch (err) {
                console.error("Failed to fetch players:", err);
                const errorMessage = typeof err === 'string' ? err : (err.message || 'Failed to load players list.');
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchPlayers();
    }, []); // Empty dependency array ensures this runs only once on mount

    if (loading) return <LoadingFallback />;
    if (error) return <div className="error-message">Error loading players: {error}</div>;

    return (
        <div className="mpl-section">
            <h1 className="mpl-page-title">MPL Players</h1>
            {/* Players table: Name, Role, link to View Profile (player detail) */}
            {players.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {players.map((player) => (
                            <tr key={player.player_id}>
                                <td>{player.name}</td>
                                <td>{player.role || 'N/A'}</td>
                                <td>
                                    <Link to={`/players/${player.player_id}`}>View Profile</Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>No players found.</p>
            )}
             {/* Optional: Link to player registration form (if public/allowed) */}
        </div>
    );
}

export default PlayersPage;