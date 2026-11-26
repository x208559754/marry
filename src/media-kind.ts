// src/media-kind.ts — 按数据源判断图片 / 视频（网页与服务端共用）
// 优先用已存的 kind；否则看 qiniu:video/ 前缀；再看网址扩展名（忽略查询串）。兼容 ImgBB 等旧的完整网址。

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|avi|mkv|3gp|m3u8)$/i

export function stripUrlQuery(url: string): string {
  return String(url || '').split('#')[0].split('?')[0]
}

function collectCandidates(item: unknown): string[] {
  if (item == null) return []
  if (typeof item === 'string') return [item]
  if (typeof item !== 'object') return []
  const o = item as Record<string, unknown>
  const keys = ['url', 'image', 'src', 'thumb_url', 'thumbUrl', 'imgbb_id', 'key', 'coverImage']
  const out: string[] = []
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'string' && v) out.push(v)
  }
  return out
}

export function mediaKindOf(item: unknown): 'video' | 'image' {
  if (item && typeof item === 'object') {
    const kind = String((item as Record<string, unknown>).kind || (item as Record<string, unknown>).type || '').toLowerCase()
    if (kind === 'video' || kind === 'image') return kind
  }
  for (const raw of collectCandidates(item)) {
    const s = raw.trim()
    if (!s) continue
    if (s.startsWith('qiniu:video/') || s.includes('qiniu:video/')) return 'video'
    if (VIDEO_EXT.test(stripUrlQuery(s))) return 'video'
  }
  return 'image'
}

export function isVideoMedia(item: unknown): boolean {
  return mediaKindOf(item) === 'video'
}
