// src/components/InningsScorecard.jsx
import React from 'react';
import { Link } from 'react-router-dom'; // Import Link
import './Scorecard.css'; // Import specific CSS for scorecards

const InningsScorecard = ({ stats, teamName, inningsNumber }) => {
    if (!stats || stats.length === 0) {
        return <p>Batting scorecard data not available for {teamName} (Innings {inningsNumber}).</p>;
    }

    // Helper to calculate Strike Rate safely
    const calculateSR = (runs, balls) => {
        if (!balls || balls === 0 || isNaN(runs) || isNaN(balls)) return "-";
        const rate = (parseInt(runs) / parseInt(balls)) * 100;
        return rate.toFixed(1); // Format to 1 decimal place
    };

    // Helper to format dismissal
    const formatDismissal = (stat) => {
        if (!stat.is_out) return <span className="not-out">Not Out</span>; // Style 'Not Out' differently
        let dismissal = stat.how_out || "Out";
        // Example: Add links if backend provides bowler/fielder names/IDs linked to dismissal
        // if (stat.bowler_id) dismissal += ` b ${stat.bowler_name || stat.bowler_id}`;
        // if (stat.fielder_id) dismissal += ` c ${stat.fielder_name || stat.fielder_id}`;
        return dismissal;
    };

    return (
        <div className="scorecard-container">
            <h4>{teamName} - Innings {inningsNumber} Batting</h4>
            <div className="table-responsive"> {/* Wrapper for horizontal scroll */}
                <table className="scorecard-table batting-scorecard">
                    <thead>
                        <tr>
                            <th>Batsman</th>
                            <th>Dismissal</th>
                            <th>Runs</th>
                            <th>Balls</th>
                            <th>2s</th>
                            <th>4s</th>
                            <th>SR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.filter(filt=>filt.balls_faced>0).map((stat) => (
                            <tr key={`${inningsNumber}-bat-${stat.player_id}`}>
                                {/* Add Link to player name */}
                                <td className="player-name">
                                    <Link to={`/players/${stat.player_id}`}>{stat.player_name}</Link>
                                </td>
                                <td className="dismissal">{formatDismissal(stat)}</td>
                                <td className="runs">{stat.runs_scored ?? 0}</td>
                                <td className="balls">{stat.balls_faced ?? 0}</td>
                                <td className="twos">{stat.twos ?? 0}</td>
                                <td className="fours">{stat.fours ?? 0}</td>
                                <td className="strike-rate">{calculateSR(stat.runs_scored, stat.balls_faced)}</td>
                            </tr>
                        ))}
                        {/* TODO: Add Totals row */}
                    </tbody>
                </table>
            </div>
            {/* TODO: Add Extras breakdown */}
        </div>
    );
};

export default InningsScorecard;