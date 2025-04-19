// mpl-project/mpl-frontend/src/pages/NotFoundPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>404</h1>
        <h2>Page Not Found</h2>
        <p style={{ margin: '1rem 0', color: '#555' }}>
            Sorry, the page you are looking for does not exist or may have been moved.
        </p>
        <Link to="/">
            <button>Go Back Home</button>
        </Link>
    </div>
);

export default NotFoundPage;