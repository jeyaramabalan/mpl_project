/**
 * Batting stats from ball-by-ball (face runs off bat only; excludes super_over_runs team bonus).
 * Mirrors backend scoreSingleBall / playermatchstats logic.
 */
export function aggregateBattingFromInningsBalls(playerId, inningsBalls) {
    const pid = Number(playerId);
    let runs = 0;
    let ballsFaced = 0;
    let fours = 0;
    let twos = 0;

    for (const b of inningsBalls) {
        if (Number(b.batsman_on_strike_player_id) !== pid) continue;
        const isBye = !!b.is_bye;
        const isExtra = !!b.is_extra;
        const et = b.extra_type;
        const rs = Number(b.runs_scored) || 0;
        const offBat = (!isBye && !isExtra)
            ? rs
            : (!isBye && isExtra && et === 'NoBall')
              ? rs
              : 0;
        runs += offBat;
        if (!isExtra || et === 'NoBall') ballsFaced += 1;
        if (offBat === 4 && !isBye && (!isExtra || et === 'NoBall')) fours += 1;
        if (offBat === 2 && !isBye && (!isExtra || et === 'NoBall')) twos += 1;
    }

    return { runs, ballsFaced, fours, twos };
}
