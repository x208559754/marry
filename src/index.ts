import { Hono } from 'hono'
import { page } from './frontend'
import type { AppEnv } from './auth'
import { requireAdmin } from './auth'
import { wedding } from './wedding'

// 绑定的资源与环境变量见 src/auth.ts 的 Bindings 类型
// （DB / IMGBB_API_KEY / WX_APPID / WX_APPSECRET / WX_MOCK_LOGIN / SESSION_SECRET / ADMIN_OPENIDS）

// images 表的一行（只列出接口会用到的字段）
type ImageRow = {
  id: number
  title: string | null
  url: string
  thumb_url: string
  created_at: string
}

// ImgBB 上传接口的返回结构（只列用到的字段）
type ImgbbUploadResult = {
  success: boolean
  status: number
  data?: {
    id: string
    url: string
    thumb?: { url: string }
    delete_url?: string
  }
  error?: { message: string; code: number }
}

const app = new Hono<AppEnv>()

// 兜底错误处理：比如 D1 还没建表时，返回 JSON 而不是 500 纯文本
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: '服务器内部错误：' + err.message }, 500)
})

// 首页：照片墙页面（只读，上传/删除已收敛到小程序管理后台）
app.get('/', (c) => c.html(page))

// 照片列表（新 → 旧）
app.get('/api/images', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, title, url, thumb_url, created_at FROM images ORDER BY id DESC',
  ).all<ImageRow>()
  return c.json(results)
})

// 上传照片（管理员）：先把文件转存到 ImgBB，再把元数据写入 D1
app.post('/api/images', requireAdmin, async (c) => {
  const apiKey = c.env.IMGBB_API_KEY
  if (!apiKey) {
    return c.json({ error: '服务端未配置 IMGBB_API_KEY，请检查 .dev.vars 或 Wrangler Secret' }, 500)
  }

  // 解析 multipart 表单：file（图片）+ title（可选标题）
  const body = await c.req.parseBody()
  const file = body['file']
  const title = body['title']
  if (!(file instanceof File) || file.size === 0) {
    return c.json({ error: '请选择要上传的图片文件' }, 400)
  }
  // wx.uploadFile 的文件 part 常为 application/octet-stream 或空 type，此时改看文件名扩展名
  const extOk = /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i.test(file.name || '')
  const typeOk = Boolean(file.type) && file.type.startsWith('image/')
  const octetLike = !file.type || file.type === 'application/octet-stream'
  if (!typeOk && !(octetLike && extOk)) {
    return c.json({ error: '只能上传图片文件' }, 400)
  }
  if (file.size > 32 * 1024 * 1024) {
    return c.json({ error: '图片不能超过 32MB（ImgBB 限制）' }, 400)
  }

  // 1. 转存到 ImgBB
  const imgbbForm = new FormData()
  imgbbForm.append('image', file, file.name)
  const imgbbRes = await fetch(
    `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`,
    { method: 'POST', body: imgbbForm },
  )
  const imgbb = (await imgbbRes.json().catch(() => null)) as ImgbbUploadResult | null
  if (!imgbbRes.ok || !imgbb?.success || !imgbb.data?.url) {
    // 把 ImgBB 的原始错误透传出来，方便排查（Key 无效 / 被封禁等）
    const reason = imgbb?.error?.message ? '：' + imgbb.error.message : ''
    return c.json({ error: 'ImgBB 上传失败' + reason }, 502)
  }

  // 2. 元数据写入 D1
  const thumbUrl = imgbb.data.thumb?.url ?? imgbb.data.url
  const inserted = await c.env.DB.prepare(
    'INSERT INTO images (imgbb_id, title, url, thumb_url, delete_url) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(
      imgbb.data.id,
      typeof title === 'string' ? title.trim() || null : null,
      imgbb.data.url,
      thumbUrl,
      imgbb.data.delete_url ?? null,
    )
    .run()

  const row = await c.env.DB.prepare(
    'SELECT id, title, url, thumb_url, created_at FROM images WHERE id = ?',
  )
    .bind(inserted.meta.last_row_id)
    .first<ImageRow>()

  return c.json(row, 201)
})

// 删除照片（管理员）：尽力通知 ImgBB 删原图，然后删除 D1 记录
app.delete('/api/images/:id', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ error: '无效的 id' }, 400)
  }

  const row = await c.env.DB.prepare('SELECT delete_url FROM images WHERE id = ?')
    .bind(id)
    .first<{ delete_url: string | null }>()
  if (!row) {
    return c.json({ error: '照片不存在' }, 404)
  }

  // 尽力而为：ImgBB 的删除链接失效也不影响本地记录删除
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

// 婚礼小程序 API（登录 / 配置 / 回执 / 祝福 / 手机号等，见 src/wedding.ts）
app.route('/api', wedding)

export default app
