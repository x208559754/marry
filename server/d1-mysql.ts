// server/d1-mysql.ts — 用 mysql2 实现 Cloudflare D1 的最小子集（prepare/bind/all/first/run），
// 并把 src/*.ts 里的 SQLite 写法改写成 MySQL 写法，业务代码无需感知数据库差异。
import mysql from 'mysql2/promise'

// SQLite → MySQL 改写（只覆盖本项目用到的写法）
export function rewriteSql(sql: string): string {
  let q = sql
  // config 表的列名 key 是 MySQL 保留字
  q = q.replace(/(?<![`\w])key(?![`\w])/g, '`key`')
  // datetime('now') → 与 SQLite 相同格式的 UTC 文本
  q = q.replace(/datetime\('now'\)/gi, "DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')")
  // INSERT OR IGNORE / OR REPLACE
  q = q.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT IGNORE INTO')
  q = q.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'REPLACE INTO')
  // ON CONFLICT(...) DO NOTHING → INSERT IGNORE
  if (/ON\s+CONFLICT\s*(\([^)]*\))?\s*DO\s+NOTHING/i.test(q)) {
    q = q.replace(/ON\s+CONFLICT\s*(\([^)]*\))?\s*DO\s+NOTHING/gi, '').replace(/^\s*INSERT\s+INTO/i, 'INSERT IGNORE INTO')
  }
  // ON CONFLICT(...) DO UPDATE SET → 行别名 excluded + ON DUPLICATE KEY UPDATE（MySQL 8.0.19+）
  q = q.replace(/ON\s+CONFLICT\s*\([^)]*\)\s*DO\s+UPDATE\s+SET/gi, 'AS excluded ON DUPLICATE KEY UPDATE')
  return q
}

type Meta = { last_row_id: number; changes: number; rows_read?: number; rows_written?: number }

class Stmt {
  constructor(private pool: mysql.Pool, private sql: string, private params: unknown[] = []) {}
  bind(...params: unknown[]) {
    return new Stmt(this.pool, this.sql, params.map((p) => (p === undefined ? null : p)))
  }
  private async exec(): Promise<any> {
    const [rows] = await this.pool.query(this.sql, this.params)
    return rows
  }
  async all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: true; meta: Meta }> {
    const rows = await this.exec()
    if (Array.isArray(rows)) return { results: rows as T[], success: true, meta: { last_row_id: 0, changes: 0 } }
    return { results: [], success: true, meta: { last_row_id: rows.insertId || 0, changes: rows.affectedRows || 0 } }
  }
  async first<T = Record<string, unknown>>(col?: string): Promise<T | null> {
    const rows = await this.exec()
    if (!Array.isArray(rows) || rows.length === 0) return null
    const r = rows[0] as any
    return (col ? r[col] : r) as T
  }
  async run(): Promise<{ success: true; meta: Meta; results: [] }> {
    const rows = await this.exec()
    const meta: Meta = Array.isArray(rows)
      ? { last_row_id: 0, changes: 0 }
      : { last_row_id: rows.insertId || 0, changes: rows.affectedRows || 0 }
    return { success: true, meta, results: [] }
  }
  async raw(): Promise<unknown[][]> {
    const rows = await this.exec()
    return Array.isArray(rows) ? rows.map((r: any) => Object.values(r)) : []
  }
}

export class MysqlD1 {
  constructor(public pool: mysql.Pool) {}
  prepare(sql: string) {
    return new Stmt(this.pool, rewriteSql(sql))
  }
  async batch(stmts: Stmt[]) {
    const out = []
    for (const s of stmts) out.push(await s.all())
    return out
  }
  async exec(sql: string) {
    await this.pool.query(sql)
    return { count: 1, duration: 0 }
  }
}

export function createDb(url: string) {
  const pool = mysql.createPool({
    uri: url,
    connectionLimit: 10,
    charset: 'utf8mb4',
    timezone: 'Z',
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: false,
    waitForConnections: true,
  })
  return new MysqlD1(pool)
}
