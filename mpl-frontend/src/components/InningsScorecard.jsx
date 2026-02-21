// src/components/InningsScorecard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './Scorecard.css';

const InningsScorecard = ({ stats, teamName, inningsNumber, summary }) => {
    if (!stats) {
        return <p>Batting scorecard data not available for {teamName} (Innings {inningsNumber}).</p>;
    }

    const calculateSR = (runs, balls) => {
        if (!balls || balls === 0 || isNaN(runs) || isNaN(balls)) return "-";
        const rate = (parseInt(runs) / parseInt(balls)) * 100;
        return rate.toFixed(1);
    };

    const formatDismissal = (stat) => {
        if (stat.did_not_bat) return <span className="did-not-bat">did not bat</span>;
        if (!stat.is_out) return <span className="not-out">not out</span>;
        // The detailed dismissal text is now calculated in the parent and passed down
        return stat.how_out || "out"; 
    };

    return (
        <div className="scorecard-container">
            <h4>{teamName} - Innings {inningsNumber} Batting</h4>
            <div className="table-responsive">
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
                        {stats.map((stat) => (
                            <tr key={`${inningsNumber}-bat-${stat.player_id}`}>
                                <td className="player-name">
                                    <Link to={`/players/${stat.player_id}`}>{stat.player_name || stat.name}</Link>
                                </td>
                                <td className="dismissal">{formatDismissal(stat)}</td>
                                <td className="runs">{stat.runs_scored ?? '–'}</td>
                                <td className="balls">{stat.balls_faced ?? '–'}</td>
                                <td className="twos">{stat.twos ?? '–'}</td>
                                <td className="fours">{stat.fours ?? '–'}</td>
                                <td className="strike-rate">{calculateSR(stat.runs_scored, stat.balls_faced)}</td>
                            </tr>
                        ))}
                        {summary && (
                            <>
                                <tr className="extras-row">
                                    <td className="summary-label">Extras</td>
                                    <td colSpan="6" className="summary-value extras-breakdown">{summary.extras} {summary.extras_detail}</td>
                                </tr>
                                <tr className="total-row">
                                    <td className="summary-label">Total</td>
                                    <td colSpan="6" className="summary-value">{summary.total} ({summary.wickets} wkts, {summary.overs} Ov)</td>
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InningsScorecard;