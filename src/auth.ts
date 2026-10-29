// src/auth.ts — 登录 token 签发/校验 + 鉴权中间件（多租户：权限按婚礼 wid 判定）
import type { Context, Next } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

// Worker 绑定的资源与环境变量（wrangler.jsonc vars / .dev.vars / Wrangler Secret）
export type Bindings = {
  DB: D1Database
  IMGBB_API_KEY: string
  WX_APPID: string
  WX_APPSECRET: string
  WX_MOCK_LOGIN: string
  SESSION_SECRET: string
  // 平台超级管理员 openid 白名单（逗号分隔）：可管理任意婚礼；
  // 单场婚礼的管理员在数据库 users.is_admin 中配置
  ADMIN_OPENIDS: string
}

// Hono 环境：Bindings + 请求级变量（c.set）
export type AppEnv = {
  Bindings: Bindings
  Variables: { openid: string; wid: string }
}

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60

export function ok<T>(c: Context<AppEnv>, data: T, status: ContentfulStatusCode = 200) {
  return c.json({ ok: true as const, data }, status)
}

export function fail(c: Context<AppEnv>, error: string, status: ContentfulStatusCode = 400) {
  return c.json({ ok: false as const, error }, status)
}

// ---- hex 编解码 ----
function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(Math.floor(hex.length / 2))
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

// 签发 token：openid.exp.sig（真实 openid 字符集不含 "."，分隔安全）
export async function signToken(secret: string, openid: string): Promise<{ token: string; exp: number }> {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  const payload = openid + '.' + exp
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(payload))
  return { token: payload + '.' + toHex(sig), exp }
}

// 校验 token；失败返回 null
export async function verifyToken(secret: string, token: string): Promise<{ openid: string; exp: number } | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [openid, expStr, sigHex] = parts
  const exp = Number(expStr)
  if (!openid || !Number.isFinite(exp) || exp * 1000 <= Date.now()) return null
  if (!/^[0-9a-f]+$/i.test(sigHex)) return null
  const valid = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(secret),
    fromHex(sigHex),
    new TextEncoder().encode(openid + '.' + expStr),
  )
  return valid ? { openid, exp } : null
}

// 平台超管（环境变量白名单）
export function isAdminOpenid(env: Bindings, openid: string): boolean {
  if (!openid) return false
  return (env.ADMIN_OPENIDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(openid)
}

// 婚礼管理员判定：平台超管 或 该婚礼 users.is_admin = 1
export async function isWeddingAdmin(c: Context<AppEnv>, wid: string, openid: string): Promise<boolean> {
  if (!wid || !openid) return false
  if (isAdminOpenid(c.env, openid)) return true
  try {
    const row = await c.env.DB.prepare('SELECT is_admin FROM users WHERE openid = ? AND wedding_id = ?')
      .bind(openid, wid)
      .first<{ is_admin: number }>()
    return Boolean(row && Number(row.is_admin) === 1)
  } catch {
    return false
  }
}

// token 提取：优先 Authorization 头；二维码等 <image> 场景回退到 ?token=
function readToken(c: Context<AppEnv>): string {
  const auth = c.req.header('Authorization') || ''
  if (auth.startsWith('Bearer ')) return auth.slice(7)
  return c.req.query('token') || ''
}

// 婚礼标识：所有婚礼接口统一用 ?wid= 指定（GET/POST/PUT 一致以 query 为准）
export function getWid(c: Context<AppEnv>): string {
  return (c.req.query('wid') || '').trim().slice(0, 64)
}

// 可选鉴权：无 token / token 无效都不拦，能解析出 openid 就写入变量
export async function optionalAuth(c: Context<AppEnv>, next: Next) {
  const secret = c.env.SESSION_SECRET
  const token = readToken(c)
  if (secret && token) {
    const payload = await verifyToken(secret, token)
    if (payload) c.set('openid', payload.openid)
  }
  await next()
}

export function getOpenid(c: Context<AppEnv>): string {
  try {
    return c.get('openid') || ''
  } catch {
    return ''
  }
}

// 必须登录：token 无效 → 401
export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const secret = c.env.SESSION_SECRET
  if (!secret) return fail(c, '服务端未配置 SESSION_SECRET，请检查 .dev.vars 或 Wrangler Secret', 500)
  const token = readToken(c)
  const payload = token ? await verifyToken(secret, token) : null
  if (!payload) return fail(c, '未登录或登录已过期', 401)
  c.set('openid', payload.openid)
  await next()
}

// 婚礼级接口：必须带 wid（无 wid 属于推广页场景，不该请求婚礼数据）
export async function requireWid(c: Context<AppEnv>, next: Next) {
  const wid = getWid(c)
  if (!wid) return fail(c, '缺少 wid 参数（请通过新人分享的二维码或链接进入）', 400)
  c.set('wid', wid)
  await next()
}

// 婚礼管理员：登录 + （平台超管 或 该婚礼 users.is_admin=1）；否则 401/403
export async function requireAdmin(c: Context<AppEnv>, next: Next) {
  const secret = c.env.SESSION_SECRET
  if (!secret) return fail(c, '服务端未配置 SESSION_SECRET，请检查 .dev.vars 或 Wrangler Secret', 500)
  const token = readToken(c)
  const payload = token ? await verifyToken(secret, token) : null
  if (!payload) return fail(c, '未登录（请先在小程序内完成登录）', 401)
  const wid = getWid(c)
  if (!wid) return fail(c, '缺少 wid 参数', 400)
  const admin = await isWeddingAdmin(c, wid, payload.openid)
  if (!admin) return fail(c, '当前账号不是该婚礼的管理员（管理员在 users.is_admin 中配置）', 403)
  c.set('openid', payload.openid)
  c.set('wid', wid)
  await next()
}
