// src/qiniu.ts — 七牛云直传：上传凭证、访问域名拼接、对象删除。
// 访问域名优先读数据库 config.qiniu_domain（短缓存），环境变量 QINIU_DOMAIN 仅作兜底。
// AK / SK 只来自环境变量，不入库。

export const QINIU_DOMAIN_KEY = 'qiniu_domain'
export const DEFAULT_QINIU_DOMAIN = 'https://qn.youxitie.site'
export const DEFAULT_QINIU_UPLOAD_URL = 'https://up-z2.qiniup.com'
export const DEFAULT_QINIU_RS_URL = 'https://rs-z2.qbox.me'
export const QINIU_MARKER = 'qiniu:'
export const VIDEO_MAX_BYTES = 200 * 1024 * 1024
export const TOKEN_TTL_SEC = 3600

export type QiniuEnv = {
  QINIU_AK?: string
  QINIU_SK?: string
  QINIU_BUCKET?: string
  QINIU_DOMAIN?: string
  QINIU_UPLOAD_URL?: string
  QINIU_RS_URL?: string
}

export type QiniuCreds = {
  ak: string
  sk: string
  bucket: string
  uploadUrl: string
  rsUrl: string
}

type DomainCache = { value: string; exp: number }
let domainCache: DomainCache | null = null
const DOMAIN_CACHE_MS = 30_000

function trim(s: unknown): string {
  return typeof s === 'string' ? s.trim() : ''
}

export function normalizeDomain(raw: string): string {
  let v = raw.trim()
  if (!v) return ''
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v
  return v.replace(/\/+$/, '')
}

export function validateDomain(raw: string): string | null {
  const v = normalizeDomain(raw)
  if (!v) return '请填写访问域名'
  let u: URL
  try {
    u = new URL(v)
  } catch {
    return '访问域名不是合法网址'
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return '访问域名必须以 https:// 开头'
  if (!u.hostname) return '访问域名缺少主机名'
  if (v.length > 200) return '访问域名过长'
  return null
}

export function publicObjectUrl(domain: string, key: string): string {
  const base = normalizeDomain(domain) || DEFAULT_QINIU_DOMAIN
  const k = key.replace(/^\/+/, '')
  return base + '/' + k.split('/').map(encodeURIComponent).join('/')
}

export function videoThumbUrl(domain: string, key: string): string {
  return publicObjectUrl(domain, key) + '?vframe/jpg/offset/1'
}

export function toQiniuMarker(key: string): string {
  return QINIU_MARKER + key
}

export function fromQiniuMarker(value: string | null | undefined): string | null {
  const v = trim(value)
  if (!v.startsWith(QINIU_MARKER)) return null
  const key = v.slice(QINIU_MARKER.length).replace(/^\/+/, '')
  if (!key || key.includes('..') || key.length > 300) return null
  return key
}

export function isQiniuMarker(value: string | null | undefined): boolean {
  return fromQiniuMarker(value) != null
}

export function getQiniuCreds(env: QiniuEnv): QiniuCreds | { error: string } {
  const ak = trim(env.QINIU_AK)
  const sk = trim(env.QINIU_SK)
  const bucket = trim(env.QINIU_BUCKET)
  if (!ak || !sk || !bucket) {
    return { error: '服务端未配置七牛云存储（需要 QINIU_AK、QINIU_SK、QINIU_BUCKET）' }
  }
  return {
    ak,
    sk,
    bucket,
    uploadUrl: normalizeDomain(trim(env.QINIU_UPLOAD_URL) || DEFAULT_QINIU_UPLOAD_URL) || DEFAULT_QINIU_UPLOAD_URL,
    rsUrl: normalizeDomain(trim(env.QINIU_RS_URL) || DEFAULT_QINIU_RS_URL) || DEFAULT_QINIU_RS_URL,
  }
}

export function clearQiniuDomainCache() {
  domainCache = null
}

export async function getQiniuDomain(db: { prepare: (sql: string) => any }, env?: QiniuEnv): Promise<string> {
  const now = Date.now()
  if (domainCache && now < domainCache.exp) return domainCache.value
  let value = ''
  try {
    const row = await db.prepare("SELECT value FROM config WHERE key = ?").bind(QINIU_DOMAIN_KEY).first<{ value: string }>()
    value = normalizeDomain(row?.value || '')
  } catch {
    value = ''
  }
  if (!value) value = normalizeDomain(trim(env?.QINIU_DOMAIN) || '')
  if (!value) value = DEFAULT_QINIU_DOMAIN
  domainCache = { value, exp: now + DOMAIN_CACHE_MS }
  return value
}

export async function setQiniuDomain(db: { prepare: (sql: string) => any }, raw: string): Promise<{ ok: true; domain: string } | { ok: false; error: string }> {
  const err = validateDomain(raw)
  if (err) return { ok: false, error: err }
  const domain = normalizeDomain(raw)
  await db
    .prepare(
      "INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    )
    .bind(QINIU_DOMAIN_KEY, domain, new Date().toISOString())
    .run()
  clearQiniuDomainCache()
  return { ok: true, domain }
}

function b64url(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_')
}

async function hmacSha1(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return new Uint8Array(sig)
}

export async function makeUploadToken(
  creds: QiniuCreds,
  key: string,
  opts?: { fsizeLimit?: number; mimeLimit?: string; expiresSec?: number },
): Promise<{ token: string; expireAt: number }> {
  const expiresSec = opts?.expiresSec || TOKEN_TTL_SEC
  const deadline = Math.floor(Date.now() / 1000) + expiresSec
  const policy = {
    scope: creds.bucket + ':' + key,
    deadline,
    fsizeLimit: opts?.fsizeLimit ?? VIDEO_MAX_BYTES,
    mimeLimit: opts?.mimeLimit ?? 'video/*',
    returnBody: '{"key":"$(key)","hash":"$(etag)","fsize":$(fsize),"mimeType":"$(mimeType)"}',
  }
  const encoded = b64url(JSON.stringify(policy))
  const sign = await hmacSha1(creds.sk, encoded)
  const token = creds.ak + ':' + b64url(sign) + ':' + encoded
  return { token, expireAt: deadline }
}

export function newVideoKey(wid: string): string {
  const safe = (wid || 'unknown').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 64) || 'unknown'
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  return 'video/' + safe + '/' + Date.now() + '-' + rand + '.mp4'
}

export function videoKeyAllowed(wid: string, key: string): boolean {
  const safe = (wid || '').replace(/[^A-Za-z0-9._-]/g, '').slice(0, 64)
  if (!safe || !key) return false
  if (key.includes('..') || key.includes('\\')) return false
  return key.startsWith('video/' + safe + '/') && /^video\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(key)
}

export async function deleteQiniuObject(creds: QiniuCreds, key: string): Promise<void> {
  const encoded = b64url(creds.bucket + ':' + key)
  const path = '/delete/' + encoded
  const sign = await hmacSha1(creds.sk, path + '\n')
  const auth = 'QBox ' + creds.ak + ':' + b64url(sign)
  const res = await fetch(creds.rsUrl + path, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  if (!res.ok && res.status !== 612) {
    const text = await res.text().catch(() => '')
    throw new Error('七牛删除失败（HTTP ' + res.status + (text ? '：' + text.slice(0, 180) : '') + '）')
  }
}


/** 把当前七牛域名下的完整网址折回 qiniu:<key>，便于换域名；已是标记或其它图床则原样返回。 */
export function foldQiniuUrl(raw: string, domain: string): string {
  const v = (raw || '').trim()
  if (!v) return v
  if (v.startsWith(QINIU_MARKER)) return v
  const base = normalizeDomain(domain)
  if (!base) return v
  const lower = v.toLowerCase()
  const prefix = base.toLowerCase() + '/'
  if (!lower.startsWith(prefix) && lower !== base.toLowerCase()) return v
  let path = v.slice(base.length).replace(/^\/+/, '')
  path = path.split('#')[0].split('?')[0]
  try {
    path = decodeURIComponent(path)
  } catch {}
  if (!path) return v
  return toQiniuMarker(path)
}

export function expandQiniuUrl(raw: string, domain: string): string {
  const key = fromQiniuMarker(raw)
  if (!key) return raw
  return publicObjectUrl(domain, key)
}

function walkConfigMedia(cfg: Record<string, unknown>, fn: (url: string) => string) {
  if (typeof cfg.coverImage === 'string' && cfg.coverImage) cfg.coverImage = fn(cfg.coverImage)
  const lists = ['story', 'stories']
  for (const name of lists) {
    const arr = cfg[name]
    if (!Array.isArray(arr)) continue
    for (const it of arr) {
      if (it && typeof it === 'object' && typeof (it as any).image === 'string' && (it as any).image) {
        ;(it as any).image = fn((it as any).image)
      }
    }
  }
}

export function foldConfigMedia(cfg: Record<string, unknown>, domain: string) {
  walkConfigMedia(cfg, (u) => foldQiniuUrl(u, domain))
}

export function expandConfigMedia(cfg: Record<string, unknown>, domain: string) {
  walkConfigMedia(cfg, (u) => expandQiniuUrl(u, domain))
}
