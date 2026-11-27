// utils/api.js — 小程序后端 API 封装（多租户：婚礼数据按 wid 隔离）
// 所有请求都打到自建后端 https://youxitie.site（地址见 utils/config.js 的 BASE_URL）
// 函数命名与旧版保持兼容，页面侧基本只需替换 require 路径
const { BASE_URL } = require('./config.js');
const media = require('./media.js');

const TOKEN_KEY = 'wx_wedding_token';
const TOKEN_EXP_KEY = 'wx_wedding_token_exp';
const OPENID_KEY = 'wx_wedding_openid';
const ADMIN_KEY = 'wx_wedding_is_admin';
const SUPER_PASSCODE_KEY = 'wx_super_admin_passcode';
const MOCK_ID_KEY = 'wx_wedding_mock_id';
const WID_KEY = 'wx_wedding_wid';

// ---------------- 登录态 / 婚礼标识 ----------------

function getSuperAdminPasscode() {
  try { return wx.getStorageSync(SUPER_PASSCODE_KEY) || ''; } catch (e) { return ''; }
}

function setSuperAdminPasscode(code) {
  try { wx.setStorageSync(SUPER_PASSCODE_KEY, code); } catch (e) {}
}

function getToken() {
  try { return wx.getStorageSync(TOKEN_KEY) || ''; } catch (e) { return ''; }
}

function getOpenid() {
  try { return wx.getStorageSync(OPENID_KEY) || ''; } catch (e) { return ''; }
}

// 当前处于哪场婚礼（扫码进入时由 app.js 写入；没有则落到测试场 demo）
var DEFAULT_WID = 'demo';

function getWid() {
  try {
    var stored = wx.getStorageSync(WID_KEY) || '';
    if (stored) return stored;
  } catch (e) {}
  try {
    var app = typeof getApp === 'function' ? getApp() : null;
    if (app && app.globalData && app.globalData.wid) return app.globalData.wid;
  } catch (e) {}
  return DEFAULT_WID;
}

function setWid(wid) {
  try {
    wx.setStorageSync(WID_KEY, wid || '');
    var app = typeof getApp === 'function' ? getApp() : null;
    if (app && app.globalData) app.globalData.wid = wid || '';
  } catch (e) {}
}

function isAdmin() {
  try { return Boolean(wx.getStorageSync(ADMIN_KEY)); } catch (e) { return false; }
}

// 给婚礼级接口拼接 ?wid=
function widPath(path) {
  var wid = getWid() || DEFAULT_WID;
  return path + (path.indexOf('?') === -1 ? '?' : '&') + 'wid=' + encodeURIComponent(wid);
}

// ---------------- 底层请求 ----------------

function rawRequest(method, path, data, header) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: BASE_URL + path,
      method: method,
      data: data || {},
      header: Object.assign({ 'Content-Type': 'application/json' }, header || {}),
      success: function (res) { resolve(res); },
      fail: function (err) { reject(new Error((err && err.errMsg) || '网络请求失败')); }
    });
  });
}

// 统一请求：解包 {ok,data} / {ok,error}；401 自动重登一次并重放
function request(method, path, data) {
  var attempt = function (retried) {
    var header = {};
    var token = getToken();
    if (token) header['Authorization'] = 'Bearer ' + token;
    var pass = getSuperAdminPasscode();
    if (pass) header['x-admin-passcode'] = pass;
    return rawRequest(method, path, data, header).then(function (res) {
      if (res.statusCode === 401 && !retried) {
        return ensureLogin(true).then(function () { return attempt(true); });
      }
      var body = res.data || {};
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (body && body.ok) return body.data;
        if (body && body.ok === undefined) return body; // 兼容 /api/images 的裸数组形状
      }
      var err = new Error((body && body.error) || ('请求失败（HTTP ' + res.statusCode + '）'));
      if (res.statusCode === 404) err.notFound = true;
      if (body && body.code) err.code = body.code;
      if (body && body.data) err.data = body.data;
      if (body && body.code === 'WEDDING_DISABLED') err.disabled = true; // 婚礼被平台停用
      if (res.statusCode === 402 || (body && body.needUpgrade)) err.needUpgrade = true; // 超出免费版限制
      if (res.statusCode === 422) err.blocked = true; // 内容安全拦截
      throw err;
    });
  };
  return attempt(false);
}

// wx.uploadFile 封装（multipart：file + formData 字段）
function uploadFile(path, filePath, formData) {
  var attempt = function (retried) {
    return new Promise(function (resolve, reject) {
      var header = {};
      var token = getToken();
      if (token) header['Authorization'] = 'Bearer ' + token;
      var pass = getSuperAdminPasscode();
      if (pass) header['x-admin-passcode'] = pass;
      wx.uploadFile({
        url: BASE_URL + path,
        filePath: filePath,
        name: 'file',
        formData: formData || {},
        header: header,
        success: function (res) {
          var body = {};
          try { body = JSON.parse(res.data || '{}'); } catch (e) {}
          if (res.statusCode === 401 && !retried) {
            ensureLogin(true).then(function () { attempt(true).then(resolve, reject); }).catch(reject);
            return;
          }
          if (res.statusCode >= 200 && res.statusCode < 300 && body && body.ok !== false && !body.error) {
            return resolve(body.data !== undefined ? body.data : body);
          }
          var upErr = new Error((body && body.error) || ('上传失败（HTTP ' + res.statusCode + '）'));
          if (res.statusCode === 402 || (body && body.needUpgrade)) upErr.needUpgrade = true;
          reject(upErr);
        },
        fail: function (err) { reject(new Error((err && err.errMsg) || '上传失败')); }
      });
    });
  };
  return attempt(false);
}

// ---------------- 登录 ----------------

var _loginPromise = null; // 并发去重：多处同时触发只登一次

function doLogin() {
  return new Promise(function (resolve, reject) {
    wx.login({
      success: function (res) {
        if (!res.code) return reject(new Error('wx.login 未返回 code'));
        // 本地持久化的随机 mockId：仅服务端 mock 模式使用（本地开发），保证身份稳定
        var mockId = '';
        try { mockId = wx.getStorageSync(MOCK_ID_KEY) || ''; } catch (e) {}
        if (!mockId) {
          mockId = 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
          try { wx.setStorageSync(MOCK_ID_KEY, mockId); } catch (e) {}
        }
        rawRequest('POST', '/api/login', { code: res.code, mockId: mockId, wid: getWid() }).then(function (r) {
          var body = r.data || {};
          if (r.statusCode >= 200 && r.statusCode < 300 && body.ok) {
            var d = body.data;
            try {
              wx.setStorageSync(TOKEN_KEY, d.token);
              wx.setStorageSync(TOKEN_EXP_KEY, d.exp);
              wx.setStorageSync(OPENID_KEY, d.openid);
              wx.setStorageSync(ADMIN_KEY, !!d.isAdmin);
            } catch (e) {}
            var app = typeof getApp === 'function' ? getApp() : null;
            if (app && app.globalData) {
              app.globalData.openid = d.openid;
              app.globalData.isAdmin = !!d.isAdmin;
              app.globalData.isLoggedIn = true;
            }
            if (d.mock) console.warn('[api] 当前为 mock 登录（本地开发模式），openid：' + d.openid);
            if (d.wid && d.widExists === false) console.warn('[api] 婚礼 ' + d.wid + ' 不存在或未开通');
            resolve(d);
          } else {
            reject(new Error((body && body.error) || ('登录失败（HTTP ' + r.statusCode + '）')));
          }
        }).catch(reject);
      },
      fail: function (err) { reject(new Error((err && err.errMsg) || 'wx.login 调用失败')); }
    });
  });
}

// 确保有可用登录态（token 未过期则直接用；过期/缺失则重新登录）
function ensureLogin(force) {
  var token = getToken();
  var exp = 0;
  try { exp = Number(wx.getStorageSync(TOKEN_EXP_KEY) || 0); } catch (e) {}
  if (!force && token && exp * 1000 > Date.now() + 60 * 1000) {
    return Promise.resolve({ openid: getOpenid(), token: token });
  }
  if (_loginPromise) return _loginPromise;
  var p = doLogin().then(
    function (d) { _loginPromise = null; return d; },
    function (e) { _loginPromise = null; throw e; }
  );
  _loginPromise = p;
  return p;
}

function login() {
  return ensureLogin(true);
}

// ---------------- 婚礼配置 ----------------

const VALID_THEMES = ['red', 'pink', 'night', 'forest', 'champagne'];
function normalizeThemeKey(t) {
  return VALID_THEMES.indexOf(t) !== -1 ? t : '';
}

function cacheConfig(cfg) {
  var app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData) {
    app.globalData.weddingConfig = cfg;
    if (cfg && cfg.theme && typeof app.applyTheme === 'function') {
      app.applyTheme(cfg.theme);
    }
  }
  try {
    wx.setStorageSync('cached_wedding_config_' + (getWid() || 'none'), cfg);
    if (cfg && cfg.theme) {
      wx.setStorageSync('wx_wedding_theme_' + (getWid() || 'none'), cfg.theme);
    }
  } catch (e) {}
}

// 合并服务端配置 + 内置默认值；服务端未配相册时自动带上相册最新图（供封面）
// 注：无 wid（推广页场景）直接返回本地默认值；婚礼不存在时抛出 err.notFound 交给页面处理
function getWeddingConfig() {
  var app = typeof getApp === 'function' ? getApp() : null;
  var defaults = (app && app.globalData && app.globalData.weddingConfig) || {};
  var cached = null;
  var savedTheme = '';
  try {
    cached = wx.getStorageSync('cached_wedding_config_' + (getWid() || 'none'));
    savedTheme = normalizeThemeKey(wx.getStorageSync('wx_wedding_theme_' + (getWid() || 'none')));
  } catch (e) {}
  var fallback = Object.assign({}, defaults, cached || {});
  if (savedTheme && !fallback.theme) fallback.theme = savedTheme;
  if (!getWid()) return Promise.resolve(fallback);

  return request('GET', widPath('/api/config')).then(function (cfg) {
    var merged = Object.assign({}, defaults, cfg || {});
    var ensureTheme = normalizeThemeKey(merged.theme)
      ? Promise.resolve(normalizeThemeKey(merged.theme))
      : request('GET', widPath('/api/lottery')).then(function (lt) {
          return normalizeThemeKey(lt && lt.theme) || savedTheme || 'red';
        }).catch(function () {
          return savedTheme || 'red';
        });

    return ensureTheme.then(function (resolvedTheme) {
      merged.theme = resolvedTheme || 'red';
      if (!merged.photos || !merged.photos.length) {
        return getPhotosList().then(function (photos) {
          merged.photos = photos || [];
          cacheConfig(merged);
          return merged;
        }, function () {
          cacheConfig(merged);
          return merged;
        });
      }
      cacheConfig(merged);
      return merged;
    });
  }).catch(function (e) {
    if (e && (e.notFound || e.disabled)) throw e; // 婚礼不存在 / 被平台停用 → 页面展示提示
    return fallback; // 网络失败 → 本地缓存 → 内置默认值（离线可用）
  });
}

// 平台推广页配置（无 wid 时展示；返回 {} 则客户端用内置默认文案）
function getPromo() {
  return request('GET', '/api/promo').catch(function () { return {}; });
}

// ---------------- 相册（按婚礼） ----------------

function tagAlbumPhotos(list) {
  return (list || []).map(function (it) {
    return media.tagMedia({
      id: it.id,
      url: it.url,
      thumbUrl: it.thumb_url,
      thumb_url: it.thumb_url,
      title: it.title || '',
      kind: it.kind
    });
  });
}

function getPhotosList() {
  return request('GET', widPath('/api/images')).then(tagAlbumPhotos);
}

function moveAlbumPhoto(id, targetId, after) {
  return request('PUT', widPath('/api/images/order'), { id: id, targetId: targetId, after: after }).then(tagAlbumPhotos);
}

function uploadPhoto(filePath, title) {
  return ensureLogin().then(function () {
    return uploadFile(widPath('/api/images'), filePath, { title: title || '' });
  });
}

// 只上传图片拿地址、不登记进婚纱相册（岁月印记等配图用；服务端 gallery=0）
function uploadMedia(filePath, title) {
  return ensureLogin().then(function () {
    return uploadFile(widPath('/api/images'), filePath, { title: title || '', gallery: '0' });
  }).then(function (d) {
    var url = (d && (d.url || d.thumb_url)) || '';
    if (!url) throw new Error('上传成功但未返回图片地址');
    return media.tagMedia({ url: url, thumb_url: d.thumb_url, kind: d.kind || 'image' });
  });
}

function deletePhoto(id) {
  return request('DELETE', widPath('/api/images/' + id));
}

// 七牛视频直传：向服务端要凭证（含 uploadUrl），再由 qiniu-upload.js 直传到七牛，最后调用 saveVideo 登记。
function getVideoUploadToken(opts) {
  return ensureLogin().then(function () {
    return request('POST', widPath('/api/videos/token'), opts || {});
  });
}

function saveVideo(body) {
  return ensureLogin().then(function () {
    return request('POST', widPath('/api/videos'), body || {});
  });
}

// ---------------- 宾客档案 / 回执（按婚礼） ----------------

function getMe() {
  return ensureLogin().then(function () { return request('GET', widPath('/api/me')); });
}

// 旧签名（openid 参数保留但忽略：服务端以登录态 + 当前婚礼为准）
function getUserProfileByOpenid() {
  return getMe().catch(function () {
    return { matched: false, name: '', phone: '', blessing: '', rsvp: null };
  });
}

// 旧签名保留，返回 {matched, guest:{...}}（回执页表单恢复用）
function checkGuestByOpenid() {
  return getUserProfileByOpenid().then(function (p) {
    return {
      matched: !!p.matched,
      guest: {
        name: p.name || '',
        phone: p.phone || '',
        blessing: p.blessing || '',
        attending: (p.rsvp && p.rsvp.attending) || 'yes',
        guestCount: (p.rsvp && p.rsvp.guestCount) || 1,
        dietary: (p.rsvp && p.rsvp.dietary) || '正常荤素',
        needsShuttle: (p.rsvp && p.rsvp.needShuttle) || false
      }
    };
  });
}

// 提交/更新回执（本地先缓存，再上报云端；同一微信在不同婚礼下各自独立）
function submitRsvp(payload) {
  var data = Object.assign({}, payload || {});
  data.name = (data.name || '').trim();
  try { wx.setStorageSync('wx_wedding_submitted_rsvp_' + (getWid() || 'none'), Object.assign({}, data, { openid: getOpenid() })); } catch (e) {}
  return ensureLogin().then(function () {
    return request('POST', widPath('/api/rsvp'), data);
  }).then(function () {
    return { success: true, rsvp: data };
  });
}

// 后台：当前婚礼的全量回执列表（非该婚礼管理员会被服务端 403，此处降级为空列表）
function getRsvpList() {
  return request('GET', widPath('/api/rsvps')).catch(function () {
    var local = null;
    try { local = wx.getStorageSync('wx_wedding_submitted_rsvp_' + (getWid() || 'none')); } catch (e) {}
    return local ? [local] : [];
  });
}

// ---------------- 祝福墙（按婚礼） ----------------

function getBlessingsList() {
  return request('GET', widPath('/api/blessings')).then(function (list) {
    return (list || []).map(function (item) {
      return {
        id: item.id,
        author: item.author || '挚友',
        avatar: item.avatar || '',
        content: item.content || '',
        likes: item.likes || 0,
        createdAt: item.createdAt || '刚刚'
      };
    });
  });
}

function submitBlessing(blessingData) {
  var b = blessingData || {};
  var content = (b.content || b.text || '').trim();
  if (!content) return Promise.reject(new Error('祝福内容不能为空'));
  return request('POST', widPath('/api/blessings'), {
    author: b.author || b.name || '',
    content: content,
    avatar: b.avatar || ''
  });
}


// 「为新人送上新婚祝愿」心动次数（真实落库）
function getHearts() {
  return request('GET', widPath('/api/hearts'));
}

function sendHeart() {
  return request('POST', widPath('/api/hearts'), {});
}

// 点赞（本地兜底默认条的 def_ 前缀 id 不请求服务端，仅本地 +1）
function likeBlessing(id) {
  var numId = parseInt(id, 10);
  if (!numId || String(numId) !== String(id)) return Promise.resolve({ liked: false });
  return request('POST', '/api/blessings/' + numId + '/like');
}

// ---------------- 用户同步 / 绑定（按婚礼） ----------------

// 上报昵称/手机号/祝福语（同一微信在不同婚礼各自一行；失败静默）
function syncUserToNotion(userData) {
  if (!getWid()) return Promise.resolve({ synced: false });
  var data = userData || {};
  var name = data.name || wx.getStorageSync('wedding_guest_nickname') || '';
  var phone = data.phone || wx.getStorageSync('wedding_guest_phone') || '';
  var blessing = data.blessing || wx.getStorageSync('wedding_guest_blessing') || '';
  return ensureLogin().then(function () {
    return request('POST', widPath('/api/users/sync'), {
      name: name,
      phone: phone,
      blessing: blessing,
      avatarUrl: data.avatarUrl || ''
    });
  }).catch(function (e) {
    console.warn('[api] 用户同步失败（离线降级）:', e && e.message);
    return { synced: false };
  });
}

// 把当前微信身份绑定到「当前婚礼」新人预填的宾客名单（按姓名/手机号）
function bindGuestOpenid(data) {
  if (!getWid()) return Promise.resolve({ success: false, updated: false, matched: false });
  var d = data || {};
  return ensureLogin().then(function () {
    return request('POST', widPath('/api/bind'), { name: d.name || '', phone: d.phone || '' });
  }).then(function (res) {
    var updated = !!(res && res.updated);
    return { success: true, updated: updated, matched: updated };
  }).catch(function (e) {
    return { success: false, updated: false, matched: false, error: e };
  });
}

// ---------------- 二维码 / 手机号 ----------------

// 当前婚礼的小程序码图片地址（管理后台展示用；token 走 query，<image> 无法带 header）
function getQrCodeUrl(envVersion) {
  var wid = getWid();
  if (!wid) return '';
  var token = getToken();
  return BASE_URL + '/api/admin/qrcode?wid=' + encodeURIComponent(wid) +
    '&env=' + encodeURIComponent(envVersion || 'release') +
    (token ? '&token=' + encodeURIComponent(token) : '');
}

function getPhoneNumber(code) {
  return request('POST', '/api/wechat/phone', { code: code || '' }).then(function (d) {
    return (d && d.phoneNumber) || '';
  });
}

// ---------------- 云端配置（原始）/ 保存 / 退出 ----------------

// 原始云端配置（未合并默认值与相册，供管理后台编辑用；按当前婚礼）
function getConfig() {
  return request('GET', widPath('/api/config'));
}

// 保存婚礼配置（当前婚礼管理员；photos 字段由相册接口管理，提交前剔除）
function saveConfig(cfg) {
  var out = Object.assign({}, cfg || {});
  delete out.photos;
  return request('PUT', widPath('/api/config'), out);
}

// ---------------- 现场抽奖（数据存 lotteries 表，不影响婚礼配置） ----------------

// 大屏网址（电脑 / 投影浏览器打开并全屏）
function getLotteryScreenUrl() {
  return BASE_URL + '/lottery?wid=' + encodeURIComponent(getWid() || DEFAULT_WID);
}

// 管理端完整数据：{ config:{prizes,participants}, state:{status,prizeId,revealAt,results}, remainingCount, serverNow, rollMs, message }
function getLotteryAdmin() {
  return request('GET', widPath('/api/lottery/admin'));
}

// 保存奖项 / 参与名单 / 婚礼与大屏主题（传哪个改哪个）：{ prizes?:[{id,name,reward,count}], participants?:[{id,name,source}], theme?:'red'|'pink'|'night'|'forest'|'champagne' }
function saveLotteryConfig(data) {
  var payload = data || {};
  return request('PUT', widPath('/api/lottery/config'), payload).then(function (res) {
    if (payload.theme && normalizeThemeKey(payload.theme)) {
      var t = normalizeThemeKey(payload.theme);
      try {
        wx.setStorageSync('wx_wedding_theme_' + (getWid() || 'none'), t);
        var cached = wx.getStorageSync('cached_wedding_config_' + (getWid() || 'none')) || {};
        cached.theme = t;
        wx.setStorageSync('cached_wedding_config_' + (getWid() || 'none'), cached);
      } catch (e) {}
      var app = typeof getApp === 'function' ? getApp() : null;
      if (app && typeof app.applyTheme === 'function') {
        app.applyTheme(t);
      }
      // 同步写入婚礼主配置 weddings.config.theme，让请柬首页、相册、日程、回执、祝福页全局生效
      request('PUT', widPath('/api/config'), { theme: t }).catch(function () {});
    }
    return res;
  });
}

function importLotteryRsvp() {
  return request('POST', widPath('/api/lottery/import-rsvp'), {});
}

function startLottery(prizeId) {
  return request('POST', widPath('/api/lottery/start'), { prizeId: prizeId });
}

function redrawLottery(prizeId) {
  return request('POST', widPath('/api/lottery/redraw'), { prizeId: prizeId });
}

function revealLottery() {
  return request('POST', widPath('/api/lottery/reveal'), {});
}

// mode: 'idle' 大屏回到等待页 / 'board' 大屏展示全部中奖名单
function setLotteryScreen(mode) {
  return request('POST', widPath('/api/lottery/screen'), { mode: mode });
}

function resetLottery() {
  return request('POST', widPath('/api/lottery/reset'), {});
}

function superAdminLogin(passcode) {
  return rawRequest('POST', '/api/superadmin/login', { passcode: passcode }).then(function (res) {
    if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.ok) {
      setSuperAdminPasscode(passcode);
      wx.setStorageSync(ADMIN_KEY, '1');
      var app = typeof getApp === 'function' ? getApp() : null;
      if (app && app.globalData) app.globalData.isAdmin = true;
      return res.data.data;
    }
    throw new Error((res.data && res.data.error) || '超级管理员口令错误');
  });
}

function getSuperAdminWeddings() {
  return request('GET', '/api/superadmin/weddings');
}

function saveSuperAdminWedding(data) {
  return request('POST', '/api/superadmin/wedding', data);
}

function updateSuperAdminPasscode(newPasscode) {
  return request('PUT', '/api/superadmin/passcode', { newPasscode: newPasscode });
}

// ---------------- 套餐 / 支付 ----------------

// { plans:[{code,name,level,priceFen,originalFen,days,desc,features,ent}], themes, wedding:{plan,planName,level,premium,expired,expiresAt,ent,usage,canUpgrade}, payMode:'wxpay'|'mock'|'unavailable', pricing(旧结构) }
function getPlan() {
  return request('GET', widPath('/api/plan'));
}

// 创建套餐订单（product = 套餐 code，默认高级版）：{ orderNo, product, amountFen, description, mock, payParams? }
function createPayOrder(product) {
  return request('POST', widPath('/api/pay/order'), { product: product || 'premium' });
}

function getPayOrder(orderNo) {
  return request('GET', widPath('/api/pay/order/' + encodeURIComponent(orderNo)));
}

// 仅服务端开启 PAY_MOCK 时可用（测试）
function mockConfirmPay(orderNo) {
  return request('POST', widPath('/api/pay/mock-confirm'), { orderNo: orderNo });
}

// 超出免费版限制时统一引导升级；返回 true 表示已处理
function handleUpgradeError(err) {
  if (!err || !err.needUpgrade) return false;
  wx.showModal({
    title: '升级套餐',
    content: (err.message || '该功能需要升级套餐') + '',
    confirmText: '去升级',
    confirmColor: '#8B1E1E',
    success: function (r) { if (r.confirm) wx.navigateTo({ url: '/pages/upgrade/upgrade' }); }
  });
  return true;
}

// 退出登录：清除本地 token（下次请求会自动重新静默登录）
function logout() {
  try {
    wx.removeStorageSync(TOKEN_KEY);
    wx.removeStorageSync(TOKEN_EXP_KEY);
    wx.removeStorageSync(ADMIN_KEY);
    wx.removeStorageSync(SUPER_PASSCODE_KEY);
  } catch (e) {}
  var app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData) app.globalData.isAdmin = false;
}

// ---------------- 试用账号 / 自定义背景音乐 ----------------

function getAccount() {
  return ensureLogin().then(function () {
    return request('GET', widPath('/api/account'));
  });
}

function bindAccount(data) {
  return ensureLogin().then(function () {
    return request('POST', '/api/account/bind', data || {});
  });
}

function verifyAccountPassword(password) {
  return ensureLogin().then(function () {
    return request('POST', '/api/account/verify', { password: password });
  });
}

function startTrialWedding(data) {
  return ensureLogin().then(function () {
    return request('POST', '/api/account/start', data || {});
  });
}

function getMusic() {
  return request('GET', widPath('/api/music'));
}

function getMusicUploadToken(filename) {
  return ensureLogin().then(function () {
    return request('POST', widPath('/api/music/token'), { filename: filename || '' });
  });
}

function saveMusic(data) {
  return ensureLogin().then(function () {
    return request('POST', widPath('/api/music'), data || {});
  });
}

function deleteMusic() {
  return ensureLogin().then(function () {
    return request('DELETE', widPath('/api/music'));
  });
}


module.exports = {
  BASE_URL: BASE_URL,
  // 登录态 / 婚礼标识
  login: login,
  ensureLogin: ensureLogin,
  getToken: getToken,
  getOpenid: getOpenid,
  getWid: getWid,
  setWid: setWid,
  isAdmin: isAdmin,
  getMe: getMe,
  getPromo: getPromo,
  getQrCodeUrl: getQrCodeUrl,
  // 超级管理员功能
  getSuperAdminPasscode: getSuperAdminPasscode,
  setSuperAdminPasscode: setSuperAdminPasscode,
  superAdminLogin: superAdminLogin,
  getSuperAdminWeddings: getSuperAdminWeddings,
  saveSuperAdminWedding: saveSuperAdminWedding,
  updateSuperAdminPasscode: updateSuperAdminPasscode,
  // 业务（与旧版同名，页面侧改动最小）
  getWeddingConfig: getWeddingConfig,
  getConfig: getConfig,
  saveConfig: saveConfig,
  getPhotosList: getPhotosList,
  moveAlbumPhoto: moveAlbumPhoto,
  uploadPhoto: uploadPhoto,
  uploadMedia: uploadMedia,
  deletePhoto: deletePhoto,
  getVideoUploadToken: getVideoUploadToken,
  saveVideo: saveVideo,
  getUserProfileByOpenid: getUserProfileByOpenid,
  checkGuestByOpenid: checkGuestByOpenid,
  submitRsvp: submitRsvp,
  getRsvpList: getRsvpList,
  getBlessingsList: getBlessingsList,
  submitBlessing: submitBlessing,
  likeBlessing: likeBlessing,
  getHearts: getHearts,
  sendHeart: sendHeart,
  syncUserToNotion: syncUserToNotion,
  bindGuestOpenid: bindGuestOpenid,
  getPhoneNumber: getPhoneNumber,
  getAccount: getAccount,
  bindAccount: bindAccount,
  verifyAccountPassword: verifyAccountPassword,
  startTrialWedding: startTrialWedding,
  getMusic: getMusic,
  getMusicUploadToken: getMusicUploadToken,
  saveMusic: saveMusic,
  deleteMusic: deleteMusic,
  // 现场抽奖
  getLotteryScreenUrl: getLotteryScreenUrl,
  getLotteryAdmin: getLotteryAdmin,
  saveLotteryConfig: saveLotteryConfig,
  importLotteryRsvp: importLotteryRsvp,
  startLottery: startLottery,
  redrawLottery: redrawLottery,
  revealLottery: revealLottery,
  setLotteryScreen: setLotteryScreen,
  resetLottery: resetLottery,
  // 套餐 / 支付
  getPlan: getPlan,
  createPayOrder: createPayOrder,
  getPayOrder: getPayOrder,
  mockConfirmPay: mockConfirmPay,
  handleUpgradeError: handleUpgradeError,
  logout: logout
};
