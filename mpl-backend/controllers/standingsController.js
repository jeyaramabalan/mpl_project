// mpl-backend/controllers/standingsController.js
const pool = require('../config/db');
// Assuming utils file exists and exports this function
const { ballsToOversDecimal } = require('../utils/statsCalculations');

/**
 * @desc    Get team standings for a specific season
 * @route   GET /api/standings?season_id=X
 * @access  Public
 */
exports.getStandings = async (req, res, next) => {
    const { season_id } = req.query;

    if (!season_id || isNaN(parseInt(season_id))) {
        return res.status(400).json({ message: 'Valid season_id query parameter is required.' });
    }

    const seasonIdNum = parseInt(season_id);
    const connection = await pool.getConnection();

    try {
        // 1. Get all teams for the season
        const [teams] = await connection.query('SELECT team_id, name FROM teams WHERE season_id = ?', [seasonIdNum]);
        if (teams.length === 0) {
            return res.json([]); // Return empty array if no teams in the season
        }

        // 2. Get all completed OR abandoned matches for the season
        const [matches] = await connection.query(
            'SELECT match_id, team1_id, team2_id, winner_team_id, decision, toss_winner_team_id, status FROM matches WHERE season_id = ? AND status IN (?, ?)',
            [seasonIdNum, 'Completed', 'Abandoned'] // Fetch both Completed and Abandoned
        );

        // 3. Initialize standings data structure
        const standingsMap = new Map();
        teams.forEach(team => {
            standingsMap.set(team.team_id, {
                team_id: team.team_id,
                name: team.name,
                played: 0,
                wins: 0,
                losses: 0,
                no_result: 0, // Added no_result
                points: 0,
                totalRunsScored: 0,
                totalBallsFaced: 0,
                totalRunsConceded: 0,
                totalBallsBowled: 0,
                nrr: 0,
            });
        });

        // 4. Process each completed or abandoned match
        for (const match of matches) {
            const team1Stats = standingsMap.get(match.team1_id);
            const team2Stats = standingsMap.get(match.team2_id);

            if (!team1Stats || !team2Stats) continue; // Skip if team data missing

            // Increment played count for both types
            team1Stats.played++;
            team2Stats.played++;

            // Handle based on status
            if (match.status === 'Completed') {
                // Assign Win/Loss/Tie points for Completed matches
                if (match.winner_team_id === match.team1_id) {
                    team1Stats.wins++;
                    team1Stats.points += 2;
                    team2Stats.losses++;
                } else if (match.winner_team_id === match.team2_id) {
                    team2Stats.wins++;
                    team2Stats.points += 2;
                    team1Stats.losses++;
                } else {
                    // Completed but no winner means Tie/No Result
                    team1Stats.no_result++; // Increment no_result
                    team2Stats.no_result++; // Increment no_result
                    team1Stats.points += 1; // 1 point for tie/no result
                    team2Stats.points += 1; // 1 point for tie/no result
                    console.log(`Match ${match.match_id}: Tie or Completed No Result. Awarding 1 point. NR count updated.`);
                }

                // NRR Calculation only for Completed matches
                // Fetch Ball-by-Ball data
                const [ballsData] = await connection.query(`
                    SELECT inning_number, runs_scored, extra_runs, is_extra, extra_type, is_bye
                    FROM ballbyball
                    WHERE match_id = ?
                    ORDER BY inning_number, ball_id
                `, [match.match_id]);

                let inn1Runs = 0; let inn1Balls = 0;
                let inn2Runs = 0; let inn2Balls = 0;

                ballsData.forEach(ball => {
                    const isLegalDelivery = !(ball.is_extra && ball.extra_type === 'Wide');
                    // Include extras in runs scored/conceded for NRR, but not byes/legbyes
                    const runsAdded = ball.is_bye ? 0 : (ball.runs_scored + (ball.extra_runs || 0));

                    if (ball.inning_number === 1) {
                        inn1Runs += runsAdded;
                        if (isLegalDelivery) inn1Balls++;
                    } else if (ball.inning_number === 2) {
                        inn2Runs += runsAdded;
                        if (isLegalDelivery) inn2Balls++;
                    }
                });

                 // Determine who batted first
                const team1BatFirst = (match.decision === 'Bat' && match.toss_winner_team_id === match.team1_id) ||
                                  (match.decision === 'Bowl' && match.toss_winner_team_id === match.team2_id);

                // Update team stats totals based on who batted when
                if (team1BatFirst) {
                    team1Stats.totalRunsScored += inn1Runs; team1Stats.totalBallsFaced += inn1Balls;
                    team1Stats.totalRunsConceded += inn2Runs; team1Stats.totalBallsBowled += inn2Balls;
                    team2Stats.totalRunsScored += inn2Runs; team2Stats.totalBallsFaced += inn2Balls;
                    team2Stats.totalRunsConceded += inn1Runs; team2Stats.totalBallsBowled += inn1Balls;
                } else {
                    team2Stats.totalRunsScored += inn1Runs; team2Stats.totalBallsFaced += inn1Balls;
                    team2Stats.totalRunsConceded += inn2Runs; team2Stats.totalBallsBowled += inn2Balls;
                    team1Stats.totalRunsScored += inn2Runs; team1Stats.totalBallsFaced += inn2Balls;
                    team1Stats.totalRunsConceded += inn1Runs; team1Stats.totalBallsBowled += inn1Balls;
                }

            } else if (match.status === 'Abandoned') {
                // Award points for Abandoned (typically 1 each) and count as No Result
                team1Stats.no_result++; // Increment no_result
                team2Stats.no_result++; // Increment no_result
                team1Stats.points += 1; // Award 1 point for abandonment
                team2Stats.points += 1; // Award 1 point for abandonment
                console.log(`Match ${match.match_id}: Abandoned. Awarding 1 point. NR count updated.`);
                // Do NOT calculate NRR for abandoned matches
            }
        }

        // 5. Calculate NRR and Finalize Standings Array
        const finalStandings = Array.from(standingsMap.values()).map(team => {
             const oversFaced = team.totalBallsFaced / 6;
             const oversBowled = team.totalBallsBowled / 6;
             // Ensure division by zero doesn't occur
             const runRateFor = oversFaced > 0 ? team.totalRunsScored / oversFaced : 0;
             const runRateAgainst = oversBowled > 0 ? team.totalRunsConceded / oversBowled : 0;
             team.nrr = (runRateFor - runRateAgainst);
             if (isNaN(team.nrr) || !isFinite(team.nrr)) {
                 team.nrr = 0; // Default NRR to 0 if calculation results in NaN/Infinity
             }
             team.nrrDisplay = (team.nrr >= 0 ? '+' : '') + team.nrr.toFixed(3);
             return team;
        });

        // 6. Sort Standings: Points DESC, NRR DESC
        finalStandings.sort((a, b) => {
            if (b.points !== a.points) {
                return b.points - a.points; // Higher points first
            }
            // If points are equal, sort by NRR (higher is better)
            return b.nrr - a.nrr;
        });

        // 7. Add Position
        finalStandings.forEach((team, index) => {
            team.position = index + 1;
        });

        res.json(finalStandings);

    } catch (error) {
        console.error("Get Standings Error:", error);
        next(error);
    } finally {
        if (connection) connection.release();
    }
};