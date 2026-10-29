-- 照片表：保存 ImgBB 返回的图片信息
CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  imgbb_id TEXT NOT NULL,      -- ImgBB 上的图片 ID
  title TEXT,                  -- 用户填写的标题（可选）
  url TEXT NOT NULL,           -- 原图地址（i.ibb.co/...）
  thumb_url TEXT NOT NULL,     -- 缩略图地址
  delete_url TEXT,             -- ImgBB 提供的删除链接
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 以下为婚礼小程序（wxapp）后台所用表（迁移自 Notion，2026-10）
-- ============================================================

-- 微信用户表：每个 openid 一行
CREATE TABLE IF NOT EXISTS users (
  openid TEXT PRIMARY KEY,              -- 微信 OpenID
  name TEXT,                            -- 昵称/称谓
  phone TEXT,                           -- 手机号
  avatar_url TEXT,                      -- 头像（http(s) 地址）
  blessing TEXT,                        -- 最近一次祝福寄语
  first_seen TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen TEXT NOT NULL DEFAULT (datetime('now')),
  login_count INTEGER NOT NULL DEFAULT 0
);

-- 宾客回执表：openid 唯一（预填行 openid 为 NULL，SQLite UNIQUE 允许多个 NULL）
CREATE TABLE IF NOT EXISTS rsvps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  openid TEXT UNIQUE,                   -- 微信 OpenID（新人预填时为空，宾客登录后回填）
  source TEXT NOT NULL DEFAULT 'auto',  -- prefill=新人预填 / auto=访问自动预建 / form=正式提交
  name TEXT NOT NULL,                   -- 宾客姓名或称谓
  phone TEXT,                           -- 手机号
  attending TEXT NOT NULL DEFAULT 'yes',-- yes=出席 / no=缺席
  guest_count INTEGER NOT NULL DEFAULT 1,     -- 同行人数
  dietary TEXT,                         -- 饮食偏好（中文原文，如 正常荤素/清真风味）
  need_shuttle INTEGER NOT NULL DEFAULT 0,    -- 是否需要接驳班车 0/1
  blessing TEXT,                        -- 祝福寄语
  avatar_url TEXT,                      -- 头像
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 祝福弹幕留言表
CREATE TABLE IF NOT EXISTS blessings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  openid TEXT,                          -- 发表者 openid（游客可空）
  author TEXT,                          -- 署名
  content TEXT NOT NULL,                -- 祝福内容
  avatar_url TEXT,                      -- 头像（http(s) 地址）
  likes INTEGER NOT NULL DEFAULT 0,     -- 点赞数
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 通用键值配置表：key='wedding' 存婚礼配置 JSON；key='wx_access_token' 缓存微信 access_token
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
