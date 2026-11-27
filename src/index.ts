import { Hono } from 'hono'
import type { Context } from 'hono'
import { cors } from 'hono/cors'
import { page } from './frontend'
import { site } from './site'
import lockup from './brand-lockup.png'
import mark from './brand-mark.png'
import waxSeal from './wax-seal.png'
import miniprogramQr from './miniprogram-qr.png'
import bgmAudio from './bgm.mp3'
import wechatQr from './wechat-qr.png'
import type { AppEnv } from './auth'
import { requireAdmin, getWid, getOpenid } from './auth'
import { billing, getWeddingPlan, limitReached } from './billing'
import { platform } from './platform'
import { platformPage } from './platform-page'
import { submitImageCheck, handleMediaCheckEvent } from './moderation'
import { wedding } from './wedding'
import { lottery } from './lottery'
import { lotteryPage } from './lottery-page'
import {
  getQiniuCreds,
  getQiniuDomain,
  makeUploadToken,
  newVideoKey,
  videoKeyAllowed,
  toQiniuMarker,
  fromQiniuMarker,
  publicObjectUrl,
  videoThumbUrl,
  deleteQiniuObject,
  VIDEO_MAX_BYTES,
} from './qiniu'
import { mediaKindOf } from './media-kind'

// 绑定的资源与环境变量见 src/auth.ts 的 Bindings 类型
// （DB / PHOTOS / IMGBB_API_KEY / WX_APPID / WX_APPSECRET / WX_MOCK_LOGIN / SESSION_SECRET / ADMIN_OPENIDS）

// images 表的一行（只列出接口会用到的字段）
type ImageRow = {
  id: number
  title: string | null
  url: string
  thumb_url: string
  created_at: string
  kind?: string
}

// 根据文件头判断图片类型。微信 wx.uploadFile 常把文件标成 octet-stream，且临时文件名没有扩展名。
function sniffImage(bytes: Uint8Array): { mime: string; ext: string } | null {
  if (bytes.length < 12) return null
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { mime: 'image/png', ext: 'png' }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return { mime: 'image/gif', ext: 'gif' }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' }
  }
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return { mime: 'image/bmp', ext: 'bmp' }
  const head = String.fromCharCode(...bytes.slice(0, 32))
  if (head.includes('ftyp') && /heic|heif|mif1|msf1|hevx/i.test(head)) return { mime: 'image/heic', ext: 'heic' }
  return null
}

function mediaUrl(origin: string, storeId: string) {
  return origin + '/media/' + storeId
}

function withPublicUrls(origin: string, row: ImageRow, qiniuDomain?: string): ImageRow {
  const key = fromQiniuMarker(row.url) || fromQiniuMarker(row.thumb_url)
  const kind = mediaKindOf(row)
  if (key) {
    const domain = qiniuDomain || ''
    const url = publicObjectUrl(domain, key)
    return { ...row, url, thumb_url: kind === 'video' ? videoThumbUrl(domain, key) : url, kind }
  }
  const m = /\/media\/([A-Za-z0-9._-]+)$/.exec(row.url || '')
  if (!m) return { ...row, kind }
  const url = mediaUrl(origin, m[1])
  return { ...row, url, thumb_url: url, kind }
}

const app = new Hono<AppEnv>()

// 允许网页版（本地 Vite / 任意源）调用 Worker；小程序 wx.request 不受 CORS 限制
app.use(
  '*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization', 'x-admin-passcode'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    maxAge: 86400,
  }),
)

// 兜底错误处理：比如 D1 还没建表时，返回 JSON 而不是 500 纯文本
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: '服务器内部错误：' + err.message }, 500)
})

app.get('/brand/lockup.png', () => {
  return new Response(lockup, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400',
    },
  })
})

app.get('/brand/mark.png', () => {
  return new Response(mark, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400',
    },
  })
})

app.get('/brand/wax-seal.png', () => {
  return new Response(waxSeal, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400',
    },
  })
})

app.get('/brand/miniprogram-qr.png', () => {
  return new Response(miniprogramQr, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400',
    },
  })
})

// 浪漫婚礼主题曲《红笺良辰》（支持 HTTP Range，兼容 iOS 微信与 Safari 播放/循环）
const bgmBytes = bgmAudio instanceof Uint8Array ? bgmAudio : new Uint8Array(bgmAudio)
app.get('/brand/bgm.mp3', (c) => {
  const total = bgmBytes.byteLength
  const range = c.req.header('range')
  const baseHeaders: Record<string, string> = {
    'content-type': 'audio/mpeg',
    'accept-ranges': 'bytes',
    'cache-control': 'public, max-age=86400',
  }
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/i.exec(range.trim())
    if (m) {
      let start = m[1] ? Number(m[1]) : 0
      let end = m[2] ? Number(m[2]) : total - 1
      if (!m[1] && m[2]) {
        const suffix = Number(m[2])
        start = Math.max(0, total - suffix)
        end = total - 1
      }
      if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || start >= total || end < start) {
        return new Response(null, {
          status: 416,
          headers: { ...baseHeaders, 'content-range': `bytes */${total}` },
        })
      }
      end = Math.min(end, total - 1)
      const chunk = bgmBytes.subarray(start, end + 1)
      return new Response(chunk, {
        status: 206,
        headers: {
          ...baseHeaders,
          'content-range': `bytes ${start}-${end}/${total}`,
          'content-length': String(chunk.byteLength),
        },
      })
    }
  }
  return new Response(bgmBytes, {
    status: 200,
    headers: {
      ...baseHeaders,
      'content-length': String(total),
    },
  })
})


app.get('/kefu/wechat-qr.png', () => {
  return new Response(wechatQr, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400',
    },
  })
})

// 首页：没有婚礼标识时是产品官网；带 ?wid= 时仍是该场婚礼的照片墙
app.get('/', (c) => {
  const wid = (c.req.query('wid') || '').trim()
  return c.html(wid ? page : site)
})

// 婚宴现场抽奖大屏（公开，无需登录；由小程序管理后台控制）：/lottery?wid=xxx 或 /l/xxx
app.get('/lottery', (c) => {
  c.header('Cache-Control', 'no-store')
  return c.html(lotteryPage)
})
app.get('/l/:wid', (c) => {
  c.header('Cache-Control', 'no-store')
  return c.html(lotteryPage)
})

async function loadAlbum(db: D1Database, wid: string) {
  const orderKey = 'album_order:' + wid
  const [{ results }, saved] = await Promise.all([
    db.prepare("SELECT id, title, url, thumb_url, created_at, kind FROM images WHERE wedding_id = ? AND status <> 'hidden' ORDER BY id DESC")
      .bind(wid).all<ImageRow>(),
    db.prepare('SELECT value FROM config WHERE key = ?').bind(orderKey).first<{ value: string }>(),
  ])
  if (!saved) return { rows: results || [], orderKey, saved }

  let ids: unknown
  try { ids = JSON.parse(saved.value) } catch {}
  if (!Array.isArray(ids)) return { rows: results || [], orderKey, saved }

  const remaining = new Map((results || []).map((row) => [row.id, row]))
  const ordered: ImageRow[] = []
  for (const id of ids) {
    const row = remaining.get(id)
    if (row) {
      ordered.push(row)
      remaining.delete(id)
    }
  }
  // 新上传的照片排在最前，已删除或隐藏的照片不参与排序。
  return { rows: [...remaining.values(), ...ordered], orderKey, saved }
}

async function publicAlbum(c: Context<AppEnv>, rows: ImageRow[]) {
  const origin = new URL(c.req.url).origin
  const qiniuDomain = await getQiniuDomain(c.env.DB, c.env)
  return c.json(rows.map((row) => withPublicUrls(origin, row, qiniuDomain)))
}

app.get('/api/images', async (c) => {
  const { rows } = await loadAlbum(c.env.DB, getWid(c))
  return publicAlbum(c, rows)
})

app.put('/api/images/order', requireAdmin, async (c) => {
  const wid = getWid(c)
  const body = await c.req.json<{ id?: number; targetId?: number; after?: boolean }>().catch(() => null)
  if (!body || !Number.isSafeInteger(body.id) || !Number.isSafeInteger(body.targetId) ||
      body.id === body.targetId || typeof body.after !== 'boolean') {
    return c.json({ error: '无效的照片位置' }, 400)
  }

  const db = c.env.DB
  const wp = await getWeddingPlan(db, wid)
  if (!wp.exists) return c.json({ error: '婚礼不存在' }, 404)
  if (wp.status === 'disabled') return c.json({ error: '该婚礼已被平台停用' }, 403)
  const { rows, orderKey, saved } = await loadAlbum(db, wid)
  const index = rows.findIndex((row) => row.id === body.id)
  const target = rows.findIndex((row) => row.id === body.targetId)
  if (index < 0 || target < 0) return c.json({ error: '相册内容已更新，请重试' }, 409)
  if (index === target + (body.after ? 1 : -1)) return publicAlbum(c, rows)

  const [moved] = rows.splice(index, 1)
  const insertAt = target - Number(index < target) + Number(body.after)
  rows.splice(insertAt, 0, moved)
  const value = JSON.stringify(rows.map((row) => row.id))
  const now = new Date().toISOString()
  const result = await (saved
    ? db.prepare('UPDATE config SET value = ?, updated_at = ? WHERE key = ? AND value = ?')
      .bind(value, now, orderKey, saved.value)
    : db.prepare('INSERT OR IGNORE INTO config (key, value, updated_at) VALUES (?, ?, ?)')
      .bind(orderKey, value, now)).run()
  if (!result.meta.changes) return c.json({ error: '相册顺序已更新，请重试' }, 409)
  return publicAlbum(c, rows)
})

// 上传到 ImgBB：返回 {id,url,thumb_url,delete_url}；失败抛错
async function uploadToImgbb(apiKey: string, bytes: Uint8Array, mime: string, filename: string) {
  const form = new FormData()
  form.append('key', apiKey)
  form.append('image', new Blob([bytes], { type: mime }), filename)
  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form })
  const data = (await res.json().catch(() => null)) as any
  if (!res.ok || !data || !data.success || !data.data) {
    const msg = (data && data.error && (data.error.message || data.error)) || 'HTTP ' + res.status
    throw new Error('图床上传失败：' + msg)
  }
  const d = data.data
  return {
    id: String(d.id || ''),
    url: String(d.url || d.display_url || ''),
    thumb_url: String((d.medium && d.medium.url) || (d.thumb && d.thumb.url) || d.display_url || d.url || ''),
    delete_url: d.delete_url ? String(d.delete_url) : null,
  }
}

const albumCountSql = "SELECT COUNT(*) AS n FROM images WHERE wedding_id = ? AND status <> 'hidden'"

async function albumIsFull(db: D1Database, wid: string, cap: number): Promise<boolean> {
  const count = await db.prepare(albumCountSql).bind(wid).first<{ n: number }>()
  return (Number(count?.n) || 0) >= cap
}

async function insertAlbumMedia(
  db: D1Database,
  wid: string,
  cap: number,
  title: string | null,
  stored: { id: string; url: string; thumb_url: string; delete_url: string | null },
  kind: 'image' | 'video',
): Promise<number | null> {
  // 在插入时再次校验相册容量，避免并发上传共用最后一个名额。
  const stmt = db.prepare(
    'INSERT INTO images (wedding_id, imgbb_id, title, url, thumb_url, delete_url, kind) ' +
    'SELECT ?, ?, ?, ?, ?, ?, ? FROM (' + albumCountSql + ') AS album WHERE album.n < ?',
  ).bind(wid, stored.id, title, stored.url, stored.thumb_url, stored.delete_url, kind, wid, cap)
  const result = await stmt.run().catch((err: unknown) => {
    if ((err as { code?: string })?.code !== 'ER_LOCK_DEADLOCK') throw err
    return stmt.run()
  })
  return result.meta.changes ? result.meta.last_row_id : null
}

// 上传照片（该婚礼管理员）：文件传到 ImgBB 图床，元数据写入数据库（gallery=0 时只传图不进相册）
// 自建服务器部署走 ImgBB（IMGBB_API_KEY）；未配置时回退到 Cloudflare KV（旧 Worker 部署）
app.post('/api/images', requireAdmin, async (c) => {
  const wid = getWid(c)
  if (!c.env.IMGBB_API_KEY && !c.env.PHOTOS) {
    return c.json({ error: '服务端未配置照片存储' }, 500)
  }

  const body = await c.req.parseBody()
  const raw = body['file']
  const title = typeof body.title === 'string' ? body.title.trim() || null : null
  if (!raw || typeof raw === 'string' || !(raw instanceof Blob) || raw.size === 0) {
    return c.json({ error: '请选择要上传的图片文件' }, 400)
  }
  if (raw.size > 15 * 1024 * 1024) {
    return c.json({ error: '图片不能超过 15MB' }, 400)
  }

  const buf = await raw.arrayBuffer()
  const bytes = new Uint8Array(buf)
  const image = sniffImage(bytes)
  if (!image) {
    return c.json({ error: '只能上传图片文件' }, 400)
  }
  const { mime, ext } = image
  const origin = new URL(c.req.url).origin

  // 套餐限制：相册张数（gallery=0 的配图不计入）
  const isGallery = !(typeof body['gallery'] === 'string' && (body['gallery'] === '0' || body['gallery'] === 'false'))
  const wp = await getWeddingPlan(c.env.DB, wid)
  if (wp.status === 'disabled') return c.json({ error: '该婚礼已被平台停用' }, 403)
  const cap = wp.ent.photos
  if (isGallery && await albumIsFull(c.env.DB, wid, cap)) {
    return limitReached(c, wp, '相册最多 ' + cap + ' 张')
  }

  let stored: { id: string; url: string; thumb_url: string; delete_url: string | null }
  if (c.env.IMGBB_API_KEY) {
    try {
      stored = await uploadToImgbb(c.env.IMGBB_API_KEY, bytes, mime, 'photo.' + ext)
    } catch (e) {
      return c.json({ error: (e as Error).message }, 502)
    }
  } else {
    const storeId = crypto.randomUUID()
    const key = 'photo:' + storeId
    await c.env.PHOTOS!.put(key, buf, { metadata: { contentType: mime } })
    const publicUrl = mediaUrl(origin, storeId)
    stored = { id: key, url: publicUrl, thumb_url: publicUrl, delete_url: null }
  }

  // 图片内容安全：异步提交微信检测，结果经 /api/wx/push 回调；违规图片自动隐藏
  const modTarget = { wid, openid: getOpenid(c), scene: 1 as const, targetType: 'image' }

  // gallery=0：只传图、返回地址，不登记到婚纱相册（如「岁月印记」配图）
  if (!isGallery) {
    submitImageCheck(c.env, stored.url, { ...modTarget, targetType: 'image-inline' }).catch(() => {})
    return c.json(
      {
        id: null,
        title,
        url: stored.url,
        thumb_url: stored.thumb_url,
        created_at: new Date().toISOString(),
        gallery: false,
      },
      201,
    )
  }

  const id = await insertAlbumMedia(c.env.DB, wid, cap, title, stored, 'image')
  if (id === null) {
    if (stored.delete_url) {
      await fetch(stored.delete_url, { signal: AbortSignal.timeout(8000) }).catch(() => {})
    } else if (!c.env.IMGBB_API_KEY) {
      await c.env.PHOTOS!.delete(stored.id).catch(() => {})
    }
    return limitReached(c, wp, '相册最多 ' + cap + ' 张')
  }

  const row = await c.env.DB.prepare(
    'SELECT id, title, url, thumb_url, created_at, kind FROM images WHERE id = ?',
  )
    .bind(id)
    .first<ImageRow>()
  submitImageCheck(c.env, stored.url, { ...modTarget, targetId: id }).catch(() => {})

  return c.json(row ? withPublicUrls(origin, row) : row, 201)
})

// 七牛视频直传：后台签发短时上传凭证，小程序直接传到七牛，再调用 POST /api/videos 登记。
// 库里只存 qiniu:<对象键>，完整网址在读出时用 config.qiniu_domain 拼接。
app.post('/api/videos/token', requireAdmin, async (c) => {
  const wid = getWid(c)
  const wp = await getWeddingPlan(c.env.DB, wid)
  if (wp.status === 'disabled') return c.json({ error: '该婚礼已被平台停用' }, 403)
  if (!wp.canUploadVideo) return limitReached(c, wp, '仅支持上传图片')
  const creds = getQiniuCreds(c.env)
  if ('error' in creds) return c.json({ error: creds.error }, 503)
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const isGallery = !(body.gallery === 0 || body.gallery === '0' || body.gallery === false)
  const cap = wp.ent.photos
  if (isGallery && await albumIsFull(c.env.DB, wid, cap)) {
    return limitReached(c, wp, '相册最多 ' + cap + ' 张')
  }
  const key = newVideoKey(wid)
  const domain = await getQiniuDomain(c.env.DB, c.env)
  const minted = await makeUploadToken(creds, key)
  return c.json({
    token: minted.token,
    key,
    uploadUrl: creds.uploadUrl,
    fileUrl: publicObjectUrl(domain, key),
    domain,
    expireAt: minted.expireAt,
    maxBytes: VIDEO_MAX_BYTES,
  })
})

app.post('/api/videos', requireAdmin, async (c) => {
  const wid = getWid(c)
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>
  const key = typeof body.key === 'string' ? body.key.trim() : ''
  if (!videoKeyAllowed(wid, key)) return c.json({ error: '无效的视频文件路径' }, 400)
  const title = typeof body.title === 'string' ? body.title.trim() || null : null
  const isGallery = !(body.gallery === 0 || body.gallery === '0' || body.gallery === false)
  const wp = await getWeddingPlan(c.env.DB, wid)
  if (wp.status === 'disabled') return c.json({ error: '该婚礼已被平台停用' }, 403)
  if (!wp.canUploadVideo) return limitReached(c, wp, '仅支持上传图片')
  const marker = toQiniuMarker(key)
  const domain = await getQiniuDomain(c.env.DB, c.env)
  const origin = new URL(c.req.url).origin
  if (!isGallery) {
    return c.json(
      {
        id: null,
        title,
        url: publicObjectUrl(domain, key),
        thumb_url: videoThumbUrl(domain, key),
        created_at: new Date().toISOString(),
        kind: 'video',
        key,
        marker,
        gallery: false,
      },
      201,
    )
  }
  const cap = wp.ent.photos
  const id = await insertAlbumMedia(c.env.DB, wid, cap, title, { id: marker, url: marker, thumb_url: marker, delete_url: null }, 'video')
  if (id === null) return limitReached(c, wp, '相册最多 ' + cap + ' 张')
  const row = await c.env.DB.prepare(
    'SELECT id, title, url, thumb_url, created_at, kind FROM images WHERE id = ?',
  )
    .bind(id)
    .first<ImageRow>()
  return c.json(row ? withPublicUrls(origin, row, domain) : row, 201)
})

// 公开取图：小程序 <image> 与网页都走这个地址（无需登录）
app.get('/media/:id', async (c) => {
  const id = c.req.param('id')
  if (!id || id.length > 80 || /[^A-Za-z0-9._-]/.test(id)) {
    return c.json({ error: '照片不存在' }, 404)
  }
  if (!c.env.PHOTOS) return c.json({ error: '照片不存在' }, 404)
  const got = await c.env.PHOTOS.getWithMetadata<Record<string, string>>(id.startsWith('photo:') ? id : 'photo:' + id, {
    type: 'arrayBuffer',
  })
  if (got.value === null) {
    return c.json({ error: '照片不存在' }, 404)
  }
  const mime = (got.metadata && got.metadata.contentType) || 'image/jpeg'
  return new Response(got.value, {
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  })
})

// 删除照片（该婚礼管理员）：尽力删除图床/KV 中的文件，再删数据库记录
app.delete('/api/images/:id', requireAdmin, async (c) => {
  const wid = getWid(c)
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ error: '无效的 id' }, 400)
  }
  const row = await c.env.DB.prepare('SELECT imgbb_id, delete_url, url, wedding_id FROM images WHERE id = ?')
    .bind(id)
    .first<{ imgbb_id: string | null; delete_url: string | null; url: string | null; wedding_id: string }>()
  if (!row) {
    return c.json({ error: '照片不存在' }, 404)
  }
  if (row.wedding_id !== wid) {
    return c.json({ error: '这张照片不属于当前婚礼' }, 403)
  }

  const qiniuKey = fromQiniuMarker(row.imgbb_id) || fromQiniuMarker(row.url)
  if (qiniuKey) {
    const creds = getQiniuCreds(c.env)
    if (!('error' in creds)) {
      try {
        await deleteQiniuObject(creds, qiniuKey)
      } catch {
        // 忽略存储删除失败，仍删库记录
      }
    }
  } else if (row.imgbb_id && row.imgbb_id.startsWith('photo:') && c.env.PHOTOS) {
    try {
      await c.env.PHOTOS.delete(row.imgbb_id)
    } catch {
      // 忽略存储删除失败，仍删库记录
    }
  }
  // ImgBB 删除链接：尽力请求（ImgBB 删除需网页确认，接口层面只能尽力而为）
  if (row.delete_url) {
    try {
      await fetch(row.delete_url, { signal: AbortSignal.timeout(8000) })
    } catch {
      // 忽略
    }
  }

  await c.env.DB.prepare('DELETE FROM images WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// 平台总后台（网页，口令登录；接口见 src/platform.ts）
app.get('/platform', (c) => {
  c.header('Cache-Control', 'no-store')
  c.header('X-Frame-Options', 'DENY')
  return c.html(platformPage)
})

// 小程序「消息推送」：GET 校验服务器地址，POST 接收图片异步审核结果（明文 JSON 模式）
async function pushSignatureOk(token: string, ts: string, nonce: string, signature: string) {
  if (!token || !ts || !nonce || !signature) return false
  const raw = [token, ts, nonce].sort().join('')
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(raw))
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return hex === signature
}
app.get('/api/wx/push', async (c) => {
  const q = c.req.query()
  if (!(await pushSignatureOk(c.env.WX_PUSH_TOKEN || '', q.timestamp || '', q.nonce || '', q.signature || ''))) return c.text('bad signature', 403)
  return c.text(q.echostr || '')
})
app.post('/api/wx/push', async (c) => {
  const q = c.req.query()
  if (!(await pushSignatureOk(c.env.WX_PUSH_TOKEN || '', q.timestamp || '', q.nonce || '', q.signature || ''))) return c.text('bad signature', 403)
  const ev = (await c.req.json().catch(() => null)) as Record<string, any> | null
  if (ev && ev.Event === 'wxa_media_check') {
    try {
      await handleMediaCheckEvent(c.env.DB, ev)
    } catch (e) {
      console.error('media check event error', e)
    }
  }
  return c.text('success')
})

// 收费：套餐 / 下单 / 微信支付回调（见 src/billing.ts）
app.route('/api', billing)

// 平台总后台 API（见 src/platform.ts）
app.route('/api/platform', platform)

// 婚礼小程序 API（登录 / 配置 / 回执 / 祝福 / 婚礼管理 / 小程序码等，见 src/wedding.ts）
app.route('/api', wedding)

// 现场抽奖 API（见 src/lottery.ts）
app.route('/api', lottery)

export default app
