-- Add optional "without food" to season registrations (£4 less: Captain £8, Player £3)
ALTER TABLE season_registrations
  ADD COLUMN without_food TINYINT(1) NOT NULL DEFAULT 0
  COMMENT '1 = no food, fee is £4 less (Captain £8, Player £3)';
