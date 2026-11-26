// src/account.ts — 试用账号：按 openid 绑定手机号、设置登录密码（scrypt 哈希，不明文）
import { hashPassword, verifyPassword } from './platform-password'

export const PHONE_RE = /^1[3-9]\d{9}$/
export const PASSWORD_MIN = 6
export const PASSWORD_MAX = 64

export type AccountRow = {
  openid: string
  phone: string | null
  password_hash: string | null
  created_at?: string
  updated_at?: string
}

export type AccountStatus = {
  openid: string
  phoneBound: boolean
  hasPassword: boolean
  phoneMasked: string
  ready: boolean
}

export function maskPhone(phone: string | null | undefined): string {
  const p = String(phone || '').trim()
  if (!PHONE_RE.test(p)) return ''
  return p.slice(0, 3) + '****' + p.slice(7)
}

export function normalizePhone(raw: unknown): string {
  return String(raw || '').replace(/\s+/g, '').replace(/^\+86/, '').trim()
}

export function validatePhone(raw: unknown): string | null {
  const p = normalizePhone(raw)
  if (!p) return '请填写手机号'
  if (!PHONE_RE.test(p)) return '请填写有效的 11 位大陆手机号'
  return null
}

export function validatePassword(raw: unknown): string | null {
  const s = typeof raw === 'string' ? raw : ''
  if (!s) return '请设置登录密码'
  if (s.length < PASSWORD_MIN) return '密码至少 ' + PASSWORD_MIN + ' 位'
  if (s.length > PASSWORD_MAX) return '密码过长'
  if (/^\s+$/.test(s)) return '密码不能是空白字符'
  return null
}

export async function getAccount(db: { prepare: (sql: string) => any }, openid: string): Promise<AccountRow | null> {
  if (!openid) return null
  return (
    (await db
      .prepare('SELECT openid, phone, password_hash, created_at, updated_at FROM accounts WHERE openid = ?')
      .bind(openid)
      .first<AccountRow>()) || null
  )
}

/** 账号表没有手机号时，回看 users 表里这个 openid 已填过的手机号。 */
export async function findExistingPhone(db: { prepare: (sql: string) => any }, openid: string): Promise<string> {
  const row = await db
    .prepare("SELECT phone FROM users WHERE openid = ? AND phone IS NOT NULL AND phone <> '' ORDER BY last_seen DESC LIMIT 1")
    .bind(openid)
    .first<{ phone: string }>()
  const p = normalizePhone(row?.phone)
  return PHONE_RE.test(p) ? p : ''
}

export function statusOf(openid: string, row: AccountRow | null, fallbackPhone = ''): AccountStatus {
  const phone = normalizePhone(row?.phone) || fallbackPhone
  const phoneBound = PHONE_RE.test(phone)
  const hasPassword = Boolean(row?.password_hash)
  return {
    openid,
    phoneBound,
    hasPassword,
    phoneMasked: maskPhone(phone),
    ready: phoneBound && hasPassword,
  }
}

export async function upsertAccount(
  db: { prepare: (sql: string) => any },
  openid: string,
  fields: { phone?: string; password?: string },
): Promise<AccountRow> {
  const now = new Date().toISOString()
  const existing = await getAccount(db, openid)
  let phone = existing?.phone || null
  let passwordHash = existing?.password_hash || null
  if (fields.phone) phone = normalizePhone(fields.phone)
  if (fields.password) passwordHash = await hashPassword(fields.password)
  await db
    .prepare(
      'INSERT INTO accounts (openid, phone, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ' +
        'ON CONFLICT(openid) DO UPDATE SET phone = excluded.phone, password_hash = excluded.password_hash, updated_at = excluded.updated_at',
    )
    .bind(openid, phone, passwordHash, now, now)
    .run()
  return (await getAccount(db, openid)) as AccountRow
}

export async function phoneTakenByOther(db: { prepare: (sql: string) => any }, phone: string, openid: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT openid FROM accounts WHERE phone = ? AND openid <> ? LIMIT 1')
    .bind(phone, openid)
    .first<{ openid: string }>()
  return Boolean(row)
}

export async function listAdminWeddings(db: { prepare: (sql: string) => any }, openid: string) {
  const { results } = await db
    .prepare(
      'SELECT w.id, w.groom_name, w.bride_name, w.plan, w.created_at, w.updated_at ' +
        'FROM users u JOIN weddings w ON w.id = u.wedding_id ' +
        "WHERE u.openid = ? AND u.is_admin = 1 AND w.id <> 'demo' " +
        'ORDER BY w.created_at DESC',
    )
    .bind(openid)
    .all<{ id: string; groom_name: string | null; bride_name: string | null; plan: string | null; created_at: string; updated_at: string }>()
  return results || []
}

export async function verifyAccountPassword(row: AccountRow | null, password: string): Promise<boolean> {
  if (!row?.password_hash) return false
  return verifyPassword(password, row.password_hash)
}
