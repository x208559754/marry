// app.js - 微信小程序全局入口逻辑（多租户：扫码带 wid 进入对应婚礼；见 utils/api.js）
// 安全说明：AppSecret 已从客户端移除，jscode2session 由 Worker 服务端完成
const api = require('./utils/api.js');

const THEME_NAV_COLORS = {
  red: '#8B1E1E',
  pink: '#C84B73',
  night: '#2E2770',
  forest: '#2C5A3E',
  champagne: '#967035'
};

App({
  globalData: {
    // 当前登录用户信息（登录结果由 utils/api.js 写入本地缓存与全局）
    userInfo: null,
    openid: '',
    sessionKey: '',
    unionid: '',
    phoneNumber: '',
    isLoggedIn: false,
    matchedGuest: null,

    // 当前进入的婚礼标识（扫码/分享链接带 wid=xxx；为空 = 推广页）
    wid: '',
    // 该 wid 对应的婚礼不存在或未开通
    weddingNotFound: false,
    // 当前婚礼主题（'red' | 'pink' | 'night' | 'forest' | 'champagne'）
    theme: 'red',

    // 婚礼配置内置默认值（云端 /api/config?wid= 会 merge 覆盖；字段结构与后端一致）
    weddingConfig: {
      groom: { name: '陈长生', pinyin: 'CHEN CHANGSHENG', phone: '13800000001' },
      bride: { name: '徐有容', pinyin: 'XU YOURONG', phone: '13800000002' },
      date: '2026年10月18日',
      time: '11:58',
      venue: {
        name: '上海静安瑞吉酒店 · 阿斯特宴会厅',
        hall: '阿斯特宴会厅',
        address: '上海市静安区北京西路1008号',
        latitude: 31.2304,
        longitude: 121.4737
      },
      contacts: { groomPhone: '13800000001', bridePhone: '13800000002' },
      coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1000&q=80',
      photos: [],
      music: {
        title: '红笺良辰',
        url: 'https://youxitie.site/brand/bgm.mp3'
      },
      letterParagraphs: [
        '从相遇、相知到相守，漫漫岁月因为彼此而格外温暖。',
        '谨定于 2026年10月18日 为 陈长生 与 徐有容 举行结婚典礼。',
        '真诚期待您和家人的到来，与我们共同见证这份幸福！'
      ]
    },

    // 背景音频播放管理器
    bgmContext: null,
    isPlayingBgm: false,

    // 是否当前婚礼的管理员（由 api 登录结果写入，按婚礼区分）
    isAdmin: false,

    // 全屏祝福弹幕状态与缓存（跨页面共享，发新祝福立即飘屏）
    danmakuVisible: true,
    blessingsCache: [],
    blessingsCacheWid: '',
    blessingsLoadedAt: 0
  },

  onLaunch: function (options) {
    console.log('[小程序] 婚礼请柬启动');

    // 1. 读取本地持久化的用户信息
    this.initUserStorage();

    // 2. 解析进入参数（扫码/分享链接里的 wid）
    this.resolveEntry(options);

    // 3. 静默微信登录（服务端 jscode2session；本地开发走 mock），换取 token 与 openid
    this.doWxLogin();

    // 4. 从云端同步当前婚礼的配置与相册（无 wid 时跳过，展示推广页）
    this.syncWeddingConfig();

    // 5. 初始化背景音乐
    this.initBackgroundMusic();
  },

  onShow: function (options) {
    // 热启动（例如从聊天里再扫一次码进来）也要解析进入参数
    var before = this.globalData.wid;
    this.resolveEntry(options || (wx.getEnterOptionsSync ? wx.getEnterOptionsSync() : null));
    if (this.globalData.wid && this.globalData.wid !== before) {
      // 切到了另一场婚礼：重新登录刷新该婚礼的管理员身份，并同步新配置
      this.doWxLogin();
      this.syncWeddingConfig();
    }
    this.updateTabBarVisibility && this.updateTabBarVisibility();
  },

  // 解析启动参数：支持 query.wid 与小程序码 scene（scene 可为 "xxx" 或 "wid=xxx"）
  resolveEntry: function (options) {
    try {
      var q = (options && options.query) || {};
      var wid = '';
      if (q.wid) {
        wid = String(q.wid);
      } else if (q.scene) {
        var scene = '';
        try { scene = decodeURIComponent(String(q.scene)); } catch (e) { scene = String(q.scene); }
        var m = /(?:^|&)wid=([^&]+)/.exec(scene);
        wid = m ? m[1] : scene;
      }
      wid = String(wid || '').trim().slice(0, 32);
      if (wid) {
        if (this.globalData.wid !== wid) {
          console.log('[入口] 进入婚礼:', wid);
          this.globalData.weddingNotFound = false;
        }
        wx.setStorageSync('wx_wedding_wid', wid);
        this.globalData.wid = wid;
      } else {
        // 没有扫码参数：沿用上次进入的婚礼；若首次进入默认进入 demo 测试场
        var fallback = wx.getStorageSync('wx_wedding_wid') || 'demo';
        wx.setStorageSync('wx_wedding_wid', fallback);
        this.globalData.wid = fallback;
      }
    } catch (e) {
      console.warn('解析进入参数失败:', e);
    }
  },

  // 读取本地缓存
  initUserStorage: function () {
    try {
      const userInfo = wx.getStorageSync('wx_wedding_user');
      const phone = wx.getStorageSync('wx_wedding_phone');
      const openid = wx.getStorageSync('wx_wedding_openid');
      const unionid = wx.getStorageSync('wx_wedding_unionid');
      const savedRsvp = wx.getStorageSync('wx_wedding_submitted_rsvp_' + (this.globalData.wid || 'none'));
      const cachedConfig = wx.getStorageSync('cached_wedding_config_' + (this.globalData.wid || 'none'));

      if (userInfo) this.globalData.userInfo = userInfo;
      if (phone) this.globalData.phoneNumber = phone;
      if (openid) this.globalData.openid = openid;
      if (unionid) this.globalData.unionid = unionid;
      if (savedRsvp) this.globalData.matchedGuest = savedRsvp;
      if (cachedConfig) {
        this.globalData.weddingConfig = Object.assign({}, this.globalData.weddingConfig, cachedConfig);
      }
      this.globalData.isAdmin = api.isAdmin();
      if (userInfo || phone || openid) this.globalData.isLoggedIn = true;
    } catch (e) {
      console.warn('读取本地用户信息失败:', e);
    }
  },

  // 微信登录：wx.login → Worker /api/login（服务端换 openid；客户端永不接触 AppSecret）
  doWxLogin: function (callback) {
    const that = this;
    api.login().then(function (d) {
      console.log('[微信登录] 成功:', d.openid, d.mock ? '(mock 本地开发模式)' : '', d.wid ? ('婚礼: ' + d.wid) : '(无 wid，推广页)');
      that.globalData.openid = d.openid;
      that.globalData.isAdmin = !!d.isAdmin;
      that.globalData.isLoggedIn = true;
      if (d.wid && d.widExists === false) that.globalData.weddingNotFound = true;
      // 登录成功后恢复当前婚礼下的云端档案
      that.syncGuestAfterLogin(d.openid);
      if (typeof callback === 'function') callback(d);
    }).catch(function (err) {
      console.warn('[微信登录] 失败（网络或服务端配置问题），恢复网络后会自动重试:', err && err.message);
      that.handleLoginFallback(callback);
    });
  },

  // 登录异常/离线兜底：沿用本地缓存的 openid；不生成假身份，网络恢复后 api 层会自动重登
  handleLoginFallback: function (callback) {
    if (!this.globalData.openid) {
      const cached = wx.getStorageSync('wx_wedding_openid');
      if (cached) this.globalData.openid = cached;
    }
    if (typeof callback === 'function') callback({ openid: this.globalData.openid });
  },

  // 登录成功后恢复当前婚礼下的用户档案（姓名、电话、祝福语、回执）
  syncGuestAfterLogin: function (openid) {
    const that = this;
    if (!openid || !this.globalData.wid) return;

    // 1. 先把本地已填写的资料同步到云端（静默、失败不打扰）
    api.syncUserToNotion({
      openid: openid,
      name: wx.getStorageSync('wedding_guest_nickname') || '',
      phone: wx.getStorageSync('wedding_guest_phone') || '',
      blessing: wx.getStorageSync('wedding_guest_blessing') || ''
    });

    // 2. 优先应用本地已提交记录（首屏即时恢复）
    const savedRsvp = wx.getStorageSync('wx_wedding_submitted_rsvp_' + that.globalData.wid);
    if (savedRsvp) {
      that.globalData.matchedGuest = savedRsvp;
      that.notifyGuestMatched(savedRsvp);
    }

    // 3. 拉取云端档案合并展示
    api.getUserProfileByOpenid(openid).then(function (profile) {
      if (profile && profile.matched) {
        console.log('[档案同步] 已恢复云端用户资料:', profile.name || '(未填姓名)');
        if (profile.name) {
          wx.setStorageSync('wedding_guest_nickname', profile.name);
          const curUser = that.globalData.userInfo || {};
          curUser.nickName = curUser.nickName || profile.name;
          that.globalData.userInfo = curUser;
          wx.setStorageSync('wedding_app_opened', true);
        }
        if (profile.phone) {
          that.globalData.phoneNumber = profile.phone;
          wx.setStorageSync('wedding_guest_phone', profile.phone);
          wx.setStorageSync('wx_wedding_phone', profile.phone);
        }
        if (profile.blessing) {
          wx.setStorageSync('wedding_guest_blessing', profile.blessing);
        }
        const guestObj = Object.assign({}, profile.rsvp || {}, {
          name: profile.name,
          phone: profile.phone,
          blessing: profile.blessing,
          openid: openid
        });
        that.globalData.matchedGuest = guestObj;
        wx.setStorageSync('wx_wedding_submitted_rsvp_' + that.globalData.wid, guestObj);
        that.notifyGuestMatched(guestObj);
      }
    }).catch(function (e) {
      console.log('[档案同步] 提示:', e && e.message);
    });
  },

  // 微信手机号授权换取（服务端换号；本地未配置时返回演示号，可手动输入兜底）
  resolvePhoneNumber: function (eOrCode, callback) {
    const that = this;
    return new Promise(function (resolve) {
      let phoneCode = '';
      if (typeof eOrCode === 'string') {
        phoneCode = eOrCode;
      } else if (eOrCode && eOrCode.detail) {
        phoneCode = eOrCode.detail.code || '';
        // 用户主动取消授权
        if (eOrCode.detail.errMsg && eOrCode.detail.errMsg.indexOf('deny') !== -1) {
          wx.showToast({ title: '已取消授权，可直接输入', icon: 'none' });
          if (typeof callback === 'function') callback('');
          return resolve('');
        }
      }

      if (!phoneCode) {
        wx.showToast({ title: '可直接输入手机号', icon: 'none' });
        if (typeof callback === 'function') callback('');
        return resolve('');
      }

      wx.showLoading({ title: '正在获取手机号...' });
      api.getPhoneNumber(phoneCode).then(function (phone) {
        wx.hideLoading();
        if (phone) {
          that.globalData.phoneNumber = phone;
          wx.setStorageSync('wx_wedding_phone', phone);
          wx.setStorageSync('wedding_guest_phone', phone);
          wx.showToast({ title: '已填入手机号', icon: 'success' });
          if (typeof callback === 'function') callback(phone);
          resolve(phone);
        } else {
          wx.showToast({ title: '可直接输入手机号', icon: 'none' });
          if (typeof callback === 'function') callback('');
          resolve('');
        }
      }).catch(function (err) {
        wx.hideLoading();
        console.warn('[手机号] 获取失败:', err && err.message);
        wx.showToast({ title: '请直接输入联系电话', icon: 'none' });
        if (typeof callback === 'function') callback('');
        resolve('');
      });
    });
  },

  // 获取当前婚礼主题（'red' | 'pink' | 'night' | 'forest' | 'champagne'）
  getTheme: function () {
    const wid = this.globalData.wid || 'none';
    const fromCfg = this.globalData.weddingConfig && this.globalData.weddingConfig.theme;
    let fromStore = '';
    try { fromStore = wx.getStorageSync('wx_wedding_theme_' + wid) || ''; } catch (e) {}
    const t = fromCfg || fromStore || this.globalData.theme || 'red';
    return THEME_NAV_COLORS[t] ? t : 'red';
  },

  // 应用主题到全局、页面栈、顶部导航栏与自定义底栏
  applyTheme: function (themeKey, targetPage) {
    const t = THEME_NAV_COLORS[themeKey] ? themeKey : this.getTheme();
    this.globalData.theme = t;
    if (this.globalData.weddingConfig) {
      this.globalData.weddingConfig.theme = t;
    }
    try {
      wx.setStorageSync('wx_wedding_theme_' + (this.globalData.wid || 'none'), t);
    } catch (e) {}

    try {
      wx.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: THEME_NAV_COLORS[t] || '#8B1E1E',
        animation: { duration: 180, timingFunc: 'easeIn' }
      });
    } catch (e) {}

    try {
      const pages = (typeof getCurrentPages === 'function' ? getCurrentPages() : []) || [];
      if (targetPage && pages.indexOf(targetPage) === -1) pages.push(targetPage);
      pages.forEach(function (p) {
        if (!p || typeof p.setData !== 'function') return;
        if (p.data && p.data.theme !== t) {
          p.setData({ theme: t });
        }
        if (typeof p.getTabBar === 'function' && p.getTabBar()) {
          p.getTabBar().setData({ theme: t });
        }
      });
    } catch (e) {}
    return t;
  },

  // 页面 onLoad/onShow 时调用，确保导航栏、页面容器与底栏主题同步
  syncPageTheme: function (page) {
    return this.applyTheme(this.getTheme(), page);
  },

  // 从云端同步当前婚礼的配置与相册资源（无 wid 跳过；婚礼不存在时标记 weddingNotFound）
  syncWeddingConfig: function (callback) {
    const that = this;
    if (!this.globalData.wid) {
      if (typeof callback === 'function') callback(that.globalData.weddingConfig);
      return;
    }
    api.getWeddingConfig().then(function (cfg) {
      that.globalData.weddingConfig = cfg;
      that.globalData.weddingNotFound = false;
      if (cfg && cfg.theme) {
        that.applyTheme(cfg.theme);
      }
      console.log('[配置] 已同步云端婚礼配置');
      if (typeof callback === 'function') callback(cfg);
    }).catch(function (err) {
      if (err && err.notFound) {
        that.globalData.weddingNotFound = true;
        console.warn('[配置] 婚礼不存在或未开通:', that.globalData.wid);
      } else {
        console.log('[配置] 使用本地/默认婚礼配置');
      }
      if (typeof callback === 'function') callback(that.globalData.weddingConfig);
    });
  },

  // 背景音乐管理
  initBackgroundMusic: function () {
    const bgm = wx.getBackgroundAudioManager();
    this.globalData.bgmContext = bgm;

    bgm.onPlay(() => {
      this.globalData.isPlayingBgm = true;
      this.notifyBgmChange(true);
    });

    bgm.onPause(() => {
      this.globalData.isPlayingBgm = false;
      this.notifyBgmChange(false);
    });

    bgm.onStop(() => {
      this.globalData.isPlayingBgm = false;
      this.notifyBgmChange(false);
    });

    bgm.onEnded(() => {
      // 循环播放
      this.playBackgroundMusic();
    });
  },

  playBackgroundMusic: function () {
    const bgm = this.globalData.bgmContext;
    if (!bgm) return;
    const config = this.globalData.weddingConfig;
    const rawUrl = (config && config.music && config.music.url) ? String(config.music.url).trim() : '';
    const useDefault = !rawUrl || rawUrl.indexOf('actions.google.com') !== -1;
    const musicUrl = useDefault ? 'https://youxitie.site/brand/bgm.mp3' : rawUrl;
    const musicTitle = (config && config.music && config.music.title) ? config.music.title : '红笺良辰';
    const isCustom = !!(config && config.music && config.music.custom);

    bgm.title = musicTitle;
    bgm.singer = isCustom ? '婚礼背景音乐' : '有囍請柬 · 原创浪漫主题曲';
    bgm.coverImgUrl = 'https://youxitie.site/brand/mark.png';
    bgm.src = musicUrl;
  },

  pauseBackgroundMusic: function () {
    const bgm = this.globalData.bgmContext;
    if (bgm) bgm.pause();
  },

  toggleBackgroundMusic: function () {
    if (this.globalData.isPlayingBgm) {
      this.pauseBackgroundMusic();
    } else {
      this.playBackgroundMusic();
    }
  },

  // 监听音乐播放状态回调
  bgmListeners: [],
  addBgmListener: function (fn) {
    this.bgmListeners.push(fn);
  },
  removeBgmListener: function (fn) {
    this.bgmListeners = this.bgmListeners.filter(f => f !== fn);
  },
  notifyBgmChange: function (isPlaying) {
    this.bgmListeners.forEach(fn => {
      try { fn(isPlaying); } catch (e) {}
    });
  },

  // 宾客档案匹配状态监听
  guestMatchedListeners: [],
  addGuestMatchedListener: function (fn) {
    this.guestMatchedListeners.push(fn);
    if (this.globalData.matchedGuest) {
      try { fn(this.globalData.matchedGuest); } catch (e) {}
    }
  },
  removeGuestMatchedListener: function (fn) {
    this.guestMatchedListeners = this.guestMatchedListeners.filter(f => f !== fn);
  },
  notifyGuestMatched: function (guest) {
    this.guestMatchedListeners.forEach(fn => {
      try { fn(guest); } catch (e) {}
    });
  },

  // 全屏飘屏弹幕：状态同步与祝福共享缓存
  danmakuListeners: [],
  addDanmakuListener: function (fn) {
    if (typeof fn !== 'function') return;
    if (this.danmakuListeners.indexOf(fn) === -1) this.danmakuListeners.push(fn);
    try {
      fn({
        visible: this.globalData.danmakuVisible !== false,
        list: this.globalData.blessingsCache || []
      });
    } catch (e) {}
  },
  removeDanmakuListener: function (fn) {
    this.danmakuListeners = this.danmakuListeners.filter(function (f) { return f !== fn; });
  },
  notifyDanmakuChange: function () {
    var payload = {
      visible: this.globalData.danmakuVisible !== false,
      list: this.globalData.blessingsCache || []
    };
    this.danmakuListeners.forEach(function (fn) {
      try { fn(payload); } catch (e) {}
    });
  },
  setDanmakuVisible: function (visible) {
    this.globalData.danmakuVisible = !!visible;
    this.notifyDanmakuChange();
  },
  loadSharedBlessings: function (force, cb) {
    var that = this;
    var wid = this.globalData.wid || '';
    if (!wid) {
      if (typeof cb === 'function') cb([]);
      return;
    }
    var now = Date.now();
    if (
      !force &&
      this.globalData.blessingsCacheWid === wid &&
      this.globalData.blessingsLoadedAt > 0 &&
      now - this.globalData.blessingsLoadedAt < 25000
    ) {
      if (typeof cb === 'function') cb(this.globalData.blessingsCache || []);
      return;
    }
    if (this._loadingSharedBlessings) return;
    this._loadingSharedBlessings = true;
    api.getBlessingsList().then(function (list) {
      that._loadingSharedBlessings = false;
      var formatted = (Array.isArray(list) ? list : []).map(function (it, idx) {
        return {
          id: it.id || ('b_' + idx),
          author: it.author || it.name || '挚友',
          content: it.content || it.text || ''
        };
      }).filter(function (it) { return !!String(it.content || '').trim(); });
      that.globalData.blessingsCache = formatted;
      that.globalData.blessingsCacheWid = wid;
      that.globalData.blessingsLoadedAt = Date.now();
      that.notifyDanmakuChange();
      if (typeof cb === 'function') cb(formatted);
    }).catch(function () {
      that._loadingSharedBlessings = false;
      that.notifyDanmakuChange();
      if (typeof cb === 'function') cb(that.globalData.blessingsCache || []);
    });
  },
  pushSharedBlessing: function (item) {
    if (!item || !String(item.content || '').trim()) return;
    var entry = {
      id: item.id || ('just_' + Date.now()),
      author: item.author || item.name || '特邀宾客',
      content: String(item.content || '').trim(),
      _justSent: true
    };
    var next = [entry].concat((this.globalData.blessingsCache || []).filter(function (x) {
      return x && x.content !== entry.content;
    })).slice(0, 20);
    this.globalData.blessingsCache = next;
    this.globalData.blessingsCacheWid = this.globalData.wid || '';
    this.globalData.blessingsLoadedAt = Date.now();
    this.notifyDanmakuChange();
  },

  // 将当前微信身份绑定到「当前婚礼」新人预填的宾客名单（按姓名/手机号匹配）
  bindGuestOpenid: function (guestInfo, callback) {
    const that = this;
    const openid = this.globalData.openid || wx.getStorageSync('wx_wedding_openid');
    if (!openid || !this.globalData.wid) {
      if (typeof callback === 'function') callback({ success: false, message: '尚未完成微信登录或未进入婚礼' });
      return;
    }

    api.bindGuestOpenid({
      name: (guestInfo && guestInfo.name) || '',
      phone: (guestInfo && guestInfo.phone) || ''
    }).then(function (res) {
      if (res && res.updated && guestInfo) {
        that.globalData.matchedGuest = Object.assign({}, that.globalData.matchedGuest || {}, guestInfo, { openid: openid });
        that.notifyGuestMatched(that.globalData.matchedGuest);
      }
      if (typeof callback === 'function') callback(res);
    });
  }
});
