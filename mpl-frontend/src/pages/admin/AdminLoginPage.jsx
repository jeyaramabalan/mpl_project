// mpl-project/mpl-frontend/src/pages/admin/AdminLoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import './AdminLoginPage.css';

function getRedirectTarget(location, searchParams) {
  const fromState = location.state?.from?.pathname;
  if (fromState && fromState.startsWith('/admin')) return fromState;
  const fromQuery = searchParams.get('redirect');
  if (fromQuery && fromQuery.startsWith('/admin')) return fromQuery;
  return '/admin/dashboard';
}

function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    let isLoggedIn = false;
    try {
      const adminInfo = localStorage.getItem('adminInfo');
      if (adminInfo && JSON.parse(adminInfo).token) isLoggedIn = true;
    } catch (e) {
      console.error('Error checking login status', e);
    }
    if (isLoggedIn) {
      const to = getRedirectTarget(location, searchParams);
      navigate(to, { replace: true });
    }
  }, [navigate, location.state, location, searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/admin/auth/login', { username, password });
      localStorage.setItem('adminInfo', JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('authChange'));
      const to = getRedirectTarget(location, searchParams);
      navigate(to, { replace: true });
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : (err?.message || 'Login failed. Please check credentials.');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-wrap">
      <h2>Admin Login</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="username">Username</label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoFocus
        />
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error-message">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in…' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default AdminLoginPage;