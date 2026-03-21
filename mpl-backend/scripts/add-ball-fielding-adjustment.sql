-- Manual fielding impact linked to a specific ball (last completed ball when applied).
-- Run on production after backend deploy.

ALTER TABLE ballbyball
  MODIFY COLUMN commentary_text VARCHAR(1000) DEFAULT NULL COMMENT 'Ball commentary incl. fielding notes',
  ADD COLUMN fielding_adjustment_player_id INT NULL DEFAULT NULL COMMENT 'Bowling-team fielder for manual adjustment' AFTER fielder_player_id,
  ADD COLUMN fielding_adjustment_type VARCHAR(32) NULL DEFAULT NULL COMMENT 'good_catch, good_stop, misfield, catch_drop',
  ADD COLUMN fielding_adjustment_points DECIMAL(6,2) NULL DEFAULT NULL,
  ADD COLUMN fielding_adjustment_suffix VARCHAR(512) NULL DEFAULT NULL COMMENT 'Exact commentary fragment appended';
