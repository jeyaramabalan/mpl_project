// mpl-project/mpl-frontend/src/pages/admin/AdminDashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import LoadingFallback from '../../components/LoadingFallback';
import './AdminDashboardPage.css';

function AdminDashboardPage() {
  const [adminUsername, setAdminUsername] = useState('Admin');
  const [scheduledCount, setScheduledCount] = useState(null);
  const [liveCount, setLiveCount] = useState(null);
  const [resolveCount, setResolveCount] = useState(null);
  const [loadingCounts, setLoadingCounts] = useState(true);

  useEffect(() => {
    try {
      const adminInfoString = localStorage.getItem('adminInfo');
      if (adminInfoString) {
        const info = JSON.parse(adminInfoString);
        setAdminUsername(info?.username || 'Admin');
      }
    } catch (e) {
      console.error('Error reading admin username', e);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchCounts = async () => {
      setLoadingCounts(true);
      try {
        const [scheduledRes, liveRes, allRes] = await Promise.all([
          api.get('/matches', { params: { status: 'Scheduled' } }),
          api.get('/matches', { params: { status: 'Live' } }),
          api.get('/matches'),
        ]);
        if (!isMounted) return;
        const scheduled = Array.isArray(scheduledRes.data) ? scheduledRes.data.length : 0;
        const live = Array.isArray(liveRes.data) ? liveRes.data.length : 0;
        const all = Array.isArray(allRes.data) ? allRes.data : [];
        const needingResolve = all.filter(
          (m) =>
            (m.status === 'Completed' && m.winner_team_id == null) ||
            m.status === 'Abandoned' ||
            m.status === 'Live' ||
            m.status === 'InningsBreak' ||
            m.status === 'Setup'
        ).length;
        setScheduledCount(scheduled);
        setLiveCount(live);
        setResolveCount(needingResolve);
      } catch (err) {
        if (isMounted) {
          setScheduledCount(0);
          setLiveCount(0);
          setResolveCount(0);
        }
      } finally {
        if (isMounted) setLoadingCounts(false);
      }
    };
    fetchCounts();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>
      <p className="admin-dashboard-welcome">Welcome back, {adminUsername}! Use the shortcuts below or the sidebar to manage the league.</p>

      <div className="admin-dashboard-shortcuts">
        <Link to="/admin/scoring/setup" className="admin-dashboard-card">
          <span className="admin-dashboard-card-count">
            {loadingCounts ? '…' : scheduledCount ?? 0}
          </span>
          <h3 className="admin-dashboard-card-title">Scheduled (ready for setup)</h3>
          <p className="admin-dashboard-card-desc">Matches waiting for toss &amp; lineup setup</p>
        </Link>
        <Link to="/admin/scoring/setup" className="admin-dashboard-card">
          <span className="admin-dashboard-card-count">
            {loadingCounts ? '…' : liveCount ?? 0}
          </span>
          <h3 className="admin-dashboard-card-title">Live now</h3>
          <p className="admin-dashboard-card-desc">Matches currently in progress</p>
        </Link>
        <Link to="/admin/resolve" className="admin-dashboard-card">
          <span className="admin-dashboard-card-count">
            {loadingCounts ? '…' : resolveCount ?? 0}
          </span>
          <h3 className="admin-dashboard-card-title">Needing resolution</h3>
          <p className="admin-dashboard-card-desc">Ties, abandoned, or stuck matches</p>
        </Link>
      </div>

      <section className="admin-dashboard-actions">
        <h3>All actions</h3>
        <ul className="admin-dashboard-list">
          <li>
            <Link to="/admin/seasons">Manage Seasons</Link>
            <span className="admin-dashboard-list-desc">Create and edit seasons (year, name, dates).</span>
          </li>
          <li>
            <Link to="/admin/teams">Manage Teams &amp; Squads</Link>
            <span className="admin-dashboard-list-desc">Teams per season and assign players to teams.</span>
          </li>
          <li>
            <Link to="/admin/players">Register / Edit Players</Link>
            <span className="admin-dashboard-list-desc">Master list of players (name, role, base price).</span>
          </li>
          <li>
            <Link to="/admin/schedule">Manage Match Schedule</Link>
            <span className="admin-dashboard-list-desc">Add or edit fixtures (teams, date, venue).</span>
          </li>
          <li>
            <Link to="/admin/scoring/setup">Setup Match Scoring</Link>
            <span className="admin-dashboard-list-desc">Select match, set toss and super over, start live scoring.</span>
          </li>
          <li>
            <Link to="/admin/resolve">Resolve Tie / Incomplete Match</Link>
            <span className="admin-dashboard-list-desc">Set winner, result summary, and Man of the Match.</span>
          </li>
        </ul>
      </section>
    </div>
  );
}

export default AdminDashboardPage;
