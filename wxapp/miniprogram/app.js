// app.js - 微信小程序全局入口逻辑
const wechat = require('./utils/wechat.js');

App({
  globalData: {
    // 微信小程序配置凭据
    appId: 'wx12a496fabe6eb244',
    appSecret: 'REDACTED_OLD_APPSECRET', // 微信小程序 AppSecret

    // 专属 Notion 交互后端服务地址 (若运行本地服务可设为 http://localhost:3000 或留空)
    apiBase: '',
    
    // 当前登录用户信息
    userInfo: null,
    openid: '',
    sessionKey: '',
    unionid: '',
    phoneNumber: '',
    isLoggedIn: false,
    matchedGuest: null,

    // 婚礼配置缓存（具备离线默认值）
    weddingConfig: {
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
      }
    },
    
    // 背景音频播放管理器
    bgmContext: null,
    isPlayingBgm: false,
    
    // 管理员权限
    isAdmin: false
  },

  onLaunch: function () {
    console.log('[小程序] 婚礼请柬启动');
    
    // 1. 读取本地持久化的用户与登录信息
    this.initUserStorage();

    // 2. 静默微信登录并直接通过 jscode2session 解析用户信息
    this.doWxLogin();

    // 3. 从 Notion 同步婚礼配置与资源
    this.syncWeddingConfigFromNotion();

    // 4. 初始化背景音乐
    this.initBackgroundMusic();
  },

  // 读取本地缓存
  initUserStorage: function () {
    try {
      const userInfo = wx.getStorageSync('wx_wedding_user');
      const phone = wx.getStorageSync('wx_wedding_phone');
      const openid = wx.getStorageSync('wx_wedding_openid');
      const sessionKey = wx.getStorageSync('wx_wedding_session_key');
      const unionid = wx.getStorageSync('wx_wedding_unionid');
      const isAdmin = wx.getStorageSync('wx_wedding_is_admin');
      const savedRsvp = wx.getStorageSync('wx_wedding_submitted_rsvp');
      const customSecret = wx.getStorageSync('wx_wedding_app_secret');

      if (customSecret) this.globalData.appSecret = customSecret;
      if (userInfo) this.globalData.userInfo = userInfo;
      if (phone) this.globalData.phoneNumber = phone;
      if (openid) this.globalData.openid = openid;
      if (sessionKey) this.globalData.sessionKey = sessionKey;
      if (unionid) this.globalData.unionid = unionid;
      if (savedRsvp) this.globalData.matchedGuest = savedRsvp;
      if (isAdmin) this.globalData.isAdmin = Boolean(isAdmin);
      if (userInfo || phone || openid) this.globalData.isLoggedIn = true;
    } catch (e) {
      console.warn('读取本地用户信息失败:', e);
    }
  },

  // 执行微信登录，直接调用 https://api.weixin.qq.com/sns/jscode2session 解析 openid 与 session_key
  doWxLogin: function (callback) {
    const that = this;
    wx.login({
      success: function (res) {
        if (res.code) {
          console.log('[微信登录] 获取 code 成功:', res.code);

          // 动态读取小程序 AppID
          const accountInfo = (wx.getAccountInfoSync && typeof wx.getAccountInfoSync === 'function')
            ? wx.getAccountInfoSync()
            : null;
          const dynamicAppId = (accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.appId && accountInfo.miniProgram.appId !== '__UNI__')
            ? accountInfo.miniProgram.appId
            : that.globalData.appId;

          const currentSecret = that.globalData.appSecret || wx.getStorageSync('wx_wedding_app_secret') || '';

          console.log('[微信登录] 直接请求微信官方 jscode2session 接口解析用户凭据, AppID:', dynamicAppId);

          wechat.jscode2session(res.code, dynamicAppId, currentSecret)
            .then(function (sessionData) {
              console.log('[微信登录] jscode2session 解析成功:', sessionData);

              const openid = sessionData.openid;
              const sessionKey = sessionData.session_key || '';
              const unionid = sessionData.unionid || '';

              that.globalData.openid = openid;
              that.globalData.sessionKey = sessionKey;
              that.globalData.unionid = unionid;
              that.globalData.isLoggedIn = true;

              wx.setStorageSync('wx_wedding_openid', openid);
              if (sessionKey) wx.setStorageSync('wx_wedding_session_key', sessionKey);
              if (unionid) wx.setStorageSync('wx_wedding_unionid', unionid);

              // 登录解析成功后，比对 Notion 宾客数据
              that.syncGuestAfterLogin(openid);

              if (typeof callback === 'function') callback(sessionData);
            })
            .catch(function (err) {
              console.warn('[微信登录] 直接请求 jscode2session 异常:', err);
              if (!currentSecret) {
                console.warn('【配置提示】若需直接解析 jscode2session，请在 app.js 的 globalData.appSecret 中填入您的小程序 AppSecret。');
              }
              that.handleLoginFallback(callback);
            });
        }
      },
      fail: function (err) {
        console.warn('wx.login 失败:', err);
        that.handleLoginFallback(callback);
      }
    });
  },

  // 登录解析成功后从 Notion 恢复用户上次填写的历史数据（姓名、电话、祝福语、回执）
  syncGuestAfterLogin: function (openid) {
    const that = this;
    if (!openid) return;

    // 优先读取本地已提交记录
    const savedRsvp = wx.getStorageSync('wx_wedding_submitted_rsvp');
    if (savedRsvp) {
      that.globalData.matchedGuest = savedRsvp;
      that.notifyGuestMatched(savedRsvp);
    }

    try {
      const notion = require('./utils/notion.js');
      // 1. 同步记录到 Notion 微信小程序用户表 (活跃时间与次数)
      if (notion && typeof notion.syncUserToNotion === 'function') {
        notion.syncUserToNotion({
          openid: openid,
          name: wx.getStorageSync('wedding_guest_nickname') || '',
          phone: wx.getStorageSync('wedding_guest_phone') || '',
          blessing: wx.getStorageSync('wedding_guest_blessing') || ''
        });
      }

      // 2. 从 Notion 查询恢复该用户的历史填报档案（包含姓名、手机、祝福语、回执）
      if (notion && typeof notion.getUserProfileByOpenid === 'function') {
        notion.getUserProfileByOpenid(openid).then((profile) => {
          if (profile && profile.matched) {
            console.log('[Notion 档案同步] 成功恢复用户数据:', profile.name, profile.phone);
            if (profile.name) {
              wx.setStorageSync('wedding_guest_nickname', profile.name);
              const curUser = that.globalData.userInfo || {};
              curUser.nickName = curUser.nickName || profile.name;
              that.globalData.userInfo = curUser;
            }
            if (profile.phone) {
              that.globalData.phoneNumber = profile.phone;
              wx.setStorageSync('wedding_guest_phone', profile.phone);
              wx.setStorageSync('wx_wedding_phone', profile.phone);
            }
            if (profile.blessing) {
              wx.setStorageSync('wedding_guest_blessing', profile.blessing);
            }
            if (profile.name) {
              wx.setStorageSync('wedding_app_opened', true);
            }

            const guestObj = Object.assign({}, profile.rsvp || {}, {
              name: profile.name,
              phone: profile.phone,
              blessing: profile.blessing,
              openid: openid
            });
            that.globalData.matchedGuest = guestObj;
            wx.setStorageSync('wx_wedding_submitted_rsvp', guestObj);
            that.notifyGuestMatched(guestObj);
          }
        }).catch((e) => {
          console.log('[Notion] 档案同步提示:', e);
        });
      }
    } catch (e) {
      console.warn('同步 Notion 档案发生错误:', e);
    }
  },

  // 登录异常或无网络时的兜底降级处理
  handleLoginFallback: function (callback) {
    if (!this.globalData.openid) {
      const cached = wx.getStorageSync('wx_wedding_openid');
      if (cached) {
        this.globalData.openid = cached;
      } else {
        const mockOpenId = 'wx_guest_' + Date.now().toString(36);
        this.globalData.openid = mockOpenId;
        wx.setStorageSync('wx_wedding_openid', mockOpenId);
      }
    }
    if (typeof callback === 'function') callback({ openid: this.globalData.openid });
  },

  // 统一解密/换取手机号 (同时兼容 Promise 与 callback 两种调用风格，兼容传事件对象或传 code 字符串)
  resolvePhoneNumber: function (eOrCode, callback) {
    const that = this;
    return new Promise((resolve) => {
      let phoneCode = '';
      let encryptedData = '';
      let iv = '';

      if (typeof eOrCode === 'string') {
        phoneCode = eOrCode;
      } else if (eOrCode && eOrCode.detail) {
        phoneCode = eOrCode.detail.code || '';
        encryptedData = eOrCode.detail.encryptedData || '';
        iv = eOrCode.detail.iv || '';

        // 用户主动取消授权
        if (eOrCode.detail.errMsg && eOrCode.detail.errMsg.indexOf('deny') !== -1) {
          wx.showToast({ title: '已取消授权，可直接输入', icon: 'none' });
          if (typeof callback === 'function') callback('');
          return resolve('');
        }
      }

      if (!phoneCode && !encryptedData) {
        wx.showToast({ title: '可直接输入手机号', icon: 'none' });
        if (typeof callback === 'function') callback('');
        return resolve('');
      }

      const apiBase = (that.globalData && that.globalData.apiBase) || '';

      // 未配置专属后端服务时的降级提示
      if (!apiBase) {
        wx.showToast({ title: '请直接输入联系电话', icon: 'none' });
        if (typeof callback === 'function') callback('');
        return resolve('');
      }

      wx.showLoading({ title: '正在获取手机号...' });

      wx.request({
        url: `${apiBase}/api/wechat/phone`,
        method: 'POST',
        data: {
          code: phoneCode,
          encryptedData: encryptedData,
          iv: iv,
          openid: that.globalData.openid
        },
        header: { 'content-type': 'application/json' },
        success: function (res) {
          wx.hideLoading();
          if (res.data && res.data.phoneNumber) {
            const phone = res.data.phoneNumber;
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
        },
        fail: function () {
          wx.hideLoading();
          wx.showToast({ title: '请直接输入联系电话', icon: 'none' });
          if (typeof callback === 'function') callback('');
          resolve('');
        }
      });
    });
  },

  // 从 Notion 同步配置数据与图片
  syncWeddingConfigFromNotion: function (callback) {
    const that = this;
    if (!that.globalData.apiBase) return;
    wx.request({
      url: `${that.globalData.apiBase}/api/notion/config`,
      method: 'GET',
      success: function (res) {
        if (res.statusCode === 200 && res.data && res.data.config) {
          that.globalData.weddingConfig = res.data.config;
          wx.setStorageSync('wx_wedding_config', res.data.config);
          console.log('[Notion] 已同步婚礼配置与相册资源');
          if (typeof callback === 'function') callback(res.data.config);
        } else {
          console.log('[配置] 使用预设婚礼数据展示');
          if (typeof callback === 'function') callback(that.globalData.weddingConfig);
        }
      },
      fail: function (err) {
        console.log('[配置] 离线/默认婚礼配置已就绪');
        if (typeof callback === 'function') callback(that.globalData.weddingConfig);
      }
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
    const musicUrl = (config && config.music && config.music.url) ? config.music.url : 'https://actions.google.com/sounds/v1/ambiences/warm_breeze.ogg';
    const musicTitle = (config && config.music && config.music.title) ? config.music.title : '婚礼浪漫进行曲';

    bgm.title = musicTitle;
    bgm.singer = '浪漫婚礼';
    bgm.coverImgUrl = 'https://images.unsplash.com/photo-1519741497674-611481863552?w=300';
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

  // 宾客与 Notion 匹配状态监听
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

  // 将当前微信 OpenID 与 Notion 宾客名单比对并绑定
  bindGuestOpenid: function (guestInfo, callback) {
    const that = this;
    const openid = this.globalData.openid || wx.getStorageSync('wx_wedding_openid');
    if (!openid) {
      if (typeof callback === 'function') callback({ success: false, message: '未获取到微信 OpenID' });
      return;
    }

    try {
      const notion = require('./utils/notion.js');
      notion.bindGuestOpenid({
        name: guestInfo.name,
        phone: guestInfo.phone,
        openid: openid
      }).then((res) => {
        if (res && res.updated && guestInfo) {
          that.globalData.matchedGuest = Object.assign({}, that.globalData.matchedGuest || {}, guestInfo, { openid: openid });
          that.notifyGuestMatched(that.globalData.matchedGuest);
        }
        if (typeof callback === 'function') callback(res);
      }).catch((err) => {
        if (typeof callback === 'function') callback({ success: false, error: err });
      });
    } catch (e) {
      if (typeof callback === 'function') callback({ success: false, error: e });
    }
  }
});
