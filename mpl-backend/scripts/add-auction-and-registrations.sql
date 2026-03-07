-- Auction and season registrations (payment tracking, auction pool, auction state)
-- Run once. If columns/tables exist, adjust or skip manually.

-- Season registrations: players registered for a season with payment status (Captain £12, Player £7)
CREATE TABLE IF NOT EXISTS season_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  season_id INT NOT NULL,
  player_id INT NOT NULL,
  payment_status ENUM('pending','paid') NOT NULL DEFAULT 'pending',
  amount_paid DECIMAL(10,2) NULL COMMENT 'Amount paid (12 for captain, 7 for player)',
  paid_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_season_player (season_id, player_id),
  FOREIGN KEY (season_id) REFERENCES seasons(season_id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Auction state: one row per season (current player index, current bid, leading team)
CREATE TABLE IF NOT EXISTS auction_state (
  season_id INT PRIMARY KEY,
  pool_order JSON NULL COMMENT 'Ordered array of player_id in auction pool',
  current_pool_index INT NOT NULL DEFAULT 0,
  current_bid INT NOT NULL DEFAULT 10,
  current_team_id INT NULL,
  status ENUM('draft','active','completed') NOT NULL DEFAULT 'draft',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (season_id) REFERENCES seasons(season_id) ON DELETE CASCADE,
  FOREIGN KEY (current_team_id) REFERENCES teams(team_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ensure teams.budget supports 300 (already decimal(10,2)).
-- For auction, set each team's budget to 300 in Admin > Teams (or when creating teams).
-- Run: mysql -u USER -p mpl_db < scripts/add-auction-and-registrations.sql
