// src/wx.ts — 微信服务端接口公共部分（access_token 缓存）
function nowIso(): string {
  return new Date().toISOString()
}

// 取微信 access_token（stable_token + 缓存到 config 表，避免频繁请求微信接口）
export async function getWxAccessToken(db: D1Database, appid: string, secret: string): Promise<string> {
  const row = await db.prepare("SELECT value FROM config WHERE key = 'wx_access_token'").first<{ value: string }>()
  if (row?.value) {
    try {
      const cached = JSON.parse(row.value) as { token: string; expiresAt: number }
      if (cached.token && cached.expiresAt > Date.now() + 60_000) return cached.token
    } catch {
      // 缓存损坏则忽略，重新获取
    }
  }
  const res = await fetch('https://api.weixin.qq.com/cgi-bin/stable_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credential', appid, secret, force_refresh: false }),
  })
  const data = (await res.json().catch(() => null)) as {
    access_token?: string
    expires_in?: number
    errmsg?: string
  } | null
  if (!data?.access_token) throw new Error('获取微信 access_token 失败：' + (data?.errmsg || '未知错误'))
  const value = JSON.stringify({
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 7200) * 1000,
  })
  await db
    .prepare(
      "INSERT INTO config (key, value, updated_at) VALUES ('wx_access_token', ?, ?) " +
        'ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    )
    .bind(value, nowIso())
    .run()
  return data.access_token
}


// access_token 失效（40001 / 42001）时清缓存，下次重取
export async function clearWxAccessToken(db: D1Database) {
  await db.prepare("DELETE FROM config WHERE key = 'wx_access_token'").run().catch(() => {})
}
