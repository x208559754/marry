// src/trial-routes.ts — 试用开通（绑手机号 + 设密码 + 基础版婚礼）与自定义背景音乐
import type { Hono } from 'hono'
import {
  ok,
  fail,
  optionalAuth,
  requireAuth,
  requireWid,
  requireAdmin,
  getOpenid,
  getWid,
  isWeddingAdmin,
} from './auth'
import type { AppEnv } from './auth'
import { getWxAccessToken } from './wx'
import { getWeddingPlan, displayPlan, logPlan, limitReached } from './billing'
import {
  AUDIO_MAX_BYTES,
  AUDIO_MIME_LIMIT,
  audioKeyAllowed,
  deleteQiniuObject,
  foldQiniuUrl,
  fromQiniuMarker,
  getQiniuCreds,
  getQiniuDomain,
  makeUploadToken,
  newAudioKey,
  publicObjectUrl,
  toQiniuMarker,
} from './qiniu'
import {
  canCustomizeBgm,
  getPlatformDefaultBgm,
  musicForSave,
  resolvePlayback,
  storedFromConfig,
} from './bgm'
import {
  findExistingPhone,
  getAccount,
  isSuperAdminPhone,
  listAdminWeddings,
  normalizePhone,
  phoneTakenByOther,
  statusOf,
  upsertAccount,
  validatePhone,
  verifyAccountPassword,
  PHONE_RE,
} from './account'
import { defaultWeddingConfig, genUniqueWid, isValidWid } from './wid'

function str(v: unknown, max = 200): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

function nowIso(): string {
  return new Date().toISOString()
}

async function resolveWxPhone(c: any, code: string): Promise<{ phone: string; mock?: boolean } | { error: string; status: number }> {
  if (!c.env.WX_APPID || !c.env.WX_APPSECRET) {
    // 本地未配微信凭据时允许用手动输入；没有手动号则给演示号
    return { phone: '', mock: true }
  }
  if (!code) return { error: '缺少手机号授权 code', status: 400 }
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
      phone_info?: { phoneNumber?: string; purePhoneNumber?: string }
      errmsg?: string
    } | null
    const raw = data?.phone_info?.purePhoneNumber || data?.phone_info?.phoneNumber || ''
    const phone = normalizePhone(raw)
    if (!PHONE_RE.test(phone)) return { error: '获取手机号失败：' + (data?.errmsg || '未返回有效号码'), status: 502 }
    return { phone }
  } catch (e) {
    return { error: '获取手机号失败：' + (e instanceof Error ? e.message : String(e)), status: 502 }
  }
}

async function accountPayload(c: any, openid: string) {
  const row = await getAccount(c.env.DB, openid)
  const fallback = row?.phone ? '' : await findExistingPhone(c.env.DB, openid)
  const phone = normalizePhone(row?.phone) || fallback
  const st = statusOf(openid, row, fallback)
  const wid = String(c.req.query('wid') || '').trim().slice(0, 64)
  const owned = await listAdminWeddings(c.env.DB, openid)
  const isCurrentAdmin = wid ? await isWeddingAdmin(c, wid, openid) : false
  return {
    ...st,
    canEnterSuperAdmin: isSuperAdminPhone(phone),
    currentWid: wid || '',
    isCurrentAdmin,
    weddings: owned.map((w) => ({
      id: w.id,
      groomName: w.groom_name || '',
      brideName: w.bride_name || '',
      plan: w.plan || 'free',
    })),
  }
}

async function syncPhoneToUsers(db: any, openid: string, phone: string) {
  await db.prepare('UPDATE users SET phone = ? WHERE openid = ?').bind(phone, openid).run()
}

async function readWeddingConfig(db: any, wid: string): Promise<Record<string, unknown>> {
  const row = await db.prepare('SELECT config FROM weddings WHERE id = ?').bind(wid).first<{ config: string | null }>()
  if (!row) return {}
  try {
    const parsed = row.config ? JSON.parse(row.config) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

async function writeWeddingConfig(db: any, wid: string, cfg: Record<string, unknown>) {
  const now = nowIso()
  const obj = cfg as any
  const groomName =
    obj.groom && typeof obj.groom === 'object' && obj.groom.name ? String(obj.groom.name).slice(0, 64) : ''
  const brideName =
    obj.bride && typeof obj.bride === 'object' && obj.bride.name ? String(obj.bride.name).slice(0, 64) : ''
  await db
    .prepare(
      'UPDATE weddings SET config = ?, groom_name = COALESCE(NULLIF(?, ""), groom_name), bride_name = COALESCE(NULLIF(?, ""), bride_name), updated_at = ? WHERE id = ?',
    )
    .bind(JSON.stringify(cfg), groomName, brideName, now, wid)
    .run()
}

export function registerTrialRoutes(wedding: Hono<AppEnv>) {
  // GET /api/account?wid=（登录）→ 绑定状态、已管理的婚礼
  wedding.get('/account', requireAuth, async (c) => {
    const openid = getOpenid(c)
    return ok(c, await accountPayload(c, openid))
  })

  // POST /api/account/bind（登录）{phoneCode} → 仅通过微信一键授权绑定手机号（不支持手动填，且无需设置密码）
  wedding.post('/account/bind', requireAuth, async (c) => {
    const openid = getOpenid(c)
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    const phoneCode = str(body.phoneCode || body.code, 512)
    const existing = await getAccount(c.env.DB, openid)
    const fallback = existing?.phone ? '' : await findExistingPhone(c.env.DB, openid)
    const wxConfigured = Boolean(c.env.WX_APPID && c.env.WX_APPSECRET)

    let phone = ''
    if (wxConfigured) {
      if (!phoneCode) {
        const already = normalizePhone(existing?.phone) || fallback
        if (PHONE_RE.test(already)) {
          phone = already
        } else {
          return fail(c, '请通过微信一键授权手机号，不支持手动填写', 400)
        }
      } else {
        const got = await resolveWxPhone(c, phoneCode)
        if ('error' in got) return fail(c, got.error, got.status)
        phone = got.phone
      }
    } else {
      // 本地开发未配置 WX_APPID/WX_APPSECRET 时兜底演示号
      phone = normalizePhone(existing?.phone) || fallback || '13800138000'
    }

    const phoneErr = validatePhone(phone)
    if (phoneErr) return fail(c, '获取微信授权手机号失败，请重试', 400)
    if (await phoneTakenByOther(c.env.DB, phone, openid)) return fail(c, '该手机号已绑定其他微信，请更换微信号或联系客服', 409)

    await upsertAccount(c.env.DB, openid, { phone })
    await syncPhoneToUsers(c.env.DB, openid, phone)
    return ok(c, await accountPayload(c, openid))
  })

  // POST /api/account/verify（登录）{password} → 校验本账号登录密码
  wedding.post('/account/verify', requireAuth, async (c) => {
    const openid = getOpenid(c)
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    const password = typeof body.password === 'string' ? body.password : ''
    const row = await getAccount(c.env.DB, openid)
    if (!row?.password_hash) return fail(c, '尚未设置登录密码', 400)
    const okPw = await verifyAccountPassword(row, password)
    if (!okPw) return fail(c, '密码不正确', 403)
    return ok(c, { verified: true })
  })

  // POST /api/account/start（登录）{groomName?, brideName?} → 开通一场基础版婚礼（wid 为随机 UUID）
  wedding.post('/account/start', requireAuth, async (c) => {
    const openid = getOpenid(c)
    const row = await getAccount(c.env.DB, openid)
    const fallback = row?.phone ? '' : await findExistingPhone(c.env.DB, openid)
    const st = statusOf(openid, row, fallback)
    if (!st.phoneBound) return fail(c, '请先通过微信授权手机号', 403)

    const owned = await listAdminWeddings(c.env.DB, openid)
    if (owned.length) {
      const first = owned[0]
      return c.json(
        {
          ok: false as const,
          error: '你已有一场请柬，可直接进入管理',
          code: 'ALREADY_HAS_WEDDING',
          data: { existingWid: first.id, id: first.id },
        },
        409,
      )
    }

    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    const groom = str(body.groomName, 32) || '新郎'
    const bride = str(body.brideName, 32) || '新娘'
    const id = await genUniqueWid(c.env.DB)
    const now = nowIso()
    const cfg = defaultWeddingConfig(groom, bride)
    await c.env.DB.prepare(
      'INSERT INTO weddings (id, groom_name, bride_name, config, plan, plan_activated_at, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(id, groom, bride, JSON.stringify(cfg), 'free', now, now, now)
      .run()
    await c.env.DB.prepare(
      'INSERT INTO users (openid, wedding_id, is_admin, phone, first_seen, last_seen, login_count) VALUES (?, ?, 1, ?, ?, ?, 1) ' +
        'ON CONFLICT(openid, wedding_id) DO UPDATE SET is_admin = 1, phone = COALESCE(excluded.phone, users.phone), last_seen = excluded.last_seen',
    )
      .bind(openid, id, row?.phone || fallback || null, now, now)
      .run()
    try {
      await logPlan(c.env.DB, id, 'manual', '', 'free', { note: '试用开通基础版', operator: 'user' })
    } catch {}
    return ok(c, { id, wid: id, plan: 'free', planName: '免费版', groomName: groom, brideName: bride })
  })

  // GET /api/music?wid=（该婚礼管理员）→ 自定义音乐与平台默认
  wedding.get('/music', requireAdmin, async (c) => {
    const wid = getWid(c)
    const wp = await getWeddingPlan(c.env.DB, wid)
    const entitled = canCustomizeBgm(wp)
    const domain = await getQiniuDomain(c.env.DB, c.env)
    const platform = await getPlatformDefaultBgm(c.env.DB, c.env)
    const cfg = await readWeddingConfig(c.env.DB, wid)
    const stored = storedFromConfig(cfg)
    const playing = resolvePlayback(stored, entitled, platform, domain)
    return ok(c, {
      entitled,
      hasCustom: playing.hasCustom,
      playing,
      custom: stored
        ? { url: playing.hasCustom && entitled ? playing.url : '', title: stored.title || '' }
        : null,
      default: { url: platform.url, title: platform.title, source: platform.source },
      maxBytes: AUDIO_MAX_BYTES,
      plan: displayPlan(wp),
    })
  })

  // POST /api/music/token?wid=（高级版管理员）→ 七牛直传凭证
  wedding.post('/music/token', requireAdmin, async (c) => {
    const wid = getWid(c)
    const wp = await getWeddingPlan(c.env.DB, wid)
    if (wp.status === 'disabled') return fail(c, '该婚礼已被平台停用', 403)
    if (!canCustomizeBgm(wp)) return limitReached(c, wp, '不支持自定义背景音乐，升级后即可上传自己的曲目')
    const creds = getQiniuCreds(c.env)
    if ('error' in creds) return fail(c, creds.error, 503)
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    const filename = str(body.filename || body.name, 80)
    const key = newAudioKey(wid, filename)
    const domain = await getQiniuDomain(c.env.DB, c.env)
    const minted = await makeUploadToken(creds, key, { fsizeLimit: AUDIO_MAX_BYTES, mimeLimit: AUDIO_MIME_LIMIT })
    return ok(c, {
      token: minted.token,
      key,
      uploadUrl: creds.uploadUrl,
      fileUrl: publicObjectUrl(domain, key),
      domain,
      expireAt: minted.expireAt,
      maxBytes: AUDIO_MAX_BYTES,
    })
  })

  // POST /api/music?wid= {key, title?} → 登记自定义背景音乐
  wedding.post('/music', requireAdmin, async (c) => {
    const wid = getWid(c)
    const wp = await getWeddingPlan(c.env.DB, wid)
    if (wp.status === 'disabled') return fail(c, '该婚礼已被平台停用', 403)
    if (!canCustomizeBgm(wp)) return limitReached(c, wp, '不支持自定义背景音乐，升级后即可上传自己的曲目')
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
    const key = str(body.key, 300)
    if (!audioKeyAllowed(wid, key)) return fail(c, '无效的音频文件路径', 400)
    const title = str(body.title, 80)
    const cfg = await readWeddingConfig(c.env.DB, wid)
    const prev = storedFromConfig(cfg)
    const prevKey = prev ? fromQiniuMarker(prev.url) : null
    cfg.music = musicForSave(title, toQiniuMarker(key))
    await writeWeddingConfig(c.env.DB, wid, cfg)
    if (prevKey && prevKey !== key) {
      const creds = getQiniuCreds(c.env)
      if (!('error' in creds)) {
        try {
          await deleteQiniuObject(creds, prevKey)
        } catch {}
      }
    }
    const domain = await getQiniuDomain(c.env.DB, c.env)
    const platform = await getPlatformDefaultBgm(c.env.DB, c.env)
    return ok(c, resolvePlayback(storedFromConfig(cfg), true, platform, domain))
  })

  // DELETE /api/music?wid= → 去掉自定义音乐，恢复平台默认
  wedding.delete('/music', requireAdmin, async (c) => {
    const wid = getWid(c)
    const cfg = await readWeddingConfig(c.env.DB, wid)
    const prev = storedFromConfig(cfg)
    const prevKey = prev ? fromQiniuMarker(prev.url) : null
    if (cfg.music) delete cfg.music
    await writeWeddingConfig(c.env.DB, wid, cfg)
    if (prevKey) {
      const creds = getQiniuCreds(c.env)
      if (!('error' in creds)) {
        try {
          await deleteQiniuObject(creds, prevKey)
        } catch {}
      }
    }
    const domain = await getQiniuDomain(c.env.DB, c.env)
    const platform = await getPlatformDefaultBgm(c.env.DB, c.env)
    const wp = await getWeddingPlan(c.env.DB, wid)
    return ok(c, resolvePlayback(null, canCustomizeBgm(wp), platform, domain))
  })
}

export { isValidWid, genUniqueWid }
