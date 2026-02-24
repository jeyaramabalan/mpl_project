// mpl-project/mpl-frontend/src/components/PrivateRoute.jsx
import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import LoadingFallback from './LoadingFallback';

/**
 * Wraps routes requiring admin authentication.
 * Validates token presence and expiry (via jwt-decode).
 * Redirects to admin login with intended destination when not authenticated.
 */
const PrivateRoute = () => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    let isAdminAuthenticated = false;
    try {
      const adminInfoString = localStorage.getItem('adminInfo');
      if (adminInfoString) {
        const adminInfo = JSON.parse(adminInfoString);
        if (adminInfo?.token) {
          try {
            const decoded = jwtDecode(adminInfo.token);
            const nowSec = Date.now() / 1000;
            if (decoded.exp != null && decoded.exp > nowSec) {
              isAdminAuthenticated = true;
            } else {
              localStorage.removeItem('adminInfo');
            }
          } catch (decodeError) {
            localStorage.removeItem('adminInfo');
          }
        }
      }
    } catch (error) {
      localStorage.removeItem('adminInfo');
    }
    setIsAuthenticated(isAdminAuthenticated);
  }, [location]);

  if (isAuthenticated === null) {
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;