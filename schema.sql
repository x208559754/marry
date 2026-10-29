-- ============================================================
-- marry 数据库结构（多租户：每场婚礼一套数据，按 wedding_id 隔离）
-- 所有语句均可重复执行（IF NOT EXISTS）
-- ============================================================

-- 婚礼（租户）：id 即扫码进入用的短标识（写进小程序码 scene 参数）
CREATE TABLE IF NOT EXISTS weddings (
  id TEXT PRIMARY KEY,               -- 婚礼标识（2-32 位 字母/数字/下划线/中划线）
  groom_name TEXT,                   -- 新郎姓名（列表展示用）
  bride_name TEXT,                   -- 新娘姓名（列表展示用）
  config TEXT,                       -- 婚礼配置 JSON（见 GET /api/config?wid=）
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 照片表：保存 ImgBB 返回的图片信息（按婚礼隔离）
CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id TEXT NOT NULL DEFAULT 'demo',
  imgbb_id TEXT NOT NULL,            -- ImgBB 上的图片 ID
  title TEXT,                        -- 用户填写的标题（可选）
  url TEXT NOT NULL,                 -- 原图地址（i.ibb.co/...）
  thumb_url TEXT NOT NULL,           -- 缩略图地址
  delete_url TEXT,                   -- ImgBB 提供的删除链接
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 用户表：(openid, 婚礼) 一行；is_admin=1 表示该婚礼的管理员
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

-- 宾客回执表：(婚礼, openid) 唯一；预填行 openid 为 NULL（SQLite UNIQUE 允许多个 NULL）
CREATE TABLE IF NOT EXISTS rsvps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id TEXT NOT NULL DEFAULT 'demo',
  openid TEXT,                       -- 微信 OpenID（新人预填时为空，宾客登录后回填）
  source TEXT NOT NULL DEFAULT 'auto', -- prefill=新人预填 / auto=访问自动预建 / form=正式提交
  name TEXT NOT NULL,                -- 宾客姓名或称谓
  phone TEXT,                        -- 手机号
  attending TEXT NOT NULL DEFAULT 'yes', -- yes=出席 / no=缺席
  guest_count INTEGER NOT NULL DEFAULT 1,
  dietary TEXT,                      -- 饮食偏好（中文原文）
  need_shuttle INTEGER NOT NULL DEFAULT 0,
  blessing TEXT,
  avatar_url TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (wedding_id, openid)
);

-- 祝福弹幕留言表（按婚礼隔离）
CREATE TABLE IF NOT EXISTS blessings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_id TEXT NOT NULL DEFAULT 'demo',
  openid TEXT,                       -- 发表者 openid（游客可空）
  author TEXT,
  content TEXT NOT NULL,
  avatar_url TEXT,
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 平台级键值配置：key='wx_access_token' 缓存 access_token；key='promo' 推广页文案
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
