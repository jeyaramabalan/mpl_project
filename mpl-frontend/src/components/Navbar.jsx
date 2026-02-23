// mpl-project/mpl-frontend/src/components/Navbar.jsx
// Top navigation bar: MPL logo, main nav links, theme toggle, Admin/Login, Sign Up CTA.

import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import './Navbar.css';

const MPL_LOGO_SRC = '/images/logo/mpl.jpg';

function Navbar() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
    const [logoImageError, setLogoImageError] = useState(false);

    // Reads adminInfo from localStorage and sets isAdminLoggedIn based on presence of token
    const checkLoginStatus = () => {
        let loggedIn = false;
        try {
            const adminInfoString = localStorage.getItem('adminInfo');
            if (adminInfoString) {
                const adminInfo = JSON.parse(adminInfoString);
                loggedIn = !!adminInfo?.token;
            }
        } catch (error) {
            console.error("Error reading admin login status:", error);
            localStorage.removeItem('adminInfo');
        }
        setIsAdminLoggedIn(loggedIn);
    };

    // On mount: check login; also listen for storage events so login state stays in sync across tabs
    useEffect(() => {
        checkLoginStatus();
        const handleStorageChange = (event) => {
            if (event.key === 'adminInfo') checkLoginStatus();
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Clear auth and redirect to admin login
    const logoutHandler = () => {
        localStorage.removeItem('adminInfo');
        setIsAdminLoggedIn(false);
        navigate('/admin/login');
    };

    return (
        <header className="mpl-navbar">
            <nav>
                {/* Logo: mpl.jpg with fallback to letter circle */}
                <Link to="/" className="mpl-nav-logo" aria-label="MPL Home">
                    {!logoImageError ? (
                        <img src={MPL_LOGO_SRC} alt="MPL" className="mpl-logo-img" onError={() => setLogoImageError(true)} />
                    ) : (
                        <span className="mpl-logo-circle">
                            <span className="mpl-logo-inner">MPL</span>
                        </span>
                    )}
                </Link>
                {/* Main navigation: public pages; active link gets yellow highlight */}
                <div className="mpl-nav-links">
                    <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>Home</NavLink>
                    <NavLink to="/players" className={({ isActive }) => isActive ? 'active' : ''}>Players</NavLink>
                    <NavLink to="/schedule" className={({ isActive }) => isActive ? 'active' : ''}>Schedule</NavLink>
                    <NavLink to="/standings" className={({ isActive }) => isActive ? 'active' : ''}>Standings</NavLink>
                    <NavLink to="/leaderboard" className={({ isActive }) => isActive ? 'active' : ''}>Leaderboard</NavLink>
                    <NavLink to="/champions" className={({ isActive }) => isActive ? 'active' : ''}>Champions</NavLink>
                </div>
                {/* Right side: theme toggle, Admin/Logout, Sign Up */}
                <div className="nav-right">
                    <button
                        type="button"
                        className="mpl-theme-toggle"
                        onClick={toggleTheme}
                        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                    {isAdminLoggedIn ? (
                        <>
                            <NavLink to="/admin/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>Admin</NavLink>
                            <button type="button" className="mpl-nav-btn-outline" onClick={logoutHandler}>Logout</button>
                        </>
                    ) : (
                        <NavLink to="/admin/login" className="mpl-nav-admin-link">Admin Login</NavLink>
                    )}
                    <Link to="/players" className="mpl-btn-accent mpl-nav-signup">Sign Up</Link>
                </div>
            </nav>
        </header>
    );
}

export default Navbar;
