-- Legal balls faced (for retire-at-12 rule only). balls_faced still includes no-balls.
ALTER TABLE playermatchstats
  ADD COLUMN legal_balls_faced INT NOT NULL DEFAULT 0
  COMMENT 'Legal deliveries faced (excludes wide/no-ball); used for MPL retire rule';

-- Backfill from ball-by-ball (is_extra = 0 = legal)
UPDATE playermatchstats pms
INNER JOIN (
  SELECT match_id, batsman_on_strike_player_id AS player_id, COUNT(*) AS cnt
  FROM ballbyball
  WHERE COALESCE(is_extra, 0) = 0
  GROUP BY match_id, batsman_on_strike_player_id
) agg ON agg.match_id = pms.match_id AND agg.player_id = pms.player_id
SET pms.legal_balls_faced = agg.cnt;
