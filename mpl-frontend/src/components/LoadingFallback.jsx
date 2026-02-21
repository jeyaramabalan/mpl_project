// mpl-project/mpl-frontend/src/components/LoadingFallback.jsx
import React from 'react';
import Skeleton from './Skeleton';
import './LoadingFallback.css';

const LoadingFallback = ({ message, variant = 'lines' }) => (
    <div className="loading-fallback" role="status" aria-label={message || 'Loading'}>
        <Skeleton variant={variant} message={message} />
    </div>
);

export default LoadingFallback;