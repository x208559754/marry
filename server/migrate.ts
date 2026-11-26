// server/migrate.ts — 启动时的增量迁移（只增不删，可重复执行）
// MySQL 8.4 不支持 ADD COLUMN IF NOT EXISTS，先查 information_schema 再加列
import type mysql from 'mysql2/promise'

const TABLES = [
  `CREATE TABLE IF NOT EXISTS orders (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`,
  `CREATE TABLE IF NOT EXISTS moderation_logs (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`,
  // 套餐定义（平台总后台可增删改；首次使用时由 src/billing.ts 按旧 config.pricing 自动写入免费版/高级版/至尊版）
  `CREATE TABLE IF NOT EXISTS plans (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`,
  // 套餐变更记录（购买 / 手动设置 / 单独调整权益 / 退款降级）
  `CREATE TABLE IF NOT EXISTS plan_logs (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`,
  // 试用账号（按微信 openid 绑定手机号、保存登录密码哈希）
  `CREATE TABLE IF NOT EXISTS accounts (
    openid VARCHAR(128) NOT NULL PRIMARY KEY,
    phone VARCHAR(32) NULL,
    password_hash VARCHAR(255) NULL,
    created_at VARCHAR(40) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
    updated_at VARCHAR(40) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
    UNIQUE KEY uq_accounts_phone (phone)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`,
  // 平台总后台账号（密码为 scrypt 加盐哈希；首次启动由 PLATFORM_ADMIN_PASSWORD 写入）
  `CREATE TABLE IF NOT EXISTS platform_admins (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT 'admin',
    password_hash VARCHAR(255) NOT NULL,
    updated_at VARCHAR(40) NOT NULL DEFAULT (DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')),
    UNIQUE KEY uq_platform_admins_user (username)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`,
]

const COLUMNS: [string, string, string][] = [
  ['weddings', 'plan', "VARCHAR(16) NOT NULL DEFAULT 'free'"],
  ['weddings', 'plan_activated_at', 'VARCHAR(40) NULL'],
  ['weddings', 'plan_order_no', 'VARCHAR(64) NULL'],
  ['weddings', 'status', "VARCHAR(16) NOT NULL DEFAULT 'active'"],
  ['weddings', 'disabled_reason', 'VARCHAR(255) NULL'],
  ['weddings', 'plan_expires_at', 'VARCHAR(40) NULL'],
  ['weddings', 'plan_overrides', 'TEXT NULL'],
  ['weddings', 'plan_note', 'VARCHAR(255) NULL'],
  ['blessings', 'status', "VARCHAR(16) NOT NULL DEFAULT 'visible'"],
  ['images', 'status', "VARCHAR(16) NOT NULL DEFAULT 'visible'"],
  ['images', 'kind', "VARCHAR(16) NOT NULL DEFAULT 'image'"],
]

export async function migrate(pool: mysql.Pool) {
  for (const sql of TABLES) await pool.query(sql)
  let planAdded = false
  for (const [table, col, def] of COLUMNS) {
    const [rows] = (await pool.query(
      'SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [table, col],
    )) as any
    if (Number(rows[0].n) > 0) continue
    await pool.query('ALTER TABLE `' + table + '` ADD COLUMN `' + col + '` ' + def)
    console.log('migrate: added ' + table + '.' + col)
    if (table === 'weddings' && col === 'plan') planAdded = true
  }
  // 首次引入套餐：已存在的婚礼全部记为高级版（不影响老用户已有功能）；之后新建的婚礼默认免费版
  if (planAdded) {
    await pool.query("UPDATE weddings SET plan = 'premium', plan_activated_at = DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%dT%H:%i:%sZ'), plan_order_no = 'GRANDFATHERED'")
    console.log('migrate: existing weddings set to premium (grandfathered)')
  }
  // 七牛视频访问域名：写入 config 表，改库即可切换，不必重启
  await pool.query(
    "INSERT IGNORE INTO config (`key`, value, updated_at) VALUES ('qiniu_domain', 'https://qn.youxitie.site', DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%dT%H:%i:%sZ'))",
  )
}
