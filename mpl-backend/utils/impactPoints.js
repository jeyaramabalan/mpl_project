/**
 * MPL impact points per ball (face runs only; super_over_runs does not affect impact).
 * Used by admin scoring and by scripts that recompute impact from ballbyball.
 */
const { DEFAULT_IMPACT_SETTINGS } = require('./impactSettings');

/**
 * @param {object} ballData - Same shape as live scoring: runs_scored (face off bat), is_extra, extra_type, extra_runs (face), is_wicket, wicket_type, is_bye
 * @returns {{ batsman: number, bowler: number, fielder: number }}
 */
function calculateImpactPoints(ballData, settings = DEFAULT_IMPACT_SETTINGS) {
    const points = { batsman: 0, bowler: 0, fielder: 0 };
    const { runs_scored = 0, is_extra = false, extra_type = null, extra_runs = 0, is_wicket = false, wicket_type = null, is_bye = false } = ballData;

    const runsOffBat = (!is_bye && !is_extra) ? runs_scored : ((!is_bye && is_extra && extra_type === 'NoBall') ? runs_scored : 0);
    const runsConcededByBowler = (!is_bye ? runsOffBat : 0) + (is_extra ? (extra_runs || 0) : 0);

    if (!is_extra && !is_bye) {
        if (runsOffBat === 0) {
            points.batsman = Number(settings.batting_dot_ball);
        } else if (runsOffBat === 1) {
            points.batsman = Number(settings.batting_one_run);
        } else if (runsOffBat === 2) {
            points.batsman = Number(settings.batting_two_runs);
        } else if (runsOffBat === 4) {
            points.batsman = Number(settings.batting_four_runs);
        }
    }

    if (!is_bye) {
        if (runsConcededByBowler === 0) {
            if (!is_extra) {
                points.bowler = Number(settings.bowling_legal_dot);
            } else {
                points.bowler = Number(settings.bowling_extra_dot);
            }
        } else if (runsConcededByBowler === 1) {
            if (!is_extra) {
                points.bowler = Number(settings.bowling_legal_one);
            } else {
                points.bowler = Number(settings.bowling_extra_one);
            }
        } else if (runsConcededByBowler === 2) {
            points.bowler = Number(settings.bowling_two_conceded);
        } else if (runsConcededByBowler === 4) {
            points.bowler = Number(settings.bowling_four_conceded);
        } else if (runsConcededByBowler > 0 && is_extra) {
            points.bowler = Number(settings.bowling_extra_other);
        }
    }

    if (is_wicket && !['Run Out'].includes(wicket_type)) {
        points.bowler += Number(settings.bowling_wicket_bonus);
    }

    if (is_wicket && (wicket_type === 'Caught' || wicket_type === 'Stumped')) {
        points.fielder = Number(settings.fielding_catch_stumping);
    }

    return points;
}

function truthyDb(v) {
    return v === true || v === 1 || v === '1';
}

/**
 * Build impact input from a ballbyball row (face values in runs_scored / extra_runs).
 */
function impactInputFromBallRow(b) {
    const isBye = truthyDb(b.is_bye);
    const isExtra = truthyDb(b.is_extra);
    const runs_scored = Number(b.runs_scored) || 0;
    const extra_runs = Number(b.extra_runs) || 0;
    return {
        runs_scored,
        is_extra: isExtra,
        extra_type: b.extra_type || null,
        extra_runs: isExtra ? extra_runs : 0,
        is_wicket: truthyDb(b.is_wicket),
        wicket_type: b.wicket_type || null,
        is_bye: isBye,
    };
}

module.exports = { calculateImpactPoints, impactInputFromBallRow };
