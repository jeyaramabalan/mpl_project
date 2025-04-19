-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 19, 2025 at 11:56 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `mpl_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `admin_id` int(11) NOT NULL COMMENT 'Unique ID for admin users',
  `username` varchar(50) NOT NULL COMMENT 'Username for admin login',
  `password_hash` varchar(255) NOT NULL COMMENT 'Hashed password (NEVER store plain text)',
  `email` varchar(100) DEFAULT NULL COMMENT 'Admin email address (optional, unique if provided)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Timestamp when the admin record was created'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores login credentials for administrators';

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`admin_id`, `username`, `password_hash`, `email`, `created_at`) VALUES
(1, 'mpl_admin', '$2b$10$E/kZnM0tup0yL2QQYdIn.OqQlFP.FFk6872hcpDZ7JwqTMwSxtHEe', 'admin@mpl.local', '2025-04-13 22:16:53'),
(2, 'mpladmin', '$2a$12$dQgtx4ZuFQXPtuD11BrkPeI9IK.QrhhyZ1LxjzQHjhjpNgcKhuKAG', NULL, '2025-04-13 23:20:56');

-- --------------------------------------------------------

--
-- Table structure for table `ballbyball`
--

CREATE TABLE `ballbyball` (
  `ball_id` bigint(20) NOT NULL COMMENT 'Unique ID for each ball bowled',
  `match_id` int(11) NOT NULL COMMENT 'FK linking to the Matches table',
  `inning_number` tinyint(3) UNSIGNED NOT NULL COMMENT 'Which innings (1 or 2)',
  `over_number` tinyint(3) UNSIGNED NOT NULL COMMENT 'Over number within the innings (1-5)',
  `ball_number_in_over` tinyint(3) UNSIGNED NOT NULL COMMENT 'Ball number within the over (1-6+, handles extras)',
  `bowler_player_id` int(11) NOT NULL COMMENT 'FK to the player who bowled the ball',
  `batsman_on_strike_player_id` int(11) NOT NULL COMMENT 'FK to the batsman facing the ball',
  `runs_scored` tinyint(3) UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Runs scored off the bat on this delivery',
  `is_bye` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Were the runs scored byes (not off the bat)?',
  `is_extra` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Was this delivery an extra (Wide, NoBall)?',
  `extra_type` enum('Wide','NoBall') DEFAULT NULL COMMENT 'Type of extra (Byes/LegByes unlikely in box cricket)',
  `extra_runs` tinyint(3) UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Runs awarded specifically for the extra (e.g., 1 for wide)',
  `is_wicket` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Did a wicket fall on this delivery?',
  `wicket_type` enum('Bowled','Caught','Run Out','Stumped','Hit Wicket','Caught (Hit Six)') DEFAULT NULL COMMENT 'Type of dismissal',
  `fielder_player_id` int(11) DEFAULT NULL COMMENT 'FK to the fielder involved in Catch/RunOut/Stumping',
  `commentary_text` varchar(255) DEFAULT NULL COMMENT 'Auto-generated or brief manual commentary for the ball',
  `scored_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Timestamp when this ball was recorded'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores detailed event data for every ball bowled in a match';

--
-- Dumping data for table `ballbyball`
--

INSERT INTO `ballbyball` (`ball_id`, `match_id`, `inning_number`, `over_number`, `ball_number_in_over`, `bowler_player_id`, `batsman_on_strike_player_id`, `runs_scored`, `is_bye`, `is_extra`, `extra_type`, `extra_runs`, `is_wicket`, `wicket_type`, `fielder_player_id`, `commentary_text`, `scored_at`) VALUES
(1, 36, 1, 1, 1, 107, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.1: Ball. 0 runs.', '2025-04-18 20:43:38'),
(2, 36, 1, 1, 2, 107, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.2: Ball. 0 runs.', '2025-04-18 20:43:44'),
(3, 36, 1, 1, 3, 107, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.3: Ball. 0 runs.', '2025-04-18 20:43:45'),
(4, 36, 1, 1, 4, 107, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.4: Ball. 0 runs.', '2025-04-18 20:43:46'),
(5, 36, 1, 1, 5, 107, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.5: Ball. 0 runs.', '2025-04-18 20:43:48'),
(6, 36, 1, 1, 6, 107, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.6: Ball. 0 runs.', '2025-04-18 20:43:49'),
(7, 36, 1, 2, 1, 107, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '1.1: Ball. 0 runs.', '2025-04-18 20:43:49'),
(8, 36, 1, 2, 2, 107, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '1.2: Ball. 0 runs.', '2025-04-18 20:43:52'),
(9, 36, 1, 2, 3, 107, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '1.3: Ball. 0 runs.', '2025-04-18 20:43:52'),
(10, 36, 1, 2, 4, 107, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '1.4: Ball. 0 runs.', '2025-04-18 20:43:53'),
(11, 36, 1, 2, 5, 107, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '1.5: Ball. 0 runs.', '2025-04-18 20:43:53'),
(12, 36, 1, 2, 6, 107, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '1.6: Ball. 0 runs.', '2025-04-18 20:43:56'),
(13, 36, 1, 3, 1, 107, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '2.1: Ball. 0 runs.', '2025-04-18 20:43:56'),
(14, 36, 1, 3, 2, 107, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '2.2: Ball. 0 runs.', '2025-04-18 20:43:56'),
(15, 36, 1, 3, 3, 107, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '2.3: Ball. 0 runs.', '2025-04-18 20:43:57'),
(16, 36, 1, 3, 4, 107, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '2.4: Ball. 0 runs.', '2025-04-18 20:44:09'),
(17, 36, 1, 3, 5, 107, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '2.5: Ball. 0 runs.', '2025-04-18 20:44:10'),
(18, 36, 1, 3, 6, 107, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '2.6: Ball. 0 runs.', '2025-04-18 20:44:11'),
(19, 37, 1, 1, 1, 122, 101, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.1: Ball. 0 runs.', '2025-04-18 20:46:25'),
(20, 37, 1, 1, 2, 122, 101, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.2: Ball. 0 runs.', '2025-04-18 20:46:26'),
(21, 37, 1, 1, 3, 105, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.3: Ball. 0 runs.', '2025-04-18 20:52:09'),
(22, 37, 1, 1, 4, 105, 106, 1, 0, 0, NULL, 0, 0, NULL, NULL, '0.4: Ball. 1 run.', '2025-04-18 20:52:13'),
(23, 37, 1, 1, 5, 105, 106, 2, 0, 0, NULL, 0, 0, NULL, NULL, '0.5: Ball. 2 runs.', '2025-04-18 20:52:14'),
(24, 37, 1, 1, 6, 105, 106, 3, 0, 0, NULL, 0, 0, NULL, NULL, '0.6: Ball. 3 runs.', '2025-04-18 20:52:16'),
(25, 37, 1, 2, 1, 105, 106, 4, 0, 0, NULL, 0, 0, NULL, NULL, '1.1: Ball. 8 runs (SO!).', '2025-04-18 20:52:18'),
(26, 37, 1, 2, 2, 105, 106, 0, 0, 1, 'Wide', 1, 0, NULL, NULL, '1.1: Ball. Wide! +1.', '2025-04-18 20:52:20'),
(27, 37, 1, 2, 3, 105, 106, 0, 0, 1, 'NoBall', 1, 0, NULL, NULL, '1.2: Ball. NoBall! +1.', '2025-04-18 20:52:23'),
(28, 37, 1, 2, 4, 105, 106, 0, 0, 0, NULL, 0, 1, 'Bowled', NULL, '1.3: Ball. 0 runs. WICKET! (Bowled).', '2025-04-18 20:52:32'),
(29, 37, 1, 2, 5, 105, 101, 1, 0, 0, NULL, 0, 0, NULL, NULL, '1.4: Ball. 2 runs (SO!).', '2025-04-18 20:53:36'),
(30, 37, 1, 2, 6, 105, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '1.5: Ball. 4 runs (SO!).', '2025-04-18 20:53:37'),
(31, 37, 1, 2, 7, 105, 101, 3, 0, 0, NULL, 0, 0, NULL, NULL, '1.6: Ball. 6 runs (SO!).', '2025-04-18 20:53:38'),
(32, 37, 1, 3, 1, 105, 101, 4, 0, 0, NULL, 0, 0, NULL, NULL, '2.1: Ball. 4 runs.', '2025-04-18 20:53:38'),
(33, 37, 1, 3, 2, 105, 101, 0, 0, 0, NULL, 0, 0, NULL, NULL, '2.2: Ball. 0 runs.', '2025-04-18 20:53:39'),
(34, 37, 1, 3, 3, 105, 101, 1, 0, 0, NULL, 0, 0, NULL, NULL, '2.3: Ball. 1 run.', '2025-04-18 20:53:40'),
(35, 37, 1, 3, 4, 122, 101, 0, 0, 0, NULL, 0, 0, NULL, NULL, '2.4: Ball. 0 runs.', '2025-04-18 20:54:03'),
(36, 37, 1, 3, 5, 122, 101, 1, 0, 0, NULL, 0, 0, NULL, NULL, '2.5: Ball. 1 run.', '2025-04-18 20:54:04'),
(37, 37, 1, 3, 6, 122, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '2.6: Ball. 2 runs.', '2025-04-18 20:54:05'),
(38, 37, 1, 4, 1, 122, 101, 3, 0, 0, NULL, 0, 0, NULL, NULL, '3.1: Ball. 3 runs.', '2025-04-18 20:54:05'),
(39, 37, 1, 4, 2, 122, 101, 4, 0, 0, NULL, 0, 0, NULL, NULL, '3.2: Ball. 4 runs.', '2025-04-18 20:54:06'),
(40, 37, 1, 4, 3, 122, 101, 0, 0, 0, NULL, 0, 0, NULL, NULL, '3.3: Ball. 0 runs.', '2025-04-18 20:54:09'),
(41, 37, 1, 4, 4, 122, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '3.4: Ball. 2 runs.', '2025-04-18 20:54:40'),
(42, 37, 1, 4, 5, 122, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '3.5: Ball. 2 runs.', '2025-04-18 20:54:41'),
(43, 37, 1, 4, 6, 122, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '3.6: Ball. 2 runs.', '2025-04-18 20:54:41'),
(44, 38, 1, 1, 1, 103, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.1: Ball. 0 runs.', '2025-04-18 21:29:51'),
(45, 38, 1, 1, 2, 103, 106, 1, 0, 0, NULL, 0, 0, NULL, NULL, '0.2: Ball. 1 run.', '2025-04-18 21:29:54'),
(46, 38, 1, 1, 3, 103, 106, 2, 0, 0, NULL, 0, 0, NULL, NULL, '0.3: Ball. 2 runs.', '2025-04-18 21:29:55'),
(47, 38, 1, 1, 4, 103, 106, 3, 0, 0, NULL, 0, 0, NULL, NULL, '0.4: Ball. 3 runs.', '2025-04-18 21:29:56'),
(48, 38, 1, 1, 5, 103, 106, 4, 0, 0, NULL, 0, 0, NULL, NULL, '0.5: Ball. 4 runs.', '2025-04-18 21:29:56'),
(49, 38, 1, 1, 6, 103, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.6: Ball. 0 runs.', '2025-04-18 21:29:57'),
(50, 38, 1, 2, 1, 103, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '1.1: Ball. 0 runs.', '2025-04-18 21:30:46'),
(51, 38, 1, 2, 2, 103, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '1.2: Ball. 0 runs.', '2025-04-18 21:30:48'),
(52, 38, 1, 2, 3, 103, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '1.3: Ball. 0 runs.', '2025-04-18 21:31:32'),
(53, 38, 1, 2, 4, 103, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '1.4: Ball. 0 runs.', '2025-04-18 21:31:37'),
(54, 38, 1, 2, 5, 103, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '1.5: Ball. 0 runs.', '2025-04-18 21:31:38'),
(55, 38, 1, 2, 6, 116, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '1.6: Ball. 0 runs.', '2025-04-18 21:31:57'),
(56, 38, 1, 3, 1, 116, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '2.1: Ball. 0 runs.', '2025-04-18 21:31:58'),
(57, 38, 1, 3, 2, 116, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '2.2: Ball. 0 runs.', '2025-04-18 21:31:58'),
(58, 38, 1, 3, 3, 116, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '2.3: Ball. 0 runs.', '2025-04-18 21:31:59'),
(59, 38, 1, 3, 4, 116, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '2.4: Ball. 0 runs.', '2025-04-18 21:31:59'),
(60, 38, 1, 3, 5, 116, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '2.5: Ball. 0 runs.', '2025-04-18 21:31:59'),
(61, 38, 1, 3, 6, 116, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '2.6: Ball. 0 runs.', '2025-04-18 21:31:59'),
(62, 38, 1, 4, 1, 116, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '3.1: Ball. 0 runs.', '2025-04-18 21:32:00'),
(63, 38, 1, 4, 2, 116, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '3.2: Ball. 0 runs.', '2025-04-18 21:32:00'),
(64, 38, 1, 4, 3, 116, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '3.3: Ball. 0 runs.', '2025-04-18 21:32:00'),
(65, 38, 1, 4, 4, 116, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '3.4: Ball. 0 runs.', '2025-04-18 21:32:00'),
(66, 38, 1, 4, 5, 116, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '3.5: Ball. 0 runs.', '2025-04-18 21:32:00'),
(67, 38, 1, 4, 6, 116, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '3.6: Ball. 0 runs.', '2025-04-18 21:32:01'),
(68, 38, 1, 5, 1, 116, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '4.1: Ball. 0 runs.', '2025-04-18 21:32:01'),
(69, 38, 1, 5, 2, 116, 106, 0, 0, 0, NULL, 0, 0, NULL, NULL, '4.2: Ball. 0 runs.', '2025-04-18 21:32:01'),
(70, 38, 1, 5, 3, 103, 106, 0, 0, 0, NULL, 0, 1, 'Caught', 108, '4.3: Ball. 0 runs. WICKET! (Caught). Fielder: 108.', '2025-04-18 21:40:27'),
(71, 38, 1, 5, 4, 103, 117, 0, 0, 0, NULL, 0, 1, '', NULL, '4.4: Ball. 0 runs. WICKET! (Hit Outside).', '2025-04-18 22:12:02'),
(72, 38, 1, 5, 5, 103, 124, 0, 0, 0, NULL, 0, 0, NULL, NULL, '4.5: Ball. 0 runs.', '2025-04-18 22:12:21'),
(73, 38, 1, 5, 6, 103, 124, 1, 0, 0, NULL, 0, 0, NULL, NULL, '4.6: Ball. 1 run.  End of Inning 1. Target: 111.', '2025-04-18 22:12:24'),
(74, 39, 1, 1, 1, 121, 118, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.1: Ball. 0 runs.', '2025-04-18 22:13:33'),
(75, 39, 1, 1, 2, 121, 118, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.2: Ball. 0 runs.', '2025-04-18 22:13:35'),
(76, 39, 1, 1, 3, 121, 118, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.3: Ball. 0 runs.', '2025-04-18 22:13:36'),
(77, 39, 1, 1, 4, 121, 118, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.4: Ball. 0 runs.', '2025-04-18 22:13:37'),
(78, 39, 1, 1, 5, 121, 118, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.5: Ball. 0 runs.', '2025-04-18 22:13:37'),
(79, 39, 1, 1, 6, 121, 118, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.6: Ball. 0 runs.', '2025-04-18 22:13:38'),
(80, 39, 1, 2, 1, 107, 118, 1, 0, 0, NULL, 0, 0, NULL, NULL, '1.1: Ball. 2 runs (SO!).', '2025-04-18 22:13:43'),
(81, 39, 1, 2, 2, 107, 118, 1, 0, 0, NULL, 0, 0, NULL, NULL, '1.2: Ball. 2 runs (SO!).', '2025-04-18 22:13:43'),
(82, 39, 1, 2, 3, 107, 118, 1, 0, 0, NULL, 0, 0, NULL, NULL, '1.3: Ball. 2 runs (SO!).', '2025-04-18 22:13:43'),
(83, 39, 1, 2, 4, 107, 118, 1, 0, 0, NULL, 0, 0, NULL, NULL, '1.4: Ball. 2 runs (SO!).', '2025-04-18 22:13:44'),
(84, 39, 1, 2, 5, 107, 118, 1, 0, 0, NULL, 0, 0, NULL, NULL, '1.5: Ball. 2 runs (SO!).', '2025-04-18 22:13:44'),
(85, 39, 1, 2, 6, 107, 118, 1, 0, 0, NULL, 0, 0, NULL, NULL, '1.6: Ball. 2 runs (SO!).', '2025-04-18 22:13:45'),
(86, 39, 1, 3, 1, 121, 118, 0, 0, 0, NULL, 0, 0, NULL, NULL, '2.1: Ball. 0 runs.', '2025-04-18 22:13:51'),
(87, 39, 1, 3, 2, 121, 118, 0, 0, 0, NULL, 0, 0, NULL, NULL, '2.2: Ball. 0 runs.', '2025-04-18 22:13:53'),
(88, 39, 1, 3, 3, 121, 118, 0, 0, 0, NULL, 0, 0, NULL, NULL, '2.3: Ball. 0 runs.', '2025-04-18 22:13:54'),
(89, 39, 1, 3, 4, 121, 118, 0, 0, 0, NULL, 0, 0, NULL, NULL, '2.4: Ball. 0 runs.', '2025-04-18 22:13:56'),
(90, 39, 1, 3, 5, 121, 118, 2, 0, 0, NULL, 0, 0, NULL, NULL, '2.5: Ball. 2 runs.', '2025-04-18 22:13:57'),
(91, 39, 1, 3, 6, 121, 118, 3, 0, 0, NULL, 0, 0, NULL, NULL, '2.6: Ball. 3 runs.', '2025-04-18 22:13:58'),
(92, 39, 1, 4, 1, 123, 118, 0, 0, 0, NULL, 0, 0, NULL, NULL, '3.1: Ball. 0 runs.', '2025-04-18 22:14:03'),
(93, 39, 1, 4, 2, 123, 118, 1, 0, 0, NULL, 0, 0, NULL, NULL, '3.2: Ball. 1 run.', '2025-04-18 22:14:04'),
(94, 39, 1, 4, 3, 123, 118, 2, 0, 0, NULL, 0, 0, NULL, NULL, '3.3: Ball. 2 runs.', '2025-04-18 22:14:04'),
(95, 39, 1, 4, 4, 123, 118, 3, 0, 0, NULL, 0, 0, NULL, NULL, '3.4: Ball. 3 runs.', '2025-04-18 22:14:05'),
(96, 39, 1, 4, 5, 123, 118, 4, 0, 0, NULL, 0, 0, NULL, NULL, '3.5: Ball. 4 runs.', '2025-04-18 22:14:05'),
(97, 39, 1, 4, 6, 123, 118, 0, 0, 0, NULL, 0, 0, NULL, NULL, '3.6: Ball. 0 runs.', '2025-04-18 22:14:06'),
(98, 39, 1, 5, 1, 113, 118, 0, 0, 0, NULL, 0, 0, NULL, NULL, '4.1: Ball. 0 runs.', '2025-04-18 22:14:09'),
(99, 39, 1, 5, 2, 113, 118, 1, 0, 0, NULL, 0, 0, NULL, NULL, '4.2: Ball. 1 run.', '2025-04-18 22:14:10'),
(100, 39, 1, 5, 3, 113, 118, 2, 0, 0, NULL, 0, 0, NULL, NULL, '4.3: Ball. 2 runs.', '2025-04-18 22:14:10'),
(101, 39, 1, 5, 4, 113, 118, 3, 0, 0, NULL, 0, 0, NULL, NULL, '4.4: Ball. 3 runs.', '2025-04-18 22:14:12'),
(102, 39, 1, 5, 5, 113, 118, 4, 0, 0, NULL, 0, 0, NULL, NULL, '4.5: Ball. 4 runs.', '2025-04-18 22:14:13'),
(103, 39, 1, 5, 6, 113, 118, 0, 0, 0, NULL, 0, 1, '', NULL, '4.6: Ball. 0 runs. WICKET! (Hit Outside).  End of Inning 1. Target: 311.', '2025-04-18 22:14:18'),
(104, 40, 1, 1, 1, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '0.1: Ball. 2 runs.', '2025-04-18 22:44:27'),
(105, 40, 1, 1, 2, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '0.2: Ball. 2 runs.', '2025-04-18 22:44:30'),
(106, 40, 1, 1, 3, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '0.3: Ball. 2 runs.', '2025-04-18 22:44:30'),
(107, 40, 1, 1, 4, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '0.4: Ball. 2 runs.', '2025-04-18 22:44:31'),
(108, 40, 1, 1, 5, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '0.5: Ball. 2 runs.', '2025-04-18 22:44:31'),
(109, 40, 1, 1, 6, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '0.6: Ball. 2 runs.', '2025-04-18 22:44:32'),
(110, 40, 1, 2, 1, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '1.1: Ball. 2 runs.', '2025-04-18 22:44:32'),
(111, 40, 1, 2, 2, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '1.2: Ball. 2 runs.', '2025-04-18 22:44:32'),
(112, 40, 1, 2, 3, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '1.3: Ball. 2 runs.', '2025-04-18 22:44:33'),
(113, 40, 1, 2, 4, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '1.4: Ball. 2 runs.', '2025-04-18 22:44:33'),
(114, 40, 1, 2, 5, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '1.5: Ball. 2 runs.', '2025-04-18 22:44:33'),
(115, 40, 1, 2, 6, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '1.6: Ball. 2 runs.', '2025-04-18 22:44:33'),
(116, 40, 1, 3, 1, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '2.1: Ball. 4 runs (SO!).', '2025-04-18 22:44:34'),
(117, 40, 1, 3, 2, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '2.2: Ball. 4 runs (SO!).', '2025-04-18 22:44:34'),
(118, 40, 1, 3, 3, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '2.3: Ball. 4 runs (SO!).', '2025-04-18 22:44:34'),
(119, 40, 1, 3, 4, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '2.4: Ball. 4 runs (SO!).', '2025-04-18 22:44:34'),
(120, 40, 1, 3, 5, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '2.5: Ball. 4 runs (SO!).', '2025-04-18 22:44:35'),
(121, 40, 1, 3, 6, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '2.6: Ball. 4 runs (SO!).', '2025-04-18 22:44:35'),
(122, 40, 1, 4, 1, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '3.1: Ball. 2 runs.', '2025-04-18 22:44:35'),
(123, 40, 1, 4, 2, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '3.2: Ball. 2 runs.', '2025-04-18 22:44:35'),
(124, 40, 1, 4, 3, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '3.3: Ball. 2 runs.', '2025-04-18 22:44:35'),
(125, 40, 1, 4, 4, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '3.4: Ball. 2 runs.', '2025-04-18 22:44:36'),
(126, 40, 1, 4, 5, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '3.5: Ball. 2 runs.', '2025-04-18 22:44:36'),
(127, 40, 1, 4, 6, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '3.6: Ball. 2 runs.', '2025-04-18 22:44:36'),
(128, 40, 1, 5, 1, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '4.1: Ball. 2 runs.', '2025-04-18 22:44:36'),
(129, 40, 1, 5, 2, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '4.2: Ball. 2 runs.', '2025-04-18 22:44:37'),
(130, 40, 1, 5, 3, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '4.3: Ball. 2 runs.', '2025-04-18 22:44:37'),
(131, 40, 1, 5, 4, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '4.4: Ball. 2 runs.', '2025-04-18 22:44:37'),
(132, 40, 1, 5, 5, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '4.5: Ball. 2 runs.', '2025-04-18 22:44:37'),
(133, 40, 1, 5, 6, 112, 101, 2, 0, 0, NULL, 0, 0, NULL, NULL, '4.6: Ball. 2 runs.  End of Inning 1. Target: 601.', '2025-04-18 22:44:38'),
(134, 43, 1, 1, 1, 114, 116, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.1: Ball.', '2025-04-19 12:16:05'),
(135, 43, 1, 1, 2, 114, 116, 1, 0, 0, NULL, 0, 0, NULL, NULL, '0.2: Ball. 1 run.', '2025-04-19 12:16:09'),
(136, 43, 1, 1, 3, 114, 116, 2, 0, 0, NULL, 0, 0, NULL, NULL, '0.3: Ball. 2 runs.', '2025-04-19 12:16:11'),
(137, 43, 1, 1, 4, 114, 116, 4, 0, 0, NULL, 0, 0, NULL, NULL, '0.4: Ball. 4 runs.', '2025-04-19 12:16:12'),
(138, 43, 1, 1, 5, 114, 116, 1, 1, 0, NULL, 0, 0, NULL, NULL, '0.5: Ball. 1 bye.', '2025-04-19 12:16:12'),
(139, 43, 1, 1, 6, 114, 116, 0, 0, 1, 'Wide', 1, 0, NULL, NULL, '0.5: Ball. Wide! +1.', '2025-04-19 12:16:14'),
(140, 43, 1, 1, 7, 114, 116, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.6: Ball.', '2025-04-19 12:16:15'),
(141, 43, 1, 2, 1, 114, 116, 1, 1, 1, 'Wide', 1, 0, NULL, NULL, '1.0: Ball. Wide! +1. 1 bye.', '2025-04-19 12:16:16'),
(142, 43, 1, 2, 2, 114, 116, 0, 0, 0, NULL, 0, 0, NULL, NULL, '1.1: Ball.', '2025-04-19 12:16:17'),
(143, 43, 1, 2, 3, 114, 116, 0, 0, 0, NULL, 0, 0, NULL, NULL, '1.2: Ball.', '2025-04-19 13:01:22'),
(144, 43, 1, 2, 4, 114, 116, 1, 0, 0, NULL, 0, 0, NULL, NULL, '1.3: Ball. 1 run (SO!).', '2025-04-19 13:01:23'),
(145, 43, 1, 2, 5, 114, 116, 2, 0, 0, NULL, 0, 0, NULL, NULL, '1.4: Ball. 2 runs (SO!).', '2025-04-19 13:01:24'),
(146, 43, 1, 2, 6, 114, 116, 4, 0, 0, NULL, 0, 0, NULL, NULL, '1.5: Ball. 4 runs (SO!).', '2025-04-19 13:01:24'),
(147, 43, 1, 2, 7, 114, 116, 1, 1, 0, NULL, 0, 0, NULL, NULL, '1.6: Ball. 1 bye.', '2025-04-19 13:01:25'),
(148, 43, 1, 3, 1, 114, 116, 0, 0, 1, 'Wide', 1, 0, NULL, NULL, '2.0: Ball. Wide! +1.', '2025-04-19 13:01:26'),
(149, 43, 1, 3, 2, 114, 116, 1, 1, 1, 'Wide', 1, 0, NULL, NULL, '2.0: Ball. Wide! +1. 1 bye.', '2025-04-19 13:01:26'),
(150, 43, 1, 3, 3, 114, 116, 0, 0, 0, NULL, 0, 0, NULL, NULL, '2.1: Ball.', '2025-04-19 13:01:27'),
(151, 43, 1, 3, 4, 122, 116, 0, 0, 0, NULL, 0, 0, NULL, NULL, '2.2: Ball.', '2025-04-19 13:02:52'),
(152, 43, 1, 3, 5, 122, 116, 1, 0, 0, NULL, 0, 0, NULL, NULL, '2.3: Ball. 1 run.', '2025-04-19 13:02:53'),
(153, 43, 1, 3, 6, 122, 116, 2, 0, 0, NULL, 0, 0, NULL, NULL, '2.4: Ball. 2 runs.', '2025-04-19 13:02:54'),
(154, 43, 1, 3, 7, 122, 116, 4, 0, 0, NULL, 0, 0, NULL, NULL, '2.5: Ball. 4 runs.', '2025-04-19 13:02:54'),
(155, 43, 1, 3, 8, 122, 116, 1, 1, 0, NULL, 0, 0, NULL, NULL, '2.6: Ball. 1 bye.', '2025-04-19 13:02:55'),
(156, 43, 1, 4, 1, 122, 116, 0, 0, 0, NULL, 0, 0, NULL, NULL, '3.1: Ball.', '2025-04-19 13:02:57'),
(157, 42, 1, 1, 1, 112, 117, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.1: Ball.', '2025-04-19 13:30:10'),
(158, 42, 1, 1, 2, 112, 117, 1, 0, 0, NULL, 0, 0, NULL, NULL, '0.2: Ball. 1 run.', '2025-04-19 13:30:11'),
(159, 42, 1, 1, 3, 112, 117, 2, 0, 0, NULL, 0, 0, NULL, NULL, '0.3: Ball. 2 runs.', '2025-04-19 13:30:12'),
(160, 42, 1, 1, 4, 112, 117, 4, 0, 0, NULL, 0, 0, NULL, NULL, '0.4: Ball. 4 runs.', '2025-04-19 13:30:12'),
(161, 42, 1, 1, 5, 112, 117, 1, 1, 0, NULL, 0, 0, NULL, NULL, '0.5: Ball. 1 bye.', '2025-04-19 13:30:13'),
(162, 42, 1, 1, 6, 112, 117, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.6: Ball.', '2025-04-19 13:30:14'),
(163, 43, 1, 4, 2, 102, 119, 4, 0, 0, NULL, 0, 0, NULL, NULL, '3.2: Ball. 4 runs.', '2025-04-19 14:07:56'),
(164, 43, 1, 4, 3, 102, 119, 4, 0, 0, NULL, 0, 0, NULL, NULL, '3.3: Ball. 4 runs.', '2025-04-19 14:08:04'),
(165, 43, 1, 4, 4, 102, 119, 0, 0, 0, NULL, 0, 0, NULL, NULL, '3.4: Ball.', '2025-04-19 14:08:38'),
(166, 43, 1, 4, 5, 102, 119, 1, 0, 0, NULL, 0, 0, NULL, NULL, '3.5: Ball. 1 run.', '2025-04-19 14:08:40'),
(167, 43, 1, 4, 6, 122, 116, 0, 0, 0, NULL, 0, 0, NULL, NULL, '3.6: Ball.', '2025-04-19 14:08:53'),
(168, 43, 1, 5, 1, 122, 116, 1, 0, 0, NULL, 0, 0, NULL, NULL, '4.1: Ball. 1 run.', '2025-04-19 14:08:54'),
(169, 43, 1, 5, 2, 122, 116, 2, 0, 0, NULL, 0, 0, NULL, NULL, '4.2: Ball. 2 runs.', '2025-04-19 14:08:54'),
(170, 43, 1, 5, 3, 122, 116, 4, 0, 0, NULL, 0, 0, NULL, NULL, '4.3: Ball. 4 runs.', '2025-04-19 14:08:55'),
(171, 43, 1, 5, 4, 122, 116, 1, 1, 0, NULL, 0, 0, NULL, NULL, '4.4: Ball. 1 bye.', '2025-04-19 14:08:55'),
(172, 43, 1, 5, 5, 122, 116, 0, 0, 0, NULL, 0, 0, NULL, NULL, '4.5: Ball.', '2025-04-19 14:08:56'),
(173, 43, 1, 5, 6, 122, 116, 0, 0, 0, NULL, 0, 1, '', NULL, '4.6: Ball. WICKET! (Hit Outside). INNINGS END (Overs Completed (5.0)).', '2025-04-19 14:09:07'),
(174, 47, 1, 1, 1, 121, 120, 0, 0, 0, NULL, 0, 0, NULL, NULL, '0.1: Ball.', '2025-04-19 21:36:02'),
(175, 47, 1, 1, 2, 121, 120, 1, 0, 0, NULL, 0, 0, NULL, NULL, '0.2: Ball. 1 run (SO!).', '2025-04-19 21:36:06'),
(176, 47, 1, 1, 3, 121, 120, 2, 0, 0, NULL, 0, 0, NULL, NULL, '0.3: Ball. 2 runs (SO!).', '2025-04-19 21:36:07'),
(177, 47, 1, 1, 4, 121, 120, 4, 0, 0, NULL, 0, 0, NULL, NULL, '0.4: Ball. 4 runs (SO!).', '2025-04-19 21:36:08'),
(178, 47, 1, 1, 5, 121, 120, 1, 1, 0, NULL, 0, 0, NULL, NULL, '0.5: Ball. 1 bye.', '2025-04-19 21:36:08'),
(179, 47, 1, 1, 6, 121, 120, 0, 0, 1, 'Wide', 1, 0, NULL, NULL, '0.5: Ball. Wide! +1.', '2025-04-19 21:36:09'),
(180, 47, 1, 1, 7, 121, 120, 1, 1, 1, 'Wide', 1, 0, NULL, NULL, '0.5: Ball. Wide! +1. 1 bye.', '2025-04-19 21:36:10'),
(181, 47, 1, 1, 8, 121, 120, 0, 0, 1, 'NoBall', 1, 0, NULL, NULL, '0.6: Ball. NoBall! +1.', '2025-04-19 21:36:10'),
(182, 47, 1, 2, 1, 121, 120, 1, 1, 1, 'NoBall', 1, 0, NULL, NULL, '1.1: Ball. NoBall! +1. 1 bye. (+1 bye).', '2025-04-19 21:36:11'),
(183, 47, 1, 2, 2, 121, 120, 1, 0, 1, 'NoBall', 1, 0, NULL, NULL, '1.2: Ball. NoBall! +1. (+1 off bat).', '2025-04-19 21:36:11'),
(184, 47, 1, 2, 3, 121, 120, 2, 0, 1, 'NoBall', 1, 0, NULL, NULL, '1.3: Ball. NoBall! +1. (+2 off bat).', '2025-04-19 21:36:12'),
(185, 47, 1, 2, 4, 121, 120, 0, 0, 0, NULL, 0, 0, NULL, NULL, '1.4: Ball.', '2025-04-19 21:36:13'),
(186, 47, 1, 2, 5, 107, 108, 0, 0, 0, NULL, 0, 0, NULL, NULL, '1.5: Ball.', '2025-04-19 21:38:11'),
(187, 47, 1, 2, 6, 107, 108, 1, 0, 0, NULL, 0, 0, NULL, NULL, '1.6: Ball. 1 run.', '2025-04-19 21:38:13'),
(188, 47, 1, 3, 1, 107, 108, 2, 0, 0, NULL, 0, 0, NULL, NULL, '2.1: Ball. 2 runs.', '2025-04-19 21:38:16'),
(189, 47, 1, 3, 2, 107, 103, 0, 0, 0, NULL, 0, 0, NULL, NULL, '2.2: Ball.', '2025-04-19 21:38:44'),
(190, 47, 1, 3, 3, 107, 103, 1, 0, 0, NULL, 0, 0, NULL, NULL, '2.3: Ball. 1 run.', '2025-04-19 21:38:46'),
(191, 47, 1, 3, 4, 107, 103, 2, 0, 0, NULL, 0, 0, NULL, NULL, '2.4: Ball. 2 runs.', '2025-04-19 21:38:48'),
(192, 47, 1, 3, 5, 107, 103, 4, 0, 0, NULL, 0, 0, NULL, NULL, '2.5: Ball. 4 runs.', '2025-04-19 21:38:52'),
(193, 47, 1, 3, 6, 107, 103, 2, 0, 0, NULL, 0, 0, NULL, NULL, '2.6: Ball. 2 runs.', '2025-04-19 21:39:12'),
(194, 47, 1, 4, 1, 109, 108, 0, 0, 0, NULL, 0, 0, NULL, NULL, '3.1: Ball.', '2025-04-19 21:45:51'),
(195, 47, 1, 4, 2, 109, 108, 1, 0, 0, NULL, 0, 0, NULL, NULL, '3.2: Ball. 1 run.', '2025-04-19 21:45:52'),
(196, 47, 1, 4, 3, 109, 108, 2, 0, 0, NULL, 0, 0, NULL, NULL, '3.3: Ball. 2 runs.', '2025-04-19 21:45:53'),
(197, 47, 1, 4, 4, 109, 108, 4, 0, 0, NULL, 0, 0, NULL, NULL, '3.4: Ball. 4 runs.', '2025-04-19 21:45:54'),
(198, 47, 1, 4, 5, 109, 108, 1, 1, 0, NULL, 0, 0, NULL, NULL, '3.5: Ball. 1 bye.', '2025-04-19 21:45:55'),
(199, 47, 1, 4, 6, 109, 108, 0, 0, 0, NULL, 0, 0, NULL, NULL, '3.6: Ball.', '2025-04-19 21:45:56'),
(200, 47, 1, 5, 1, 107, 120, 2, 0, 0, NULL, 0, 0, NULL, NULL, '4.1: Ball. 2 runs.', '2025-04-19 21:46:13'),
(201, 47, 1, 5, 2, 107, 120, 4, 0, 0, NULL, 0, 0, NULL, NULL, '4.2: Ball. 4 runs.', '2025-04-19 21:46:14'),
(202, 47, 1, 5, 3, 107, 120, 2, 0, 0, NULL, 0, 0, NULL, NULL, '4.3: Ball. 2 runs.', '2025-04-19 21:46:15'),
(203, 47, 1, 5, 4, 107, 120, 4, 0, 0, NULL, 0, 0, NULL, NULL, '4.4: Ball. 4 runs.', '2025-04-19 21:46:15'),
(204, 47, 1, 5, 5, 123, 108, 0, 0, 0, NULL, 0, 0, NULL, NULL, '4.5: Ball.', '2025-04-19 21:46:54'),
(205, 47, 1, 5, 6, 123, 108, 0, 0, 0, NULL, 0, 0, NULL, NULL, '4.6: Ball. INNINGS END (Overs Completed (5.0)).', '2025-04-19 21:46:55');

-- --------------------------------------------------------

--
-- Table structure for table `matches`
--

CREATE TABLE `matches` (
  `match_id` int(11) NOT NULL COMMENT 'Unique ID for each match',
  `season_id` int(11) NOT NULL COMMENT 'Foreign key linking to the Seasons table',
  `team1_id` int(11) NOT NULL COMMENT 'Foreign key linking to the first team (Teams table)',
  `team2_id` int(11) NOT NULL COMMENT 'Foreign key linking to the second team (Teams table)',
  `match_datetime` datetime NOT NULL COMMENT 'Scheduled date and time of the match',
  `venue` varchar(100) DEFAULT 'Metalworks Box Arena' COMMENT 'Location where the match is played',
  `status` enum('Scheduled','Setup','Live','Completed','Abandoned') NOT NULL DEFAULT 'Scheduled' COMMENT 'Current status of the match',
  `toss_winner_team_id` int(11) DEFAULT NULL COMMENT 'Foreign key linking to the team that won the toss (Teams table)',
  `decision` enum('Bat','Bowl') DEFAULT NULL COMMENT 'Decision made by the toss winner (Bat or Bowl)',
  `super_over_number` tinyint(3) UNSIGNED DEFAULT NULL COMMENT 'Which over (1-5) is designated as the Super Over (double runs)',
  `result_summary` varchar(255) DEFAULT NULL COMMENT 'Text summary of the match result (e.g., "Team A won by 5 wickets")',
  `winner_team_id` int(11) DEFAULT NULL COMMENT 'Foreign key linking to the winning team (Teams table, NULL for tie/abandoned)',
  `man_of_the_match_player_id` int(11) DEFAULT NULL COMMENT 'Foreign key linking to the Man of the Match player (Players table)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Timestamp when the match record was created'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores details about each scheduled or played match';

--
-- Dumping data for table `matches`
--

INSERT INTO `matches` (`match_id`, `season_id`, `team1_id`, `team2_id`, `match_datetime`, `venue`, `status`, `toss_winner_team_id`, `decision`, `super_over_number`, `result_summary`, `winner_team_id`, `man_of_the_match_player_id`, `created_at`) VALUES
(1, 1, 1, 2, '2024-07-10 18:00:00', 'Metalworks Box Arena', 'Completed', 1, 'Bat', 3, 'Box Blasters won by 18 runs', 1, 101, '2025-04-13 23:50:34'),
(2, 1, 3, 4, '2024-07-10 19:00:00', 'Metalworks Box Arena', 'Completed', 4, 'Bowl', 5, 'Pitch Pirates won by 1 wicket (chased successfully)', 3, 107, '2025-04-13 23:50:34'),
(3, 1, 5, 1, '2024-07-11 18:00:00', 'Metalworks Box Arena', 'Completed', 1, 'Bowl', 2, 'Box Blasters won by 1 wicket (chased successfully)', 1, 113, '2025-04-13 23:50:34'),
(4, 1, 2, 3, '2024-07-11 19:00:00', 'Metalworks Box Arena', 'Completed', 2, 'Bat', 4, 'Pitch Pirates won by 8 runs', 3, 103, '2025-04-13 23:50:34'),
(5, 1, 4, 5, '2024-07-12 18:00:00', 'Metalworks Box Arena', 'Completed', 5, 'Bat', 1, 'Boundary Bandits won by 10 runs', 5, 105, '2025-04-13 23:50:34'),
(6, 1, 1, 3, '2024-07-13 18:00:00', 'Metalworks Box Arena', 'Completed', 1, 'Bat', 4, 'Box Blasters won by 22 runs', 1, 108, '2025-04-13 23:50:34'),
(7, 1, 4, 2, '2024-07-13 19:00:00', 'Metalworks Box Arena', 'Completed', 2, 'Bowl', 3, 'Crease Crashers won by 1 wicket (chased successfully)', 2, 102, '2025-04-13 23:50:34'),
(8, 1, 5, 3, '2024-07-14 18:00:00', 'Metalworks Box Arena', 'Completed', 3, 'Bowl', 5, 'Pitch Pirates won by 1 wicket (chased successfully)', 3, 109, '2025-04-13 23:50:34'),
(9, 1, 1, 4, '2024-07-14 19:00:00', 'Metalworks Box Arena', 'Completed', 1, 'Bat', 2, 'Box Blasters won by 30 runs', 1, 121, '2025-04-13 23:50:34'),
(10, 1, 2, 5, '2024-07-15 18:00:00', 'Metalworks Box Arena', 'Completed', 5, 'Bat', 1, 'Crease Crashers won by 5 runs', 2, 106, '2025-04-13 23:50:34'),
(11, 1, 2, 5, '2024-07-20 18:00:00', 'Metalworks Box Arena', 'Completed', 5, 'Bat', 2, 'Crease Crashers won by 1 wicket (chased successfully)', 2, 114, '2025-04-13 23:50:34'),
(12, 1, 3, 2, '2024-07-21 18:00:00', 'Metalworks Box Arena', 'Completed', 3, 'Bat', 4, 'Pitch Pirates won by 6 runs', 3, 115, '2025-04-13 23:50:34'),
(13, 1, 1, 3, '2024-07-25 18:00:00', 'Metalworks Box Arena', 'Completed', 1, 'Bat', 1, 'Box Blasters won by 14 runs', 1, 113, '2025-04-13 23:50:34'),
(27, 5, 12, 11, '2025-04-18 17:30:00', 'Metalworks Box Arena', 'Abandoned', 11, 'Bowl', 3, NULL, NULL, NULL, '2025-04-18 15:55:14'),
(28, 5, 13, 14, '2025-04-18 21:10:00', 'Metalworks Box Arena', 'Completed', 13, 'Bat', 2, NULL, NULL, NULL, '2025-04-18 15:55:42'),
(34, 5, 13, 15, '2025-04-18 21:21:00', 'Metalworks Box Arena', 'Setup', 13, 'Bat', 2, NULL, NULL, NULL, '2025-04-18 20:19:00'),
(35, 5, 15, 14, '2025-04-18 21:27:00', 'Metalworks Box Arena', 'Setup', 15, 'Bat', 2, NULL, NULL, NULL, '2025-04-18 20:26:49'),
(36, 5, 14, 11, '2025-04-18 21:31:00', 'Metalworks Box Arena', 'Live', 14, 'Bowl', 2, NULL, NULL, NULL, '2025-04-18 20:29:19'),
(37, 5, 11, 13, '2025-04-18 21:45:00', 'Metalworks Box Arena', 'Live', 11, 'Bat', 2, NULL, NULL, NULL, '2025-04-18 20:45:45'),
(38, 5, 15, 11, '2025-04-18 22:30:00', 'Metalworks Box Arena', '', 15, 'Bowl', 2, NULL, NULL, NULL, '2025-04-18 21:29:11'),
(39, 5, 12, 14, '2025-04-18 23:14:00', 'Metalworks Box Arena', '', 12, 'Bat', 2, NULL, NULL, NULL, '2025-04-18 22:13:01'),
(40, 5, 12, 11, '2025-04-18 23:43:00', 'Metalworks Box Arena', '', 12, 'Bowl', 3, NULL, NULL, NULL, '2025-04-18 22:43:50'),
(41, 5, 12, 15, '2025-04-19 11:52:00', 'Metalworks Box Arena', 'Setup', 12, 'Bat', 2, NULL, NULL, NULL, '2025-04-19 10:51:51'),
(42, 5, 12, 11, '2025-04-19 12:29:00', 'Metalworks Box Arena', 'Live', 12, 'Bowl', 2, NULL, NULL, NULL, '2025-04-19 11:30:06'),
(43, 5, 13, 15, '2025-04-19 12:45:00', 'Metalworks Box Arena', 'Live', 13, 'Bowl', 2, NULL, NULL, NULL, '2025-04-19 11:43:36'),
(44, 5, 12, 13, '2025-04-19 14:18:00', 'Metalworks Box Arena', 'Setup', 12, 'Bowl', 3, NULL, NULL, NULL, '2025-04-19 13:17:11'),
(45, 5, 11, 12, '2025-04-19 14:49:00', 'Metalworks Box Arena', 'Setup', 11, 'Bat', 3, NULL, NULL, NULL, '2025-04-19 13:49:13'),
(46, 5, 12, 11, '2025-04-19 22:04:00', 'Metalworks Box Arena', 'Setup', 12, 'Bat', 2, NULL, NULL, NULL, '2025-04-19 21:03:37'),
(47, 5, 15, 14, '2025-04-19 22:30:00', 'Metalworks Box Arena', '', 15, 'Bat', 1, NULL, NULL, NULL, '2025-04-19 21:31:06');

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `payment_id` int(11) NOT NULL COMMENT 'Unique ID for each payment transaction',
  `player_id` int(11) NOT NULL COMMENT 'Foreign key linking to the player making the payment',
  `season_id` int(11) NOT NULL COMMENT 'Foreign key linking to the season the payment is for',
  `amount` decimal(10,2) NOT NULL COMMENT 'Amount of the payment',
  `payment_date` date NOT NULL COMMENT 'Date the payment was made or recorded',
  `status` enum('Pending','Paid','Waived') NOT NULL DEFAULT 'Pending' COMMENT 'Status of the payment',
  `method` varchar(50) DEFAULT NULL COMMENT 'Method of payment (e.g., "Cash", "Online", "AdminWaived")',
  `notes` text DEFAULT NULL COMMENT 'Optional notes regarding the payment',
  `recorded_by_admin_id` int(11) DEFAULT NULL COMMENT 'Foreign key linking to the admin who recorded/verified the payment (Admins table)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Timestamp when the payment record was created'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tracks player fee payments and other financial transactions';

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`payment_id`, `player_id`, `season_id`, `amount`, `payment_date`, `status`, `method`, `notes`, `recorded_by_admin_id`, `created_at`) VALUES
(1, 101, 1, 50.00, '2024-06-25', 'Paid', 'Online', NULL, 1, '2025-04-13 23:50:34'),
(2, 102, 1, 50.00, '2024-06-26', 'Paid', 'Cash', NULL, 1, '2025-04-13 23:50:34'),
(3, 107, 1, 50.00, '2024-06-27', 'Paid', 'Online', NULL, 1, '2025-04-13 23:50:34'),
(4, 104, 1, 50.00, '2024-06-28', 'Pending', NULL, NULL, NULL, '2025-04-13 23:50:34'),
(5, 105, 1, 50.00, '2024-06-29', 'Paid', 'Cash', NULL, 1, '2025-04-13 23:50:34');

-- --------------------------------------------------------

--
-- Table structure for table `playermatchstats`
--

CREATE TABLE `playermatchstats` (
  `stat_id` int(11) NOT NULL COMMENT 'Unique ID for a player stats record in a specific match',
  `match_id` int(11) NOT NULL COMMENT 'Foreign key linking to the Matches table',
  `player_id` int(11) NOT NULL COMMENT 'Foreign key linking to the Players table',
  `team_id` int(11) NOT NULL COMMENT 'Foreign key linking to the Team the player played for in this match (Teams table)',
  `runs_scored` int(11) NOT NULL DEFAULT 0 COMMENT 'Runs scored by the batsman',
  `balls_faced` int(11) NOT NULL DEFAULT 0 COMMENT 'Number of legal deliveries faced by the batsman',
  `fours` int(11) NOT NULL DEFAULT 0 COMMENT 'Number of 4s hit (or map fence runs here)',
  `sixes` int(11) NOT NULL DEFAULT 0 COMMENT 'Number of 6s hit',
  `is_out` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Flag indicating if the batsman got out',
  `how_out` varchar(50) DEFAULT NULL COMMENT 'Method of dismissal (e.g., "Bowled", "Caught", "Run Out")',
  `overs_bowled` decimal(3,1) NOT NULL DEFAULT 0.0 COMMENT 'Overs bowled (e.g., 2.1 for 2 overs and 1 ball)',
  `runs_conceded` int(11) NOT NULL DEFAULT 0 COMMENT 'Runs conceded by the bowler',
  `wickets_taken` int(11) NOT NULL DEFAULT 0 COMMENT 'Number of wickets taken by the bowler',
  `maidens` int(11) NOT NULL DEFAULT 0 COMMENT 'Number of maiden overs bowled',
  `wides` int(11) NOT NULL DEFAULT 0 COMMENT 'Number of wide balls bowled',
  `no_balls` int(11) NOT NULL DEFAULT 0 COMMENT 'Number of no-balls bowled',
  `catches` int(11) NOT NULL DEFAULT 0 COMMENT 'Number of catches taken',
  `stumps` int(11) NOT NULL DEFAULT 0 COMMENT 'Number of stumpings effected (if applicable)',
  `run_outs` int(11) NOT NULL DEFAULT 0 COMMENT 'Number of run outs effected/assisted'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores detailed performance statistics for each player in each match';

--
-- Dumping data for table `playermatchstats`
--

INSERT INTO `playermatchstats` (`stat_id`, `match_id`, `player_id`, `team_id`, `runs_scored`, `balls_faced`, `fours`, `sixes`, `is_out`, `how_out`, `overs_bowled`, `runs_conceded`, `wickets_taken`, `maidens`, `wides`, `no_balls`, `catches`, `stumps`, `run_outs`) VALUES
(1, 1, 101, 1, 35, 20, 4, 0, 1, 'Caught (Hit Six)', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(2, 1, 108, 1, 0, 0, 0, 0, 0, NULL, 1.0, 5, 0, 0, 0, 0, 0, 0, 0),
(3, 1, 113, 1, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(4, 1, 116, 1, 0, 0, 0, 0, 0, NULL, 1.0, 8, 1, 0, 0, 0, 0, 0, 0),
(5, 1, 121, 1, 0, 0, 0, 0, 0, NULL, 1.0, 7, 0, 0, 0, 0, 0, 0, 0),
(6, 1, 122, 2, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 0, 0, 0),
(7, 1, 110, 2, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(8, 1, 102, 2, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 1, 0, 0),
(9, 1, 106, 2, 0, 0, 0, 0, 0, NULL, 1.0, 7, 0, 0, 0, 0, 0, 0, 0),
(10, 1, 114, 2, 0, 0, 0, 0, 0, NULL, 1.0, 11, 0, 0, 0, 0, 0, 0, 0),
(11, 1, 102, 2, 15, 18, 1, 0, 1, 'Bowled', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(12, 1, 106, 2, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(13, 1, 110, 2, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(14, 1, 114, 2, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(15, 1, 122, 2, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(16, 1, 108, 1, 0, 0, 0, 0, 0, NULL, 1.0, 5, 0, 0, 0, 0, 0, 0, 0),
(17, 1, 116, 1, 0, 0, 0, 0, 0, NULL, 1.0, 8, 1, 0, 0, 0, 0, 0, 0),
(18, 1, 121, 1, 0, 0, 0, 0, 0, NULL, 1.0, 7, 0, 0, 0, 0, 0, 0, 0),
(19, 1, 101, 1, 0, 0, 0, 0, 0, NULL, 1.0, 4, 0, 0, 0, 0, 0, 0, 0),
(20, 1, 113, 1, 0, 0, 0, 0, 0, NULL, 1.0, 3, 0, 0, 0, 0, 0, 0, 0),
(21, 2, 104, 4, 25, 18, 3, 0, 1, 'Caught', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(22, 2, 111, 4, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(23, 2, 112, 4, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(24, 2, 120, 4, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(25, 2, 124, 4, 0, 0, 0, 0, 0, NULL, 1.0, 5, 1, 0, 0, 0, 0, 0, 0),
(26, 2, 103, 3, 0, 0, 0, 0, 0, NULL, 1.0, 6, 0, 0, 0, 0, 0, 0, 0),
(27, 2, 107, 3, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 1, 0, 0),
(28, 2, 109, 3, 0, 0, 0, 0, 0, NULL, 1.0, 7, 0, 0, 0, 0, 0, 0, 0),
(29, 2, 115, 3, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 0, 0, 0),
(30, 2, 123, 3, 0, 0, 0, 0, 0, NULL, 1.0, 6, 0, 0, 0, 0, 0, 0, 0),
(31, 2, 109, 3, 28, 22, 4, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(32, 2, 107, 3, 11, 4, 2, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(33, 2, 103, 3, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(34, 2, 115, 3, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(35, 2, 123, 3, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(36, 2, 112, 4, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 0, 0, 0),
(37, 2, 124, 4, 0, 0, 0, 0, 0, NULL, 1.0, 5, 0, 0, 0, 0, 0, 0, 0),
(38, 2, 104, 4, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 0, 0, 0),
(39, 2, 111, 4, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(40, 2, 120, 4, 0, 0, 0, 0, 0, NULL, 0.2, 7, 0, 0, 0, 0, 0, 0, 0),
(41, 3, 105, 5, 30, 25, 3, 0, 1, 'Bowled', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(42, 3, 117, 5, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(43, 3, 118, 5, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(44, 3, 119, 5, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 0, 0, 0),
(45, 3, 125, 5, 0, 0, 0, 0, 0, NULL, 1.0, 6, 1, 0, 0, 0, 0, 0, 0),
(46, 3, 108, 1, 0, 0, 0, 0, 0, NULL, 1.0, 7, 0, 0, 0, 0, 0, 0, 0),
(47, 3, 116, 1, 0, 0, 0, 0, 0, NULL, 1.0, 10, 1, 0, 0, 0, 0, 0, 0),
(48, 3, 121, 1, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(49, 3, 101, 1, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 0, 0, 0),
(50, 3, 113, 1, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(51, 3, 101, 1, 15, 10, 2, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(52, 3, 113, 1, 28, 13, 3, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(53, 3, 108, 1, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(54, 3, 116, 1, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(55, 3, 121, 1, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(56, 3, 119, 5, 0, 0, 0, 0, 0, NULL, 1.0, 12, 0, 0, 0, 0, 0, 0, 0),
(57, 3, 125, 5, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 0, 0, 0),
(58, 3, 105, 5, 0, 0, 0, 0, 0, NULL, 1.0, 15, 0, 0, 0, 0, 0, 0, 0),
(59, 3, 117, 5, 0, 0, 0, 0, 0, NULL, 0.5, 6, 0, 0, 0, 0, 0, 0, 0),
(60, 3, 118, 5, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(61, 4, 102, 2, 22, 24, 2, 0, 1, 'Run Out', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(62, 4, 106, 2, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(63, 4, 110, 2, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 0, 0, 0),
(64, 4, 114, 2, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(65, 4, 122, 2, 0, 0, 0, 0, 0, NULL, 1.0, 4, 1, 0, 0, 0, 0, 0, 0),
(66, 4, 103, 3, 0, 0, 0, 0, 0, NULL, 1.0, 4, 1, 0, 0, 0, 0, 0, 0),
(67, 4, 107, 3, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(68, 4, 115, 3, 0, 0, 0, 0, 0, NULL, 1.0, 7, 0, 0, 0, 0, 0, 0, 0),
(69, 4, 123, 3, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 0, 0, 0),
(70, 4, 109, 3, 0, 0, 0, 0, 0, NULL, 1.0, 7, 0, 0, 0, 0, 0, 0, 0),
(71, 4, 109, 3, 28, 26, 3, 0, 1, 'Caught (Hit Six)', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(72, 4, 107, 3, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(73, 4, 103, 3, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(74, 4, 115, 3, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(75, 4, 123, 3, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(76, 4, 122, 2, 0, 0, 0, 0, 0, NULL, 1.0, 11, 0, 0, 0, 0, 0, 0, 0),
(77, 4, 110, 2, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 0, 0, 0),
(78, 4, 102, 2, 0, 0, 0, 0, 0, NULL, 1.0, 6, 0, 0, 0, 0, 1, 0, 0),
(79, 4, 106, 2, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(80, 4, 114, 2, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 0, 0, 0),
(81, 5, 105, 5, 38, 28, 5, 0, 1, 'Bowled', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(82, 5, 117, 5, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(83, 5, 118, 5, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(84, 5, 119, 5, 0, 0, 0, 0, 0, NULL, 1.0, 6, 0, 0, 0, 0, 0, 0, 0),
(85, 5, 125, 5, 0, 0, 0, 0, 0, NULL, 1.0, 10, 1, 0, 0, 0, 0, 0, 0),
(86, 5, 112, 4, 0, 0, 0, 0, 0, NULL, 1.0, 12, 0, 0, 0, 0, 0, 0, 0),
(87, 5, 124, 4, 0, 0, 0, 0, 0, NULL, 1.0, 8, 1, 0, 0, 0, 0, 0, 0),
(88, 5, 104, 4, 0, 0, 0, 0, 0, NULL, 1.0, 11, 0, 0, 0, 0, 0, 0, 0),
(89, 5, 111, 4, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 0, 0, 0),
(90, 5, 120, 4, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 0, 0, 0),
(91, 5, 104, 4, 22, 26, 2, 0, 1, 'Caught (Hit Six)', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(92, 5, 111, 4, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(93, 5, 112, 4, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(94, 5, 120, 4, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(95, 5, 124, 4, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(96, 5, 119, 5, 0, 0, 0, 0, 0, NULL, 1.0, 6, 0, 0, 0, 0, 0, 0, 0),
(97, 5, 125, 5, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 0, 0, 0),
(98, 5, 105, 5, 0, 0, 0, 0, 0, NULL, 1.0, 7, 0, 0, 0, 0, 1, 0, 0),
(99, 5, 117, 5, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(100, 5, 118, 5, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 0, 0, 0),
(101, 6, 101, 1, 30, 20, 4, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(102, 6, 108, 1, 22, 10, 2, 0, 0, NULL, 1.0, 4, 1, 0, 0, 0, 0, 0, 0),
(103, 6, 113, 1, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(104, 6, 116, 1, 0, 0, 0, 0, 0, NULL, 1.0, 6, 0, 0, 0, 0, 0, 0, 0),
(105, 6, 121, 1, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(106, 6, 103, 3, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 0, 0, 0),
(107, 6, 107, 3, 0, 0, 0, 0, 0, NULL, 1.0, 12, 0, 0, 0, 0, 0, 0, 0),
(108, 6, 115, 3, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 0, 0, 0),
(109, 6, 123, 3, 0, 0, 0, 0, 0, NULL, 1.0, 11, 0, 0, 0, 0, 0, 0, 0),
(110, 6, 109, 3, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 0, 0, 0),
(111, 6, 109, 3, 18, 25, 2, 0, 1, 'Bowled', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(112, 6, 107, 3, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(113, 6, 103, 3, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(114, 6, 115, 3, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(115, 6, 123, 3, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(116, 6, 108, 1, 0, 0, 0, 0, 0, NULL, 1.0, 4, 1, 0, 0, 0, 0, 0, 0),
(117, 6, 116, 1, 0, 0, 0, 0, 0, NULL, 1.0, 6, 0, 0, 0, 0, 0, 0, 0),
(118, 6, 121, 1, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(119, 6, 101, 1, 0, 0, 0, 0, 0, NULL, 1.0, 7, 0, 0, 0, 0, 0, 0, 0),
(120, 6, 113, 1, 0, 0, 0, 0, 0, NULL, 1.0, 5, 0, 0, 0, 0, 0, 0, 0),
(121, 7, 104, 4, 28, 26, 3, 0, 1, 'Caught', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(122, 7, 111, 4, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(123, 7, 112, 4, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 0, 0, 0),
(124, 7, 120, 4, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(125, 7, 124, 4, 0, 0, 0, 0, 0, NULL, 1.0, 7, 1, 0, 0, 0, 0, 0, 0),
(126, 7, 122, 2, 0, 0, 0, 0, 0, NULL, 1.0, 11, 0, 0, 0, 0, 0, 0, 0),
(127, 7, 110, 2, 0, 0, 0, 0, 0, NULL, 1.0, 6, 1, 0, 0, 0, 1, 0, 0),
(128, 7, 102, 2, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(129, 7, 106, 2, 0, 0, 0, 0, 0, NULL, 1.0, 7, 0, 0, 0, 0, 0, 0, 0),
(130, 7, 114, 2, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(131, 7, 102, 2, 30, 20, 4, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(132, 7, 106, 2, 11, 5, 2, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(133, 7, 110, 2, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(134, 7, 114, 2, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(135, 7, 122, 2, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(136, 7, 112, 4, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 0, 0, 0),
(137, 7, 124, 4, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(138, 7, 104, 4, 0, 0, 0, 0, 0, NULL, 1.0, 12, 0, 0, 0, 0, 0, 0, 0),
(139, 7, 111, 4, 0, 0, 0, 0, 0, NULL, 0.1, 1, 0, 0, 0, 0, 0, 0, 0),
(140, 7, 120, 4, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 0, 0, 0),
(141, 8, 105, 5, 25, 22, 3, 0, 1, 'Bowled', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(142, 8, 117, 5, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(143, 8, 118, 5, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(144, 8, 119, 5, 0, 0, 0, 0, 0, NULL, 1.0, 6, 1, 0, 0, 0, 0, 0, 0),
(145, 8, 125, 5, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(146, 8, 103, 3, 0, 0, 0, 0, 0, NULL, 1.0, 5, 1, 0, 0, 0, 0, 0, 0),
(147, 8, 107, 3, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 0, 0, 0),
(148, 8, 115, 3, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 0, 0, 0),
(149, 8, 123, 3, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(150, 8, 109, 3, 0, 0, 0, 0, 0, NULL, 1.0, 7, 0, 0, 0, 0, 0, 0, 0),
(151, 8, 109, 3, 32, 23, 4, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(152, 8, 107, 3, 8, 4, 1, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(153, 8, 103, 3, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(154, 8, 115, 3, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(155, 8, 123, 3, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(156, 8, 119, 5, 0, 0, 0, 0, 0, NULL, 1.0, 6, 0, 0, 0, 0, 0, 0, 0),
(157, 8, 125, 5, 0, 0, 0, 0, 0, NULL, 1.0, 11, 0, 0, 0, 0, 0, 0, 0),
(158, 8, 105, 5, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(159, 8, 117, 5, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 0, 0, 0),
(160, 8, 118, 5, 0, 0, 0, 0, 0, NULL, 0.3, 6, 0, 0, 0, 0, 0, 0, 0),
(161, 9, 101, 1, 40, 25, 5, 0, 1, 'Caught (Hit Six)', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(162, 9, 108, 1, 0, 0, 0, 0, 0, NULL, 1.0, 3, 0, 0, 0, 0, 0, 0, 0),
(163, 9, 113, 1, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(164, 9, 116, 1, 0, 0, 0, 0, 0, NULL, 1.0, 6, 0, 0, 0, 0, 0, 0, 0),
(165, 9, 121, 1, 0, 0, 0, 0, 0, NULL, 1.0, 5, 1, 0, 0, 0, 0, 0, 0),
(166, 9, 112, 4, 0, 0, 0, 0, 0, NULL, 1.0, 15, 0, 0, 0, 0, 0, 0, 0),
(167, 9, 124, 4, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 1, 0, 0),
(168, 9, 104, 4, 0, 0, 0, 0, 0, NULL, 1.0, 12, 0, 0, 0, 0, 0, 0, 0),
(169, 9, 111, 4, 0, 0, 0, 0, 0, NULL, 1.0, 11, 0, 0, 0, 0, 0, 0, 0),
(170, 9, 120, 4, 0, 0, 0, 0, 0, NULL, 1.0, 14, 0, 0, 0, 0, 0, 0, 0),
(171, 9, 104, 4, 18, 28, 2, 0, 1, 'Bowled', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(172, 9, 111, 4, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(173, 9, 112, 4, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(174, 9, 120, 4, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(175, 9, 124, 4, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(176, 9, 108, 1, 0, 0, 0, 0, 0, NULL, 1.0, 3, 0, 0, 0, 0, 0, 0, 0),
(177, 9, 116, 1, 0, 0, 0, 0, 0, NULL, 1.0, 6, 0, 0, 0, 0, 0, 0, 0),
(178, 9, 121, 1, 0, 0, 0, 0, 0, NULL, 1.0, 5, 1, 0, 0, 0, 0, 0, 0),
(179, 9, 101, 1, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(180, 9, 113, 1, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 0, 0, 0),
(181, 10, 105, 5, 26, 29, 3, 0, 1, 'Caught', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(182, 10, 117, 5, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(183, 10, 118, 5, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(184, 10, 119, 5, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 0, 0, 0),
(185, 10, 125, 5, 0, 0, 0, 0, 0, NULL, 1.0, 7, 0, 0, 0, 0, 0, 0, 0),
(186, 10, 122, 2, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 0, 0, 0),
(187, 10, 110, 2, 0, 0, 0, 0, 0, NULL, 1.0, 5, 1, 0, 0, 0, 1, 0, 0),
(188, 10, 102, 2, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(189, 10, 106, 2, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 0, 0, 0),
(190, 10, 114, 2, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 0, 0, 0),
(191, 10, 102, 2, 15, 15, 1, 0, 1, 'Caught (Hit Six)', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(192, 10, 106, 2, 31, 15, 4, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(193, 10, 110, 2, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(194, 10, 114, 2, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(195, 10, 122, 2, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(196, 10, 119, 5, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 0, 0, 0),
(197, 10, 125, 5, 0, 0, 0, 0, 0, NULL, 1.0, 7, 0, 0, 0, 0, 0, 0, 0),
(198, 10, 105, 5, 0, 0, 0, 0, 0, NULL, 1.0, 12, 0, 0, 0, 0, 1, 0, 0),
(199, 10, 117, 5, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(200, 10, 118, 5, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 0, 0, 0),
(201, 11, 105, 5, 31, 27, 4, 0, 1, 'Bowled', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(202, 11, 117, 5, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(203, 11, 118, 5, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(204, 11, 119, 5, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 0, 0, 0),
(205, 11, 125, 5, 0, 0, 0, 0, 0, NULL, 1.0, 8, 1, 0, 0, 0, 0, 0, 0),
(206, 11, 122, 2, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 0, 0, 0),
(207, 11, 110, 2, 0, 0, 0, 0, 0, NULL, 1.0, 6, 0, 0, 0, 0, 0, 0, 0),
(208, 11, 102, 2, 0, 0, 0, 0, 0, NULL, 1.0, 11, 0, 0, 0, 0, 0, 0, 0),
(209, 11, 106, 2, 0, 0, 0, 0, 0, NULL, 1.0, 8, 1, 0, 0, 0, 0, 0, 0),
(210, 11, 114, 2, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 0, 0, 0),
(211, 11, 102, 2, 15, 12, 1, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(212, 11, 114, 2, 30, 16, 3, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(213, 11, 106, 2, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(214, 11, 110, 2, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(215, 11, 122, 2, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(216, 11, 119, 5, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(217, 11, 125, 5, 0, 0, 0, 0, 0, NULL, 1.0, 12, 0, 0, 0, 0, 0, 0, 0),
(218, 11, 105, 5, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 0, 0, 0),
(219, 11, 117, 5, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 0, 0, 0),
(220, 11, 118, 5, 0, 0, 0, 0, 0, NULL, 0.4, 6, 0, 0, 0, 0, 0, 0, 0),
(221, 12, 109, 3, 35, 24, 4, 0, 1, 'Bowled', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(222, 12, 107, 3, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(223, 12, 103, 3, 0, 0, 0, 0, 0, NULL, 1.0, 6, 1, 0, 0, 0, 0, 0, 0),
(224, 12, 115, 3, 20, 6, 2, 0, 0, NULL, 1.0, 7, 0, 0, 0, 0, 0, 0, 0),
(225, 12, 123, 3, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 0, 0, 0),
(226, 12, 122, 2, 0, 0, 0, 0, 0, NULL, 1.0, 12, 0, 0, 0, 0, 0, 0, 0),
(227, 12, 110, 2, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 0, 0, 0),
(228, 12, 102, 2, 0, 0, 0, 0, 0, NULL, 1.0, 15, 0, 0, 0, 0, 0, 0, 0),
(229, 12, 106, 2, 0, 0, 0, 0, 0, NULL, 1.0, 10, 1, 0, 0, 0, 0, 0, 0),
(230, 12, 114, 2, 0, 0, 0, 0, 0, NULL, 1.0, 9, 0, 0, 0, 0, 0, 0, 0),
(231, 12, 102, 2, 30, 28, 3, 0, 1, 'Caught (Hit Six)', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(232, 12, 106, 2, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(233, 12, 110, 2, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(234, 12, 114, 2, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(235, 12, 122, 2, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(236, 12, 103, 3, 0, 0, 0, 0, 0, NULL, 1.0, 6, 0, 0, 0, 0, 0, 0, 0),
(237, 12, 107, 3, 0, 0, 0, 0, 0, NULL, 1.0, 8, 0, 0, 0, 0, 0, 0, 0),
(238, 12, 115, 3, 0, 0, 0, 0, 0, NULL, 1.0, 7, 0, 0, 0, 0, 1, 0, 0),
(239, 12, 123, 3, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 0, 0, 0),
(240, 12, 109, 3, 0, 0, 0, 0, 0, NULL, 1.0, 18, 0, 0, 0, 0, 0, 0, 0),
(241, 13, 113, 1, 45, 26, 6, 0, 1, 'Run Out', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(242, 13, 101, 1, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(243, 13, 108, 1, 0, 0, 0, 0, 0, NULL, 1.0, 5, 0, 0, 0, 0, 0, 0, 0),
(244, 13, 116, 1, 0, 0, 0, 0, 0, NULL, 1.0, 9, 1, 0, 0, 0, 0, 0, 0),
(245, 13, 121, 1, 0, 0, 0, 0, 0, NULL, 1.0, 7, 0, 0, 0, 0, 0, 0, 0),
(246, 13, 103, 3, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 0, 0, 0),
(247, 13, 107, 3, 0, 0, 0, 0, 0, NULL, 1.0, 15, 0, 0, 0, 0, 0, 0, 0),
(248, 13, 115, 3, 0, 0, 0, 0, 0, NULL, 1.0, 12, 0, 0, 0, 0, 0, 0, 0),
(249, 13, 123, 3, 0, 0, 0, 0, 0, NULL, 1.0, 13, 0, 0, 0, 0, 0, 0, 0),
(250, 13, 109, 3, 0, 0, 0, 0, 0, NULL, 1.0, 10, 1, 0, 0, 0, 0, 0, 0),
(251, 13, 109, 3, 31, 30, 4, 0, 1, 'Bowled', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(252, 13, 107, 3, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(253, 13, 103, 3, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(254, 13, 115, 3, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(255, 13, 123, 3, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(256, 13, 108, 1, 0, 0, 0, 0, 0, NULL, 1.0, 5, 0, 0, 0, 0, 0, 0, 0),
(257, 13, 116, 1, 0, 0, 0, 0, 0, NULL, 1.0, 9, 1, 0, 0, 0, 0, 0, 0),
(258, 13, 121, 1, 0, 0, 0, 0, 0, NULL, 1.0, 7, 0, 0, 0, 0, 0, 0, 0),
(259, 13, 101, 1, 0, 0, 0, 0, 0, NULL, 1.0, 10, 0, 0, 0, 0, 0, 0, 0),
(260, 13, 113, 1, 0, 0, 0, 0, 0, NULL, 1.0, 15, 0, 0, 0, 0, 0, 0, 0),
(261, 27, 118, 12, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(262, 27, 115, 11, 0, 0, 0, 0, 0, NULL, 0.1, 0, 0, 0, 0, 0, 0, 0, 0),
(263, 27, 118, 12, 1, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(264, 27, 115, 11, 0, 0, 0, 0, 0, NULL, 0.2, 1, 0, 0, 0, 0, 0, 0, 0),
(265, 27, 112, 12, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(266, 27, 115, 11, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(267, 27, 112, 12, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(268, 27, 115, 11, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(269, 27, 112, 12, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(270, 27, 115, 11, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(271, 27, 118, 12, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(272, 27, 115, 11, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(273, 27, 118, 12, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(274, 27, 115, 11, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(275, 27, 112, 12, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(276, 27, 115, 11, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(277, 27, 112, 12, 1, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(278, 27, 115, 11, 0, 0, 0, 0, 0, NULL, 0.2, 1, 0, 0, 0, 0, 0, 0, 0),
(279, 27, 112, 12, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(280, 27, 115, 11, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(281, 27, 112, 12, 0, 1, 0, 0, 1, 'Caught (Hit Six)', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(282, 27, 115, 11, 0, 0, 0, 0, 0, NULL, 0.2, 0, 1, 0, 0, 0, 0, 0, 0),
(283, 27, 115, 11, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 1, 0, 0),
(284, 27, 112, 12, 4, 1, 1, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(285, 27, 115, 11, 0, 0, 0, 0, 0, NULL, 0.2, 4, 0, 0, 0, 0, 0, 0, 0),
(286, 27, 112, 12, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(287, 27, 115, 11, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(288, 28, 105, 13, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(289, 28, 107, 14, 0, 0, 0, 0, 0, NULL, 0.1, 2, 0, 0, 0, 0, 0, 0, 0),
(290, 28, 105, 13, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(291, 28, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(292, 28, 105, 13, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(293, 28, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(294, 28, 105, 13, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(295, 28, 107, 14, 0, 0, 0, 0, 0, NULL, 0.1, 1, 0, 0, 1, 0, 0, 0, 0),
(296, 28, 105, 13, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(297, 28, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(298, 28, 105, 13, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(299, 28, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(300, 28, 105, 13, 4, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(301, 28, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 4, 0, 0, 0, 0, 0, 0, 0),
(402, 36, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(403, 36, 107, 14, 0, 0, 0, 0, 0, NULL, 0.1, 0, 0, 0, 0, 0, 0, 0, 0),
(404, 36, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(405, 36, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(406, 36, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(407, 36, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(408, 36, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(409, 36, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(410, 36, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(411, 36, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(412, 36, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(413, 36, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(414, 36, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(415, 36, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(416, 36, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(417, 36, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(418, 36, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(419, 36, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(420, 36, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(421, 36, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(422, 36, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(423, 36, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(424, 36, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(425, 36, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(426, 36, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(427, 36, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(428, 36, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(429, 36, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(430, 36, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(431, 36, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(432, 36, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(433, 36, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(434, 36, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(435, 36, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(436, 36, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(437, 36, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(438, 37, 101, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(439, 37, 122, 13, 0, 0, 0, 0, 0, NULL, 0.1, 0, 0, 0, 0, 0, 0, 0, 0),
(440, 37, 101, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(441, 37, 122, 13, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(442, 37, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(443, 37, 105, 13, 0, 0, 0, 0, 0, NULL, 0.1, 0, 0, 0, 0, 0, 0, 0, 0),
(444, 37, 106, 11, 1, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(445, 37, 105, 13, 0, 0, 0, 0, 0, NULL, 0.2, 1, 0, 0, 0, 0, 0, 0, 0),
(446, 37, 106, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(447, 37, 105, 13, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(448, 37, 106, 11, 3, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(449, 37, 105, 13, 0, 0, 0, 0, 0, NULL, 0.2, 3, 0, 0, 0, 0, 0, 0, 0),
(450, 37, 106, 11, 8, 1, 1, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(451, 37, 105, 13, 0, 0, 0, 0, 0, NULL, 0.2, 8, 0, 0, 0, 0, 0, 0, 0),
(452, 37, 106, 11, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(453, 37, 105, 13, 0, 0, 0, 0, 0, NULL, 0.1, 1, 0, 0, 1, 0, 0, 0, 0),
(454, 37, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(455, 37, 105, 13, 0, 0, 0, 0, 0, NULL, 0.2, 1, 0, 0, 0, 1, 0, 0, 0),
(456, 37, 106, 11, 0, 1, 0, 0, 1, 'Bowled', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(457, 37, 105, 13, 0, 0, 0, 0, 0, NULL, 0.2, 0, 1, 0, 0, 0, 0, 0, 0),
(458, 37, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(459, 37, 105, 13, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(460, 37, 101, 11, 4, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(461, 37, 105, 13, 0, 0, 0, 0, 0, NULL, 0.2, 4, 0, 0, 0, 0, 0, 0, 0),
(462, 37, 101, 11, 6, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(463, 37, 105, 13, 0, 0, 0, 0, 0, NULL, 0.2, 6, 0, 0, 0, 0, 0, 0, 0),
(464, 37, 101, 11, 4, 1, 1, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(465, 37, 105, 13, 0, 0, 0, 0, 0, NULL, 0.2, 4, 0, 0, 0, 0, 0, 0, 0),
(466, 37, 101, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(467, 37, 105, 13, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(468, 37, 101, 11, 1, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(469, 37, 105, 13, 0, 0, 0, 0, 0, NULL, 0.2, 1, 0, 0, 0, 0, 0, 0, 0),
(470, 37, 101, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(471, 37, 122, 13, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(472, 37, 101, 11, 1, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(473, 37, 122, 13, 0, 0, 0, 0, 0, NULL, 0.2, 1, 0, 0, 0, 0, 0, 0, 0),
(474, 37, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(475, 37, 122, 13, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(476, 37, 101, 11, 3, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(477, 37, 122, 13, 0, 0, 0, 0, 0, NULL, 0.2, 3, 0, 0, 0, 0, 0, 0, 0),
(478, 37, 101, 11, 4, 1, 1, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(479, 37, 122, 13, 0, 0, 0, 0, 0, NULL, 0.2, 4, 0, 0, 0, 0, 0, 0, 0),
(480, 37, 101, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(481, 37, 122, 13, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(482, 37, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(483, 37, 122, 13, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(484, 37, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(485, 37, 122, 13, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(486, 37, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(487, 37, 122, 13, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(488, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(489, 38, 103, 15, 0, 0, 0, 0, 0, NULL, 0.1, 0, 0, 0, 0, 0, 0, 0, 0),
(490, 38, 106, 11, 1, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(491, 38, 103, 15, 0, 0, 0, 0, 0, NULL, 0.2, 1, 0, 0, 0, 0, 0, 0, 0),
(492, 38, 106, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(493, 38, 103, 15, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(494, 38, 106, 11, 3, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(495, 38, 103, 15, 0, 0, 0, 0, 0, NULL, 0.2, 3, 0, 0, 0, 0, 0, 0, 0),
(496, 38, 106, 11, 4, 1, 1, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(497, 38, 103, 15, 0, 0, 0, 0, 0, NULL, 0.2, 4, 0, 0, 0, 0, 0, 0, 0),
(498, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(499, 38, 103, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(500, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(501, 38, 103, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(502, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(503, 38, 103, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(504, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(505, 38, 103, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(506, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(507, 38, 103, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(508, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(509, 38, 103, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(510, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(511, 38, 116, 15, 0, 0, 0, 0, 0, NULL, 0.1, 0, 0, 0, 0, 0, 0, 0, 0),
(512, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(513, 38, 116, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(514, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(515, 38, 116, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(516, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(517, 38, 116, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(518, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(519, 38, 116, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(520, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(521, 38, 116, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(522, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(523, 38, 116, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(524, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(525, 38, 116, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(526, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(527, 38, 116, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(528, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(529, 38, 116, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(530, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(531, 38, 116, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(532, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(533, 38, 116, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(534, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(535, 38, 116, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(536, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(537, 38, 116, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(538, 38, 106, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(539, 38, 116, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(540, 38, 106, 11, 0, 1, 0, 0, 1, 'Caught', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(541, 38, 103, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 1, 0, 0, 0, 0, 0, 0),
(542, 38, 108, 15, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 1, 0, 0),
(543, 38, 117, 11, 0, 1, 0, 0, 1, 'Hit Outside', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(544, 38, 103, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 1, 0, 0, 0, 0, 0, 0),
(545, 38, 124, 11, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(546, 38, 103, 15, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(547, 38, 124, 11, 1, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(548, 38, 103, 15, 0, 0, 0, 0, 0, NULL, 0.2, 1, 0, 0, 0, 0, 0, 0, 0),
(549, 39, 118, 12, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(550, 39, 121, 14, 0, 0, 0, 0, 0, NULL, 0.1, 0, 0, 0, 0, 0, 0, 0, 0),
(551, 39, 118, 12, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(552, 39, 121, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(553, 39, 118, 12, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(554, 39, 121, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(555, 39, 118, 12, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(556, 39, 121, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(557, 39, 118, 12, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(558, 39, 121, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(559, 39, 118, 12, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(560, 39, 121, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(561, 39, 118, 12, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(562, 39, 107, 14, 0, 0, 0, 0, 0, NULL, 0.1, 2, 0, 0, 0, 0, 0, 0, 0),
(563, 39, 118, 12, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(564, 39, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(565, 39, 118, 12, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(566, 39, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(567, 39, 118, 12, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(568, 39, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(569, 39, 118, 12, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(570, 39, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(571, 39, 118, 12, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(572, 39, 107, 14, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(573, 39, 118, 12, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(574, 39, 121, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(575, 39, 118, 12, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(576, 39, 121, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(577, 39, 118, 12, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(578, 39, 121, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(579, 39, 118, 12, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(580, 39, 121, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(581, 39, 118, 12, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(582, 39, 121, 14, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(583, 39, 118, 12, 3, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(584, 39, 121, 14, 0, 0, 0, 0, 0, NULL, 0.2, 3, 0, 0, 0, 0, 0, 0, 0),
(585, 39, 118, 12, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(586, 39, 123, 14, 0, 0, 0, 0, 0, NULL, 0.1, 0, 0, 0, 0, 0, 0, 0, 0),
(587, 39, 118, 12, 1, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(588, 39, 123, 14, 0, 0, 0, 0, 0, NULL, 0.2, 1, 0, 0, 0, 0, 0, 0, 0),
(589, 39, 118, 12, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(590, 39, 123, 14, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(591, 39, 118, 12, 3, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(592, 39, 123, 14, 0, 0, 0, 0, 0, NULL, 0.2, 3, 0, 0, 0, 0, 0, 0, 0),
(593, 39, 118, 12, 4, 1, 1, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(594, 39, 123, 14, 0, 0, 0, 0, 0, NULL, 0.2, 4, 0, 0, 0, 0, 0, 0, 0),
(595, 39, 118, 12, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(596, 39, 123, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0),
(597, 39, 118, 12, 0, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(598, 39, 113, 14, 0, 0, 0, 0, 0, NULL, 0.1, 0, 0, 0, 0, 0, 0, 0, 0),
(599, 39, 118, 12, 1, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(600, 39, 113, 14, 0, 0, 0, 0, 0, NULL, 0.2, 1, 0, 0, 0, 0, 0, 0, 0),
(601, 39, 118, 12, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(602, 39, 113, 14, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(603, 39, 118, 12, 3, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(604, 39, 113, 14, 0, 0, 0, 0, 0, NULL, 0.2, 3, 0, 0, 0, 0, 0, 0, 0),
(605, 39, 118, 12, 4, 1, 1, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(606, 39, 113, 14, 0, 0, 0, 0, 0, NULL, 0.2, 4, 0, 0, 0, 0, 0, 0, 0),
(607, 39, 118, 12, 0, 1, 0, 0, 1, 'Hit Outside', 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(608, 39, 113, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 1, 0, 0, 0, 0, 0, 0),
(609, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(610, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.1, 2, 0, 0, 0, 0, 0, 0, 0),
(611, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(612, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(613, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(614, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(615, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(616, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(617, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(618, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(619, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(620, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(621, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(622, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(623, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(624, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(625, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(626, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(627, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(628, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(629, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(630, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(631, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(632, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(633, 40, 101, 11, 4, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(634, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 4, 0, 0, 0, 0, 0, 0, 0),
(635, 40, 101, 11, 4, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(636, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 4, 0, 0, 0, 0, 0, 0, 0),
(637, 40, 101, 11, 4, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(638, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 4, 0, 0, 0, 0, 0, 0, 0),
(639, 40, 101, 11, 4, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(640, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 4, 0, 0, 0, 0, 0, 0, 0),
(641, 40, 101, 11, 4, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(642, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 4, 0, 0, 0, 0, 0, 0, 0),
(643, 40, 101, 11, 4, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(644, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 4, 0, 0, 0, 0, 0, 0, 0),
(645, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(646, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(647, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(648, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(649, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(650, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(651, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(652, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(653, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(654, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(655, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(656, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(657, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(658, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(659, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(660, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(661, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(662, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(663, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(664, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(665, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(666, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(667, 40, 101, 11, 2, 1, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(668, 40, 112, 12, 0, 0, 0, 0, 0, NULL, 0.2, 2, 0, 0, 0, 0, 0, 0, 0),
(669, 42, 112, 12, 0, 0, 0, 0, 0, NULL, 1.0, 7, 0, 0, 0, 0, 0, 0, 0),
(670, 42, 118, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(671, 42, 111, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(672, 42, 125, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(673, 42, 104, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(674, 42, 115, 11, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(675, 42, 124, 11, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(676, 42, 106, 11, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(677, 42, 117, 11, 7, 6, 1, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(678, 42, 101, 11, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(679, 45, 115, 11, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(680, 45, 124, 11, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(681, 45, 106, 11, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(682, 45, 117, 11, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(683, 45, 101, 11, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(684, 45, 112, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(685, 45, 118, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(686, 45, 111, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(687, 45, 125, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(688, 45, 104, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(689, 46, 112, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(690, 46, 118, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(691, 46, 111, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(692, 46, 125, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(693, 46, 104, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(694, 46, 115, 11, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(695, 46, 124, 11, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(696, 46, 106, 11, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(697, 46, 117, 11, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(698, 46, 101, 11, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(699, 44, 112, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(700, 44, 118, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(701, 44, 111, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(702, 44, 125, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(703, 44, 104, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(704, 44, 114, 13, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(705, 44, 110, 13, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(706, 44, 122, 13, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(707, 44, 102, 13, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(708, 44, 105, 13, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(709, 46, 112, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(710, 46, 118, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(711, 46, 111, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(712, 46, 125, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(713, 46, 104, 12, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(714, 46, 115, 11, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(715, 46, 124, 11, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(716, 46, 106, 11, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(717, 46, 117, 11, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(718, 46, 101, 11, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(719, 47, 120, 15, 29, 14, 3, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(720, 47, 103, 15, 9, 5, 1, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(721, 47, 116, 15, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(722, 47, 108, 15, 10, 11, 1, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(723, 47, 119, 15, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(724, 47, 109, 14, 0, 0, 0, 0, 0, NULL, 1.0, 7, 0, 0, 0, 0, 0, 0, 0),
(725, 47, 121, 14, 0, 0, 0, 0, 0, NULL, 1.4, 23, 0, 0, 2, 4, 0, 0, 0),
(726, 47, 113, 14, 0, 0, 0, 0, 0, NULL, 0.0, 0, 0, 0, 0, 0, 0, 0, 0),
(727, 47, 107, 14, 0, 0, 0, 0, 0, NULL, 2.0, 24, 0, 0, 0, 0, 0, 0, 0),
(728, 47, 123, 14, 0, 0, 0, 0, 0, NULL, 0.2, 0, 0, 0, 0, 0, 0, 0, 0);

-- --------------------------------------------------------

--
-- Table structure for table `playerratings`
--

CREATE TABLE `playerratings` (
  `rating_id` int(11) NOT NULL COMMENT 'Unique ID for each rating submission',
  `season_id` int(11) NOT NULL COMMENT 'Foreign key linking to the season the rating pertains to',
  `rated_player_id` int(11) NOT NULL COMMENT 'Foreign key linking to the player being rated (Players table)',
  `rater_player_id` int(11) NOT NULL COMMENT 'Foreign key linking to the player giving the rating (Players table)',
  `rating_value` tinyint(3) UNSIGNED NOT NULL COMMENT 'Rating score from 1 to 5',
  `comment` text DEFAULT NULL COMMENT 'Optional comment accompanying the rating',
  `rated_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Timestamp when the rating was submitted'
) ;

--
-- Dumping data for table `playerratings`
--

INSERT INTO `playerratings` (`rating_id`, `season_id`, `rated_player_id`, `rater_player_id`, `rating_value`, `comment`, `rated_at`) VALUES
(1, 1, 101, 102, 5, 'Great batting in Match 1!', '2025-04-13 23:50:34'),
(2, 1, 107, 104, 5, 'Amazing chase in Match 2.', '2025-04-13 23:50:34'),
(3, 1, 113, 101, 4, 'Good finish in Match 3.', '2025-04-13 23:50:34'),
(4, 1, 103, 107, 5, 'Excellent bowling in Match 4.', '2025-04-13 23:50:34'),
(5, 1, 105, 104, 4, 'Solid captaincy in Match 5.', '2025-04-13 23:50:34');

-- --------------------------------------------------------

--
-- Table structure for table `players`
--

CREATE TABLE `players` (
  `player_id` int(11) NOT NULL COMMENT 'Unique ID for each player',
  `name` varchar(150) NOT NULL COMMENT 'Full name of the player',
  `email` varchar(100) DEFAULT NULL COMMENT 'Player email address (optional, unique if provided)',
  `phone` varchar(20) DEFAULT NULL COMMENT 'Player phone number (optional)',
  `base_price` decimal(10,2) DEFAULT 100.00 COMMENT 'Base price for player auction (if applicable)',
  `role` enum('Batsman','Bowler','AllRounder','WicketKeeper') DEFAULT NULL COMMENT 'Player primary role (optional)',
  `registered_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Timestamp when the player record was created'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores information about individual players';

--
-- Dumping data for table `players`
--

INSERT INTO `players` (`player_id`, `name`, `email`, `phone`, `base_price`, `role`, `registered_at`) VALUES
(101, 'Rohit Sharma', 'rohit.s@example.com', NULL, 100.00, 'Batsman', '2025-04-13 23:50:34'),
(102, 'Virat Kohli', 'virat.k@example.com', NULL, 100.00, 'Batsman', '2025-04-13 23:50:34'),
(103, 'Jasprit Bumrah', 'jasprit.b@example.com', NULL, 100.00, 'Bowler', '2025-04-13 23:50:34'),
(104, 'Rishabh Pant', 'rishabh.p@example.com', NULL, 100.00, 'WicketKeeper', '2025-04-13 23:50:34'),
(105, 'Hardik Pandya', 'hardik.p@example.com', NULL, 100.00, 'AllRounder', '2025-04-13 23:50:34'),
(106, 'KL Rahul', 'kl.rahul@example.com', NULL, 100.00, 'Batsman', '2025-04-13 23:50:34'),
(107, 'Ravindra Jadeja', 'ravi.jadeja@example.com', NULL, 100.00, 'AllRounder', '2025-04-13 23:50:34'),
(108, 'Mohammed Shami', 'mohd.shami@example.com', NULL, 100.00, 'Bowler', '2025-04-13 23:50:34'),
(109, 'Shreyas Iyer', 'shreyas.i@example.com', NULL, 100.00, 'Batsman', '2025-04-13 23:50:34'),
(110, 'Yuzvendra Chahal', 'yuzi.chahal@example.com', NULL, 100.00, 'Bowler', '2025-04-13 23:50:34'),
(111, 'Shikhar Dhawan', 'shikhar.d@example.com', NULL, 100.00, 'Batsman', '2025-04-13 23:50:34'),
(112, 'Bhuvneshwar Kumar', 'bhuvi.kumar@example.com', NULL, 100.00, 'Bowler', '2025-04-13 23:50:34'),
(113, 'Suryakumar Yadav', 'sky.yadav@example.com', NULL, 100.00, 'Batsman', '2025-04-13 23:50:34'),
(114, 'Ishan Kishan', 'ishan.k@example.com', NULL, 100.00, 'WicketKeeper', '2025-04-13 23:50:34'),
(115, 'Axar Patel', 'axar.patel@example.com', NULL, 100.00, 'AllRounder', '2025-04-13 23:50:34'),
(116, 'Kuldeep Yadav', 'kuldeep.yadav@example.com', NULL, 100.00, 'Bowler', '2025-04-13 23:50:34'),
(117, 'Sanju Samson', 'sanju.samson@example.com', NULL, 100.00, 'WicketKeeper', '2025-04-13 23:50:34'),
(118, 'Prithvi Shaw', 'prithvi.shaw@example.com', NULL, 100.00, 'Batsman', '2025-04-13 23:50:34'),
(119, 'Navdeep Saini', 'navdeep.saini@example.com', NULL, 100.00, 'Bowler', '2025-04-13 23:50:34'),
(120, 'Shubman Gill', 'shubman.gill@example.com', NULL, 100.00, 'Batsman', '2025-04-13 23:50:34'),
(121, 'Washington Sundar', 'washi.sundar@example.com', NULL, 100.00, 'AllRounder', '2025-04-13 23:50:34'),
(122, 'Mohammed Siraj', 'mohd.siraj@example.com', NULL, 100.00, 'Bowler', '2025-04-13 23:50:34'),
(123, 'Ruturaj Gaikwad', 'ruturaj.g@example.com', NULL, 100.00, 'Batsman', '2025-04-13 23:50:34'),
(124, 'Varun Chakravarthy', 'varun.c@example.com', NULL, 100.00, 'Bowler', '2025-04-13 23:50:34'),
(125, 'Venkatesh Iyer', 'venky.iyer@example.com', NULL, 100.00, 'AllRounder', '2025-04-13 23:50:34');

-- --------------------------------------------------------

--
-- Table structure for table `seasons`
--

CREATE TABLE `seasons` (
  `season_id` int(11) NOT NULL COMMENT 'Unique ID for the season',
  `year` int(11) NOT NULL COMMENT 'The calendar year the season primarily takes place in (e.g., 2024)',
  `name` varchar(100) NOT NULL COMMENT 'Descriptive name for the season (e.g., "MPL Summer 2024")',
  `start_date` date DEFAULT NULL COMMENT 'Approximate start date of the season',
  `end_date` date DEFAULT NULL COMMENT 'Approximate end date of the season',
  `status` enum('Planned','RegistrationOpen','Auction','Ongoing','Completed') NOT NULL DEFAULT 'Planned' COMMENT 'Current status of the season',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Timestamp when the season record was created'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores information about each tournament season';

--
-- Dumping data for table `seasons`
--

INSERT INTO `seasons` (`season_id`, `year`, `name`, `start_date`, `end_date`, `status`, `created_at`) VALUES
(1, 2024, 'MPL Box Bash 2024', '2024-07-01', '2024-07-31', 'Completed', '2025-04-13 23:50:34'),
(5, 2025, 'MPL2025 Apr', '2025-04-18', '2025-04-21', 'Planned', '2025-04-18 14:51:29');

-- --------------------------------------------------------

--
-- Table structure for table `teamplayers`
--

CREATE TABLE `teamplayers` (
  `team_player_id` int(11) NOT NULL COMMENT 'Unique ID for the player-team assignment in a season',
  `season_id` int(11) NOT NULL COMMENT 'Foreign key linking to the Seasons table',
  `team_id` int(11) NOT NULL COMMENT 'Foreign key linking to the Teams table',
  `player_id` int(11) NOT NULL COMMENT 'Foreign key linking to the Players table',
  `purchase_price` decimal(10,2) DEFAULT NULL COMMENT 'Price paid for the player in the auction (if applicable)',
  `is_captain` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Flag indicating if this player is the current captain of this team'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Links players to teams for a specific season, handling transfers/assignments';

--
-- Dumping data for table `teamplayers`
--

INSERT INTO `teamplayers` (`team_player_id`, `season_id`, `team_id`, `player_id`, `purchase_price`, `is_captain`) VALUES
(71, 1, 1, 101, NULL, 1),
(72, 1, 1, 108, NULL, 0),
(73, 1, 1, 113, NULL, 0),
(74, 1, 1, 116, NULL, 0),
(75, 1, 1, 121, NULL, 0),
(76, 1, 2, 102, NULL, 1),
(77, 1, 2, 106, NULL, 0),
(78, 1, 2, 110, NULL, 0),
(79, 1, 2, 114, NULL, 0),
(80, 1, 2, 122, NULL, 0),
(81, 1, 3, 107, NULL, 1),
(82, 1, 3, 103, NULL, 0),
(83, 1, 3, 109, NULL, 0),
(84, 1, 3, 115, NULL, 0),
(85, 1, 3, 123, NULL, 0),
(86, 1, 4, 104, NULL, 1),
(87, 1, 4, 111, NULL, 0),
(88, 1, 4, 112, NULL, 0),
(89, 1, 4, 120, NULL, 0),
(90, 1, 4, 124, NULL, 0),
(91, 1, 5, 105, NULL, 1),
(92, 1, 5, 117, NULL, 0),
(93, 1, 5, 118, NULL, 0),
(94, 1, 5, 119, NULL, 0),
(95, 1, 5, 125, NULL, 0),
(96, 5, 11, 115, 50.00, 0),
(97, 5, 11, 124, 50.00, 0),
(98, 5, 11, 106, 70.00, 0),
(99, 5, 11, 117, 130.00, 0),
(100, 5, 12, 112, 50.00, 0),
(101, 5, 12, 118, 50.00, 0),
(102, 5, 12, 111, 70.00, 0),
(103, 5, 12, 125, 130.00, 0),
(104, 5, 13, 114, 50.00, 0),
(105, 5, 13, 110, 50.00, 0),
(106, 5, 13, 122, 50.00, 0),
(107, 5, 13, 102, 150.00, 0),
(108, 5, 14, 109, 70.00, 0),
(109, 5, 14, 121, 30.00, 0),
(110, 5, 14, 113, 140.00, 0),
(111, 5, 14, 107, 60.00, 0),
(112, 5, 14, 123, NULL, 0),
(113, 5, 13, 105, NULL, 0),
(114, 5, 11, 101, NULL, 0),
(115, 5, 12, 104, NULL, 0),
(116, 5, 15, 120, NULL, 0),
(117, 5, 15, 103, 220.00, 0),
(118, 5, 15, 116, 50.00, 0),
(119, 5, 15, 108, 20.00, 0),
(120, 5, 15, 119, 10.00, 0);

-- --------------------------------------------------------

--
-- Table structure for table `teams`
--

CREATE TABLE `teams` (
  `team_id` int(11) NOT NULL COMMENT 'Unique ID for each team within a season',
  `season_id` int(11) NOT NULL COMMENT 'Foreign key linking to the Seasons table',
  `name` varchar(100) NOT NULL COMMENT 'Name of the team for this season',
  `captain_player_id` int(11) DEFAULT NULL COMMENT 'Foreign key linking to the Players table for the team captain (can be NULL initially)',
  `budget` decimal(10,2) DEFAULT 10000.00 COMMENT 'Auction budget allocated to the team (example value)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Timestamp when the team record was created'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores information about teams participating in a specific season';

--
-- Dumping data for table `teams`
--

INSERT INTO `teams` (`team_id`, `season_id`, `name`, `captain_player_id`, `budget`, `created_at`) VALUES
(1, 1, 'Box Blasters', 101, 10000.00, '2025-04-13 23:50:34'),
(2, 1, 'Crease Crashers', 102, 10000.00, '2025-04-13 23:50:34'),
(3, 1, 'Pitch Pirates', 107, 10000.00, '2025-04-13 23:50:34'),
(4, 1, 'Stump Smashers', 104, 10000.00, '2025-04-13 23:50:34'),
(5, 1, 'Boundary Bandits', 105, 10000.00, '2025-04-13 23:50:34'),
(11, 5, 'Dominators', 101, 300.00, '2025-04-18 14:53:22'),
(12, 5, 'Cornered Tigers', 104, 300.00, '2025-04-18 14:56:27'),
(13, 5, 'Gladiators', 105, 10000.00, '2025-04-18 14:58:08'),
(14, 5, 'Losing Kings', 123, 10000.00, '2025-04-18 14:59:54'),
(15, 5, 'Left Lifters', 120, 10000300.00, '2025-04-18 15:03:14');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`admin_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `ballbyball`
--
ALTER TABLE `ballbyball`
  ADD PRIMARY KEY (`ball_id`),
  ADD KEY `idx_ballbyball_match_inning_over_ball` (`match_id`,`inning_number`,`over_number`,`ball_number_in_over`),
  ADD KEY `idx_ballbyball_bowler` (`bowler_player_id`),
  ADD KEY `idx_ballbyball_batsman` (`batsman_on_strike_player_id`),
  ADD KEY `idx_ballbyball_fielder` (`fielder_player_id`);

--
-- Indexes for table `matches`
--
ALTER TABLE `matches`
  ADD PRIMARY KEY (`match_id`),
  ADD KEY `toss_winner_team_id` (`toss_winner_team_id`),
  ADD KEY `man_of_the_match_player_id` (`man_of_the_match_player_id`),
  ADD KEY `idx_matches_season` (`season_id`),
  ADD KEY `idx_matches_team1` (`team1_id`),
  ADD KEY `idx_matches_team2` (`team2_id`),
  ADD KEY `idx_matches_winner` (`winner_team_id`),
  ADD KEY `idx_matches_status` (`status`),
  ADD KEY `idx_matches_datetime` (`match_datetime`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `season_id` (`season_id`),
  ADD KEY `idx_payments_player_season` (`player_id`,`season_id`),
  ADD KEY `idx_payments_admin` (`recorded_by_admin_id`),
  ADD KEY `idx_payments_status` (`status`);

--
-- Indexes for table `playermatchstats`
--
ALTER TABLE `playermatchstats`
  ADD PRIMARY KEY (`stat_id`),
  ADD KEY `idx_playermatchstats_match` (`match_id`),
  ADD KEY `idx_playermatchstats_player` (`player_id`),
  ADD KEY `idx_playermatchstats_team` (`team_id`);

--
-- Indexes for table `playerratings`
--
ALTER TABLE `playerratings`
  ADD PRIMARY KEY (`rating_id`),
  ADD UNIQUE KEY `unique_rating_per_season` (`season_id`,`rated_player_id`,`rater_player_id`),
  ADD KEY `rated_player_id` (`rated_player_id`),
  ADD KEY `idx_playerratings_season_rated` (`season_id`,`rated_player_id`),
  ADD KEY `idx_playerratings_rater` (`rater_player_id`);

--
-- Indexes for table `players`
--
ALTER TABLE `players`
  ADD PRIMARY KEY (`player_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_players_name` (`name`);

--
-- Indexes for table `seasons`
--
ALTER TABLE `seasons`
  ADD PRIMARY KEY (`season_id`),
  ADD UNIQUE KEY `year` (`year`);

--
-- Indexes for table `teamplayers`
--
ALTER TABLE `teamplayers`
  ADD PRIMARY KEY (`team_player_id`),
  ADD UNIQUE KEY `unique_player_per_season` (`season_id`,`player_id`),
  ADD KEY `idx_teamplayers_team` (`team_id`),
  ADD KEY `idx_teamplayers_player` (`player_id`);

--
-- Indexes for table `teams`
--
ALTER TABLE `teams`
  ADD PRIMARY KEY (`team_id`),
  ADD KEY `idx_teams_season` (`season_id`),
  ADD KEY `idx_teams_captain` (`captain_player_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `admin_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Unique ID for admin users', AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `ballbyball`
--
ALTER TABLE `ballbyball`
  MODIFY `ball_id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'Unique ID for each ball bowled', AUTO_INCREMENT=206;

--
-- AUTO_INCREMENT for table `matches`
--
ALTER TABLE `matches`
  MODIFY `match_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Unique ID for each match', AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Unique ID for each payment transaction', AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `playermatchstats`
--
ALTER TABLE `playermatchstats`
  MODIFY `stat_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Unique ID for a player stats record in a specific match', AUTO_INCREMENT=729;

--
-- AUTO_INCREMENT for table `playerratings`
--
ALTER TABLE `playerratings`
  MODIFY `rating_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Unique ID for each rating submission';

--
-- AUTO_INCREMENT for table `players`
--
ALTER TABLE `players`
  MODIFY `player_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Unique ID for each player', AUTO_INCREMENT=126;

--
-- AUTO_INCREMENT for table `seasons`
--
ALTER TABLE `seasons`
  MODIFY `season_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Unique ID for the season', AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `teamplayers`
--
ALTER TABLE `teamplayers`
  MODIFY `team_player_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Unique ID for the player-team assignment in a season', AUTO_INCREMENT=121;

--
-- AUTO_INCREMENT for table `teams`
--
ALTER TABLE `teams`
  MODIFY `team_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Unique ID for each team within a season', AUTO_INCREMENT=16;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `ballbyball`
--
ALTER TABLE `ballbyball`
  ADD CONSTRAINT `ballbyball_ibfk_1` FOREIGN KEY (`match_id`) REFERENCES `matches` (`match_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ballbyball_ibfk_2` FOREIGN KEY (`bowler_player_id`) REFERENCES `players` (`player_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `ballbyball_ibfk_3` FOREIGN KEY (`batsman_on_strike_player_id`) REFERENCES `players` (`player_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `ballbyball_ibfk_4` FOREIGN KEY (`fielder_player_id`) REFERENCES `players` (`player_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `matches`
--
ALTER TABLE `matches`
  ADD CONSTRAINT `matches_ibfk_1` FOREIGN KEY (`season_id`) REFERENCES `seasons` (`season_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `matches_ibfk_2` FOREIGN KEY (`team1_id`) REFERENCES `teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `matches_ibfk_3` FOREIGN KEY (`team2_id`) REFERENCES `teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `matches_ibfk_4` FOREIGN KEY (`toss_winner_team_id`) REFERENCES `teams` (`team_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `matches_ibfk_5` FOREIGN KEY (`winner_team_id`) REFERENCES `teams` (`team_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `matches_ibfk_6` FOREIGN KEY (`man_of_the_match_player_id`) REFERENCES `players` (`player_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`player_id`) REFERENCES `players` (`player_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`season_id`) REFERENCES `seasons` (`season_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `payments_ibfk_3` FOREIGN KEY (`recorded_by_admin_id`) REFERENCES `admins` (`admin_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `playermatchstats`
--
ALTER TABLE `playermatchstats`
  ADD CONSTRAINT `playermatchstats_ibfk_1` FOREIGN KEY (`match_id`) REFERENCES `matches` (`match_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `playermatchstats_ibfk_2` FOREIGN KEY (`player_id`) REFERENCES `players` (`player_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `playermatchstats_ibfk_3` FOREIGN KEY (`team_id`) REFERENCES `teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `playerratings`
--
ALTER TABLE `playerratings`
  ADD CONSTRAINT `playerratings_ibfk_1` FOREIGN KEY (`season_id`) REFERENCES `seasons` (`season_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `playerratings_ibfk_2` FOREIGN KEY (`rated_player_id`) REFERENCES `players` (`player_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `playerratings_ibfk_3` FOREIGN KEY (`rater_player_id`) REFERENCES `players` (`player_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `teamplayers`
--
ALTER TABLE `teamplayers`
  ADD CONSTRAINT `teamplayers_ibfk_1` FOREIGN KEY (`season_id`) REFERENCES `seasons` (`season_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `teamplayers_ibfk_2` FOREIGN KEY (`team_id`) REFERENCES `teams` (`team_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `teamplayers_ibfk_3` FOREIGN KEY (`player_id`) REFERENCES `players` (`player_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `teams`
--
ALTER TABLE `teams`
  ADD CONSTRAINT `teams_ibfk_1` FOREIGN KEY (`season_id`) REFERENCES `seasons` (`season_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `teams_ibfk_2` FOREIGN KEY (`captain_player_id`) REFERENCES `players` (`player_id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
