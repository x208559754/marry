// src/platform-password.ts — 总后台密码：scrypt 加盐哈希，只存数据库，不明文
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const KEY_LEN = 32
const N = 16384
const R = 8
const P = 1

export type AdminRow = { id: number; username: string; password_hash: string; updated_at: string }

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16)
  const buf = (await scryptAsync(plain, salt, KEY_LEN, { N, r: R, p: P })) as Buffer
  return ['scrypt', String(N), String(R), String(P), salt.toString('base64url'), buf.toString('base64url')].join('$')
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  try {
    const parts = String(stored || '').split('$')
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false
    const n = Number(parts[1]), r = Number(parts[2]), p = Number(parts[3])
    if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p) || n < 1024 || n > 1 << 20) return false
    const salt = Buffer.from(parts[4], 'base64url')
    const want = Buffer.from(parts[5], 'base64url')
    if (salt.length < 8 || want.length < 16) return false
    const got = (await scryptAsync(plain, salt, want.length, { N: n, r, p })) as Buffer
    if (got.length !== want.length) return false
    return timingSafeEqual(got, want)
  } catch {
    return false
  }
}

export async function getAdminRow(db: D1Database, username = 'admin'): Promise<AdminRow | null> {
  return (await db.prepare('SELECT id, username, password_hash, updated_at FROM platform_admins WHERE username = ?').bind(username).first<AdminRow>()) || null
}

// 库中还没有哈希时，用环境变量 PLATFORM_ADMIN_PASSWORD 写入一条；之后以数据库为准
export async function ensurePlatformAdmin(db: D1Database, envPassword: string, username = 'admin'): Promise<AdminRow | null> {
  const existing = await getAdminRow(db, username)
  if (existing?.password_hash) return existing
  const seed = String(envPassword || '')
  if (!seed) return existing
  const hash = await hashPassword(seed)
  await db.prepare("INSERT OR IGNORE INTO platform_admins (username, password_hash, updated_at) VALUES (?, ?, datetime('now'))").bind(username, hash).run()
  return getAdminRow(db, username)
}

export async function updateAdminPassword(db: D1Database, username: string, hash: string) {
  await db.prepare("UPDATE platform_admins SET password_hash = ?, updated_at = datetime('now') WHERE username = ?").bind(hash, username).run()
}
