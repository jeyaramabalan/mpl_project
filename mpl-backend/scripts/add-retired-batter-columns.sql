-- Migration: Add retired batter support (retire after 12 legal balls per MPL rules)
-- Run against mpl_db once. Adds retired flag and retirement_sequence for return order.
-- Usage: mysql -u your_user -p mpl_db < add-retired-batter-columns.sql
-- If columns already exist, you will get an error; that is safe to ignore.

ALTER TABLE playermatchstats ADD COLUMN retired TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE playermatchstats ADD COLUMN retirement_sequence INT NULL;
