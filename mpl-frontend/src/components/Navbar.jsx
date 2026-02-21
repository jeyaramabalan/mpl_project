// mpl-project/mpl-frontend/src/components/Navbar.jsx
// Top navigation bar: MPL logo, main nav links (Home, Players, Schedule, Standings, Leaderboard), Admin/Login, and Sign Up CTA.

import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
    const navigate = useNavigate();
    // Tracks whether admin is logged in so we show "Admin" + Logout vs "Admin Login"
    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

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
                {/* Logo: circular MPL badge, links to home */}
                <Link to="/" className="mpl-nav-logo" aria-label="MPL Home">
                    <span className="mpl-logo-circle">
                        <span className="mpl-logo-inner">MPL</span>
                    </span>
                </Link>
                {/* Main navigation: public pages; active link gets yellow highlight */}
                <div className="mpl-nav-links">
                    <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>Home</NavLink>
                    <NavLink to="/players" className={({ isActive }) => isActive ? 'active' : ''}>Players</NavLink>
                    <NavLink to="/schedule" className={({ isActive }) => isActive ? 'active' : ''}>Schedule</NavLink>
                    <NavLink to="/standings" className={({ isActive }) => isActive ? 'active' : ''}>Standings</NavLink>
                    <NavLink to="/leaderboard" className={({ isActive }) => isActive ? 'active' : ''}>Leaderboard</NavLink>
                </div>
                {/* Right side: Admin link or Admin + Logout when logged in; Sign Up CTA */}
                <div className="nav-right">
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
