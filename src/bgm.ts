// src/bgm.ts — 平台默认背景音乐 + 婚礼自定义背景音乐（高级功能）
import {
  expandQiniuUrl,
  foldQiniuUrl,
  fromQiniuMarker,
  getQiniuDomain,
  publicObjectUrl,
  toQiniuMarker,
  type QiniuEnv,
} from './qiniu'

export const DEFAULT_BGM_CONFIG_KEY = 'default_bgm'
export const BUNDLED_BGM_URL = 'https://youxitie.site/brand/bgm.mp3'
export const BUNDLED_BGM_TITLE = '红笺良辰'

export type BgmInfo = {
  url: string
  title: string
  custom: boolean
  source: 'custom' | 'platform' | 'bundled'
}

export type StoredBgm = {
  url: string // 入库多为 qiniu:<key>，也可能是历史完整网址
  title: string
}

function trim(s: unknown): string {
  return typeof s === 'string' ? s.trim() : ''
}

export function parseStoredBgm(raw: unknown): StoredBgm | null {
  if (!raw) return null
  if (typeof raw === 'string') {
    const url = raw.trim()
    return url ? { url, title: '' } : null
  }
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>
    const url = trim(o.url || o.src || o.key)
    if (!url) return null
    return { url, title: trim(o.title).slice(0, 80) }
  }
  return null
}

export function storedFromConfig(cfg: Record<string, unknown> | null | undefined): StoredBgm | null {
  if (!cfg) return null
  return parseStoredBgm(cfg.music)
}

export async function getPlatformDefaultBgm(
  db: { prepare: (sql: string) => any },
  env?: QiniuEnv,
): Promise<BgmInfo> {
  let stored: StoredBgm | null = null
  try {
    const row = await db.prepare('SELECT value FROM config WHERE key = ?').bind(DEFAULT_BGM_CONFIG_KEY).first<{ value: string }>()
    if (row?.value) {
      try {
        stored = parseStoredBgm(JSON.parse(row.value))
      } catch {
        stored = parseStoredBgm(row.value)
      }
    }
  } catch {}
  const domain = await getQiniuDomain(db, env)
  if (stored?.url) {
    return {
      url: expandQiniuUrl(stored.url, domain),
      title: stored.title || BUNDLED_BGM_TITLE,
      custom: false,
      source: fromQiniuMarker(stored.url) || stored.url !== BUNDLED_BGM_URL ? 'platform' : 'bundled',
    }
  }
  return { url: BUNDLED_BGM_URL, title: BUNDLED_BGM_TITLE, custom: false, source: 'bundled' }
}

export async function setPlatformDefaultBgm(
  db: { prepare: (sql: string) => any },
  env: QiniuEnv | undefined,
  input: { url?: string; key?: string; title?: string },
): Promise<BgmInfo> {
  const domain = await getQiniuDomain(db, env)
  let url = trim(input.url)
  if (input.key) url = toQiniuMarker(String(input.key).replace(/^\/+/, ''))
  if (!url) throw new Error('缺少音频文件')
  url = foldQiniuUrl(url, domain)
  const title = trim(input.title).slice(0, 80) || BUNDLED_BGM_TITLE
  const value = JSON.stringify({ url, title })
  await db
    .prepare(
      'INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    )
    .bind(DEFAULT_BGM_CONFIG_KEY, value, new Date().toISOString())
    .run()
  return getPlatformDefaultBgm(db, env)
}

export async function clearPlatformDefaultBgm(db: { prepare: (sql: string) => any }) {
  await db.prepare('DELETE FROM config WHERE key = ?').bind(DEFAULT_BGM_CONFIG_KEY).run()
}

/** 解析一场婚礼实际应播放的音乐：高级版且已上传自定义曲则用自定义，否则用平台默认（再否则用内置《红笺良辰》）。 */
export function resolvePlayback(
  stored: StoredBgm | null,
  entitled: boolean,
  platform: BgmInfo,
  domain: string,
): BgmInfo & { entitled: boolean; hasCustom: boolean } {
  const hasCustom = Boolean(stored?.url)
  if (entitled && stored?.url) {
    return {
      url: expandQiniuUrl(stored.url, domain),
      title: stored.title || platform.title || BUNDLED_BGM_TITLE,
      custom: true,
      source: 'custom',
      entitled,
      hasCustom,
    }
  }
  return { ...platform, custom: false, entitled, hasCustom }
}

export function canCustomizeBgm(wp: { premium?: boolean; level?: number }): boolean {
  return Boolean(wp.premium) || Number(wp.level || 0) >= 10
}

export function musicForSave(title: string, urlOrMarker: string): StoredBgm {
  return { url: urlOrMarker, title: title.slice(0, 80) }
}
