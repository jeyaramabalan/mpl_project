// mpl-project/mpl-frontend/src/components/Navbar.jsx
// Top navigation bar: main nav links, theme toggle, Admin/Login. Logo used in title bar (favicon) only.

import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import './Navbar.css';

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();
    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

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
        setMenuOpen(false);
    };

    // Close menu on route change (SPA) and on escape key
    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);
    useEffect(() => {
        const handleEscape = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, []);

    const closeMenu = () => setMenuOpen(false);

    return (
        <header className="mpl-navbar">
            <nav>
                <Link to="/" className="mpl-nav-brand" aria-label="MPL Home" onClick={closeMenu}>MPL</Link>
                <button
                    type="button"
                    className="mpl-nav-hamburger"
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-expanded={menuOpen}
                    aria-controls="mpl-nav-menu"
                    aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                >
                    <span className="mpl-nav-hamburger-bar" />
                    <span className="mpl-nav-hamburger-bar" />
                    <span className="mpl-nav-hamburger-bar" />
                </button>
                <div id="mpl-nav-menu" className={`mpl-nav-menu ${menuOpen ? 'mpl-nav-menu-open' : ''}`}>
                    <div className="mpl-nav-links">
                        <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>Home</NavLink>
                        <NavLink to="/players" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>Players</NavLink>
                        <NavLink to="/schedule" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>Schedule</NavLink>
                        <NavLink to="/standings" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>Standings</NavLink>
                        <NavLink to="/leaderboard" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>Leaderboard</NavLink>
                        <NavLink to="/records" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>Records</NavLink>
                        <NavLink to="/champions" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>Champions</NavLink>
                    </div>
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
                                <NavLink to="/admin/dashboard" className={({ isActive }) => isActive ? 'active' : ''} onClick={closeMenu}>Admin</NavLink>
                                <button type="button" className="mpl-nav-btn-outline" onClick={logoutHandler}>Logout</button>
                            </>
                        ) : (
                            <NavLink to="/admin/login" className="mpl-nav-admin-link" onClick={closeMenu}>Admin Login</NavLink>
                        )}
                    </div>
                </div>
            </nav>
        </header>
    );
}

export default Navbar;
