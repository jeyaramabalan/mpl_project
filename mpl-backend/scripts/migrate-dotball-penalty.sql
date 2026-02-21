-- Migration: Update existing batting impact points for dot ball penalty change
-- Old penalty: -0.5 per dot ball
-- New penalty: -0.25 per dot ball
-- Difference: +0.25 per dot ball (we add this to correct historical data)
--
-- Run this script against your mpl_db database to update existing playermatchstats.
-- Usage: mysql -u your_user -p mpl_db < migrate-dotball-penalty.sql

-- Add 0.25 for each dot ball the batsman faced (runs_scored=0, not extra, not bye)
UPDATE playermatchstats pms
INNER JOIN (
    SELECT match_id, batsman_on_strike_player_id AS player_id, COUNT(*) AS dot_count
    FROM ballbyball
    WHERE runs_scored = 0
      AND COALESCE(is_extra, 0) = 0
      AND COALESCE(is_bye, 0) = 0
    GROUP BY match_id, batsman_on_strike_player_id
) dots ON pms.match_id = dots.match_id AND pms.player_id = dots.player_id
SET pms.batting_impact_points = pms.batting_impact_points + (0.25 * dots.dot_count);
