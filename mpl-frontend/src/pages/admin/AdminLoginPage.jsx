// mpl-project/mpl-frontend/src/pages/admin/AdminLoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';

function AdminLoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Redirect if already logged in
     useEffect(() => {
        let isLoggedIn = false;
        try {
             const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo && JSON.parse(adminInfo).token) {
                isLoggedIn = true;
            }
        } catch (e) { console.error("Error checking login status", e); }

        if (isLoggedIn) {
            console.log("Login Page: Already logged in, redirecting...");
            const from = location.state?.from?.pathname || '/admin/dashboard';
             navigate(from, { replace: true });
        }
    }, [navigate, location.state]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            console.log("Attempting login...");
            const { data } = await api.post('/admin/auth/login', { username, password });
            localStorage.setItem('adminInfo', JSON.stringify(data)); // Store user info and token
             console.log("Login successful", data);

             // Dispatch custom event to notify Navbar/other components
             window.dispatchEvent(new CustomEvent('authChange'));

            // Redirect to the intended page or dashboard
             const from = location.state?.from?.pathname || '/admin/dashboard';
             console.log(`Redirecting after login to: ${from}`);
             navigate(from, { replace: true }); // Replace login page in history

        } catch (err) {
            console.error("Login failed:", err);
             // 'err' here might be the error message string from the interceptor
            const errorMessage = typeof err === 'string' ? err : 'Login failed. Please check credentials.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Admin Login</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="username">Username:</label>
                    <input
                    style={{backgroundColor:'white'}}
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        autoFocus
                    />
                </div>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input
                                        style={{backgroundColor:'white'}}

                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                {error && <p className="error-message" style={{ marginTop: '1rem' }}>{error}</p>}
                <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '1rem', fontSize: '1.1rem' }}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    );
}
export default AdminLoginPage;