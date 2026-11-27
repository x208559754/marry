// src/platform.ts — 平台总后台 API（挂载于 /api/platform；网页见 src/platform-page.ts）
// 鉴权：数据库 platform_admins 中的 scrypt 哈希（库空时用 PLATFORM_ADMIN_PASSWORD 种子）→ 12 小时签名 token
import { Hono } from 'hono'
import type { Context, Next } from 'hono'
import { ok, fail } from './auth'
import type { AppEnv } from './auth'
import { ensurePlatformAdmin, hashPassword, updateAdminPassword, verifyPassword } from './platform-password'
import {
  getPricing, saveLegacyPricing, orderOut, payMode, getPlans, getPlanDef, sanitizePlan, sanitizeOverrides, createPlan, updatePlan, deletePlan,
  getWeddingPlan, getUsage, logPlan, isExpired, CODE_RE, ALL_THEMES, THEME_NAMES, EFFECTS, EFFECT_NAMES,
} from './billing'
import { LABEL_NAMES, resetKeywordCache } from './moderation'
import {
  getQiniuDomain,
  setQiniuDomain,
  DEFAULT_QINIU_DOMAIN,
  getQiniuCreds,
  makeUploadToken,
  newPlatformAudioKey,
  platformAudioKeyAllowed,
  fromQiniuMarker,
  deleteQiniuObject,
  uploadBufferToQiniu,
  AUDIO_MAX_BYTES,
  AUDIO_MIME_LIMIT,
} from './qiniu'
import { clearPlatformDefaultBgm, getPlatformDefaultBgm, setPlatformDefaultBgm, BUNDLED_BGM_TITLE, BUNDLED_BGM_URL } from './bgm'

async function storedDefaultBgmKey(db: { prepare: (sql: string) => any }): Promise<string | null> {
  const row = await db.prepare("SELECT value FROM config WHERE key = 'default_bgm'").first<{ value: string }>()
  if (!row?.value) return null
  try {
    const parsed = JSON.parse(row.value)
    return fromQiniuMarker((parsed && parsed.url) || row.value)
  } catch {
    return fromQiniuMarker(row.value)
  }
}

export const platform = new Hono<AppEnv>()

const TTL = 12 * 3600

function hex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
async function hmac(secret: string, msg: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)))
}
// token 密钥同时依赖 SESSION_SECRET 与库中的密码哈希：改密码后旧 token 立即失效
function tokenSecret(sessionSecret: string, passwordHash: string) {
  return 'platform|' + sessionSecret + '|' + passwordHash
}
async function safeEqual(a: string, b: string) {
  const k = 'cmp'
  return (await hmac(k, a)) === (await hmac(k, b))
}
async function currentHash(c: Context<AppEnv>) {
  const row = await ensurePlatformAdmin(c.env.DB, c.env.PLATFORM_ADMIN_PASSWORD || '')
  return row?.password_hash || null
}
function issueToken(sessionSecret: string, passwordHash: string, exp: number, sig: string) {
  return 'p.' + exp + '.' + sig
}

// 登录失败限流（按 IP，15 分钟内最多 8 次）
const fails = new Map<string, { n: number; at: number }>()
function clientIp(c: Context<AppEnv>) {
  return (c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'local').split(',')[0].trim()
}

platform.post('/login', async (c) => {
  if (!c.env.SESSION_SECRET) return fail(c, '服务端未配置 SESSION_SECRET', 503)
  const hash = await currentHash(c)
  if (!hash) return fail(c, '服务端未配置平台后台密码', 503)
  const ip = clientIp(c)
  const f = fails.get(ip)
  if (f && Date.now() - f.at < 15 * 60_000 && f.n >= 8) return fail(c, '尝试次数过多，请 15 分钟后再试', 429)
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const input = typeof body.password === 'string' ? body.password : ''
  if (!(await verifyPassword(input, hash))) {
    const cur = f && Date.now() - f.at < 15 * 60_000 ? f : { n: 0, at: Date.now() }
    cur.n++
    fails.set(ip, cur)
    await new Promise((r) => setTimeout(r, 600))
    return fail(c, '密码错误', 401)
  }
  fails.delete(ip)
  const exp = Math.floor(Date.now() / 1000) + TTL
  const sig = await hmac(tokenSecret(c.env.SESSION_SECRET, hash), 'platform.' + exp)
  return ok(c, { token: issueToken(c.env.SESSION_SECRET, hash, exp, sig), exp })
})

async function requirePlatform(c: Context<AppEnv>, next: Next) {
  const auth = c.req.header('Authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const m = /^p\.(\d+)\.([0-9a-f]{64})$/.exec(token)
  const hash = await currentHash(c)
  if (!m || !hash || !c.env.SESSION_SECRET) return fail(c, '请先登录平台后台', 401)
  if (Number(m[1]) * 1000 < Date.now()) return fail(c, '登录已过期，请重新登录', 401)
  const sig = await hmac(tokenSecret(c.env.SESSION_SECRET, hash), 'platform.' + m[1])
  if (!(await safeEqual(sig, m[2]))) return fail(c, '请先登录平台后台', 401)
  c.header('Cache-Control', 'no-store')
  await next()
}
platform.use('*', async (c, next) => {
  if (c.req.path.endsWith('/login')) return next()
  return requirePlatform(c, next)
})

// ---------------- 工具 ----------------
function page(c: Context<AppEnv>) {
  const p = Math.max(1, Math.floor(Number(c.req.query('page')) || 1))
  const size = Math.min(100, Math.max(5, Math.floor(Number(c.req.query('size')) || 20)))
  return { p, size, offset: (p - 1) * size }
}
function like(q: string) {
  return '%' + q.replace(/[\\%_]/g, (m) => '\\' + m) + '%'
}
// 时间文本（ISO 或 'YYYY-MM-DD HH:MM:SS' UTC）→ 北京时间日期 YYYY-MM-DD
function cnDay(raw: string | null | undefined): string {
  const s = String(raw || '')
  if (!s) return ''
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z')
  if (isNaN(d.getTime())) return ''
  return new Date(d.getTime() + 8 * 3600_000).toISOString().slice(0, 10)
}
function cnTime(raw: string | null | undefined): string {
  const s = String(raw || '')
  if (!s) return ''
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z')
  if (isNaN(d.getTime())) return s
  return new Date(d.getTime() + 8 * 3600_000).toISOString().slice(0, 16).replace('T', ' ')
}
function maskOpenid(o: string | null | undefined) {
  const s = String(o || '')
  return s.length > 12 ? s.slice(0, 6) + '…' + s.slice(-4) : s
}
async function n(db: D1Database, sql: string, ...args: unknown[]) {
  const r = await db.prepare(sql).bind(...args).first<{ n: number }>()
  return Number(r?.n) || 0
}
function coupleName(r: { groom_name?: string | null; bride_name?: string | null }) {
  return [r.groom_name, r.bride_name].filter(Boolean).join(' & ')
}

// ---------------- 概览 ----------------
platform.get('/overview', async (c) => {
  const db = c.env.DB
  const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
  const since7 = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10)
  const [weddings, premium, disabled, users, rsvps, blessings, paidOrders, revenue, refunded, flagged, newWeddings7, newUsers7] = await Promise.all([
    n(db, 'SELECT COUNT(*) AS n FROM weddings'),
    n(db, "SELECT COUNT(*) AS n FROM weddings WHERE plan <> 'free' AND (plan_expires_at IS NULL OR plan_expires_at >= ?)", new Date().toISOString()),
    n(db, "SELECT COUNT(*) AS n FROM weddings WHERE status = 'disabled'"),
    n(db, 'SELECT COUNT(DISTINCT openid) AS n FROM users'),
    n(db, 'SELECT COUNT(*) AS n FROM rsvps'),
    n(db, 'SELECT COUNT(*) AS n FROM blessings'),
    n(db, "SELECT COUNT(*) AS n FROM orders WHERE status = 'paid'"),
    n(db, "SELECT COALESCE(SUM(amount_fen), 0) AS n FROM orders WHERE status = 'paid'"),
    n(db, "SELECT COUNT(*) AS n FROM orders WHERE status = 'refunded'"),
    n(db, "SELECT COUNT(*) AS n FROM moderation_logs WHERE result IN ('review', 'risky', 'error') AND handled = 'none'"),
    n(db, 'SELECT COUNT(*) AS n FROM weddings WHERE created_at >= ?', since7),
    n(db, 'SELECT COUNT(*) AS n FROM (SELECT openid, MIN(first_seen) AS f FROM users GROUP BY openid) t WHERE t.f >= ?', since7),
  ])
  // 近 30 天趋势（北京时间按天）
  const days: string[] = []
  for (let i = 29; i >= 0; i--) days.push(cnDay(new Date(Date.now() - i * 86400_000).toISOString()))
  const trend: Record<string, { users: number; weddings: number; orders: number; revenueFen: number; blessings: number; rsvps: number }> = {}
  for (const d of days) trend[d] = { users: 0, weddings: 0, orders: 0, revenueFen: 0, blessings: 0, rsvps: 0 }
  const bump = (rows: any[], col: string, key: keyof (typeof trend)[string], amt?: string) => {
    for (const r of rows) {
      const d = cnDay(r[col])
      if (trend[d]) trend[d][key] += amt ? Number(r[amt]) || 0 : 1
    }
  }
  const q = async (sql: string) => (await db.prepare(sql).bind(since).all<any>()).results || []
  bump(await q('SELECT MIN(first_seen) AS t FROM users GROUP BY openid HAVING MIN(first_seen) >= ?'), 't', 'users')
  bump(await q('SELECT created_at AS t FROM weddings WHERE created_at >= ?'), 't', 'weddings')
  const paid = await q("SELECT paid_at AS t, amount_fen FROM orders WHERE status = 'paid' AND paid_at >= ?")
  bump(paid, 't', 'orders')
  bump(paid, 't', 'revenueFen', 'amount_fen')
  bump(await q('SELECT created_at AS t FROM blessings WHERE created_at >= ?'), 't', 'blessings')
  bump(await q('SELECT submitted_at AS t FROM rsvps WHERE submitted_at >= ?'), 't', 'rsvps')

  // 各套餐婚礼数（已过期的单独统计，按免费版生效）
  const plansAll = await getPlans(db)
  const nowIso = new Date().toISOString()
  const pc = (await db.prepare("SELECT plan, SUM(CASE WHEN plan <> 'free' AND plan_expires_at IS NOT NULL AND plan_expires_at < ? THEN 1 ELSE 0 END) AS expired, COUNT(*) AS n FROM weddings GROUP BY plan").bind(nowIso).all<any>()).results || []
  const planCounts = plansAll.map((p) => {
    const r = pc.find((x) => x.plan === p.code)
    return { code: p.code, name: p.name, level: p.level, active: p.active, count: Number(r?.n) || 0, expired: Number(r?.expired) || 0 }
  })
  for (const r of pc) if (!plansAll.find((p) => p.code === r.plan)) planCounts.push({ code: r.plan, name: r.plan + '（已删除）', level: -1, active: false, count: Number(r.n) || 0, expired: Number(r.expired) || 0 })
  const pay = c.env.PAY
  return ok(c, {
    planCounts,
    totals: { weddings, premium, disabled, users, rsvps, blessings, paidOrders, revenueFen: revenue, refunded, flagged, newWeddings7, newUsers7 },
    trend: days.map((d) => ({ day: d, ...trend[d] })),
    system: {
      payMode: payMode(c.env),
      payMissing: pay ? pay.missing : ['未注入支付模块'],
      moderation: {
        enabled: c.env.MODERATION_ENABLED !== '0',
        mock: c.env.MODERATION_MOCK === '1',
        failOpen: c.env.MODERATION_FAIL_OPEN !== '0',
        blockReview: c.env.MODERATION_BLOCK_REVIEW === '1',
        pushConfigured: Boolean(c.env.WX_PUSH_TOKEN),
      },
    },
  })
})

// ---------------- 婚礼 ----------------
platform.get('/weddings', async (c) => {
  const db = c.env.DB
  const { p, size, offset } = page(c)
  const q = (c.req.query('q') || '').trim().slice(0, 64)
  const status = c.req.query('status') || ''
  const plan = c.req.query('plan') || ''
  const where: string[] = []
  const args: unknown[] = []
  if (q) {
    where.push('(w.id LIKE ? OR w.groom_name LIKE ? OR w.bride_name LIKE ?)')
    args.push(like(q), like(q), like(q))
  }
  if (status === 'active' || status === 'disabled') {
    where.push('w.status = ?')
    args.push(status)
  }
  if (plan === 'expired') {
    where.push("w.plan <> 'free' AND w.plan_expires_at IS NOT NULL AND w.plan_expires_at < ?")
    args.push(new Date().toISOString())
  } else if (plan && CODE_RE.test(plan)) {
    where.push('w.plan = ?')
    args.push(plan)
  }
  const w = where.length ? ' WHERE ' + where.join(' AND ') : ''
  const total = await n(db, 'SELECT COUNT(*) AS n FROM weddings w' + w, ...args)
  const { results } = await db
    .prepare(
      'SELECT w.id, w.groom_name, w.bride_name, w.plan, w.status, w.plan_activated_at, w.plan_expires_at, w.plan_overrides, w.created_at, w.updated_at, ' +
        "(SELECT COUNT(*) FROM images i WHERE i.wedding_id = w.id AND i.status <> 'hidden') AS image_count, " +
        '(SELECT COUNT(*) FROM users u WHERE u.wedding_id = w.id) AS user_count, ' +
        '(SELECT COUNT(*) FROM rsvps r WHERE r.wedding_id = w.id) AS rsvp_count, ' +
        '(SELECT COUNT(*) FROM blessings b WHERE b.wedding_id = w.id) AS blessing_count, ' +
        "(SELECT COALESCE(SUM(o.amount_fen), 0) FROM orders o WHERE o.wedding_id = w.id AND o.status = 'paid') AS paid_fen " +
        'FROM weddings w' + w + ' ORDER BY w.created_at DESC LIMIT ? OFFSET ?',
    )
    .bind(...args, size, offset)
    .all<any>()
  const plansAll = await getPlans(db)
  return ok(c, {
    total,
    page: p,
    size,
    plans: plansAll.map((x) => ({ code: x.code, name: x.name, level: x.level })),
    items: (results || []).map((r) => ({
      id: r.id,
      couple: coupleName(r),
      plan: r.plan,
      planName: plansAll.find((x) => x.code === r.plan)?.name || r.plan,
      planLevel: plansAll.find((x) => x.code === r.plan)?.level ?? 0,
      expiresAt: cnDay(r.plan_expires_at),
      expired: r.plan !== 'free' && isExpired(r.plan_expires_at),
      hasOverrides: Boolean(r.plan_overrides && r.plan_overrides !== '{}'),
      imageCount: Number(r.image_count) || 0,
      status: r.status,
      userCount: Number(r.user_count) || 0,
      rsvpCount: Number(r.rsvp_count) || 0,
      blessingCount: Number(r.blessing_count) || 0,
      paidFen: Number(r.paid_fen) || 0,
      createdAt: cnTime(r.created_at),
      updatedAt: cnTime(r.updated_at),
    })),
  })
})

platform.get('/weddings/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const w = await db.prepare('SELECT * FROM weddings WHERE id = ?').bind(id).first<any>()
  if (!w) return fail(c, '婚礼不存在', 404)
  let cfg: any = {}
  try {
    cfg = w.config ? JSON.parse(w.config) : {}
  } catch {}
  const [users, admins, rsvps, attending, guests, blessings, hidden, images, hearts] = await Promise.all([
    n(db, 'SELECT COUNT(*) AS n FROM users WHERE wedding_id = ?', id),
    n(db, 'SELECT COUNT(*) AS n FROM users WHERE wedding_id = ? AND is_admin = 1', id),
    n(db, 'SELECT COUNT(*) AS n FROM rsvps WHERE wedding_id = ?', id),
    n(db, "SELECT COUNT(*) AS n FROM rsvps WHERE wedding_id = ? AND attending = 'yes'", id),
    n(db, "SELECT COALESCE(SUM(guest_count), 0) AS n FROM rsvps WHERE wedding_id = ? AND attending = 'yes'", id),
    n(db, 'SELECT COUNT(*) AS n FROM blessings WHERE wedding_id = ?', id),
    n(db, "SELECT COUNT(*) AS n FROM blessings WHERE wedding_id = ? AND status = 'hidden'", id),
    n(db, "SELECT COUNT(*) AS n FROM images WHERE wedding_id = ? AND status <> 'hidden'", id),
    n(db, 'SELECT COUNT(*) AS n FROM heart_clicks WHERE wedding_id = ?', id),
  ])
  const orders = (await db.prepare('SELECT * FROM orders WHERE wedding_id = ? ORDER BY id DESC LIMIT 20').bind(id).all<any>()).results || []
  const recent = (await db.prepare('SELECT id, author, content, status, created_at FROM blessings WHERE wedding_id = ? ORDER BY id DESC LIMIT 20').bind(id).all<any>()).results || []
  const [wp, usage, plansAll] = await Promise.all([getWeddingPlan(db, id), getUsage(db, id), getPlans(db)])
  const logs = (await db.prepare('SELECT * FROM plan_logs WHERE wedding_id = ? ORDER BY id DESC LIMIT 30').bind(id).all<any>()).results || []
  const planNameOf = (code: string | null) => (code ? plansAll.find((x) => x.code === code)?.name || code : '')
  return ok(c, {
    id: w.id,
    couple: coupleName(w),
    plan: w.plan,
    status: w.status,
    disabledReason: w.disabled_reason || '',
    planActivatedAt: cnTime(w.plan_activated_at),
    planOrderNo: w.plan_order_no || '',
    createdAt: cnTime(w.created_at),
    updatedAt: cnTime(w.updated_at),
    info: {
      date: typeof cfg.date === 'string' ? cfg.date : '',
      time: typeof cfg.time === 'string' ? cfg.time : '',
      venue: cfg.venue && typeof cfg.venue === 'object' ? String(cfg.venue.name || cfg.venue.address || '') : '',
      title: typeof cfg.invitationTitle === 'string' ? cfg.invitationTitle : '',
    },
    counts: { users, admins, rsvps, attending, guests, blessings, hiddenBlessings: hidden, images, hearts },
    planInfo: {
      code: wp.plan,
      storedPlan: wp.storedPlan,
      name: wp.planName,
      storedName: planNameOf(wp.storedPlan),
      level: wp.level,
      expired: wp.expired,
      expiresAt: wp.expiresAt,
      expiresDay: cnDay(wp.expiresAt),
      note: wp.note,
      overrides: wp.overrides,
      base: wp.base,
      ent: wp.ent,
      photoLimit: wp.photoLimit,
      canUpgrade: wp.canUpgrade,
      usage,
      logs: logs.map((l) => ({ id: l.id, action: l.action, from: planNameOf(l.from_plan), to: planNameOf(l.to_plan), expiresAt: cnDay(l.expires_at), note: l.note || '', detail: l.detail || '', operator: l.operator, createdAt: cnTime(l.created_at) })),
    },
    orders: orders.map((o) => ({ ...orderOut(o), createdAt: cnTime(o.created_at), paidAt: cnTime(o.paid_at) })),
    blessings: recent.map((b) => ({ id: b.id, author: b.author || '', content: b.content || '', status: b.status, createdAt: cnTime(b.created_at) })),
  })
})

platform.post('/weddings/:id/status', async (c) => {
  const id = c.req.param('id')
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const status = body.status === 'disabled' ? 'disabled' : 'active'
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 200) : ''
  const r = await c.env.DB.prepare('UPDATE weddings SET status = ?, disabled_reason = ? WHERE id = ?')
    .bind(status, status === 'disabled' ? reason || null : null, id)
    .run()
  if (!r.meta.changes) {
    const exists = await n(c.env.DB, 'SELECT COUNT(*) AS n FROM weddings WHERE id = ?', id)
    if (!exists) return fail(c, '婚礼不存在', 404)
  }
  return ok(c, { id, status })
})

// POST /weddings/:id/plan {plan, expiresAt?: 'YYYY-MM-DD'（北京时间当天 23:59:59 到期）| '' 永久, note?} → 手动设置套餐并记录日志
platform.post('/weddings/:id/plan', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const code = typeof body.plan === 'string' ? body.plan : 'free'
  const def = await getPlanDef(db, code)
  if (!def) return fail(c, '套餐不存在')
  const before = await getWeddingPlan(db, id)
  if (!before.exists) return fail(c, '婚礼不存在', 404)
  let expiresAt: string | null = null
  const ex = typeof body.expiresAt === 'string' ? body.expiresAt.trim() : ''
  if (ex && code !== 'free') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ex)) return fail(c, '到期日期格式应为 YYYY-MM-DD')
    const t = Date.parse(ex + 'T23:59:59+08:00')
    if (!Number.isFinite(t)) return fail(c, '到期日期无效')
    expiresAt = new Date(t).toISOString()
  }
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 200) : ''
  const now = new Date().toISOString()
  await db
    .prepare('UPDATE weddings SET plan = ?, plan_activated_at = ?, plan_order_no = ?, plan_expires_at = ?, plan_note = ? WHERE id = ?')
    .bind(code, code === 'free' ? null : now, code === 'free' ? null : 'MANUAL', expiresAt, note || null, id)
    .run()
  await logPlan(db, id, 'manual', before.plan, code, { expiresAt, note, operator: 'platform' })
  return ok(c, { id, plan: code, expiresAt })
})

// PUT /weddings/:id/overrides {overrides:{photos?,lotteryPrizes?,...}（不传或空对象 = 清除）, note?} → 单独调整本场婚礼的权益
platform.put('/weddings/:id/overrides', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const before = await getWeddingPlan(db, id)
  if (!before.exists) return fail(c, '婚礼不存在', 404)
  const ov = sanitizeOverrides(body.overrides)
  if (ov.photos !== undefined && ov.photos > before.photoLimit) return fail(c, '相册上限最多 ' + before.photoLimit + ' 张')
  const empty = Object.keys(ov).length === 0
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 200) : ''
  await db.prepare('UPDATE weddings SET plan_overrides = ? WHERE id = ?').bind(empty ? null : JSON.stringify(ov), id).run()
  await logPlan(db, id, empty ? 'clear' : 'override', before.plan, before.plan, { note, detail: ov, operator: 'platform' })
  const after = await getWeddingPlan(db, id)
  return ok(c, { id, overrides: after.overrides, ent: after.ent })
})

// ---------------- 用户（按 openid 聚合） ----------------
platform.get('/users', async (c) => {
  const db = c.env.DB
  const { p, size, offset } = page(c)
  const q = (c.req.query('q') || '').trim().slice(0, 64)
  const where = q ? ' WHERE (u.name LIKE ? OR u.phone LIKE ? OR u.wedding_id LIKE ?)' : ''
  const args = q ? [like(q), like(q), like(q)] : []
  const total = await n(db, 'SELECT COUNT(DISTINCT u.openid) AS n FROM users u' + where, ...args)
  const { results } = await db
    .prepare(
      'SELECT u.openid, MAX(u.name) AS name, MAX(u.phone) AS phone, COUNT(*) AS wedding_count, ' +
        "GROUP_CONCAT(u.wedding_id ORDER BY u.last_seen DESC SEPARATOR ',') AS weddings, " +
        'MAX(u.is_admin) AS is_admin, MIN(u.first_seen) AS first_seen, MAX(u.last_seen) AS last_seen, SUM(u.login_count) AS logins ' +
        'FROM users u' + where + ' GROUP BY u.openid ORDER BY last_seen DESC LIMIT ? OFFSET ?',
    )
    .bind(...args, size, offset)
    .all<any>()
  const wids = [...new Set((results || []).flatMap((r) => String(r.weddings || '').split(',').filter(Boolean).slice(0, 5)))]
  const planOf: Record<string, { plan: string; expired: boolean }> = {}
  if (wids.length) {
    const rows = (await db.prepare('SELECT id, plan, plan_expires_at FROM weddings WHERE id IN (' + wids.map(() => '?').join(',') + ')').bind(...wids).all<any>()).results || []
    for (const w of rows) planOf[w.id] = { plan: w.plan, expired: w.plan !== 'free' && isExpired(w.plan_expires_at) }
  }
  const plansAll = await getPlans(db)
  return ok(c, {
    total,
    page: p,
    size,
    items: (results || []).map((r) => ({
      weddingPlans: String(r.weddings || '').split(',').filter(Boolean).slice(0, 5).map((wid) => {
        const x = planOf[wid]
        const code = x ? (x.expired ? 'free' : x.plan) : 'free'
        return { wid, plan: code, planName: (plansAll.find((pp) => pp.code === code)?.name || code) + (x?.expired ? '（已过期）' : ''), level: plansAll.find((pp) => pp.code === code)?.level ?? 0 }
      }),
      id: maskOpenid(r.openid),
      name: r.name || '',
      phone: r.phone ? String(r.phone).replace(/^(\d{3})\d{4}(\d+)$/, '$1****$2') : '',
      weddings: String(r.weddings || '').split(',').filter(Boolean).slice(0, 5),
      weddingCount: Number(r.wedding_count) || 0,
      isAdmin: Number(r.is_admin) === 1,
      logins: Number(r.logins) || 0,
      firstSeen: cnTime(r.first_seen),
      lastSeen: cnTime(r.last_seen),
    })),
  })
})

// ---------------- 订单 ----------------
platform.get('/orders', async (c) => {
  const db = c.env.DB
  const { p, size, offset } = page(c)
  const status = c.req.query('status') || ''
  const q = (c.req.query('q') || '').trim().slice(0, 64)
  const where: string[] = []
  const args: unknown[] = []
  if (status) {
    where.push('o.status = ?')
    args.push(status)
  }
  if (q) {
    where.push('(o.out_trade_no LIKE ? OR o.wedding_id LIKE ? OR o.transaction_id LIKE ?)')
    args.push(like(q), like(q), like(q))
  }
  const w = where.length ? ' WHERE ' + where.join(' AND ') : ''
  const total = await n(db, 'SELECT COUNT(*) AS n FROM orders o' + w, ...args)
  const { results } = await db
    .prepare('SELECT o.*, w.groom_name, w.bride_name FROM orders o LEFT JOIN weddings w ON w.id = o.wedding_id' + w + ' ORDER BY o.id DESC LIMIT ? OFFSET ?')
    .bind(...args, size, offset)
    .all<any>()
  return ok(c, {
    total,
    page: p,
    size,
    items: (results || []).map((o) => ({
      ...orderOut(o),
      couple: coupleName(o),
      buyer: maskOpenid(o.openid),
      note: o.note || '',
      refundFen: o.refund_fen == null ? null : Number(o.refund_fen),
      createdAt: cnTime(o.created_at),
      paidAt: cnTime(o.paid_at),
      refundedAt: cnTime(o.refunded_at),
    })),
  })
})

// POST /orders/:no/refund {note, wxRefund?, downgrade?} → 标记退款（可选同时调用微信退款、把婚礼降回免费版）
platform.post('/orders/:no/refund', async (c) => {
  const db = c.env.DB
  const no = c.req.param('no')
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 200) : ''
  const o = await db.prepare('SELECT * FROM orders WHERE out_trade_no = ?').bind(no).first<any>()
  if (!o) return fail(c, '订单不存在', 404)
  if (o.status !== 'paid') return fail(c, '只有已支付的订单可以退款', 409)
  let wxNote = ''
  if (body.wxRefund && o.pay_mode === 'wxpay') {
    if (!c.env.PAY?.configured || !c.env.PAY.refund) return fail(c, '微信支付未配置，无法原路退款；可只做标记', 503)
    try {
      const r = await c.env.PAY.refund({ outTradeNo: no, outRefundNo: 'RF' + no.slice(2), totalFen: Number(o.amount_fen), refundFen: Number(o.amount_fen), reason: note || undefined })
      wxNote = '微信退款：' + (r.status || 'PROCESSING')
    } catch (e) {
      return fail(c, '微信退款失败：' + (e instanceof Error ? e.message : String(e)), 502)
    }
  }
  const now = new Date().toISOString()
  await db
    .prepare("UPDATE orders SET status = 'refunded', refunded_at = ?, refund_fen = amount_fen, note = ?, updated_at = ? WHERE out_trade_no = ?")
    .bind(now, [note, wxNote].filter(Boolean).join('；').slice(0, 250) || '已标记退款', now, no)
    .run()
  if (body.downgrade) {
    const r = await db.prepare("UPDATE weddings SET plan = 'free', plan_activated_at = NULL, plan_order_no = NULL, plan_expires_at = NULL WHERE id = ? AND plan_order_no = ?").bind(o.wedding_id, no).run()
    if (r.meta.changes) await logPlan(db, o.wedding_id, 'refund', o.product, 'free', { note: '订单 ' + no + ' 退款降级' + (note ? '：' + note : ''), operator: 'platform' })
  }
  return ok(c, { orderNo: no, status: 'refunded' })
})

// ---------------- 内容安全审核队列 ----------------
platform.get('/moderation', async (c) => {
  const db = c.env.DB
  const { p, size, offset } = page(c)
  const filter = c.req.query('filter') || 'flagged'
  const where =
    filter === 'all'
      ? ''
      : filter === 'skipped'
        ? " WHERE result = 'skipped'"
        : filter === 'handled'
          ? " WHERE handled <> 'none'"
          : " WHERE result IN ('review', 'risky', 'error') AND handled = 'none'"
  const total = await n(db, 'SELECT COUNT(*) AS n FROM moderation_logs' + where)
  const { results } = await db.prepare('SELECT * FROM moderation_logs' + where + ' ORDER BY id DESC LIMIT ? OFFSET ?').bind(size, offset).all<any>()
  return ok(c, {
    total,
    page: p,
    size,
    items: (results || []).map((r) => ({
      id: r.id,
      wid: r.wedding_id,
      kind: r.kind,
      targetType: r.target_type,
      targetId: r.target_id || '',
      content: r.content || '',
      result: r.result,
      label: r.label ? LABEL_NAMES[Number(r.label)] || String(r.label) : '',
      detail: r.detail || '',
      handled: r.handled,
      user: maskOpenid(r.openid),
      createdAt: cnTime(r.created_at),
    })),
  })
})

// POST /moderation/:id {action: approve|hide|delete}
platform.post('/moderation/:id', async (c) => {
  const db = c.env.DB
  const id = Number(c.req.param('id'))
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const action = String(body.action || '')
  const row = await db.prepare('SELECT * FROM moderation_logs WHERE id = ?').bind(id).first<any>()
  if (!row) return fail(c, '记录不存在', 404)
  if (!['approve', 'hide', 'delete'].includes(action)) return fail(c, '未知操作')
  const tid = Number(row.target_id)
  if (action !== 'approve' && tid > 0) {
    const table = row.target_type === 'blessing' ? 'blessings' : row.target_type === 'image' ? 'images' : ''
    if (table) {
      if (action === 'hide') await db.prepare('UPDATE ' + table + " SET status = 'hidden' WHERE id = ?").bind(tid).run()
      else await db.prepare('DELETE FROM ' + table + ' WHERE id = ?').bind(tid).run()
    }
  }
  const handled = action === 'approve' ? 'approved' : action === 'hide' ? 'hidden' : 'deleted'
  await db.prepare('UPDATE moderation_logs SET handled = ? WHERE id = ?').bind(handled, id).run()
  return ok(c, { id, handled })
})

// ---------------- 祝福 / 弹幕（全平台 UGC） ----------------
platform.get('/blessings', async (c) => {
  const db = c.env.DB
  const { p, size, offset } = page(c)
  const q = (c.req.query('q') || '').trim().slice(0, 64)
  const status = c.req.query('status') || ''
  const wid = (c.req.query('wid') || '').trim().slice(0, 64)
  const where: string[] = []
  const args: unknown[] = []
  if (q) {
    where.push('(b.content LIKE ? OR b.author LIKE ?)')
    args.push(like(q), like(q))
  }
  if (status === 'hidden' || status === 'visible') {
    where.push('b.status = ?')
    args.push(status)
  }
  if (wid) {
    where.push('b.wedding_id = ?')
    args.push(wid)
  }
  const w = where.length ? ' WHERE ' + where.join(' AND ') : ''
  const total = await n(db, 'SELECT COUNT(*) AS n FROM blessings b' + w, ...args)
  const { results } = await db.prepare('SELECT b.id, b.wedding_id, b.author, b.content, b.likes, b.status, b.created_at FROM blessings b' + w + ' ORDER BY b.id DESC LIMIT ? OFFSET ?').bind(...args, size, offset).all<any>()
  return ok(c, {
    total,
    page: p,
    size,
    items: (results || []).map((b) => ({ id: b.id, wid: b.wedding_id, author: b.author || '', content: b.content || '', likes: Number(b.likes) || 0, status: b.status, createdAt: cnTime(b.created_at) })),
  })
})

platform.post('/blessings/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const action = String(body.action || '')
  if (action === 'hide' || action === 'show') {
    await c.env.DB.prepare('UPDATE blessings SET status = ? WHERE id = ?').bind(action === 'hide' ? 'hidden' : 'visible', id).run()
  } else if (action === 'delete') {
    await c.env.DB.prepare('DELETE FROM blessings WHERE id = ?').bind(id).run()
  } else return fail(c, '未知操作')
  return ok(c, { id, action })
})

// ---------------- 价格 / 套餐配置 ----------------
// 旧结构（兼容）：免费版 / 高级版
platform.get('/pricing', async (c) => ok(c, await getPricing(c.env.DB)))
platform.put('/pricing', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body || typeof body !== 'object') return fail(c, '格式错误')
  return ok(c, await saveLegacyPricing(c.env.DB, body))
})

// 多档套餐：列表（含未上架）+ 每档婚礼数
platform.get('/plans', async (c) => {
  const db = c.env.DB
  const plans = await getPlans(db)
  const counts = (await db.prepare('SELECT plan, COUNT(*) AS n FROM weddings GROUP BY plan').all<any>()).results || []
  return ok(c, {
    plans: plans.map((p) => ({ ...p, weddings: Number(counts.find((x) => x.plan === p.code)?.n) || 0 })),
    themes: ALL_THEMES.map((k) => ({ key: k, name: THEME_NAMES[k] })),
    effects: EFFECTS.map((k) => ({ key: k, name: EFFECT_NAMES[k] })),
  })
})
platform.post('/plans', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, any>
  const code = String(body.code || '').trim().toLowerCase()
  if (!CODE_RE.test(code)) return fail(c, '套餐编码需为 2-16 位小写字母/数字/下划线，且以字母开头（如 basic、vip）')
  if (await getPlanDef(c.env.DB, code)) return fail(c, '套餐编码已存在', 409)
  const p = sanitizePlan({ ...body, code })
  p.code = code
  await createPlan(c.env.DB, p)
  return ok(c, await getPlanDef(c.env.DB, code))
})
platform.put('/plans/:code', async (c) => {
  const code = c.req.param('code')
  const cur = await getPlanDef(c.env.DB, code)
  if (!cur) return fail(c, '套餐不存在', 404)
  const body = (await c.req.json().catch(() => ({}))) as Record<string, any>
  const p = sanitizePlan({ ...cur, ...body, ent: { ...cur.ent, ...(body.ent || {}) } }, cur)
  await updatePlan(c.env.DB, p)
  return ok(c, await getPlanDef(c.env.DB, code))
})
platform.delete('/plans/:code', async (c) => {
  const db = c.env.DB
  const code = c.req.param('code')
  if (code === 'free' || code === 'premium') return fail(c, '免费版和高级版是内置套餐，不能删除（可以下架）', 400)
  if (!(await getPlanDef(db, code))) return fail(c, '套餐不存在', 404)
  const used = await n(db, 'SELECT COUNT(*) AS n FROM weddings WHERE plan = ?', code)
  if (used > 0) return fail(c, '还有 ' + used + ' 场婚礼在用这个套餐，请先改为其它套餐或选择下架', 409)
  await deletePlan(db, code)
  return ok(c, { code, deleted: true })
})

// ---------------- 平台关键词（内容安全补充） ----------------
platform.get('/keywords', async (c) => {
  const row = await c.env.DB.prepare("SELECT value FROM config WHERE key = 'moderation_keywords'").first<{ value: string }>()
  return ok(c, { keywords: row?.value || '' })
})
platform.put('/keywords', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const v = typeof body.keywords === 'string' ? body.keywords.slice(0, 20000) : ''
  await c.env.DB.prepare("INSERT INTO config (key, value, updated_at) VALUES ('moderation_keywords', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .bind(v, new Date().toISOString())
    .run()
  resetKeywordCache()
  return ok(c, { keywords: v })
})

// 七牛视频访问域名：存在 config.qiniu_domain，改了不必重启服务
platform.get('/qiniu-domain', async (c) => {
  const domain = await getQiniuDomain(c.env.DB, c.env)
  return ok(c, { domain, key: 'qiniu_domain', fallback: DEFAULT_QINIU_DOMAIN })
})
platform.put('/qiniu-domain', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const raw = typeof body.domain === 'string' ? body.domain : ''
  const res = await setQiniuDomain(c.env.DB, raw)
  if (!res.ok) return fail(c, res.error, 400)
  return ok(c, { domain: res.domain, key: 'qiniu_domain' })
})

// 平台默认背景音乐：存在 config.default_bgm。未设置时小程序播放内置《红笺良辰》
platform.get('/default-bgm', async (c) => {
  const bgm = await getPlatformDefaultBgm(c.env.DB, c.env)
  return ok(c, { ...bgm, maxBytes: AUDIO_MAX_BYTES, bundled: { url: BUNDLED_BGM_URL, title: BUNDLED_BGM_TITLE } })
})
platform.post('/default-bgm', async (c) => {
  const creds = getQiniuCreds(c.env)
  if ('error' in creds) return fail(c, creds.error, 503)
  const ct = c.req.header('content-type') || ''
  const prevKey = await storedDefaultBgmKey(c.env.DB)
  if (ct.includes('multipart/form-data')) {
    const body = await c.req.parseBody()
    const file = body.file
    if (!file || typeof file === 'string') return fail(c, '请选择要上传的音频文件', 400)
    const fname = (file as File).name || 'bgm.mp3'
    const buf = new Uint8Array(await (file as File).arrayBuffer())
    if (!buf.byteLength) return fail(c, '音频文件是空的', 400)
    if (buf.byteLength > AUDIO_MAX_BYTES) return fail(c, '音频不能超过 20MB', 400)
    const titleRaw = typeof body.title === 'string' ? body.title.trim().slice(0, 80) : ''
    const key = newPlatformAudioKey(fname)
    const minted = await makeUploadToken(creds, key, { fsizeLimit: AUDIO_MAX_BYTES, mimeLimit: AUDIO_MIME_LIMIT })
    await uploadBufferToQiniu(creds, key, buf, minted.token, (file as File).type || 'audio/mpeg')
    const title = titleRaw || fname.replace(/\.[^.]+$/, '')
    const bgm = await setPlatformDefaultBgm(c.env.DB, c.env, { key, title })
    if (prevKey && prevKey !== key) {
      try { await deleteQiniuObject(creds, prevKey) } catch {}
    }
    return ok(c, bgm)
  }
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const key = typeof body.key === 'string' ? body.key.trim() : ''
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 80) : ''
  if (key && !platformAudioKeyAllowed(key)) return fail(c, '无效的音频文件路径', 400)
  if (!key && typeof body.url !== 'string') return fail(c, '缺少音频文件', 400)
  const bgm = await setPlatformDefaultBgm(c.env.DB, c.env, { key, url: typeof body.url === 'string' ? body.url : '', title })
  const nextKey = await storedDefaultBgmKey(c.env.DB)
  if (prevKey && nextKey && prevKey !== nextKey) {
    try { await deleteQiniuObject(creds, prevKey) } catch {}
  }
  return ok(c, bgm)
})
platform.delete('/default-bgm', async (c) => {
  const creds = getQiniuCreds(c.env)
  const prevKey = await storedDefaultBgmKey(c.env.DB)
  await clearPlatformDefaultBgm(c.env.DB)
  if (prevKey && !('error' in creds)) {
    try { await deleteQiniuObject(creds, prevKey) } catch {}
  }
  const bgm = await getPlatformDefaultBgm(c.env.DB, c.env)
  return ok(c, bgm)
})

// ---------------- 修改总后台密码 ----------------
platform.post('/password', async (c) => {
  if (!c.env.SESSION_SECRET) return fail(c, '服务端未配置 SESSION_SECRET', 503)
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const oldPassword = typeof body.oldPassword === 'string' ? body.oldPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : ''
  if (newPassword.length < 8) return fail(c, '新密码至少 8 位', 400)
  if (newPassword !== confirmPassword) return fail(c, '两次输入的新密码不一致', 400)
  const hash = await currentHash(c)
  if (!hash) return fail(c, '服务端未配置平台后台密码', 503)
  if (!(await verifyPassword(oldPassword, hash))) {
    const ip = clientIp(c)
    const f = fails.get(ip)
    const cur = f && Date.now() - f.at < 15 * 60_000 ? f : { n: 0, at: Date.now() }
    cur.n++
    fails.set(ip, cur)
    await new Promise((r) => setTimeout(r, 600))
    return fail(c, '当前密码不正确', 401)
  }
  if (await verifyPassword(newPassword, hash)) return fail(c, '新密码不能与当前密码相同', 400)
  const next = await hashPassword(newPassword)
  await updateAdminPassword(c.env.DB, 'admin', next)
  const exp = Math.floor(Date.now() / 1000) + TTL
  const sig = await hmac(tokenSecret(c.env.SESSION_SECRET, next), 'platform.' + exp)
  return ok(c, { token: issueToken(c.env.SESSION_SECRET, next, exp, sig), exp, changed: true })
})
