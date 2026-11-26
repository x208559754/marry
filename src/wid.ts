// src/wid.ts — 婚礼标识：新建一律随机 UUID（去横线，32 位），已有 wid 保持不变
export const WID_RE = /^[A-Za-z0-9_-]{2,32}$/

export function isValidWid(id: string): boolean {
  return WID_RE.test(id)
}

/** 32 位小写十六进制（UUID v4 去掉横线），符合既有 2-32 位 wid 规则。 */
export function newWid(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

export async function genUniqueWid(db: { prepare: (sql: string) => any }, attempts = 8): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const id = newWid()
    const exists = await db.prepare('SELECT 1 AS x FROM weddings WHERE id = ?').bind(id).first()
    if (!exists) return id
  }
  throw new Error('生成婚礼标识失败，请重试')
}

export function defaultWeddingConfig(groom: string, bride: string): Record<string, unknown> {
  return {
    theme: 'red',
    groom: { name: groom || '新郎' },
    bride: { name: bride || '新娘' },
  }
}
