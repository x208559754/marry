// pages/admin/admin.js — 婚礼管理后台（微信 openid 白名单鉴权；数据来自 Cloudflare Worker + D1）
const app = getApp();
const api = require('../../utils/api.js');
const wechat = require('../../utils/wechat.js');

Page({
  data: {
    isAuthorized: false,
    currentOpenid: '',
    backend: '',
    curTab: 'guests',
    wid: '',
    qrEnv: 'release',
    qrSrc: '',
    qrError: '',
    rsvpList: [],
    loadingRsvps: false,
    photosList: [],
    uploading: false,
    savingConfig: false,
    stats: {
      totalAttendees: 0,
      yesCount: 0,
      noCount: 0,
      shuttleCount: 0
    },
    // 婚礼信息编辑表单
    configForm: {
      groomName: '', groomPhone: '',
      brideName: '', bridePhone: '',
      date: '', time: '',
      venueName: '', venueHall: '', venueAddress: '', venueLat: '', venueLng: '',
      contactGroom: '', contactBride: ''
    }
  },

  onLoad: function () {
    this.refreshAdminState();
  },

  onShow: function () {
    // 每次进入复查一次权限：ADMIN_OPENIDS 变更（重新部署）后无需清缓存即生效
    this.refreshAdminState();
  },

  onPullDownRefresh: function () {
    this.refreshAdminState(function () {
      wx.stopPullDownRefresh();
    });
  },

  // 复查登录态与管理员权限
  refreshAdminState: function (cb) {
    const that = this;
    this.setData({ backend: api.BASE_URL });
    api.getMe().then(function (me) {
      that.setData({
        currentOpenid: api.getOpenid() || '',
        isAuthorized: !!(me && me.isAdmin)
      });
      if (me && me.isAdmin) {
        that.setData({ wid: api.getWid() });
        that.refreshAll();
        that.loadConfigForm();
        that.loadQr();
      }
      if (typeof cb === 'function') cb();
    }).catch(function (err) {
      that.setData({ currentOpenid: api.getOpenid() || '' });
      console.warn('[admin] 获取登录态失败:', err && err.message);
      if (typeof cb === 'function') cb();
    });
  },

  copyOpenid: function () {
    if (!this.data.currentOpenid) return;
    wx.setClipboardData({
      data: this.data.currentOpenid,
      success: function () { wx.showToast({ title: '已复制 OpenID', icon: 'success' }); }
    });
  },

  logoutAdmin: function () {
    api.logout();
    this.setData({ isAuthorized: false, rsvpList: [], photosList: [] });
    wx.showToast({ title: '已退出管理', icon: 'none' });
  },

  switchTab: function (e) {
    this.setData({ curTab: e.currentTarget.dataset.tab });
  },

  refreshAll: function (callback) {
    this.loadRsvps();
    this.loadPhotos();
    if (typeof callback === 'function') callback();
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
    api.getPhotosList().then(function (list) {
      that.setData({ photosList: list || [] });
    }).catch(function () {});
  },

  chooseAndUploadPhoto: function () {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const tempPath = res.tempFiles[0].tempFilePath;
        that.setData({ uploading: true });
        api.uploadPhoto(tempPath, '婚纱照').then(function () {
          that.setData({ uploading: false });
          wx.showToast({ title: '上传成功', icon: 'success' });
          that.loadPhotos();
        }).catch(function (err) {
          that.setData({ uploading: false });
          wx.showModal({
            title: '上传失败',
            content: (err && err.message) || '请检查网络或服务端 IMGBB_API_KEY',
            showCancel: false
          });
        });
      }
    });
  },

  deletePhoto: function (e) {
    const that = this;
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除照片',
      content: '确定删除这张照片吗？',
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
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: this.data.photosList.map(function (p) { return p.url; })
    });
  },

  // ---- 婚礼信息设置 ----

  loadConfigForm: function () {
    const that = this;
    api.getConfig().then(function (cfg) {
      cfg = cfg || {};
      const groom = cfg.groom || {};
      const bride = cfg.bride || {};
      const venue = cfg.venue || {};
      const contacts = cfg.contacts || {};
      that.setData({
        configForm: {
          groomName: groom.name || '',
          groomPhone: groom.phone || '',
          brideName: bride.name || '',
          bridePhone: bride.phone || '',
          date: cfg.date || '',
          time: cfg.time || '',
          venueName: venue.name || '',
          venueHall: venue.hall || '',
          venueAddress: venue.address || '',
          venueLat: venue.latitude != null ? String(venue.latitude) : '',
          venueLng: venue.longitude != null ? String(venue.longitude) : '',
          contactGroom: contacts.groomPhone || '',
          contactBride: contacts.bridePhone || ''
        }
      });
    }).catch(function () {});
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
        date: f.date.trim(),
        time: f.time.trim(),
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
