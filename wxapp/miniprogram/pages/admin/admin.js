// pages/admin/admin.js
const app = getApp();
const notion = require('../../utils/notion.js');
const wechat = require('../../utils/wechat.js');

Page({
  data: {
    isAuthorized: false,
    inputPin: '',
    curTab: 'guests',
    rsvpList: [],
    loadingRsvps: false,
    photosList: [],
    uploading: false,
    initializing: false,
    stats: {
      totalAttendees: 0,
      yesCount: 0,
      noCount: 0,
      shuttleCount: 0
    },
    notionStatus: {
      hasApiKey: true,
      rsvpOk: true,
      blessingsOk: true
    },
    appId: '',
    appSecret: '',
    currentOpenid: ''
  },

  onLoad: function () {
    const isSavedAuth = wx.getStorageSync('wx_wedding_admin_auth');
    this.initWechatConfig();
    if (isSavedAuth) {
      this.setData({ isAuthorized: true });
      this.refreshAll();
    }
  },

  initWechatConfig: function () {
    const accountInfo = (wx.getAccountInfoSync && typeof wx.getAccountInfoSync === 'function')
      ? wx.getAccountInfoSync()
      : null;
    const dynamicAppId = (accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.appId && accountInfo.miniProgram.appId !== '__UNI__')
      ? accountInfo.miniProgram.appId
      : (app.globalData.appId || 'wx12a496fabe6eb244');

    this.setData({
      appId: dynamicAppId,
      appSecret: app.globalData.appSecret || wx.getStorageSync('wx_wedding_app_secret') || '',
      currentOpenid: app.globalData.openid || wx.getStorageSync('wx_wedding_openid') || ''
    });
  },

  onPullDownRefresh: function () {
    if (this.data.isAuthorized) {
      this.refreshAll(() => {
        wx.stopPullDownRefresh();
      });
    } else {
      wx.stopPullDownRefresh();
    }
  },

  onPinInput: function (e) {
    this.setData({ inputPin: e.detail.value });
  },

  verifyPin: function () {
    const pin = this.data.inputPin.trim();
    if (pin === '8888' || pin === '6666' || pin === '520') {
      wx.setStorageSync('wx_wedding_admin_auth', true);
      this.setData({ isAuthorized: true });
      wx.showToast({ title: '欢迎进入管理后台', icon: 'success' });
      this.refreshAll();
    } else {
      wx.showToast({ title: '口令错误，请重试', icon: 'none' });
    }
  },

  logoutAdmin: function () {
    wx.removeStorageSync('wx_wedding_admin_auth');
    this.setData({
      isAuthorized: false,
      inputPin: ''
    });
  },

  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ curTab: tab });
  },

  refreshAll: function (callback) {
    this.loadRsvps();
    this.loadPhotos();
    if (typeof callback === 'function') callback();
  },

  loadRsvps: function () {
    this.setData({ loadingRsvps: true });
    notion.getRsvpList().then((list) => {
      let attendees = 0;
      let yes = 0;
      let no = 0;
      let shuttle = 0;

      (list || []).forEach(item => {
        if (item.attending === 'yes') {
          yes += 1;
          attendees += (parseInt(item.guestCount, 10) || 1);
          if (item.needShuttle) shuttle += 1;
        } else {
          no += 1;
        }
      });

      this.setData({
        rsvpList: list || [],
        loadingRsvps: false,
        stats: {
          totalAttendees: attendees,
          yesCount: yes,
          noCount: no,
          shuttleCount: shuttle
        }
      });
    }).catch(() => {
      this.setData({ loadingRsvps: false });
    });
  },

  loadPhotos: function () {
    notion.getNotionImages().then((imgs) => {
      if (imgs && imgs.length > 0) {
        this.setData({ photosList: imgs });
      } else {
        return notion.getWeddingConfig();
      }
    }).then((cfg) => {
      if (cfg && cfg.photos) {
        this.setData({ photosList: cfg.photos });
      }
    }).catch(() => {});
  },

  chooseAndUploadPhoto: function () {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath;
        that.setData({ uploading: true });

        notion.uploadImageToNotion(tempPath).then((res) => {
          that.setData({ uploading: false });
          wx.showToast({ title: '图片已上传至Notion', icon: 'success' });
          that.loadPhotos();
        }).catch((err) => {
          that.setData({ uploading: false });
          wx.showModal({
            title: '上传提示',
            content: err.message || '上传失败，请检查网络或配置',
            showCancel: false
          });
        });
      }
    });
  },

  previewPhoto: function (e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: this.data.photosList.map(p => p.url)
    });
  },

  callGuest: function (e) {
    const phone = e.currentTarget.dataset.phone;
    wechat.makePhoneCall(phone);
  },

  autoInitColumns: function () {
    this.setData({ initializing: true });
    wx.request({
      url: `${app.globalData.apiBase}/api/notion/init-database-schema`,
      method: 'POST',
      data: { target: 'all' },
      success: (res) => {
        this.setData({ initializing: false });
        if (res.data && res.data.success) {
          wx.showModal({
            title: '补齐字段成功',
            content: '已成功在 Notion RSVP 数据库中补齐 6 大属性列（姓名、出席、人数、手机号、饮食、班车、祝福）！',
            showCancel: false
          });
          this.loadRsvps();
        } else {
          wx.showToast({ title: res.data.message || '操作失败', icon: 'none' });
        }
      },
      fail: () => {
        this.setData({ initializing: false });
        wx.showToast({ title: '网络请求超时', icon: 'none' });
      }
    });
  },

  onAppSecretInput: function (e) {
    this.setData({ appSecret: e.detail.value });
  },

  saveAppSecret: function () {
    const secret = (this.data.appSecret || '').trim();
    app.globalData.appSecret = secret;
    wx.setStorageSync('wx_wedding_app_secret', secret);
    wx.showToast({ title: 'AppSecret 已保存', icon: 'success' });
  },

  testJscode2Session: function () {
    const that = this;
    wx.showLoading({ title: '正在测试登录...' });
    app.doWxLogin((res) => {
      wx.hideLoading();
      if (res && res.openid) {
        that.setData({ currentOpenid: res.openid });
        wx.showModal({
          title: '解析成功',
          content: `OpenID:\n${res.openid}\n\nSessionKey:\n${res.session_key ? (res.session_key.slice(0, 10) + '...') : '已解析'}`,
          showCancel: false
        });
      } else {
        wx.showModal({
          title: '解析未成功',
          content: `errcode: ${res ? res.errcode : '无'}\nerrmsg: ${res ? res.errmsg : '请确认AppSecret是否正确并在开发者工具中勾选不校验合法域名'}`,
          showCancel: false
        });
      }
    });
  }
});
