import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { page } from './frontend'
import { site } from './site'
import lockup from './brand-lockup.png'
import mark from './brand-mark.png'
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

// 绑定的资源与环境变量见 src/auth.ts 的 Bindings 类型
// （DB / PHOTOS / IMGBB_API_KEY / WX_APPID / WX_APPSECRET / WX_MOCK_LOGIN / SESSION_SECRET / ADMIN_OPENIDS）

// images 表的一行（只列出接口会用到的字段）
type ImageRow = {
  id: number
  title: string | null
  url: string
  thumb_url: string
  created_at: string
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

function withPublicUrls(origin: string, row: ImageRow): ImageRow {
  const m = /\/media\/([A-Za-z0-9._-]+)$/.exec(row.url || '')
  if (!m) return row
  const url = mediaUrl(origin, m[1])
  return { ...row, url, thumb_url: url }
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

// 照片列表（新 → 旧；按婚礼隔离，必须带 ?wid=）
app.get('/api/images', async (c) => {
  const wid = getWid(c)
  const { results } = await c.env.DB.prepare(
    "SELECT id, title, url, thumb_url, created_at FROM images WHERE wedding_id = ? AND status <> 'hidden' ORDER BY id DESC",
  )
    .bind(wid)
    .all<ImageRow>()
  const origin = new URL(c.req.url).origin
  return c.json((results || []).map((row) => withPublicUrls(origin, row)))
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

// 上传照片（该婚礼管理员）：文件传到 ImgBB 图床，元数据写入数据库（gallery=0 时只传图不进相册）
// 自建服务器部署走 ImgBB（IMGBB_API_KEY）；未配置时回退到 Cloudflare KV（旧 Worker 部署）
app.post('/api/images', requireAdmin, async (c) => {
  const wid = getWid(c)
  if (!c.env.IMGBB_API_KEY && !c.env.PHOTOS) {
    return c.json({ error: '服务端未配置照片存储' }, 500)
  }

  const body = await c.req.parseBody()
  const raw = body['file']
  const title = body['title']
  if (!raw || typeof raw === 'string' || !(raw instanceof Blob) || raw.size === 0) {
    return c.json({ error: '请选择要上传的图片文件' }, 400)
  }
  if (raw.size > 15 * 1024 * 1024) {
    return c.json({ error: '图片不能超过 15MB' }, 400)
  }

  const buf = await raw.arrayBuffer()
  const bytes = new Uint8Array(buf)
  const sniffed = sniffImage(bytes)
  const name = raw instanceof File ? raw.name || '' : ''
  const extOk = /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i.test(name)
  const typeOk = Boolean(raw.type) && raw.type.startsWith('image/')
  if (!sniffed && !extOk && !typeOk) {
    return c.json({ error: '只能上传图片文件' }, 400)
  }
  const mime = sniffed?.mime || (typeOk ? raw.type : 'image/jpeg')
  const origin = new URL(c.req.url).origin

  // 套餐限制：相册张数（gallery=0 的配图不计入）
  const isGallery = !(typeof body['gallery'] === 'string' && (body['gallery'] === '0' || body['gallery'] === 'false'))
  const wp = await getWeddingPlan(c.env.DB, wid)
  if (wp.status === 'disabled') return c.json({ error: '该婚礼已被平台停用' }, 403)
  if (isGallery) {
    const cnt = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM images WHERE wedding_id = ? AND status <> 'hidden'").bind(wid).first<{ n: number }>()
    const cap = wp.ent.photos
    if ((Number(cnt?.n) || 0) >= cap) return limitReached(c, wp, '相册最多 ' + cap + ' 张')
  }

  let stored: { id: string; url: string; thumb_url: string; delete_url: string | null }
  if (c.env.IMGBB_API_KEY) {
    try {
      stored = await uploadToImgbb(c.env.IMGBB_API_KEY, bytes, mime, 'photo.' + (sniffed?.ext || 'jpg'))
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
        title: typeof title === 'string' ? title.trim() || null : null,
        url: stored.url,
        thumb_url: stored.thumb_url,
        created_at: new Date().toISOString(),
        gallery: false,
      },
      201,
    )
  }

  const inserted = await c.env.DB.prepare(
    'INSERT INTO images (wedding_id, imgbb_id, title, url, thumb_url, delete_url) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(
      wid,
      stored.id,
      typeof title === 'string' ? title.trim() || null : null,
      stored.url,
      stored.thumb_url,
      stored.delete_url,
    )
    .run()

  const row = await c.env.DB.prepare(
    'SELECT id, title, url, thumb_url, created_at FROM images WHERE id = ?',
  )
    .bind(inserted.meta.last_row_id)
    .first<ImageRow>()
  submitImageCheck(c.env, stored.url, { ...modTarget, targetId: inserted.meta.last_row_id }).catch(() => {})

  return c.json(row ? withPublicUrls(origin, row) : row, 201)
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
  const row = await c.env.DB.prepare('SELECT imgbb_id, delete_url, wedding_id FROM images WHERE id = ?')
    .bind(id)
    .first<{ imgbb_id: string | null; delete_url: string | null; wedding_id: string }>()
  if (!row) {
    return c.json({ error: '照片不存在' }, 404)
  }
  if (row.wedding_id !== wid) {
    return c.json({ error: '这张照片不属于当前婚礼' }, 403)
  }

  if (row.imgbb_id && row.imgbb_id.startsWith('photo:') && c.env.PHOTOS) {
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
