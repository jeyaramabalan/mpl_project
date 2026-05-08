-- Super Over "bonus" runs stored separately (like extras). Face-value runs stay in runs_scored / extra_runs.
-- Team total per ball: runs_scored + extra_runs + super_over_runs (unchanged vs old doubled columns).

ALTER TABLE ballbyball
  ADD COLUMN super_over_runs INT NOT NULL DEFAULT 0
  COMMENT 'MPL super-over bonus runs (doubles the effective team score; not credited to bowler/batter as conceded/runs)'
  AFTER extra_runs;

-- Optional: one-time backfill for existing rows (old logic doubled face into runs_scored/extra_runs).
-- Run: node mpl-backend/scripts/backfill-super-over-runs.js
-- Or leave 0 and only new balls use the split (historical innings totals would be wrong until backfill).
