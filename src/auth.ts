// src/auth.ts — 登录 token 签发/校验（WebCrypto HMAC-SHA256）与鉴权中间件
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
  ADMIN_OPENIDS: string
}

// Hono 环境：Bindings + c.set('openid') 变量
export type AppEnv = {
  Bindings: Bindings
  Variables: { openid: string }
}

// token 有效期：7 天
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

// 是否管理员（openid 在白名单内）
export function isAdminOpenid(env: Bindings, openid: string): boolean {
  if (!openid) return false
  return (env.ADMIN_OPENIDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(openid)
}

function readBearer(c: Context<AppEnv>): string {
  const auth = c.req.header('Authorization') || ''
  return auth.startsWith('Bearer ') ? auth.slice(7) : ''
}

// 可选鉴权：无 token / token 无效都不拦，能解析出 openid 就写入变量（游客可发的接口用）
export async function optionalAuth(c: Context<AppEnv>, next: Next) {
  const secret = c.env.SESSION_SECRET
  const token = readBearer(c)
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
  const token = readBearer(c)
  const payload = token ? await verifyToken(secret, token) : null
  if (!payload) return fail(c, '未登录或登录已过期', 401)
  c.set('openid', payload.openid)
  await next()
}

// 必须是管理员：登录 + openid 在白名单；否则 401/403
export async function requireAdmin(c: Context<AppEnv>, next: Next) {
  const secret = c.env.SESSION_SECRET
  if (!secret) return fail(c, '服务端未配置 SESSION_SECRET，请检查 .dev.vars 或 Wrangler Secret', 500)
  const token = readBearer(c)
  const payload = token ? await verifyToken(secret, token) : null
  if (!payload) return fail(c, '未登录（请先在开发者工具/真机上登录小程序）', 401)
  if (!isAdminOpenid(c.env, payload.openid)) return fail(c, '当前账号不在管理员白名单（ADMIN_OPENIDS）中', 403)
  c.set('openid', payload.openid)
  await next()
}
