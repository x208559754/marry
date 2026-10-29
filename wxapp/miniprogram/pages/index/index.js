// pages/index/index.js
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    config: {},
    coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1000&q=80',
    isPlayingBgm: false,
    
    // 开屏信封与开帖状态
    isAppOpened: false,
    isEnteringApp: false,
    isStamping: false,
    isNameMissing: false,
    envelopeStage: 'sealed', // 'sealed' | 'opening' | 'unfolded'
    
    // 宾客已确认信息
    guestName: '',
    guestBlessing: '',
    guestPhone: '',

    // 高定中式雅致弹窗：修改称谓与尊名
    showNameModal: false,
    tempEditName: '',
    presetHonorifics: ['大伯一家', '表姐', '同学挚友', '同事同仁', '亲朋好友'],

    // 开屏登记表单输入
    guestInputName: '',
    guestInputPhone: '',
    guestInputBlessing: '百年好合，永结同心！',
    quickBlessings: [
      '百年好合，永结同心！',
      '新婚大喜，岁岁年年！',
      '佳偶天成，白头偕老！',
      '花好月圆，幸福美满！'
    ],

    countdown: {
      days: '00',
      hours: '00',
      minutes: '00',
      seconds: '00'
    },

    // 屏幕顶部安全预留空间 (留足梅花枝头与胶囊的舒朗空间)
    topSafeHeight: 118,
    statusBarHeight: 44,

    // 推广页 / 婚礼不存在（无扫码参数进入时展示）
    isPromo: false,
    isWeddingNotFound: false,
    promoTitle: '',
    promoSubtitle: '',
    promoImage: ''
  },

  timerId: null,

  onLoad: function () {
    // 无 wid（未扫码进入）→ 展示平台推广页
    if (!app.globalData.wid) {
      this.enterPromoMode();
      return;
    }
    // 扫码进入但婚礼不存在/未开通
    if (app.globalData.weddingNotFound) {
      this.setData({ isWeddingNotFound: true });
    }

    // 动态精确计算屏幕顶部安全留白 (避开状态栏与微信右上角胶囊，留出开阔大气的呼吸空间与梅花枝头)
    let sHeight = 44;
    let mBottom = 88;
    try {
      const sys = wx.getSystemInfoSync();
      if (sys && sys.statusBarHeight) sHeight = sys.statusBarHeight;
      if (wx.getMenuButtonBoundingClientRect) {
        const rect = wx.getMenuButtonBoundingClientRect();
        if (rect && rect.bottom) mBottom = rect.bottom;
      }
    } catch (e) {}

    const safeTop = Math.max(mBottom + 28, sHeight + 68);
    this.setData({
      topSafeHeight: safeTop,
      statusBarHeight: sHeight
    });

    // 检查本地是否已开屏且保存过专属宾客姓名
    const savedName = wx.getStorageSync('wedding_guest_nickname');
    const savedPhone = wx.getStorageSync('wedding_guest_phone');
    const savedBlessing = wx.getStorageSync('wedding_guest_blessing');
    const hasOpened = wx.getStorageSync('wedding_app_opened');

    const isCustomGuestName = (n) => {
      if (!n || typeof n !== 'string') return false;
      const t = n.trim();
      return t.length > 0 && ['特邀宾客', '特邀佳宾', '亲朋好友', '微信宾客', '微信用户'].indexOf(t) === -1;
    };

    if (isCustomGuestName(savedName) && hasOpened) {
      this.setData({
        isAppOpened: true,
        guestName: savedName,
        guestPhone: savedPhone || '',
        guestBlessing: savedBlessing || '',
        guestInputName: savedName,
        guestInputPhone: savedPhone || '',
        guestInputBlessing: savedBlessing || '百年好合，永结同心！'
      });
    } else {
      // 未开过屏或未设置有效称谓，必须展示火漆信封封套，称谓留空由宾客自行填写
      this.setData({
        isAppOpened: false,
        envelopeStage: 'sealed',
        guestName: '',
        guestInputName: '',
        guestPhone: savedPhone || '',
        guestInputPhone: savedPhone || ''
      });
    }

    // 尝试直接向 Notion 云端恢复用户上次填写的档案
    this.restoreGuestFromNotion();

    // 监听微信登录从 Notion 比对匹配到的宾客档案
    this.guestListener = (matched) => {
      if (matched && (matched.name || matched.phone || matched.blessing)) {
        console.log('请柬主页接收到 Notion 匹配档案:', matched.name);
        this.applyGuestProfile(matched);
      }
    };
    app.addGuestMatchedListener(this.guestListener);

    this.loadWeddingData();
    this.startCountdown();

    // 监听音乐播放状态
    this.bgmListener = (isPlaying) => {
      this.setData({ isPlayingBgm: isPlaying });
    };
    app.addBgmListener(this.bgmListener);
  },

  // 展示平台推广页（没有任何扫码参数进入时）
  enterPromoMode: function () {
    var that = this;
    this.setData({ isPromo: true });
    api.getPromo().then(function (p) {
      p = p || {};
      that.setData({
        promoTitle: p.title || '婚礼请柬小程序',
        promoSubtitle: p.subtitle || '每对新人的专属电子请柬 · 相册 · 回执 · 祝福墙',
        promoImage: p.imageUrl || ''
      });
    }).catch(function () {});
  },

  onShow: function () {
    this.setData({
      isPlayingBgm: app.globalData.isPlayingBgm
    });
    this.updateCustomTabBar();
  },

  updateCustomTabBar: function () {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0,
        visible: !!this.data.isAppOpened
      });
    }
  },

  onUnload: function () {
    if (this.timerId) clearInterval(this.timerId);
    if (this.bgmListener) app.removeBgmListener(this.bgmListener);
    if (this.guestListener) app.removeGuestMatchedListener(this.guestListener);
  },

  onPullDownRefresh: function () {
    this.loadWeddingData(() => {
      wx.stopPullDownRefresh();
      wx.showToast({ title: '已同步最新数据', icon: 'success' });
    });
  },

  loadWeddingData: function (callback) {
    api.getWeddingConfig().then((cfg) => {
      let cover = 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1000&q=80';
      if (cfg && cfg.photos && cfg.photos.length > 0) {
        cover = cfg.photos[0].url;
      } else if (cfg && cfg.coverImage) {
        cover = cfg.coverImage;
      }
      this.setData({
        config: cfg,
        coverImage: cover
      });
      if (typeof callback === 'function') callback();
    }).catch((err) => {
      if (err && err.notFound) {
        this.setData({ isWeddingNotFound: true });
        if (typeof callback === 'function') callback();
        return;
      }
      const localCfg = app.globalData.weddingConfig || {};
      this.setData({ config: localCfg });
      if (typeof callback === 'function') callback();
    });
  },

  // 从 Notion 云端恢复用户上次在首页填写的档案
  restoreGuestFromNotion: function () {
    const openid = app.globalData.openid || wx.getStorageSync('wx_wedding_openid');
    if (!openid) return;
    api.getUserProfileByOpenid(openid).then((profile) => {
      if (profile && profile.matched) {
        this.applyGuestProfile(profile);
      }
    }).catch(() => {});
  },

  // 应用从 Notion 或本地拉取到的档案到首页展示
  applyGuestProfile: function (profile) {
    if (!profile) return;
    const isCustomGuestName = (n) => {
      if (!n || typeof n !== 'string') return false;
      const t = n.trim();
      return t.length > 0 && ['特邀宾客', '特邀佳宾', '亲朋好友', '微信宾客', '微信用户'].indexOf(t) === -1;
    };

    const name = profile.name;
    const phone = profile.phone || this.data.guestPhone;
    const blessing = profile.blessing || this.data.guestBlessing;

    const update = {};
    if (isCustomGuestName(name)) {
      update.guestName = name;
      update.guestInputName = name;
      update.isAppOpened = true;
    }
    if (phone) {
      update.guestPhone = phone;
      update.guestInputPhone = phone;
    }
    if (blessing) {
      update.guestBlessing = blessing;
      update.guestInputBlessing = blessing;
    }
    this.setData(update);
  },

  // ==========================================================
  // 开屏封套与开帖交互
  // ==========================================================

  // 点击火漆印：解封并展出纸质信笺
  handleUnsealEnvelope: function () {
    if (this.data.envelopeStage !== 'sealed') return;

    wx.vibrateShort({ type: 'medium' });
    this.setData({ envelopeStage: 'opening' });

    // 自动播放背景音乐
    if (!this.data.isPlayingBgm) {
      app.toggleBackgroundMusic();
    }

    setTimeout(() => {
      this.setData({ envelopeStage: 'unfolded' });
    }, 600);
  },

  // 微信昵称/称谓输入与改动
  onNicknameChange: function (e) {
    const val = (e.detail.value || '').trim();
    if (val) {
      this.setData({ guestInputName: val, guestName: val });
      wx.setStorageSync('wedding_guest_nickname', val);
    }
  },

  onNameInput: function (e) {
    const val = e.detail.value;
    this.setData({ guestInputName: val });
    if (val && val.trim()) {
      this.setData({ guestName: val.trim() });
    }
  },

  onNameBlur: function (e) {
    const val = (e.detail.value || '').trim();
    if (val) {
      this.setData({ guestInputName: val, guestName: val });
      wx.setStorageSync('wedding_guest_nickname', val);
    }
  },

  onPhoneInput: function (e) {
    this.setData({ guestInputPhone: e.detail.value });
  },

  onPhoneBlur: function (e) {
    const val = (e.detail.value || '').trim();
    if (val) {
      this.setData({ guestInputPhone: val });
      wx.setStorageSync('wedding_guest_phone', val);
    }
  },

  onBlessingInput: function (e) {
    this.setData({ guestInputBlessing: e.detail.value });
  },

  selectQuickBlessing: function (e) {
    const text = e.currentTarget.dataset.text;
    this.setData({ guestInputBlessing: text });
  },

  // 微信手机号授权
  onGetPhoneNumber: function (e) {
    app.resolvePhoneNumber(e).then((phone) => {
      if (phone) {
        this.setData({ guestInputPhone: phone });
      }
    }).catch(() => {
      wx.showToast({ title: '可直接输入手机号', icon: 'none' });
    });
  },

  // 恭启喜帖步入盛典
  handleConfirmAndEnter: function (e) {
    const formVals = (e && e.detail && e.detail.value) || {};
    const inputName = (formVals.guestName !== undefined ? formVals.guestName : this.data.guestInputName) || '';
    const rawName = inputName.trim();
    const inputPhone = (formVals.guestPhone !== undefined ? formVals.guestPhone : this.data.guestInputPhone) || '';
    const phone = inputPhone.trim();
    const inputBlessing = (formVals.guestBlessing !== undefined ? formVals.guestBlessing : this.data.guestInputBlessing) || '';
    const blessing = inputBlessing.trim() || '百年好合，永结同心！';

    // 尊名称谓必须填写校验（手机号为选填）
    const effectiveName = rawName || (this.data.guestName && this.data.guestName !== '特邀宾客' && this.data.guestName !== '亲朋好友' ? this.data.guestName.trim() : '');
    if (!effectiveName) {
      this.setData({ isNameMissing: true });
      wx.vibrateShort({ type: 'heavy' });
      wx.showToast({
        title: '请填写您的姓名或亲朋称谓',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        this.setData({ isNameMissing: false });
      }, 1000);
      return;
    }

    const name = effectiveName;

    // 1. 将姓名放到信笺上，并触发盖印动效
    wx.vibrateShort({ type: 'medium' });
    this.setData({
      guestName: name,
      guestInputName: name,
      guestPhone: phone,
      guestInputPhone: phone,
      guestBlessing: blessing,
      guestInputBlessing: blessing,
      isStamping: true
    });

    // 持久化保存到本地缓存
    wx.setStorageSync('wedding_guest_nickname', name);
    if (phone) wx.setStorageSync('wedding_guest_phone', phone);
    if (blessing) wx.setStorageSync('wedding_guest_blessing', blessing);
    wx.setStorageSync('wedding_app_opened', true);

    // 持久化保存到 Notion 云端数据库（用户表、回执表、祝福语表）
    api.syncUserToNotion({
      name: name,
      phone: phone,
      blessing: blessing
    });

    // 若留有称谓，绑定当前微信 OpenID 到 Notion 报名/回执名单中
    if (name && name !== '亲朋好友') {
      app.bindGuestOpenid({ name: name, phone: phone }, (res) => {
        if (res && res.matched) {
          console.log('✓ 成功与 Notion 宾客记录比对并绑定 OpenID');
        }
      });
    }

    // 2. 动画阶段：先在信纸上落印盖章（650ms），随后信纸展翼淡出飞向盛典首页（500ms）
    setTimeout(() => {
      this.setData({
        isEnteringApp: true
      });
      wx.showToast({ title: '已迎候 ' + name, icon: 'success', duration: 1500 });

      setTimeout(() => {
        this.setData({
          isAppOpened: true,
          isEnteringApp: false,
          isStamping: false
        });
        this.updateCustomTabBar();
      }, 500);
    }, 650);
  },

  // 打开高定中式尊名称谓修改弹窗
  openEditNameModal: function () {
    const currentName = (this.data.guestName && this.data.guestName !== '亲朋好友' && this.data.guestName !== '特邀宾客')
      ? this.data.guestName
      : (this.data.guestInputName || '');

    wx.vibrateShort({ type: 'light' });
    this.setData({
      showNameModal: true,
      tempEditName: currentName
    });
  },

  closeEditNameModal: function () {
    this.setData({ showNameModal: false });
  },

  preventProp: function () {},

  onTempNameInput: function (e) {
    this.setData({ tempEditName: e.detail.value });
  },

  clearTempName: function () {
    this.setData({ tempEditName: '' });
  },

  selectPresetHonorific: function (e) {
    const name = e.currentTarget.dataset.name;
    this.setData({ tempEditName: name });
    wx.vibrateShort({ type: 'light' });
  },

  confirmEditName: function () {
    const name = (this.data.tempEditName || '').trim();
    if (!name) {
      wx.vibrateShort({ type: 'heavy' });
      wx.showToast({ title: '请输入您的称谓或姓名', icon: 'none' });
      return;
    }

    this.updateGuestName(name);
    this.setData({ showNameModal: false });
  },

  updateGuestName: function (newName) {
    if (!newName) return;
    const name = newName.trim();
    this.setData({
      guestName: name,
      guestInputName: name
    });
    wx.setStorageSync('wedding_guest_nickname', name);

    // 同步到 Notion 用户表及回执
    api.syncUserToNotion({
      name: name,
      phone: this.data.guestPhone,
      blessing: this.data.guestBlessing
    });

    wx.showToast({ title: '称谓设置成功', icon: 'success' });
  },

  // 快捷进入请柬
  handleQuickSkip: function () {
    const defaultName = (this.data.guestInputName || '').trim() || (this.data.guestName || '').trim() || '亲朋好友';
    const defaultPhone = (this.data.guestInputPhone || '').trim() || '';
    const defaultBlessing = (this.data.guestInputBlessing || '').trim() || '新婚大喜，永结同心！';

    wx.setStorageSync('wedding_guest_nickname', defaultName);
    if (defaultPhone) wx.setStorageSync('wedding_guest_phone', defaultPhone);
    wx.setStorageSync('wedding_app_opened', true);

    // 记录访问用户至 Notion 用户表
    api.syncUserToNotion({ name: defaultName, phone: defaultPhone });

    if (!this.data.isPlayingBgm) {
      app.toggleBackgroundMusic();
    }

    this.setData({
      guestName: defaultName,
      guestPhone: defaultPhone,
      guestBlessing: defaultBlessing,
      isAppOpened: true
    });
    this.updateCustomTabBar();
  },

  // 合上信封，重新体验开帖
  handleResealEnvelope: function () {
    this.setData({
      isAppOpened: false,
      envelopeStage: 'sealed'
    });
    this.updateCustomTabBar();
  },

  // ==========================================================
  // 主页其余业务交互
  // ==========================================================

  callGroom: function () {
    const phone = (this.data.config.groom && this.data.config.groom.phone) || '13800000001';
    wx.makePhoneCall({
      phoneNumber: phone,
      fail: () => {}
    });
  },

  callBride: function () {
    const phone = (this.data.config.bride && this.data.config.bride.phone) || '13800000002';
    wx.makePhoneCall({
      phoneNumber: phone,
      fail: () => {}
    });
  },

  navigateToSchedule: function () {
    wx.switchTab({
      url: '/pages/schedule/schedule'
    });
  },

  navigateToRsvp: function () {
    wx.switchTab({
      url: '/pages/rsvp/rsvp'
    });
  },

  navigateToBlessings: function () {
    wx.switchTab({
      url: '/pages/blessings/blessings'
    });
  },

  startCountdown: function () {
    const update = () => {
      const cfg = this.data.config || {}; const rawDate = String(cfg.date || '2026-10-18').replace(/年|月/g, '-').replace(/日/g, '').trim(); const rawTime = String(cfg.time || '11:58').trim(); const targetTime = new Date((rawDate + ' ' + rawTime).replace(/-/g, '/')).getTime() || new Date('2026/10/18 11:58').getTime();
      const now = Date.now();
      const diff = Math.max(0, targetTime - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      this.setData({
        countdown: {
          days: days < 10 ? '0' + days : String(days),
          hours: hours < 10 ? '0' + hours : String(hours),
          minutes: minutes < 10 ? '0' + minutes : String(minutes),
          seconds: seconds < 10 ? '0' + seconds : String(seconds)
        }
      });
    };

    update();
    this.timerId = setInterval(update, 1000);
  },

  toggleBgm: function () {
    app.toggleBackgroundMusic();
  },

  previewCover: function () {
    if (this.data.coverImage) {
      wx.previewImage({
        current: this.data.coverImage,
        urls: [this.data.coverImage]
      });
    }
  },

  onSecretAdminTrigger: function () {
    wx.vibrateShort();
    wx.navigateTo({
      url: '/pages/admin/admin'
    });
  },

  onShareAppMessage: function () {
    const groom = (this.data.config.groom && this.data.config.groom.name) || '陈长生';
    const bride = (this.data.config.bride && this.data.config.bride.name) || '徐有容';
    return {
      title: `喜帖：${groom} ＆ ${bride} 的结婚请柬，诚邀您的莅临！`,
      path: '/pages/index/index' + (app.globalData.wid ? ('?wid=' + app.globalData.wid) : ''),
      imageUrl: this.data.coverImage
    };
  },

  onShareTimeline: function () {
    const groom = (this.data.config.groom && this.data.config.groom.name) || '陈长生';
    const bride = (this.data.config.bride && this.data.config.bride.name) || '徐有容';
    return {
      title: `${groom} ＆ ${bride} 喜结良缘，诚邀亲友见证！`,
      imageUrl: this.data.coverImage
    };
  }
});
