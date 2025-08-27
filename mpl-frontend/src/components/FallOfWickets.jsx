// src/components/FallOfWickets.jsx
import React from 'react';
import './Scorecard.css'; // Reuse styles from Scorecard.css

const FallOfWickets = ({ wickets }) => {
    if (!wickets || wickets.length === 0) return null;

    return (
        <div className="scorecard-container fow-container">
            <h4>Fall of Wickets</h4>
            <div className="fow-grid">
                {wickets.map((wicket, index) => (
                    // Changed from <p> to <div> for better styling control
                    <div key={index} className="fow-item">
                        <span className="fow-overs">({wicket.overs}) ov</span>
                        <span className="fow-score">{wicket.score}-{wicket.number}</span>
                        <span className="fow-player">{wicket.playerName}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FallOfWickets;