// server/wxpay.ts — 微信支付 APIv3（JSAPI / 小程序）实现，注入为 bindings.PAY
// 需要的环境变量：
//   WXPAY_MCHID               商户号
//   WXPAY_API_V3_KEY          APIv3 密钥（32 字节，用于解密回调和平台证书）
//   WXPAY_SERIAL_NO           商户 API 证书序列号
//   WXPAY_PRIVATE_KEY_PATH    商户 API 私钥文件 apiclient_key.pem 的路径（权限 600）
//   WXPAY_NOTIFY_URL          支付结果回调地址，必须是 HTTPS 公网地址，例如 https://你的域名/api/pay/notify
//   验签二选一：
//   WXPAY_PUBLIC_KEY_PATH + WXPAY_PUBLIC_KEY_ID   「微信支付公钥」模式（新商户默认）
//   （不填则自动下载「平台证书」/v3/certificates 并用 APIv3 密钥解密后验签）
import crypto from 'node:crypto'
import fs from 'node:fs'
import type { PayProvider } from '../src/auth'

const HOST = 'https://api.mch.weixin.qq.com'

export function createWxPay(env: NodeJS.ProcessEnv, appid: string): PayProvider {
  const mchid = env.WXPAY_MCHID || ''
  const apiV3Key = env.WXPAY_API_V3_KEY || ''
  const serialNo = env.WXPAY_SERIAL_NO || ''
  const keyPath = env.WXPAY_PRIVATE_KEY_PATH || ''
  const notifyUrl = env.WXPAY_NOTIFY_URL || ''
  const pubKeyPath = env.WXPAY_PUBLIC_KEY_PATH || ''
  const pubKeyId = env.WXPAY_PUBLIC_KEY_ID || ''

  const missing: string[] = []
  if (!appid) missing.push('WX_APPID')
  if (!mchid) missing.push('WXPAY_MCHID')
  if (!apiV3Key) missing.push('WXPAY_API_V3_KEY')
  else if (Buffer.byteLength(apiV3Key) !== 32) missing.push('WXPAY_API_V3_KEY(需 32 字节)')
  if (!serialNo) missing.push('WXPAY_SERIAL_NO')
  if (!keyPath) missing.push('WXPAY_PRIVATE_KEY_PATH')
  if (!notifyUrl) missing.push('WXPAY_NOTIFY_URL')
  else if (!/^https:\/\//i.test(notifyUrl)) missing.push('WXPAY_NOTIFY_URL(必须 https)')

  let privateKey: crypto.KeyObject | null = null
  if (keyPath) {
    try {
      privateKey = crypto.createPrivateKey(fs.readFileSync(keyPath))
    } catch (e) {
      missing.push('WXPAY_PRIVATE_KEY_PATH(无法读取)')
    }
  }
  let wxPublicKey: crypto.KeyObject | null = null
  if (pubKeyPath) {
    try {
      wxPublicKey = crypto.createPublicKey(fs.readFileSync(pubKeyPath))
    } catch {
      missing.push('WXPAY_PUBLIC_KEY_PATH(无法读取)')
    }
  }
  const configured = missing.length === 0 && Boolean(privateKey)

  const nonce = () => crypto.randomBytes(16).toString('hex')
  const sign = (msg: string) => crypto.createSign('RSA-SHA256').update(msg).sign(privateKey!, 'base64')

  async function call(method: 'GET' | 'POST', path: string, body?: unknown): Promise<any> {
    const ts = Math.floor(Date.now() / 1000).toString()
    const nonceStr = nonce()
    const payload = body === undefined ? '' : JSON.stringify(body)
    const signature = sign(method + '\n' + path + '\n' + ts + '\n' + nonceStr + '\n' + payload + '\n')
    const auth =
      'WECHATPAY2-SHA256-RSA2048 mchid="' + mchid + '",nonce_str="' + nonceStr + '",signature="' + signature +
      '",timestamp="' + ts + '",serial_no="' + serialNo + '"'
    const res = await fetch(HOST + path, {
      method,
      headers: {
        Authorization: auth,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'youxi-server',
        // 「微信支付公钥」模式：请求头带上公钥ID，告诉微信用哪把公钥对应的私钥签名应答
        ...(wxPublicKey && pubKeyId ? { 'Wechatpay-Serial': pubKeyId } : {}),
      },
      body: method === 'POST' ? payload : undefined,
      signal: AbortSignal.timeout(10000),
    })
    const textBody = await res.text()
    let data: any = {}
    try {
      data = textBody ? JSON.parse(textBody) : {}
    } catch {
      data = { raw: textBody }
    }
    if (!res.ok) {
      const err = new Error((data && data.code ? data.code + ': ' : '') + ((data && data.message) || 'HTTP ' + res.status)) as Error & { status?: number; code?: string }
      err.status = res.status
      err.code = data && data.code
      throw err
    }
    // 响应验签（有平台公钥/证书时）
    try {
      const hs: Record<string, string> = {}
      res.headers.forEach((v, k) => (hs[k.toLowerCase()] = v))
      await verify(hs, textBody)
    } catch (e) {
      throw new Error('微信支付响应验签失败：' + (e instanceof Error ? e.message : String(e)))
    }
    return data
  }

  function decrypt(resource: { ciphertext: string; nonce: string; associated_data?: string }): string {
    const buf = Buffer.from(resource.ciphertext, 'base64')
    const tag = buf.subarray(buf.length - 16)
    const data = buf.subarray(0, buf.length - 16)
    const d = crypto.createDecipheriv('aes-256-gcm', Buffer.from(apiV3Key), Buffer.from(resource.nonce))
    d.setAuthTag(tag)
    if (resource.associated_data) d.setAAD(Buffer.from(resource.associated_data))
    return Buffer.concat([d.update(data), d.final()]).toString('utf8')
  }

  // 平台证书缓存（serial → 公钥）
  let certs: Map<string, crypto.KeyObject> | null = null
  let certsAt = 0
  let loadingCerts: Promise<void> | null = null
  async function loadCerts() {
    // 下载证书接口本身的响应无法先验签（首次），按微信文档用解密成功作为可信依据
    const ts = Math.floor(Date.now() / 1000).toString()
    const nonceStr = nonce()
    const path = '/v3/certificates'
    const signature = sign('GET\n' + path + '\n' + ts + '\n' + nonceStr + '\n\n')
    const res = await fetch(HOST + path, {
      headers: {
        Authorization: 'WECHATPAY2-SHA256-RSA2048 mchid="' + mchid + '",nonce_str="' + nonceStr + '",signature="' + signature + '",timestamp="' + ts + '",serial_no="' + serialNo + '"',
        Accept: 'application/json',
        'User-Agent': 'youxi-server',
      },
      signal: AbortSignal.timeout(10000),
    })
    const data = (await res.json()) as any
    if (!res.ok) throw new Error('下载平台证书失败：' + (data?.message || res.status))
    const m = new Map<string, crypto.KeyObject>()
    for (const it of data.data || []) {
      const pem = decrypt(it.encrypt_certificate)
      m.set(String(it.serial_no), new crypto.X509Certificate(pem).publicKey)
    }
    certs = m
    certsAt = Date.now()
  }
  async function publicKeyFor(serial: string): Promise<crypto.KeyObject> {
    // 「微信支付公钥」模式：Wechatpay-Serial 为公钥ID（PUB_KEY_ID_ 开头）时用 pub_key.pem 验签；
    // 其他序列号视为平台证书序列号，回退到下载平台证书验签（兼容切换过渡期）
    if (wxPublicKey && (!serial || serial === pubKeyId || serial.startsWith('PUB_KEY_ID_'))) {
      if (pubKeyId && serial && serial !== pubKeyId) throw new Error('Wechatpay-Serial 与 WXPAY_PUBLIC_KEY_ID 不一致')
      return wxPublicKey
    }
    if (!certs || !certs.has(serial) || Date.now() - certsAt > 12 * 3600 * 1000) {
      if (!loadingCerts) loadingCerts = loadCerts().finally(() => (loadingCerts = null))
      await loadingCerts
    }
    const k = certs!.get(serial)
    if (!k) throw new Error('未找到序列号为 ' + serial + ' 的平台证书')
    return k
  }

  async function verify(h: Record<string, string>, body: string) {
    const ts = h['wechatpay-timestamp']
    const nonceStr = h['wechatpay-nonce']
    const signature = h['wechatpay-signature']
    const serial = h['wechatpay-serial'] || ''
    if (!ts || !nonceStr || !signature) throw new Error('缺少微信支付签名头')
    if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) throw new Error('时间戳过期')
    if (signature.startsWith('WECHATPAY/SIGNTEST/')) throw new Error('签名探测请求')
    const key = await publicKeyFor(serial)
    const okSig = crypto.createVerify('RSA-SHA256').update(ts + '\n' + nonceStr + '\n' + body + '\n').verify(key, signature, 'base64')
    if (!okSig) throw new Error('签名不匹配')
  }

  return {
    configured,
    missing,
    async createJsapiOrder(o) {
      if (!configured) throw new Error('微信支付未配置：' + missing.join(', '))
      const data = await call('POST', '/v3/pay/transactions/jsapi', {
        appid,
        mchid,
        description: o.description,
        out_trade_no: o.outTradeNo,
        notify_url: notifyUrl,
        attach: o.attach,
        amount: { total: o.totalFen, currency: 'CNY' },
        payer: { openid: o.openid },
      })
      const prepayId = String(data.prepay_id || '')
      if (!prepayId) throw new Error('未返回 prepay_id')
      const timeStamp = Math.floor(Date.now() / 1000).toString()
      const nonceStr = nonce()
      const pkg = 'prepay_id=' + prepayId
      const paySign = sign(appid + '\n' + timeStamp + '\n' + nonceStr + '\n' + pkg + '\n')
      return { prepayId, payParams: { timeStamp, nonceStr, package: pkg, signType: 'RSA' as const, paySign } }
    },
    async parseNotify(headers, body) {
      if (!configured) throw new Error('微信支付未配置')
      await verify(headers, body)
      const n = JSON.parse(body)
      if (!n.resource) throw new Error('缺少 resource')
      const tx = JSON.parse(decrypt(n.resource))
      if (tx.mchid && tx.mchid !== mchid) throw new Error('mchid 不一致')
      if (tx.appid && tx.appid !== appid) throw new Error('appid 不一致')
      return tx
    },
    async queryOrder(outTradeNo) {
      if (!configured) throw new Error('微信支付未配置')
      return call('GET', '/v3/pay/transactions/out-trade-no/' + encodeURIComponent(outTradeNo) + '?mchid=' + encodeURIComponent(mchid))
    },
    async refund(o) {
      if (!configured) throw new Error('微信支付未配置')
      return call('POST', '/v3/refund/domestic/refunds', {
        out_trade_no: o.outTradeNo,
        out_refund_no: o.outRefundNo,
        reason: o.reason || undefined,
        amount: { refund: o.refundFen, total: o.totalFen, currency: 'CNY' },
      })
    },
  }
}
