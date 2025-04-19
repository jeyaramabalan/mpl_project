// mpl-project/mpl-frontend/src/pages/admin/AdminDashboardPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

function AdminDashboardPage() {
     // Attempt to get username from localStorage for personalization
     let adminUsername = 'Admin';
     try {
        const adminInfoString = localStorage.getItem('adminInfo');
        if (adminInfoString) {
             adminUsername = JSON.parse(adminInfoString)?.username || 'Admin';
        }
     } catch(e) { console.error("Error reading admin username", e); }


    return (
        <div>
            <h2>Admin Dashboard</h2>
            <p>Welcome back, {adminUsername}!</p>
            <p>Select an option below to manage the league:</p>
            <ul style={{ listStyle: 'none', paddingLeft: 0, marginTop: '1.5rem' }}>
                <li style={{ marginBottom: '0.8rem' }}>
                    <Link to="/admin/seasons">
                        <button style={{ width: '250px', textAlign: 'left' }}>Manage Seasons</button>
                    </Link>
                </li>
                <li style={{ marginBottom: '0.8rem' }}>
                     <Link to="/admin/teams">
                        <button style={{ width: '250px', textAlign: 'left' }}>Manage Teams / Players</button>
                     </Link>
                      {/* Could link to /admin/players directly too */}
                </li>
                <li style={{ marginBottom: '0.8rem' }}>
                    <Link to="/admin/schedule"> {/* <-- Add Link */}
                        <button style={{ width: '250px', textAlign: 'left' }}>Manage Match Schedule</button>
                    </Link>
                </li>
                 <li style={{ marginBottom: '0.8rem' }}>
                    <Link to="/admin/scoring/setup">
                        <button style={{ width: '250px', textAlign: 'left' }}>Setup Match Scoring</button>
                    </Link>
                </li>
                 {/* Add links to Manage Payments, Approve Registrations etc. */}
                 {/* Example:
                 <li style={{ marginBottom: '0.8rem' }}>
                    <Link to="/admin/payments">
                        <button style={{ width: '250px', textAlign: 'left' }}>Manage Payments</button>
                    </Link>
                </li>
                 */}
            </ul>
        </div>
    );
}
export default AdminDashboardPage;