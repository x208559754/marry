import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '15mb' }));

// 默认本地数据目录（用于在 Notion 未配置或网络异常时提供持久化本地支持）
const DATA_DIR = path.resolve(__dirname, 'data_store');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 图片文件存储目录
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 静态提供图片资源服务
app.use('/uploads', express.static(UPLOADS_DIR));

const CONFIG_CACHE_FILE = path.join(DATA_DIR, 'wedding_config.json');
const RSVP_CACHE_FILE = path.join(DATA_DIR, 'wedding_rsvp.json');
const BLESSINGS_CACHE_FILE = path.join(DATA_DIR, 'wedding_blessings.json');

// 辅助读写本地缓存文件
function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Notion API 配置与持久化凭据存储
const NOTION_VERSION = '2022-06-28';
const NOTION_API_BASE = 'https://api.notion.com/v1';
const CREDENTIALS_FILE = path.join(DATA_DIR, 'notion_credentials.json');

export interface NotionCredentials {
  apiKey: string;
  rsvpDbId: string;
  blessingsDbId: string;
  configPageId: string;
}

// 智能从用户可能输入的完整 Notion 链接中提取 32 位 Hex ID
export function parseNotionId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  // 匹配标准 UUID 格式 (含连字符)
  const uuidMatch = trimmed.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
  if (uuidMatch) {
    return uuidMatch[1].replace(/-/g, '').toLowerCase();
  }
  // 匹配连续 32 位十六进制字符 (如 URL path 结尾或者查询参数前面的 ID)
  const hex32Match = trimmed.match(/([a-f0-9]{32})/i);
  if (hex32Match) {
    return hex32Match[1].toLowerCase();
  }
  // 移除所有连字符和空格
  return trimmed.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function getStoredCredentials(): NotionCredentials {
  const fileCreds = readJsonFile<Partial<NotionCredentials>>(CREDENTIALS_FILE, {});
  return {
    apiKey: (fileCreds.apiKey || process.env.NOTION_API_KEY || '').trim(),
    rsvpDbId: parseNotionId(fileCreds.rsvpDbId || process.env.NOTION_RSVP_DATABASE_ID || ''),
    blessingsDbId: parseNotionId(fileCreds.blessingsDbId || process.env.NOTION_BLESSINGS_DATABASE_ID || ''),
    configPageId: parseNotionId(fileCreds.configPageId || process.env.NOTION_CONFIG_PAGE_ID || ''),
  };
}

function saveStoredCredentials(creds: Partial<NotionCredentials>): NotionCredentials {
  const current = getStoredCredentials();
  const updated: NotionCredentials = {
    apiKey: creds.apiKey !== undefined ? creds.apiKey.trim() : current.apiKey,
    rsvpDbId: creds.rsvpDbId !== undefined ? parseNotionId(creds.rsvpDbId) : current.rsvpDbId,
    blessingsDbId: creds.blessingsDbId !== undefined ? parseNotionId(creds.blessingsDbId) : current.blessingsDbId,
    configPageId: creds.configPageId !== undefined ? parseNotionId(creds.configPageId) : current.configPageId,
  };
  writeJsonFile(CREDENTIALS_FILE, updated);
  // 同步更新进程内存环境
  if (updated.apiKey) process.env.NOTION_API_KEY = updated.apiKey;
  if (updated.rsvpDbId) process.env.NOTION_RSVP_DATABASE_ID = updated.rsvpDbId;
  if (updated.blessingsDbId) process.env.NOTION_BLESSINGS_DATABASE_ID = updated.blessingsDbId;
  if (updated.configPageId) process.env.NOTION_CONFIG_PAGE_ID = updated.configPageId;
  return updated;
}

function getNotionAuthHeader(customToken?: string) {
  const creds = getStoredCredentials();
  const token = customToken || creds.apiKey || '';
  return {
    'Authorization': `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

// 缓存数据库 Schema，以便动态适应中英文列名
const dbSchemaCache: Record<string, { fetchedAt: number; properties: Record<string, any> }> = {};

async function getDatabaseProperties(databaseId: string, customToken?: string) {
  const cleanId = parseNotionId(databaseId);
  const now = Date.now();
  if (dbSchemaCache[cleanId] && now - dbSchemaCache[cleanId].fetchedAt < 2 * 60 * 1000) {
    return dbSchemaCache[cleanId].properties;
  }

  const res = await fetch(`${NOTION_API_BASE}/databases/${cleanId}`, {
    method: 'GET',
    headers: getNotionAuthHeader(customToken),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`获取 Notion 数据库元数据失败 (${res.status}): ${errorText}`);
  }

  const json = await res.json();
  const properties = json.properties || {};
  dbSchemaCache[cleanId] = { fetchedAt: now, properties };
  return properties;
}

// 自动为宾客出席回执 (RSVP) 数据库补齐标准属性（列）：手机号、出席状态、同行人数、饮食偏好、需要接驳车、祝福寄语
async function ensureRsvpDatabaseSchema(databaseId: string, customToken?: string): Promise<{ properties: Record<string, any>; addedColumns: string[] }> {
  const cleanId = parseNotionId(databaseId);
  const currentProps = await getDatabaseProperties(cleanId, customToken).catch(() => ({}));

  const newPropsToAdd: Record<string, any> = {};
  const addedColumns: string[] = [];

  const hasPhone = Object.keys(currentProps).some((k) => /phone|电话|手机/i.test(k));
  if (!hasPhone) {
    newPropsToAdd['手机号'] = { phone_number: {} };
    addedColumns.push('手机号');
  }

  const hasAttend = Object.keys(currentProps).some((k) => /attend|出席|是否/i.test(k));
  if (!hasAttend) {
    newPropsToAdd['出席状态'] = {
      select: {
        options: [
          { name: '出席盛典', color: 'green' },
          { name: '遗憾缺席', color: 'red' },
        ],
      },
    };
    addedColumns.push('出席状态');
  }

  const hasCount = Object.keys(currentProps).some((k) => /count|人数|同行/i.test(k));
  if (!hasCount) {
    newPropsToAdd['同行人数'] = { number: { format: 'number' } };
    addedColumns.push('同行人数');
  }

  const hasDiet = Object.keys(currentProps).some((k) => /diet|饮食|忌口/i.test(k));
  if (!hasDiet) {
    newPropsToAdd['饮食偏好'] = {
      select: {
        options: [
          { name: '标准宴席', color: 'blue' },
          { name: '素食养生', color: 'green' },
          { name: '清真风味', color: 'orange' },
          { name: '儿童餐配', color: 'pink' },
        ],
      },
    };
    addedColumns.push('饮食偏好');
  }

  const hasShuttle = Object.keys(currentProps).some((k) => /shuttle|接驳|车/i.test(k));
  if (!hasShuttle) {
    newPropsToAdd['需要接驳车'] = { checkbox: {} };
    addedColumns.push('需要接驳车');
  }

  const hasBless = Object.keys(currentProps).some((k) => /bless|寄语|祝福/i.test(k));
  if (!hasBless) {
    newPropsToAdd['祝福寄语'] = { rich_text: {} };
    addedColumns.push('祝福寄语');
  }

  const hasOpenid = Object.keys(currentProps).some((k) => /openid|微信id|微信标识/i.test(k));
  if (!hasOpenid) {
    newPropsToAdd['OpenID'] = { rich_text: {} };
    addedColumns.push('OpenID');
  }

  if (Object.keys(newPropsToAdd).length > 0) {
    try {
      const patchRes = await fetch(`${NOTION_API_BASE}/databases/${cleanId}`, {
        method: 'PATCH',
        headers: getNotionAuthHeader(customToken),
        body: JSON.stringify({
          properties: newPropsToAdd,
        }),
      });

      if (patchRes.ok) {
        delete dbSchemaCache[cleanId];
        const updatedProps = await getDatabaseProperties(cleanId, customToken);
        return { properties: updatedProps, addedColumns };
      } else {
        const errText = await patchRes.text();
        console.warn('自动添加 RSVP 列字段响应:', errText);
      }
    } catch (err) {
      console.error('PATCH Notion Database 异常:', err);
    }
  }

  return { properties: currentProps, addedColumns: [] };
}

// 自动为祝福弹幕数据库补齐标准属性：祝福内容、点赞数
async function ensureBlessingsDatabaseSchema(databaseId: string, customToken?: string): Promise<{ properties: Record<string, any>; addedColumns: string[] }> {
  const cleanId = parseNotionId(databaseId);
  const currentProps = await getDatabaseProperties(cleanId, customToken).catch(() => ({}));

  const newPropsToAdd: Record<string, any> = {};
  const addedColumns: string[] = [];

  const hasContent = Object.keys(currentProps).some((k) => /content|bless|内容|寄语|祝福/i.test(k) && currentProps[k].type !== 'title');
  if (!hasContent) {
    newPropsToAdd['祝福内容'] = { rich_text: {} };
    addedColumns.push('祝福内容');
  }

  const hasLike = Object.keys(currentProps).some((k) => /like|赞/i.test(k));
  if (!hasLike) {
    newPropsToAdd['点赞数'] = { number: { format: 'number' } };
    addedColumns.push('点赞数');
  }

  if (Object.keys(newPropsToAdd).length > 0) {
    try {
      const patchRes = await fetch(`${NOTION_API_BASE}/databases/${cleanId}`, {
        method: 'PATCH',
        headers: getNotionAuthHeader(customToken),
        body: JSON.stringify({
          properties: newPropsToAdd,
        }),
      });

      if (patchRes.ok) {
        delete dbSchemaCache[cleanId];
        const updatedProps = await getDatabaseProperties(cleanId, customToken);
        return { properties: updatedProps, addedColumns };
      }
    } catch (err) {
      console.error('PATCH Notion Blessings Database 异常:', err);
    }
  }

  return { properties: currentProps, addedColumns: [] };
}

// 构建 RSVP 页面属性（适配用户库中现有的字段名）
function buildRsvpPageProperties(rsvp: any, dbProps: Record<string, any>) {
  const pageProperties: Record<string, any> = {};

  // 1. 姓名 (Title)
  const titleCol = Object.keys(dbProps).find((k) => dbProps[k].type === 'title') || 'Name';
  pageProperties[titleCol] = {
    title: [{ text: { content: String(rsvp.name || '未署名宾客').slice(0, 500) } }],
  };

  // 2. 电话
  const phoneCol = Object.keys(dbProps).find((k) => /phone|电话|手机/i.test(k)) || '手机号';
  if (phoneCol && rsvp.phone) {
    if (dbProps[phoneCol]?.type === 'phone_number') {
      pageProperties[phoneCol] = { phone_number: String(rsvp.phone).slice(0, 50) };
    } else {
      pageProperties[phoneCol] = { rich_text: [{ text: { content: String(rsvp.phone).slice(0, 100) } }] };
    }
  }

  // 3. 出席状态
  const attendCol = Object.keys(dbProps).find((k) => /attend|出席|是否/i.test(k)) || '出席状态';
  if (attendCol) {
    const attendLabel = rsvp.attending === 'no' ? '遗憾缺席' : '出席盛典';
    pageProperties[attendCol] = {
      select: { name: attendLabel },
    };
  }

  // 4. 同行人数
  const countCol = Object.keys(dbProps).find((k) => /count|人数|同行/i.test(k)) || '同行人数';
  if (countCol) {
    pageProperties[countCol] = {
      number: Number(rsvp.guestCount) || 1,
    };
  }

  // 5. 饮食偏好
  const dietCol = Object.keys(dbProps).find((k) => /diet|饮食|忌口/i.test(k)) || '饮食偏好';
  if (dietCol) {
    const dietMap: Record<string, string> = {
      standard: '标准宴席',
      vegetarian: '素食养生',
      halal: '清真风味',
      child: '儿童餐配',
    };
    pageProperties[dietCol] = {
      select: { name: dietMap[rsvp.dietary] || '标准宴席' },
    };
  }

  // 6. 接驳车
  const shuttleCol = Object.keys(dbProps).find((k) => /shuttle|接驳|车/i.test(k)) || '需要接驳车';
  if (shuttleCol) {
    pageProperties[shuttleCol] = {
      checkbox: Boolean(rsvp.needsShuttle),
    };
  }

  // 7. 祝福寄语
  const blessCol = Object.keys(dbProps).find((k) => /bless|寄语|祝福/i.test(k)) || '祝福寄语';
  if (blessCol && rsvp.blessing) {
    pageProperties[blessCol] = {
      rich_text: [{ text: { content: String(rsvp.blessing).slice(0, 1950) } }],
    };
  }

  // 8. 微信 OpenID
  const openidCol = Object.keys(dbProps).find((k) => /openid|微信id|微信标识/i.test(k)) || 'OpenID';
  if (openidCol && rsvp.openid) {
    pageProperties[openidCol] = {
      rich_text: [{ text: { content: String(rsvp.openid).slice(0, 200) } }],
    };
  }

  return pageProperties;
}

// 构建 Blessings 页面属性
function buildBlessingPageProperties(blessing: any, dbProps: Record<string, any>) {
  const pageProperties: Record<string, any> = {};

  const titleCol = Object.keys(dbProps).find((k) => dbProps[k].type === 'title') || 'Author';
  pageProperties[titleCol] = {
    title: [{ text: { content: String(blessing.author || '热心好友').slice(0, 500) } }],
  };

  const contentCol = Object.keys(dbProps).find((k) => /content|bless|内容|寄语|祝福/i.test(k) && dbProps[k].type !== 'title') || '祝福内容';
  if (contentCol) {
    pageProperties[contentCol] = {
      rich_text: [{ text: { content: String(blessing.content || '新婚大喜，永结同心！').slice(0, 1950) } }],
    };
  }

  const likeCol = Object.keys(dbProps).find((k) => /like|赞/i.test(k)) || '点赞数';
  if (likeCol) {
    pageProperties[likeCol] = {
      number: Number(blessing.likes) || 1,
    };
  }

  return pageProperties;
}

// 解析 Notion RSVP 行数据为标准 GuestRSVP 对象
function parseNotionRsvpRow(row: any) {
  const props = row.properties || {};

  // 1. 提取姓名
  let name = '';
  for (const key of Object.keys(props)) {
    if (props[key].type === 'title') {
      name = props[key].title?.[0]?.plain_text || '';
      break;
    }
  }

  // 2. 提取电话
  let phone = '';
  for (const key of Object.keys(props)) {
    if (/phone|电话|手机/i.test(key)) {
      if (props[key].type === 'phone_number') {
        phone = props[key].phone_number || '';
      } else if (props[key].type === 'rich_text') {
        phone = props[key].rich_text?.[0]?.plain_text || '';
      }
      break;
    }
  }

  // 3. 提取 OpenID
  let openid = '';
  for (const key of Object.keys(props)) {
    if (/openid|微信id|微信标识/i.test(key)) {
      if (props[key].type === 'rich_text') {
        openid = props[key].rich_text?.[0]?.plain_text || '';
      } else if (props[key].type === 'title') {
        openid = props[key].title?.[0]?.plain_text || '';
      }
      break;
    }
  }

  // 4. 提取出席状态
  let attending: 'yes' | 'no' = 'yes';
  for (const key of Object.keys(props)) {
    if (/attend|出席|是否/i.test(key)) {
      const val = props[key].select?.name || '';
      if (/no|不|遗憾/i.test(val)) attending = 'no';
      break;
    }
  }

  // 5. 提取人数
  let guestCount = 1;
  for (const key of Object.keys(props)) {
    if (/count|人数|位/i.test(key) && props[key].type === 'number') {
      guestCount = props[key].number || 1;
      break;
    }
  }

  // 6. 提取饮食偏好
  let dietary: any = 'standard';
  for (const key of Object.keys(props)) {
    if (/diet|饮食|忌口/i.test(key)) {
      const val = props[key].select?.name || '';
      if (/素/i.test(val)) dietary = 'vegetarian';
      else if (/清真/i.test(val)) dietary = 'halal';
      else if (/儿童/i.test(val)) dietary = 'child';
      break;
    }
  }

  // 7. 提取接驳车
  let needsShuttle = false;
  for (const key of Object.keys(props)) {
    if (/shuttle|接驳|车/i.test(key) && props[key].type === 'checkbox') {
      needsShuttle = Boolean(props[key].checkbox);
      break;
    }
  }

  // 8. 提取祝福寄语
  let blessing = '';
  for (const key of Object.keys(props)) {
    if (/bless|寄语|祝福/i.test(key) && props[key].type === 'rich_text') {
      blessing = props[key].rich_text?.[0]?.plain_text || '';
      break;
    }
  }

  return {
    id: row.id,
    name: name || '未署名宾客',
    phone,
    openid,
    attending,
    guestCount,
    dietary,
    needsShuttle,
    blessing,
    submittedAt: row.created_time || new Date().toISOString(),
  };
}

// 将本地所有 RSVP 回执全量同步/回填至 Notion 数据库（支持更新已存在的伴郎小明等页面）
async function syncLocalRsvpsToNotion(cleanId: string, token: string, dbProps: Record<string, any>) {
  const localList = readJsonFile<any[]>(RSVP_CACHE_FILE, []);
  if (localList.length === 0) return { syncedCount: 0, updatedCount: 0, createdCount: 0 };

  const queryRes = await fetch(`${NOTION_API_BASE}/databases/${cleanId}/query`, {
    method: 'POST',
    headers: getNotionAuthHeader(token),
    body: JSON.stringify({ page_size: 100 }),
  });

  const existingPages: Array<{ id: string; name: string; openid: string; phone: string }> = [];
  if (queryRes.ok) {
    const queryData = await queryRes.json();
    for (const row of queryData.results || []) {
      const parsed = parseNotionRsvpRow(row);
      existingPages.push({
        id: row.id,
        name: parsed.name.trim(),
        openid: parsed.openid.trim(),
        phone: parsed.phone.trim(),
      });
    }
  }

  let updatedCount = 0;
  let createdCount = 0;

  for (const rsvp of localList) {
    const pageProps = buildRsvpPageProperties(rsvp, dbProps);
    const existing = existingPages.find((p) => {
      if (rsvp.openid && p.openid && p.openid.toLowerCase() === String(rsvp.openid).trim().toLowerCase()) return true;
      if (rsvp.phone && p.phone && p.phone === String(rsvp.phone).trim()) return true;
      if (rsvp.name && p.name && p.name.toLowerCase() === String(rsvp.name).trim().toLowerCase()) return true;
      return false;
    });

    if (existing) {
      const updateRes = await fetch(`${NOTION_API_BASE}/pages/${existing.id}`, {
        method: 'PATCH',
        headers: getNotionAuthHeader(token),
        body: JSON.stringify({ properties: pageProps }),
      });
      if (updateRes.ok) updatedCount++;
    } else {
      const createRes = await fetch(`${NOTION_API_BASE}/pages`, {
        method: 'POST',
        headers: getNotionAuthHeader(token),
        body: JSON.stringify({
          parent: { database_id: cleanId },
          properties: pageProps,
        }),
      });
      if (createRes.ok) createdCount++;
    }
  }

  return { syncedCount: createdCount + updatedCount, updatedCount, createdCount };
}

// 将本地弹幕留言同步至 Notion
async function syncLocalBlessingsToNotion(cleanId: string, token: string, dbProps: Record<string, any>) {
  const localList = readJsonFile<any[]>(BLESSINGS_CACHE_FILE, []);
  if (localList.length === 0) return { syncedCount: 0 };

  const queryRes = await fetch(`${NOTION_API_BASE}/databases/${cleanId}/query`, {
    method: 'POST',
    headers: getNotionAuthHeader(token),
    body: JSON.stringify({ page_size: 100 }),
  });

  const existingPages: Array<{ id: string; author: string }> = [];
  if (queryRes.ok) {
    const queryData = await queryRes.json();
    for (const row of queryData.results || []) {
      const props = row.properties || {};
      let author = '';
      for (const k of Object.keys(props)) {
        if (props[k].type === 'title') {
          author = props[k].title?.[0]?.plain_text || '';
          break;
        }
      }
      if (author) {
        existingPages.push({ id: row.id, author: author.trim() });
      }
    }
  }

  let count = 0;
  for (const b of localList) {
    const pageProps = buildBlessingPageProperties(b, dbProps);
    const existing = existingPages.find((p) => p.author.toLowerCase() === String(b.author).trim().toLowerCase());

    if (existing) {
      await fetch(`${NOTION_API_BASE}/pages/${existing.id}`, {
        method: 'PATCH',
        headers: getNotionAuthHeader(token),
        body: JSON.stringify({ properties: pageProps }),
      });
      count++;
    } else {
      const res = await fetch(`${NOTION_API_BASE}/pages`, {
        method: 'POST',
        headers: getNotionAuthHeader(token),
        body: JSON.stringify({
          parent: { database_id: cleanId },
          properties: pageProps,
        }),
      });
      if (res.ok) count++;
    }
  }

  return { syncedCount: count };
}

// 根据微信 OpenID 在 Notion RSVP 数据库（或本地回执缓存）中比对查询宾客档案
async function findGuestByOpenidInNotion(openid: string): Promise<any | null> {
  if (!openid) return null;
  const cleanOpenid = openid.trim();
  const creds = getStoredCredentials();
  const token = creds.apiKey;
  const rsvpDbId = creds.rsvpDbId;

  // 1. 如果配置了 Notion，优先向 Notion 查询比对
  if (token && rsvpDbId) {
    try {
      const cleanId = parseNotionId(rsvpDbId);
      const dbProps = await getDatabaseProperties(cleanId, token).catch(() => ({}));
      const openidCol = Object.keys(dbProps).find((k) => /openid|微信id|微信标识/i.test(k));

      let queryBody: any = { page_size: 100 };
      if (openidCol) {
        queryBody = {
          filter: {
            property: openidCol,
            rich_text: {
              equals: cleanOpenid,
            },
          },
        };
      }

      const queryRes = await fetch(`${NOTION_API_BASE}/databases/${cleanId}/query`, {
        method: 'POST',
        headers: getNotionAuthHeader(token),
        body: JSON.stringify(queryBody),
      });

      if (queryRes.ok) {
        const qData = await queryRes.json();
        const results = qData.results || [];
        for (const row of results) {
          const parsed = parseNotionRsvpRow(row);
          if (parsed.openid && parsed.openid.trim() === cleanOpenid) {
            return parsed;
          }
        }
      }
    } catch (err) {
      console.warn('通过 OpenID 查询 Notion 异常:', err);
    }
  }

  // 2. 本地缓存兜底比对
  const localList = readJsonFile<any[]>(RSVP_CACHE_FILE, []);
  const foundLocal = localList.find((g) => g.openid && g.openid.trim() === cleanOpenid);
  return foundLocal || null;
}

// 在 Notion 宾客名单中根据姓名或手机号比对匹配，并将微信 OpenID 回填存储绑定
async function bindGuestOpenidInNotion(params: {
  openid: string;
  name?: string;
  phone?: string;
}): Promise<{ matched: boolean; guest: any | null; message: string }> {
  const { openid, name, phone } = params;
  if (!openid) {
    return { matched: false, guest: null, message: '缺少 openid' };
  }
  const cleanOpenid = openid.trim();
  const cleanName = (name || '').trim();
  const cleanPhone = (phone || '').trim();

  // 若该 OpenID 已存在匹配档案，直接返回
  const existingByOpenid = await findGuestByOpenidInNotion(cleanOpenid);
  if (existingByOpenid) {
    return { matched: true, guest: existingByOpenid, message: '已成功匹配已存 OpenID 宾客档案' };
  }

  const creds = getStoredCredentials();
  const token = creds.apiKey;
  const rsvpDbId = creds.rsvpDbId;

  // 若提供了姓名或手机号，尝试在 Notion 匹配并写回 OpenID
  if (token && rsvpDbId && (cleanName || cleanPhone)) {
    try {
      const cleanId = parseNotionId(rsvpDbId);
      const schemaInfo = await ensureRsvpDatabaseSchema(cleanId, token);
      const dbProps = schemaInfo.properties;
      const openidCol = Object.keys(dbProps).find((k) => /openid|微信id|微信标识/i.test(k)) || 'OpenID';

      const queryRes = await fetch(`${NOTION_API_BASE}/databases/${cleanId}/query`, {
        method: 'POST',
        headers: getNotionAuthHeader(token),
        body: JSON.stringify({ page_size: 100 }),
      });

      if (queryRes.ok) {
        const qData = await queryRes.json();
        const rows = qData.results || [];
        let matchedRow: any = null;

        for (const row of rows) {
          const parsed = parseNotionRsvpRow(row);
          const nameMatch = cleanName && parsed.name && parsed.name.toLowerCase() === cleanName.toLowerCase();
          const phoneMatch = cleanPhone && parsed.phone && parsed.phone === cleanPhone;
          if (phoneMatch || nameMatch) {
            matchedRow = row;
            break;
          }
        }

        if (matchedRow) {
          // 将 OpenID PATCH 回填写入该宾客行
          const patchRes = await fetch(`${NOTION_API_BASE}/pages/${matchedRow.id}`, {
            method: 'PATCH',
            headers: getNotionAuthHeader(token),
            body: JSON.stringify({
              properties: {
                [openidCol]: {
                  rich_text: [{ text: { content: cleanOpenid } }],
                },
              },
            }),
          });

          if (patchRes.ok) {
            const updatedRow = await patchRes.json();
            const updatedGuest = parseNotionRsvpRow(updatedRow);
            // 同步更新本地缓存
            const localList = readJsonFile<any[]>(RSVP_CACHE_FILE, []);
            const updatedLocal = [updatedGuest, ...localList.filter((r) => r.id !== updatedGuest.id)];
            writeJsonFile(RSVP_CACHE_FILE, updatedLocal);
            return { matched: true, guest: updatedGuest, message: '已成功与 Notion 宾客名单匹配并绑定微信 OpenID' };
          }
        }
      }
    } catch (err) {
      console.warn('在 Notion 中根据姓名/手机比对并绑定 OpenID 异常:', err);
    }
  }

  // 本地比对绑定兜底
  const localList = readJsonFile<any[]>(RSVP_CACHE_FILE, []);
  const foundIndex = localList.findIndex(
    (g) => (cleanPhone && g.phone === cleanPhone) || (cleanName && g.name && g.name.toLowerCase() === cleanName.toLowerCase())
  );
  if (foundIndex >= 0) {
    localList[foundIndex].openid = cleanOpenid;
    writeJsonFile(RSVP_CACHE_FILE, localList);
    return { matched: true, guest: localList[foundIndex], message: '本地名单匹配成功并已绑定 OpenID' };
  }

  return { matched: false, guest: null, message: '未在名单中找到匹配信息，可直接提交新回执登记' };
}

// ==========================================
// 1. Notion 凭证查询、配置与连通性自检接口
// ==========================================

// 获取当前存储的凭证配置（包含明文与脱敏版，便于用户查看与编辑）
app.get('/api/notion/credentials', (req, res) => {
  const creds = getStoredCredentials();
  res.json({
    apiKey: creds.apiKey,
    rsvpDbId: creds.rsvpDbId,
    blessingsDbId: creds.blessingsDbId,
    configPageId: creds.configPageId,
  });
});

// 保存用户在前端后台填写的凭据与数据库 ID，并执行自动校验
app.post('/api/notion/credentials', async (req, res) => {
  const { apiKey, rsvpDbId, blessingsDbId, configPageId } = req.body || {};
  const updated = saveStoredCredentials({ apiKey, rsvpDbId, blessingsDbId, configPageId });

  // 连通性测试
  const token = updated.apiKey;
  if (!token) {
    return res.json({
      success: true,
      message: 'Notion 凭据配置已清空/保存为本地模式',
      credentials: updated,
    });
  }

  try {
    const userRes = await fetch(`${NOTION_API_BASE}/users/me`, {
      headers: getNotionAuthHeader(token),
    });
    if (!userRes.ok) {
      const err = await userRes.json().catch(() => ({}));
      return res.json({
        success: false,
        message: `API 密钥无效: ${(err as any).message || '请确认 Internal Integration Secret 是否正确'}`,
        credentials: updated,
      });
    }

    const userData = await userRes.json();
    const details: Record<string, string> = {
      bot: userData.name || 'Notion Bot',
    };

    if (updated.rsvpDbId) {
      const rsvpRes = await fetch(`${NOTION_API_BASE}/databases/${updated.rsvpDbId}`, {
        headers: getNotionAuthHeader(token),
      });
      if (rsvpRes.ok) {
        const rsvpJson = await rsvpRes.json();
        const title = rsvpJson.title?.[0]?.plain_text || 'RSVP Database';
        details.rsvpDatabase = `绑定成功: 「${title}」`;
      } else {
        details.rsvpDatabase = `无法访问 (${rsvpRes.status}): 请在 Notion 页面右上角 Share 菜单中添加此集成`;
      }
    }

    if (updated.blessingsDbId) {
      const blessRes = await fetch(`${NOTION_API_BASE}/databases/${updated.blessingsDbId}`, {
        headers: getNotionAuthHeader(token),
      });
      if (blessRes.ok) {
        const blessJson = await blessRes.json();
        const title = blessJson.title?.[0]?.plain_text || 'Blessings Database';
        details.blessingsDatabase = `绑定成功: 「${title}」`;
      } else {
        details.blessingsDatabase = `无法访问 (${blessRes.status}): 请在 Notion 页面右上角 Share 菜单中添加此集成`;
      }
    }

    if (updated.configPageId) {
      const pageRes = await fetch(`${NOTION_API_BASE}/pages/${updated.configPageId}`, {
        headers: getNotionAuthHeader(token),
      });
      if (pageRes.ok) {
        details.configPage = '访问正常 (配置存储页面已连通)';
      } else {
        details.configPage = `无法访问 (${pageRes.status}): 请确认 Page 已共享给该集成`;
      }
    }

    res.json({
      success: true,
      message: `Notion 凭据已成功保存！集成机器人: ${userData.name}`,
      credentials: updated,
      details,
    });
  } catch (err: any) {
    res.json({
      success: true,
      message: `凭据已保存，但验证连通超时: ${err.message}`,
      credentials: updated,
    });
  }
});

// 智能探测用户授权给机器人的所有 Notion 页面与数据库，并自动推导匹配
app.post('/api/notion/auto-discover', async (req, res) => {
  const { apiKey } = req.body || {};
  const creds = getStoredCredentials();
  const token = (apiKey || creds.apiKey || '').trim();

  if (!token) {
    return res.status(400).json({ success: false, message: '请提供 Notion API Token' });
  }

  try {
    const searchRes = await fetch(`${NOTION_API_BASE}/search`, {
      method: 'POST',
      headers: getNotionAuthHeader(token),
      body: JSON.stringify({}),
    });

    if (!searchRes.ok) {
      const errJson = await searchRes.json().catch(() => ({}));
      return res.status(searchRes.status).json({
        success: false,
        message: (errJson as any).message || '搜索工作区内容失败',
      });
    }

    const data = await searchRes.json();
    const results = data.results || [];

    const databases: { id: string; title: string }[] = [];
    const pages: { id: string; title: string }[] = [];

    for (const item of results) {
      const cleanId = item.id.replace(/-/g, '');
      let title = '';
      if (item.title && Array.isArray(item.title)) {
        title = item.title[0]?.plain_text || '';
      } else if (item.properties) {
        for (const k of Object.keys(item.properties)) {
          if (item.properties[k]?.type === 'title') {
            title = item.properties[k]?.title?.[0]?.plain_text || '';
            break;
          }
        }
      }

      if (item.object === 'database') {
        databases.push({ id: cleanId, title: title || '未命名数据库' });
      } else if (item.object === 'page') {
        pages.push({ id: cleanId, title: title || '未命名页面' });
      }
    }

    // 智能推断匹配
    // RSVP 回执数据库：优先匹配「回执」、「报名」、「RSVP」、「赴宴」
    let detectedRsvp = databases.find((d) => /回执|报名|rsvp|赴宴|名单/i.test(d.title)) || databases[0];
    // 祝福留言数据库：优先匹配「祝福」、「留言」、「弹幕」、「心语」
    let detectedBlessings = databases.find((d) => /祝福|留言|弹幕|心语|寄语/i.test(d.title)) || (databases.length > 1 ? databases[1] : databases[0]);
    // 全站配置页面：优先匹配「邀请」、「请柬」、「婚礼」
    let detectedConfig = pages.find((p) => /邀请|请柬|婚礼/i.test(p.title)) || pages[0];

    // 如果找到了 2 个以上数据库但匹配重叠，区分开
    if (databases.length >= 2 && detectedRsvp && detectedBlessings && detectedRsvp.id === detectedBlessings.id) {
      const other = databases.find((d) => d.id !== detectedRsvp?.id);
      if (other) detectedBlessings = other;
    }

    res.json({
      success: true,
      databases,
      pages,
      suggested: {
        rsvpDbId: detectedRsvp?.id || '',
        rsvpDbTitle: detectedRsvp?.title || '',
        blessingsDbId: detectedBlessings?.id || '',
        blessingsDbTitle: detectedBlessings?.title || '',
        configPageId: detectedConfig?.id || '',
        configPageTitle: detectedConfig?.title || '',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: `扫描异常: ${err.message}` });
  }
});

app.get('/api/notion/status', async (req, res) => {
  const creds = getStoredCredentials();
  const apiKey = creds.apiKey;
  const configPageId = creds.configPageId;
  const rsvpDatabaseId = creds.rsvpDbId;
  const blessingsDatabaseId = creds.blessingsDbId;

  const hasApiKey = Boolean(apiKey && apiKey.trim().length > 10);
  let botName = '';
  let botWorkspace = '';
  let connectionValid = false;
  let connectionError = '';

  let rsvpDatabaseValid = false;
  let rsvpDatabaseTitle = '';
  let blessingsDatabaseValid = false;
  let blessingsDatabaseTitle = '';
  let configPageValid = false;
  let rsvpMissingColumns: string[] = [];
  let blessingsMissingColumns: string[] = [];

  if (hasApiKey) {
    try {
      const testRes = await fetch(`${NOTION_API_BASE}/users/me`, {
        headers: getNotionAuthHeader(apiKey),
      });
      if (testRes.ok) {
        const botData = await testRes.json();
        connectionValid = true;
        botName = botData.name || 'Notion Integration Bot';
        botWorkspace = botData.workspace_name || '';

        // 进一步探测 3 个目标的真实访问有效性与表结构
        if (rsvpDatabaseId) {
          const rsvpRes = await fetch(`${NOTION_API_BASE}/databases/${rsvpDatabaseId}`, {
            headers: getNotionAuthHeader(apiKey),
          });
          if (rsvpRes.ok) {
            const rsvpJson = await rsvpRes.json();
            rsvpDatabaseValid = true;
            rsvpDatabaseTitle = rsvpJson.title?.[0]?.plain_text || 'RSVP 回执名单库';
            const props = rsvpJson.properties || {};
            const missing: string[] = [];
            if (!Object.keys(props).some((k) => /phone|电话|手机/i.test(k))) missing.push('手机号');
            if (!Object.keys(props).some((k) => /attend|出席|是否/i.test(k))) missing.push('出席状态');
            if (!Object.keys(props).some((k) => /count|人数|同行/i.test(k))) missing.push('同行人数');
            if (!Object.keys(props).some((k) => /diet|饮食|忌口/i.test(k))) missing.push('饮食偏好');
            if (!Object.keys(props).some((k) => /shuttle|接驳|车/i.test(k))) missing.push('需要接驳车');
            if (!Object.keys(props).some((k) => /bless|寄语|祝福/i.test(k))) missing.push('祝福寄语');
            rsvpMissingColumns = missing;
          }
        }

        if (blessingsDatabaseId) {
          const blessRes = await fetch(`${NOTION_API_BASE}/databases/${blessingsDatabaseId}`, {
            headers: getNotionAuthHeader(apiKey),
          });
          if (blessRes.ok) {
            const blessJson = await blessRes.json();
            blessingsDatabaseValid = true;
            blessingsDatabaseTitle = blessJson.title?.[0]?.plain_text || '祝福弹幕留言库';
            const props = blessJson.properties || {};
            const missing: string[] = [];
            if (!Object.keys(props).some((k) => /content|bless|内容|寄语|祝福/i.test(k) && props[k].type !== 'title')) missing.push('祝福内容');
            if (!Object.keys(props).some((k) => /like|赞/i.test(k))) missing.push('点赞数');
            blessingsMissingColumns = missing;
          }
        }

        if (configPageId) {
          const pageRes = await fetch(`${NOTION_API_BASE}/pages/${configPageId}`, {
            headers: getNotionAuthHeader(apiKey),
          });
          if (pageRes.ok) {
            configPageValid = true;
          }
        }
      } else {
        const errJson = await testRes.json().catch(() => ({}));
        connectionError = (errJson as any).message || `Notion API 验证未通过 (${testRes.status})`;
      }
    } catch (err: any) {
      connectionError = err.message || '网络连接超时';
    }
  }

  res.json({
    configured: hasApiKey,
    connectionValid,
    botName,
    botWorkspace,
    connectionError,
    databaseIds: {
      hasConfigPage: Boolean(configPageId),
      configPageId,
      configPageValid,
      hasRsvpDatabase: Boolean(rsvpDatabaseId),
      rsvpDatabaseId,
      rsvpDatabaseValid,
      rsvpDatabaseTitle,
      rsvpMissingColumns,
      hasBlessingsDatabase: Boolean(blessingsDatabaseId),
      blessingsDatabaseId,
      blessingsDatabaseValid,
      blessingsDatabaseTitle,
      blessingsMissingColumns,
    },
  });
});

app.post('/api/notion/test-connection', async (req, res) => {
  const { apiKey, rsvpDbId, blessingsDbId, configPageId } = req.body || {};
  const creds = getStoredCredentials();
  const token = (apiKey || creds.apiKey || '').trim();
  const targetRsvpId = parseNotionId(rsvpDbId || creds.rsvpDbId);
  const targetBlessingsId = parseNotionId(blessingsDbId || creds.blessingsDbId);
  const targetConfigPageId = parseNotionId(configPageId || creds.configPageId);

  if (!token) {
    return res.status(400).json({ success: false, message: '请提供 Notion API Token (secret_...)' });
  }

  try {
    const userRes = await fetch(`${NOTION_API_BASE}/users/me`, {
      headers: getNotionAuthHeader(token),
    });
    if (!userRes.ok) {
      const errData = await userRes.json().catch(() => ({}));
      return res.status(401).json({
        success: false,
        message: `Token 验证失败: ${(errData as any).message || '请确认 Internal Integration Secret 是否有效'}`,
      });
    }

    const userData = await userRes.json();
    const details: Record<string, string> = {
      bot: userData.name || 'Notion Bot',
    };

    // 如果提供了 RSVP 数据库 ID，测试读取权限
    if (targetRsvpId) {
      const dbRes = await fetch(`${NOTION_API_BASE}/databases/${targetRsvpId}`, {
        headers: getNotionAuthHeader(token),
      });
      if (dbRes.ok) {
        const dbJson = await dbRes.json();
        const title = dbJson.title?.[0]?.plain_text || 'RSVP Database';
        details.rsvpDatabase = `访问正常: 「${title}」`;
      } else {
        details.rsvpDatabase = `无法访问 (${dbRes.status})，请在 Notion 页面右上角『...』->『Connect to』添加该集成`;
      }
    } else {
      details.rsvpDatabase = '未设置（将使用本地回执存储）';
    }

    // 如果提供了 Blessings 数据库 ID，测试读取权限
    if (targetBlessingsId) {
      const dbRes = await fetch(`${NOTION_API_BASE}/databases/${targetBlessingsId}`, {
        headers: getNotionAuthHeader(token),
      });
      if (dbRes.ok) {
        const dbJson = await dbRes.json();
        const title = dbJson.title?.[0]?.plain_text || 'Blessings Database';
        details.blessingsDatabase = `访问正常: 「${title}」`;
      } else {
        details.blessingsDatabase = `无法访问 (${dbRes.status})，请在 Notion 页面右上角『...』->『Connect to』添加该集成`;
      }
    } else {
      details.blessingsDatabase = '未设置（将使用本地祝福存储）';
    }

    if (targetConfigPageId) {
      const pageRes = await fetch(`${NOTION_API_BASE}/pages/${targetConfigPageId}`, {
        headers: getNotionAuthHeader(token),
      });
      if (pageRes.ok) {
        details.configPage = '访问正常 (配置存储页面可读写)';
      } else {
        details.configPage = `无法访问 (${pageRes.status})，请在 Notion 页面右上角『...』添加该集成权限`;
      }
    }

    res.json({
      success: true,
      message: `Notion 连接成功！集成机器人: ${userData.name}`,
      details,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: `网络请求失败: ${err.message}` });
  }
});

// 一键初始化或补齐 Notion 数据库表头属性列（如手机号、出席状态等），并全量回填已有宾客数据
app.post('/api/notion/init-database-schema', async (req, res) => {
  const { type = 'all', targetDbId } = req.body || {};
  const creds = getStoredCredentials();
  const token = creds.apiKey;

  if (!token) {
    return res.status(400).json({ success: false, message: '请先在后台填写并保存 Notion Integration Secret (API 密钥)' });
  }

  const results: Record<string, any> = {};

  // 处理 RSVP 表格
  if (type === 'rsvp' || type === 'all') {
    const rsvpId = parseNotionId(targetDbId || creds.rsvpDbId);
    if (rsvpId) {
      try {
        const schemaRes = await ensureRsvpDatabaseSchema(rsvpId, token);
        const syncRes = await syncLocalRsvpsToNotion(rsvpId, token, schemaRes.properties);
        results.rsvp = {
          success: true,
          addedColumns: schemaRes.addedColumns,
          syncedCount: syncRes.syncedCount,
          updatedCount: syncRes.updatedCount,
          createdCount: syncRes.createdCount,
          message: schemaRes.addedColumns.length > 0
            ? `已成功为 Notion 数据表添加 ${schemaRes.addedColumns.length} 个列字段（${schemaRes.addedColumns.join('、')}），并同步回填了 ${syncRes.syncedCount} 条回执记录！`
            : `Notion 表头列字段完整，已同步回填 ${syncRes.syncedCount} 条宾客回执数据！`,
        };
      } catch (err: any) {
        results.rsvp = { success: false, message: `处理 RSVP 数据库失败: ${err.message}` };
      }
    } else {
      results.rsvp = { success: false, message: '未配置 RSVP 数据库 ID' };
    }
  }

  // 处理 Blessings 表格
  if (type === 'blessings' || type === 'all') {
    const blessingsId = parseNotionId(targetDbId || creds.blessingsDbId);
    if (blessingsId) {
      try {
        const schemaRes = await ensureBlessingsDatabaseSchema(blessingsId, token);
        const syncRes = await syncLocalBlessingsToNotion(blessingsId, token, schemaRes.properties);
        results.blessings = {
          success: true,
          addedColumns: schemaRes.addedColumns,
          syncedCount: syncRes.syncedCount,
          message: schemaRes.addedColumns.length > 0
            ? `已成功为 Notion 弹幕表添加 ${schemaRes.addedColumns.length} 个列字段（${schemaRes.addedColumns.join('、')}），并同步了 ${syncRes.syncedCount} 条留言！`
            : `弹幕表头列字段完整，已同步 ${syncRes.syncedCount} 条留言数据！`,
        };
      } catch (err: any) {
        results.blessings = { success: false, message: `处理弹幕数据库失败: ${err.message}` };
      }
    } else {
      results.blessings = { success: false, message: '未配置弹幕数据库 ID' };
    }
  }

  const anySuccess = results.rsvp?.success || results.blessings?.success;
  res.json({
    success: anySuccess !== undefined ? anySuccess : false,
    results,
    message: results.rsvp?.message || results.blessings?.message || '初始化操作完成',
  });
});

// ==========================================
// 2. 婚礼配置 (Config) 存储与读取接口
// ==========================================

// Notion 文本切片辅助函数：满足 Notion API 单个 rich_text item 内容 <= 2000 字符的硬性要求
function splitTextToRichText(text: string, maxChunkLength = 1950): Array<{ type: 'text'; text: { content: string } }> {
  if (!text) return [];
  const chunks: Array<{ type: 'text'; text: { content: string } }> = [];
  for (let i = 0; i < text.length; i += maxChunkLength) {
    chunks.push({
      type: 'text',
      text: {
        content: text.slice(i, i + maxChunkLength),
      },
    });
  }
  return chunks;
}

// 将长文本安全构建为 Notion code blocks（单块不超过 90 个 rich_text，避免触发单块 100 元素上限）
function createCodeBlocksFromText(text: string, title = '💒 婚礼请柬配置数据') {
  const richTexts = splitTextToRichText(text, 1950);
  const blocks: any[] = [];
  const MAX_CHUNKS_PER_BLOCK = 90;

  if (richTexts.length <= MAX_CHUNKS_PER_BLOCK) {
    blocks.push({
      object: 'block',
      type: 'code',
      code: {
        caption: [{ type: 'text', text: { content: `${title} (系统自动同步)` } }],
        rich_text: richTexts,
        language: 'json',
      },
    });
  } else {
    const totalParts = Math.ceil(richTexts.length / MAX_CHUNKS_PER_BLOCK);
    for (let part = 0; part < totalParts; part++) {
      const partChunks = richTexts.slice(part * MAX_CHUNKS_PER_BLOCK, (part + 1) * MAX_CHUNKS_PER_BLOCK);
      blocks.push({
        object: 'block',
        type: 'code',
        code: {
          caption: [{ type: 'text', text: { content: `${title} (分卷 ${part + 1}/${totalParts})` } }],
          rich_text: partChunks,
          language: 'json',
        },
      });
    }
  }
  return blocks;
}

app.get('/api/notion/config', async (req, res) => {
  const creds = getStoredCredentials();
  const token = creds.apiKey;
  const configPageId = creds.configPageId;

  // 如果没有配置 Notion，返回本地缓存数据
  if (!token || !configPageId) {
    const cachedConfig = readJsonFile(CONFIG_CACHE_FILE, null);
    return res.json({
      source: 'local',
      config: cachedConfig,
      message: 'Notion 凭据或页面 ID 未设定，当前返回本地持久化缓存',
    });
  }

  try {
    const cleanId = parseNotionId(configPageId);
    const blocksRes = await fetch(`${NOTION_API_BASE}/blocks/${cleanId}/children?page_size=50`, {
      headers: getNotionAuthHeader(),
    });

    if (!blocksRes.ok) {
      console.warn(`读取 Notion 配置块失败 (${blocksRes.status})，降级为本地缓存`);
      const cachedConfig = readJsonFile(CONFIG_CACHE_FILE, null);
      return res.json({ source: 'local_fallback', config: cachedConfig });
    }

    const blocksData = await blocksRes.json();
    const blocks = blocksData.results || [];
    const codeBlocks = blocks.filter((b: any) => b.type === 'code' && b.code);

    // 寻找包含完整 JSON 配置的 code block
    let parsedConfig = null;
    for (const b of codeBlocks) {
      const text = b.code.rich_text?.map((t: any) => t.plain_text || t.text?.content || '').join('') || '';
      try {
        const obj = JSON.parse(text);
        if (obj.theme || obj.groom || obj.bride) {
          parsedConfig = obj;
          break;
        }
      } catch {
        // 不是单个完整 JSON，继续搜寻
      }
    }

    // 若单块未匹配且存在多个代码块，尝试拼接所有代码块内容（支持分卷配置）
    if (!parsedConfig && codeBlocks.length > 1) {
      const combinedText = codeBlocks
        .map((b: any) => b.code.rich_text?.map((t: any) => t.plain_text || t.text?.content || '').join('') || '')
        .join('');
      try {
        const obj = JSON.parse(combinedText);
        if (obj.theme || obj.groom || obj.bride) {
          parsedConfig = obj;
        }
      } catch {
        // 拼接依然无法解析
      }
    }

    if (parsedConfig) {
      // 写入本地缓存以备离线
      writeJsonFile(CONFIG_CACHE_FILE, parsedConfig);
      return res.json({ source: 'notion', config: parsedConfig });
    }

    // 未在 Notion 页面找到 JSON 代码块，返回本地缓存
    const cachedConfig = readJsonFile(CONFIG_CACHE_FILE, null);
    res.json({ source: 'local_fallback', config: cachedConfig });
  } catch (err: any) {
    console.error('获取 Notion 配置异常:', err);
    const cachedConfig = readJsonFile(CONFIG_CACHE_FILE, null);
    res.json({ source: 'local_fallback', config: cachedConfig });
  }
});

app.post('/api/notion/config', async (req, res) => {
  const { config } = req.body;
  if (!config) {
    return res.status(400).json({ success: false, message: '请提供 config 对象' });
  }

  // 始终更新本地缓存
  writeJsonFile(CONFIG_CACHE_FILE, config);

  const creds = getStoredCredentials();
  const token = creds.apiKey;
  const configPageId = creds.configPageId;

  if (!token || !configPageId) {
    return res.json({
      success: true,
      source: 'local',
      message: '已保存到本地存储。如需同步至 Notion，请在后台配置 NOTION_API_KEY 与 NOTION_CONFIG_PAGE_ID',
    });
  }

  try {
    const cleanId = parseNotionId(configPageId);
    const blocksRes = await fetch(`${NOTION_API_BASE}/blocks/${cleanId}/children?page_size=50`, {
      headers: getNotionAuthHeader(),
    });

    const jsonString = JSON.stringify(config, null, 2);
    const richTexts = splitTextToRichText(jsonString, 1950);

    if (blocksRes.ok) {
      const blocksData = await blocksRes.json();
      const blocks = blocksData.results || [];
      const existingCodeBlock = blocks.find((b: any) => b.type === 'code');

      // 如果已有单个代码块且分割后的 rich_text 项 <= 90 项，直接 PATCH 更新该代码块
      if (existingCodeBlock && richTexts.length <= 90) {
        const updateRes = await fetch(`${NOTION_API_BASE}/blocks/${existingCodeBlock.id}`, {
          method: 'PATCH',
          headers: getNotionAuthHeader(),
          body: JSON.stringify({
            code: {
              rich_text: richTexts,
              language: 'json',
            },
          }),
        });

        if (updateRes.ok) {
          return res.json({ success: true, source: 'notion', message: '已同步至 Notion 页面' });
        }
      }
    }

    // 否则构建符合规则的 code blocks 进行追加
    const newBlocks = createCodeBlocksFromText(jsonString);
    const appendRes = await fetch(`${NOTION_API_BASE}/blocks/${cleanId}/children`, {
      method: 'PATCH',
      headers: getNotionAuthHeader(),
      body: JSON.stringify({
        children: newBlocks,
      }),
    });

    if (appendRes.ok) {
      return res.json({ success: true, source: 'notion', message: '已成功写入 Notion 页面！' });
    }

    const errData = await appendRes.json().catch(() => ({}));
    // 如果配置 ID 是一个 Database Block（不支持 children），自动尝试写入其所在的 Parent Page
    if ((errData as any)?.code === 'validation_error' && /support children/i.test((errData as any)?.message || '')) {
      const blockRes = await fetch(`${NOTION_API_BASE}/blocks/${cleanId}`, {
        headers: getNotionAuthHeader(),
      });
      if (blockRes.ok) {
        const blockJson = await blockRes.json();
        if (blockJson.parent?.page_id) {
          const parentPageId = blockJson.parent.page_id.replace(/-/g, '');
          const parentAppendRes = await fetch(`${NOTION_API_BASE}/blocks/${parentPageId}/children`, {
            method: 'PATCH',
            headers: getNotionAuthHeader(),
            body: JSON.stringify({
              children: newBlocks,
            }),
          });
          if (parentAppendRes.ok) {
            return res.json({ success: true, source: 'notion', message: '已自动同步至所属的 Notion 主页面' });
          }
        }
      }
    }

    res.json({
      success: true,
      source: 'local',
      message: `本地已保存，Notion 提示: ${(errData as any)?.message || '写入失败，请检查配置页面 ID'}`,
    });
  } catch (err: any) {
    res.json({ success: true, source: 'local', message: `本地已保存，Notion 发生异常: ${err.message}` });
  }
});

// ==========================================
// 3. 宾客 RSVP 赴宴回执数据库接口
// ==========================================

app.get('/api/notion/rsvp', async (req, res) => {
  const creds = getStoredCredentials();
  const token = creds.apiKey;
  const rsvpDbId = creds.rsvpDbId;

  if (!token || !rsvpDbId) {
    const localList = readJsonFile(RSVP_CACHE_FILE, []);
    return res.json({
      source: 'local',
      list: localList,
      message: '未配置 Notion RSVP 数据库，已加载本地回执记录',
    });
  }

  try {
    const cleanId = parseNotionId(rsvpDbId);
    const queryRes = await fetch(`${NOTION_API_BASE}/databases/${cleanId}/query`, {
      method: 'POST',
      headers: getNotionAuthHeader(),
      body: JSON.stringify({
        page_size: 100,
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      }),
    });

    if (!queryRes.ok) {
      console.warn(`查询 Notion RSVP 失败 (${queryRes.status})，降级为本地数据`);
      const localList = readJsonFile(RSVP_CACHE_FILE, []);
      return res.json({ source: 'local_fallback', list: localList });
    }

    const queryData = await queryRes.json();
    const rows = queryData.results || [];

    const list = rows.map((row: any) => parseNotionRsvpRow(row));

    writeJsonFile(RSVP_CACHE_FILE, list);
    res.json({ source: 'notion', list });
  } catch (err: any) {
    console.error('获取 Notion RSVP 异常:', err);
    const localList = readJsonFile(RSVP_CACHE_FILE, []);
    res.json({ source: 'local_fallback', list: localList });
  }
});

app.post('/api/notion/rsvp', async (req, res) => {
  const rsvp = req.body.rsvp || req.body;
  if (!rsvp || !rsvp.name) {
    return res.status(400).json({ success: false, message: '请提供有效的 RSVP 回执信息' });
  }

  // 1. 同步保存到本地文件 (优先按 openid、手机号或姓名查重覆盖)
  const localList = readJsonFile<any[]>(RSVP_CACHE_FILE, []);
  const existingLocalIdx = localList.findIndex(
    (r) =>
      (rsvp.openid && r.openid && r.openid.trim() === String(rsvp.openid).trim()) ||
      (rsvp.id && r.id === rsvp.id) ||
      (rsvp.phone && r.phone && r.phone.trim() === String(rsvp.phone).trim()) ||
      (r.name && r.name.trim().toLowerCase() === String(rsvp.name).trim().toLowerCase())
  );
  if (existingLocalIdx >= 0) {
    localList[existingLocalIdx] = { ...localList[existingLocalIdx], ...rsvp };
  } else {
    localList.unshift(rsvp);
  }
  writeJsonFile(RSVP_CACHE_FILE, localList);

  const creds = getStoredCredentials();
  const token = creds.apiKey;
  const rsvpDbId = creds.rsvpDbId;

  if (!token || !rsvpDbId) {
    return res.json({
      success: true,
      source: 'local',
      message: '回执已成功保存到本地存储。在后台配置 NOTION_RSVP_DATABASE_ID 后将自动实时推送到 Notion 表格。',
    });
  }

  try {
    const cleanId = parseNotionId(rsvpDbId);
    // 确保数据库具备所有标准属性列（含 OpenID），若缺失则自动 PATCH 添加
    const schemaInfo = await ensureRsvpDatabaseSchema(cleanId, token);
    const dbProps = schemaInfo.properties;
    const pageProperties = buildRsvpPageProperties(rsvp, dbProps);

    // 查询该宾客是否已有对应记录
    // 优先级 1: 根据 OpenID 匹配
    // 优先级 2: 根据手机号匹配
    // 优先级 3: 根据姓名匹配
    const titleCol = Object.keys(dbProps).find((k) => dbProps[k].type === 'title') || 'Name';
    const phoneCol = Object.keys(dbProps).find((k) => /phone|电话|手机/i.test(k));
    const openidCol = Object.keys(dbProps).find((k) => /openid|微信id|微信标识/i.test(k)) || 'OpenID';

    let targetPageId = '';

    // 1. 尝试按 OpenID 查询
    if (rsvp.openid && openidCol) {
      try {
        const qRes = await fetch(`${NOTION_API_BASE}/databases/${cleanId}/query`, {
          method: 'POST',
          headers: getNotionAuthHeader(token),
          body: JSON.stringify({
            filter: {
              property: openidCol,
              rich_text: { equals: String(rsvp.openid).trim() },
            },
          }),
        });
        if (qRes.ok) {
          const qData = await qRes.json();
          if (qData.results && qData.results.length > 0) {
            targetPageId = qData.results[0].id;
          }
        }
      } catch (e) {
        console.warn('按 OpenID 过滤 Notion 异常:', e);
      }
    }

    // 2. 若未按 OpenID 找到，尝试按手机号查询
    if (!targetPageId && rsvp.phone && phoneCol) {
      try {
        const isPhoneType = dbProps[phoneCol]?.type === 'phone_number';
        const filterBody = isPhoneType
          ? { property: phoneCol, phone_number: { equals: String(rsvp.phone).trim() } }
          : { property: phoneCol, rich_text: { equals: String(rsvp.phone).trim() } };

        const qRes = await fetch(`${NOTION_API_BASE}/databases/${cleanId}/query`, {
          method: 'POST',
          headers: getNotionAuthHeader(token),
          body: JSON.stringify({ filter: filterBody }),
        });
        if (qRes.ok) {
          const qData = await qRes.json();
          if (qData.results && qData.results.length > 0) {
            targetPageId = qData.results[0].id;
          }
        }
      } catch (e) {
        console.warn('按手机号过滤 Notion 异常:', e);
      }
    }

    // 3. 若仍未找到，尝试按姓名查询
    if (!targetPageId && rsvp.name && titleCol) {
      try {
        const qRes = await fetch(`${NOTION_API_BASE}/databases/${cleanId}/query`, {
          method: 'POST',
          headers: getNotionAuthHeader(token),
          body: JSON.stringify({
            filter: {
              property: titleCol,
              title: { equals: String(rsvp.name).trim() },
            },
          }),
        });
        if (qRes.ok) {
          const qData = await qRes.json();
          if (qData.results && qData.results.length > 0) {
            targetPageId = qData.results[0].id;
          }
        }
      } catch (e) {
        console.warn('按姓名过滤 Notion 异常:', e);
      }
    }

    let saveRes;
    if (targetPageId) {
      saveRes = await fetch(`${NOTION_API_BASE}/pages/${targetPageId}`, {
        method: 'PATCH',
        headers: getNotionAuthHeader(token),
        body: JSON.stringify({ properties: pageProperties }),
      });
    } else {
      saveRes = await fetch(`${NOTION_API_BASE}/pages`, {
        method: 'POST',
        headers: getNotionAuthHeader(token),
        body: JSON.stringify({
          parent: { database_id: cleanId },
          properties: pageProperties,
        }),
      });
    }

    if (!saveRes.ok) {
      const errText = await saveRes.text();
      console.error('Notion 保存 RSVP 记录失败:', errText);
      return res.json({
        success: true,
        source: 'local_with_notion_error',
        message: '本地已保存，写入 Notion 发生错误',
      });
    }

    const savedPage = await saveRes.json();
    const finalGuest = parseNotionRsvpRow(savedPage);

    res.json({
      success: true,
      source: 'notion',
      isUpdated: Boolean(targetPageId),
      notionPageId: savedPage.id,
      guest: finalGuest,
      message: targetPageId
        ? '回执信息已成功更新并补齐至 Notion 表格（已绑定微信 OpenID）！'
        : '回执已成功写入 Notion 数据库（已存储微信 OpenID）！',
    });
  } catch (err: any) {
    console.error('Notion 创建 RSVP 异常:', err);
    res.json({
      success: true,
      source: 'local',
      message: `本地已保存，推送到 Notion 失败: ${err.message}`,
    });
  }
});

// ==========================================
// 4. 宾客祝福留言 (Blessings) 数据库接口
// ==========================================

app.get('/api/notion/blessings', async (req, res) => {
  const creds = getStoredCredentials();
  const token = creds.apiKey;
  const blessingsDbId = creds.blessingsDbId;

  if (!token || !blessingsDbId) {
    const localList = readJsonFile(BLESSINGS_CACHE_FILE, []);
    return res.json({
      source: 'local',
      list: localList,
      message: '未配置 Notion 祝福弹幕数据库，加载本地留言记录',
    });
  }

  try {
    const cleanId = parseNotionId(blessingsDbId);
    const queryRes = await fetch(`${NOTION_API_BASE}/databases/${cleanId}/query`, {
      method: 'POST',
      headers: getNotionAuthHeader(),
      body: JSON.stringify({
        page_size: 100,
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      }),
    });

    if (!queryRes.ok) {
      const localList = readJsonFile(BLESSINGS_CACHE_FILE, []);
      return res.json({ source: 'local_fallback', list: localList });
    }

    const queryData = await queryRes.json();
    const rows = queryData.results || [];
    const colors = ['bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-pink-500'];

    const list = rows.map((row: any, idx: number) => {
      const props = row.properties || {};

      let author = '';
      for (const key of Object.keys(props)) {
        if (props[key].type === 'title') {
          author = props[key].title?.[0]?.plain_text || '';
          break;
        }
      }

      let content = '';
      for (const key of Object.keys(props)) {
        if (/content|bless|内容|祝福|寄语/i.test(key) && props[key].type === 'rich_text') {
          content = props[key].rich_text?.[0]?.plain_text || '';
          break;
        }
      }

      let likes = 1;
      for (const key of Object.keys(props)) {
        if (/like|点赞|赞/i.test(key) && props[key].type === 'number') {
          likes = props[key].number || 1;
          break;
        }
      }

      return {
        id: row.id,
        author: author || '热心好友',
        content: content || '新婚大喜，白头偕老！',
        createdAt: '刚刚',
        likes,
        avatarColor: colors[idx % colors.length],
      };
    });

    writeJsonFile(BLESSINGS_CACHE_FILE, list);
    res.json({ source: 'notion', list });
  } catch (err: any) {
    const localList = readJsonFile(BLESSINGS_CACHE_FILE, []);
    res.json({ source: 'local_fallback', list: localList });
  }
});

app.post('/api/notion/blessings', async (req, res) => {
  const { blessing } = req.body;
  if (!blessing || !blessing.content) {
    return res.status(400).json({ success: false, message: '请提供祝福内容' });
  }

  // 本地保存
  const localList = readJsonFile<any[]>(BLESSINGS_CACHE_FILE, []);
  const updatedList = [blessing, ...localList.filter((b) => b.id !== blessing.id)];
  writeJsonFile(BLESSINGS_CACHE_FILE, updatedList);

  const creds = getStoredCredentials();
  const token = creds.apiKey;
  const blessingsDbId = creds.blessingsDbId;

  if (!token || !blessingsDbId) {
    return res.json({
      success: true,
      source: 'local',
      message: '祝福已保存到本地弹幕库。在后台配置 NOTION_BLESSINGS_DATABASE_ID 后将自动实时推送到 Notion 表格。',
    });
  }

  try {
    const cleanId = parseNotionId(blessingsDbId);
    const schemaInfo = await ensureBlessingsDatabaseSchema(cleanId, token);
    const dbProps = schemaInfo.properties;
    const pageProperties = buildBlessingPageProperties(blessing, dbProps);

    const createRes = await fetch(`${NOTION_API_BASE}/pages`, {
      method: 'POST',
      headers: getNotionAuthHeader(token),
      body: JSON.stringify({
        parent: { database_id: cleanId },
        properties: pageProperties,
      }),
    });

    if (createRes.ok) {
      const pageData = await createRes.json();
      return res.json({
        success: true,
        source: 'notion',
        notionPageId: pageData.id,
        message: '祝福已实时推送至 Notion 数据库！',
      });
    }

    res.json({ success: true, source: 'local', message: '本地已保存' });
  } catch (err: any) {
    res.json({ success: true, source: 'local', message: `本地已保存，推送到 Notion 失败: ${err.message}` });
  }
});

// ==========================================
// 5. 微信小程序接口 (登录换取OpenID、授权手机号换取与配置)
// ==========================================

export interface WeChatCredentials {
  appId: string;
  appSecret: string;
}
const WECHAT_CREDS_FILE = path.join(DATA_DIR, 'wechat_credentials.json');

function getStoredWeChatCredentials(): WeChatCredentials {
  const fileCreds = readJsonFile<Partial<WeChatCredentials>>(WECHAT_CREDS_FILE, {});
  return {
    appId: (fileCreds.appId || process.env.WECHAT_APPID || '').trim(),
    appSecret: (fileCreds.appSecret || process.env.WECHAT_SECRET || '').trim(),
  };
}

function saveStoredWeChatCredentials(creds: Partial<WeChatCredentials>): WeChatCredentials {
  const current = getStoredWeChatCredentials();
  const updated: WeChatCredentials = {
    appId: creds.appId !== undefined ? creds.appId.trim() : current.appId,
    appSecret: creds.appSecret !== undefined ? creds.appSecret.trim() : current.appSecret,
  };
  writeJsonFile(WECHAT_CREDS_FILE, updated);
  if (updated.appId) process.env.WECHAT_APPID = updated.appId;
  if (updated.appSecret) process.env.WECHAT_SECRET = updated.appSecret;
  return updated;
}

// 微信小程序配置查询
app.get('/api/wechat/config', (req, res) => {
  const creds = getStoredWeChatCredentials();
  res.json({
    success: true,
    hasAppId: Boolean(creds.appId),
    appId: creds.appId ? (creds.appId.slice(0, 6) + '****' + creds.appId.slice(-4)) : '',
    rawAppId: creds.appId,
    hasAppSecret: Boolean(creds.appSecret),
  });
});

// 保存微信小程序 AppID 与 AppSecret
app.post('/api/wechat/config', (req, res) => {
  const { appId, appSecret } = req.body;
  const updated = saveStoredWeChatCredentials({ appId, appSecret });
  res.json({
    success: true,
    message: '微信小程序开发者配置已保存',
    hasAppId: Boolean(updated.appId),
    hasAppSecret: Boolean(updated.appSecret),
  });
});

// 微信登录 code2session 并比对 Notion 宾客信息
app.post('/api/wechat/login', async (req, res) => {
  const { code, openid: directOpenid } = req.body;
  if (!code && !directOpenid) {
    return res.status(400).json({ success: false, message: '缺少微信登录 code 或 openid' });
  }

  let finalOpenid = directOpenid ? String(directOpenid).trim() : '';
  let sessionKey = 'session_' + Date.now();
  let unionid = '';
  let isMock = false;

  const creds = getStoredWeChatCredentials();
  if (!finalOpenid && creds.appId && creds.appSecret) {
    try {
      const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${creds.appId}&secret=${creds.appSecret}&js_code=${code}&grant_type=authorization_code`;
      const wxRes = await fetch(wxUrl);
      const wxData = (await wxRes.json()) as any;
      if (wxData.errcode && wxData.errcode !== 0) {
        console.warn('微信 jscode2session 异常:', wxData);
        finalOpenid = 'wx_guest_' + crypto.createHash('md5').update(code).digest('hex').slice(0, 16);
        isMock = true;
      } else {
        finalOpenid = wxData.openid;
        sessionKey = wxData.session_key;
        unionid = wxData.unionid || '';
      }
    } catch (err: any) {
      console.warn('微信服务器通信超时，切换为沙盒模式:', err);
      finalOpenid = 'wx_guest_' + crypto.createHash('md5').update(code).digest('hex').slice(0, 16);
      isMock = true;
    }
  } else if (!finalOpenid) {
    // 开发沙盒模式：生成稳定模拟 OpenID
    finalOpenid = 'wx_guest_' + crypto.createHash('md5').update(code || 'default').digest('hex').slice(0, 16);
    isMock = true;
  }

  // 关键步骤：拿到 openid 后，立即在 Notion 中比对查询宾客档案！
  const matchedGuest = await findGuestByOpenidInNotion(finalOpenid);

  res.json({
    success: true,
    openid: finalOpenid,
    session_key: sessionKey,
    unionid: unionid,
    isMock: isMock,
    matchedGuest: matchedGuest || null,
    message: matchedGuest
      ? `微信登录成功，已在 Notion 匹配到宾客档案（${matchedGuest.name}）`
      : '微信登录成功，未找到已绑定该 OpenID 的宾客记录，可直接登记绑定',
  });
});

// 查询指定微信 OpenID 在 Notion 中匹配到的宾客档案
app.get('/api/wechat/guest', async (req, res) => {
  const openid = String(req.query.openid || '').trim();
  if (!openid) {
    return res.status(400).json({ success: false, message: '缺少 openid 参数' });
  }
  const matchedGuest = await findGuestByOpenidInNotion(openid);
  res.json({
    success: true,
    matched: Boolean(matchedGuest),
    guest: matchedGuest || null,
  });
});

// 宾客姓名或手机号与当前微信 OpenID 比对并绑定入 Notion
app.post('/api/wechat/bind-guest', async (req, res) => {
  const { openid, name, phone } = req.body;
  if (!openid) {
    return res.status(400).json({ success: false, message: '缺少 openid 参数' });
  }
  const result = await bindGuestOpenidInNotion({ openid, name, phone });
  res.json({
    success: true,
    ...result,
  });
});

// 微信官方获取手机号 getPhoneNumber (code 换取或解密)
app.post('/api/wechat/phone', async (req, res) => {
  const { code, encryptedData, iv } = req.body;
  const creds = getStoredWeChatCredentials();

  // 若提供了新版 phoneCode 并且后台配置了小程序 AppID 与 Secret
  if (code && creds.appId && creds.appSecret) {
    try {
      // 1. 获取 stable access_token
      const tokenRes = await fetch(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${creds.appId}&secret=${creds.appSecret}`
      );
      const tokenData = (await tokenRes.json()) as any;
      if (tokenData.access_token) {
        // 2. 换取真实手机号
        const phoneRes = await fetch(
          `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${tokenData.access_token}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          }
        );
        const phoneData = (await phoneRes.json()) as any;
        if (phoneData.phone_info && phoneData.phone_info.phoneNumber) {
          return res.json({
            success: true,
            phoneNumber: phoneData.phone_info.phoneNumber,
            purePhoneNumber: phoneData.phone_info.purePhoneNumber,
            countryCode: phoneData.phone_info.countryCode,
          });
        }
      }
    } catch (e: any) {
      console.warn('微信换取手机号异常:', e);
    }
  }

  // 测试环境或沙盒环境：返回可用手机号
  const demoPhone = '13888888888';
  res.json({
    success: true,
    phoneNumber: demoPhone,
    isMock: true,
    message: '测试环境：已自动返回微信演示手机号',
  });
});

// ==========================================
// 6. Notion 婚纱图片资源上传与读取 (图片上传和显示都用 Notion 资源)
// ==========================================

// 接收小程序或网页后台上传婚纱图片，并推送到 Notion 页面图片 Block
app.post('/api/notion/upload-image', async (req, res) => {
  try {
    let imageBuffer: Buffer | null = null;
    let mimeType = 'image/jpeg';
    let title = '婚纱摄影留念';

    if (req.body && req.body.base64) {
      const b64 = req.body.base64;
      const matches = b64.match(/^data:([A-Za-z0-9-+/]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        imageBuffer = Buffer.from(matches[2], 'base64');
      } else {
        imageBuffer = Buffer.from(b64, 'base64');
      }
      if (req.body.title) title = req.body.title;
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      return res.status(400).json({ success: false, message: '未收到有效的图片 base64 数据' });
    }

    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    const filename = `wedding_notion_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filePath, imageBuffer);

    // 生成该服务的绝对访问 URL
    const host = req.get('host') || `localhost:${PORT}`;
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const publicUrl = `${protocol}/uploads/${filename}`;

    // 如果配置了 Notion configPageId，向 Notion 页面追加 Image Block
    const creds = getStoredCredentials();
    let notionBlockId = '';
    if (creds.apiKey && creds.configPageId) {
      try {
        const appendRes = await fetch(`${NOTION_API_BASE}/blocks/${creds.configPageId}/children`, {
          method: 'PATCH',
          headers: getNotionAuthHeader(),
          body: JSON.stringify({
            children: [
              {
                object: 'block',
                type: 'image',
                image: {
                  type: 'external',
                  external: {
                    url: publicUrl,
                  },
                },
              },
            ],
          }),
        });
        if (appendRes.ok) {
          const appendData = (await appendRes.json()) as any;
          if (appendData.results && appendData.results[0]) {
            notionBlockId = appendData.results[0].id;
          }
        }
      } catch (err) {
        console.warn('推送到 Notion 页面图片 Block 失败:', err);
      }
    }

    // 记录到本地照片列表
    const localPhotos = readJsonFile<Array<{ url: string; title: string; createdAt: string }>>(
      path.join(DATA_DIR, 'notion_photos.json'),
      []
    );
    localPhotos.unshift({ url: publicUrl, title: title, createdAt: new Date().toISOString() });
    writeJsonFile(path.join(DATA_DIR, 'notion_photos.json'), localPhotos);

    res.json({
      success: true,
      imageUrl: publicUrl,
      notionBlockId: notionBlockId,
      message: notionBlockId ? '婚纱照已成功上传并同步至 Notion 页面图片 Block！' : '婚纱照已成功上传！',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: `图片上传处理异常: ${err.message}` });
  }
});

// 读取 Notion 页面中的婚纱照资源
app.get('/api/notion/images', async (req, res) => {
  const creds = getStoredCredentials();
  const photosList: Array<{ url: string; title: string; location?: string }> = [];

  if (creds.apiKey && creds.configPageId) {
    try {
      const blocksRes = await fetch(`${NOTION_API_BASE}/blocks/${creds.configPageId}/children?page_size=100`, {
        headers: getNotionAuthHeader(),
      });
      if (blocksRes.ok) {
        const blocksData = (await blocksRes.json()) as any;
        for (const block of blocksData.results || []) {
          if (block.type === 'image' && block.image) {
            let imgUrl = '';
            if (block.image.type === 'external' && block.image.external) {
              imgUrl = block.image.external.url;
            } else if (block.image.type === 'file' && block.image.file) {
              imgUrl = block.image.file.url;
            }
            if (imgUrl) {
              let caption = '婚纱留念';
              if (block.image.caption && block.image.caption.length > 0) {
                caption = block.image.caption.map((c: any) => c.plain_text).join('');
              }
              photosList.push({ url: imgUrl, title: caption });
            }
          }
        }
      }
    } catch (err) {
      console.warn('读取 Notion 页面图片资源失败:', err);
    }
  }

  // 结合本地上传记录与默认婚纱照
  const localPhotos = readJsonFile<Array<{ url: string; title: string }>>(
    path.join(DATA_DIR, 'notion_photos.json'),
    []
  );
  for (const lp of localPhotos) {
    if (!photosList.some(p => p.url === lp.url)) {
      photosList.push(lp);
    }
  }

  // 兜底默认高品质相册
  if (photosList.length === 0) {
    photosList.push(
      { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800', title: '晨光之盟', location: '圣彼得堡城堡花园' },
      { url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800', title: '喜结连理', location: '中式红庭雅苑' },
      { url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800', title: '星河长明', location: '维多利亚海滨' },
      { url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800', title: '深情相拥', location: '枫叶落日大道' }
    );
  }

  res.json({
    success: true,
    images: photosList,
    source: creds.configPageId ? 'notion' : 'local',
  });
});

// ==========================================
// 7. 微信原生小程序工程一键导出与源码接口
// ==========================================

// 一键打包并下载完整的微信原生小程序项目 ZIP
app.get('/api/miniprogram/download', async (req, res) => {
  try {
    const mpDir = path.resolve(__dirname, 'miniprogram');
    if (!fs.existsSync(mpDir)) {
      return res.status(404).json({ success: false, message: 'miniprogram 目录不存在' });
    }

    const PROD_API_BASE = 'https://ais-pre-tu3wda4ph65z74rogikrl2-267716153838.asia-northeast1.run.app';
    const targetApiBase = String(req.query.apiBase || '').trim() || PROD_API_BASE;

    const zip = new JSZip();

    function addDirToZip(currentPath: string, zipFolder: JSZip) {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          const subFolder = zipFolder.folder(entry.name);
          if (subFolder) addDirToZip(fullPath, subFolder);
        } else if (entry.isFile()) {
          if (entry.name === 'app.js' || entry.name === 'notion.js') {
            let contentStr = fs.readFileSync(fullPath, 'utf-8');
            // 确保替换为正式生产环境域名
            contentStr = contentStr.replace(
              /https:\/\/ais-dev-[a-z0-9\-]+\.asia-northeast1\.run\.app/g,
              targetApiBase
            );
            contentStr = contentStr.replace(
              /apiBase:\s*['"]https:\/\/[^'"]+['"]/g,
              `apiBase: '${targetApiBase}'`
            );
            zipFolder.file(entry.name, contentStr);
          } else {
            const content = fs.readFileSync(fullPath);
            zipFolder.file(entry.name, content);
          }
        }
      }
    }

    addDirToZip(mpDir, zip);

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="wedding-invitation-miniprogram.zip"');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ success: false, message: `打包小程序失败: ${err.message}` });
  }
});

// 在线获取原生小程序所有文件结构与源码内容
app.get('/api/miniprogram/files', (req, res) => {
  try {
    const mpDir = path.resolve(__dirname, 'miniprogram');
    if (!fs.existsSync(mpDir)) {
      return res.json({ success: true, files: [] });
    }

    const files: Array<{ path: string; name: string; content: string; ext: string }> = [];

    function collectFiles(currentPath: string, relativePath = '') {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const rel = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          collectFiles(fullPath, rel);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (['.json', '.js', '.wxml', '.wxss', '.md'].includes(ext)) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            files.push({ path: rel, name: entry.name, content, ext });
          } else if (['.png', '.jpg', '.jpeg', '.svg'].includes(ext)) {
            files.push({
              path: rel,
              name: entry.name,
              content: `// [微信小程序二进制资源]: ${rel}\n// 尺寸: 81x81 PNG (微信小程序官方 TabBar 标准尺寸)\n// 作用: 微信小程序底部导航栏图标`,
              ext,
            });
          }
        }
      }
    }

    collectFiles(mpDir);
    res.json({ success: true, files });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 8. 启动 Vite Dev 中间件或静态生产服务
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌸 婚礼请柬全栈服务已在端口 ${PORT} 启动: http://0.0.0.0:${PORT}`);
  });
}

startServer();
