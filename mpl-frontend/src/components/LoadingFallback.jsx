// mpl-project/mpl-frontend/src/components/LoadingFallback.jsx
import React from 'react';

// Simple loading indicator component to use with React.Suspense
const LoadingFallback = () => (
    <div className="loading-fallback"> {/* Use class for styling */}
        Loading...
        {/* Optional: Add a spinner animation here */}
    </div>
);

export default LoadingFallback;