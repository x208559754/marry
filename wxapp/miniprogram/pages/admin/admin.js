// pages/admin/admin.js — 婚礼管理后台（微信 openid 白名单鉴权；数据来自 Cloudflare Worker + D1）
const app = getApp();
const api = require('../../utils/api.js');
const wechat = require('../../utils/wechat.js');
const qiniuUpload = require('../../utils/qiniu-upload.js');
const media = require('../../utils/media.js');

// 现场抽奖主题（与服务端 src/lottery.ts LOTTERY_THEMES、大屏 src/lottery-page.ts 保持一致）
const LOTTERY_THEMES = [
  { key: 'red', name: '中式红金', desc: '喜庆传统', bg: 'linear-gradient(160deg, #7a1a1d 0%, #4a0c0f 60%, #2c0608 100%)', mark: '#e6c47f' },
  { key: 'pink', name: '浪漫樱粉', desc: '花瓣飘落', bg: 'linear-gradient(160deg, #fff4f6 0%, #fbdde5 55%, #f3b9cb 100%)', mark: '#cf5f86' },
  { key: 'night', name: '星河夜空', desc: '繁星流星', bg: 'linear-gradient(160deg, #2a2468 0%, #121641 55%, #05061a 100%)', mark: '#f2d58a' },
  { key: 'forest', name: '森系花园', desc: '落叶清新', bg: 'linear-gradient(160deg, #2c5a3e 0%, #183323 60%, #0b1c14 100%)', mark: '#dfd298' },
  { key: 'champagne', name: '香槟白金', desc: '简约高级', bg: 'linear-gradient(160deg, #fffdf8 0%, #f4ead6 55%, #e5d3b0 100%)', mark: '#a57d3d' }
];
function themeOf(key) {
  for (let i = 0; i < LOTTERY_THEMES.length; i++) if (LOTTERY_THEMES[i].key === key) return LOTTERY_THEMES[i];
  return LOTTERY_THEMES[0];
}
function formatKbText(kb) {
  var n = Math.max(50, Math.round(Number(kb) || 500));
  return n >= 1024 && n % 1024 === 0 ? (n / 1024) + 'MB' : n + 'KB';
}

// 与相册页 pages/gallery/gallery.js 内置的三条示例一致（「载入示例再改」用）
const SAMPLE_STORIES = [
  {
    date: '2022.05.20',
    title: '初遇 · 心动的序章',
    content: '在那个满溢着初夏微风的午后，一次偶遇，开启了我们故事的序章。彼此对视的那一刻，眼中便有了星河。',
    image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800'
  },
  {
    date: '2023.10.01',
    title: '相知 · 执手同行',
    content: '从春日漫步到秋日看海，四季轮转里，我们成为了彼此最坚定而温暖的依靠。走过千山万水，风景不及身旁的你。',
    image: 'https://images.unsplash.com/photo-1529636798458-92182e662485?w=800'
  },
  {
    date: '2025.02.14',
    title: '求婚 · 许诺余生',
    content: '星光为证，玫瑰为信。“愿与你携手，共赴余生朝暮”，这是最庄重的誓言，也是最笃定的浪漫。',
    image: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=800'
  }
];

// 与盛典页 pages/schedule/schedule.js 内置示例一致
const SAMPLE_SCHEDULE = [
  { time: '10:18', title: '宾客签到·雅乐迎宾', desc: '签到处签到，领取婚礼专属喜礼与席位卡' },
  { time: '11:18', title: '花亭合影·挚友留念', desc: '与新人于花艺留影区同框合影，记录喜悦时光' },
  { time: '11:58', title: '神圣仪式·执手此生', desc: '新郎新娘步入殿堂，交换婚戒与神圣誓言' },
  { time: '12:28', title: '喜筵启席·举杯同庆', desc: '饕餮珍馐宴开，新人敬酒感恩亲朋' },
  { time: '14:00', title: '甜品欢聚·圆满礼成', desc: '法式甜品台分享，抽取幸运捧花大奖' }
];

function genId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function normalizeStoryItem(it, i) {
  it = it || {};
  var image = String(it.image || '');
  return media.tagMedia({
    id: String(it.id || genId('s') + i),
    date: String(it.date || it.year || ''),
    title: String(it.title || ''),
    content: String(it.content || it.desc || ''),
    image: image,
    url: image
  });
}

function normalizeScheduleItem(it, i) {
  it = it || {};
  return {
    id: String(it.id || genId('t') + i),
    time: String(it.time || ''),
    title: String(it.title || ''),
    desc: String(it.desc || it.content || '')
  };
}

Page({
  data: {
    isAuthorized: false,
    isSuperAdmin: false,
    isWeddingAdmin: false,
    inputPasscode: '',
    verifyingPasscode: false,
    showSuperPasscodeModal: false,
    passcodeError: '',
    weddingsList: [],
    weddingOptions: [],
    selectedWeddingIndex: 0,
    currentWeddingDisplay: '',
    superMode: 'wedding',
    superUsersLoading: false,
    superUserFilter: 'all',
    superUserQuery: '',
    superUserStats: { total: 0, registered: 0, admin: 0 },
    superUsersList: [],
    superEntLoading: false,
    superEntData: null,
    superHasOverrides: false,
    superPlanForm: { plan: 'free', expiresAt: '', note: '' },
    superOvForm: { photos: '4', photoMaxKb: '500', videoMaxMb: '100', lotteryPrizes: '1', lotteryParticipants: '30', badge: '', effect: 'none', watermark: true, opening: false },
    superThemeOptions: [],
    superEffectOptions: [
      { key: 'none', name: '基础' },
      { key: 'petals', name: '花瓣纷飞' },
      { key: 'gold', name: '金箔流光' }
    ],
    savingSuperStatus: false,
    savingSuperPlan: false,
    savingSuperOv: false,
    superPlansLoading: false,
    superPlansList: [],
    showPlanEditModal: false,
    savingPlanEdit: false,
    planEditForm: {},
    planEditThemeOptions: [],
    showNewWeddingModal: false,
    submittingNewWedding: false,
    newWeddingForm: {
      wid: '',
      groomName: '',
      brideName: '',
      date: '',
      time: '',
      venueName: '',
      venueAddress: ''
    },
    currentOpenid: '',
    accountLoading: false,
    accountReady: false,
    accountPhoneBound: false,
    accountPhoneMasked: '',
    canEnterSuperAdmin: false,
    accountWeddings: [],
    trialGroom: '',
    trialBride: '',
    bindingAccount: false,
    startingTrial: false,
    musicLoaded: false,
    musicEntitled: false,
    musicHasCustom: false,
    musicTitle: '',
    musicPlayingTitle: '',
    musicDefaultTitle: '',
    uploadingMusic: false,
    musicProgress: 0,
    backend: '',
    curTab: 'guests',
    wid: '',
    qrEnv: 'release',
    qrSrc: '',
    qrError: '',
    rsvpList: [],
    loadingRsvps: false,
    photosList: [],
    albumPhotoLimit: 0,
    movingPhoto: false,
    photoDragId: 0,
    photoDropId: 0,
    photoDragPreview: null,
    uploading: false,
    uploadingVideo: false,
    uploadProgress: 0,
    videoUploadStage: '',
    photoMaxKb: 500,
    photoMaxText: '500KB',
    videoMaxMb: 100,
    savingConfig: false,
    stats: {
      totalAttendees: 0,
      yesCount: 0,
      noCount: 0,
      shuttleCount: 0
    },
    // 岁月印记 · 恋爱纪事（config.story）
    storyList: [],
    storyCloudSaved: false, // 云端是否已有 story 字段（没有则宾客端不显示）
    storyDirty: false,
    savingStory: false,
    showStoryModal: false,
    storyEditIndex: -1,
    storyForm: { date: '', title: '', content: '', image: '' },
    showStoryPhotoPicker: false,
    uploadingStoryImage: false,
    // 婚礼当日行程（config.schedule）
    scheduleList: [],
    scheduleCloudSaved: false,
    scheduleDirty: false,
    savingSchedule: false,
    showScheduleModal: false,
    scheduleEditIndex: -1,
    scheduleForm: { time: '', title: '', desc: '' },
    // 现场抽奖（lotteries 表，与婚礼配置分开存）
    lotteryLoaded: false,
    lotteryUrl: '',
    lotteryStatus: 'idle',
    lotteryStatusText: '大屏：等待开奖',
    lotteryPrizeId: '',
    lotteryPrizes: [],
    lotteryParticipants: [],
    lotteryRemaining: 0,
    lotteryAllDrawn: false,
    lotteryAnyDrawn: false,
    lotteryBusy: false,
    lotteryTheme: 'red',
    lotteryThemeName: '中式红金',
    lotteryStatusShort: '等待开奖',
    lotteryThemes: LOTTERY_THEMES,
    // 套餐（平台总后台配置的多档套餐）
    planLoaded: false,
    planPremium: false,
    planTier: 'free',
    planName: '',
    planBadge: '',
    planExpiryText: '',
    planCanUpgrade: false,
    canUploadVideo: false,
    planMultiple: false,
    planPriceText: '',
    planUsage: [],
    planPerks: [],
    planBless: 0,
    planThemeName: '',
    planLockedThemeMsg: '',
    showPrizeModal: false,
    prizeEditIndex: -1,
    prizeForm: { name: '', reward: '', count: '1' },
    showParticipantModal: false,
    participantInput: '',
    // 婚礼信息编辑表单
    configForm: {
      groomName: '', groomPhone: '',
      brideName: '', bridePhone: '',
      date: '', dateISO: '', time: '', timeISO: '',
      venueName: '', venueHall: '', venueAddress: '', venueLat: '', venueLng: '',
      contactGroom: '', contactBride: ''
    }
  },

  onLoad: function () {
    // 入口参数（如 ?role=superadmin）不再授予总管身份，必须通过口令验证
    // onLoad 与 onShow 会连续触发，加 _booting 避免两次复查互相踩踏
    this._booting = true;
    this._authSeq = 0;
    const that = this;
    this.refreshAdminState(function () {
      that._booting = false;
    });
  },

  onShow: function () {
    // 首次进入时 onLoad 已在验证；已通过的会话不再重新登录，避免失败把口令清掉
    if (this._booting) return;
    if (this.data.isAuthorized && this.data.isSuperAdmin) {
      this.refreshAll();
      return;
    }
    this.refreshAdminState();
  },

  onHide: function () {
    this.cancelPhotoDrag();
    this._clearLotteryTimer();
  },

  onUnload: function () {
    this.cancelPhotoDrag();
    this._clearLotteryTimer();
  },

  onPageScroll: function (e) {
    const drag = this._photoDrag;
    if (!drag || !drag.cards) return;
    drag.scrollTop = e.scrollTop;
    this._updatePhotoDrag(drag);
  },

  onPullDownRefresh: function () {
    this.refreshAdminState(function () {
      wx.stopPullDownRefresh();
    });
  },

  openSuperPasscodeModal: function () {
    if (!this.data.canEnterSuperAdmin || this.data.isSuperAdmin || this.data.verifyingPasscode) return;
    this._inputPasscode = '';
    this.setData({ showSuperPasscodeModal: true, inputPasscode: '', passcodeError: '' });
  },

  closeSuperPasscodeModal: function () {
    if (this.data.verifyingPasscode) return;
    this._inputPasscode = '';
    this.setData({ showSuperPasscodeModal: false, inputPasscode: '', passcodeError: '' });
  },

  onPasscodeInput: function (e) {
    // 同步到实例变量，避免受控输入在其它 setData 时丢掉最后一次按键
    this._inputPasscode = e.detail.value;
    this.setData({ inputPasscode: e.detail.value, passcodeError: '' });
  },

  submitSuperPasscode: function () {
    if (this.data.verifyingPasscode || this.data.isSuperAdmin) return;
    const that = this;
    const code = (this._inputPasscode || this.data.inputPasscode || '').trim();
    if (!code) {
      wx.showToast({ title: '请输入口令', icon: 'none' });
      return;
    }
    this.setData({ verifyingPasscode: true, passcodeError: '' });
    const seq = this._nextAuthSeq();
    api.superAdminLogin(code).then(function () {
      if (seq !== that._authSeq) return;
      that._booting = false;
      that._inputPasscode = '';
      that.setData({
        verifyingPasscode: false,
        isAuthorized: true,
        isSuperAdmin: true,
        showSuperPasscodeModal: false,
        currentOpenid: api.getOpenid() || '',
        inputPasscode: ''
      });
      wx.showToast({ title: '总管理员验证通过', icon: 'success' });
      that.loadAllWeddings();
      that.refreshAll();
      that.loadConfigForm();
      that.loadQr();
    }).catch(function (err) {
      if (seq !== that._authSeq) return;
      that._booting = false;
      const message = (err && err.message) || '口令不正确或后端未就绪';
      if (that.data.showSuperPasscodeModal) {
        that.setData({ verifyingPasscode: false, passcodeError: message });
        return;
      }
      that.setData({ verifyingPasscode: false });
      wx.showModal({
        title: '认证未通过',
        content: message,
        showCancel: false
      });
    });
  },

  loadAllWeddings: function () {
    const that = this;
    api.getSuperAdminWeddings().then(function (list) {
      list = list || [];
      const curWid = api.getWid() || 'demo';
      const options = list.map(function (w) {
        return {
          wid: w.id,
          label: w.id + ': ' + (w.groom_name || '新郎') + ' ＆ ' + (w.bride_name || '新娘')
        };
      });
      let selIdx = options.findIndex(function (o) { return o.wid === curWid; });
      if (selIdx === -1) selIdx = 0;
      that.setData({
        weddingsList: list,
        weddingOptions: options,
        selectedWeddingIndex: selIdx,
        currentWeddingDisplay: options[selIdx] ? options[selIdx].label : curWid,
        wid: options[selIdx] ? options[selIdx].wid : curWid
      });
    }).catch(function () {});
  },

  onSelectWedding: function (e) {
    const idx = parseInt(e.detail.value, 10);
    const item = this.data.weddingOptions[idx];
    if (!item) return;
    this.setData({
      selectedWeddingIndex: idx,
      currentWeddingDisplay: item.label,
      wid: item.wid
    });
    api.setWid(item.wid);
    this.refreshAll(null, true);
    this.loadConfigForm();
    this.loadQr();
    if (this.data.superMode === 'entitlement') this.loadSuperEntitlement();
    wx.showToast({ title: '已切换至 ' + item.wid, icon: 'none' });
  },

  // ---- 小程序总后台：注册用户 / 单场套餐与权益 / 全平台套餐限制 ----

  _buildThemeOptions: function (selected) {
    var set = {};
    (selected || []).forEach(function (k) { set[k] = true; });
    return LOTTERY_THEMES.map(function (t) {
      return { key: t.key, name: t.name, on: !!set[t.key] };
    });
  },

  switchSuperMode: function (e) {
    if (!this.data.isSuperAdmin) return;
    var mode = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.mode) || 'wedding';
    if (mode !== 'wedding') this.cancelPhotoDrag();
    this.setData({ superMode: mode });
    if (mode === 'users') this.loadSuperUsers();
    else if (mode === 'entitlement') this.loadSuperEntitlement();
    else if (mode === 'plans') this.loadSuperPlans();
    else this.loadPlan();
  },

  onSuperUserQueryInput: function (e) {
    this.setData({ superUserQuery: e.detail.value });
  },

  onSuperUserFilter: function (e) {
    var f = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.filter) || 'all';
    this.setData({ superUserFilter: f });
    this.loadSuperUsers();
  },

  loadSuperUsers: function () {
    if (!this.data.isSuperAdmin) return;
    var that = this;
    this.setData({ superUsersLoading: true });
    api.getSuperAdminUsers(this.data.superUserQuery, this.data.superUserFilter).then(function (d) {
      d = d || {};
      that.setData({
        superUsersLoading: false,
        superUserStats: {
          total: d.total || 0,
          registered: d.registeredCount || 0,
          admin: d.adminCount || 0
        },
        superUsersList: d.items || []
      });
    }).catch(function (err) {
      that.setData({ superUsersLoading: false });
      wx.showToast({ title: (err && err.message) || '加载用户失败', icon: 'none' });
    });
  },

  copySuperPhone: function (e) {
    var phone = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.phone) || '';
    if (!phone) return;
    wx.setClipboardData({
      data: phone,
      success: function () { wx.showToast({ title: '已复制手机号', icon: 'success' }); }
    });
  },

  jumpUserWeddingEntitlement: function (e) {
    var wid = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.wid) || '';
    if (!wid) return;
    api.setWid(wid);
    var opts = this.data.weddingOptions || [];
    var idx = opts.findIndex(function (o) { return o.wid === wid; });
    this.setData({
      wid: wid,
      selectedWeddingIndex: idx >= 0 ? idx : this.data.selectedWeddingIndex,
      currentWeddingDisplay: idx >= 0 ? opts[idx].label : wid,
      superMode: 'entitlement'
    });
    this.loadSuperEntitlement();
    this.refreshAll(null, true);
  },

  loadSuperEntitlement: function () {
    if (!this.data.isSuperAdmin) return;
    var that = this;
    var wid = this.data.wid || api.getWid() || 'demo';
    this.setData({ superEntLoading: true });
    api.getSuperAdminWeddingPlan(wid).then(function (d) {
      if (!d) return;
      var ent = d.ent || {};
      var ov = d.overrides || {};
      that.setData({
        superEntLoading: false,
        superEntData: d,
        superHasOverrides: Object.keys(ov).length > 0,
        superPlanForm: {
          plan: d.plan || 'free',
          expiresAt: d.expiresDate || '',
          note: d.note || ''
        },
        superOvForm: {
          photos: String(ent.photos != null ? ent.photos : 4),
          photoMaxKb: String(ent.photoMaxKb != null ? ent.photoMaxKb : 500),
          videoMaxMb: String(ent.videoMaxMb != null ? ent.videoMaxMb : 100),
          lotteryPrizes: String(ent.lotteryPrizes != null ? ent.lotteryPrizes : 1),
          lotteryParticipants: String(ent.lotteryParticipants != null ? ent.lotteryParticipants : 30),
          badge: ent.badge || '',
          effect: ent.effect || 'none',
          watermark: ent.watermark !== false,
          opening: !!ent.opening
        },
        superThemeOptions: that._buildThemeOptions(ent.lotteryThemes || ['red'])
      });
    }).catch(function (err) {
      that.setData({ superEntLoading: false });
      wx.showToast({ title: (err && err.message) || '加载套餐权益失败', icon: 'none' });
    });
  },

  toggleSuperWeddingStatus: function () {
    var d = this.data.superEntData;
    if (!d || this.data.savingSuperStatus) return;
    var that = this;
    var nextStatus = d.status === 'disabled' ? 'active' : 'disabled';
    wx.showModal({
      title: nextStatus === 'disabled' ? '停用本场婚礼' : '恢复启用本场婚礼',
      content: nextStatus === 'disabled' ? '停用后宾客将无法打开本场请柬，可随时恢复。' : '恢复后宾客可正常访问本场请柬。',
      success: function (r) {
        if (!r.confirm) return;
        that.setData({ savingSuperStatus: true });
        api.setSuperAdminWeddingStatus(d.id, { status: nextStatus }).then(function () {
          that.setData({ savingSuperStatus: false });
          wx.showToast({ title: nextStatus === 'disabled' ? '已停用' : '已恢复启用', icon: 'success' });
          that.loadSuperEntitlement();
        }).catch(function (err) {
          that.setData({ savingSuperStatus: false });
          wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' });
        });
      }
    });
  },

  pickSuperWeddingPlan: function (e) {
    var code = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.code) || 'free';
    this.setData({ 'superPlanForm.plan': code });
  },

  onSuperPlanExpiresChange: function (e) {
    this.setData({ 'superPlanForm.expiresAt': e.detail.value });
  },

  clearSuperPlanExpires: function () {
    this.setData({ 'superPlanForm.expiresAt': '' });
  },

  onSuperPlanNoteInput: function (e) {
    this.setData({ 'superPlanForm.note': e.detail.value });
  },

  submitSuperWeddingPlan: function () {
    var d = this.data.superEntData;
    if (!d || this.data.savingSuperPlan) return;
    var that = this;
    var f = this.data.superPlanForm;
    this.setData({ savingSuperPlan: true });
    api.saveSuperAdminWeddingPlan(d.id, {
      plan: f.plan,
      expiresAt: f.plan === 'free' ? '' : (f.expiresAt || ''),
      note: f.note || ''
    }).then(function () {
      that.setData({ savingSuperPlan: false });
      wx.showToast({ title: '套餐已更新', icon: 'success' });
      that.loadSuperEntitlement();
      that.loadPlan();
    }).catch(function (err) {
      that.setData({ savingSuperPlan: false });
      wx.showModal({ title: '保存失败', content: (err && err.message) || '请稍后重试', showCancel: false });
    });
  },

  onSuperOvInput: function (e) {
    var field = e.currentTarget.dataset.field;
    var update = {};
    update['superOvForm.' + field] = e.detail.value;
    this.setData(update);
  },

  toggleSuperOvTheme: function (e) {
    var key = e.currentTarget.dataset.key;
    var list = (this.data.superThemeOptions || []).map(function (t) {
      return { key: t.key, name: t.name, on: t.key === key ? !t.on : t.on };
    });
    if (!list.some(function (t) { return t.on; })) {
      wx.showToast({ title: '至少保留一个主题', icon: 'none' });
      return;
    }
    this.setData({ superThemeOptions: list });
  },

  pickSuperOvEffect: function (e) {
    this.setData({ 'superOvForm.effect': e.currentTarget.dataset.key });
  },

  onSuperOvHideWatermark: function (e) {
    this.setData({ 'superOvForm.watermark': !e.detail.value });
  },

  onSuperOvOpening: function (e) {
    this.setData({ 'superOvForm.opening': !!e.detail.value });
  },

  submitSuperWeddingOverrides: function () {
    var d = this.data.superEntData;
    if (!d || this.data.savingSuperOv) return;
    var that = this;
    var f = this.data.superOvForm;
    var themes = (this.data.superThemeOptions || []).filter(function (t) { return t.on; }).map(function (t) { return t.key; });
    this.setData({ savingSuperOv: true });
    api.saveSuperAdminWeddingOverrides(d.id, {
      overrides: {
        photos: parseInt(f.photos, 10) || 4,
        photoMaxKb: Math.min(15360, Math.max(50, parseInt(f.photoMaxKb, 10) || 500)),
        videoMaxMb: Math.min(500, Math.max(1, parseInt(f.videoMaxMb, 10) || 100)),
        lotteryPrizes: Math.max(0, parseInt(f.lotteryPrizes, 10) || 0),
        lotteryParticipants: Math.max(0, parseInt(f.lotteryParticipants, 10) || 0),
        lotteryThemes: themes.length ? themes : ['red'],
        watermark: !!f.watermark,
        badge: (f.badge || '').trim(),
        effect: f.effect || 'none',
        opening: !!f.opening
      },
      note: '小程序总后台单独调整权益'
    }).then(function () {
      that.setData({ savingSuperOv: false });
      wx.showToast({ title: '权益已保存', icon: 'success' });
      that.loadSuperEntitlement();
      that.loadPlan();
    }).catch(function (err) {
      that.setData({ savingSuperOv: false });
      wx.showModal({ title: '保存失败', content: (err && err.message) || '请检查输入数值', showCancel: false });
    });
  },

  clearSuperWeddingOverrides: function () {
    var d = this.data.superEntData;
    if (!d || this.data.savingSuperOv) return;
    var that = this;
    this.setData({ savingSuperOv: true });
    api.saveSuperAdminWeddingOverrides(d.id, { overrides: {}, note: '恢复套餐默认权益' }).then(function () {
      that.setData({ savingSuperOv: false });
      wx.showToast({ title: '已恢复套餐默认', icon: 'success' });
      that.loadSuperEntitlement();
      that.loadPlan();
    }).catch(function (err) {
      that.setData({ savingSuperOv: false });
      wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' });
    });
  },

  loadSuperPlans: function () {
    if (!this.data.isSuperAdmin) return;
    var that = this;
    var effMap = { none: '基础特效', petals: '花瓣纷飞', gold: '金箔流光' };
    this.setData({ superPlansLoading: true });
    api.getSuperAdminPlans().then(function (d) {
      var list = ((d && d.plans) || []).map(function (p) {
        var yuan = p.priceFen > 0 ? ('¥' + (p.priceFen % 100 === 0 ? (p.priceFen / 100) : (p.priceFen / 100).toFixed(2))) : '免费';
        var defaultKb = p.code === 'free' ? 500 : 2048;
        return Object.assign({}, p, {
          priceText: yuan,
          photoMaxText: formatKbText((p.ent && p.ent.photoMaxKb) || defaultKb),
          effectLabel: effMap[(p.ent && p.ent.effect) || 'none'] || '基础特效'
        });
      });
      that.setData({ superPlansLoading: false, superPlansList: list });
    }).catch(function (err) {
      that.setData({ superPlansLoading: false });
      wx.showToast({ title: (err && err.message) || '加载套餐失败', icon: 'none' });
    });
  },

  openPlanEditModal: function (e) {
    var code = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.code) || '';
    var plan = (this.data.superPlansList || []).find(function (p) { return p.code === code; });
    if (!plan) return;
    var ent = plan.ent || {};
    var defaultKb = plan.code === 'free' ? 500 : 2048;
    this.setData({
      showPlanEditModal: true,
      planEditForm: {
        code: plan.code,
        name: plan.name || '',
        priceYuan: plan.priceFen ? String(plan.priceFen / 100) : '0',
        originalYuan: plan.originalFen ? String(plan.originalFen / 100) : '',
        days: String(plan.days || 0),
        active: !!plan.active,
        photos: String(ent.photos != null ? ent.photos : 4),
        photoMaxKb: String(ent.photoMaxKb != null ? ent.photoMaxKb : defaultKb),
        videoMaxMb: String(ent.videoMaxMb != null ? ent.videoMaxMb : 100),
        lotteryPrizes: String(ent.lotteryPrizes != null ? ent.lotteryPrizes : 1),
        lotteryParticipants: String(ent.lotteryParticipants != null ? ent.lotteryParticipants : 30),
        badge: ent.badge || '',
        effect: ent.effect || 'none',
        watermark: ent.watermark !== false,
        opening: !!ent.opening
      },
      planEditThemeOptions: this._buildThemeOptions(ent.lotteryThemes || ['red'])
    });
  },

  closePlanEditModal: function () {
    if (this.data.savingPlanEdit) return;
    this.setData({ showPlanEditModal: false });
  },

  onPlanEditInput: function (e) {
    var field = e.currentTarget.dataset.field;
    var update = {};
    update['planEditForm.' + field] = e.detail.value;
    this.setData(update);
  },

  togglePlanEditTheme: function (e) {
    var key = e.currentTarget.dataset.key;
    var list = (this.data.planEditThemeOptions || []).map(function (t) {
      return { key: t.key, name: t.name, on: t.key === key ? !t.on : t.on };
    });
    if (!list.some(function (t) { return t.on; })) {
      wx.showToast({ title: '至少保留一个主题', icon: 'none' });
      return;
    }
    this.setData({ planEditThemeOptions: list });
  },

  pickPlanEditEffect: function (e) {
    this.setData({ 'planEditForm.effect': e.currentTarget.dataset.key });
  },

  onPlanEditActive: function (e) {
    this.setData({ 'planEditForm.active': !!e.detail.value });
  },

  onPlanEditHideWatermark: function (e) {
    this.setData({ 'planEditForm.watermark': !e.detail.value });
  },

  onPlanEditOpening: function (e) {
    this.setData({ 'planEditForm.opening': !!e.detail.value });
  },

  submitPlanEdit: function () {
    if (this.data.savingPlanEdit) return;
    var that = this;
    var f = this.data.planEditForm;
    if (!f || !f.code) return;
    var themes = (this.data.planEditThemeOptions || []).filter(function (t) { return t.on; }).map(function (t) { return t.key; });
    var priceFen = f.code === 'free' ? 0 : Math.max(1, Math.round((parseFloat(f.priceYuan) || 0) * 100));
    var origNum = parseFloat(f.originalYuan);
    var defaultKb = f.code === 'free' ? 500 : 2048;
    var payload = {
      name: (f.name || '').trim(),
      priceFen: priceFen,
      originalFen: origNum > 0 ? Math.round(origNum * 100) : null,
      days: f.code === 'free' ? 0 : Math.max(0, parseInt(f.days, 10) || 0),
      active: f.code === 'free' ? true : !!f.active,
      ent: {
        photos: Math.max(1, parseInt(f.photos, 10) || 4),
        photoMaxKb: Math.min(15360, Math.max(50, parseInt(f.photoMaxKb, 10) || defaultKb)),
        videoMaxMb: Math.min(500, Math.max(1, parseInt(f.videoMaxMb, 10) || 100)),
        lotteryPrizes: Math.max(0, parseInt(f.lotteryPrizes, 10) || 0),
        lotteryParticipants: Math.max(0, parseInt(f.lotteryParticipants, 10) || 0),
        lotteryThemes: themes.length ? themes : ['red'],
        watermark: !!f.watermark,
        badge: (f.badge || '').trim(),
        effect: f.effect || 'none',
        opening: !!f.opening
      }
    };
    this.setData({ savingPlanEdit: true });
    api.saveSuperAdminPlan(f.code, payload).then(function () {
      that.setData({ savingPlanEdit: false, showPlanEditModal: false });
      wx.showToast({ title: '套餐配置已保存', icon: 'success' });
      that.loadSuperPlans();
      that.loadPlan();
    }).catch(function (err) {
      that.setData({ savingPlanEdit: false });
      wx.showModal({ title: '保存失败', content: (err && err.message) || '请检查输入数值', showCancel: false });
    });
  },

  openNewWeddingModal: function () {
    this.setData({
      showNewWeddingModal: true,
      newWeddingForm: {
        wid: '',
        groomName: '',
        brideName: '',
        date: '',
        time: '',
        venueName: '',
        venueAddress: ''
      }
    });
  },

  closeNewWeddingModal: function () {
    this.setData({ showNewWeddingModal: false });
  },

  onNewWeddingInput: function (e) {
    const field = e.currentTarget.dataset.field;
    const update = {};
    update['newWeddingForm.' + field] = e.detail.value;
    this.setData(update);
  },

  submitNewWedding: function () {
    const that = this;
    const f = this.data.newWeddingForm;
    const groom = (f.groomName || '').trim();
    const bride = (f.brideName || '').trim();

    if (!groom || !bride) {
      wx.showToast({ title: '请填写新郎与新娘姓名', icon: 'none' });
      return;
    }

    this.setData({ submittingNewWedding: true });
    const cfg = {
      groom: { name: groom },
      bride: { name: bride },
      date: f.date ? (f.date + (f.time ? (' ' + f.time) : '')) : '',
      time: f.time || '',
      venue: {
        name: f.venueName || '',
        address: f.venueAddress || ''
      }
    };

    api.saveSuperAdminWedding({
      groomName: groom,
      brideName: bride,
      config: cfg
    }).then(function (d) {
      const newWid = (d && (d.id || d.wid)) || '';
      that.setData({
        submittingNewWedding: false,
        showNewWeddingModal: false
      });
      wx.showToast({ title: newWid ? ('创建成功 ' + newWid) : '创建成功！', icon: 'none' });
      if (newWid) api.setWid(newWid);
      that.loadAllWeddings();
      that.refreshAll(null, true);
      that.loadConfigForm();
      that.loadQr();
    }).catch(function (err) {
      that.setData({ submittingNewWedding: false });
      wx.showModal({
        title: '创建失败',
        content: (err && err.message) || '请检查网络或口令鉴权',
        showCancel: false
      });
    });
  },

  goToPreviewCurrentWedding: function () {
    const targetWid = api.getWid() || 'demo';
    wx.reLaunch({
      url: '/pages/index/index?wid=' + encodeURIComponent(targetWid)
    });
  },

  _nextAuthSeq: function () {
    this._authSeq = (this._authSeq || 0) + 1;
    return this._authSeq;
  },

  // 复查登录态：总后台只认总管口令，本场婚礼管理员不能跳过口令页
  refreshAdminState: function (cb) {
    if (this.data.verifyingPasscode || this.data.showSuperPasscodeModal) {
      if (typeof cb === 'function') cb();
      return;
    }
    const that = this;
    this.setData({ backend: api.BASE_URL, wid: api.getWid() || 'demo' });
    const savedPass = api.getSuperAdminPasscode();
    const seq = this._nextAuthSeq();
    if (savedPass) {
      api.superAdminLogin(savedPass).then(function () {
        if (seq !== that._authSeq) return;
        that.setData({
          isAuthorized: true,
          isSuperAdmin: true,
          currentOpenid: api.getOpenid() || '',
          wid: api.getWid() || 'demo'
        });
        that.loadAllWeddings();
        that.refreshAll();
        that.loadConfigForm();
        that.loadQr();
        if (typeof cb === 'function') cb();
      }).catch(function (err) {
        if (seq !== that._authSeq) return;
        // 仅在服务端明确说口令错误时才清本地口令；网络失败不清、不踢出已登录会话
        var msg = (err && err.message) || '';
        var wrong = msg.indexOf('超级管理员口令错误') !== -1;
        if (wrong && typeof api.setSuperAdminPasscode === 'function') {
          api.setSuperAdminPasscode('');
        }
        if (!wrong && that.data.isAuthorized) {
          if (typeof cb === 'function') cb();
          return;
        }
        that.showPasscodeLock(cb);
      });
      return;
    }
    this.showPasscodeLock(cb);
  },

  showPasscodeLock: function (cb) {
    const that = this;
    this.setData({ isAuthorized: false, isSuperAdmin: false, accountLoading: true });
    api.ensureLogin().then(function () {
      return api.getAccount();
    }).then(function (acc) {
      acc = acc || {};
      that._applyAccount(acc);
      if (acc.ready && acc.isCurrentAdmin) {
        that.enterWeddingAdmin(cb);
        return;
      }
      if (typeof cb === 'function') cb();
    }).catch(function (err) {
      that.setData({
        currentOpenid: api.getOpenid() || '',
        isWeddingAdmin: false,
        canEnterSuperAdmin: false,
        accountLoading: false
      });
      console.warn('[admin] 获取登录态失败:', err && err.message);
      if (typeof cb === 'function') cb();
    });
  },

  _applyAccount: function (acc) {
    acc = acc || {};
    this.setData({
      currentOpenid: acc.openid || api.getOpenid() || '',
      isWeddingAdmin: !!acc.isCurrentAdmin,
      accountReady: !!acc.ready,
      accountPhoneBound: !!acc.phoneBound,
      accountPhoneMasked: acc.phoneMasked || '',
      canEnterSuperAdmin: !!acc.canEnterSuperAdmin,
      accountWeddings: acc.weddings || [],
      accountLoading: false
    });
  },

  enterWeddingAdmin: function (cb) {
    this.setData({
      isAuthorized: true,
      isSuperAdmin: false,
      currentOpenid: api.getOpenid() || '',
      wid: api.getWid() || ''
    });
    this.refreshAll();
    this.loadConfigForm();
    this.loadMusic();
    this.loadQr();
    if (typeof cb === 'function') cb();
  },

  onTrialGroomInput: function (e) { this.setData({ trialGroom: e.detail.value }); },
  onTrialBrideInput: function (e) { this.setData({ trialBride: e.detail.value }); },

  onGetPhoneNumber: function (e) {
    const that = this;
    const detail = (e && e.detail) || {};
    if (!detail.code) {
      var msg = detail.errMsg || '';
      var denied = msg.indexOf('deny') !== -1 || msg.indexOf('cancel') !== -1;
      wx.showToast({
        title: denied ? '需要授权微信手机号才能继续' : '暂无法获取手机号，请稍后重试',
        icon: 'none'
      });
      return;
    }
    this.setData({ bindingAccount: true });
    api.bindAccount({ phoneCode: detail.code }).then(function (acc) {
      that.setData({ bindingAccount: false });
      that._applyAccount(acc);
      wx.showToast({ title: '授权成功', icon: 'success' });
      if (acc && acc.ready && acc.isCurrentAdmin) {
        that.enterWeddingAdmin();
        return;
      }
    }).catch(function (err) {
      that.setData({ bindingAccount: false });
      wx.showModal({
        title: '授权失败',
        content: (err && err.message) || '请检查网络后重试',
        showCancel: false
      });
    });
  },

  startTrialWedding: function () {
    const that = this;
    this.setData({ startingTrial: true });
    api.startTrialWedding({
      groomName: this.data.trialGroom,
      brideName: this.data.trialBride
    }).then(function (d) {
      that.setData({ startingTrial: false });
      const wid = (d && (d.wid || d.id)) || '';
      if (!wid) throw new Error('未返回婚礼标识');
      api.setWid(wid);
      wx.showToast({ title: '已开通基础版', icon: 'success' });
      that.enterWeddingAdmin();
    }).catch(function (err) {
      that.setData({ startingTrial: false });
      if (err && err.code === 'ALREADY_HAS_WEDDING' && err.data && (err.data.existingWid || err.data.id)) {
        const wid = err.data.existingWid || err.data.id;
        api.setWid(wid);
        that.enterWeddingAdmin();
        return;
      }
      wx.showModal({
        title: '开通失败',
        content: (err && err.message) || '请稍后重试',
        showCancel: false
      });
    });
  },

  enterOwnedWedding: function (e) {
    const wid = (e.currentTarget.dataset.wid) || '';
    if (!wid) return;
    api.setWid(wid);
    this.enterWeddingAdmin();
  },


  copyOpenid: function () {
    if (!this.data.currentOpenid) return;
    wx.setClipboardData({
      data: this.data.currentOpenid,
      success: function () { wx.showToast({ title: '已复制 OpenID', icon: 'success' }); }
    });
  },

  logoutAdmin: function () {
    this.cancelPhotoDrag();
    if (!this.data.isSuperAdmin) {
      this._clearLotteryTimer();
      this.goToPreviewCurrentWedding();
      return;
    }
    api.logout();
    this.setData({
      isAuthorized: false,
      isSuperAdmin: false,
      isWeddingAdmin: false,
      superMode: 'wedding',
      superEntData: null,
      superUsersList: [],
      superPlansList: [],
      showPlanEditModal: false,
      inputPasscode: '',
      rsvpList: [],
      photosList: [],
      storyList: [],
      storyDirty: false,
      scheduleList: [],
      scheduleDirty: false,
      lotteryLoaded: false,
      lotteryPrizes: [],
      lotteryParticipants: [],
      weddingsList: [],
      weddingOptions: []
    });
    this._clearLotteryTimer();
    wx.showToast({ title: '已退出管理', icon: 'none' });
    this.showPasscodeLock();
  },

  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab !== 'photos') this.cancelPhotoDrag();
    this.setData({ curTab: tab });
    if (tab === 'lottery') this.loadLottery();
  },

  refreshAll: function (callback, forceRecords) {
    this.loadRsvps();
    this.loadPhotos();
    this.loadRecords(!!forceRecords);
    this.loadLottery();
    this.loadPlan();
    this.loadMusic();
    if (typeof callback === 'function') callback();
  },

  // ---- 套餐 ----

  loadPlan: function () {
    const that = this;
    const wid = api.getWid() || '';
    if (this._planWid !== wid) {
      this._planWid = wid;
      this.setData({ planLoaded: false, canUploadVideo: false, albumPhotoLimit: 0, photoMaxKb: 500, photoMaxText: '500KB', videoMaxMb: 100 });
    }
    api.getPlan().then(function (d) {
      if ((api.getWid() || '') !== wid || !d) return;
      const w = d.wedding || {};
      const ent = w.ent || {};
      const u = w.usage || {};
      const plans = d.plans || [];
      const level = Number(w.level) || 0;
      let maxLevel = 0;
      plans.forEach(function (p) { if (p.level > maxLevel) maxLevel = p.level; });
      const higher = plans.filter(function (p) { return p.level > level && p.code !== 'free'; });
      const cheapest = higher.reduce(function (m, p) { return !m || p.priceFen < m.priceFen ? p : m; }, null);
      const price = cheapest ? cheapest.priceFen / 100 : 0;
      const bar = function (key, label, used, limit, unit) {
        const unl = !(limit > 0);
        const pct = unl ? 100 : Math.min(100, Math.round((used || 0) * 100 / limit));
        return { key: key, label: label, text: (used || 0) + ' / ' + (unl ? '不限' : limit + unit), pct: pct, full: !unl && pct >= 100, cls: unl ? 'pu-unl' : pct >= 100 ? 'pu-red' : pct >= 80 ? 'pu-warn' : '' };
      };
      const allowed = ent.lotteryThemes || ['red'];
      const themeCount = (d.themes || []).length || 5;
      const photoMaxKb = Number(ent.photoMaxKb) || (w.premium ? 2048 : 500);
      const photoMaxText = formatKbText(photoMaxKb);
      const videoMaxMb = Number(ent.videoMaxMb) || 100;
      const expiry = w.expired ? '付费套餐已过期，当前按免费版使用' : (w.expiresAt ? String(w.expiresAt).slice(0, 10) + ' 到期' : (w.premium ? '永久有效' : '基础功能永久免费'));
      that.setData({
        planLoaded: true,
        planPremium: !!w.premium,
        planTier: level <= 0 ? 'free' : (level >= maxLevel && plans.length > 2 ? 'top' : 'paid'),
        planName: w.planName || '免费版',
        planBadge: ent.badge || '',
        planExpiryText: expiry,
        planCanUpgrade: !!w.canUpgrade && higher.length > 0,
        canUploadVideo: w.canUploadVideo === true,
        albumPhotoLimit: Number(ent.photos) || 0,
        photoMaxKb: photoMaxKb,
        photoMaxText: photoMaxText,
        videoMaxMb: videoMaxMb,
        planMultiple: higher.length > 1,
        planPriceText: price ? ('¥' + (price % 1 ? price.toFixed(2) : price)) : '',
        planUsage: [
          bar('photos', '相册照片', u.photos, ent.photos, ' 张'),
          bar('prizes', '抽奖奖项', u.lotteryPrizes, ent.lotteryPrizes, ' 个'),
          bar('people', '抽奖人数', u.lotteryParticipants, ent.lotteryParticipants, ' 人')
        ],
        planBless: u.blessings || 0,
        planThemeName: u.themeName || '中式红金',
        planPerks: [
          { text: '单图上限 ' + photoMaxText, on: true },
          { text: w.canUploadVideo ? ('视频上传（单视频最高 ' + videoMaxMb + 'MB）') : '视频上传（升级解锁）', on: w.canUploadVideo === true },
          { text: allowed.length >= themeCount ? '全部 ' + themeCount + ' 套主题' : '主题 ' + allowed.length + '/' + themeCount + ' 套', on: allowed.length >= themeCount },
          { text: ent.watermark ? '平台标识（升级可去除）' : '已去除平台标识', on: !ent.watermark },
          { text: ent.effect === 'gold' ? '金箔流光特效' : '花瓣纷飞特效', on: ent.effect === 'petals' || ent.effect === 'gold' },
          { text: '专属开场动画', on: !!ent.opening },
          { text: ent.badge ? '「' + ent.badge + '」专属标识' : '专属标识', on: !!ent.badge }
        ],
        planLockedThemeMsg: '当前「' + (w.planName || '免费版') + '」不含该主题' + (w.canUpgrade ? '，升级套餐即可解锁' : ''),
        lotteryThemes: LOTTERY_THEMES.map(function (t) {
          return Object.assign({}, t, { locked: allowed.indexOf(t.key) === -1 });
        })
      });
    }).catch(function (err) {
      console.warn('[admin] 读取套餐失败:', err && err.message);
    });
  },

  goUpgrade: function () {
    wx.navigateTo({ url: '/pages/upgrade/upgrade' });
  },

  // ---- 宾客回执 ----

  loadRsvps: function () {
    const that = this;
    this.setData({ loadingRsvps: true });
    api.getRsvpList().then(function (list) {
      let attendees = 0;
      let yes = 0;
      let no = 0;
      let shuttle = 0;

      (list || []).forEach(function (item) {
        if (item.attending === 'yes') {
          yes += 1;
          attendees += (parseInt(item.guestCount, 10) || 1);
          if (item.needShuttle) shuttle += 1;
        } else {
          no += 1;
        }
      });

      that.setData({
        rsvpList: list || [],
        loadingRsvps: false,
        stats: {
          totalAttendees: attendees,
          yesCount: yes,
          noCount: no,
          shuttleCount: shuttle
        }
      });
    }).catch(function () {
      that.setData({ loadingRsvps: false });
    });
  },

  callGuest: function (e) {
    wechat.makePhoneCall(e.currentTarget.dataset.phone);
  },

  // ---- 相册管理 ----

  loadPhotos: function () {
    const that = this;
    const wid = api.getWid();
    if (this._photosWid !== wid) {
      this.cancelPhotoDrag();
      this._photosWid = wid;
      this.setData({ photosList: [], movingPhoto: false });
    }
    if (this.data.movingPhoto || this._photoDrag) return;
    const request = this._photosRequest = {};
    api.getPhotosList().then(function (list) {
      if (that._photosRequest !== request || api.getWid() !== wid || that._photoDrag) return;
      that.setData({ photosList: list || [] });
    }).catch(function () {});
  },

  rememberPhotoTouch: function (e) {
    if (this._photoDrag) return;
    this._photoTouch = e.touches[0];
  },

  beginPhotoDrag: function (e) {
    const wid = api.getWid();
    if (this._photosWid !== wid || this._photoDrag || this.data.movingPhoto || this.data.uploading || this.data.uploadingVideo) return;
    const photos = this.data.photosList;
    const id = Number(e.currentTarget.dataset.id);
    const index = photos.findIndex(function (photo) { return photo.id === id; });
    const touch = (e.touches && e.touches[0]) || this._photoTouch;
    if (photos.length < 2 || index < 0 || !touch) return;

    const that = this;
    this._photosRequest = {};
    const drag = this._photoDrag = { wid: wid, id: id, start: touch, touch: touch };
    this.setData({ photoDragId: id, photoDropId: 0 });
    const query = wx.createSelectorQuery();
    query.selectAll('.pm-item').boundingClientRect();
    query.selectViewport().scrollOffset();
    query.exec(function (result) {
      if (that._photoDrag !== drag) return;
      const [rects, viewport] = result || [];
      if (!viewport || !rects || rects.length !== photos.length || api.getWid() !== wid) {
        that.cancelPhotoDrag();
        return;
      }
      const source = rects[index];
      const scrollTop = Number(viewport.scrollTop) || 0;
      drag.scrollTop = scrollTop;
      // 卡片位置换算成文档坐标，滚动时只需更新页面偏移量。
      drag.cards = rects.map(function (rect, idx) {
        return { id: photos[idx].id, left: rect.left, right: rect.right, top: rect.top + scrollTop, bottom: rect.bottom + scrollTop };
      });
      drag.offsetX = drag.start.clientX - source.left;
      drag.offsetY = drag.start.clientY - source.top;
      that.setData({
        photoDragPreview: {
          src: photos[index].thumb_url || photos[index].thumbUrl || photos[index].url,
          width: source.width,
          x: drag.touch.clientX - drag.offsetX,
          y: drag.touch.clientY - drag.offsetY
        }
      });
      that._updatePhotoDrag(drag);

      const windowHeight = wx.getWindowInfo().windowHeight;
      const edge = Math.min(72, windowHeight / 5);
      const min = Math.max(0, Math.min(scrollTop, drag.cards[0].top - edge));
      const max = Math.max(scrollTop, drag.cards[drag.cards.length - 1].bottom - windowHeight + edge);
      drag.scrollTimer = setInterval(function () {
        if (!drag.hasMoved) return;
        const y = drag.touch.clientY;
        const distance = y < edge ? y - edge : Math.max(0, y - (windowHeight - edge));
        const next = Math.min(max, Math.max(min, drag.scrollTop + Math.round(distance / 4)));
        if (next !== drag.scrollTop) wx.pageScrollTo({ scrollTop: next, duration: 0 });
      }, 40);
    });
  },

  trackPhotoDrag: function (e) {
    const drag = this._photoDrag;
    if (!drag || e.touches.length !== 1 || e.touches[0].identifier !== drag.start.identifier) return;
    drag.touch = e.touches[0];
    if (Math.abs(drag.touch.clientX - drag.start.clientX) + Math.abs(drag.touch.clientY - drag.start.clientY) >= 4) {
      drag.hasMoved = true;
    }
    if (drag.cards) this._updatePhotoDrag(drag);
  },

  _updatePhotoDrag: function (drag) {
    const { clientX, clientY } = drag.touch;
    const y = clientY + drag.scrollTop;
    const target = drag.cards.find(function (card) {
      return clientX >= card.left && clientX <= card.right && y >= card.top && y <= card.bottom;
    });
    drag.targetId = target && target.id !== drag.id ? target.id : 0;

    const patch = {};
    const preview = this.data.photoDragPreview;
    const left = clientX - drag.offsetX;
    const top = clientY - drag.offsetY;
    if (left !== preview.x) patch['photoDragPreview.x'] = left;
    if (top !== preview.y) patch['photoDragPreview.y'] = top;
    if (drag.targetId !== this.data.photoDropId) patch.photoDropId = drag.targetId;
    if (Object.keys(patch).length) this.setData(patch);
  },

  finishPhotoDrag: function (e) {
    this._photoTouch = null;
    const drag = this._photoDrag;
    if (!drag) return;
    const touch = (e.changedTouches || []).find(function (point) { return point.identifier === drag.start.identifier; });
    if (!touch) {
      if (!(e.touches || []).some(function (point) { return point.identifier === drag.start.identifier; })) {
        this.cancelPhotoDrag();
      }
      return;
    }
    if (drag.cards) {
      drag.touch = touch;
      this._updatePhotoDrag(drag);
    }
    this.cancelPhotoDrag();
    if (drag.targetId && api.getWid() === drag.wid) this._savePhotoOrder(drag.id, drag.targetId);
  },

  cancelPhotoDrag: function () {
    this._photoTouch = null;
    const drag = this._photoDrag;
    if (!drag) return;
    clearInterval(drag.scrollTimer);
    this._photoDrag = null;
    this._photoDragEndedAt = Date.now();
    this.setData({ photoDragId: 0, photoDropId: 0, photoDragPreview: null });
  },

  _savePhotoOrder: function (id, targetId) {
    const that = this;
    const wid = api.getWid();
    if (this._photosWid !== wid || this.data.movingPhoto || this.data.uploading || this.data.uploadingVideo) return;
    const list = this.data.photosList;
    const index = list.findIndex(function (photo) { return photo.id === id; });
    const target = list.findIndex(function (photo) { return photo.id === targetId; });
    if (index < 0 || target < 0 || index === target) return;

    const reordered = list.slice();
    reordered.splice(index, 1);
    reordered.splice(target, 0, list[index]);

    const request = this._photosRequest = {};
    this.setData({ photosList: reordered, movingPhoto: true });
    api.moveAlbumPhoto(id, targetId, index < target).then(function (updated) {
      if (that._photosRequest !== request || api.getWid() !== wid) return;
      that.setData({ photosList: updated, movingPhoto: false });
    }).catch(function (err) {
      if (that._photosRequest !== request || api.getWid() !== wid) return;
      that.setData({ photosList: list, movingPhoto: false });
      that.loadPhotos();
      wx.showToast({ title: (err && err.message) || '调整顺序失败', icon: 'none' });
    });
  },

  chooseAndUploadPhoto: function () {
    const that = this;
    if (this.data.uploading || this.data.uploadingVideo || this.data.movingPhoto || this._photoDrag) return;
    const limit = this.data.albumPhotoLimit;
    const remaining = limit ? limit - this.data.photosList.length : 9;
    if (remaining <= 0) {
      wx.showToast({ title: '相册最多 ' + limit + ' 张', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: Math.min(9, remaining),
      mediaType: this.data.canUploadVideo ? ['image', 'video'] : ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      maxDuration: 60,
      success: function (res) {
        const files = (res.tempFiles || []).filter(function (f) { return f && f.tempFilePath; });
        if (!files.length) {
          wx.showToast({ title: '未选取到文件', icon: 'none' });
          return;
        }
        var hasVideo = files.some(media.isVideoFile);
        if (hasVideo && !that.data.canUploadVideo) {
          wx.showToast({ title: '当前套餐仅支持上传图片', icon: 'none' });
          return;
        }
        var maxMb = that.data.videoMaxMb || 100;
        var rawGuardMb = Math.max(maxMb * 5, 500);
        var tooBig = files.filter(function (f) { return media.isVideoFile(f) && Number(f.size) > rawGuardMb * 1024 * 1024; });
        if (tooBig.length) {
          wx.showModal({ title: '视频过大', content: '单个视频不能超过 ' + maxMb + 'MB，请裁剪后再上传', showCancel: false });
          return;
        }
        that.setData({ uploading: true, uploadingVideo: hasVideo, uploadProgress: 0, videoUploadStage: hasVideo ? '视频上传中' : '' });
        var i = 0;
        var okCount = 0;
        var lastErr = '';
        var next = function () {
          if (i >= files.length) {
            that.setData({ uploading: false, uploadingVideo: false, uploadProgress: 0, videoUploadStage: '' });
            that.loadPhotos();
            if (okCount === files.length) {
              wx.showToast({ title: okCount === 1 ? '上传成功' : '已上传 ' + okCount + ' 个', icon: 'success' });
            } else if (okCount > 0) {
              wx.showModal({
                title: '部分上传失败',
                content: '成功 ' + okCount + ' 个，失败 ' + (files.length - okCount) + ' 个。' + (lastErr || ''),
                showCancel: false
              });
            } else {
              wx.showModal({
                title: '上传失败',
                content: lastErr || '请检查网络后重试',
                showCancel: false
              });
            }
            return;
          }
          var file = files[i++];
          var isVid = media.isVideoFile(file);
          var title = isVid ? '婚礼视频' : '婚纱照';
          qiniuUpload.uploadChosenFile(file, title, function (pct) {
            if (isVid) that.setData({ uploadProgress: pct });
          }, isVid ? {
            onStage: function (stage) {
              that.setData({
                videoUploadStage: '视频上传中',
                uploadProgress: stage === 'compressing' ? 0 : that.data.uploadProgress
              });
            }
          } : {
            maxImageKb: that.data.photoMaxKb || 500,
            canUpgrade: !!that.data.planCanUpgrade
          }).then(function () {
            okCount++;
            next();
          }).catch(function (err) {
            lastErr = (err && err.message) || '上传失败';
            if (err && err.needUpgrade) {
              that.setData({ uploading: false, uploadingVideo: false, uploadProgress: 0, videoUploadStage: '' });
              that.loadPhotos();
              api.handleUpgradeError({ needUpgrade: true, message: (okCount ? '已上传 ' + okCount + ' 个。' : '') + lastErr });
              return;
            }
            next();
          });
        };
        next();
      },
      fail: function (err) {
        var msg = (err && err.errMsg) || '';
        if (msg.indexOf('cancel') !== -1) return;
        if (msg.indexOf('privacy') !== -1 || msg.indexOf('scope is not declared') !== -1) {
          wx.showModal({
            title: '需要先配置隐私协议',
            content: '微信要求在公众平台「设置 → 服务内容声明 → 用户隐私保护指引」中勾选「收集你选中的照片或视频信息」（用于上传婚纱照），如需拍照再勾选「访问你的摄像头」。提交后，在开发者工具里清缓存并重新编译即可。',
            showCancel: false
          });
          return;
        }
        wx.showToast({ title: msg || '无法打开相册', icon: 'none' });
      }
    });
  },

  deletePhoto: function (e) {
    if (this.data.movingPhoto || this._photoDrag) return;
    const that = this;
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除',
      content: '确定从相册中删除吗？视频会同时从七牛云移除。',
      success: function (res) {
        if (!res.confirm) return;
        api.deletePhoto(id).then(function () {
          wx.showToast({ title: '已删除', icon: 'success' });
          that.loadPhotos();
        }).catch(function (err) {
          wx.showToast({ title: (err && err.message) || '删除失败', icon: 'none' });
        });
      }
    });
  },

  previewPhoto: function (e) {
    if (this._photoDrag || Date.now() - (this._photoDragEndedAt || 0) < 300) return;
    const url = e.currentTarget.dataset.url;
    const list = this.data.photosList || [];
    const kind = media.mediaKindOf({ url: url, kind: e.currentTarget.dataset.kind });
    if (kind === 'video') {
      const sources = list.filter(function (p) { return p && media.isVideoMedia(p) && p.url; }).map(function (p) {
        return { url: p.url, type: 'video' };
      });
      var idx = 0;
      for (var i = 0; i < sources.length; i++) {
        if (sources[i].url === url) { idx = i; break; }
      }
      wx.previewMedia({ sources: sources.length ? sources : [{ url: url, type: 'video' }], current: idx });
      return;
    }
    wx.previewImage({
      current: url,
      urls: list.filter(function (p) { return p && p.url && !media.isVideoMedia(p); }).map(function (p) { return p.url; })
    });
  },

  chooseAndUploadVideo: function () {
    const that = this;
    if (!this.data.canUploadVideo || this.data.uploading || this.data.uploadingVideo || this.data.movingPhoto || this._photoDrag) return;
    wx.chooseMedia({
      count: 3,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      maxDuration: 60,
      success: function (res) {
        const files = (res.tempFiles || []).filter(function (f) { return f && f.tempFilePath; });
        if (!files.length) {
          wx.showToast({ title: '未选取到视频', icon: 'none' });
          return;
        }
        var maxMb = that.data.videoMaxMb || 100;
        var rawGuardMb = Math.max(maxMb * 5, 500);
        var tooBig = files.filter(function (f) { return Number(f.size) > rawGuardMb * 1024 * 1024; });
        if (tooBig.length) {
          wx.showModal({ title: '视频过大', content: '单个视频不能超过 ' + maxMb + 'MB，请裁剪后再上传', showCancel: false });
          return;
        }
        that.setData({ uploadingVideo: true, uploadProgress: 0, videoUploadStage: '视频上传中' });
        var i = 0;
        var okCount = 0;
        var lastErr = '';
        var next = function () {
          if (i >= files.length) {
            that.setData({ uploadingVideo: false, uploadProgress: 0, videoUploadStage: '' });
            that.loadPhotos();
            if (okCount === files.length) {
              wx.showToast({ title: okCount === 1 ? '上传成功' : '已上传 ' + okCount + ' 个视频', icon: 'success' });
            } else if (okCount > 0) {
              wx.showModal({
                title: '部分上传失败',
                content: '成功 ' + okCount + ' 个，失败 ' + (files.length - okCount) + ' 个。' + (lastErr || ''),
                showCancel: false
              });
            } else {
              wx.showModal({ title: '上传失败', content: lastErr || '请检查网络后重试', showCancel: false });
            }
            return;
          }
          var file = files[i++];
          qiniuUpload.uploadVideo(file.tempFilePath, '婚礼视频', function (pct) {
            that.setData({ uploadProgress: pct });
          }, {
            onStage: function (stage) {
              that.setData({
                videoUploadStage: '视频上传中',
                uploadProgress: stage === 'compressing' ? 0 : that.data.uploadProgress
              });
            }
          }).then(function () {
            okCount++;
            next();
          }).catch(function (err) {
            lastErr = (err && err.message) || '上传失败';
            if (err && err.needUpgrade) {
              that.setData({ uploadingVideo: false, uploadProgress: 0, videoUploadStage: '' });
              that.loadPhotos();
              api.handleUpgradeError({ needUpgrade: true, message: (okCount ? '已上传 ' + okCount + ' 个。' : '') + lastErr });
              return;
            }
            next();
          });
        };
        next();
      },
      fail: function (err) {
        var msg = (err && err.errMsg) || '';
        if (msg.indexOf('cancel') !== -1) return;
        if (msg.indexOf('privacy') !== -1 || msg.indexOf('scope is not declared') !== -1) {
          wx.showModal({
            title: '需要先配置隐私协议',
            content: '微信要求在公众平台「设置 → 服务内容声明 → 用户隐私保护指引」中勾选「收集你选中的照片或视频信息」（用于上传婚纱照和视频）。提交后，在开发者工具里清缓存并重新编译即可。',
            showCancel: false
          });
          return;
        }
        wx.showToast({ title: msg || '无法打开相册', icon: 'none' });
      }
    });
  },

  // ---- 岁月印记 / 婚礼当日行程（存于婚礼配置 config.story / config.schedule） ----

  // 从云端原始配置读取两份列表；force=false 时不覆盖尚未保存的本地修改
  // （选图/上传会触发 onShow → refreshAll，不能把正在编辑的内容冲掉）
  loadRecords: function (force) {
    const that = this;
    const wid = api.getWid() || '';
    api.getConfig().then(function (cfg) {
      if ((api.getWid() || '') !== wid) return; // 期间切换了婚礼，丢弃旧结果
      cfg = cfg || {};
      const update = {};
      if (force || !that.data.storyDirty) {
        let rawStory = null;
        if (Array.isArray(cfg.story)) rawStory = cfg.story;
        else if (Array.isArray(cfg.stories)) rawStory = cfg.stories;
        update.storyList = (rawStory || []).map(normalizeStoryItem);
        update.storyCloudSaved = !!rawStory;
        update.storyDirty = false;
      }
      if (force || !that.data.scheduleDirty) {
        const rawSchedule = Array.isArray(cfg.schedule) ? cfg.schedule : null;
        update.scheduleList = (rawSchedule || []).map(normalizeScheduleItem);
        update.scheduleCloudSaved = !!rawSchedule;
        update.scheduleDirty = false;
      }
      that.setData(update);
    }).catch(function () {});
  },

  _moveItem: function (listKey, dirtyKey, index, dir) {
    const list = this.data[listKey].slice();
    const to = index + dir;
    if (index < 0 || index >= list.length || to < 0 || to >= list.length) return;
    const tmp = list[index];
    list[index] = list[to];
    list[to] = tmp;
    const update = {};
    update[listKey] = list;
    update[dirtyKey] = true;
    this.setData(update);
  },

  // 岁月印记：增删改排

  openStoryModal: function (e) {
    const idx = e && e.currentTarget && e.currentTarget.dataset.index !== undefined
      ? parseInt(e.currentTarget.dataset.index, 10) : -1;
    const item = idx >= 0 ? this.data.storyList[idx] : null;
    this.setData({
      showStoryModal: true,
      showStoryPhotoPicker: false,
      storyEditIndex: item ? idx : -1,
      storyForm: item
        ? media.tagMedia({ date: item.date, title: item.title, content: item.content, image: item.image, url: item.image })
        : { date: '', title: '', content: '', image: '', isVideo: false, kind: 'image' }
    });
  },

  closeStoryModal: function () {
    if (this.data.uploadingStoryImage) return;
    this.setData({ showStoryModal: false, showStoryPhotoPicker: false });
  },

  onStoryInput: function (e) {
    const update = {};
    update['storyForm.' + e.currentTarget.dataset.field] = e.detail.value;
    this.setData(update);
  },

  toggleStoryPhotoPicker: function () {
    if (!this.data.photosList.length) {
      wx.showToast({ title: '相册里还没有照片，可直接上传新图', icon: 'none' });
      return;
    }
    this.setData({ showStoryPhotoPicker: !this.data.showStoryPhotoPicker });
  },

  pickStoryPhoto: function (e) {
    var url = e.currentTarget.dataset.url || '';
    var kind = e.currentTarget.dataset.kind || '';
    var tagged = media.tagMedia({ image: url, url: url, kind: kind });
    this.setData({
      'storyForm.image': url,
      'storyForm.kind': tagged.kind,
      'storyForm.isVideo': tagged.isVideo,
      showStoryPhotoPicker: false
    });
  },

  clearStoryImage: function () {
    this.setData({ 'storyForm.image': '', 'storyForm.kind': 'image', 'storyForm.isVideo': false });
  },

  // 上传纪事配图或视频，返回地址供纪事使用
  uploadStoryImage: function () {
    const that = this;
    if (this.data.uploadingStoryImage) return;
    wx.chooseMedia({
      count: 1,
      mediaType: this.data.canUploadVideo ? ['image', 'video'] : ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      maxDuration: 60,
      success: function (res) {
        const f = (res.tempFiles || [])[0];
        if (!f || !f.tempFilePath) {
          wx.showToast({ title: '未选取到文件', icon: 'none' });
          return;
        }
        const isVideo = media.isVideoFile(f);
        if (isVideo && !that.data.canUploadVideo) {
          wx.showToast({ title: '当前套餐仅支持上传图片', icon: 'none' });
          return;
        }
        var maxMb = that.data.videoMaxMb || 100;
        var rawGuardMb = Math.max(maxMb * 5, 500);
        if (isVideo && Number(f.size) > rawGuardMb * 1024 * 1024) {
          wx.showModal({ title: '视频过大', content: '单个视频不能超过 ' + maxMb + 'MB，请裁剪后再上传', showCancel: false });
          return;
        }
        that.setData({ uploadingStoryImage: true });
        qiniuUpload.uploadChosenFile(f, '岁月印记', function (pct) {
          that.setData({ uploadProgress: pct });
        }, {
          gallery: 0,
          maxImageKb: that.data.photoMaxKb || 500,
          canUpgrade: !!that.data.planCanUpgrade,
          onStage: function (stage) {
            if (stage === 'compressing') {
              wx.showLoading({ title: '正在上传中…', mask: true });
            } else {
              wx.hideLoading();
            }
          }
        }).then(function (d) {
          wx.hideLoading();
          var url = (d && d.url) || '';
          var tagged = media.tagMedia({ image: url, url: url, kind: d && d.kind });
          that.setData({
            uploadingStoryImage: false,
            'storyForm.image': url,
            'storyForm.kind': tagged.kind,
            'storyForm.isVideo': tagged.isVideo,
            showStoryPhotoPicker: false
          });
          wx.showToast({ title: tagged.isVideo ? '视频已上传' : '配图已上传', icon: 'success' });
        }).catch(function (err) {
          wx.hideLoading();
          that.setData({ uploadingStoryImage: false });
          if (api.handleUpgradeError(err)) return;
          wx.showModal({ title: '上传失败', content: (err && err.message) || '请检查网络后重试', showCancel: false });
        });
      },
      fail: function (err) {
        var msg = (err && err.errMsg) || '';
        if (msg.indexOf('cancel') !== -1) return;
        if (msg.indexOf('privacy') !== -1 || msg.indexOf('scope is not declared') !== -1) {
          wx.showModal({
            title: '需要先配置隐私协议',
            content: '微信要求在公众平台「设置 → 服务内容声明 → 用户隐私保护指引」中勾选「收集你选中的照片或视频信息」，如需拍照再勾选「访问你的摄像头」。提交后，在开发者工具里清缓存并重新编译即可。',
            showCancel: false
          });
          return;
        }
        wx.showToast({ title: msg || '无法打开相册', icon: 'none' });
      }
    });
  },

  confirmStoryItem: function () {
    if (this.data.uploadingStoryImage) {
      wx.showToast({ title: '配图上传中，请稍候', icon: 'none' });
      return;
    }
    const f = this.data.storyForm;
    const title = (f.title || '').trim();
    const content = (f.content || '').trim();
    if (!title && !content) {
      wx.showToast({ title: '请至少填写标题或内容', icon: 'none' });
      return;
    }
    const list = this.data.storyList.slice();
    const idx = this.data.storyEditIndex;
    const item = normalizeStoryItem({
      id: idx >= 0 && list[idx] ? list[idx].id : genId('s'),
      date: (f.date || '').trim(),
      title: title,
      content: content,
      image: (f.image || '').trim(),
      kind: f.kind
    });
    if (idx >= 0 && idx < list.length) list[idx] = item;
    else list.push(item);
    this.setData({ storyList: list, storyDirty: true, showStoryModal: false, showStoryPhotoPicker: false });
  },

  deleteStoryItem: function (e) {
    const that = this;
    const idx = parseInt(e.currentTarget.dataset.index, 10);
    const item = this.data.storyList[idx];
    if (!item) return;
    wx.showModal({
      title: '删除这条纪事',
      content: '只会从岁月印记中移除「' + (item.title || item.date || '未命名') + '」，不会删除相册里的照片。点「保存岁月印记」后生效。',
      success: function (res) {
        if (!res.confirm) return;
        const list = that.data.storyList.slice();
        list.splice(idx, 1);
        that.setData({ storyList: list, storyDirty: true });
      }
    });
  },

  moveStoryItem: function (e) {
    this._moveItem('storyList', 'storyDirty', parseInt(e.currentTarget.dataset.index, 10), parseInt(e.currentTarget.dataset.dir, 10));
  },

  loadSampleStories: function () {
    const that = this;
    const apply = function () {
      that.setData({
        storyList: SAMPLE_STORIES.map(function (it, i) { return Object.assign({ id: genId('s') + i }, it); }),
        storyDirty: true
      });
      wx.showToast({ title: '已载入示例，修改后记得保存', icon: 'none' });
    };
    if (!this.data.storyList.length) return apply();
    wx.showModal({
      title: '载入示例',
      content: '将用三条示例替换当前列表（未保存前不会影响宾客端），确定吗？',
      success: function (res) { if (res.confirm) apply(); }
    });
  },

  discardStoryChanges: function () {
    const that = this;
    wx.showModal({
      title: '放弃修改',
      content: '恢复为云端已保存的岁月印记？',
      success: function (res) {
        if (!res.confirm) return;
        that.setData({ storyDirty: false });
        that.loadRecords(false);
      }
    });
  },

  saveStories: function () {
    const that = this;
    if (this.data.savingStory) return;
    const story = this.data.storyList.map(function (it) {
      return {
        id: it.id,
        date: it.date,
        title: it.title,
        content: it.content,
        image: it.image,
        // 兼容旧字段（故事页读 year/desc）
        year: it.date,
        desc: it.content
      };
    });
    const wid = api.getWid() || '';
    this.setData({ savingStory: true });
    // 先取最新配置，只替换 story 字段；服务端也会与已有配置合并，不会冲掉婚礼信息/行程
    api.getConfig().then(function (cfg) {
      if ((api.getWid() || '') !== wid) throw new Error('保存期间切换了婚礼，请重新保存');
      const merged = Object.assign({}, cfg || {}, { story: story });
      return api.saveConfig(merged);
    }).then(function () {
      that.setData({ savingStory: false, storyDirty: false, storyCloudSaved: true });
      wx.showToast({ title: '岁月印记已保存', icon: 'success' });
      return api.getWeddingConfig();
    }).catch(function (err) {
      that.setData({ savingStory: false });
      wx.showModal({
        title: '保存失败',
        content: (err && err.message) || '请检查网络或管理员权限',
        showCancel: false
      });
    });
  },

  // 婚礼当日行程：增删改排

  openScheduleModal: function (e) {
    const idx = e && e.currentTarget && e.currentTarget.dataset.index !== undefined
      ? parseInt(e.currentTarget.dataset.index, 10) : -1;
    const item = idx >= 0 ? this.data.scheduleList[idx] : null;
    this.setData({
      showScheduleModal: true,
      scheduleEditIndex: item ? idx : -1,
      scheduleForm: item
        ? { time: item.time, title: item.title, desc: item.desc }
        : { time: '', title: '', desc: '' }
    });
  },

  closeScheduleModal: function () {
    this.setData({ showScheduleModal: false });
  },

  onScheduleInput: function (e) {
    const update = {};
    update['scheduleForm.' + e.currentTarget.dataset.field] = e.detail.value;
    this.setData(update);
  },

  confirmScheduleItem: function () {
    const f = this.data.scheduleForm;
    const title = (f.title || '').trim();
    if (!title) {
      wx.showToast({ title: '请填写环节名称', icon: 'none' });
      return;
    }
    const list = this.data.scheduleList.slice();
    const idx = this.data.scheduleEditIndex;
    const item = {
      id: idx >= 0 && list[idx] ? list[idx].id : genId('t'),
      time: (f.time || '').trim(),
      title: title,
      desc: (f.desc || '').trim()
    };
    if (idx >= 0 && idx < list.length) list[idx] = item;
    else list.push(item);
    this.setData({ scheduleList: list, scheduleDirty: true, showScheduleModal: false });
  },

  deleteScheduleItem: function (e) {
    const that = this;
    const idx = parseInt(e.currentTarget.dataset.index, 10);
    const item = this.data.scheduleList[idx];
    if (!item) return;
    wx.showModal({
      title: '删除这项行程',
      content: '确定删除「' + (item.title || item.time || '未命名') + '」吗？点「保存当日行程」后生效。',
      success: function (res) {
        if (!res.confirm) return;
        const list = that.data.scheduleList.slice();
        list.splice(idx, 1);
        that.setData({ scheduleList: list, scheduleDirty: true });
      }
    });
  },

  moveScheduleItem: function (e) {
    this._moveItem('scheduleList', 'scheduleDirty', parseInt(e.currentTarget.dataset.index, 10), parseInt(e.currentTarget.dataset.dir, 10));
  },

  loadSampleSchedule: function () {
    const that = this;
    const apply = function () {
      that.setData({
        scheduleList: SAMPLE_SCHEDULE.map(function (it, i) { return Object.assign({ id: genId('t') + i }, it); }),
        scheduleDirty: true
      });
      wx.showToast({ title: '已载入示例，修改后记得保存', icon: 'none' });
    };
    if (!this.data.scheduleList.length) return apply();
    wx.showModal({
      title: '载入示例',
      content: '将用示例行程替换当前列表（未保存前不会影响宾客端），确定吗？',
      success: function (res) { if (res.confirm) apply(); }
    });
  },

  discardScheduleChanges: function () {
    const that = this;
    wx.showModal({
      title: '放弃修改',
      content: '恢复为云端已保存的当日行程？',
      success: function (res) {
        if (!res.confirm) return;
        that.setData({ scheduleDirty: false });
        that.loadRecords(false);
      }
    });
  },

  saveSchedule: function () {
    const that = this;
    if (this.data.savingSchedule) return;
    const schedule = this.data.scheduleList.map(function (it) {
      return { id: it.id, time: it.time, title: it.title, desc: it.desc };
    });
    const wid = api.getWid() || '';
    this.setData({ savingSchedule: true });
    api.getConfig().then(function (cfg) {
      if ((api.getWid() || '') !== wid) throw new Error('保存期间切换了婚礼，请重新保存');
      const merged = Object.assign({}, cfg || {}, { schedule: schedule });
      return api.saveConfig(merged);
    }).then(function () {
      that.setData({ savingSchedule: false, scheduleDirty: false, scheduleCloudSaved: true });
      wx.showToast({ title: '当日行程已保存', icon: 'success' });
      return api.getWeddingConfig();
    }).catch(function (err) {
      that.setData({ savingSchedule: false });
      wx.showModal({
        title: '保存失败',
        content: (err && err.message) || '请检查网络或管理员权限',
        showCancel: false
      });
    });
  },

  // ---- 婚礼信息设置 ----


  // 把「2026年10月18日 11:58」拆成日期与时间，供表单和选择器使用
  _parseWeddingDateTime: function (date, time) {
    var raw = String(date || '').trim();
    var t = String(time || '').trim();
    var tm = raw.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*$/);
    if (tm && !t) {
      t = ('0' + tm[1]).slice(-2) + ':' + tm[2];
      raw = raw.slice(0, tm.index).replace(/[，,\s]+$/, '').trim();
    }
    var iso = '';
    var display = raw;
    var m = raw.match(/(\d{4})[年\-./](\d{1,2})[月\-./](\d{1,2})/);
    if (m) {
      iso = m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
      display = m[1] + '年' + parseInt(m[2], 10) + '月' + parseInt(m[3], 10) + '日';
    }
    var tIso = '';
    var tm2 = t.match(/(\d{1,2}):(\d{2})/);
    if (tm2) tIso = ('0' + tm2[1]).slice(-2) + ':' + tm2[2];
    return { date: display, dateISO: iso, time: tIso || t, timeISO: tIso };
  },

  _formatCnDate: function (iso) {
    if (!iso) return '';
    var p = String(iso).split('-');
    if (p.length < 3) return iso;
    return p[0] + '年' + parseInt(p[1], 10) + '月' + parseInt(p[2], 10) + '日';
  },

  loadConfigForm: function () {
    const that = this;
    api.getConfig().then(function (cfg) {
      cfg = cfg || {};
      const groom = cfg.groom || {};
      const bride = cfg.bride || {};
      const venue = cfg.venue || {};
      const contacts = cfg.contacts || {};
      const dt = that._parseWeddingDateTime(cfg.date, cfg.time);
      const lat = venue.latitude != null && venue.latitude !== '' ? String(venue.latitude) : (venue.lat != null ? String(venue.lat) : '');
      const lng = venue.longitude != null && venue.longitude !== '' ? String(venue.longitude) : (venue.lng != null ? String(venue.lng) : '');
      that.setData({
        configForm: {
          groomName: groom.name || '',
          groomPhone: groom.phone || '',
          brideName: bride.name || '',
          bridePhone: bride.phone || '',
          date: dt.date,
          dateISO: dt.dateISO,
          time: dt.time,
          timeISO: dt.timeISO,
          venueName: venue.name || venue.hotel || '',
          venueHall: venue.hall || '',
          venueAddress: venue.address || '',
          venueLat: lat,
          venueLng: lng,
          contactGroom: contacts.groomPhone || '',
          contactBride: contacts.bridePhone || ''
        }
      });
    }).catch(function () {});
    this.loadMusic();
  },

  loadMusic: function () {
    const that = this;
    api.getMusic().then(function (d) {
      d = d || {};
      const playing = d.playing || {};
      const custom = d.custom || {};
      const def = d.default || {};
      that.setData({
        musicLoaded: true,
        musicEntitled: !!d.entitled,
        musicHasCustom: !!d.hasCustom && !!d.entitled,
        musicTitle: custom.title || '',
        musicPlayingTitle: playing.title || def.title || '红笺良辰',
        musicDefaultTitle: def.title || '红笺良辰'
      });
    }).catch(function () {
      that.setData({ musicLoaded: true, musicEntitled: false });
    });
  },

  onMusicTitleInput: function (e) {
    this.setData({ musicTitle: e.detail.value });
  },

  chooseAndUploadMusic: function () {
    const that = this;
    if (!this.data.musicEntitled) {
      api.handleUpgradeError({ needUpgrade: true, message: '自定义背景音乐是高级功能，升级后即可上传自己的音乐，打开小程序就会播放。' });
      return;
    }
    const pick = wx.chooseMessageFile
      ? function () {
          return new Promise(function (resolve, reject) {
            wx.chooseMessageFile({
              count: 1,
              type: 'file',
              extension: ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'flac'],
              success: function (res) { resolve((res.tempFiles && res.tempFiles[0]) || null); },
              fail: reject
            });
          });
        }
      : function () { return Promise.reject(new Error('当前微信版本不支持从聊天选择文件')); };
    pick().then(function (file) {
      if (!file || !file.path) throw new Error('请选择音频文件');
      if (file.size && file.size > 20 * 1024 * 1024) throw new Error('音频不能超过 20MB');
      that.setData({ uploadingMusic: true, musicProgress: 0 });
      const title = (that.data.musicTitle || file.name || '').replace(/\.[^.]+$/, '');
      return qiniuUpload.uploadAudio(file.path, title, function (p) {
        that.setData({ musicProgress: p || 0 });
      }, file.name || '');
    }).then(function () {
      that.setData({ uploadingMusic: false, musicProgress: 100 });
      wx.showToast({ title: '已设为背景音乐', icon: 'success' });
      that.loadMusic();
      if (app && typeof app.syncWeddingConfig === 'function') {
        app.syncWeddingConfig(function () {
          if (app.playBackgroundMusic) app.playBackgroundMusic();
        });
      }
    }).catch(function (err) {
      that.setData({ uploadingMusic: false });
      if (api.handleUpgradeError(err)) return;
      var msg = (err && err.errMsg) || (err && err.message) || '上传失败';
      if (String(msg).indexOf('cancel') !== -1) return;
      wx.showModal({ title: '上传失败', content: msg, showCancel: false });
    });
  },

  restoreDefaultMusic: function () {
    const that = this;
    wx.showModal({
      title: '恢复默认音乐',
      content: '去掉本场自定义音乐，改为播放平台默认曲（未设置时为《红笺良辰》）。',
      success: function (r) {
        if (!r.confirm) return;
        api.deleteMusic().then(function () {
          wx.showToast({ title: '已恢复默认', icon: 'success' });
          that.loadMusic();
          if (app && typeof app.syncWeddingConfig === 'function') {
            app.syncWeddingConfig(function () {
              if (app.playBackgroundMusic) app.playBackgroundMusic();
            });
          }
        }).catch(function (err) {
          wx.showModal({ title: '操作失败', content: (err && err.message) || '', showCancel: false });
        });
      }
    });
  },

  onFormDateChange: function (e) {
    const iso = e.detail.value || '';
    this.setData({
      'configForm.dateISO': iso,
      'configForm.date': this._formatCnDate(iso)
    });
  },

  onFormTimeChange: function (e) {
    const v = e.detail.value || '';
    this.setData({
      'configForm.timeISO': v,
      'configForm.time': v
    });
  },

  chooseVenueLocation: function () {
    const that = this;
    wx.chooseLocation({
      success: function (res) {
        const update = {
          'configForm.venueAddress': res.address || that.data.configForm.venueAddress,
          'configForm.venueLat': res.latitude != null ? String(res.latitude) : '',
          'configForm.venueLng': res.longitude != null ? String(res.longitude) : ''
        };
        if (res.name && !that.data.configForm.venueName) {
          update['configForm.venueName'] = res.name;
        }
        that.setData(update);
      },
      fail: function (err) {
        const msg = (err && err.errMsg) || '';
        if (/cancel|canceled/i.test(msg)) return;
        wx.showToast({ title: '无法打开地图选点，请检查定位权限', icon: 'none' });
      }
    });
  },

  onFormInput: function (e) {
    const field = e.currentTarget.dataset.field;
    const update = {};
    update['configForm.' + field] = e.detail.value;
    this.setData(update);
  },

  saveConfigForm: function () {
    const that = this;
    const f = this.data.configForm;
    this.setData({ savingConfig: true });
    api.getConfig().then(function (cfg) {
      cfg = cfg || {};
      const merged = Object.assign({}, cfg, {
        groom: Object.assign({}, cfg.groom || {}, {
          name: f.groomName.trim(),
          phone: f.groomPhone.trim()
        }),
        bride: Object.assign({}, cfg.bride || {}, {
          name: f.brideName.trim(),
          phone: f.bridePhone.trim()
        }),
        date: (f.date || '').trim(),
        time: (f.time || '').trim(),
        venue: Object.assign({}, cfg.venue || {}, {
          name: f.venueName.trim(),
          hall: f.venueHall.trim(),
          address: f.venueAddress.trim(),
          latitude: f.venueLat.trim() ? (parseFloat(f.venueLat) || 0) : ((cfg.venue && cfg.venue.latitude) || 0),
          longitude: f.venueLng.trim() ? (parseFloat(f.venueLng) || 0) : ((cfg.venue && cfg.venue.longitude) || 0)
        }),
        contacts: {
          groomPhone: f.contactGroom.trim(),
          bridePhone: f.contactBride.trim()
        }
      });
      return api.saveConfig(merged);
    }).then(function () {
      that.setData({ savingConfig: false });
      wx.showToast({ title: '婚礼信息已保存', icon: 'success' });
      // 拉取一次合并后的配置刷新本地缓存，其他页面下拉即可看到新内容
      return api.getWeddingConfig();
    }).catch(function (err) {
      that.setData({ savingConfig: false });
      wx.showModal({
        title: '保存失败',
        content: (err && err.message) || '请确认当前账号在管理员白名单（ADMIN_OPENIDS）中',
        showCancel: false
      });
    });
  },

  // ---- 现场抽奖 ----

  _clearLotteryTimer: function () {
    if (this._lotteryTimer) {
      clearTimeout(this._lotteryTimer);
      this._lotteryTimer = null;
    }
  },

  // 把服务端返回的 {config, state, remainingCount} 转成页面数据
  _applyLottery: function (d) {
    if (!d) return;
    const cfg = d.config || {};
    const st = d.state || {};
    const results = st.results || {};
    const status = st.status || 'idle';
    const prizes = (cfg.prizes || []).map(function (p) {
      const ws = results[p.id] || [];
      const isCurrent = st.prizeId === p.id && (status === 'rolling' || status === 'revealed');
      return {
        id: p.id,
        name: p.name || '',
        reward: p.reward || '',
        count: p.count || 1,
        label: p.name || p.reward || '未命名奖项',
        sub: p.name && p.reward ? p.reward : '',
        drawn: ws.length > 0,
        winnersText: ws.map(function (w) { return w.name; }).join('、'),
        winnerCount: ws.length,
        rolling: isCurrent && status === 'rolling',
        onScreen: isCurrent
      };
    });
    const allDrawn = prizes.length > 0 && prizes.every(function (p) { return p.drawn; });
    const anyDrawn = prizes.some(function (p) { return p.drawn; });
    let text = '大屏：等待开奖';
    const cur = prizes.find(function (p) { return p.onScreen; });
    if (status === 'rolling') text = '大屏：正在抽取「' + (cur ? cur.label : '') + '」';
    else if (status === 'revealed') text = '大屏：已揭晓「' + (cur ? cur.label : '') + '」';
    else if (status === 'board') text = '大屏：展示全部中奖名单';
    const theme = themeOf(cfg.theme);
    if (app.applyTheme) app.applyTheme(theme.key, this);
    const short = status === 'rolling' ? '抽奖中' : status === 'revealed' ? '已揭晓' : status === 'board' ? '中奖总榜' : '等待开奖';
    this.setData({
      lotteryTheme: theme.key,
      lotteryThemeName: theme.name,
      lotteryStatusShort: short,
      lotteryLoaded: true,
      lotteryUrl: api.getLotteryScreenUrl(),
      lotteryStatus: status,
      lotteryStatusText: text,
      lotteryPrizeId: st.prizeId || '',
      lotteryPrizes: prizes,
      lotteryParticipants: cfg.participants || [],
      lotteryRemaining: d.remainingCount || 0,
      lotteryAllDrawn: allDrawn,
      lotteryAnyDrawn: anyDrawn
    });
    // 抽奖中：到揭晓时间后自动刷新一次状态
    this._clearLotteryTimer();
    if (status === 'rolling' && st.revealAt && d.serverNow) {
      const wait = Math.max(300, st.revealAt - d.serverNow + 400);
      const that = this;
      this._lotteryTimer = setTimeout(function () { that.loadLottery(); }, Math.min(wait, 15000));
    }
    if (d.message) wx.showToast({ title: d.message, icon: 'none', duration: 2500 });
  },

  loadLottery: function () {
    const that = this;
    const wid = api.getWid() || '';
    this.setData({ lotteryUrl: api.getLotteryScreenUrl() });
    api.getLotteryAdmin().then(function (d) {
      if ((api.getWid() || '') !== wid) return; // 期间切换了婚礼
      if (d) d.message = '';
      that._applyLottery(d);
    }).catch(function (err) {
      console.warn('[admin] 读取抽奖失败:', err && err.message);
    });
  },

  // 统一执行一个抽奖操作（防连点 + 错误提示）
  _lotteryAction: function (promiseFn, okTip) {
    if (this.data.lotteryBusy) return;
    const that = this;
    const wid = api.getWid() || '';
    this.setData({ lotteryBusy: true });
    promiseFn().then(function (d) {
      that.setData({ lotteryBusy: false });
      if ((api.getWid() || '') !== wid) return;
      that._applyLottery(d);
      if (okTip && !(d && d.message)) wx.showToast({ title: okTip, icon: 'success' });
    }).catch(function (err) {
      that.setData({ lotteryBusy: false });
      if (!api.handleUpgradeError(err)) {
        wx.showModal({ title: '操作未完成', content: (err && err.message) || '网络异常，请重试', showCancel: false });
      }
      that.loadLottery();
    });
  },

  // 切换抽奖主题：存到服务器，大屏通过推送立即切换
  chooseLotteryTheme: function (e) {
    const key = e.currentTarget.dataset.key;
    if (!key || key === this.data.lotteryTheme || this.data.lotteryBusy) return;
    if (e.currentTarget.dataset.locked) {
      api.handleUpgradeError({ needUpgrade: true, message: this.data.planLockedThemeMsg || '该主题需要升级套餐' });
      return;
    }
    const theme = themeOf(key);
    const prev = { lotteryTheme: this.data.lotteryTheme, lotteryThemeName: this.data.lotteryThemeName };
    this.setData({ lotteryTheme: theme.key, lotteryThemeName: theme.name });
    if (app.applyTheme) app.applyTheme(theme.key, this);
    const that = this;
    this._lotteryAction(function () {
      return api.saveLotteryConfig({ theme: theme.key }).catch(function (err) {
        that.setData(prev);
        if (app.applyTheme) app.applyTheme(prev.lotteryTheme, that);
        throw err;
      });
    }, '全站主题已切换');
  },

  copyLotteryUrl: function () {
    const url = this.data.lotteryUrl || api.getLotteryScreenUrl();
    wx.setClipboardData({
      data: url,
      success: function () { wx.showToast({ title: '已复制大屏网址', icon: 'success' }); }
    });
  },

  // 奖项：保存整份列表（只传 prizes，不动参与名单与抽奖结果）
  _savePrizes: function (prizes, tip) {
    const out = prizes.map(function (p) {
      return { id: p.id, name: p.name, reward: p.reward, count: p.count };
    });
    this._lotteryAction(function () { return api.saveLotteryConfig({ prizes: out }); }, tip);
  },

  openPrizeModal: function (e) {
    const idx = e && e.currentTarget && e.currentTarget.dataset.index !== undefined
      ? parseInt(e.currentTarget.dataset.index, 10) : -1;
    const p = idx >= 0 ? this.data.lotteryPrizes[idx] : null;
    this.setData({
      showPrizeModal: true,
      prizeEditIndex: p ? idx : -1,
      prizeForm: p ? { name: p.name, reward: p.reward, count: String(p.count) } : { name: '', reward: '', count: '1' }
    });
  },

  closePrizeModal: function () {
    this.setData({ showPrizeModal: false });
  },

  onPrizeInput: function (e) {
    const update = {};
    update['prizeForm.' + e.currentTarget.dataset.field] = e.detail.value;
    this.setData(update);
  },

  confirmPrize: function () {
    const f = this.data.prizeForm;
    const name = (f.name || '').trim();
    const reward = (f.reward || '').trim();
    const count = parseInt(f.count, 10);
    if (!name && !reward) {
      wx.showToast({ title: '请填写奖项名称或奖品内容', icon: 'none' });
      return;
    }
    if (!(count >= 1) || String(count) !== String(f.count).trim()) {
      wx.showToast({ title: '中奖人数需为不小于 1 的整数', icon: 'none' });
      return;
    }
    if (count > 200) {
      wx.showToast({ title: '单个奖项最多 200 人', icon: 'none' });
      return;
    }
    const list = this.data.lotteryPrizes.slice();
    const idx = this.data.prizeEditIndex;
    if (idx >= 0 && list[idx]) {
      list[idx] = Object.assign({}, list[idx], { name: name, reward: reward, count: count });
    } else {
      list.push({ id: genId('z'), name: name, reward: reward, count: count });
    }
    this.setData({ showPrizeModal: false });
    this._savePrizes(list, '奖项已保存');
  },

  movePrize: function (e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    const dir = parseInt(e.currentTarget.dataset.dir, 10);
    const list = this.data.lotteryPrizes.slice();
    const to = index + dir;
    if (index < 0 || index >= list.length || to < 0 || to >= list.length) return;
    const tmp = list[index];
    list[index] = list[to];
    list[to] = tmp;
    this._savePrizes(list);
  },

  deletePrize: function (e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    const p = this.data.lotteryPrizes[index];
    if (!p) return;
    const that = this;
    wx.showModal({
      title: '删除奖项',
      content: '确定删除「' + p.label + '」吗？' + (p.drawn ? '该奖项的中奖结果也会一并清除。' : ''),
      confirmColor: '#B23A3A',
      success: function (res) {
        if (!res.confirm) return;
        const list = that.data.lotteryPrizes.slice();
        list.splice(index, 1);
        that._savePrizes(list, '已删除');
      }
    });
  },

  // 参与名单
  importLotteryRsvp: function () {
    this._lotteryAction(function () { return api.importLotteryRsvp(); });
  },

  openParticipantModal: function () {
    this.setData({ showParticipantModal: true, participantInput: '' });
  },

  closeParticipantModal: function () {
    this.setData({ showParticipantModal: false });
  },

  onParticipantInput: function (e) {
    this.setData({ participantInput: e.detail.value });
  },

  confirmParticipants: function () {
    const names = String(this.data.participantInput || '')
      .split(/[\n,，、;；]+/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
    if (!names.length) {
      wx.showToast({ title: '请输入至少一个名字', icon: 'none' });
      return;
    }
    const list = this.data.lotteryParticipants.slice();
    const have = {};
    list.forEach(function (p) { have[p.name] = true; });
    let added = 0;
    names.forEach(function (n, i) {
      n = n.slice(0, 32);
      if (have[n]) return;
      have[n] = true;
      list.push({ id: genId('p') + i, name: n, source: 'manual' });
      added += 1;
    });
    this.setData({ showParticipantModal: false });
    if (!added) {
      wx.showToast({ title: '这些名字已在名单中', icon: 'none' });
      return;
    }
    this._lotteryAction(function () { return api.saveLotteryConfig({ participants: list }); }, '已添加 ' + added + ' 人');
  },

  removeParticipant: function (e) {
    const id = e.currentTarget.dataset.id;
    const p = this.data.lotteryParticipants.find(function (x) { return x.id === id; });
    if (!p) return;
    const that = this;
    wx.showModal({
      title: '移出名单',
      content: '把「' + p.name + '」移出抽奖名单？（已中奖的记录会保留）',
      confirmColor: '#B23A3A',
      success: function (res) {
        if (!res.confirm) return;
        const list = that.data.lotteryParticipants.filter(function (x) { return x.id !== id; });
        that._lotteryAction(function () { return api.saveLotteryConfig({ participants: list }); });
      }
    });
  },

  clearParticipants: function () {
    if (!this.data.lotteryParticipants.length) return;
    const that = this;
    wx.showModal({
      title: '清空名单',
      content: '确定清空全部 ' + this.data.lotteryParticipants.length + ' 位参与人吗？（已中奖的记录会保留）',
      confirmColor: '#B23A3A',
      success: function (res) {
        if (!res.confirm) return;
        that._lotteryAction(function () { return api.saveLotteryConfig({ participants: [] }); }, '已清空');
      }
    });
  },

  // 开奖控制
  startPrizeDraw: function (e) {
    const id = e.currentTarget.dataset.id;
    if (!this.data.lotteryParticipants.length) {
      wx.showModal({ title: '还没有参与名单', content: '请先「从回执名单导入出席宾客」或手动添加参与人。', showCancel: false });
      return;
    }
    if (this.data.lotteryRemaining <= 0) {
      wx.showModal({ title: '没有可抽的人了', content: '名单里的人都已中奖。可以添加参与人，或重置本场抽奖。', showCancel: false });
      return;
    }
    this._lotteryAction(function () { return api.startLottery(id); }, '大屏开始抽奖');
  },

  redrawPrize: function (e) {
    const id = e.currentTarget.dataset.id;
    const p = this.data.lotteryPrizes.find(function (x) { return x.id === id; });
    if (!p) return;
    const that = this;
    wx.showModal({
      title: '重新抽取',
      content: '「' + p.label + '」当前中奖：' + (p.winnersText || '无') + '。确定作废并重新抽取吗？',
      confirmColor: '#B23A3A',
      success: function (res) {
        if (!res.confirm) return;
        that._lotteryAction(function () { return api.redrawLottery(id); }, '大屏重新抽取');
      }
    });
  },

  revealNow: function () {
    this._lotteryAction(function () { return api.revealLottery(); }, '已开奖');
  },

  screenIdle: function () {
    this._lotteryAction(function () { return api.setLotteryScreen('idle'); }, '大屏回到等待页');
  },

  screenBoard: function () {
    this._lotteryAction(function () { return api.setLotteryScreen('board'); }, '大屏展示中奖名单');
  },

  resetLotteryAll: function () {
    const that = this;
    wx.showModal({
      title: '重置本场抽奖',
      content: '将清空所有中奖结果，大屏回到等待页；奖项和参与名单会保留。确定重置吗？',
      confirmColor: '#B23A3A',
      success: function (res) {
        if (!res.confirm) return;
        that._lotteryAction(function () { return api.resetLottery(); }, '已重置');
      }
    });
  },

  // ---- 我的婚礼二维码 ----

  loadQr: function (env) {
    var e = env || this.data.qrEnv || 'release';
    var base = api.getQrCodeUrl(e);
    if (!base) {
      this.setData({ qrSrc: '', qrError: '' });
      return;
    }
    // 时间戳避免缓存旧图（例如上次生成失败）
    this.setData({ qrEnv: e, qrError: '', qrSrc: base + '&t=' + Date.now() });
  },

  switchQrEnv: function (e) {
    this.loadQr(e.currentTarget.dataset.env);
  },

  onQrError: function () {
    this.setData({
      qrError: '二维码生成失败：请确认小程序已有对应环境的版本（正式版上线后默认可用；开发阶段可在开发者工具用「编译模式-通过二维码编译」测试）'
    });
  },

  copyWid: function () {
    if (!this.data.wid) return;
    wx.setClipboardData({
      data: this.data.wid,
      success: function () { wx.showToast({ title: '已复制婚礼标识', icon: 'success' }); }
    });
  }
});
