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

/**
 * 智能提取 Notion 32 位 ID（支持直接输入 ID 或粘贴完整网页 URL）
 */
export function cleanNotionId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const uuidMatch = trimmed.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
  if (uuidMatch) {
    return uuidMatch[1].replace(/-/g, '').toLowerCase();
  }
  const hex32Match = trimmed.match(/([a-f0-9]{32})/i);
  if (hex32Match) {
    return hex32Match[1].toLowerCase();
  }
  return trimmed.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

/**
 * 获取当前已配置的 Notion 凭据与数据库 ID
 */
export async function fetchNotionCredentials(): Promise<NotionCredentials> {
  try {
    const res = await fetch('/api/notion/credentials');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { apiKey: '', rsvpDbId: '', blessingsDbId: '', configPageId: '' };
  }
}

/**
 * 保存并更新 Notion 凭据与数据库 ID，返回校验测试结果
 */
export async function saveNotionCredentials(creds: Partial<NotionCredentials>): Promise<NotionConnectionTestResult> {
  try {
    const res = await fetch('/api/notion/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      message: `保存凭据请求异常: ${err.message}`,
    };
  }
}

/**
 * 获取后端 Notion 状态（环境变量与连接健康度）
 */
export async function getNotionStatus(): Promise<NotionStatus> {
  try {
    const res = await fetch('/api/notion/status');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      configured: false,
      connectionValid: false,
      botName: '',
      botWorkspace: '',
      connectionError: '无法连接到后端服务',
      databaseIds: {
        hasConfigPage: false,
        configPageId: '',
        hasRsvpDatabase: false,
        rsvpDatabaseId: '',
        hasBlessingsDatabase: false,
        blessingsDatabaseId: '',
      },
    };
  }
}

/**
 * 手动测试 Notion 连通性
 */
export async function testNotionConnection(params?: {
  apiKey?: string;
  rsvpDbId?: string;
  blessingsDbId?: string;
  configPageId?: string;
}): Promise<NotionConnectionTestResult> {
  try {
    const res = await fetch('/api/notion/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {}),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      message: `网络请求失败: ${err.message || '请检查服务端是否正常运行'}`,
    };
  }
}

/**
 * 从后端（Notion 或本地存储）拉取最新的婚礼配置
 */
export async function fetchNotionConfig(): Promise<{ source: string; config: WeddingConfig | null }> {
  try {
    const res = await fetch('/api/notion/config');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('获取远程配置失败，将沿用本地缓存', err);
    return { source: 'local_fallback', config: null };
  }
}

/**
 * 保存婚礼配置至后端及 Notion
 */
export async function saveNotionConfig(config: WeddingConfig): Promise<{ success: boolean; source?: string; message?: string }> {
  try {
    const res = await fetch('/api/notion/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * 获取宾客 RSVP 列表
 */
export async function fetchNotionRsvps(): Promise<{ source: string; list: GuestRSVP[] }> {
  try {
    const res = await fetch('/api/notion/rsvp');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { source: data.source || 'local', list: data.list || [] };
  } catch (err) {
    console.warn('获取 RSVP 列表失败', err);
    return { source: 'local_fallback', list: [] };
  }
}

/**
 * 提交宾客出席回执至 Notion
 */
export async function submitNotionRsvp(rsvp: GuestRSVP): Promise<{ success: boolean; source?: string; message?: string }> {
  try {
    const res = await fetch('/api/notion/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rsvp }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * 获取宾客祝福留言列表
 */
export async function fetchNotionBlessings(): Promise<{ source: string; list: GuestBlessing[] }> {
  try {
    const res = await fetch('/api/notion/blessings');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { source: data.source || 'local', list: data.list || [] };
  } catch (err) {
    console.warn('获取祝福列表失败', err);
    return { source: 'local_fallback', list: [] };
  }
}

/**
 * 提交宾客祝福心语至 Notion
 */
export async function submitNotionBlessing(blessing: GuestBlessing): Promise<{ success: boolean; source?: string; message?: string }> {
  try {
    const res = await fetch('/api/notion/blessings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blessing }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * 自动扫描工作区所有共享库并推导匹配
 */
export async function autoDiscoverNotion(apiKey?: string): Promise<{
  success: boolean;
  message?: string;
  databases?: { id: string; title: string }[];
  pages?: { id: string; title: string }[];
  suggested?: {
    rsvpDbId: string;
    rsvpDbTitle: string;
    blessingsDbId: string;
    blessingsDbTitle: string;
    configPageId: string;
    configPageTitle: string;
  };
}> {
  try {
    const res = await fetch('/api/notion/auto-discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * 一键为 Notion 数据库初始化/补齐标准表头列属性，并回填已有宾客回执/留言数据
 */
export async function initNotionDatabaseSchema(type: 'rsvp' | 'blessings' | 'all' = 'all', targetDbId?: string): Promise<{
  success: boolean;
  message?: string;
  results?: {
    rsvp?: { success: boolean; message: string; addedColumns?: string[]; syncedCount?: number; updatedCount?: number; createdCount?: number };
    blessings?: { success: boolean; message: string; addedColumns?: string[]; syncedCount?: number };
  };
}> {
  try {
    const res = await fetch('/api/notion/init-database-schema', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, targetDbId }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    return { success: false, message: `请求初始化数据库失败: ${err.message}` };
  }
}

/**
 * 上传婚纱图片并同步推送到 Notion 页面图片 Block
 */
export async function uploadNotionImage(base64: string, title?: string): Promise<{
  success: boolean;
  imageUrl?: string;
  notionBlockId?: string;
  message?: string;
}> {
  try {
    const res = await fetch('/api/notion/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, title }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: `上传图片失败: ${err.message}` };
  }
}

/**
 * 获取 Notion 页面图片 Block 中的所有婚纱照资源
 */
export async function fetchNotionImages(): Promise<Array<{ url: string; title: string; location?: string }>> {
  try {
    const res = await fetch('/api/notion/images');
    if (!res.ok) return [];
    const data = await res.json();
    return data.images || [];
  } catch {
    return [];
  }
}

/**
 * 微信小程序配置与模拟获取
 */
export async function fetchWeChatConfig(): Promise<{
  success: boolean;
  hasAppId: boolean;
  appId: string;
  rawAppId?: string;
  hasAppSecret: boolean;
}> {
  try {
    const res = await fetch('/api/wechat/config');
    return await res.json();
  } catch {
    return { success: false, hasAppId: false, appId: '', hasAppSecret: false };
  }
}

export async function saveWeChatConfig(appId: string, appSecret: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/wechat/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId, appSecret }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function weChatLogin(code: string): Promise<{
  success: boolean;
  openid?: string;
  isMock?: boolean;
  message?: string;
}> {
  try {
    const res = await fetch('/api/wechat/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function weChatGetPhone(code?: string, encryptedData?: string, iv?: string): Promise<{
  success: boolean;
  phoneNumber?: string;
  isMock?: boolean;
  message?: string;
}> {
  try {
    const res = await fetch('/api/wechat/phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, encryptedData, iv }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function fetchMiniProgramFiles(): Promise<Array<{ path: string; name: string; content: string; ext: string }>> {
  try {
    const res = await fetch('/api/miniprogram/files');
    const data = await res.json();
    return data.files || [];
  } catch {
    return [];
  }
}

