// utils/api.js — 小程序后端 API 封装（替代旧的 utils/notion.js 客户端直连 Notion 方案）
// 所有请求都打到 Cloudflare Worker（地址见 utils/config.js 的 BASE_URL）
// 函数命名与旧 notion.js 保持一致，页面侧基本只需替换 require 路径
const { BASE_URL } = require('./config.js');

const TOKEN_KEY = 'wx_wedding_token';
const TOKEN_EXP_KEY = 'wx_wedding_token_exp';
const OPENID_KEY = 'wx_wedding_openid';
const ADMIN_KEY = 'wx_wedding_is_admin';
const MOCK_ID_KEY = 'wx_wedding_mock_id';

// ---------------- 底层请求 ----------------

function getToken() {
  try { return wx.getStorageSync(TOKEN_KEY) || ''; } catch (e) { return ''; }
}

function getOpenid() {
  try { return wx.getStorageSync(OPENID_KEY) || ''; } catch (e) { return ''; }
}

function isAdmin() {
  try { return Boolean(wx.getStorageSync(ADMIN_KEY)); } catch (e) { return false; }
}

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
    return rawRequest(method, path, data, header).then(function (res) {
      if (res.statusCode === 401 && !retried) {
        return ensureLogin(true).then(function () { return attempt(true); });
      }
      var body = res.data || {};
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (body && body.ok) return body.data;
        if (body && body.ok === undefined) return body; // 兼容 /api/images 的裸数组形状
      }
      throw new Error((body && body.error) || ('请求失败（HTTP ' + res.statusCode + '）'));
    });
  };
  return attempt(false);
}

// wx.uploadFile 封装（multipart：file + formData 字段）
function uploadFile(path, filePath, formData) {
  return new Promise(function (resolve, reject) {
    var header = {};
    var token = getToken();
    if (token) header['Authorization'] = 'Bearer ' + token;
    wx.uploadFile({
      url: BASE_URL + path,
      filePath: filePath,
      name: 'file',
      formData: formData || {},
      header: header,
      success: function (res) {
        var body = {};
        try { body = JSON.parse(res.data || '{}'); } catch (e) {}
        if (res.statusCode >= 200 && res.statusCode < 300 && !body.error) return resolve(body);
        reject(new Error((body && body.error) || ('上传失败（HTTP ' + res.statusCode + '）')));
      },
      fail: function (err) { reject(new Error((err && err.errMsg) || '上传失败')); }
    });
  });
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
        rawRequest('POST', '/api/login', { code: res.code, mockId: mockId }).then(function (r) {
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

function cacheConfig(cfg) {
  var app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData) app.globalData.weddingConfig = cfg;
  try { wx.setStorageSync('cached_wedding_config', cfg); } catch (e) {}
}

// 合并服务端配置 + 内置默认值；服务端未配相册时自动带上相册最新图（供封面）
function getWeddingConfig() {
  var app = typeof getApp === 'function' ? getApp() : null;
  var defaults = (app && app.globalData && app.globalData.weddingConfig) || {};
  return request('GET', '/api/config').then(function (cfg) {
    var merged = Object.assign({}, defaults, cfg || {});
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
  }).catch(function () {
    // 网络失败 → 本地缓存 → 内置默认值（离线可用）
    var cached = null;
    try { cached = wx.getStorageSync('cached_wedding_config'); } catch (e) {}
    return Object.assign({}, defaults, cached || {});
  });
}

// ---------------- 相册 ----------------

function getPhotosList() {
  return request('GET', '/api/images').then(function (list) {
    return (list || []).map(function (it) {
      return { id: it.id, url: it.url, thumbUrl: it.thumb_url, title: it.title || '' };
    });
  });
}

function uploadPhoto(filePath, title) {
  return ensureLogin().then(function () {
    return uploadFile('/api/images', filePath, { title: title || '' });
  });
}

function deletePhoto(id) {
  return request('DELETE', '/api/images/' + id);
}

// ---------------- 宾客档案 / 回执 ----------------

function getMe() {
  return ensureLogin().then(function () { return request('GET', '/api/me'); });
}

// 旧签名（openid 参数保留但忽略：服务端以登录态为准），返回 {matched,name,phone,blessing,rsvp}
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
        needsShuttle: (p.rsvp && p.rsvp.needsShuttle) || false
      }
    };
  });
}

// 提交/更新回执（本地先缓存，再上报云端）
function submitRsvp(payload) {
  var data = Object.assign({}, payload || {});
  data.name = (data.name || '').trim();
  try { wx.setStorageSync('wx_wedding_submitted_rsvp', Object.assign({}, data, { openid: getOpenid() })); } catch (e) {}
  return ensureLogin().then(function () {
    return request('POST', '/api/rsvp', data);
  }).then(function () {
    return { success: true, rsvp: data };
  });
}

// 后台：全量回执列表（非管理员会被服务端 403，此处降级为空列表）
function getRsvpList() {
  return request('GET', '/api/rsvps').catch(function () {
    var local = null;
    try { local = wx.getStorageSync('wx_wedding_submitted_rsvp'); } catch (e) {}
    return local ? [local] : [];
  });
}

// ---------------- 祝福墙 ----------------

function getBlessingsList() {
  return request('GET', '/api/blessings').then(function (list) {
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
  return request('POST', '/api/blessings', {
    author: b.author || b.name || '',
    content: content,
    avatar: b.avatar || ''
  });
}

// 点赞（本地兜底默认条的 def_ 前缀 id 不请求服务端，仅本地 +1）
function likeBlessing(id) {
  var numId = parseInt(id, 10);
  if (!numId || String(numId) !== String(id)) return Promise.resolve({ liked: false });
  return request('POST', '/api/blessings/' + numId + '/like');
}

// ---------------- 用户同步 / 绑定 ----------------

// 旧名 syncUserToNotion 保留：上报昵称/手机号/祝福语（失败静默，页面不感知）
function syncUserToNotion(userData) {
  var data = userData || {};
  var name = data.name || wx.getStorageSync('wedding_guest_nickname') || '';
  var phone = data.phone || wx.getStorageSync('wedding_guest_phone') || '';
  var blessing = data.blessing || wx.getStorageSync('wedding_guest_blessing') || '';
  return ensureLogin().then(function () {
    return request('POST', '/api/users/sync', {
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

// 旧名 bindGuestOpenid 保留：把当前微信身份绑定到新人预填的宾客名单（按姓名/手机号）
function bindGuestOpenid(data) {
  var d = data || {};
  return ensureLogin().then(function () {
    return request('POST', '/api/bind', { name: d.name || '', phone: d.phone || '' });
  }).then(function (res) {
    var updated = !!(res && res.updated);
    return { success: true, updated: updated, matched: updated };
  }).catch(function (e) {
    return { success: false, updated: false, matched: false, error: e };
  });
}

// ---------------- 微信手机号 ----------------

function getPhoneNumber(code) {
  return request('POST', '/api/wechat/phone', { code: code || '' }).then(function (d) {
    return (d && d.phoneNumber) || '';
  });
}

// ---------------- 云端配置（原始）/ 保存 / 退出 ----------------

// 原始云端配置（未合并默认值与相册，供管理后台编辑用）
function getConfig() {
  return request('GET', '/api/config');
}

// 保存婚礼配置（管理员；photos 字段由相册接口管理，提交前剔除避免被白名单拒绝）
function saveConfig(cfg) {
  var out = Object.assign({}, cfg || {});
  delete out.photos;
  return request('PUT', '/api/config', out);
}

// 退出登录：清除本地 token（下次请求会自动重新静默登录）
function logout() {
  try {
    wx.removeStorageSync(TOKEN_KEY);
    wx.removeStorageSync(TOKEN_EXP_KEY);
    wx.removeStorageSync(ADMIN_KEY);
  } catch (e) {}
  var app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData) app.globalData.isAdmin = false;
}

module.exports = {
  BASE_URL: BASE_URL,
  // 登录态
  login: login,
  ensureLogin: ensureLogin,
  getToken: getToken,
  getOpenid: getOpenid,
  isAdmin: isAdmin,
  getMe: getMe,
  getConfig: getConfig,
  saveConfig: saveConfig,
  logout: logout,
  // 业务（与旧 notion.js 同名，页面侧改动最小）
  getWeddingConfig: getWeddingConfig,
  getPhotosList: getPhotosList,
  uploadPhoto: uploadPhoto,
  deletePhoto: deletePhoto,
  getUserProfileByOpenid: getUserProfileByOpenid,
  checkGuestByOpenid: checkGuestByOpenid,
  submitRsvp: submitRsvp,
  getRsvpList: getRsvpList,
  getBlessingsList: getBlessingsList,
  submitBlessing: submitBlessing,
  likeBlessing: likeBlessing,
  syncUserToNotion: syncUserToNotion,
  bindGuestOpenid: bindGuestOpenid,
  getPhoneNumber: getPhoneNumber
};
