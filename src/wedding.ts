// src/wedding.ts — 婚礼小程序（wxapp）后端 API
// 挂载于 /api 下（见 src/index.ts）；统一响应 {ok:true,data} / {ok:false,error}
import { Hono } from 'hono'
import {
  ok,
  fail,
  signToken,
  optionalAuth,
  requireAuth,
  requireAdmin,
  getOpenid,
  isAdminOpenid,
} from './auth'
import type { AppEnv } from './auth'

export const wedding = new Hono<AppEnv>()

// ---------------- 小工具 ----------------

// 占位名（不算有效姓名）：与小程序旧版行为一致
const PLACEHOLDER_NAMES = ['特邀宾客', '特邀佳宾', '亲朋好友', '微信宾客', '微信用户']

function cleanName(v: unknown): string {
  const s = typeof v === 'string' ? v.trim().slice(0, 64) : ''
  return PLACEHOLDER_NAMES.includes(s) ? '' : s
}

function str(v: unknown, max = 200): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

// 仅接受 http(s) 头像地址（wxfile:// 等本地临时路径不入库）
function httpUrl(v: unknown): string {
  const s = str(v, 500)
  return /^https?:\/\//i.test(s) ? s : ''
}

function nowIso(): string {
  return new Date().toISOString()
}

// 按 +8（中国时间）格式化时间为 'YYYY-MM-DD HH:mm'（不依赖运行环境时区）
function formatCnDateTime(raw: string): string {
  const s = String(raw || '')
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z')
  if (isNaN(d.getTime())) return '刚刚'
  const t = new Date(d.getTime() + 8 * 3600 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return t.getUTCFullYear() + '-' + p(t.getUTCMonth() + 1) + '-' + p(t.getUTCDate()) +
    ' ' + p(t.getUTCHours()) + ':' + p(t.getUTCMinutes())
}

// D1 行 → RSVP 输出（camelCase，兼容小程序旧接口形状）
function rsvpOut(r: Record<string, unknown>) {
  return {
    id: r.id,
    name: str(r.name),
    phone: str(r.phone),
    openid: str(r.openid),
    attending: r.attending === 'no' ? 'no' : 'yes',
    guestCount: Number(r.guest_count ?? 1) || 1,
    dietary: str(r.dietary),
    needsShuttle: Boolean(r.need_shuttle),
    blessing: str(r.blessing),
    avatarUrl: str(r.avatar_url),
    source: str(r.source),
    submittedAt: formatCnDateTime(String(r.submitted_at || '')),
  }
}

// users 表 upsert：新值非空才覆盖旧值
async function upsertUser(
  db: D1Database,
  openid: string,
  p: { name?: string; phone?: string; blessing?: string; avatar?: string },
) {
  const now = nowIso()
  await db
    .prepare(
      'INSERT INTO users (openid, name, phone, avatar_url, blessing, first_seen, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT(openid) DO UPDATE SET ' +
        "name = CASE WHEN excluded.name != '' THEN excluded.name ELSE users.name END, " +
        "phone = CASE WHEN excluded.phone != '' THEN excluded.phone ELSE users.phone END, " +
        "avatar_url = CASE WHEN excluded.avatar_url != '' THEN excluded.avatar_url ELSE users.avatar_url END, " +
        "blessing = CASE WHEN excluded.blessing != '' THEN excluded.blessing ELSE users.blessing END, " +
        'last_seen = excluded.last_seen',
    )
    .bind(openid, p.name || '', p.phone || '', p.avatar || '', p.blessing || '', now, now)
    .run()
}

// 写祝福墙（同 openid 同内容去重；返回是否新插入）
async function insertBlessingIfNew(
  db: D1Database,
  openid: string,
  author: string,
  content: string,
  avatar: string,
): Promise<boolean> {
  if (openid) {
    const dup = await db
      .prepare('SELECT 1 AS x FROM blessings WHERE openid = ? AND content = ? LIMIT 1')
      .bind(openid, content)
      .first()
    if (dup) return false
  }
  await db
    .prepare(
      'INSERT INTO blessings (openid, author, content, avatar_url, likes, created_at) VALUES (?, ?, ?, ?, 1, ?)',
    )
    .bind(openid || null, author || '亲朋好友', content, avatar || '', nowIso())
    .run()
  return true
}

// ---------------- 登录 ----------------

// POST /api/login {code, mockId?} → {openid, token, exp, isAdmin, mock}
// 真实微信登录：服务端用 AppSecret 调 jscode2session（AppSecret 永不落客户端）
// 本地开发 mock：仅当 WX_MOCK_LOGIN=1 且未配置 WX_APPSECRET 时启用；
// wx.login 的 code 每次都变，故用客户端持久化的 mockId 保证身份稳定
wedding.post('/login', async (c) => {
  const secret = c.env.SESSION_SECRET
  if (!secret) return fail(c, '服务端未配置 SESSION_SECRET，请检查 .dev.vars 或 Wrangler Secret', 500)

  const body = (await c.req.json().catch(() => null)) as { code?: string; mockId?: string } | null
  const code = str(body?.code, 512)
  let openid = ''
  let mock = false

  if (c.env.WX_APPID && c.env.WX_APPSECRET) {
    if (!code) return fail(c, '缺少微信登录 code', 400)
    const url =
      'https://api.weixin.qq.com/sns/jscode2session?appid=' +
      encodeURIComponent(c.env.WX_APPID) +
      '&secret=' +
      encodeURIComponent(c.env.WX_APPSECRET) +
      '&js_code=' +
      encodeURIComponent(code) +
      '&grant_type=authorization_code'
    const res = await fetch(url)
    const data = (await res.json().catch(() => null)) as {
      openid?: string
      errcode?: number
      errmsg?: string
    } | null
    if (!data?.openid) {
      return fail(c, '微信登录失败：' + (data?.errmsg || 'errcode ' + (data?.errcode ?? '未知')), 502)
    }
    openid = data.openid
  } else if (c.env.WX_MOCK_LOGIN === '1') {
    const mockId = str(body?.mockId, 128) || code || 'default'
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('wedding-mock:' + mockId))
    const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
    openid = 'wx_guest_' + hex.slice(0, 16)
    mock = true
  } else {
    return fail(c, '服务端未配置微信登录凭据（WX_APPID / WX_APPSECRET）', 500)
  }

  const { token, exp } = await signToken(secret, openid)

  // 记录登录：login_count +1 / last_seen
  const now = nowIso()
  await c.env.DB.prepare(
    'INSERT INTO users (openid, first_seen, last_seen, login_count) VALUES (?, ?, ?, 1) ' +
      'ON CONFLICT(openid) DO UPDATE SET last_seen = excluded.last_seen, login_count = users.login_count + 1',
  )
    .bind(openid, now, now)
    .run()

  return ok(c, { openid, token, exp, isAdmin: isAdminOpenid(c.env, openid), mock })
})

// ---------------- 婚礼配置 ----------------

// 允许写入的顶层字段白名单
const CONFIG_ALLOWED_KEYS = [
  'theme',
  'groom',
  'bride',
  'date',
  'time',
  'venue',
  'music',
  'bgm',
  'coverImage',
  'story',
  'stories',
  'schedule',
  'contacts',
  'letterParagraphs',
  'lunarDate',
  'invitationTitle',
  'invitationProse',
]

// GET /api/config → 婚礼配置 JSON（空库返回 {}，客户端与内置默认值 merge）
wedding.get('/config', async (c) => {
  const row = await c.env.DB.prepare("SELECT value FROM config WHERE key = 'wedding'").first<{ value: string }>()
  let cfg: unknown = {}
  if (row?.value) {
    try {
      cfg = JSON.parse(row.value)
    } catch {
      cfg = {}
    }
  }
  return ok(c, cfg)
})

// PUT /api/config（管理员）→ 保存婚礼配置
wedding.put('/config', requireAdmin, async (c) => {
  const raw = await c.req.text()
  if (raw.length > 100 * 1024) return fail(c, '配置过大（超过 100KB 限制）', 413)
  let cfg: unknown
  try {
    cfg = JSON.parse(raw)
  } catch {
    return fail(c, '内容不是有效的 JSON', 400)
  }
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return fail(c, '配置必须是 JSON 对象', 400)

  const badKeys = Object.keys(cfg as Record<string, unknown>).filter((k) => !CONFIG_ALLOWED_KEYS.includes(k))
  if (badKeys.length > 0) return fail(c, '不支持的配置字段：' + badKeys.join(', '), 400)

  await c.env.DB.prepare(
    "INSERT INTO config (key, value, updated_at) VALUES ('wedding', ?, ?) " +
      'ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
  )
    .bind(JSON.stringify(cfg), nowIso())
    .run()
  return ok(c, { saved: true })
})

// ---------------- 我的档案（旧接口兼容形状） ----------------

// GET /api/me（登录）→ {matched, name, phone, blessing, rsvp, isAdmin}
wedding.get('/me', requireAuth, async (c) => {
  const openid = getOpenid(c)
  const user = await c.env.DB.prepare('SELECT name, phone, blessing FROM users WHERE openid = ?')
    .bind(openid)
    .first<Record<string, unknown>>()
  const rsvp = await c.env.DB.prepare('SELECT * FROM rsvps WHERE openid = ?')
    .bind(openid)
    .first<Record<string, unknown>>()

  const name = str(user?.name) || (rsvp ? str(rsvp.name) : '')
  const phone = str(user?.phone) || (rsvp ? str(rsvp.phone) : '')
  const blessing = str(user?.blessing) || (rsvp ? str(rsvp.blessing) : '')

  return ok(c, {
    matched: Boolean(name || phone || rsvp),
    name,
    phone,
    blessing,
    rsvp: rsvp ? rsvpOut(rsvp) : null,
    isAdmin: isAdminOpenid(c.env, openid),
  })
})

// ---------------- 用户同步（首页填名 / 活跃上报） ----------------

// POST /api/users/sync（登录）{name?, phone?, blessing?, avatarUrl?}
wedding.post('/users/sync', requireAuth, async (c) => {
  const openid = getOpenid(c)
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const name = cleanName(body.name)
  const phone = str(body.phone, 32)
  const blessing = str(body.blessing, 500)
  const avatar = httpUrl(body.avatarUrl ?? body.avatar)

  await upsertUser(c.env.DB, openid, { name, phone, blessing, avatar })

  // 若填了有效姓名且尚无回执行 → 预建一条初步回执（镜像旧版行为，让新人能看到访客）
  let preCreated = false
  if (name) {
    const now = nowIso()
    const res = await c.env.DB.prepare(
      "INSERT OR IGNORE INTO rsvps (openid, source, name, phone, attending, guest_count, dietary, need_shuttle, blessing, avatar_url, submitted_at, updated_at) " +
        "VALUES (?, 'auto', ?, ?, 'yes', 1, '', 0, ?, ?, ?, ?)",
    )
      .bind(openid, name, phone, blessing, avatar, now, now)
      .run()
    preCreated = res.meta.changes > 0
  }

  // 带祝福语 → 顺手写祝福墙（去重）
  if (blessing) await insertBlessingIfNew(c.env.DB, openid, name || '亲朋好友', blessing, avatar)

  return ok(c, { synced: true, preCreated })
})

// ---------------- 绑定预填宾客 ----------------

// POST /api/bind（登录）{name?, phone?}
// 在「新人预填且未绑定」（openid IS NULL AND source='prefill'）的行上回填 openid；
// 匹配优先级：手机号 > 姓名。本人若已有 auto 初步行则合并后删除；已有正式提交则不动。
wedding.post('/bind', requireAuth, async (c) => {
  const openid = getOpenid(c)
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const name = cleanName(body.name)
  const phone = str(body.phone, 32)
  if (!name && !phone) return ok(c, { updated: false })

  let target: { id: number } | null = null
  if (phone) {
    target = await c.env.DB.prepare(
      "SELECT id FROM rsvps WHERE openid IS NULL AND source = 'prefill' AND phone = ? LIMIT 1",
    )
      .bind(phone)
      .first<{ id: number }>()
  }
  if (!target && name) {
    target = await c.env.DB.prepare(
      "SELECT id FROM rsvps WHERE openid IS NULL AND source = 'prefill' AND name = ? LIMIT 1",
    )
      .bind(name)
      .first<{ id: number }>()
  }
  if (!target) return ok(c, { updated: false })

  const mine = await c.env.DB.prepare(
    'SELECT id, source, name, phone, blessing, avatar_url FROM rsvps WHERE openid = ?',
  )
    .bind(openid)
    .first<Record<string, unknown>>()
  if (mine && mine.source === 'form') return ok(c, { updated: false, message: '已有正式回执，无需绑定' })

  // 回填 openid；prefill 行缺的字段用本人已有资料补齐（带 AND openid IS NULL 防并发双绑）
  const upd = await c.env.DB.prepare(
    'UPDATE rsvps SET openid = ?, ' +
      "name = CASE WHEN name IS NULL OR name = '' THEN ? ELSE name END, " +
      "phone = CASE WHEN phone IS NULL OR phone = '' THEN ? ELSE phone END, " +
      "blessing = CASE WHEN (blessing IS NULL OR blessing = '') AND ? != '' THEN ? ELSE blessing END, " +
      "avatar_url = CASE WHEN (avatar_url IS NULL OR avatar_url = '') AND ? != '' THEN ? ELSE avatar_url END, " +
      'updated_at = ? WHERE id = ? AND openid IS NULL',
  )
    .bind(
      openid,
      str(mine?.name),
      str(mine?.phone),
      str(mine?.blessing),
      str(mine?.blessing),
      str(mine?.avatar_url),
      str(mine?.avatar_url),
      nowIso(),
      target.id,
    )
    .run()

  const updated = upd.meta.changes > 0
  if (updated && mine && mine.source === 'auto') {
    await c.env.DB.prepare('DELETE FROM rsvps WHERE id = ?').bind(mine.id).run()
  }
  return ok(c, { updated })
})

// ---------------- 宾客回执 ----------------

// POST /api/rsvp（登录可选）→ 提交/更新回执；字段名兼容新旧两种（attending|status 等）
wedding.post('/rsvp', optionalAuth, async (c) => {
  const openid = getOpenid(c)
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const name = str(body.name, 64)
  if (!name) return fail(c, '请填写宾客姓名或昵称', 400)

  const phone = str(body.phone, 32)
  const attending = body.attending === 'no' || body.status === 'no' ? 'no' : 'yes'
  const rawCount = parseInt(String(body.guestCount ?? body.guestsCount ?? 1), 10)
  const guestCount = attending === 'yes' ? Math.min(Math.max(rawCount || 1, 1), 20) : 0
  const dietary = attending === 'yes' ? str(body.dietary, 32) : ''
  const needShuttle = attending === 'yes' && Boolean(body.needShuttle ?? body.needsShuttle) ? 1 : 0
  const blessing = str(body.blessing, 500)
  const avatar = httpUrl(body.avatarUrl ?? body.avatar)
  const now = nowIso()

  if (openid) {
    await c.env.DB.prepare(
      'INSERT INTO rsvps (openid, source, name, phone, attending, guest_count, dietary, need_shuttle, blessing, avatar_url, submitted_at, updated_at) ' +
        "VALUES (?, 'form', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(openid) DO UPDATE SET source = 'form', name = excluded.name, phone = excluded.phone, " +
        'attending = excluded.attending, guest_count = excluded.guest_count, dietary = excluded.dietary, ' +
        'need_shuttle = excluded.need_shuttle, blessing = excluded.blessing, avatar_url = excluded.avatar_url, ' +
        'updated_at = excluded.updated_at',
    )
      .bind(openid, name, phone, attending, guestCount, dietary, needShuttle, blessing, avatar, now, now)
      .run()
    await upsertUser(c.env.DB, openid, { name, phone, blessing, avatar })
  } else {
    // 无登录态：有手机号则按手机号覆盖最近一条未绑定记录，否则新建
    let updated = 0
    if (phone) {
      const res = await c.env.DB.prepare(
        "UPDATE rsvps SET source = 'form', name = ?, attending = ?, guest_count = ?, dietary = ?, " +
          'need_shuttle = ?, blessing = ?, avatar_url = ?, updated_at = ? WHERE openid IS NULL AND phone = ?',
      )
        .bind(name, attending, guestCount, dietary, needShuttle, blessing, avatar, now, phone)
        .run()
      updated = res.meta.changes
    }
    if (!updated) {
      await c.env.DB.prepare(
        "INSERT INTO rsvps (openid, source, name, phone, attending, guest_count, dietary, need_shuttle, blessing, avatar_url, submitted_at, updated_at) " +
          "VALUES (NULL, 'form', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
        .bind(name, phone, attending, guestCount, dietary, needShuttle, blessing, avatar, now, now)
        .run()
    }
  }

  // 带祝福 → 写祝福墙（去重，修掉旧版双写 bug）
  if (blessing) await insertBlessingIfNew(c.env.DB, openid, name, blessing, avatar)

  return ok(c, { saved: true })
})

// ---------------- 后台：回执全量列表 ----------------

// GET /api/rsvps（管理员）→ 全量回执（camelCase）
wedding.get('/rsvps', requireAdmin, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, openid, source, name, phone, attending, guest_count, dietary, need_shuttle, blessing, avatar_url, submitted_at ' +
      'FROM rsvps ORDER BY id DESC LIMIT 1000',
  ).all<Record<string, unknown>>()
  return ok(c, (results || []).map(rsvpOut))
})

// ---------------- 祝福墙 ----------------

// GET /api/blessings → 倒序列表
wedding.get('/blessings', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, author, content, avatar_url, likes, created_at FROM blessings ORDER BY id DESC LIMIT 200',
  ).all<Record<string, unknown>>()
  const list = (results || []).map((r) => ({
    id: r.id,
    author: str(r.author) || '亲朋好友',
    avatar: str(r.avatar_url),
    content: str(r.content),
    likes: Number(r.likes) || 0,
    createdAt: formatCnDateTime(String(r.created_at || '')),
  }))
  return ok(c, list)
})

// POST /api/blessings（登录可选）{author, content, avatar?}
wedding.post('/blessings', optionalAuth, async (c) => {
  const openid = getOpenid(c)
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const content = str(body.content ?? body.text, 500)
  if (!content) return fail(c, '祝福内容不能为空', 400)
  const author = str(body.author ?? body.name, 64) || '亲朋好友'
  const avatar = httpUrl(body.avatar)
  const created = await insertBlessingIfNew(c.env.DB, openid, author, content, avatar)
  return ok(c, { created, message: created ? '祝福已送达' : '已收到重复祝福，未重复记录' })
})

// POST /api/blessings/:id/like → 点赞 +1，返回最新 likes
wedding.post('/blessings/:id/like', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return fail(c, '无效的 id', 400)
  const row = await c.env.DB.prepare('UPDATE blessings SET likes = likes + 1 WHERE id = ? RETURNING likes')
    .bind(id)
    .first<{ likes: number }>()
  if (!row) return fail(c, '祝福不存在', 404)
  return ok(c, { likes: row.likes })
})

// ---------------- 微信手机号 ----------------

// 取微信 access_token（stable_token + 缓存到 config 表，避免每次取号都打微信接口）
async function getWxAccessToken(db: D1Database, appid: string, secret: string): Promise<string> {
  const row = await db.prepare("SELECT value FROM config WHERE key = 'wx_access_token'").first<{ value: string }>()
  if (row?.value) {
    try {
      const cached = JSON.parse(row.value) as { token: string; expiresAt: number }
      if (cached.token && cached.expiresAt > Date.now() + 60_000) return cached.token
    } catch {
      // 缓存损坏则忽略，重新获取
    }
  }
  const res = await fetch('https://api.weixin.qq.com/cgi-bin/stable_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credential', appid, secret, force_refresh: false }),
  })
  const data = (await res.json().catch(() => null)) as {
    access_token?: string
    expires_in?: number
    errmsg?: string
  } | null
  if (!data?.access_token) throw new Error('获取微信 access_token 失败：' + (data?.errmsg || '未知错误'))
  const value = JSON.stringify({
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 7200) * 1000,
  })
  await db
    .prepare(
      "INSERT INTO config (key, value, updated_at) VALUES ('wx_access_token', ?, ?) " +
        'ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    )
    .bind(value, nowIso())
    .run()
  return data.access_token
}

// POST /api/wechat/phone {code} → {phoneNumber}（微信官方 getPhoneNumber 的 code 换取）
// 未配置微信凭据（本地开发）→ 返回演示号码；小程序端有“可直接输入手机号”兜底
wedding.post('/wechat/phone', optionalAuth, async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const code = str(body.code, 512)
  if (!c.env.WX_APPID || !c.env.WX_APPSECRET) {
    return ok(c, { phoneNumber: '13888888888', mock: true })
  }
  if (!code) return fail(c, '缺少手机号授权 code', 400)
  try {
    const token = await getWxAccessToken(c.env.DB, c.env.WX_APPID, c.env.WX_APPSECRET)
    const res = await fetch(
      'https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=' + encodeURIComponent(token),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      },
    )
    const data = (await res.json().catch(() => null)) as {
      phone_info?: { phoneNumber?: string; purePhoneNumber?: string; countryCode?: string }
      errmsg?: string
    } | null
    const info = data?.phone_info
    if (!info?.phoneNumber) return fail(c, '获取手机号失败：' + (data?.errmsg || '未知错误'), 502)
    return ok(c, {
      phoneNumber: info.phoneNumber,
      purePhoneNumber: info.purePhoneNumber || '',
      countryCode: info.countryCode || '86',
    })
  } catch (e) {
    return fail(c, '获取手机号失败：' + (e instanceof Error ? e.message : String(e)), 502)
  }
})
