// Admin layout: sidebar nav + breadcrumbs for all protected admin pages
import React from 'react';
import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import './AdminLayout.css';

const NAV_ITEMS = [
  { path: '/admin/dashboard', label: 'Dashboard' },
  { path: '/admin/seasons', label: 'Seasons' },
  { path: '/admin/teams', label: 'Teams' },
  { path: '/admin/players', label: 'Players' },
  { path: '/admin/schedule', label: 'Schedule' },
  { path: '/admin/scoring/setup', label: 'Setup Scoring' },
  { path: '/admin/resolve', label: 'Resolve Match' },
];

function getBreadcrumbs(pathname, params) {
  const segments = pathname.replace(/^\/admin\/?/, '').split('/').filter(Boolean);
  const crumbs = [{ path: '/admin/dashboard', label: 'Admin' }];
  let acc = '/admin';
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    acc += (acc === '/admin' ? '' : '/') + seg;
    if (seg === 'dashboard') crumbs.push({ path: acc, label: 'Dashboard' });
    else if (seg === 'seasons') crumbs.push({ path: acc, label: 'Seasons' });
    else if (seg === 'teams') crumbs.push({ path: acc, label: 'Teams' });
    else if (seg === 'players') crumbs.push({ path: acc, label: 'Players' });
    else if (seg === 'schedule') crumbs.push({ path: acc, label: 'Schedule' });
    else if (seg === 'scoring') {
      if (segments[i + 1] === 'setup') {
        crumbs.push({ path: '/admin/scoring/setup', label: 'Setup Scoring' });
        i++;
        acc += '/setup';
      } else if (segments[i + 1] === 'live' && segments[i + 2]) {
        crumbs.push({ path: '/admin/scoring/setup', label: 'Setup Scoring' });
        crumbs.push({ path: acc + '/live/' + segments[i + 2], label: `Live Match ${params.matchId || segments[i + 2]}` });
        break;
      }
    } else if (seg === 'resolve') crumbs.push({ path: acc, label: 'Resolve Match' });
    else crumbs.push({ path: acc, label: seg });
  }
  return crumbs;
}

function AdminLayout() {
  const location = useLocation();
  const params = useParams();
  const breadcrumbs = getBreadcrumbs(location.pathname, params);

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h3 className="admin-sidebar-title">Admin</h3>
        <nav className="admin-nav">
          {NAV_ITEMS.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={`admin-nav-link ${location.pathname === path || (path !== '/admin/dashboard' && location.pathname.startsWith(path)) ? 'active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="admin-main">
        <nav className="admin-breadcrumbs" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.path}>
              {i > 0 && <span className="admin-breadcrumb-sep"> / </span>}
              {i === breadcrumbs.length - 1 ? (
                <span className="admin-breadcrumb-current">{crumb.label}</span>
              ) : (
                <Link to={crumb.path} className="admin-breadcrumb-link">{crumb.label}</Link>
              )}
            </span>
          ))}
        </nav>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
