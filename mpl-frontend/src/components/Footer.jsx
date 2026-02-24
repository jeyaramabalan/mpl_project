// mpl-project/mpl-frontend/src/components/Footer.jsx
// Site footer: social icons, Contact Us / FAQ links, copyright. Shown on all pages.

import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="mpl-footer">
            <div className="mpl-footer-inner">
                {/* Social media icon links (placeholder URLs; update to real MPL accounts) */}
                <div className="mpl-footer-social">
                    <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="mpl-footer-icon">f</a>
                    <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="mpl-footer-icon">𝕏</a>
                    <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="mpl-footer-icon">📷</a>
                    <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="mpl-footer-icon">▶</a>
                </div>
                {/* Contact and FAQ pages */}
                <div className="mpl-footer-links">
                    <Link to="/contact">Contact Us</Link>
                    <span className="mpl-footer-sep">|</span>
                    <Link to="/rules">Rules</Link>
                </div>
                {/* Copyright text; year is dynamic */}
                <div className="mpl-footer-copy">
                    © {currentYear} Metalworks Premier League
                </div>
            </div>
        </footer>
    );
}

export default Footer;
