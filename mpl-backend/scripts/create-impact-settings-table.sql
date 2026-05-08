CREATE TABLE IF NOT EXISTS impact_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    batting_dot_ball DECIMAL(8,2) NOT NULL DEFAULT -0.25,
    batting_one_run DECIMAL(8,2) NOT NULL DEFAULT 1.00,
    batting_two_runs DECIMAL(8,2) NOT NULL DEFAULT 3.00,
    batting_four_runs DECIMAL(8,2) NOT NULL DEFAULT 6.00,
    bowling_legal_dot DECIMAL(8,2) NOT NULL DEFAULT 1.00,
    bowling_extra_dot DECIMAL(8,2) NOT NULL DEFAULT -0.50,
    bowling_legal_one DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    bowling_extra_one DECIMAL(8,2) NOT NULL DEFAULT -1.00,
    bowling_two_conceded DECIMAL(8,2) NOT NULL DEFAULT -1.00,
    bowling_four_conceded DECIMAL(8,2) NOT NULL DEFAULT -2.00,
    bowling_extra_other DECIMAL(8,2) NOT NULL DEFAULT -1.00,
    bowling_wicket_bonus DECIMAL(8,2) NOT NULL DEFAULT 6.00,
    fielding_catch_stumping DECIMAL(8,2) NOT NULL DEFAULT 5.00,
    super_over_batting_multiplier DECIMAL(6,2) NOT NULL DEFAULT 1.50,
    super_over_bowling_multiplier DECIMAL(6,2) NOT NULL DEFAULT 1.50,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
