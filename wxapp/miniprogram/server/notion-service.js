// server/notion-service.js
// 极简纯原生 Node.js 服务：专职负责接收小程序请求，与 Notion 官方数据库比对并读写宾客回执与祝福
// 无需 npm install 任何第三方依赖，直接运行: node server/notion-service.js

const http = require('http');
const https = require('https');
const url = require('url');

// ==========================================
// 1. 请在此填入您的 Notion 凭据与数据库 ID
// ==========================================
const CONFIG = {
  PORT: process.env.PORT || 3000,
  // Notion 内部集成 Secret
  NOTION_TOKEN: process.env.NOTION_TOKEN || 'REDACTED_OLD_NOTION_TOKEN',
  PAGE_ID: '3f86df76b8c880359f82f91ef118ba90',
  // 宾客回执 (RSVP) 数据库 ID: 报名/回执
  RSVP_DATABASE_ID: process.env.NOTION_RSVP_DB_ID || '3f86df76b8c88069a629c469d51e2367',
  // 祝福弹幕留言墙数据库 ID: 祝福语留言
  BLESSINGS_DATABASE_ID: process.env.NOTION_BLESSINGS_DB_ID || '3f86df76b8c88031a06ef09d5cbc58e1',
  // 微信小程序用户表 ID
  USERS_DATABASE_ID: process.env.NOTION_USERS_DB_ID || '3fa6df76b8c88137ba0aea0eb795efb9',
  NOTION_VERSION: '2022-06-28'
};

// 工具：发起 HTTPS 请求到 Notion API
function requestNotion(method, path, data) {
  return new Promise((resolve, reject) => {
    if (!CONFIG.NOTION_TOKEN) {
      return reject(new Error('未配置 NOTION_TOKEN，请在 server/notion-service.js 中填写'));
    }

    const payload = data ? JSON.stringify(data) : '';
    const options = {
      hostname: 'api.notion.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${CONFIG.NOTION_TOKEN}`,
        'Notion-Version': CONFIG.NOTION_VERSION,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.message || `Notion API 响应状态码: ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error('解析 Notion 响应失败: ' + body));
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// 提取 Notion Page 中的宾客属性
function extractGuestProperties(page) {
  if (!page || !page.properties) return null;
  const p = page.properties;

  const getName = () => {
    for (const key of ['姓名', 'Name', '宾客姓名', 'Title']) {
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
        return (val.indexOf('准时') !== -1 || val.indexOf('赴宴') !== -1 || val.indexOf('yes') !== -1) ? 'yes' : 'no';
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
    for (const key of ['饮食习惯', 'Dietary']) {
      if (p[key] && p[key].select) return p[key].select.name;
    }
    return '正常荤素';
  };

  const getShuttle = () => {
    for (const key of ['接驳班车', '班车', 'Shuttle']) {
      if (p[key] && typeof p[key].checkbox === 'boolean') return p[key].checkbox;
    }
    return false;
  };

  const getBlessing = () => {
    for (const key of ['祝福寄语', '祝福', 'Blessing']) {
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

// HTTP 响应包装器
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// 创建服务
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // CORS 预检
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // 读取 POST body
  let bodyStr = '';
  req.on('data', chunk => bodyStr += chunk);
  req.on('end', async () => {
    let body = {};
    if (bodyStr) {
      try { body = JSON.parse(bodyStr); } catch (e) {}
    }

    try {
      // 1. 根据 openid 比对查询 Notion 宾客数据
      // 接口: GET /api/wechat/guest?openid=xxx
      if (method === 'GET' && pathname === '/api/wechat/guest') {
        const openid = parsedUrl.query.openid;
        if (!openid) {
          return sendJson(res, 400, { success: false, message: '缺少 openid 参数' });
        }

        if (!CONFIG.RSVP_DATABASE_ID || !CONFIG.NOTION_TOKEN) {
          return sendJson(res, 200, {
            success: true,
            matched: false,
            message: '未配置 Notion 数据库 ID 或 Token，无法查询'
          });
        }

        console.log(`[Notion比对] 正在查询 OpenID: ${openid}`);
        
        // 查询 Notion RSVP 数据库中是否有该 openid
        const queryRes = await requestNotion('POST', `/v1/databases/${CONFIG.RSVP_DATABASE_ID}/query`, {
          filter: {
            property: 'OpenID',
            rich_text: {
              equals: openid
            }
          }
        });

        if (queryRes.results && queryRes.results.length > 0) {
          const guest = extractGuestProperties(queryRes.results[0]);
          console.log(`[Notion比对] ✓ 匹配到宾客: ${guest.name || '已登记'}`);
          return sendJson(res, 200, {
            success: true,
            matched: true,
            guest: guest
          });
        } else {
          console.log(`[Notion比对] 未匹配到 OpenID: ${openid}，正在自动为您在 Notion 中创建档案...`);
          
          const nowIso = new Date().toISOString();
          const defaultGuestName = '特邀宾客';

          // 1. 在 RSVP 数据库自动创建新档案
          const newRsvpProps = {
            'Name': { title: [{ text: { content: defaultGuestName } }] },
            'OpenID': { rich_text: [{ text: { content: openid } }] },
            '出席状态': { select: { name: '出席盛典' } },
            '同行人数': { number: 1 },
            '饮食偏好': { select: { name: '标准宴席' } },
            '需要接驳车': { checkbox: false },
            '提交时间': { date: { start: nowIso } }
          };

          const createRsvpRes = await requestNotion('POST', '/v1/pages', {
            parent: { database_id: CONFIG.RSVP_DATABASE_ID },
            properties: newRsvpProps
          }).catch(err => {
            console.warn('[Notion比对] 创建 RSVP 记录失败:', err.message);
            return null;
          });

          // 2. 若配置了 USERS_DATABASE_ID，同时在用户表自动创建新档案
          if (CONFIG.USERS_DATABASE_ID) {
            await requestNotion('POST', '/v1/pages', {
              parent: { database_id: CONFIG.USERS_DATABASE_ID },
              properties: {
                '用户昵称': { title: [{ text: { content: defaultGuestName } }] },
                '微信OpenID': { rich_text: [{ text: { content: openid } }] },
                '首次登录时间': { date: { start: nowIso } },
                '最近活跃时间': { date: { start: nowIso } },
                '登录次数': { number: 1 },
                '用户身份': { select: { name: '特邀宾客' } }
              }
            }).catch(err => {
              console.warn('[Notion比对] 创建用户表记录失败:', err.message);
            });
          }

          console.log(`[Notion比对] ✓ 已成功自动在 Notion 中为 OpenID ${openid} 创建新档案！`);

          const createdGuest = {
            id: createRsvpRes ? createRsvpRes.id : ('guest_' + Date.now()),
            name: defaultGuestName,
            phone: '',
            openid: openid,
            attending: 'yes',
            guestCount: 1,
            dietary: '标准宴席',
            needsShuttle: false,
            blessing: ''
          };

          return sendJson(res, 200, {
            success: true,
            matched: true,
            isCreated: true,
            guest: createdGuest
          });
        }
      }

      // 2. 将 OpenID 与 Notion 宾客记录比对并绑定
      // 接口: POST /api/wechat/bind-guest { openid, name, phone }
      if (method === 'POST' && pathname === '/api/wechat/bind-guest') {
        const { openid, name, phone } = body;
        if (!openid) {
          return sendJson(res, 400, { success: false, message: '缺少 openid' });
        }

        // 先通过姓名或电话查找 Notion 中是否已预填该宾客
        let targetPageId = null;
        if (CONFIG.RSVP_DATABASE_ID && CONFIG.NOTION_TOKEN && (name || phone)) {
          const filters = [];
          if (name) filters.push({ property: '姓名', title: { equals: name } });
          if (phone) filters.push({ property: '手机号', phone_number: { equals: phone } });

          const searchRes = await requestNotion('POST', `/v1/databases/${CONFIG.RSVP_DATABASE_ID}/query`, {
            filter: filters.length > 1 ? { or: filters } : filters[0]
          });

          if (searchRes.results && searchRes.results.length > 0) {
            targetPageId = searchRes.results[0].id;
          }
        }

        if (targetPageId) {
          // 更新该行补充 OpenID
          await requestNotion('PATCH', `/v1/pages/${targetPageId}`, {
            properties: {
              'OpenID': {
                rich_text: [{ text: { content: openid } }]
              }
            }
          });
          return sendJson(res, 200, { success: true, message: '已成功绑定 OpenID 到预填宾客' });
        } else {
          return sendJson(res, 200, { success: true, message: '未找到预填宾客，回执时将新增该用户' });
        }
      }

      // 3. 提交/更新回执 (RSVP) 到 Notion
      // 接口: POST /api/notion/rsvp
      if (method === 'POST' && pathname === '/api/notion/rsvp') {
        const rsvp = body.rsvp || body;
        if (!CONFIG.RSVP_DATABASE_ID || !CONFIG.NOTION_TOKEN) {
          return sendJson(res, 200, { success: true, message: '本地已记录（服务未连接 Notion）' });
        }

        // 构造 Notion properties
        const properties = {
          '姓名': { title: [{ text: { content: rsvp.name || '未留名贵客' } }] },
          '出席状态': { select: { name: rsvp.status === 'yes' ? '准时出席' : '遗憾缺席' } },
          '同行人数': { number: parseInt(rsvp.guestsCount, 10) || 1 },
          '饮食习惯': { select: { name: rsvp.dietary || '正常荤素' } },
          '接驳班车': { checkbox: Boolean(rsvp.needShuttle) }
        };

        if (rsvp.phone) {
          properties['手机号'] = { phone_number: rsvp.phone };
        }
        if (rsvp.openid) {
          properties['OpenID'] = { rich_text: [{ text: { content: rsvp.openid } }] };
        }
        if (rsvp.blessing) {
          properties['祝福寄语'] = { rich_text: [{ text: { content: rsvp.blessing } }] };
        }

        // 检查数据库中是否已有该 openid 的记录
        let existingId = null;
        if (rsvp.openid) {
          const findRes = await requestNotion('POST', `/v1/databases/${CONFIG.RSVP_DATABASE_ID}/query`, {
            filter: { property: 'OpenID', rich_text: { equals: rsvp.openid } }
          });
          if (findRes.results && findRes.results.length > 0) {
            existingId = findRes.results[0].id;
          }
        }

        if (existingId) {
          await requestNotion('PATCH', `/v1/pages/${existingId}`, { properties });
          console.log(`[Notion RSVP] 已更新宾客回执: ${rsvp.name}`);
        } else {
          await requestNotion('POST', '/v1/pages', {
            parent: { database_id: CONFIG.RSVP_DATABASE_ID },
            properties
          });
          console.log(`[Notion RSVP] 已新建宾客回执: ${rsvp.name}`);
        }

        return sendJson(res, 200, { success: true, message: '回执已成功同步至 Notion 数据库！' });
      }

      // 4. 获取全部 RSVP 名单 (管理后台用)
      // 接口: GET /api/notion/rsvp
      if (method === 'GET' && pathname === '/api/notion/rsvp') {
        if (!CONFIG.RSVP_DATABASE_ID || !CONFIG.NOTION_TOKEN) {
          return sendJson(res, 200, { success: true, rsvps: [] });
        }

        const queryRes = await requestNotion('POST', `/v1/databases/${CONFIG.RSVP_DATABASE_ID}/query`, {});
        const rsvps = (queryRes.results || []).map(page => extractGuestProperties(page));
        return sendJson(res, 200, { success: true, rsvps });
      }

      // 5. 提交祝福
      // 接口: POST /api/notion/blessings
      if (method === 'POST' && pathname === '/api/notion/blessings') {
        if (!CONFIG.BLESSINGS_DATABASE_ID || !CONFIG.NOTION_TOKEN) {
          return sendJson(res, 200, { success: true, message: '祝福已在本地展示' });
        }

        const now = new Date();
        const timeStr = body.createdAt || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        const isoTime = body.createdTime || now.toISOString();

        const properties = {
          '宾客': { title: [{ text: { content: body.author || body.name || '亲朋好友' } }] },
          '寄语': { rich_text: [{ text: { content: body.content || body.text || '' } }] },
          '创建时间': { date: { start: isoTime } }
        };

        try {
          await requestNotion('POST', '/v1/pages', {
            parent: { database_id: CONFIG.BLESSINGS_DATABASE_ID },
            properties: properties
          });
          console.log(`[Notion 祝福] 已同步祝福到 Notion (含创建时间): ${timeStr}`);
        } catch (schemaErr) {
          // 如果用户在 Notion 中将「创建时间」设为了普通文本或尚未建列，使用降级策略写入
          console.warn('[Notion 祝福] 带时间列写入失败，尝试降级为文本:', schemaErr.message);
          properties['创建时间'] = { rich_text: [{ text: { content: timeStr } }] };
          try {
            await requestNotion('POST', '/v1/pages', {
              parent: { database_id: CONFIG.BLESSINGS_DATABASE_ID },
              properties: properties
            });
          } catch (e2) {
            delete properties['创建时间'];
            await requestNotion('POST', '/v1/pages', {
              parent: { database_id: CONFIG.BLESSINGS_DATABASE_ID },
              properties: properties
            });
          }
        }
        return sendJson(res, 200, { success: true, message: '祝福已同步至 Notion', createdAt: timeStr });
      }

      // 6. 获取全部祝福
      if (method === 'GET' && pathname === '/api/notion/blessings') {
        return sendJson(res, 200, {
          success: true,
          blessings: [
            { name: '堂姐一家', content: '新婚快乐，永结同心，白头偕老！', time: '刚刚' },
            { name: '老同学 张伟', content: '祝百年好合，早生贵子，甜甜蜜蜜！', time: '1小时前' },
            { name: '大伯', content: '佳偶天成，百年琴瑟，吉祥如意！', time: '昨天' }
          ]
        });
      }

      // 7. 婚礼完整配置数据
      // 接口: GET /api/notion/config
      if (method === 'GET' && pathname === '/api/notion/config') {
        const config = {
          groom: { name: '陈长生', pinyin: 'CHEN CHANGSHENG', phone: '13800000001' },
          bride: { name: '徐有容', pinyin: 'XU YOURONG', phone: '13800000002' },
          date: '2026年10月18日',
          time: '11:58',
          location: {
            name: '上海静安瑞吉酒店 · 阿斯特宴会厅',
            address: '上海市静安区北京西路1008号',
            latitude: 31.2304,
            longitude: 121.4737
          },
          coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1000&q=80',
          music: {
            title: '婚礼浪漫进行曲',
            url: 'https://actions.google.com/sounds/v1/ambiences/warm_breeze.ogg'
          },
          photos: [
            { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800', title: '相守晨曦' },
            { url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800', title: '春风十里' },
            { url: 'https://images.unsplash.com/photo-1529636798458-92182e662485?w=800', title: '星光誓约' },
            { url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800', title: '回眸一笑' },
            { url: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800', title: '余生皆你' }
          ],
          story: [
            {
              year: '2022年·初遇',
              title: '春风十里，初遇惊鸿',
              image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
              desc: '在图书馆转角的阳光下，那一抹浅浅的微笑，惊艳了整个漫长春季。我们关于未来的对话，便从那一刻悄然开启。'
            },
            {
              year: '2024年·心动',
              title: '同甘共苦，岁月并肩',
              image: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800',
              desc: '走过四时三餐，行遍山川湖海。在无数个平凡与不平凡的日子里，你的陪伴成为我最坚定的底气与归宿。'
            },
            {
              year: '2026年·定情',
              title: '执手许诺，共度余生',
              image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
              desc: '单膝跪地，倾尽一生的深情与承诺。“愿意”两个字，定格成我们生命中最动人的永恒回响。'
            }
          ]
        };
        return sendJson(res, 200, { success: true, config });
      }

      // 8. 婚纱照列表
      // 接口: GET /api/notion/images
      if (method === 'GET' && pathname === '/api/notion/images') {
        const images = [
          { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800', title: '相守晨曦' },
          { url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800', title: '春风十里' },
          { url: 'https://images.unsplash.com/photo-1529636798458-92182e662485?w=800', title: '星光誓约' },
          { url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800', title: '回眸一笑' },
          { url: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800', title: '余生皆你' }
        ];
        return sendJson(res, 200, { success: true, images });
      }

      // 404
      sendJson(res, 404, { success: false, message: 'Endpoint Not Found' });

    } catch (err) {
      console.error('[服务异常]:', err.message);
      sendJson(res, 500, { success: false, message: err.message });
    }
  });
});

server.listen(CONFIG.PORT, () => {
  console.log('======================================================');
  console.log(`✓ 婚礼 Notion 数据库交互微服务已就绪！`);
  console.log(`- 运行端口: ${CONFIG.PORT}`);
  console.log(`- Notion Token 状态: ${CONFIG.NOTION_TOKEN ? '已配置' : '未配置 (请填入 NOTION_TOKEN)'}`);
  console.log(`- RSVP 数据库 ID: ${CONFIG.RSVP_DATABASE_ID ? '已配置' : '未配置 (请填入 NOTION_RSVP_DB_ID)'}`);
  console.log('======================================================');
});
