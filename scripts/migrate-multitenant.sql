-- scripts/migrate-multitenant.sql — 单婚礼 → 多租户迁移（非破坏性：旧表改名保留、数据全部拷贝）
-- 用法（只跑一次）：npx wrangler d1 execute marry-images --remote --file=scripts/migrate-multitenant.sql -y
-- 迁移后旧表保留为 users_backup_20261029 / rsvps_backup_20261029，确认无误后可自行 DROP。

-- 1) 旧表改名备份（不删除任何数据）
ALTER TABLE users RENAME TO users_backup_20261029;
ALTER TABLE rsvps RENAME TO rsvps_backup_20261029;

-- 2) 建新结构
CREATE TABLE IF NOT EXISTS weddings (
  id TEXT PRIMARY KEY,
  groom_name TEXT,
  bride_name TEXT,
  config TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS users (
  openid TEXT NOT NULL,
  wedding_id TEXT NOT NULL DEFAULT 'demo',
  name TEXT,
  phone TEXT,
  avatar_url TEXT,
  blessing TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  first_seen TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen TEXT NOT NULL DEFAULT (datetime('now')),
  login_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (openid, wedding_id)
);
CREATE TABLE IF NOT EXISTS rsvps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id TEXT NOT NULL DEFAULT 'demo',
  openid TEXT,
  source TEXT NOT NULL DEFAULT 'auto',
  name TEXT NOT NULL,
  phone TEXT,
  attending TEXT NOT NULL DEFAULT 'yes',
  guest_count INTEGER NOT NULL DEFAULT 1,
  dietary TEXT,
  need_shuttle INTEGER NOT NULL DEFAULT 0,
  blessing TEXT,
  avatar_url TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (wedding_id, openid)
);

-- 3) 拷贝旧数据（归入 demo 婚礼；原用户设为该婚礼管理员）
INSERT INTO users (openid, wedding_id, name, phone, avatar_url, blessing, is_admin, first_seen, last_seen, login_count)
SELECT openid, 'demo', name, phone, avatar_url, blessing, 1, first_seen, last_seen, login_count
FROM users_backup_20261029;

INSERT INTO rsvps (wedding_id, openid, source, name, phone, attending, guest_count, dietary, need_shuttle, blessing, avatar_url, submitted_at, updated_at)
SELECT 'demo', openid, source, name, phone, attending, guest_count, dietary, need_shuttle, blessing, avatar_url, submitted_at, updated_at
FROM rsvps_backup_20261029;

-- 4) images / blessings 直接加列（已有行自动归入 'demo'）
ALTER TABLE images ADD COLUMN wedding_id TEXT NOT NULL DEFAULT 'demo';
ALTER TABLE blessings ADD COLUMN wedding_id TEXT NOT NULL DEFAULT 'demo';

-- 5) 建档 demo 婚礼（取原 config 表里的婚礼配置；原键保留不删）
INSERT INTO weddings (id, groom_name, bride_name, config)
SELECT 'demo', json_extract(value,'$.groom.name'), json_extract(value,'$.bride.name'), value
FROM config WHERE key='wedding'
ON CONFLICT(id) DO UPDATE SET config=excluded.config;
