// mpl-project/mpl-frontend/src/pages/NotFoundPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => (
    <div className="mpl-section" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h1 className="mpl-page-title" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>404</h1>
        <h2>Page Not Found</h2>
        <p style={{ margin: '1rem 0', color: 'var(--mpl-text-muted, #555)' }}>
            Sorry, the page you are looking for does not exist or may have been moved.
        </p>
        <p style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
            <Link to="/">Go to Home</Link>
            <Link to="/schedule">Schedule</Link>
            <Link to="/standings">Standings</Link>
            <Link to="/players">Players</Link>
        </p>
    </div>
);

export default NotFoundPage;