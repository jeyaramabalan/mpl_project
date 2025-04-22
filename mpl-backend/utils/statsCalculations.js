// mpl-backend/utils/statsCalculations.js

const calculateSR = (runs, balls) => {
    if (balls == null || balls === 0 || isNaN(runs) || isNaN(balls)) return null;
    return parseFloat(((parseInt(runs) / parseInt(balls)) * 100).toFixed(2));
};

const calculateAvg = (runs, outs) => {
    if (outs == null || isNaN(runs) || isNaN(outs)) return null;
    if (outs === 0) return (runs > 0 ? Infinity : null); // Handle division by zero (Infinity for Not Out)
    return parseFloat((parseInt(runs) / parseInt(outs)).toFixed(2));
};

const calculateEcon = (runs, oversDecimal) => {
    if (oversDecimal == null || oversDecimal <= 0 || isNaN(runs) || isNaN(oversDecimal)) return null;
    const completedOvers = Math.floor(oversDecimal);
    const ballsInPartialOver = Math.round((oversDecimal - completedOvers) * 10);
    const totalBalls = (completedOvers * 6) + ballsInPartialOver;
    if (totalBalls === 0) return null;
    const properOvers = totalBalls / 6;
    return parseFloat((parseInt(runs) / properOvers).toFixed(2));
};


const formatOversDisplay = (oversDecimal) => {
    if (oversDecimal == null || isNaN(oversDecimal) || oversDecimal < 0) return "0.0"; // Return 0.0 for invalid/negative
    const completedOvers = Math.floor(oversDecimal);
    const ballsInPartialOver = Math.round((oversDecimal - completedOvers) * 10);
    // Ensure it shows X.0 for completed overs if calculation resulted in integer
    if (ballsInPartialOver === 0 && oversDecimal === completedOvers) {
        return `${completedOvers}.0`;
    }
     // Cap balls at 5 for display, e.g. 4.6 should show as 5.0
     if (ballsInPartialOver >= 6) {
        return `${completedOvers + 1}.0`;
     }
    return `${completedOvers}.${ballsInPartialOver}`;
};

// Function to convert total balls into decimal overs format (e.g., 27 balls -> 4.3)
const ballsToOversDecimal = (balls) => {
    if (balls == null || isNaN(balls) || balls < 0) return 0.0;
    const overs = Math.floor(balls / 6);
    const remainingBalls = balls % 6;
    // Represent as decimal: 4 overs, 3 balls = 4 + (3/10) = 4.3
    return parseFloat(`${overs}.${remainingBalls}`);
};


module.exports = {
    calculateSR,
    calculateAvg,
    calculateEcon,
    formatOversDisplay,
    ballsToOversDecimal // Export the new helper
};
