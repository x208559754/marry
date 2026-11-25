-- server/schema.mysql.sql — 有囍請柬 MySQL 8 表结构（由 schema.sql 的 SQLite 版本转换；可重复执行）
-- 时间列保持与 D1 相同的文本格式（ISO 字符串或 'YYYY-MM-DD HH:MM:SS' UTC），业务代码无需改动
-- 排序规则使用 utf8mb4_bin：openid / wid 区分大小写，与 SQLite 行为一致
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS weddings (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  groom_name VARCHAR(128) NULL,
  bride_name VARCHAR(128) NULL,
  config MEDIUMTEXT NULL,
  created_at VARCHAR(40) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  updated_at VARCHAR(40) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  plan VARCHAR(16) NOT NULL DEFAULT 'free',
  plan_activated_at VARCHAR(40) NULL,
  plan_order_no VARCHAR(64) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  disabled_reason VARCHAR(255) NULL,
  plan_expires_at VARCHAR(40) NULL,
  plan_overrides TEXT NULL,
  plan_note VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS images (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  wedding_id VARCHAR(64) NOT NULL DEFAULT 'demo',
  imgbb_id VARCHAR(191) NOT NULL,
  title VARCHAR(255) NULL,
  url VARCHAR(1024) NOT NULL,
  thumb_url VARCHAR(1024) NOT NULL,
  delete_url VARCHAR(1024) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'visible',
  created_at VARCHAR(40) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  KEY idx_images_wedding (wedding_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS users (
  openid VARCHAR(128) NOT NULL,
  wedding_id VARCHAR(64) NOT NULL DEFAULT 'demo',
  name VARCHAR(128) NULL,
  phone VARCHAR(32) NULL,
  avatar_url VARCHAR(1024) NULL,
  blessing TEXT NULL,
  is_admin TINYINT NOT NULL DEFAULT 0,
  first_seen VARCHAR(40) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  last_seen VARCHAR(40) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  login_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (openid, wedding_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- (wedding_id, openid) 唯一；openid 为 NULL 的预填行可以有多条（MySQL UNIQUE 允许多个 NULL）
CREATE TABLE IF NOT EXISTS rsvps (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  wedding_id VARCHAR(64) NOT NULL DEFAULT 'demo',
  openid VARCHAR(128) NULL,
  source VARCHAR(16) NOT NULL DEFAULT 'auto',
  name VARCHAR(128) NOT NULL,
  phone VARCHAR(32) NULL,
  attending VARCHAR(8) NOT NULL DEFAULT 'yes',
  guest_count INT NOT NULL DEFAULT 1,
  dietary VARCHAR(255) NULL,
  need_shuttle TINYINT NOT NULL DEFAULT 0,
  blessing TEXT NULL,
  avatar_url VARCHAR(1024) NULL,
  submitted_at VARCHAR(40) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  updated_at VARCHAR(40) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  UNIQUE KEY uq_rsvps_wedding_openid (wedding_id, openid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS blessings (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  wedding_id VARCHAR(64) NOT NULL DEFAULT 'demo',
  openid VARCHAR(128) NULL,
  author VARCHAR(128) NULL,
  content TEXT NOT NULL,
  avatar_url VARCHAR(1024) NULL,
  likes INT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'visible',
  created_at VARCHAR(40) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  KEY idx_blessings_wedding (wedding_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS config (
  `key` VARCHAR(128) NOT NULL PRIMARY KEY,
  value MEDIUMTEXT NOT NULL,
  updated_at VARCHAR(40) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

INSERT IGNORE INTO config (`key`, value) VALUES ('super_admin_passcode', 'root@123');

CREATE TABLE IF NOT EXISTS heart_clicks (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  wedding_id VARCHAR(64) NOT NULL,
  openid VARCHAR(128) NULL,
  created_at VARCHAR(40) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  KEY idx_heart_clicks_wedding (wedding_id),
  KEY idx_heart_clicks_wid_openid (wedding_id, openid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS lotteries (
  wedding_id VARCHAR(64) NOT NULL PRIMARY KEY,
  config MEDIUMTEXT NULL,
  state MEDIUMTEXT NULL,
  updated_at VARCHAR(40) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 收费订单 / 内容安全记录（老库由 server/migrate.ts 启动时自动补齐）
CREATE TABLE IF NOT EXISTS orders (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  out_trade_no VARCHAR(64) NOT NULL,
  wedding_id VARCHAR(64) NOT NULL,
  openid VARCHAR(128) NULL,
  product VARCHAR(32) NOT NULL DEFAULT 'premium',
  description VARCHAR(255) NOT NULL DEFAULT '',
  amount_fen INT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  pay_mode VARCHAR(16) NOT NULL DEFAULT 'wxpay',
  prepay_id VARCHAR(128) NULL,
  transaction_id VARCHAR(64) NULL,
  paid_at VARCHAR(40) NULL,
  refunded_at VARCHAR(40) NULL,
  refund_fen INT NULL,
  note VARCHAR(255) NULL,
  notify_payload MEDIUMTEXT NULL,
  created_at VARCHAR(40) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  updated_at VARCHAR(40) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  UNIQUE KEY uq_orders_no (out_trade_no),
  KEY idx_orders_wedding (wedding_id),
  KEY idx_orders_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS moderation_logs (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  wedding_id VARCHAR(64) NOT NULL,
  openid VARCHAR(128) NULL,
  kind VARCHAR(8) NOT NULL DEFAULT 'text',
  scene TINYINT NOT NULL DEFAULT 2,
  target_type VARCHAR(32) NOT NULL,
  target_id VARCHAR(64) NULL,
  content TEXT NULL,
  result VARCHAR(16) NOT NULL,
  label INT NULL,
  suggest VARCHAR(16) NULL,
  trace_id VARCHAR(128) NULL,
  detail TEXT NULL,
  handled VARCHAR(16) NOT NULL DEFAULT 'none',
  created_at VARCHAR(40) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  KEY idx_mod_wedding (wedding_id),
  KEY idx_mod_result (result),
  KEY idx_mod_trace (trace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 多档套餐定义与套餐变更记录（与 server/migrate.ts 一致）
CREATE TABLE IF NOT EXISTS plans (
  code VARCHAR(16) NOT NULL PRIMARY KEY,
  name VARCHAR(40) NOT NULL,
  level INT NOT NULL DEFAULT 0,
  price_fen INT NOT NULL DEFAULT 0,
  original_fen INT NULL,
  days INT NOT NULL DEFAULT 0,
  description VARCHAR(255) NULL,
  features TEXT NULL,
  ent TEXT NULL,
  active TINYINT NOT NULL DEFAULT 1,
  sort INT NOT NULL DEFAULT 0,
  created_at VARCHAR(40) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  updated_at VARCHAR(40) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS plan_logs (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  wedding_id VARCHAR(64) NOT NULL,
  action VARCHAR(16) NOT NULL,
  from_plan VARCHAR(16) NULL,
  to_plan VARCHAR(16) NULL,
  expires_at VARCHAR(40) NULL,
  note VARCHAR(255) NULL,
  detail TEXT NULL,
  operator VARCHAR(32) NOT NULL DEFAULT 'system',
  created_at VARCHAR(40) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  KEY idx_planlog_wedding (wedding_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- 平台总后台账号（密码为 scrypt 加盐哈希；与 server/migrate.ts 一致）
CREATE TABLE IF NOT EXISTS platform_admins (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL DEFAULT 'admin',
  password_hash VARCHAR(255) NOT NULL,
  updated_at VARCHAR(40) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
  UNIQUE KEY uq_platform_admins_user (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

