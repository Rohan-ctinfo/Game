SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(32) NOT NULL UNIQUE,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(512) NULL,
  elo_ludo INT NOT NULL DEFAULT 1000,
  elo_pool INT NOT NULL DEFAULT 1000,
  elo_carrom INT NOT NULL DEFAULT 1000,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_seen_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_users_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS game_types (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(24) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS game_rooms (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_code VARCHAR(32) NOT NULL UNIQUE,
  game_type_id SMALLINT UNSIGNED NOT NULL,
  host_user_id BIGINT UNSIGNED NOT NULL,
  status ENUM('WAITING','ACTIVE','FINISHED','CANCELLED') NOT NULL DEFAULT 'WAITING',
  max_players TINYINT UNSIGNED NOT NULL,
  region VARCHAR(16) NOT NULL DEFAULT 'global',
  settings_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME NULL,
  ended_at DATETIME NULL,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_rooms_game_type FOREIGN KEY (game_type_id) REFERENCES game_types(id),
  CONSTRAINT fk_rooms_host_user FOREIGN KEY (host_user_id) REFERENCES users(id),
  INDEX idx_rooms_status_type_region (status, game_type_id, region)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS matches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  game_type_id SMALLINT UNSIGNED NOT NULL,
  room_id BIGINT UNSIGNED NULL,
  status ENUM('PENDING','ONGOING','COMPLETED','ABORTED') NOT NULL DEFAULT 'PENDING',
  started_at DATETIME NULL,
  ended_at DATETIME NULL,
  winner_user_id BIGINT UNSIGNED NULL,
  metadata_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_matches_game_type FOREIGN KEY (game_type_id) REFERENCES game_types(id),
  CONSTRAINT fk_matches_room FOREIGN KEY (room_id) REFERENCES game_rooms(id),
  CONSTRAINT fk_matches_winner FOREIGN KEY (winner_user_id) REFERENCES users(id),
  INDEX idx_matches_type_status_started (game_type_id, status, started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS match_participants (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  match_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  seat_no TINYINT UNSIGNED NOT NULL,
  outcome ENUM('WIN','LOSS','DRAW','DNF') NULL,
  score INT NOT NULL DEFAULT 0,
  elo_before INT NOT NULL,
  elo_after INT NOT NULL,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  left_at DATETIME NULL,
  CONSTRAINT fk_mp_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_mp_user FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY uq_match_user (match_id, user_id),
  UNIQUE KEY uq_match_seat (match_id, seat_no),
  INDEX idx_mp_user_joined (user_id, joined_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS moves (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  match_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  turn_no INT UNSIGNED NOT NULL,
  move_no INT UNSIGNED NOT NULL,
  action_type VARCHAR(32) NOT NULL,
  payload_json JSON NOT NULL,
  server_tick BIGINT UNSIGNED NULL,
  is_valid TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_moves_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_moves_user FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY uq_move_seq (match_id, turn_no, move_no),
  INDEX idx_moves_match_created (match_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leaderboard (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  game_type_id SMALLINT UNSIGNED NOT NULL,
  season_key VARCHAR(32) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  rating INT NOT NULL,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  draws INT NOT NULL DEFAULT 0,
  matches_played INT NOT NULL DEFAULT 0,
  rank_position INT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lb_game_type FOREIGN KEY (game_type_id) REFERENCES game_types(id),
  CONSTRAINT fk_lb_user FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY uq_lb_user (game_type_id, season_key, user_id),
  INDEX idx_lb_rating (game_type_id, season_key, rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  refresh_token_hash VARCHAR(255) NOT NULL,
  jwt_jti VARCHAR(64) NOT NULL,
  ip_address VARBINARY(16) NULL,
  user_agent VARCHAR(512) NULL,
  is_revoked TINYINT(1) NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_sessions_jti (jwt_jti),
  INDEX idx_sessions_user_active (user_id, is_revoked, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS friends (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  requester_id BIGINT UNSIGNED NOT NULL,
  addressee_id BIGINT UNSIGNED NOT NULL,
  status ENUM('PENDING','ACCEPTED','BLOCKED','DECLINED') NOT NULL DEFAULT 'PENDING',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_friends_req FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_friends_add FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_no_self_friend CHECK (requester_id <> addressee_id),
  UNIQUE KEY uq_friend_pair (requester_id, addressee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  transaction_type ENUM('DEPOSIT','WITHDRAWAL','ENTRY_FEE','PRIZE','REFUND','PURCHASE') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status ENUM('PENDING','SUCCESS','FAILED','REVERSED') NOT NULL DEFAULT 'PENDING',
  external_ref VARCHAR(128) NULL,
  metadata_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_tx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS game_results (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  match_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  rank_position TINYINT UNSIGNED NOT NULL,
  score INT NOT NULL DEFAULT 0,
  rewards_json JSON NULL,
  stats_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_results_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_results_user FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY uq_result_match_user (match_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO game_types (code, name, is_enabled)
VALUES ('LUDO', 'Ludo', 1), ('POOL_8BALL', '8 Ball Pool', 1), ('CARROM', 'Carrom', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), is_enabled = VALUES(is_enabled);
