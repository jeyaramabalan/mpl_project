// src/components/BowlingScorecard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './Scorecard.css'; // Reuse scorecard styles

const BowlingScorecard = ({ stats, teamName, inningsNumber }) => {
    // ** Placeholder Check: Remove or modify when backend provides data **
    if (!stats || stats.length === 0) {
        console.warn(`Bowling stats prop missing or empty for ${teamName} Innings ${inningsNumber}. Backend needs to provide this.`);
        // Return null or a message, depending on desired behavior
        return <p>Bowling scorecard data not available for {teamName} (Innings {inningsNumber}).</p>;
    }

    // Helper to calculate Economy Rate safely
    const calculateEcon = (runs, oversDecimal) => {
        if (oversDecimal == null || oversDecimal <= 0 || isNaN(runs) || isNaN(oversDecimal)) return "-";
        // Convert decimal overs to balls, then back to overs for calculation
        const completedOvers = Math.floor(oversDecimal);
        const ballsInPartialOver = Math.round((oversDecimal - completedOvers) * 10);
        const totalBalls = (completedOvers * 6) + ballsInPartialOver;
        if (totalBalls === 0) return "-";
        const properOvers = totalBalls / 6;
        const econ = parseInt(runs) / properOvers;
        return econ.toFixed(2); // Format to 2 decimal places
    };

    // Format Overs
    const formatOvers = (oversDecimal) => {
        if (oversDecimal == null || isNaN(oversDecimal)) return "-";
        const completedOvers = Math.floor(oversDecimal);
        const ballsInPartialOver = Math.round((oversDecimal - completedOvers) * 10);
        return `${completedOvers}.${ballsInPartialOver}`;
    };


    return (
        <div className="scorecard-container">
            <h4>{teamName} - Innings {inningsNumber} Bowling</h4>
            <div className="table-responsive">
                <table className="scorecard-table bowling-scorecard">
                    <thead>
                        <tr>
                            <th>Bowler</th>
                            <th>Overs</th>
                            <th>Maidens</th>
                            <th>Runs</th>
                            <th>Wkts</th>
                            <th>Econ</th>
                            <th>Wd</th>
                            <th>NB</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((stat) => (
                            // Make sure backend provides unique key, like player_id for this bowler
                            <tr key={`${inningsNumber}-bowl-${stat.player_id}`}>
                                <td className="player-name">
                                    <Link to={`/players/${stat.player_id}`}>{stat.player_name}</Link>
                                </td>
                                <td className="overs">{formatOvers(stat.overs_bowled)}</td>
                                <td className="maidens">{stat.maidens ?? 0}</td>
                                <td className="runs-conceded">{stat.runs_conceded ?? 0}</td>
                                <td className="wickets">{stat.wickets_taken ?? 0}</td>
                                <td className="economy">{calculateEcon(stat.runs_conceded, stat.overs_bowled)}</td>
                                <td className="wides">{stat.wides ?? 0}</td>
                                <td className="noballs">{stat.no_balls ?? 0}</td>
                            </tr>
                        ))}
                        {/* TODO: Add Totals row */}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BowlingScorecard;