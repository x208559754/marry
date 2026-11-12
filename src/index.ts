import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { page } from './frontend'
import type { AppEnv } from './auth'
import { requireAdmin, getWid } from './auth'
import { wedding } from './wedding'

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

// 首页：照片墙页面（只读，需通过 ?wid= 指定婚礼）
app.get('/', (c) => c.html(page))

// 照片列表（新 → 旧；按婚礼隔离，必须带 ?wid=）
app.get('/api/images', async (c) => {
  const wid = getWid(c)
  const { results } = await c.env.DB.prepare(
    'SELECT id, title, url, thumb_url, created_at FROM images WHERE wedding_id = ? ORDER BY id DESC',
  )
    .bind(wid)
    .all<ImageRow>()
  const origin = new URL(c.req.url).origin
  return c.json((results || []).map((row) => withPublicUrls(origin, row)))
})

// 上传照片（该婚礼管理员）：文件存到 Cloudflare KV，元数据写入 D1
// ImgBB 已对 Cloudflare 出口 IP 封禁（You have been forbidden to use this website），不再使用。
app.post('/api/images', requireAdmin, async (c) => {
  const wid = getWid(c)
  if (!c.env.PHOTOS) {
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

  const storeId = crypto.randomUUID()
  const key = 'photo:' + storeId
  await c.env.PHOTOS.put(key, buf, { metadata: { contentType: mime } })

  const origin = new URL(c.req.url).origin
  const publicUrl = mediaUrl(origin, storeId)
  const inserted = await c.env.DB.prepare(
    'INSERT INTO images (wedding_id, imgbb_id, title, url, thumb_url, delete_url) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(
      wid,
      key,
      typeof title === 'string' ? title.trim() || null : null,
      publicUrl,
      publicUrl,
      null,
    )
    .run()

  const row = await c.env.DB.prepare(
    'SELECT id, title, url, thumb_url, created_at FROM images WHERE id = ?',
  )
    .bind(inserted.meta.last_row_id)
    .first<ImageRow>()

  return c.json(row ? withPublicUrls(origin, row) : row, 201)
})

// 公开取图：小程序 <image> 与网页都走这个地址（无需登录）
app.get('/media/:id', async (c) => {
  const id = c.req.param('id')
  if (!id || id.length > 80 || /[^A-Za-z0-9._-]/.test(id)) {
    return c.json({ error: '照片不存在' }, 404)
  }
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

// 删除照片（该婚礼管理员）：同时删除 KV 中的文件和 D1 记录
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
  // 旧数据可能仍带 ImgBB 删除链接，尽力通知对方
  if (row.delete_url) {
    try {
      await fetch(row.delete_url)
    } catch {
      // 忽略
    }
  }

  await c.env.DB.prepare('DELETE FROM images WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// 婚礼小程序 API（登录 / 配置 / 回执 / 祝福 / 婚礼管理 / 小程序码等，见 src/wedding.ts）
app.route('/api', wedding)

export default app
