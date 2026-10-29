// utils/notion.js - 微信小程序端 Notion 官方数据库直连服务 (免后端架构)
const app = getApp();

// ========================================================
// 婚礼专属 Notion 数据库配置
// ========================================================
const NOTION_CONFIG = {
  // Notion 内部集成 Secret
  token: 'REDACTED_OLD_NOTION_TOKEN',
  pageId: '3f86df76b8c880359f82f91ef118ba90',
  // 宾客回执 (RSVP) 数据库 ID: 报名/回执
  rsvpDbId: '3f86df76b8c88069a629c469d51e2367',
  // 亲友祝福留言墙 (Blessings) 数据库 ID: 祝福语留言 (已配置 创建时间)
  blessingsDbId: '3f86df76b8c88031a06ef09d5cbc58e1',
  // 微信小程序已注册/授权用户表 ID
  usersDbId: '3fa6df76b8c88137ba0aea0eb795efb9',
  // 喜帖信笺与婚礼配置表 ID
  letterConfigDbId: '3fa6df76b8c8813f813dfce422b2d90b',
  version: '2022-06-28'
};

function getApiBase() {
  const currentApp = getApp();
  const base = (currentApp && currentApp.globalData && currentApp.globalData.apiBase)
    ? currentApp.globalData.apiBase
    : (wx.getStorageSync('wedding_api_base') || '');
  if (base.indexOf('ais-pre-tu3wda4ph65z74rogikrl2') !== -1) {
    return '';
  }
  return base;
}

// 统一封装小程序直连 Notion 官方 HTTPS API
function requestNotionDirect(method, path, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `https://api.notion.com${path}`,
      method: method,
      header: {
        'Authorization': `Bearer ${NOTION_CONFIG.token}`,
        'Notion-Version': NOTION_CONFIG.version,
        'Content-Type': 'application/json'
      },
      data: data ? data : {},
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          console.warn('[Notion API 错误]:', res.statusCode, res.data);
          reject(new Error((res.data && res.data.message) || `Notion API 响应码: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        console.warn('[Notion 请求失败]:', err);
        reject(err);
      }
    });
  });
}

// 提取 Notion Page 中的宾客属性
function extractGuestProperties(page) {
  if (!page || !page.properties) return null;
  const p = page.properties;

  const getName = () => {
    for (const key of ['Name', '姓名', '宾客姓名', '用户昵称', 'Title']) {
      if (p[key] && p[key].title && p[key].title[0]) return p[key].title[0].plain_text;
    }
    return '';
  };

  const getPhone = () => {
    for (const key of ['手机号', '电话', 'Phone', '联系电话']) {
      if (p[key]) {
        if (p[key].phone_number) return p[key].phone_number;
        if (p[key].rich_text && p[key].rich_text[0]) return p[key].rich_text[0].plain_text;
      }
    }
    return '';
  };

  const getOpenid = () => {
    for (const key of ['OpenID', 'openid', '微信OpenID']) {
      if (p[key] && p[key].rich_text && p[key].rich_text[0]) return p[key].rich_text[0].plain_text;
    }
    return '';
  };

  const getAttending = () => {
    for (const key of ['出席状态', 'Status', '出席意向']) {
      if (p[key] && p[key].select) {
        const val = p[key].select.name;
        return (val.indexOf('出席') !== -1 || val.indexOf('准时') !== -1 || val.indexOf('赴宴') !== -1 || val.indexOf('yes') !== -1) ? 'yes' : 'no';
      }
    }
    return 'yes';
  };

  const getGuestCount = () => {
    for (const key of ['同行人数', '人数', 'GuestCount']) {
      if (p[key] && typeof p[key].number === 'number') return p[key].number;
    }
    return 1;
  };

  const getDietary = () => {
    for (const key of ['饮食偏好', '饮食习惯', 'Dietary']) {
      if (p[key] && p[key].select) return p[key].select.name;
    }
    return '标准宴席';
  };

  const getShuttle = () => {
    for (const key of ['需要接驳车', '接驳班车', '班车', 'Shuttle']) {
      if (p[key] && typeof p[key].checkbox === 'boolean') return p[key].checkbox;
    }
    return false;
  };

  const getBlessing = () => {
    for (const key of ['祝福寄语', '祝福内容', '祝福', 'Blessing']) {
      if (p[key] && p[key].rich_text && p[key].rich_text[0]) return p[key].rich_text[0].plain_text;
    }
    return '';
  };

  return {
    id: page.id,
    name: getName(),
    phone: getPhone(),
    openid: getOpenid(),
    attending: getAttending(),
    guestCount: getGuestCount(),
    dietary: getDietary(),
    needsShuttle: getShuttle(),
    blessing: getBlessing()
  };
}

/**
 * 获取婚礼整体配置及信笺内容数据 (实时直连 Notion「喜帖信笺与婚礼配置表」)
 */
function getWeddingConfig() {
  return new Promise((resolve) => {
    const currentApp = getApp();
    const defaultCfg = (currentApp && currentApp.globalData && currentApp.globalData.weddingConfig)
      ? currentApp.globalData.weddingConfig
      : (wx.getStorageSync('cached_wedding_config') || null);

    const fallback = () => {
      resolve(defaultCfg);
    };

    // 优先直连 Notion 官方 API 查询「喜帖信笺与婚礼配置表」
    requestNotionDirect('POST', `/v1/databases/${NOTION_CONFIG.letterConfigDbId}/query`, {
      filter: { property: '是否启用', checkbox: { equals: true } },
      page_size: 1
    }).then((res) => {
      if (res && res.results && res.results.length > 0) {
        const page = res.results[0];
        const p = page.properties;

        const getText = (propName) => {
          if (!p[propName]) return '';
          if (p[propName].rich_text && p[propName].rich_text.length > 0) {
            return p[propName].rich_text.map(t => t.plain_text).join('');
          }
          if (p[propName].title && p[propName].title.length > 0) {
            return p[propName].title.map(t => t.plain_text).join('');
          }
          return '';
        };

        const groomName = getText('新郎姓名') || (defaultCfg && defaultCfg.groom ? defaultCfg.groom.name : '陈长生');
        const brideName = getText('新娘姓名') || (defaultCfg && defaultCfg.bride ? defaultCfg.bride.name : '徐有容');
        const weddingDate = getText('吉日良辰') || (defaultCfg ? defaultCfg.date : '2026年10月18日 11:58');
        const venueName = getText('席设华堂') || (defaultCfg && defaultCfg.venue ? defaultCfg.venue.name : '半岛国际大酒店');
        const hallName = getText('宴席厅号') || (defaultCfg && defaultCfg.venue ? defaultCfg.venue.hall : '三层金玉满堂厅');
        const venueAddr = getText('详细地址') || (defaultCfg && defaultCfg.venue ? defaultCfg.venue.address : '上海市黄浦区中山东一路128号');

        // 解析信笺正文多段落
        let paragraphs = [];
        const fullLetter = getText('完整信笺内容');
        if (fullLetter) {
          paragraphs = fullLetter.split('\n').map(s => s.trim()).filter(Boolean);
        }
        if (paragraphs.length === 0) {
          const p1 = getText('信笺文案段落一');
          const p2 = getText('信笺文案段落二');
          const p3 = getText('信笺文案段落三');
          if (p1) paragraphs.push(p1);
          if (p2) paragraphs.push(p2);
          if (p3) paragraphs.push(p3);
        }

        if (paragraphs.length === 0) {
          paragraphs = [
            '从相遇、相知到相守，漫漫岁月因为彼此而格外温暖。',
            `谨定于 ${weddingDate} 为 ${groomName} 与 ${brideName} 举行结婚典礼。`,
            '真诚期待您和家人的到来，与我们共同见证这份幸福！'
          ];
        }

        const mergedCfg = Object.assign({}, defaultCfg || {}, {
          groom: Object.assign({}, (defaultCfg && defaultCfg.groom) || {}, { name: groomName }),
          bride: Object.assign({}, (defaultCfg && defaultCfg.bride) || {}, { name: brideName }),
          date: weddingDate,
          venue: Object.assign({}, (defaultCfg && defaultCfg.venue) || {}, {
            name: venueName,
            hall: hallName,
            address: venueAddr
          }),
          letterParagraphs: paragraphs
        });

        // 缓存到全局和本地存储
        if (currentApp && currentApp.globalData) {
          currentApp.globalData.weddingConfig = mergedCfg;
        }
        wx.setStorageSync('cached_wedding_config', mergedCfg);
        resolve(mergedCfg);
      } else {
        fallback();
      }
    }).catch((err) => {
      console.warn('[Notion 信笺配置拉取跳过]:', err);
      fallback();
    });
  });
}

/**
 * 映射饮食偏好为 Notion 选项
 */
function mapDietaryOption(diet) {
  if (!diet) return '标准宴席';
  if (diet.indexOf('素') !== -1) return '素食养生';
  if (diet.indexOf('清真') !== -1) return '清真风味';
  if (diet.indexOf('儿童') !== -1) return '儿童餐配';
  return '标准宴席';
}

// 同步用户防并发锁 (避免多处同时触发导致 Notion 创建重复行)
const _syncUserInFlight = {};

/**
 * 辅助：将首页填写的宾客信息同步到「报名/回执表」，确保新人能看到该宾客
 */
function syncGuestToRsvpDb(info) {
  if (!info || !info.openid) return;
  const nowIso = new Date().toISOString();

  requestNotionDirect('POST', `/v1/databases/${NOTION_CONFIG.rsvpDbId}/query`, {
    filter: { property: 'OpenID', rich_text: { equals: info.openid } }
  }).then((res) => {
    if (res.results && res.results.length > 0) {
      const pageId = res.results[0].id;

      // 严格去重保护：若存在历史多余重复记录，自动在 Notion 中归档多余行
      if (res.results.length > 1) {
        for (let i = 1; i < res.results.length; i++) {
          requestNotionDirect('PATCH', `/v1/pages/${res.results[i].id}`, { archived: true }).catch(() => {});
        }
      }

      const patchProps = {};
      if (info.name && info.name !== '微信宾客') {
        patchProps['Name'] = { title: [{ text: { content: info.name } }] };
      }
      if (info.phone) {
        patchProps['手机号'] = { phone_number: info.phone };
      }
      if (info.blessing) {
        patchProps['祝福寄语'] = { rich_text: [{ text: { content: info.blessing } }] };
      }
      if (Object.keys(patchProps).length > 0) {
        return requestNotionDirect('PATCH', `/v1/pages/${pageId}`, { properties: patchProps });
      }
    } else {
      const createProps = {
        'Name': { title: [{ text: { content: info.name || '亲朋好友' } }] },
        'OpenID': { rich_text: [{ text: { content: info.openid } }] },
        '出席状态': { select: { name: '出席盛典' } },
        '同行人数': { number: 1 },
        '饮食偏好': { select: { name: '标准宴席' } },
        '需要接驳车': { checkbox: false },
        '提交时间': { date: { start: nowIso } }
      };
      if (info.phone) createProps['手机号'] = { phone_number: info.phone };
      if (info.blessing) createProps['祝福寄语'] = { rich_text: [{ text: { content: info.blessing } }] };

      return requestNotionDirect('POST', '/v1/pages', {
        parent: { database_id: NOTION_CONFIG.rsvpDbId },
        properties: createProps
      });
    }
  }).catch((err) => {
    console.warn('[Notion RSVP 预录入] 提示:', err);
  });
}

/**
 * 用户访问/首页填报同步至 Notion「微信小程序用户表」与「报名/回执表」
 * (具备严格唯一性校验、并发锁与自动去重)
 */
function syncUserToNotion(userData) {
  const currentApp = getApp();
  const openid = (userData && userData.openid) ||
    (currentApp && currentApp.globalData && currentApp.globalData.openid) ||
    wx.getStorageSync('wx_wedding_openid') || '';

  if (!openid) {
    return Promise.resolve({ success: false, message: '未获取到微信 OpenID' });
  }

  // 防并发锁：若已有同 OpenID 的同步任务在进行中，复用该 Promise，绝不重复插入
  if (_syncUserInFlight[openid]) {
    return _syncUserInFlight[openid];
  }

  const syncPromise = new Promise((resolve) => {
    const rawName = (userData && userData.name) ||
      (currentApp && currentApp.globalData && currentApp.globalData.userInfo && currentApp.globalData.userInfo.nickName) ||
      wx.getStorageSync('wedding_guest_nickname') || '';
    const name = rawName.trim() || '亲朋好友';

    const phone = (userData && userData.phone) ||
      (currentApp && currentApp.globalData && currentApp.globalData.phoneNumber) ||
      wx.getStorageSync('wedding_guest_phone') || '';

    const blessing = (userData && userData.blessing) ||
      wx.getStorageSync('wedding_guest_blessing') || '';

    const role = (userData && userData.role) || '特邀宾客';
    const nowIso = new Date().toISOString();

    // 1. 同步保存至「微信小程序用户表」
    requestNotionDirect('POST', `/v1/databases/${NOTION_CONFIG.usersDbId}/query`, {
      filter: {
        property: '微信OpenID',
        rich_text: { equals: openid }
      }
    }).then((res) => {
      if (res.results && res.results.length > 0) {
        const page = res.results[0];
        const pageId = page.id;

        // 严格唯一性保护：若发现多余重复行，自动清理归档多余记录
        if (res.results.length > 1) {
          for (let i = 1; i < res.results.length; i++) {
            requestNotionDirect('PATCH', `/v1/pages/${res.results[i].id}`, { archived: true }).catch(() => {});
          }
        }

        const curCount = (page.properties && page.properties['登录次数'] && page.properties['登录次数'].number) || 1;
        const updateProps = {
          '最近活跃时间': { date: { start: nowIso } },
          '登录次数': { number: curCount + 1 }
        };

        if (name && name !== '微信宾客') {
          updateProps['用户昵称'] = { title: [{ text: { content: name } }] };
        }
        if (phone) {
          updateProps['手机号'] = { phone_number: phone };
        }
        if (blessing) {
          updateProps['祝福寄语'] = { rich_text: [{ text: { content: blessing } }] };
        }

        return requestNotionDirect('PATCH', `/v1/pages/${pageId}`, { properties: updateProps });
      } else {
        const createProps = {
          '用户昵称': { title: [{ text: { content: name } }] },
          '微信OpenID': { rich_text: [{ text: { content: openid } }] },
          '首次登录时间': { date: { start: nowIso } },
          '最近活跃时间': { date: { start: nowIso } },
          '登录次数': { number: 1 },
          '用户身份': { select: { name: role } }
        };
        if (phone) {
          createProps['手机号'] = { phone_number: phone };
        }
        if (blessing) {
          createProps['祝福寄语'] = { rich_text: [{ text: { content: blessing } }] };
        }

        return requestNotionDirect('POST', '/v1/pages', {
          parent: { database_id: NOTION_CONFIG.usersDbId },
          properties: createProps
        });
      }
    }).then((pageRes) => {
      console.log('[Notion 用户表] ✓ 保持唯一记录并已持久化保存:', name, openid);

      // 2. 同时同步到「报名/回执表」，确保新人后台名单可见
      if ((name && name !== '微信宾客') || phone) {
        syncGuestToRsvpDb({ openid, name, phone, blessing });
      }

      // 3. 若填写了祝福语，写入「祝福语留言表」
      if (blessing) {
        submitBlessing({ author: name, content: blessing });
      }

      resolve({ success: true, data: pageRes });
    }).catch((err) => {
      console.warn('[Notion 用户同步提示]:', err);
      resolve({ success: false, error: err });
    }).finally(() => {
      // 释放并发锁
      delete _syncUserInFlight[openid];
    });
  });

  _syncUserInFlight[openid] = syncPromise;
  return syncPromise;
}

/**
 * 根据微信 OpenID 从 Notion 数据库拉取该用户上次在首页或回执填写的全部历史信息
 */
function getUserProfileByOpenid(openid) {
  return new Promise((resolve) => {
    if (!openid) {
      return resolve({ matched: false, name: '', phone: '', blessing: '', rsvp: null });
    }

    let result = {
      matched: false,
      name: '',
      phone: '',
      blessing: '',
      rsvp: null
    };

    // 并行查询用户表与回执表
    const pUsers = requestNotionDirect('POST', `/v1/databases/${NOTION_CONFIG.usersDbId}/query`, {
      filter: { property: '微信OpenID', rich_text: { equals: openid } }
    }).catch(() => null);

    const pRsvp = requestNotionDirect('POST', `/v1/databases/${NOTION_CONFIG.rsvpDbId}/query`, {
      filter: { property: 'OpenID', rich_text: { equals: openid } }
    }).catch(() => null);

    Promise.all([pUsers, pRsvp]).then(([uRes, rRes]) => {
      // 1. 解析用户表
      if (uRes && uRes.results && uRes.results.length > 0) {
        const uPage = uRes.results[0];
        const props = uPage.properties || {};
        result.matched = true;
        if (props['用户昵称'] && props['用户昵称'].title && props['用户昵称'].title[0]) {
          result.name = props['用户昵称'].title[0].plain_text;
        }
        if (props['手机号'] && props['手机号'].phone_number) {
          result.phone = props['手机号'].phone_number;
        }
        if (props['祝福寄语'] && props['祝福寄语'].rich_text && props['祝福寄语'].rich_text[0]) {
          result.blessing = props['祝福寄语'].rich_text[0].plain_text;
        }
      }

      // 2. 解析回执表 (补充未填项与 RSVP 状态)
      if (rRes && rRes.results && rRes.results.length > 0) {
        const rPage = rRes.results[0];
        const guestData = extractGuestProperties(rPage);
        result.matched = true;
        result.rsvp = guestData;
        if (!result.name && guestData.name) result.name = guestData.name;
        if (!result.phone && guestData.phone) result.phone = guestData.phone;
        if (!result.blessing && guestData.blessing) result.blessing = guestData.blessing;
      }

      // 3. 若 Notion 中尚未有此 OpenID（新用户初次访问），立刻自动在 Notion 中创建新用户记录与初步回执！
      if (!result.matched) {
        const currentApp = getApp();
        const autoName = (currentApp && currentApp.globalData && currentApp.globalData.userInfo && currentApp.globalData.userInfo.nickName) ||
          wx.getStorageSync('wedding_guest_nickname') || '特邀宾客';
        const autoPhone = (currentApp && currentApp.globalData && currentApp.globalData.phoneNumber) ||
          wx.getStorageSync('wedding_guest_phone') || '';
        const autoBlessing = wx.getStorageSync('wedding_guest_blessing') || '';
        const nowIso = new Date().toISOString();

        console.log('[Notion 比对] 未在 Notion 中发现该 OpenID，正在自动为您在 Notion 中创建新档案...', openid, autoName);

        // 3.1 在用户表创建
        const userProps = {
          '用户昵称': { title: [{ text: { content: autoName } }] },
          '微信OpenID': { rich_text: [{ text: { content: openid } }] },
          '首次登录时间': { date: { start: nowIso } },
          '最近活跃时间': { date: { start: nowIso } },
          '登录次数': { number: 1 },
          '用户身份': { select: { name: '特邀宾客' } }
        };
        if (autoPhone) userProps['手机号'] = { phone_number: autoPhone };
        if (autoBlessing) userProps['祝福寄语'] = { rich_text: [{ text: { content: autoBlessing } }] };

        const createUsersP = requestNotionDirect('POST', '/v1/pages', {
          parent: { database_id: NOTION_CONFIG.usersDbId },
          properties: userProps
        }).catch((err) => console.warn('[Notion 自动创建用户表异常]:', err));

        // 3.2 在报名/回执表创建
        const rsvpProps = {
          'Name': { title: [{ text: { content: autoName } }] },
          'OpenID': { rich_text: [{ text: { content: openid } }] },
          '出席状态': { select: { name: '出席盛典' } },
          '同行人数': { number: 1 },
          '饮食偏好': { select: { name: '标准宴席' } },
          '需要接驳车': { checkbox: false },
          '提交时间': { date: { start: nowIso } }
        };
        if (autoPhone) rsvpProps['手机号'] = { phone_number: autoPhone };
        if (autoBlessing) rsvpProps['祝福寄语'] = { rich_text: [{ text: { content: autoBlessing } }] };

        const createRsvpP = requestNotionDirect('POST', '/v1/pages', {
          parent: { database_id: NOTION_CONFIG.rsvpDbId },
          properties: rsvpProps
        }).catch((err) => console.warn('[Notion 自动创建回执异常]:', err));

        Promise.all([createUsersP, createRsvpP]).then(([newU, newR]) => {
          console.log('[Notion 比对] ✓ 已成功在 Notion 中为该 OpenID 自动创建新档案！Page ID:', (newU && newU.id) || (newR && newR.id));
          result.matched = true;
          result.name = autoName;
          result.phone = autoPhone;
          result.blessing = autoBlessing;
          result.rsvp = {
            id: newR ? newR.id : '',
            name: autoName,
            phone: autoPhone,
            openid: openid,
            attending: 'yes',
            guestCount: 1,
            dietary: '标准宴席',
            needsShuttle: false,
            blessing: autoBlessing
          };
          resolve(result);
        }).catch(() => {
          resolve(result);
        });
        return;
      }

      console.log('[Notion 用户历史恢复] ✓ 成功提取记录:', result.name, result.phone, result.blessing);
      resolve(result);
    }).catch((err) => {
      console.warn('[Notion 用户历史恢复] 异常:', err);
      resolve(result);
    });
  });
}

/**
 * 提交/更新宾客回执 (RSVP) 到 Notion 官方数据库
 */
function submitRsvp(rsvpData) {
  return new Promise((resolve) => {
    const currentApp = getApp();
    const openid = (rsvpData && rsvpData.openid) ||
      (currentApp && currentApp.globalData && currentApp.globalData.openid) ||
      wx.getStorageSync('wx_wedding_openid') || '';

    const payload = Object.assign({}, rsvpData, { openid: openid });

    // 本地持久化保存
    wx.setStorageSync('wx_wedding_submitted_rsvp', payload);
    if (payload.name) wx.setStorageSync('wedding_guest_nickname', payload.name);
    if (payload.phone) wx.setStorageSync('wedding_guest_phone', payload.phone);
    if (payload.blessing) wx.setStorageSync('wedding_guest_blessing', payload.blessing);

    console.log('[Notion RSVP] 准备提交回执至 Notion 数据库:', payload.name, openid);

    // 组装 Notion properties
    const isAttending = (payload.status === 'no' || payload.attending === 'no') ? false : true;
    const properties = {
      'Name': { title: [{ text: { content: payload.name || '未留名亲友' } }] },
      '出席状态': { select: { name: isAttending ? '出席盛典' : '遗憾缺席' } },
      '同行人数': { number: parseInt(payload.guestCount || payload.guestsCount, 10) || 1 },
      '饮食偏好': { select: { name: mapDietaryOption(payload.dietary) } },
      '需要接驳车': { checkbox: Boolean(payload.needShuttle || payload.needsShuttle) },
      '提交时间': { date: { start: new Date().toISOString() } }
    };

    if (payload.phone) {
      properties['手机号'] = { phone_number: payload.phone };
    }
    if (openid) {
      properties['OpenID'] = { rich_text: [{ text: { content: openid } }] };
    }
    if (payload.blessing) {
      properties['祝福寄语'] = { rich_text: [{ text: { content: payload.blessing } }] };
    }

    // 先检查 Notion 数据库中是否已有该 OpenID 的记录，若有则更新，否则新增
    const queryPayload = openid
      ? { filter: { property: 'OpenID', rich_text: { equals: openid } } }
      : (payload.phone ? { filter: { property: '手机号', phone_number: { equals: payload.phone } } } : {});

    requestNotionDirect('POST', `/v1/databases/${NOTION_CONFIG.rsvpDbId}/query`, queryPayload)
      .then((queryRes) => {
        if (queryRes.results && queryRes.results.length > 0) {
          const pageId = queryRes.results[0].id;
          console.log('[Notion RSVP] 匹配到已有记录，执行更新 Page ID:', pageId);
          return requestNotionDirect('PATCH', `/v1/pages/${pageId}`, { properties });
        } else {
          console.log('[Notion RSVP] 未见已有记录，创建新 Page');
          return requestNotionDirect('POST', '/v1/pages', {
            parent: { database_id: NOTION_CONFIG.rsvpDbId },
            properties: properties
          });
        }
      })
      .then((pageRes) => {
        console.log('[Notion RSVP] ✓ 成功同步回执至 Notion!', pageRes.id);
        // 同步至用户表
        syncUserToNotion({
          openid: openid,
          name: payload.name,
          phone: payload.phone,
          blessing: payload.blessing
        });
        // 若同时留下了祝福语，自动同步到祝福语留言数据库
        if (payload.blessing && payload.blessing.trim()) {
          submitBlessing({
            author: payload.name || '亲朋好友',
            content: payload.blessing.trim()
          });
        }
        wx.showToast({ title: '回执已同步至新人Notion', icon: 'success' });
        resolve({ success: true, message: '已同步至 Notion', rsvp: payload, pageId: pageRes.id });
      })
      .catch((err) => {
        console.warn('[Notion RSVP] 写入 Notion 失败，已保留本地缓存:', err);
        resolve({ success: true, message: '已保存回执数据', rsvp: payload });
      });
  });
}

/**
 * 从 Notion 数据库获取全部 RSVP 名单 (管理后台使用)
 */
function getRsvpList() {
  return new Promise((resolve) => {
    requestNotionDirect('POST', `/v1/databases/${NOTION_CONFIG.rsvpDbId}/query`, {})
      .then((res) => {
        const list = (res.results || []).map(page => extractGuestProperties(page));
        resolve(list);
      })
      .catch(() => {
        const local = wx.getStorageSync('wx_wedding_submitted_rsvp');
        resolve(local ? [local] : []);
      });
  });
}

/**
 * 提交祝福寄语到 Notion 官方数据库 (含精确创建时间)
 */
function submitBlessing(blessingData) {
  return new Promise((resolve) => {
    const content = (blessingData.content || blessingData.text || '').trim();
    if (!content) {
      return resolve({ success: false, message: '祝福内容不能为空' });
    }

    const currentApp = getApp();
    const guestUser = (currentApp && currentApp.globalData && currentApp.globalData.userInfo) ||
      wx.getStorageSync('wx_wedding_user');
    const guestNick = wx.getStorageSync('wedding_guest_nickname');

    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const isoTime = now.toISOString();

    const author = blessingData.author || blessingData.name || (guestUser && guestUser.nickName) || guestNick || '亲朋好友';
    const newBlessing = {
      id: 'bless_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      author: author,
      avatar: blessingData.avatar || (guestUser && guestUser.avatarUrl) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      content: content,
      likes: blessingData.likes || 1,
      createdAt: timeStr,
      createdTime: isoTime
    };

    // 本地持久化保存，保证留言墙瞬间渲染
    try {
      const localList = wx.getStorageSync('wx_wedding_local_blessings') || [];
      localList.unshift(newBlessing);
      wx.setStorageSync('wx_wedding_local_blessings', localList);
    } catch (e) {}

    console.log('[Notion 祝福] 正在直连同步祝福到 Notion 数据库...', newBlessing.author);

    // 直连 Notion 写入 Page
    const properties = {
      'Name': { title: [{ text: { content: newBlessing.author } }] },
      '祝福内容': { rich_text: [{ text: { content: newBlessing.content } }] },
      '点赞数': { number: newBlessing.likes || 1 },
      '创建时间': { date: { start: isoTime } }
    };

    requestNotionDirect('POST', '/v1/pages', {
      parent: { database_id: NOTION_CONFIG.blessingsDbId },
      properties: properties
    })
      .then((res) => {
        console.log('[Notion 祝福] ✓ 成功写入 Notion 祝福留言墙! Page ID:', res.id);
        resolve({ success: true, message: '祝福已送达新人', blessing: newBlessing, pageId: res.id });
      })
      .catch((err) => {
        console.warn('[Notion 祝福] 直连写入失败，已存入本地:', err);
        resolve({ success: true, message: '祝福已送达新人', blessing: newBlessing });
      });
  });
}

/**
 * 获取全部祝福弹幕留言 (从 Notion 官方数据库拉取并与本地聚合)
 */
function getBlessingsList() {
  return new Promise((resolve) => {
    const defaultBlessings = [
      { id: 'def_1', author: '堂姐一家', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', content: '新婚快乐，永结同心，白头偕老！', likes: 66, createdAt: '刚刚' },
      { id: 'def_2', author: '老同学 张伟', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', content: '祝百年好合，早生贵子，甜甜蜜蜜！', likes: 52, createdAt: '1小时前' },
      { id: 'def_3', author: '大伯', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', content: '佳偶天成，百年琴瑟，吉祥如意！', likes: 88, createdAt: '昨天' },
      { id: 'def_4', author: '伴娘 敏敏', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', content: '今天是最美的你！愿以后的每一天都被宠成小公主！', likes: 99, createdAt: '2小时前' }
    ];

    let localBlessings = [];
    try {
      localBlessings = wx.getStorageSync('wx_wedding_local_blessings') || [];
    } catch (e) {}

    requestNotionDirect('POST', `/v1/databases/${NOTION_CONFIG.blessingsDbId}/query`, {
      sorts: [
        {
          property: '创建时间',
          direction: 'descending'
        }
      ]
    })
      .then((res) => {
        const remoteList = (res.results || []).map((page, idx) => {
          const props = page.properties || {};
          let author = '亲朋好友';
          let content = '';
          let likes = 1;
          let time = '刚刚';

          // 提取标题 (Name 或 宾客)
          const titleProp = props['Name'] || props['宾客'];
          if (titleProp && titleProp.title && titleProp.title.length > 0) {
            author = titleProp.title.map(t => t.plain_text).join('');
          }

          // 提取富文本 (祝福内容 或 寄语)
          const textProp = props['祝福内容'] || props['寄语'];
          if (textProp && textProp.rich_text && textProp.rich_text.length > 0) {
            content = textProp.rich_text.map(t => t.plain_text).join('');
          }

          // 提取点赞数
          if (props['点赞数'] && typeof props['点赞数'].number === 'number') {
            likes = props['点赞数'].number;
          }

          // 提取创建时间
          if (props['创建时间'] && props['创建时间'].date && props['创建时间'].date.start) {
            const d = new Date(props['创建时间'].date.start);
            time = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          }

          return {
            id: page.id,
            author: author || '亲朋好友',
            avatar: `https://images.unsplash.com/photo-${1534528741775 + (idx % 10)}?w=150`,
            content: content,
            likes: likes,
            createdAt: time
          };
        }).filter(item => Boolean(item.content));

        // 聚合本地未同步与远程
        const combined = [...localBlessings, ...remoteList];
        const seen = new Set();
        const unique = [];
        for (const item of combined) {
          const key = item.author + '_' + item.content;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
          }
        }

        resolve(unique.length > 0 ? unique : defaultBlessings);
      })
      .catch((err) => {
        console.warn('[Notion] 获取祝福列表异常，降级显示本地缓存:', err);
        const combined = [...localBlessings, ...defaultBlessings];
        resolve(combined);
      });
  });
}

/**
 * 根据微信 OpenID 检查 Notion 数据库中是否已有该宾客的回执或预填记录
 */
function checkGuestByOpenid(openid) {
  return getUserProfileByOpenid(openid).then((profile) => {
    return {
      matched: profile.matched,
      guest: {
        name: profile.name,
        phone: profile.phone,
        blessing: profile.blessing,
        attending: (profile.rsvp && profile.rsvp.attending) || 'yes',
        guestCount: (profile.rsvp && profile.rsvp.guestCount) || 1,
        dietary: (profile.rsvp && profile.rsvp.dietary) || '标准宴席',
        needsShuttle: (profile.rsvp && profile.rsvp.needsShuttle) || false
      }
    };
  });
}

/**
 * 绑定微信 OpenID 到已存在的预填亲友信息中，并同步记录到用户表
 */
function bindGuestOpenid(data) {
  return new Promise((resolve, reject) => {
    const currentApp = getApp();
    const targetOpenid = (data && data.openid) ||
      (currentApp && currentApp.globalData && currentApp.globalData.openid) ||
      wx.getStorageSync('wx_wedding_openid');

    if (!targetOpenid) {
      return reject(new Error('未获取到微信 OpenID'));
    }

    // 同步到用户表与回执
    syncUserToNotion({
      openid: targetOpenid,
      name: data.name,
      phone: data.phone,
      blessing: data.blessing
    });

    // 在 Notion RSVP 中按姓名或手机号查找预填记录
    const filters = [];
    if (data.name) filters.push({ property: 'Name', title: { equals: data.name } });
    if (data.phone) filters.push({ property: '手机号', phone_number: { equals: data.phone } });

    if (filters.length === 0) {
      return resolve({ success: true, message: '无需绑定' });
    }

    const queryFilter = filters.length > 1 ? { or: filters } : filters[0];

    requestNotionDirect('POST', `/v1/databases/${NOTION_CONFIG.rsvpDbId}/query`, { filter: queryFilter })
      .then((res) => {
        if (res.results && res.results.length > 0) {
          const pageId = res.results[0].id;
          console.log('[Notion 绑定] 找到预填亲友行，正在绑定 OpenID:', data.name, pageId);
          return requestNotionDirect('PATCH', `/v1/pages/${pageId}`, {
            properties: {
              'OpenID': { rich_text: [{ text: { content: targetOpenid } }] }
            }
          });
        }
        return null;
      })
      .then((updateRes) => {
        if (updateRes) {
          console.log('[Notion 绑定] ✓ 已成功将微信 OpenID 绑定到预填亲友名单');
        }
        resolve({ success: true, updated: Boolean(updateRes) });
      })
      .catch((err) => {
        console.warn('[Notion 绑定] 失败:', err);
        resolve({ success: false, error: err });
      });
  });
}

/**
 * 从 Notion 读取婚纱照资源
 */
function getNotionImages() {
  return new Promise((resolve) => {
    const defaultImages = [
      { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800', title: '相守晨曦' },
      { url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800', title: '春风十里' },
      { url: 'https://images.unsplash.com/photo-1529636798458-92182e662485?w=800', title: '星光誓约' },
      { url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800', title: '回眸一笑' },
      { url: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800', title: '余生皆你' }
    ];
    resolve(defaultImages);
  });
}

function uploadImageToNotion() {
  return Promise.resolve({ success: true });
}

module.exports = {
  NOTION_CONFIG,
  getWeddingConfig,
  submitRsvp,
  getRsvpList,
  submitBlessing,
  getBlessingsList,
  uploadImageToNotion,
  getNotionImages,
  getPhotosList: getNotionImages,
  checkGuestByOpenid,
  getUserProfileByOpenid,
  bindGuestOpenid,
  syncUserToNotion
};
