// server/node.ts — 自建服务器入口：Hono app（与 Worker 同一套路由）跑在 Node 上，
// 数据库用 MySQL（D1 兼容层），照片走 ImgBB，抽奖大屏用 WebSocket 推送。
import { serve } from '@hono/node-server'
import { WebSocketServer, WebSocket } from 'ws'
import type { IncomingMessage } from 'node:http'
import app from '../src/index'
import { onLotteryChange, publicLotteryView } from '../src/lottery'
import { createDb } from './d1-mysql'
import { migrate } from './migrate'
import { ensurePlatformAdmin } from '../src/platform-password'
import { createWxPay } from './wxpay'

const env = process.env
const PORT = Number(env.PORT || 3000)
const HOST = env.HOST || '127.0.0.1'
if (!env.DATABASE_URL) throw new Error('缺少 DATABASE_URL')

const DB = createDb(env.DATABASE_URL) as any
const bindings = {
  DB,
  IMGBB_API_KEY: env.IMGBB_API_KEY || '',
  WX_APPID: env.WX_APPID || '',
  WX_APPSECRET: env.WX_APPSECRET || '',
  WX_MOCK_LOGIN: env.WX_MOCK_LOGIN || '0',
  SESSION_SECRET: env.SESSION_SECRET || '',
  ADMIN_OPENIDS: env.ADMIN_OPENIDS || '',
  // 内容安全（默认开启、接口异常时放行；MODERATION_MOCK=1 本地模拟）
  MODERATION_ENABLED: env.MODERATION_ENABLED || '1',
  MODERATION_FAIL_OPEN: env.MODERATION_FAIL_OPEN || '1',
  MODERATION_BLOCK_REVIEW: env.MODERATION_BLOCK_REVIEW || '0',
  MODERATION_MOCK: env.MODERATION_MOCK || '0',
  WX_PUSH_TOKEN: env.WX_PUSH_TOKEN || '',
  // 收费：PAY_MOCK=1 时未配置微信支付也可走模拟支付（仅测试用）
  PAY_MOCK: env.PAY_MOCK || '0',
  PAY: createWxPay(env, env.WX_APPID || ''),
  // 平台总后台
  PLATFORM_ADMIN_PASSWORD: env.PLATFORM_ADMIN_PASSWORD || '',
  // 七牛云：AK/SK/空间在环境变量；访问域名优先读数据库 config.qiniu_domain，这里只作兜底
  QINIU_AK: env.QINIU_AK || '',
  QINIU_SK: env.QINIU_SK || '',
  QINIU_BUCKET: env.QINIU_BUCKET || '',
  QINIU_DOMAIN: env.QINIU_DOMAIN || '',
  QINIU_UPLOAD_URL: env.QINIU_UPLOAD_URL || '',
  QINIU_RS_URL: env.QINIU_RS_URL || '',
}

// Caddy 终止 HTTPS 后以 http 反代到本机：按 X-Forwarded-Proto 还原 https，
// 让 new URL(c.req.url).origin 等生成的链接是 https://youxitie.site
function withForwardedProto(req: Request): Request {
  const proto = (req.headers.get('x-forwarded-proto') || '').split(',')[0].trim()
  if (proto !== 'https' || !req.url.startsWith('http:')) return req
  const init: any = { method: req.method, headers: req.headers, signal: req.signal, redirect: req.redirect }
  if (req.method !== 'GET' && req.method !== 'HEAD') { init.body = req.body; init.duplex = 'half' }
  return new Request('https:' + req.url.slice(5), init)
}

// 启动前做幂等的增量迁移（新表 / 新列；不删改已有数据）
await migrate(DB.pool)
await ensurePlatformAdmin(DB, env.PLATFORM_ADMIN_PASSWORD || '')

const server = serve(
  {
    fetch: (req: Request) => app.fetch(withForwardedProto(req), bindings as any),
    port: PORT,
    hostname: HOST,
  },
  (info) => console.log('youxi listening on http://' + HOST + ':' + info.port),
)

// ---------------- 抽奖大屏 WebSocket：/api/lottery/ws?wid= ----------------
const rooms = new Map<string, Set<WebSocket>>()
const revealTimers = new Map<string, NodeJS.Timeout>()
const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 })

function widOf(req: IncomingMessage): string | null {
  const u = new URL(req.url || '/', 'http://x')
  if (u.pathname !== '/api/lottery/ws') return null
  return (u.searchParams.get('wid') || '').trim().slice(0, 64) || 'demo'
}

async function sendState(wid: string, targets?: Iterable<WebSocket>) {
  const set = targets || rooms.get(wid)
  if (!set) return
  let msg: string
  try {
    const view = await publicLotteryView(DB, wid)
    msg = JSON.stringify(view ? { type: 'state', data: view } : { type: 'notfound' })
  } catch (e) {
    console.error('lottery ws view error', e)
    return
  }
  for (const ws of set) if (ws.readyState === WebSocket.OPEN) ws.send(msg)
}

onLotteryChange((_db, wid, revealAt) => {
  // 写库后推送；滚动中到揭晓时刻再推一次（揭晓不一定伴随写库）
  setTimeout(() => sendState(wid), 0)
  const old = revealTimers.get(wid)
  if (old) clearTimeout(old)
  revealTimers.delete(wid)
  if (revealAt) {
    const delay = Math.max(0, revealAt - Date.now() + 50)
    revealTimers.set(wid, setTimeout(() => { revealTimers.delete(wid); sendState(wid) }, delay))
  }
})

;(server as any).on('upgrade', (req: IncomingMessage, socket: any, head: Buffer) => {
  const wid = widOf(req)
  if (!wid) { socket.destroy(); return }
  wss.handleUpgrade(req, socket, head, (ws) => {
    let set = rooms.get(wid)
    if (!set) rooms.set(wid, (set = new Set()))
    set.add(ws)
    ;(ws as any).isAlive = true
    ws.on('pong', () => { (ws as any).isAlive = true })
    ws.on('message', (m) => { if (String(m) === 'ping' && ws.readyState === WebSocket.OPEN) ws.send('{"type":"pong"}') })
    ws.on('close', () => { set!.delete(ws); if (set!.size === 0) rooms.delete(wid) })
    ws.on('error', () => {})
    sendState(wid, [ws])
  })
})

// 心跳：清理掉线连接
setInterval(() => {
  for (const set of rooms.values()) for (const ws of set) {
    if (!(ws as any).isAlive) { ws.terminate(); continue }
    ;(ws as any).isAlive = false
    try { ws.ping() } catch {}
  }
}, 30000).unref()

function shutdown() {
  console.log('shutting down')
  wss.clients.forEach((ws) => ws.close(1012, 'restart'))
  ;(server as any).close(() => process.exit(0))
  setTimeout(() => process.exit(0), 3000).unref()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
