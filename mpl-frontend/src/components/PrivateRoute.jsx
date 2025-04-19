// mpl-project/mpl-frontend/src/components/PrivateRoute.jsx
import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import LoadingFallback from './LoadingFallback'; // Import loading indicator

/**
 * A component that wraps routes requiring admin authentication.
 * It checks for a valid token in localStorage.
 * If authenticated, it renders the child routes (using <Outlet />).
 * If not authenticated, it redirects the user to the admin login page,
 * preserving the original intended destination for redirection after login.
 */
const PrivateRoute = () => {
    const location = useLocation(); // Get current location object
    // State to manage authentication check status: null (checking), true (auth), false (not auth)
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    // Effect to check authentication status when the component mounts or location changes
    useEffect(() => {
        console.log("PrivateRoute: Checking authentication status...");
        let isAdminAuthenticated = false;
        try {
            const adminInfoString = localStorage.getItem('adminInfo');
            if (adminInfoString) {
                const adminInfo = JSON.parse(adminInfoString);
                // Basic check for token existence.
                // TODO: Implement more robust validation if needed (e.g., token expiry check using jwt-decode library)
                if (adminInfo?.token) {
                    isAdminAuthenticated = true;
                    // Example using jwt-decode (install `jwt-decode` package first):
                    // import jwt_decode from 'jwt-decode';
                    // try {
                    //   const decodedToken = jwt_decode(adminInfo.token);
                    //   const currentTime = Date.now() / 1000; // Convert to seconds
                    //   if (decodedToken.exp > currentTime) {
                    //     isAdminAuthenticated = true; // Token exists and is not expired
                    //     console.log("PrivateRoute: Token valid.");
                    //   } else {
                    //     console.warn("PrivateRoute: Token expired.");
                    //     localStorage.removeItem('adminInfo'); // Remove expired token
                    //   }
                    // } catch (decodeError) {
                    //   console.error("PrivateRoute: Error decoding token:", decodeError);
                    //   localStorage.removeItem('adminInfo'); // Remove invalid token
                    // }
                }
            }
        } catch (error) {
             console.error("PrivateRoute: Error reading auth status from storage:", error);
             localStorage.removeItem('adminInfo'); // Clear potentially corrupted item
        }
        setIsAuthenticated(isAdminAuthenticated);
        console.log(`PrivateRoute: Authentication status set to ${isAdminAuthenticated}`);

    }, [location]); // Re-check if the location changes (might not be strictly necessary)

    // While checking authentication, show a loading indicator
    if (isAuthenticated === null) {
        return <LoadingFallback />;
    }

    // If not authenticated, redirect to the login page
    if (!isAuthenticated) {
        console.log(`PrivateRoute: Not authenticated. Redirecting from ${location.pathname} to /admin/login.`);
        // Pass the current location via state so the login page can redirect back after success.
        // `replace` prevents the current (protected) route from being added to history.
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    // If authenticated, render the nested child routes defined within this PrivateRoute in App.jsx
    return <Outlet />;
};

export default PrivateRoute;