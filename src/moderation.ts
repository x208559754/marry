// src/moderation.ts — 内容安全检测（微信 security.msgSecCheck v2 / mediaCheckAsync v2）
// 规则：
//  - 违规（risky）一律拦截；疑似（review）默认放行但进入平台审核队列（MODERATION_BLOCK_REVIEW=1 时也拦截）
//  - 微信接口出错默认放行并记录（MODERATION_FAIL_OPEN=0 时拦截）
//  - 没有 openid（未登录 / 口令后台）时 v2 接口无法调用：只做关键词检测，记为 skipped
//  - MODERATION_MOCK=1（或本地 mock 登录）时不请求微信：含「测试违规」视为违规、「测试疑似」视为疑似
import type { Bindings } from './auth'
import { getWxAccessToken, clearWxAccessToken } from './wx'

export type ModResult = 'pass' | 'review' | 'risky' | 'error' | 'skipped' | 'pending'
export type ModTarget = {
  wid: string
  openid: string
  scene: 1 | 2 | 3 | 4 // 1 资料 2 评论 3 论坛 4 社交日志
  targetType: string // blessing / rsvp / profile / config / lottery / image
  targetId?: string | number | null
  nickname?: string
  title?: string
}
export type ModOutcome = { ok: boolean; result: ModResult; label?: number; message?: string; logId?: number }

export const LABEL_NAMES: Record<number, string> = {
  100: '正常',
  10001: '广告',
  20001: '时政',
  20002: '色情',
  20003: '辱骂',
  20006: '违法犯罪',
  20008: '欺诈',
  20012: '低俗',
  20013: '版权',
  21000: '其他',
}

export const BLOCK_MESSAGE = '内容可能包含不当信息，请修改后再提交'
const ERROR_MESSAGE = '内容安全检测暂时不可用，请稍后再试'
const CHUNK = 2500

function enabled(env: Bindings) {
  return env.MODERATION_ENABLED !== '0'
}
function mockMode(env: Bindings) {
  return env.MODERATION_MOCK === '1' || (env.WX_MOCK_LOGIN === '1' && !env.WX_APPSECRET)
}
const RANK: Record<string, number> = { pass: 0, skipped: 0, pending: 0, error: 1, review: 2, risky: 3 }

// 平台在总后台维护的关键词（config 表 moderation_keywords，逗号或换行分隔）
let kwCache: { at: number; list: string[] } | null = null
async function keywords(db: D1Database): Promise<string[]> {
  if (kwCache && Date.now() - kwCache.at < 60_000) return kwCache.list
  let list: string[] = []
  try {
    const row = await db.prepare("SELECT value FROM config WHERE key = 'moderation_keywords'").first<{ value: string }>()
    list = (row?.value || '').split(/[,，\n]/).map((s) => s.trim()).filter(Boolean)
  } catch {}
  kwCache = { at: Date.now(), list }
  return list
}
export function resetKeywordCache() {
  kwCache = null
}

async function writeLog(
  db: D1Database,
  t: ModTarget,
  kind: 'text' | 'image',
  content: string,
  result: ModResult,
  extra: { label?: number; suggest?: string; traceId?: string; detail?: string } = {},
): Promise<number | undefined> {
  try {
    const res = await db
      .prepare(
        'INSERT INTO moderation_logs (wedding_id, openid, kind, scene, target_type, target_id, content, result, label, suggest, trace_id, detail, handled, created_at) ' +
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'none', ?)",
      )
      .bind(
        t.wid,
        t.openid || null,
        kind,
        t.scene,
        t.targetType,
        t.targetId == null ? null : String(t.targetId),
        content.slice(0, 4000),
        result,
        extra.label ?? null,
        extra.suggest ?? null,
        extra.traceId ?? null,
        (extra.detail || '').slice(0, 2000) || null,
        new Date().toISOString(),
      )
      .run()
    return res.meta.last_row_id || undefined
  } catch (e) {
    console.error('moderation log error', e)
    return undefined
  }
}

// 内容写库后补上目标 id（如祝福 id），方便总后台定位和隐藏
export async function attachTarget(db: D1Database, logId: number | undefined, targetId: string | number) {
  if (!logId) return
  await db.prepare('UPDATE moderation_logs SET target_id = ? WHERE id = ?').bind(String(targetId), logId).run().catch(() => {})
}

async function callMsgSecCheck(env: Bindings, content: string, t: ModTarget, retried = false): Promise<any> {
  const token = await getWxAccessToken(env.DB, env.WX_APPID, env.WX_APPSECRET)
  const body: Record<string, unknown> = { content, version: 2, scene: t.scene, openid: t.openid }
  if (t.nickname) body.nickname = t.nickname.slice(0, 30)
  if (t.title) body.title = t.title.slice(0, 30)
  const res = await fetch('https://api.weixin.qq.com/wxa/msg_sec_check?access_token=' + encodeURIComponent(token), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(6000),
  })
  const data = (await res.json().catch(() => null)) as any
  if (data && (data.errcode === 40001 || data.errcode === 42001) && !retried) {
    await clearWxAccessToken(env.DB)
    return callMsgSecCheck(env, content, t, true)
  }
  return data
}

// 检测一段文本（自动分段）；返回 ok=false 时调用方应拒绝保存并把 message 返回给用户
export async function checkText(env: Bindings, text: string, t: ModTarget): Promise<ModOutcome> {
  const content = (text || '').trim()
  if (!content || !enabled(env)) return { ok: true, result: 'pass' }

  const kws = await keywords(env.DB)
  const hit = kws.find((k) => content.includes(k))
  if (hit) {
    const logId = await writeLog(env.DB, t, 'text', content, 'risky', { suggest: 'risky', detail: '命中平台关键词：' + hit })
    return { ok: false, result: 'risky', message: BLOCK_MESSAGE, logId }
  }

  if (mockMode(env)) {
    const result: ModResult = content.includes('测试违规') ? 'risky' : content.includes('测试疑似') ? 'review' : 'pass'
    if (result === 'pass') return { ok: true, result }
    const logId = await writeLog(env.DB, t, 'text', content, result, { suggest: result, label: 21000, detail: 'mock' })
    const block = result === 'risky' || env.MODERATION_BLOCK_REVIEW === '1'
    return { ok: !block, result, label: 21000, message: block ? BLOCK_MESSAGE : undefined, logId }
  }

  if (!t.openid || !env.WX_APPID || !env.WX_APPSECRET) {
    const logId = await writeLog(env.DB, t, 'text', content, 'skipped', {
      detail: !t.openid ? '无 openid（未登录或口令后台），仅做关键词检测' : '未配置微信凭据',
    })
    return { ok: true, result: 'skipped', logId }
  }

  let worst: ModResult = 'pass'
  let label: number | undefined
  let traceId = ''
  let detail = ''
  for (let i = 0; i < content.length; i += CHUNK) {
    const part = content.slice(i, i + CHUNK)
    let r: ModResult
    try {
      const data = await callMsgSecCheck(env, part, t)
      if (!data || data.errcode !== 0) {
        r = 'error'
        detail = 'errcode ' + (data?.errcode ?? '?') + ' ' + (data?.errmsg || '')
      } else {
        const sug = String(data.result?.suggest || 'pass')
        r = sug === 'risky' ? 'risky' : sug === 'review' ? 'review' : 'pass'
        if (r !== 'pass') {
          label = Number(data.result?.label) || undefined
          traceId = String(data.trace_id || '')
          detail = JSON.stringify((data.detail || []).filter((d: any) => d && d.suggest && d.suggest !== 'pass')).slice(0, 1500)
        }
      }
    } catch (e) {
      r = 'error'
      detail = e instanceof Error ? e.message : String(e)
    }
    if (RANK[r] > RANK[worst]) worst = r
    if (worst === 'risky') break
  }

  if (worst === 'pass') return { ok: true, result: 'pass' }
  const logId = await writeLog(env.DB, t, 'text', content, worst, { label, suggest: worst, traceId, detail })
  if (worst === 'error') {
    console.warn('msgSecCheck error:', detail)
    const failOpen = env.MODERATION_FAIL_OPEN !== '0'
    return { ok: failOpen, result: 'error', message: failOpen ? undefined : ERROR_MESSAGE, logId }
  }
  const block = worst === 'risky' || env.MODERATION_BLOCK_REVIEW === '1'
  return { ok: !block, result: worst, label, message: block ? BLOCK_MESSAGE : undefined, logId }
}

// 依次检测多段文本（如姓名 + 祝福）；有一段不过即返回
export async function checkTexts(env: Bindings, parts: string[], t: ModTarget): Promise<ModOutcome> {
  const text = parts.map((s) => (s || '').trim()).filter(Boolean).join('\n')
  return checkText(env, text, t)
}

// 从任意 JSON（婚礼配置等）里收集需要检测的文字：跳过网址、颜色、坐标、纯数字
const SKIP_KEYS = new Set(['theme', 'envelopeStyle', 'sealVariant', 'music', 'bgm', 'coverImage', 'image', 'images', 'avatar', 'avatarUrl', 'url', 'latitude', 'longitude', 'lat', 'lng', 'phone', 'date', 'time', 'id'])
export function collectTexts(v: unknown, out: string[] = [], depth = 0, key = ''): string[] {
  if (depth > 6 || out.length > 400) return out
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s || SKIP_KEYS.has(key)) return out
    if (/^(https?:|wxfile:|cloud:|data:|\/)/i.test(s)) return out
    if (/^[#\d\s.:\-+/]+$/.test(s)) return out
    out.push(s)
  } else if (Array.isArray(v)) {
    for (const x of v) collectTexts(x, out, depth + 1, key)
  } else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) collectTexts(x, out, depth + 1, k)
  }
  return out
}

// 图片异步检测：提交后结果通过「消息推送」回调 /api/wx/push 返回
export async function submitImageCheck(env: Bindings, url: string, t: ModTarget): Promise<void> {
  if (!enabled(env) || !url) return
  if (mockMode(env)) return
  if (!t.openid || !env.WX_APPID || !env.WX_APPSECRET) {
    await writeLog(env.DB, t, 'image', url, 'skipped', { detail: !t.openid ? '无 openid，未提交图片检测' : '未配置微信凭据' })
    return
  }
  try {
    const call = async (retried: boolean): Promise<any> => {
      const token = await getWxAccessToken(env.DB, env.WX_APPID, env.WX_APPSECRET)
      const res = await fetch('https://api.weixin.qq.com/wxa/media_check_async?access_token=' + encodeURIComponent(token), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_url: url, media_type: 2, version: 2, scene: t.scene, openid: t.openid }),
        signal: AbortSignal.timeout(6000),
      })
      const data = (await res.json().catch(() => null)) as any
      if (data && (data.errcode === 40001 || data.errcode === 42001) && !retried) {
        await clearWxAccessToken(env.DB)
        return call(true)
      }
      return data
    }
    const data = await call(false)
    if (data && data.errcode === 0 && data.trace_id) {
      await writeLog(env.DB, t, 'image', url, 'pending', { traceId: String(data.trace_id) })
    } else {
      await writeLog(env.DB, t, 'image', url, 'error', { detail: 'errcode ' + (data?.errcode ?? '?') + ' ' + (data?.errmsg || '') })
    }
  } catch (e) {
    await writeLog(env.DB, t, 'image', url, 'error', { detail: e instanceof Error ? e.message : String(e) })
  }
}

// 处理图片异步检测结果（消息推送 wxa_media_check 事件）；违规图片自动从相册隐藏
export async function handleMediaCheckEvent(db: D1Database, ev: Record<string, any>): Promise<void> {
  const traceId = String(ev.trace_id || '')
  if (!traceId) return
  const sug = String(ev.result?.suggest || '')
  const result: ModResult = sug === 'risky' ? 'risky' : sug === 'review' ? 'review' : 'pass'
  const label = Number(ev.result?.label) || null
  await db
    .prepare('UPDATE moderation_logs SET result = ?, label = ?, suggest = ?, detail = ? WHERE trace_id = ?')
    .bind(result, label, sug || null, JSON.stringify(ev.detail || []).slice(0, 2000), traceId)
    .run()
  if (result === 'risky') {
    const row = await db
      .prepare("SELECT id, target_id FROM moderation_logs WHERE trace_id = ? AND target_type = 'image' LIMIT 1")
      .bind(traceId)
      .first<{ id: number; target_id: string | null }>()
    if (row?.target_id) {
      await db.prepare("UPDATE images SET status = 'hidden' WHERE id = ?").bind(Number(row.target_id)).run()
      await db.prepare("UPDATE moderation_logs SET handled = 'hidden' WHERE id = ?").bind(row.id).run()
    }
  }
}
