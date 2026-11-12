import { WeddingConfig, GuestRSVP, GuestBlessing } from '../types/wedding';

export interface NotionCredentials {
  apiKey: string;
  rsvpDbId: string;
  blessingsDbId: string;
  configPageId: string;
}

export interface NotionStatus {
  configured: boolean;
  connectionValid: boolean;
  botName: string;
  botWorkspace: string;
  connectionError: string;
  databaseIds: {
    hasConfigPage: boolean;
    configPageId: string;
    configPageValid?: boolean;
    hasRsvpDatabase: boolean;
    rsvpDatabaseId: string;
    rsvpDatabaseValid?: boolean;
    rsvpDatabaseTitle?: string;
    rsvpMissingColumns?: string[];
    hasBlessingsDatabase: boolean;
    blessingsDatabaseId: string;
    blessingsDatabaseValid?: boolean;
    blessingsDatabaseTitle?: string;
    blessingsMissingColumns?: string[];
  };
}

export interface NotionConnectionTestResult {
  success: boolean;
  message: string;
  details?: Record<string, string>;
  credentials?: NotionCredentials;
}

const LS_BASE = 'cf_worker_url';
const LS_WID = 'cf_wid';
const LS_PASS = 'cf_passcode';
const DEFAULT_BASE = 'https://marry.x208559754.workers.dev';

function readQueryWid(): string {
  try {
    const w = new URLSearchParams(window.location.search).get('wid') || '';
    return w.trim().slice(0, 32);
  } catch {
    return '';
  }
}

function getSettings() {
  let base = '';
  let wid = '';
  let passcode = '';
  try {
    base = (localStorage.getItem(LS_BASE) || '').trim();
    wid = (localStorage.getItem(LS_WID) || '').trim();
    passcode = (localStorage.getItem(LS_PASS) || '').trim();
  } catch {
    /* ignore */
  }
  wid = readQueryWid() || wid || 'demo';
  base = (base || DEFAULT_BASE).replace(/\/+$/, '');
  return { base, wid, passcode };
}

function saveSettings(partial: { base?: string; wid?: string; passcode?: string }) {
  try {
    if (partial.base !== undefined) localStorage.setItem(LS_BASE, partial.base.trim());
    if (partial.wid !== undefined) localStorage.setItem(LS_WID, partial.wid.trim());
    if (partial.passcode !== undefined) localStorage.setItem(LS_PASS, partial.passcode);
  } catch {
    /* ignore */
  }
}

function credsFromSettings(): NotionCredentials {
  const s = getSettings();
  return {
    // 沿用原表单字段：apiKey = 总管口令，configPageId = 婚礼 wid
    apiKey: s.passcode,
    rsvpDbId: 'cloudflare-d1-rsvps',
    blessingsDbId: 'cloudflare-d1-blessings',
    configPageId: s.wid,
  };
}

function applyCredsInput(creds: Partial<NotionCredentials> & { workerUrl?: string; wid?: string; passcode?: string }) {
  const current = getSettings();
  const wid = (creds.wid || creds.configPageId || current.wid || '').trim();
  const passcode = (creds.passcode || creds.apiKey || current.passcode || '').trim();
  const base = (creds.workerUrl || current.base || DEFAULT_BASE).trim();
  saveSettings({ base, wid, passcode });
}

async function cfApi(method: string, path: string, body?: unknown, opts?: { form?: FormData }): Promise<any> {
  const { base, wid, passcode } = getSettings();
  const hasQuery = path.includes('?');
  const needsWid = !/[?&]wid=/.test(path) && !path.startsWith('/api/promo') && !path.startsWith('/api/superadmin/login');
  let url = base + path;
  if (needsWid) url += (hasQuery ? '&' : '?') + 'wid=' + encodeURIComponent(wid);

  const headers: Record<string, string> = {};
  if (passcode) headers['x-admin-passcode'] = passcode;
  let payload: BodyInit | undefined;
  if (opts?.form) {
    payload = opts.form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(url, { method, headers, body: payload });
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || '无效响应' };
  }
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || '请求失败（HTTP ' + res.status + '）');
  }
  if (data && data.ok === true) return data.data;
  return data;
}

/**
 * 智能提取 Notion 32 位 ID（兼容旧后台输入；现在更常直接用作 wid）
 */
export function cleanNotionId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{2,32}$/.test(trimmed)) return trimmed;
  const uuidMatch = trimmed.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
  if (uuidMatch) {
    return uuidMatch[1].replace(/-/g, '').toLowerCase();
  }
  const hex32Match = trimmed.match(/([a-f0-9]{32})/i);
  if (hex32Match) {
    return hex32Match[1].toLowerCase();
  }
  return trimmed.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
}

export async function fetchNotionCredentials(): Promise<NotionCredentials> {
  return credsFromSettings();
}

export async function saveNotionCredentials(creds: Partial<NotionCredentials>): Promise<NotionConnectionTestResult> {
  applyCredsInput(creds);
  return testNotionConnection();
}

export async function getNotionStatus(): Promise<NotionStatus> {
  const s = getSettings();
  const empty = {
    configured: Boolean(s.wid),
    connectionValid: false,
    botName: '',
    botWorkspace: '',
    connectionError: '',
    databaseIds: {
      hasConfigPage: Boolean(s.wid),
      configPageId: s.wid,
      configPageValid: false,
      hasRsvpDatabase: true,
      rsvpDatabaseId: 'cloudflare-d1-rsvps',
      rsvpDatabaseValid: false,
      rsvpDatabaseTitle: 'D1 rsvps',
      hasBlessingsDatabase: true,
      blessingsDatabaseId: 'cloudflare-d1-blessings',
      blessingsDatabaseValid: false,
      blessingsDatabaseTitle: 'D1 blessings',
    },
  };
  try {
    await cfApi('GET', '/api/config');
    const list = await cfApi('GET', '/api/blessings').catch(() => []);
    let rsvpOk = false;
    try {
      await cfApi('GET', '/api/rsvps');
      rsvpOk = true;
    } catch {
      rsvpOk = false;
    }
    return {
      configured: true,
      connectionValid: true,
      botName: 'Cloudflare Workers',
      botWorkspace: s.base + '  /  wid=' + s.wid,
      connectionError: '',
      databaseIds: {
        hasConfigPage: true,
        configPageId: s.wid,
        configPageValid: true,
        hasRsvpDatabase: true,
        rsvpDatabaseId: 'cloudflare-d1-rsvps',
        rsvpDatabaseValid: rsvpOk,
        rsvpDatabaseTitle: 'D1 rsvps',
        hasBlessingsDatabase: true,
        blessingsDatabaseId: 'cloudflare-d1-blessings',
        blessingsDatabaseValid: Array.isArray(list),
        blessingsDatabaseTitle: 'D1 blessings',
      },
    };
  } catch (err: any) {
    return { ...empty, connectionError: err?.message || '无法连接到 Cloudflare Worker' };
  }
}

export async function testNotionConnection(params?: {
  apiKey?: string;
  rsvpDbId?: string;
  blessingsDbId?: string;
  configPageId?: string;
}): Promise<NotionConnectionTestResult> {
  if (params) applyCredsInput(params);
  const s = getSettings();
  try {
    const cfg = await cfApi('GET', '/api/config');
    return {
      success: true,
      message: '已连接到 Cloudflare（D1），婚礼 ' + s.wid + ' 可读写。',
      details: {
        worker: s.base,
        wid: s.wid,
        hasConfig: cfg ? 'yes' : 'empty',
      },
      credentials: credsFromSettings(),
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || '连接 Cloudflare 失败',
      credentials: credsFromSettings(),
    };
  }
}

export async function fetchNotionConfig(): Promise<{ source: string; config: WeddingConfig | null }> {
  try {
    const cfg = await cfApi('GET', '/api/config');
    return { source: 'cloudflare', config: (cfg || null) as WeddingConfig | null };
  } catch (err) {
    console.warn('获取 Cloudflare 婚礼配置失败，将沿用本地缓存', err);
    return { source: 'local_fallback', config: null };
  }
}

export async function saveNotionConfig(config: WeddingConfig): Promise<{ success: boolean; source?: string; message?: string }> {
  try {
    const { photos, ...rest } = (config || {}) as WeddingConfig & { photos?: unknown };
    void photos;
    await cfApi('PUT', '/api/config', rest);
    return { success: true, source: 'cloudflare', message: '已保存到 Cloudflare D1' };
  } catch (err: any) {
    return { success: false, message: err?.message || '保存失败' };
  }
}

export async function fetchNotionRsvps(): Promise<{ source: string; list: GuestRSVP[] }> {
  try {
    const list = await cfApi('GET', '/api/rsvps');
    return { source: 'cloudflare', list: Array.isArray(list) ? list : [] };
  } catch (err) {
    console.warn('获取 RSVP 列表失败', err);
    return { source: 'local_fallback', list: [] };
  }
}

export async function submitNotionRsvp(rsvp: GuestRSVP): Promise<{ success: boolean; source?: string; message?: string }> {
  try {
    await cfApi('POST', '/api/rsvp', rsvp);
    return { success: true, source: 'cloudflare', message: '回执已保存到 Cloudflare D1' };
  } catch (err: any) {
    return { success: false, message: err?.message || '提交回执失败' };
  }
}

export async function fetchNotionBlessings(): Promise<{ source: string; list: GuestBlessing[] }> {
  try {
    const list = await cfApi('GET', '/api/blessings');
    return { source: 'cloudflare', list: Array.isArray(list) ? list : [] };
  } catch (err) {
    console.warn('获取祝福列表失败', err);
    return { source: 'local_fallback', list: [] };
  }
}

export async function submitNotionBlessing(blessing: GuestBlessing): Promise<{ success: boolean; source?: string; message?: string }> {
  try {
    await cfApi('POST', '/api/blessings', {
      author: blessing.author,
      content: blessing.content,
    });
    return { success: true, source: 'cloudflare', message: '祝福已保存到 Cloudflare D1' };
  } catch (err: any) {
    return { success: false, message: err?.message || '提交祝福失败' };
  }
}

export async function autoDiscoverNotion(_apiKey?: string): Promise<{
  success: boolean;
  message: string;
  suggested?: { rsvpDbId?: string; blessingsDbId?: string; configPageId?: string };
}> {
  const test = await testNotionConnection();
  return {
    success: test.success,
    message: test.success
      ? '无需发现 Notion 库：数据已使用 Cloudflare D1（rsvps / blessings / weddings.config）。'
      : test.message,
    suggested: {
      rsvpDbId: 'cloudflare-d1-rsvps',
      blessingsDbId: 'cloudflare-d1-blessings',
      configPageId: getSettings().wid,
    },
  };
}

export async function initNotionDatabaseSchema(
  _type: 'rsvp' | 'blessings' | 'all' = 'all',
  _targetDbId?: string,
): Promise<{ success: boolean; message: string }> {
  const test = await testNotionConnection();
  return {
    success: test.success,
    message: test.success
      ? 'D1 表结构已在 Worker 的 schema.sql 中维护，无需再初始化 Notion。'
      : test.message,
  };
}

function base64ToBlob(base64: string): Blob {
  const cleaned = base64.includes(',') ? base64.split(',')[1] : base64;
  const bin = atob(cleaned);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const mime = /^data:([^;]+);/i.exec(base64);
  return new Blob([arr], { type: (mime && mime[1]) || 'image/jpeg' });
}

export async function uploadNotionImage(
  base64: string,
  title?: string,
): Promise<{ success: boolean; url?: string; message?: string; notionBlockId?: string }> {
  try {
    const form = new FormData();
    const name = (title || 'photo').replace(/[^\w\u4e00-\u9fa5.-]+/g, '_') + '.jpg';
    form.append('file', base64ToBlob(base64), name);
    if (title) form.append('title', title);
    const row = await cfApi('POST', '/api/images', undefined, { form });
    return {
      success: true,
      url: row && (row.url || row.thumb_url),
      message: '照片已上传到 Cloudflare（经 ImgBB，记录写入 D1）',
    };
  } catch (err: any) {
    return { success: false, message: err?.message || '上传失败' };
  }
}

export async function fetchNotionImages(): Promise<Array<{ url: string; title: string; location?: string }>> {
  try {
    const list = await cfApi('GET', '/api/images');
    return (Array.isArray(list) ? list : []).map((it: any) => ({
      url: it.url,
      title: it.title || '',
    }));
  } catch {
    return [];
  }
}

export async function fetchWeChatConfig(): Promise<{
  appId?: string;
  appSecret?: string;
  configured?: boolean;
  message?: string;
}> {
  return {
    configured: true,
    message: '微信 AppSecret 已改到 Cloudflare Worker 的密钥中，不再从网页后台读写。',
  };
}

export async function saveWeChatConfig(_appId: string, _appSecret: string): Promise<{ success: boolean; message: string }> {
  return {
    success: false,
    message: '请使用 wrangler secret put WX_APPSECRET 在 Cloudflare 上配置，不要把密钥写进网页。',
  };
}

export async function weChatLogin(code: string): Promise<{
  success?: boolean;
  openid?: string;
  token?: string;
  message?: string;
}> {
  try {
    const data = await cfApi('POST', '/api/login', { code, wid: getSettings().wid });
    return { success: true, openid: data.openid, token: data.token };
  } catch (err: any) {
    return { success: false, message: err?.message };
  }
}

export async function weChatGetPhone(
  code?: string,
  _encryptedData?: string,
  _iv?: string,
): Promise<{ success?: boolean; phoneNumber?: string; message?: string }> {
  try {
    const data = await cfApi('POST', '/api/wechat/phone', { code: code || '' });
    return { success: true, phoneNumber: (data && data.phoneNumber) || '' };
  } catch (err: any) {
    return { success: false, message: err?.message };
  }
}

export async function fetchMiniProgramFiles(): Promise<Array<{ path: string; name: string; content: string; ext: string }>> {
  try {
    const res = await fetch('/api/miniprogram/files');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
