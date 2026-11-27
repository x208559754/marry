// src/billing.ts — 多档套餐（免费版 / 高级版 / 平台自建更多档）+ 每场婚礼的权益 + 订单 + 微信支付（JSAPI v3）
// 套餐定义存 plans 表（平台总后台可增删改）；婚礼当前套餐存 weddings.plan / plan_expires_at / plan_overrides
// 套餐变更全部写入 plan_logs（购买、手动设置、单独调整权益、退款降级）
// 微信支付实现由 Node 入口注入（c.env.PAY，见 server/wxpay.ts）；未接入时 PAY_MOCK=1 可模拟支付成功
import { Hono } from 'hono'
import type { Context } from 'hono'
import { ok, fail, requireAdmin, getWid, getOpenid } from './auth'
import type { AppEnv, Bindings } from './auth'
import { DEFAULT_VIDEO_MAX_MB, MAX_VIDEO_MB } from './qiniu'

export const billing = new Hono<AppEnv>()

export const ALL_THEMES = ['red', 'pink', 'night', 'forest', 'champagne'] as const
export const THEME_NAMES: Record<string, string> = { red: '中式红金', pink: '浪漫樱粉', night: '星河夜空', forest: '森系花园', champagne: '香槟白金' }
export const EFFECTS = ['none', 'petals', 'gold'] as const
export const EFFECT_NAMES: Record<string, string> = { none: '基础（无额外特效）', petals: '花瓣纷飞', gold: '金箔流光（花瓣 + 金色粒子）' }
export type Effect = (typeof EFFECTS)[number]

// 套餐权益（0 = 不限，仅用于奖项数 / 抽奖人数）
export type Entitlements = {
  photos: number // 相册上限（张）
  photoMaxKb: number // 单张图片上限（KB）
  videoMaxMb: number // 单个视频上限（MB，仅支持上传视频的付费套餐生效）
  lotteryPrizes: number // 抽奖奖项上限，0 = 不限
  lotteryParticipants: number // 抽奖人数上限，0 = 不限
  lotteryThemes: string[] // 可用主题（请柬 + 大屏）
  watermark: boolean // 显示「有囍請柬 提供技术支持」平台标识
  badge: string // 请柬 / 大屏上的专属标识文字（如「尊享」），空 = 不显示
  effect: Effect // 请柬首页与大屏的氛围特效
  opening: boolean // 请柬与大屏的专属开场动画
}
export type PlanDef = {
  code: string
  name: string
  level: number // 档位高低：只能买比当前档位更高的套餐
  priceFen: number
  originalFen?: number
  days: number // 有效天数，0 = 永久
  desc: string
  features: string[]
  active: boolean // 是否在小程序升级页上架
  sort: number
  ent: Entitlements
}

export const MAX_PHOTOS = 2000
export const MIN_PHOTO_KB = 50
export const MAX_PHOTO_KB = 15360 // 15MB
export const DEFAULT_FREE_PHOTO_MAX_KB = 500
export const DEFAULT_PAID_PHOTO_MAX_KB = 2048
export const DEFAULT_SUPREME_PHOTO_MAX_KB = 5120
const BASIC_PHOTO_LIMIT = 4
export const PREMIUM_PHOTO_LIMIT = 200 // 兼容旧接口

const DEFAULT_ENT: Entitlements = { photos: BASIC_PHOTO_LIMIT, photoMaxKb: DEFAULT_FREE_PHOTO_MAX_KB, videoMaxMb: DEFAULT_VIDEO_MAX_MB, lotteryPrizes: 1, lotteryParticipants: 30, lotteryThemes: ['red'], watermark: true, badge: '', effect: 'none', opening: false }

export const DEFAULT_PLANS: PlanDef[] = [
  {
    code: 'free', name: '免费版', level: 0, priceFen: 0, days: 0, active: true, sort: 0,
    desc: '基础电子请柬，适合先体验',
    features: ['电子请柬 + 宾客回执 + 祝福墙', '婚纱相册最多 4 张', '现场抽奖：1 个奖项、30 人', '大屏主题：中式红金', '请柬底部显示「有囍請柬」标识'],
    ent: { ...DEFAULT_ENT },
  },
  {
    code: 'premium', name: '高级版', level: 10, priceFen: 6800, originalFen: 12800, days: 0, active: true, sort: 10,
    desc: '每场婚礼一次付费，永久有效',
    features: ['婚纱相册最多 200 张', '支持上传婚礼视频（单视频最高 100MB）', '现场抽奖不限奖项与人数', '5 套大屏抽奖主题', '去除「有囍請柬」标识', '请柬花瓣纷飞特效', '优先客服支持'],
    ent: { photos: 200, photoMaxKb: DEFAULT_PAID_PHOTO_MAX_KB, videoMaxMb: DEFAULT_VIDEO_MAX_MB, lotteryPrizes: 0, lotteryParticipants: 0, lotteryThemes: [...ALL_THEMES], watermark: false, badge: '', effect: 'petals', opening: false },
  },
  {
    code: 'supreme', name: '至尊版', level: 20, priceFen: 16800, originalFen: 29900, days: 0, active: false, sort: 20,
    desc: '尊享专属标识与开场动画，婚礼更有仪式感',
    features: ['包含高级版全部权益', '婚纱相册最多 500 张', '支持上传婚礼视频（单视频最高 100MB）', '请柬与大屏「尊享」专属标识', '专属开场动画（红金启幕）', '金箔流光特效（请柬 + 抽奖大屏）', '一对一专属客服'],
    ent: { photos: 500, photoMaxKb: DEFAULT_SUPREME_PHOTO_MAX_KB, videoMaxMb: DEFAULT_VIDEO_MAX_MB, lotteryPrizes: 0, lotteryParticipants: 0, lotteryThemes: [...ALL_THEMES], watermark: false, badge: '尊享', effect: 'gold', opening: true },
  },
]

function num(v: unknown, def: number, min = 0, max = 1e9) {
  if (v === '' || v === null || v === undefined) return def
  const n = Math.floor(Number(v))
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : def
}
function text(v: unknown, def: string, max = 200) {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : def
}
function bool(v: unknown, def: boolean) {
  return v === undefined || v === null ? def : v === true || v === 1 || v === '1' || v === 'true'
}
function themes(v: unknown, def: string[]) {
  if (typeof v === 'string') v = v.split(/[,，\s]+/)
  if (!Array.isArray(v)) return def
  const out = ALL_THEMES.filter((t) => (v as unknown[]).includes(t)) as string[]
  return out.length ? out : ['red']
}

function isBasicPlan(p: Pick<PlanDef, 'code' | 'name'>): boolean {
  return p.code === 'free' || p.code === 'basic' || p.name.startsWith('普通')
}

function planPhotoLimit(p: Pick<PlanDef, 'code' | 'name'>): number {
  return isBasicPlan(p) ? BASIC_PHOTO_LIMIT : MAX_PHOTOS
}

export function sanitizeEnt(raw: any, def: Entitlements): Entitlements {
  const r = raw && typeof raw === 'object' ? raw : {}
  return {
    photos: num(r.photos, def.photos, 1, MAX_PHOTOS),
    photoMaxKb: num(r.photoMaxKb, def.photoMaxKb ?? DEFAULT_FREE_PHOTO_MAX_KB, MIN_PHOTO_KB, MAX_PHOTO_KB),
    videoMaxMb: num(r.videoMaxMb, def.videoMaxMb ?? DEFAULT_VIDEO_MAX_MB, 1, MAX_VIDEO_MB),
    lotteryPrizes: num(r.lotteryPrizes, def.lotteryPrizes, 0, 50),
    lotteryParticipants: num(r.lotteryParticipants, def.lotteryParticipants, 0, 2000),
    lotteryThemes: themes(r.lotteryThemes, def.lotteryThemes),
    watermark: bool(r.watermark, def.watermark),
    badge: typeof r.badge === 'string' ? r.badge.trim().slice(0, 6) : def.badge,
    effect: (EFFECTS as readonly string[]).includes(r.effect) ? r.effect : def.effect,
    opening: bool(r.opening, def.opening),
  }
}
// 单场婚礼的权益覆盖：只保留合法且出现的字段
export function sanitizeOverrides(raw: any): Partial<Entitlements> {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const full = sanitizeEnt(r, DEFAULT_ENT)
  const out: Partial<Entitlements> = {}
  for (const k of Object.keys(DEFAULT_ENT) as (keyof Entitlements)[]) {
    if (r[k] === undefined || r[k] === null || r[k] === '') {
      if (k === 'badge' && r[k] === '') (out as any).badge = ''
      continue
    }
    ;(out as any)[k] = full[k]
  }
  return out
}

export const CODE_RE = /^[a-z][a-z0-9_]{1,15}$/
export function sanitizePlan(raw: any, base?: PlanDef): PlanDef {
  const r = raw && typeof raw === 'object' ? raw : {}
  const d = base || { ...DEFAULT_PLANS[1], code: '', name: '新套餐', active: false, features: [] }
  const code = base ? base.code : String(r.code || '').trim().toLowerCase()
  const features = Array.isArray(r.features)
    ? r.features.map((x: unknown) => text(x, '', 60)).filter(Boolean).slice(0, 12)
    : typeof r.features === 'string'
      ? r.features.split('\n').map((x: string) => x.trim().slice(0, 60)).filter(Boolean).slice(0, 12)
      : d.features
  const out: PlanDef = {
    code,
    name: text(r.name, d.name, 20),
    level: num(r.level, d.level, 0, 1000),
    priceFen: num(r.priceFen, d.priceFen, 0, 10_000_000),
    days: num(r.days, d.days, 0, 36500),
    desc: text(r.desc, d.desc, 80),
    features,
    active: bool(r.active, d.active),
    sort: num(r.sort, d.sort, 0, 10000),
    ent: sanitizeEnt(r.ent, d.ent),
  }
  const orig = r.originalFen === undefined ? d.originalFen : r.originalFen
  if (orig !== undefined && orig !== null && orig !== '' && Number(orig) > 0) out.originalFen = num(orig, 0, 0, 10_000_000)
  if (code === 'free') {
    out.priceFen = 0
    out.level = 0
    out.days = 0
    out.active = true
    delete out.originalFen
  } else {
    if (out.priceFen < 1) out.priceFen = 1 // 付费套餐至少 0.01 元（微信支付金额必须 > 0）
    if (out.level < 1) out.level = 1
  }
  out.ent.photos = Math.min(out.ent.photos, planPhotoLimit(out))
  out.features = out.features.map((feature) => {
    if (/^婚纱相册最多\s*\d+\s*张$/.test(feature)) return '婚纱相册最多 ' + out.ent.photos + ' 张'
    if (/^支持上传婚礼视频（单视频最高\s*\d+\s*MB）$/.test(feature)) return '支持上传婚礼视频（单视频最高 ' + out.ent.videoMaxMb + 'MB）'
    return feature
  })
  return out
}

// ---------------- 套餐存取（plans 表，进程内缓存 10 秒） ----------------

type PlanRow = { code: string; name: string; level: number; price_fen: number; original_fen: number | null; days: number; description: string | null; features: string | null; ent: string | null; active: number; sort: number }
let cache: { at: number; plans: PlanDef[] } | null = null
export function resetPlanCache() {
  cache = null
}
function rowToPlan(r: PlanRow): PlanDef {
  let features: unknown = []
  let ent: unknown = {}
  try { features = JSON.parse(r.features || '[]') } catch {}
  try { ent = JSON.parse(r.ent || '{}') } catch {}
  const def = DEFAULT_PLANS.find((p) => p.code === r.code)
  return sanitizePlan(
    { name: r.name, level: r.level, priceFen: r.price_fen, originalFen: r.original_fen, days: r.days, desc: r.description || '', features, ent, active: Number(r.active) === 1, sort: r.sort },
    { ...(def || DEFAULT_PLANS[1]), code: r.code, active: false },
  )
}

// 首次使用：按旧的 config.pricing（免费版 / 高级版的名称、价格、免费版限制）+ 默认值写入 plans 表
async function seedPlans(db: D1Database) {
  let legacy: any = null
  try {
    const row = await db.prepare("SELECT value FROM config WHERE key = 'pricing'").first<{ value: string }>()
    if (row?.value) legacy = JSON.parse(row.value)
  } catch {}
  const seeds = DEFAULT_PLANS.map((p) => JSON.parse(JSON.stringify(p)) as PlanDef)
  if (legacy?.plans) {
    for (const code of ['free', 'premium']) {
      const l = legacy.plans[code]
      const p = seeds.find((x) => x.code === code)!
      if (l && typeof l === 'object') {
        if (l.name) p.name = String(l.name)
        if (l.desc) p.desc = String(l.desc)
        if (Array.isArray(l.features) && l.features.length) p.features = l.features.map(String)
        if (code === 'premium' && Number(l.priceFen) > 0) p.priceFen = Number(l.priceFen)
        if (code === 'premium' && l.originalFen !== undefined) p.originalFen = Number(l.originalFen) || undefined
      }
    }
    const fl = legacy.freeLimits
    if (fl && typeof fl === 'object') {
      const f = seeds[0]
      f.ent = sanitizeEnt({ photos: fl.photos, lotteryPrizes: fl.lotteryPrizes, lotteryParticipants: fl.lotteryParticipants, lotteryThemes: fl.lotteryThemes, watermark: fl.brand }, f.ent)
    }
  }
  for (const p of seeds) await insertPlan(db, sanitizePlan(p, p), true)
}

async function insertPlan(db: D1Database, p: PlanDef, ignore = false) {
  const now = new Date().toISOString()
  await db
    .prepare(
      (ignore ? 'INSERT OR IGNORE' : 'INSERT') +
        ' INTO plans (code, name, level, price_fen, original_fen, days, description, features, ent, active, sort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(p.code, p.name, p.level, p.priceFen, p.originalFen ?? null, p.days, p.desc, JSON.stringify(p.features), JSON.stringify(p.ent), p.active ? 1 : 0, p.sort, now, now)
    .run()
}

export async function getPlans(db: D1Database): Promise<PlanDef[]> {
  if (cache && Date.now() - cache.at < 10_000) return cache.plans
  let plans: PlanDef[] = []
  try {
    let { results } = await db.prepare('SELECT * FROM plans ORDER BY level ASC, sort ASC').all<PlanRow>()
    if (!results || !results.length) {
      await seedPlans(db)
      results = (await db.prepare('SELECT * FROM plans ORDER BY level ASC, sort ASC').all<PlanRow>()).results
    }
    plans = (results || []).map(rowToPlan)
  } catch (e) {
    console.error('getPlans error', e)
    plans = DEFAULT_PLANS.map((p) => ({ ...p }))
  }
  if (!plans.find((p) => p.code === 'free')) plans.unshift({ ...DEFAULT_PLANS[0] })
  cache = { at: Date.now(), plans }
  return plans
}
export async function getPlanDef(db: D1Database, code: string) {
  return (await getPlans(db)).find((p) => p.code === code) || null
}
export async function createPlan(db: D1Database, p: PlanDef) {
  await insertPlan(db, p)
  resetPlanCache()
}
export async function updatePlan(db: D1Database, p: PlanDef) {
  await db
    .prepare('UPDATE plans SET name = ?, level = ?, price_fen = ?, original_fen = ?, days = ?, description = ?, features = ?, ent = ?, active = ?, sort = ?, updated_at = ? WHERE code = ?')
    .bind(p.name, p.level, p.priceFen, p.originalFen ?? null, p.days, p.desc, JSON.stringify(p.features), JSON.stringify(p.ent), p.active ? 1 : 0, p.sort, new Date().toISOString(), p.code)
    .run()
  resetPlanCache()
}
export async function deletePlan(db: D1Database, code: string) {
  await db.prepare('DELETE FROM plans WHERE code = ?').bind(code).run()
  resetPlanCache()
}

function planAllowsVideoUpload(p: PlanDef, plans: PlanDef[]): boolean {
  // 平台可调整套餐名称和档位，普通套餐也可能沿用内置套餐编码。
  const premiumLevel = plans.find((plan) => plan.code === 'premium')?.level ?? DEFAULT_PLANS[1].level
  return p.level >= premiumLevel && !isBasicPlan(p)
}

// 小程序展示用（不含内部字段）
function publicPlan(p: PlanDef, plans: PlanDef[]) {
  return { code: p.code, name: p.name, level: p.level, priceFen: p.priceFen, originalFen: p.originalFen, days: p.days, desc: p.desc, features: p.features, ent: p.ent, canUploadVideo: planAllowsVideoUpload(p, plans) }
}

// ---------------- 兼容旧版接口（小程序 1.0.0 与旧后台用的 pricing 结构） ----------------
export type LegacyPricing = {
  plans: { free: { name: string; priceFen: number; desc: string; features: string[] }; premium: { name: string; priceFen: number; originalFen?: number; desc: string; features: string[] } }
  freeLimits: { photos: number; lotteryPrizes: number; lotteryParticipants: number; lotteryThemes: string[]; brand: boolean }
}
export async function getPricing(db: D1Database): Promise<LegacyPricing> {
  const plans = await getPlans(db)
  const free = plans.find((p) => p.code === 'free')!
  const prem = plans.find((p) => p.code === 'premium') || plans.filter((p) => p.code !== 'free').pop() || DEFAULT_PLANS[1]
  const strip = (p: PlanDef) => ({ name: p.name, priceFen: p.priceFen, ...(p.originalFen ? { originalFen: p.originalFen } : {}), desc: p.desc, features: p.features })
  return {
    plans: { free: strip(free), premium: strip(prem) },
    freeLimits: { photos: free.ent.photos, lotteryPrizes: free.ent.lotteryPrizes, lotteryParticipants: free.ent.lotteryParticipants, lotteryThemes: free.ent.lotteryThemes, brand: free.ent.watermark },
  }
}
// 旧后台 PUT /pricing：只改免费版 / 高级版的名称、价格、说明、权益文案和免费版限制
export async function saveLegacyPricing(db: D1Database, raw: any) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const plans = await getPlans(db)
  const free = plans.find((p) => p.code === 'free')!
  const prem = plans.find((p) => p.code === 'premium')
  const fl = r.freeLimits || {}
  const nf = sanitizePlan({ ...free, ...(r.plans?.free || {}), ent: { ...free.ent, photos: fl.photos, lotteryPrizes: fl.lotteryPrizes, lotteryParticipants: fl.lotteryParticipants, lotteryThemes: fl.lotteryThemes ?? free.ent.lotteryThemes, watermark: fl.brand } }, free)
  await updatePlan(db, nf)
  if (prem) await updatePlan(db, sanitizePlan({ ...prem, ...(r.plans?.premium || {}), ent: prem.ent }, prem))
  return getPricing(db)
}

// ---------------- 每场婚礼的套餐与权益 ----------------

export type WeddingPlan = {
  exists: boolean
  plan: string // 生效中的套餐 code（过期后为 free）
  storedPlan: string // weddings.plan 原值
  planName: string
  level: number
  premium: boolean // 是否付费档（level > 0）
  expired: boolean
  expiresAt: string | null
  status: 'active' | 'disabled'
  disabledReason: string
  activatedAt: string | null
  orderNo: string
  note: string
  overrides: Partial<Entitlements>
  base: Entitlements // 套餐本身的权益
  ent: Entitlements // 叠加单场覆盖后的实际权益
  photoLimit: number // 可配置的相册张数上限
  canUploadVideo: boolean
  canUpgrade: boolean // 是否还有更高档位在售
}
type WRow = { plan: string | null; plan_activated_at: string | null; plan_expires_at: string | null; plan_overrides: string | null; plan_note: string | null; plan_order_no: string | null; status: string | null; disabled_reason: string | null }

export function isExpired(expiresAt: string | null | undefined, now = Date.now()) {
  if (!expiresAt) return false
  const t = Date.parse(expiresAt)
  return Number.isFinite(t) && t < now
}

export async function getWeddingPlan(db: D1Database, wid: string): Promise<WeddingPlan> {
  const [row, plans] = await Promise.all([
    db
      .prepare('SELECT plan, plan_activated_at, plan_expires_at, plan_overrides, plan_note, plan_order_no, status, disabled_reason FROM weddings WHERE id = ?')
      .bind(wid)
      .first<WRow>(),
    getPlans(db),
  ])
  const free = plans.find((p) => p.code === 'free')!
  const stored = row?.plan || 'free'
  const expired = stored !== 'free' && isExpired(row?.plan_expires_at)
  const def = (!expired && plans.find((p) => p.code === stored)) || free
  let overrides: Partial<Entitlements> = {}
  try { overrides = sanitizeOverrides(JSON.parse(row?.plan_overrides || '{}')) } catch {}
  const photoLimit = planPhotoLimit(def)
  const ent = sanitizeEnt({ ...def.ent, ...overrides }, def.ent)
  ent.photos = Math.min(ent.photos, photoLimit)
  const maxActive = Math.max(0, ...plans.filter((p) => p.active && p.code !== 'free').map((p) => p.level))
  return {
    exists: Boolean(row),
    plan: def.code,
    storedPlan: stored,
    planName: def.name,
    level: def.level,
    premium: def.level > 0,
    expired,
    expiresAt: row?.plan_expires_at || null,
    status: row?.status === 'disabled' ? 'disabled' : 'active',
    disabledReason: row?.disabled_reason || '',
    activatedAt: row?.plan_activated_at || null,
    orderNo: row?.plan_order_no || '',
    note: row?.plan_note || '',
    overrides,
    base: def.ent,
    ent,
    photoLimit,
    canUploadVideo: planAllowsVideoUpload(def, plans),
    canUpgrade: maxActive > def.level,
  }
}

// 请柬 / 大屏展示用的套餐信息（只读）
export function displayPlan(wp: WeddingPlan) {
  return {
    code: wp.plan,
    name: wp.planName,
    level: wp.level,
    premium: wp.premium,
    brand: wp.ent.watermark, // 兼容旧字段
    watermark: wp.ent.watermark,
    badge: wp.ent.badge,
    effect: wp.ent.effect,
    opening: wp.ent.opening,
    themes: wp.ent.lotteryThemes,
    canUpgrade: wp.canUpgrade,
  }
}
// 当前套餐不能用的主题，展示时退回第一个可用主题
export function allowedTheme(wp: WeddingPlan, theme: unknown): string {
  const t = typeof theme === 'string' ? theme : ''
  return wp.ent.lotteryThemes.includes(t) ? t : wp.ent.lotteryThemes[0] || 'red'
}

// 本场婚礼各项权益的使用情况
export async function getUsage(db: D1Database, wid: string) {
  const q = async (sql: string) => Number((await db.prepare(sql).bind(wid).first<{ n: number }>())?.n) || 0
  const [photos, blessings, rsvps] = await Promise.all([
    q("SELECT COUNT(*) AS n FROM images WHERE wedding_id = ? AND status <> 'hidden'"),
    q('SELECT COUNT(*) AS n FROM blessings WHERE wedding_id = ?'),
    q('SELECT COUNT(*) AS n FROM rsvps WHERE wedding_id = ?'),
  ])
  let prizes = 0
  let participants = 0
  let theme = 'red'
  try {
    const lt = await db.prepare('SELECT config FROM lotteries WHERE wedding_id = ?').bind(wid).first<{ config: string | null }>()
    const cfg = lt?.config ? JSON.parse(lt.config) : {}
    prizes = Array.isArray(cfg.prizes) ? cfg.prizes.length : 0
    participants = Array.isArray(cfg.participants) ? cfg.participants.length : 0
    if (typeof cfg.theme === 'string') theme = cfg.theme
  } catch {}
  try {
    const w = await db.prepare('SELECT config FROM weddings WHERE id = ?').bind(wid).first<{ config: string | null }>()
    const wc = w?.config ? JSON.parse(w.config) : {}
    if (typeof wc.theme === 'string' && wc.theme) theme = wc.theme
  } catch {}
  return { photos, lotteryPrizes: prizes, lotteryParticipants: participants, blessings, rsvps, theme, themeName: THEME_NAMES[theme] || theme }
}

// 写套餐变更日志
export async function logPlan(db: D1Database, wid: string, action: string, fromPlan: string, toPlan: string, opts: { expiresAt?: string | null; note?: string; detail?: unknown; operator?: string } = {}) {
  try {
    await db
      .prepare('INSERT INTO plan_logs (wedding_id, action, from_plan, to_plan, expires_at, note, detail, operator, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(wid, action, fromPlan, toPlan, opts.expiresAt ?? null, (opts.note || '').slice(0, 250), opts.detail === undefined ? null : JSON.stringify(opts.detail).slice(0, 4000), opts.operator || 'system', new Date().toISOString())
      .run()
  } catch (e) {
    console.error('plan log error', e)
  }
}

// 超出套餐限制时的统一错误（HTTP 402 + code，小程序据此引导升级）
export function planLimit(c: Context<AppEnv>, message: string) {
  return c.json({ ok: false as const, error: message, code: 'PLAN_LIMIT', needUpgrade: true }, 402)
}
// 达到上限：还有更高档位在售 → 402 引导升级；已是最高档 → 400
export function limitReached(c: Context<AppEnv>, wp: WeddingPlan, what: string) {
  if (wp.canUpgrade) return planLimit(c, '当前「' + wp.planName + '」' + what + '，升级套餐可解锁更多')
  return c.json({ ok: false as const, error: '当前「' + wp.planName + '」' + what, code: 'PLAN_MAX' }, 400)
}

export function payMode(env: Bindings): 'wxpay' | 'mock' | 'unavailable' {
  if (env.PAY && env.PAY.configured) return 'wxpay'
  if (env.PAY_MOCK === '1') return 'mock'
  return 'unavailable'
}

function genOrderNo(): string {
  const d = new Date(Date.now() + 8 * 3600 * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  const ts = d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds())
  const b = new Uint8Array(4)
  crypto.getRandomValues(b)
  return 'YX' + ts + [...b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase()
}

type OrderRow = {
  id: number
  out_trade_no: string
  wedding_id: string
  openid: string | null
  product: string
  description: string
  amount_fen: number
  status: string
  pay_mode: string
  transaction_id: string | null
  paid_at: string | null
  created_at: string
}

export function orderOut(o: OrderRow) {
  return {
    orderNo: o.out_trade_no,
    wid: o.wedding_id,
    product: o.product,
    description: o.description,
    amountFen: Number(o.amount_fen) || 0,
    status: o.status,
    payMode: o.pay_mode,
    transactionId: o.transaction_id || '',
    paidAt: o.paid_at,
    createdAt: o.created_at,
  }
}

// 标记已支付并把婚礼升级到订单对应的套餐（幂等：只有 pending/closed 才会变成 paid）
export async function markPaid(db: D1Database, orderNo: string, transactionId: string, payload?: string): Promise<boolean> {
  const now = new Date().toISOString()
  const res = await db
    .prepare("UPDATE orders SET status = 'paid', transaction_id = ?, paid_at = ?, notify_payload = ?, updated_at = ? WHERE out_trade_no = ? AND status IN ('pending', 'closed')")
    .bind(transactionId || null, now, payload ? payload.slice(0, 8000) : null, now, orderNo)
    .run()
  if (!res.meta.changes) return false
  const o = await db.prepare('SELECT wedding_id, product, amount_fen FROM orders WHERE out_trade_no = ?').bind(orderNo).first<{ wedding_id: string; product: string; amount_fen: number }>()
  if (o && o.product && o.product !== 'free') {
    const def = await getPlanDef(db, o.product)
    const before = await getWeddingPlan(db, o.wedding_id)
    const expires = def && def.days > 0 ? new Date(Date.now() + def.days * 86400_000).toISOString() : null
    await db
      .prepare('UPDATE weddings SET plan = ?, plan_activated_at = ?, plan_order_no = ?, plan_expires_at = ? WHERE id = ?')
      .bind(o.product, now, orderNo, expires, o.wedding_id)
      .run()
    await logPlan(db, o.wedding_id, 'purchase', before.plan, o.product, { expiresAt: expires, note: '订单 ' + orderNo + ' 支付 ' + (Number(o.amount_fen) / 100).toFixed(2) + ' 元', operator: 'user' })
  }
  return true
}

// ---------------- 公开：套餐信息 ----------------

// GET /api/plan?wid= → { plans:[在售套餐], wedding:{plan,planName,level,premium,expired,expiresAt,ent,usage,...}, payMode, pricing(旧结构) }
billing.get('/plan', async (c) => {
  const wid = getWid(c)
  const [plans, pricing, wp] = await Promise.all([getPlans(c.env.DB), getPricing(c.env.DB), getWeddingPlan(c.env.DB, wid)])
  if (!wp.exists) return fail(c, '婚礼不存在', 404)
  const usage = await getUsage(c.env.DB, wid)
  return ok(c, {
    plans: plans.filter((p) => p.active || p.code === wp.plan).map((p) => publicPlan(p, plans)),
    themes: ALL_THEMES.map((k) => ({ key: k, name: THEME_NAMES[k] })),
    wedding: {
      wid,
      plan: wp.plan,
      planName: wp.planName,
      level: wp.level,
      premium: wp.premium,
      expired: wp.expired,
      expiresAt: wp.expiresAt,
      activatedAt: wp.activatedAt,
      status: wp.status,
      ent: wp.ent,
      canUploadVideo: wp.canUploadVideo,
      canUpgrade: wp.canUpgrade,
      usage,
    },
    payMode: payMode(c.env),
    pricing,
  })
})

// ---------------- 管理员：下单 / 查单 / 模拟支付 ----------------

// POST /api/pay/order?wid= {product: 套餐 code，默认 premium} → { orderNo, amountFen, mock, payParams? }
// 升级规则：只能购买比当前生效套餐档位更高的套餐，按新套餐全价计费（不折算差价）
billing.post('/pay/order', requireAdmin, async (c) => {
  const wid = getWid(c)
  const openid = getOpenid(c)
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const code = typeof body.product === 'string' && body.product ? body.product : 'premium'
  const wp = await getWeddingPlan(c.env.DB, wid)
  if (!wp.exists) return fail(c, '婚礼不存在', 404)
  if (wp.status === 'disabled') return fail(c, '该婚礼已被平台停用，暂不能购买', 403)
  const p = await getPlanDef(c.env.DB, code)
  if (!p || !p.active || p.code === 'free') return fail(c, '该套餐不存在或已下架', 404)
  if (p.level <= wp.level) return fail(c, wp.plan === p.code ? '本场婚礼已经是「' + p.name + '」，无需重复购买' : '当前「' + wp.planName + '」已包含该套餐权益，无需购买', 409)
  const mode = payMode(c.env)
  if (mode === 'unavailable') return fail(c, '在线支付暂未开通，请微信联系客服 lzx91697 开通套餐', 503)
  if (mode === 'wxpay' && !openid) return fail(c, '请先在小程序内完成微信登录后再支付', 401)

  const orderNo = genOrderNo()
  const description = '有囍請柬-' + p.name + '（' + wid + '）'
  const now = new Date().toISOString()
  // 同一婚礼之前未支付的订单关闭，避免重复
  await c.env.DB.prepare("UPDATE orders SET status = 'closed', updated_at = ? WHERE wedding_id = ? AND status = 'pending'").bind(now, wid).run()
  await c.env.DB
    .prepare(
      'INSERT INTO orders (out_trade_no, wedding_id, openid, product, description, amount_fen, status, pay_mode, created_at, updated_at) ' +
        "VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)",
    )
    .bind(orderNo, wid, openid || null, p.code, description, p.priceFen, mode, now, now)
    .run()

  if (mode === 'mock') {
    return ok(c, { orderNo, product: p.code, amountFen: p.priceFen, description, mock: true })
  }
  try {
    const r = await c.env.PAY!.createJsapiOrder({ outTradeNo: orderNo, description: description.slice(0, 120), totalFen: p.priceFen, openid, attach: wid })
    await c.env.DB.prepare('UPDATE orders SET prepay_id = ? WHERE out_trade_no = ?').bind(r.prepayId, orderNo).run()
    return ok(c, { orderNo, product: p.code, amountFen: p.priceFen, description, mock: false, payParams: r.payParams })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('wxpay create order error', msg)
    await c.env.DB.prepare("UPDATE orders SET status = 'failed', note = ?, updated_at = ? WHERE out_trade_no = ?").bind(msg.slice(0, 250), now, orderNo).run()
    return fail(c, '创建微信支付订单失败：' + msg, 502)
  }
})

async function loadOrder(db: D1Database, orderNo: string) {
  return db.prepare('SELECT * FROM orders WHERE out_trade_no = ?').bind(orderNo).first<OrderRow>()
}

// GET /api/pay/order/:no?wid= → 订单状态（未支付时主动向微信查单一次）
billing.get('/pay/order/:no', requireAdmin, async (c) => {
  const wid = getWid(c)
  const no = c.req.param('no') || ''
  let o = await loadOrder(c.env.DB, no)
  if (!o || o.wedding_id !== wid) return fail(c, '订单不存在', 404)
  if (o.status === 'pending' && o.pay_mode === 'wxpay' && c.env.PAY?.configured) {
    try {
      const q = await c.env.PAY.queryOrder(no)
      if (q.trade_state === 'SUCCESS' && Number(q.amount?.total) === Number(o.amount_fen)) {
        await markPaid(c.env.DB, no, String(q.transaction_id || ''), JSON.stringify(q))
        o = await loadOrder(c.env.DB, no)
      }
    } catch (e) {
      console.warn('wxpay query error', e)
    }
  }
  const wp = await getWeddingPlan(c.env.DB, wid)
  return ok(c, { order: orderOut(o!), premium: wp.premium, plan: wp.plan, planName: wp.planName })
})

// POST /api/pay/mock-confirm?wid= {orderNo} → 模拟支付成功（仅 PAY_MOCK=1 且订单为 mock 模式）
billing.post('/pay/mock-confirm', requireAdmin, async (c) => {
  if (c.env.PAY_MOCK !== '1') return fail(c, '未开启模拟支付', 403)
  const wid = getWid(c)
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const no = typeof body.orderNo === 'string' ? body.orderNo : ''
  const o = await loadOrder(c.env.DB, no)
  if (!o || o.wedding_id !== wid) return fail(c, '订单不存在', 404)
  if (o.pay_mode !== 'mock') return fail(c, '该订单不是模拟支付订单', 400)
  await markPaid(c.env.DB, no, 'MOCK' + Date.now(), '{"mock":true}')
  const wp = await getWeddingPlan(c.env.DB, wid)
  return ok(c, { order: orderOut((await loadOrder(c.env.DB, no))!), premium: wp.premium, plan: wp.plan, planName: wp.planName })
})

// ---------------- 微信支付回调（公开；验签 + 解密） ----------------

// POST /api/pay/notify → 微信支付结果通知（需 HTTPS 公网地址，配置在 WXPAY_NOTIFY_URL）
billing.post('/pay/notify', async (c) => {
  const raw = await c.req.text()
  if (!c.env.PAY?.configured) return c.json({ code: 'FAIL', message: 'pay not configured' }, 500)
  const headers: Record<string, string> = {}
  c.req.raw.headers.forEach((v, k) => (headers[k.toLowerCase()] = v))
  let tx: Record<string, any>
  try {
    tx = await c.env.PAY.parseNotify(headers, raw)
  } catch (e) {
    console.error('wxpay notify verify failed', e)
    return c.json({ code: 'FAIL', message: '验签失败' }, 401)
  }
  try {
    const no = String(tx.out_trade_no || '')
    const o = await loadOrder(c.env.DB, no)
    if (!o) return c.json({ code: 'FAIL', message: 'order not found' }, 404)
    if (tx.trade_state === 'SUCCESS') {
      if (Number(tx.amount?.total) !== Number(o.amount_fen)) {
        console.error('wxpay notify amount mismatch', no, tx.amount, o.amount_fen)
        await c.env.DB.prepare("UPDATE orders SET note = '金额不一致，需人工核对', notify_payload = ? WHERE out_trade_no = ?").bind(JSON.stringify(tx).slice(0, 8000), no).run()
        return c.json({ code: 'FAIL', message: 'amount mismatch' }, 400)
      }
      await markPaid(c.env.DB, no, String(tx.transaction_id || ''), JSON.stringify(tx))
    } else if (tx.trade_state === 'CLOSED' || tx.trade_state === 'PAYERROR') {
      await c.env.DB.prepare("UPDATE orders SET status = 'closed', notify_payload = ?, updated_at = ? WHERE out_trade_no = ? AND status = 'pending'")
        .bind(JSON.stringify(tx).slice(0, 8000), new Date().toISOString(), no).run()
    }
    return c.body(null, 204)
  } catch (e) {
    console.error('wxpay notify handle error', e)
    return c.json({ code: 'FAIL', message: 'server error' }, 500)
  }
})
