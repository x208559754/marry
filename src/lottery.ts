// src/lottery.ts — 婚宴现场抽奖（多租户：按 ?wid= 隔离；数据存 lotteries 表，不碰 weddings.config）
// 大屏网页通过 WebSocket /api/lottery/ws 接收推送（自建 Node 部署），失败时轮询 GET /api/lottery（公开）；小程序管理后台调用其余接口（requireAdmin）
// 统一响应 {ok:true,data} / {ok:false,error}
import { Hono } from 'hono'
import type { Context } from 'hono'
import { ok, fail, requireAdmin, requireWid, getWid, getOpenid } from './auth'
import { getWeddingPlan, limitReached, allowedTheme, displayPlan, THEME_NAMES } from './billing'
import { checkTexts } from './moderation'
import type { AppEnv } from './auth'

export const lottery = new Hono<AppEnv>()

// 开始抽奖后多久揭晓（毫秒）；管理端可点「立即开奖」提前
const ROLL_MS = 5000
const MAX_PRIZES = 50
const MAX_PARTICIPANTS = 2000
const MAX_COUNT = 200

type Prize = { id: string; name: string; reward: string; count: number }
type Participant = { id: string; name: string; source: 'rsvp' | 'manual' }
type Winner = { id: string; name: string }
// 大屏 / 小程序抽奖主题：red 中式红金（默认）、pink 浪漫樱粉、night 星河夜空、forest 森系花园、champagne 香槟白金
export const LOTTERY_THEMES = ['red', 'pink', 'night', 'forest', 'champagne'] as const
type Theme = (typeof LOTTERY_THEMES)[number]
type LotteryConfig = { prizes: Prize[]; participants: Participant[]; theme: Theme }
function sanitizeTheme(v: unknown): Theme {
  return typeof v === 'string' && (LOTTERY_THEMES as readonly string[]).includes(v) ? (v as Theme) : 'red'
}
type Status = 'idle' | 'rolling' | 'revealed' | 'board'
type LotteryState = {
  status: Status
  prizeId: string | null
  startedAt: number | null
  revealAt: number | null
  results: Record<string, Winner[]>
}

// 占位名（与 wedding.ts 保持一致），不导入为抽奖人
const PLACEHOLDER_NAMES = ['特邀宾客', '特邀佳宾', '亲朋好友', '微信宾客', '微信用户']

function s(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : typeof v === 'number' ? String(v).slice(0, max) : ''
}

function genId(prefix: string): string {
  const b = new Uint8Array(6)
  crypto.getRandomValues(b)
  return prefix + [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

function emptyConfig(): LotteryConfig {
  return { prizes: [], participants: [], theme: 'red' }
}

function emptyState(): LotteryState {
  return { status: 'idle', prizeId: null, startedAt: null, revealAt: null, results: {} }
}

function sanitizePrizes(raw: unknown): Prize[] {
  if (!Array.isArray(raw)) return []
  const out: Prize[] = []
  const seen = new Set<string>()
  for (const it of raw.slice(0, MAX_PRIZES)) {
    if (!it || typeof it !== 'object') continue
    const o = it as Record<string, unknown>
    let id = s(o.id, 40).replace(/[^A-Za-z0-9_-]/g, '')
    if (!id || seen.has(id)) id = genId('z')
    seen.add(id)
    const count = Math.floor(Number(o.count))
    out.push({
      id,
      name: s(o.name, 40),
      reward: s(o.reward, 60),
      count: Number.isFinite(count) ? Math.min(Math.max(count, 1), MAX_COUNT) : 1,
    })
  }
  return out
}

function sanitizeParticipants(raw: unknown): Participant[] {
  if (!Array.isArray(raw)) return []
  const out: Participant[] = []
  const seen = new Set<string>()
  for (const it of raw.slice(0, MAX_PARTICIPANTS)) {
    const o = (it && typeof it === 'object' ? it : { name: it }) as Record<string, unknown>
    const name = s(o.name, 32)
    if (!name) continue
    let id = s(o.id, 40).replace(/[^A-Za-z0-9_-]/g, '')
    if (!id || seen.has(id)) id = genId('p')
    seen.add(id)
    out.push({ id, name, source: o.source === 'rsvp' ? 'rsvp' : 'manual' })
  }
  return out
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' ? (v as T) : fallback
  } catch {
    return fallback
  }
}

async function loadWedding(db: D1Database, wid: string) {
  return db
    .prepare('SELECT id, groom_name, bride_name, config FROM weddings WHERE id = ?')
    .bind(wid)
    .first<{ id: string; groom_name: string | null; bride_name: string | null; config: string | null }>()
}

async function loadLottery(db: D1Database, wid: string): Promise<{ config: LotteryConfig; state: LotteryState }> {
  const row = await db
    .prepare('SELECT config, state FROM lotteries WHERE wedding_id = ?')
    .bind(wid)
    .first<{ config: string | null; state: string | null }>()
  const cfg = parseJson<Partial<LotteryConfig>>(row?.config, {})
  const st = parseJson<Partial<LotteryState>>(row?.state, {})
  const config: LotteryConfig = {
    prizes: sanitizePrizes(cfg.prizes),
    participants: sanitizeParticipants(cfg.participants),
    theme: sanitizeTheme(cfg.theme),
  }
  const base = emptyState()
  const state: LotteryState = {
    status: (['idle', 'rolling', 'revealed', 'board'] as const).includes(st.status as Status) ? (st.status as Status) : 'idle',
    prizeId: typeof st.prizeId === 'string' ? st.prizeId : null,
    startedAt: typeof st.startedAt === 'number' ? st.startedAt : null,
    revealAt: typeof st.revealAt === 'number' ? st.revealAt : null,
    results: st.results && typeof st.results === 'object' && !Array.isArray(st.results) ? (st.results as Record<string, Winner[]>) : base.results,
  }
  return { config, state }
}

async function saveLottery(db: D1Database, wid: string, config: LotteryConfig, state: LotteryState) {
  await db
    .prepare(
      'INSERT INTO lotteries (wedding_id, config, state, updated_at) VALUES (?, ?, ?, ?) ' +
        'ON CONFLICT(wedding_id) DO UPDATE SET config = excluded.config, state = excluded.state, updated_at = excluded.updated_at',
    )
    .bind(wid, JSON.stringify(config), JSON.stringify(state), new Date().toISOString())
    .run()
  notifyLotteryChange(db, wid, state)
}

// 抽奖状态变化监听（Node 部署注册，用于 WebSocket 推送到大屏；Worker 部署没有监听者）
type LotteryListener = (db: D1Database, wid: string, revealAt: number | null) => void
const lotteryListeners: LotteryListener[] = []
export function onLotteryChange(fn: LotteryListener) {
  lotteryListeners.push(fn)
}
function notifyLotteryChange(db: D1Database, wid: string, state: LotteryState) {
  for (const fn of lotteryListeners) {
    try {
      fn(db, wid, state.status === 'rolling' ? state.revealAt : null)
    } catch (e) {
      console.error('lottery listener error', e)
    }
  }
}

// rolling 且已到揭晓时间 → 视为 revealed
function effectiveStatus(state: LotteryState, now: number): Status {
  if (state.status === 'rolling' && state.revealAt !== null && now >= state.revealAt) return 'revealed'
  return state.status
}

// 去掉已不存在的奖项结果
function pruneResults(state: LotteryState, prizes: Prize[]) {
  const ids = new Set(prizes.map((p) => p.id))
  for (const k of Object.keys(state.results)) if (!ids.has(k)) delete state.results[k]
  if (state.prizeId && !ids.has(state.prizeId)) {
    state.status = 'idle'
    state.prizeId = null
    state.startedAt = null
    state.revealAt = null
  }
}

function wonIds(state: LotteryState, exceptPrize?: string): Set<string> {
  const set = new Set<string>()
  for (const [pid, list] of Object.entries(state.results)) {
    if (pid === exceptPrize || !Array.isArray(list)) continue
    for (const w of list) set.add(w.id)
  }
  return set
}

// 无偏随机整数 [0, n)
function randInt(n: number): number {
  const limit = Math.floor(0x100000000 / n) * n
  const buf = new Uint32Array(1)
  for (;;) {
    crypto.getRandomValues(buf)
    if (buf[0] < limit) return buf[0] % n
  }
}

function pickWinners(pool: Participant[], k: number): Winner[] {
  const arr = pool.slice()
  const n = Math.min(k, arr.length)
  for (let i = 0; i < n; i++) {
    const j = i + randInt(arr.length - i)
    const t = arr[i]
    arr[i] = arr[j]
    arr[j] = t
  }
  return arr.slice(0, n).map((p) => ({ id: p.id, name: p.name }))
}

function remainingPool(config: LotteryConfig, state: LotteryState, exceptPrize?: string): Participant[] {
  const won = wonIds(state, exceptPrize)
  return config.participants.filter((p) => !won.has(p.id))
}

function adminView(config: LotteryConfig, state: LotteryState, message?: string) {
  const now = Date.now()
  return {
    config,
    state: { ...state, status: effectiveStatus(state, now) },
    remainingCount: remainingPool(config, state).length,
    serverNow: now,
    rollMs: ROLL_MS,
    message: message || '',
  }
}

function coupleOf(w: { groom_name: string | null; bride_name: string | null; config: string | null }) {
  const cfg = parseJson<Record<string, any>>(w.config, {})
  const groom = s(cfg?.groom?.name, 32) || s(w.groom_name, 32)
  const bride = s(cfg?.bride?.name, 32) || s(w.bride_name, 32)
  return { groom, bride }
}

// ---------------- 公开：大屏读取 ----------------

// GET /api/lottery?wid= → 大屏展示所需数据；抽奖中（未到 revealAt）不返回当前奖项的中奖名单
// 大屏公开数据（GET /api/lottery 与 WebSocket 推送共用）；婚礼不存在返回 null
export async function publicLotteryView(db: D1Database, wid: string) {
  const w = await loadWedding(db, wid)
  if (!w) return null
  const { config, state } = await loadLottery(db, wid)
  const now = Date.now()
  const status = effectiveStatus(state, now)
  const hideCurrent = status === 'rolling'
  const prizes = config.prizes.map((p) => {
    const hidden = hideCurrent && p.id === state.prizeId
    const list = Array.isArray(state.results[p.id]) ? state.results[p.id] : []
    return {
      id: p.id,
      name: p.name,
      reward: p.reward,
      count: p.count,
      drawn: !hidden && list.length > 0,
      winners: hidden ? [] : list.map((x) => x.name),
    }
  })
  // 滚动动画用的名字池：只给名字，最多 300 个
  const names = config.participants.map((p) => p.name)
  const sample = names.length > 300 ? pickWinners(config.participants, 300).map((x) => x.name) : names
  const wp = await getWeddingPlan(db, wid)
  return {
    wid,
    couple: coupleOf(w),
    theme: allowedTheme(wp, config.theme),
    plan: displayPlan(wp),
    status,
    prizeId: state.prizeId,
    startedAt: state.startedAt,
    revealAt: state.revealAt,
    serverNow: now,
    prizes,
    participantCount: config.participants.length,
    names: sample,
  }
}

lottery.get('/lottery', requireWid, async (c) => {
  const wid = getWid(c)
  const view = await publicLotteryView(c.env.DB, wid)
  if (!view) return fail(c, '婚礼不存在或未开通', 404)
  c.header('Cache-Control', 'no-store')
  return ok(c, view)
})

// ---------------- 管理端 ----------------

// GET /api/lottery/admin?wid= → 完整配置与状态
lottery.get('/lottery/admin', requireAdmin, async (c) => {
  const wid = getWid(c)
  if (!(await loadWedding(c.env.DB, wid))) return fail(c, '婚礼不存在', 404)
  const { config, state } = await loadLottery(c.env.DB, wid)
  return ok(c, adminView(config, state))
})

async function readBody(c: Context<AppEnv>): Promise<Record<string, unknown>> {
  try {
    const raw = await c.req.text()
    if (raw.length > 200 * 1024) return {}
    const v = raw ? JSON.parse(raw) : {}
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  } catch {
    return {}
  }
}

// PUT /api/lottery/config?wid= → 保存奖项 / 参与人（传哪个改哪个；不影响抽奖结果，删除的奖项结果一并清掉）
lottery.put('/lottery/config', requireAdmin, async (c) => {
  const wid = getWid(c)
  if (!(await loadWedding(c.env.DB, wid))) return fail(c, '婚礼不存在', 404)
  const body = await readBody(c)
  const { config, state } = await loadLottery(c.env.DB, wid)
  const wp = await getWeddingPlan(c.env.DB, wid)
  if (wp.status === 'disabled') return fail(c, '该婚礼已被平台停用', 403)
  const ent = wp.ent // 0 = 不限
  const toCheck: string[] = []
  if (body.prizes !== undefined) {
    if (!Array.isArray(body.prizes)) return fail(c, 'prizes 必须是数组')
    const prizes = sanitizePrizes(body.prizes)
    for (const p of prizes) {
      if (!p.name && !p.reward) return fail(c, '每个奖项至少要填写奖项名称或奖品内容')
    }
    if (ent.lotteryPrizes > 0 && prizes.length > ent.lotteryPrizes && prizes.length > config.prizes.length) {
      return limitReached(c, wp, '最多设置 ' + ent.lotteryPrizes + ' 个奖项')
    }
    const old = new Set(config.prizes.map((p) => p.name + '|' + p.reward))
    for (const p of prizes) if (!old.has(p.name + '|' + p.reward)) toCheck.push(p.name, p.reward)
    config.prizes = prizes
  }
  if (body.theme !== undefined) {
    if (typeof body.theme !== 'string' || !(LOTTERY_THEMES as readonly string[]).includes(body.theme)) return fail(c, '不支持的主题')
    if (!ent.lotteryThemes.includes(body.theme) && body.theme !== config.theme) {
      return limitReached(c, wp, '不含「' + (THEME_NAMES[body.theme] || body.theme) + '」主题')
    }
    config.theme = body.theme as Theme
    // 同步写入 weddings.config.theme，让小程序请柬首页与各页面同步切换主题
    try {
      const wRow = await loadWedding(c.env.DB, wid)
      const wCfg = parseJson<Record<string, unknown>>(wRow?.config, {})
      wCfg.theme = config.theme
      await c.env.DB.prepare('UPDATE weddings SET config = ?, updated_at = ? WHERE id = ?')
        .bind(JSON.stringify(wCfg), new Date().toISOString(), wid)
        .run()
    } catch {}
  }
  if (body.participants !== undefined) {
    if (!Array.isArray(body.participants)) return fail(c, 'participants 必须是数组')
    const list = sanitizeParticipants(body.participants)
    if (ent.lotteryParticipants > 0 && list.length > ent.lotteryParticipants && list.length > config.participants.length) {
      return limitReached(c, wp, '抽奖名单最多 ' + ent.lotteryParticipants + ' 人')
    }
    const old = new Set(config.participants.map((p) => p.name))
    for (const p of list) if (p.source === 'manual' && !old.has(p.name)) toCheck.push(p.name)
    config.participants = list
  }
  if (toCheck.length) {
    const mod = await checkTexts(c.env, toCheck, { wid, openid: getOpenid(c), scene: 1, targetType: 'lottery' })
    if (!mod.ok) return fail(c, mod.message || '内容未通过安全检测', 422)
  }
  pruneResults(state, config.prizes)
  await saveLottery(c.env.DB, wid, config, state)
  return ok(c, adminView(config, state))
})

// POST /api/lottery/import-rsvp?wid= → 把回执里确认出席的宾客并入参与名单（按姓名去重）
lottery.post('/lottery/import-rsvp', requireAdmin, async (c) => {
  const wid = getWid(c)
  if (!(await loadWedding(c.env.DB, wid))) return fail(c, '婚礼不存在', 404)
  const { results } = await c.env.DB.prepare(
    "SELECT id, name FROM rsvps WHERE wedding_id = ? AND attending = 'yes' ORDER BY id ASC LIMIT 2000",
  )
    .bind(wid)
    .all<{ id: number; name: string | null }>()
  const { config, state } = await loadLottery(c.env.DB, wid)
  const wp = await getWeddingPlan(c.env.DB, wid)
  const cap = wp.ent.lotteryParticipants > 0 ? Math.min(MAX_PARTICIPANTS, wp.ent.lotteryParticipants) : MAX_PARTICIPANTS
  const have = new Set(config.participants.map((p) => p.name))
  let added = 0
  let capped = false
  for (const r of results || []) {
    const name = s(r.name, 32)
    if (!name || PLACEHOLDER_NAMES.includes(name) || have.has(name)) continue
    if (config.participants.length >= cap) { capped = true; break }
    if (config.participants.length >= MAX_PARTICIPANTS) break
    have.add(name)
    config.participants.push({ id: 'r' + r.id, name, source: 'rsvp' })
    added++
  }
  if (added > 0) await saveLottery(c.env.DB, wid, config, state)
  let msg = added > 0 ? '已导入 ' + added + ' 位出席宾客' : '没有新的出席宾客可导入'
  if (capped) msg += '（「' + wp.planName + '」名单上限 ' + cap + ' 人' + (wp.canUpgrade ? '，升级套餐可导入全部' : '') + '）'
  return ok(c, { ...adminView(config, state, msg), added })
})

// 开始 / 重抽的共同逻辑
async function draw(c: Context<AppEnv>, redraw: boolean) {
  const wid = getWid(c)
  if (!(await loadWedding(c.env.DB, wid))) return fail(c, '婚礼不存在', 404)
  const body = await readBody(c)
  const prizeId = s(body.prizeId, 40)
  const { config, state } = await loadLottery(c.env.DB, wid)
  const prize = config.prizes.find((p) => p.id === prizeId)
  if (!prize) return fail(c, '奖项不存在，请刷新后重试', 404)
  const now = Date.now()
  if (effectiveStatus(state, now) === 'rolling' && state.prizeId !== prizeId) {
    return fail(c, '还有奖项正在抽取，请先开奖', 409)
  }
  const existing = Array.isArray(state.results[prizeId]) ? state.results[prizeId] : []
  if (!redraw && existing.length > 0) return fail(c, '该奖项已经抽过；如需重来请点「重新抽取」', 409)
  if (config.participants.length === 0) return fail(c, '还没有参与抽奖的名单，请先导入或添加')
  // 重抽：本奖项原中奖人放回奖池
  const pool = remainingPool(config, state, redraw ? prizeId : undefined)
  if (pool.length === 0) return fail(c, '所有参与人都已中奖，没有可抽的人了')
  const winners = pickWinners(pool, prize.count)
  state.results[prizeId] = winners
  state.status = 'rolling'
  state.prizeId = prizeId
  state.startedAt = now
  state.revealAt = now + ROLL_MS
  await saveLottery(c.env.DB, wid, config, state)
  const msg =
    winners.length < prize.count
      ? '剩余可抽人数只有 ' + pool.length + ' 位，本次抽出全部 ' + winners.length + ' 位'
      : ''
  return ok(c, adminView(config, state, msg))
}

// POST /api/lottery/start?wid= {prizeId} → 服务端随机抽出中奖人，大屏进入滚动，ROLL_MS 后揭晓
lottery.post('/lottery/start', requireAdmin, (c) => draw(c, false))

// POST /api/lottery/redraw?wid= {prizeId} → 本奖项原中奖人放回，重新抽取
lottery.post('/lottery/redraw', requireAdmin, (c) => draw(c, true))

// POST /api/lottery/reveal?wid= → 立即开奖
lottery.post('/lottery/reveal', requireAdmin, async (c) => {
  const wid = getWid(c)
  const { config, state } = await loadLottery(c.env.DB, wid)
  if (state.status !== 'rolling') return ok(c, adminView(config, state))
  const now = Date.now()
  state.status = 'revealed'
  if (state.revealAt === null || state.revealAt > now) state.revealAt = now
  await saveLottery(c.env.DB, wid, config, state)
  return ok(c, adminView(config, state))
})

// POST /api/lottery/screen?wid= {mode:'idle'|'board'} → 大屏回到等待页 / 展示全部中奖名单
lottery.post('/lottery/screen', requireAdmin, async (c) => {
  const wid = getWid(c)
  const body = await readBody(c)
  const mode = body.mode === 'board' ? 'board' : 'idle'
  const { config, state } = await loadLottery(c.env.DB, wid)
  if (effectiveStatus(state, Date.now()) === 'rolling') return fail(c, '正在抽奖中，请先开奖', 409)
  state.status = mode
  state.prizeId = null
  state.startedAt = null
  state.revealAt = null
  await saveLottery(c.env.DB, wid, config, state)
  return ok(c, adminView(config, state))
})

// POST /api/lottery/reset?wid= → 清空本场抽奖结果（保留奖项和名单）
lottery.post('/lottery/reset', requireAdmin, async (c) => {
  const wid = getWid(c)
  if (!(await loadWedding(c.env.DB, wid))) return fail(c, '婚礼不存在', 404)
  const { config } = await loadLottery(c.env.DB, wid)
  const state = emptyState()
  await saveLottery(c.env.DB, wid, config, state)
  return ok(c, adminView(config, state))
})
