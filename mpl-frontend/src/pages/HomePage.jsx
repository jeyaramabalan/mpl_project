// mpl-project/mpl-frontend/src/pages/HomePage.jsx
import React from 'react';
import { Link } from 'react-router-dom'; // For navigation links

function HomePage() {
    return (
        <div>
            <h1>Welcome to the Metalworks Premier League (MPL)!</h1>
            <p>Fostering Community Spirit Through Box Cricket.</p>
            <p>The MPL aims to organize an engaging and competitive Box Cricket tournament each summer for the residents of Metalworks and nearby apartments.</p>
            <hr />
            <h2>Quick Links:</h2>
            <ul>
                <li><Link to="/schedule">View Match Schedule</Link></li>
                <li><Link to="/players">Browse Players</Link></li>
                {/* Add link to current season standings if available */}
                {/* Add link to rules */}
            </ul>
            {/* You could add recent results or upcoming match snippets here */}
        </div>
    );
}
export default HomePage;