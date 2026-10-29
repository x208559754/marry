// scripts/export-notion.mjs — 一次性迁移脚本：把旧 Notion 数据导出为 D1 seed.sql
//
// 用法（仓库根目录）：node scripts/export-notion.mjs
//   · 读取 wxapp/data_store/notion_credentials.json 里的旧 Notion token（撤销前执行）
//   · 产物 scripts/seed.sql（含个人隐私数据，已 gitignore，请勿提交）
// 导入：
//   · 本地：wrangler d1 execute marry-images --local  --file=scripts/seed.sql
//   · 线上：wrangler d1 execute marry-images --remote --file=scripts/seed.sql
import fs from 'fs';
import path from 'path';

const credsPath = path.resolve('wxapp/data_store/notion_credentials.json');
const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
const TOKEN = creds.apiKey;
const VERSION = '2022-06-28';

// 数据库 ID：优先取凭据文件，缺失时用旧代码中已知的固定 ID
const DBS = {
  rsvp: creds.rsvpDbId || '3f86df76b8c88069a629c469d51e2367',
  blessings: creds.blessingsDbId || '3f86df76b8c88031a06ef09d5cbc58e1',
  users: '3fa6df76b8c88137ba0aea0eb795efb9',
  letter: '3fa6df76b8c8813f813dfce422b2d90b'
};

async function queryDb(dbId) {
  const all = [];
  let cursor = undefined;
  for (let page = 0; page < 10; page++) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Notion-Version': VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`查询数据库失败（${res.status}）: ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    all.push(...(data.results || []));
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
  return all;
}

// ---- Notion 属性解析小工具 ----
function propText(props, names) {
  for (const n of names) {
    const p = props[n];
    if (!p) continue;
    if (p.type === 'title' && p.title && p.title.length) return p.title.map((t) => t.plain_text).join('');
    if (p.type === 'rich_text' && p.rich_text && p.rich_text.length) return p.rich_text.map((t) => t.plain_text).join('');
  }
  return '';
}
function propPhone(props, names) {
  for (const n of names) {
    const p = props[n];
    if (!p) continue;
    if (p.type === 'phone_number' && p.phone_number) return p.phone_number;
    if (p.type === 'rich_text' && p.rich_text && p.rich_text.length) return p.rich_text.map((t) => t.plain_text).join('');
  }
  return '';
}
function propSelect(props, names) {
  for (const n of names) {
    const p = props[n];
    if (p && p.type === 'select' && p.select) return p.select.name;
  }
  return '';
}
function propNumber(props, names) {
  for (const n of names) {
    const p = props[n];
    if (p && p.type === 'number' && typeof p.number === 'number') return p.number;
  }
  return 0;
}
function propCheckbox(props, names) {
  for (const n of names) {
    const p = props[n];
    if (p && p.type === 'checkbox') return Boolean(p.checkbox);
  }
  return false;
}
function propDate(props, names) {
  for (const n of names) {
    const p = props[n];
    if (p && p.type === 'date' && p.date && p.date.start) return p.date.start;
  }
  return '';
}
function sqlStr(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  return "'" + String(v).replace(/'/g, "''") + "'";
}
function cleanPhone(v) {
  return String(v || '').replace(/[\s-]/g, '');
}

// ---------------- 拉取并转换 ----------------

console.log('正在从 Notion 拉取历史数据...');

// 1) RSVP 回执
const rsvpRowsRaw = await queryDb(DBS.rsvp);
const rsvpRows = [];
{
  const seenOpenids = new Set();
  let dupOpenid = 0;
  for (const row of rsvpRowsRaw) {
    const p = row.properties || {};
    const openid = propText(p, ['OpenID', 'openid', '微信OpenID']).trim();
    if (openid) {
      if (seenOpenids.has(openid)) { dupOpenid++; continue; } // UNIQUE(openid) 冲突去重
      seenOpenids.add(openid);
    }
    const name = propText(p, ['Name', '姓名', '宾客姓名', 'Title']) || '未署名宾客';
    const attendSel = propSelect(p, ['出席状态', 'Status', '出席意向']);
    const attending = /no|不|遗憾|缺席/i.test(attendSel) ? 'no' : 'yes';
    const guestCount = propNumber(p, ['同行人数', '人数', 'GuestCount']) || 1;
    const dietary = propSelect(p, ['饮食偏好', '饮食习惯', 'Dietary']) || '';
    const needShuttle = propCheckbox(p, ['需要接驳车', '接驳班车', '班车', 'Shuttle']);
    const blessing = propText(p, ['祝福寄语', '祝福内容', '祝福', 'Blessing']);
    const submittedAt = propDate(p, ['提交时间']) || row.created_time || new Date().toISOString();
    rsvpRows.push({
      openid,
      source: openid ? 'form' : 'prefill',
      name,
      phone: cleanPhone(propPhone(p, ['手机号', '电话', 'Phone', '联系电话'])),
      attending,
      guestCount: attending === 'yes' ? guestCount : 0,
      dietary: attending === 'yes' ? dietary : '',
      needShuttle: attending === 'yes' && needShuttle ? 1 : 0,
      blessing,
      submittedAt
    });
  }
  console.log(`· RSVP：${rsvpRows.length} 条（原始 ${rsvpRowsRaw.length}，重复 openid 跳过 ${dupOpenid}）`);
}

// 2) 祝福留言
const blessingRows = (await queryDb(DBS.blessings)).map((row) => {
  const p = row.properties || {};
  return {
    author: propText(p, ['Name', '宾客', 'Author', '用户昵称']) || '亲朋好友',
    content: propText(p, ['祝福内容', '寄语', '祝福', 'Content']) || '',
    likes: propNumber(p, ['点赞数', 'Likes']) || 1,
    createdAt: propDate(p, ['创建时间', '时间']) || row.created_time || new Date().toISOString()
  };
}).filter((b) => b.content);
console.log(`· 祝福：${blessingRows.length} 条`);

// 3) 微信用户表
const userRows = [];
{
  const seen = new Set();
  for (const row of await queryDb(DBS.users)) {
    const p = row.properties || {};
    const openid = propText(p, ['微信OpenID', 'OpenID', 'openid']).trim();
    if (!openid || seen.has(openid)) continue;
    seen.add(openid);
    userRows.push({
      openid,
      name: propText(p, ['用户昵称', '昵称', 'Name']),
      phone: cleanPhone(propPhone(p, ['手机号', '电话'])),
      blessing: propText(p, ['祝福寄语', '祝福']),
      loginCount: propNumber(p, ['登录次数']) || 1,
      firstSeen: propDate(p, ['首次登录时间']) || row.created_time || new Date().toISOString(),
      lastSeen: propDate(p, ['最近活跃时间', '最近登录时间']) || row.last_edited_time || new Date().toISOString()
    });
  }
}
console.log(`· 用户：${userRows.length} 条`);

// 4) 喜帖信笺与婚礼配置（取「是否启用」勾选的一行；无勾选则取第一行）
let weddingConfig = null;
try {
  const letterRows = await queryDb(DBS.letter);
  let target = letterRows.find((r) => propCheckbox(r.properties || {}, ['是否启用'])) || letterRows[0];
  if (target) {
    const p = target.properties || {};
    const groomName = propText(p, ['新郎姓名']);
    const brideName = propText(p, ['新娘姓名']);
    const weddingDate = propText(p, ['吉日良辰']);
    const venueName = propText(p, ['席设华堂']);
    const hallName = propText(p, ['宴席厅号']);
    const venueAddr = propText(p, ['详细地址']);
    const fullLetter = propText(p, ['完整信笺内容']);
    let paragraphs = fullLetter ? fullLetter.split('\n').map((s) => s.trim()).filter(Boolean) : [];
    if (!paragraphs.length) {
      paragraphs = [propText(p, ['信笺文案段落一']), propText(p, ['信笺文案段落二']), propText(p, ['信笺文案段落三'])].filter(Boolean);
    }
    weddingConfig = {};
    if (groomName) weddingConfig.groom = { name: groomName };
    if (brideName) weddingConfig.bride = { name: brideName };
    if (weddingDate) weddingConfig.date = weddingDate;
    if (venueName || hallName || venueAddr) {
      weddingConfig.venue = {};
      if (venueName) weddingConfig.venue.name = venueName;
      if (hallName) weddingConfig.venue.hall = hallName;
      if (venueAddr) weddingConfig.venue.address = venueAddr;
    }
    if (paragraphs.length) weddingConfig.letterParagraphs = paragraphs;
    console.log('· 婚礼配置：已提取（' + Object.keys(weddingConfig).join(', ') + '）');
  } else {
    console.log('· 婚礼配置：Notion 表为空，跳过');
  }
} catch (e) {
  console.warn('· 婚礼配置拉取失败（跳过）:', e.message);
}

// ---------------- 生成 seed.sql ----------------

const lines = [];
lines.push('-- scripts/seed.sql — 由 scripts/export-notion.mjs 生成（' + new Date().toISOString() + '）');
lines.push('-- 旧 Notion 数据一次性迁移；含个人隐私数据，已 gitignore，请勿提交');
lines.push('');
lines.push('BEGIN TRANSACTION;');
lines.push('');

if (weddingConfig && Object.keys(weddingConfig).length) {
  lines.push("-- 婚礼配置");
  lines.push(
    "INSERT INTO config (key, value, updated_at) VALUES ('wedding', " +
      sqlStr(JSON.stringify(weddingConfig)) + ', ' + sqlStr(new Date().toISOString()) + ') ' +
      'ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;'
  );
  lines.push('');
}

if (userRows.length) {
  lines.push('-- 微信用户');
  for (const u of userRows) {
    lines.push(
      'INSERT OR IGNORE INTO users (openid, name, phone, blessing, first_seen, last_seen, login_count) VALUES (' +
        [sqlStr(u.openid), sqlStr(u.name), sqlStr(u.phone), sqlStr(u.blessing), sqlStr(u.firstSeen), sqlStr(u.lastSeen), u.loginCount].join(', ') +
        ');'
    );
  }
  lines.push('');
}

if (rsvpRows.length) {
  lines.push('-- 宾客回执（有 openid 视为已提交 form；无 openid 作为新人预填 prefill）');
  for (const r of rsvpRows) {
    lines.push(
      'INSERT OR IGNORE INTO rsvps (openid, source, name, phone, attending, guest_count, dietary, need_shuttle, blessing, submitted_at, updated_at) VALUES (' +
        [
          sqlStr(r.openid), sqlStr(r.source), sqlStr(r.name), sqlStr(r.phone), sqlStr(r.attending),
          r.guestCount, sqlStr(r.dietary), r.needShuttle, sqlStr(r.blessing), sqlStr(r.submittedAt), sqlStr(r.submittedAt)
        ].join(', ') +
        ');'
    );
  }
  lines.push('');
}

if (blessingRows.length) {
  lines.push('-- 祝福留言');
  for (const b of blessingRows) {
    lines.push(
      'INSERT INTO blessings (openid, author, content, avatar_url, likes, created_at) VALUES (' +
        ['NULL', sqlStr(b.author), sqlStr(b.content), 'NULL', b.likes, sqlStr(b.createdAt)].join(', ') +
        ');'
    );
  }
  lines.push('');
}

lines.push('COMMIT;');
lines.push('');

fs.mkdirSync('scripts', { recursive: true });
fs.writeFileSync(path.resolve('scripts/seed.sql'), lines.join('\n'), 'utf8');

console.log('');
console.log('✓ 已生成 scripts/seed.sql');
console.log('  导入本地： npx wrangler d1 execute marry-images --local  --file=scripts/seed.sql');
console.log('  导入线上： npx wrangler d1 execute marry-images --remote --file=scripts/seed.sql');
