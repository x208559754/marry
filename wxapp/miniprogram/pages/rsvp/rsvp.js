// pages/rsvp/rsvp.js
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    // 默认不展示陌生人占位头像，仅当用户授权或设置过时才展示
    formData: {
      name: '',
      avatarUrl: '',
      phone: '',
      status: 'yes',
      guestsCount: 1,
      dietary: '正常荤素',
      needShuttle: false,
      blessing: ''
    },
    openid: '',
    openidShort: '',
    isNotionMatched: false,
    guestCountOptions: [1, 2, 3, 4, 5],
    dietOptions: ['正常荤素', '清真风味', '纯素养生', '海鲜忌口', '携带儿童餐'],
    quickBlessings: [
      '百年好合，永结同心！',
      '佳偶天成，白头偕老！',
      '新婚大喜，甜甜蜜蜜！',
      '琴瑟和鸣，早生贵子！'
    ],
    submitting: false,
    isSubmitted: false,
    isEditing: false
  },

  onLoad: function () {
    const openid = app.globalData.openid || wx.getStorageSync('wx_wedding_openid') || '';
    if (openid) {
      this.setData({
        openid: openid,
        openidShort: openid.length > 12 ? (openid.slice(0, 6) + '...' + openid.slice(-4)) : openid
      });
    }

    this.restoreGuestProfile();

    // 监听应用全局比对匹配事件
    this.guestListener = (guest) => {
      if (guest) this.applyMatchedGuest(guest);
    };
    app.addGuestMatchedListener(this.guestListener);

    // 尝试向 Notion 实时核验当前的 OpenID
    if (openid) {
      api.checkGuestByOpenid(openid).then((res) => {
        if (res && res.matched && res.guest) {
          this.applyMatchedGuest(res.guest);
        }
      });
    }
  },

  onShow: function () {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 3,
        visible: true
      });
    }
  },

  onUnload: function () {
    if (this.guestListener) {
      app.removeGuestMatchedListener(this.guestListener);
    }
  },

  // 应用已匹配的 Notion 宾客数据
  applyMatchedGuest: function (g) {
    if (!g) return;
    const dietMap = {
      standard: '正常荤素',
      vegetarian: '纯素食',
      halal: '清真饮食',
      child: '携带儿童餐'
    };
    const mappedDiet = dietMap[g.dietary] || g.dietary || '正常荤素';

    this.setData({
      isNotionMatched: true,
      isSubmitted: true,
      isEditing: false,
      'formData.name': g.name || this.data.formData.name,
      'formData.phone': g.phone || this.data.formData.phone,
      'formData.status': g.attending || 'yes',
      'formData.guestsCount': g.guestCount || 1,
      'formData.dietary': mappedDiet,
      'formData.needShuttle': Boolean(g.needsShuttle),
      'formData.blessing': g.blessing || this.data.formData.blessing
    });
  },

  // 展开或收起修改表单
  toggleEditForm: function () {
    const next = !this.data.isEditing;
    this.setData({ isEditing: next });
    if (next) {
      wx.pageScrollTo({
        selector: '.rsvp-ceremony-card',
        duration: 350
      });
    }
  },

  // 恢复之前保存过的宾客信息 (优先恢复本地及首页输入内容)
  restoreGuestProfile: function () {
    const matched = app.globalData.matchedGuest || wx.getStorageSync('wx_wedding_submitted_rsvp');
    if (matched) {
      this.applyMatchedGuest(matched);
      return;
    }

    const userInfo = app.globalData.userInfo || wx.getStorageSync('wx_wedding_user');
    const phone = app.globalData.phoneNumber || wx.getStorageSync('wx_wedding_phone') || wx.getStorageSync('wedding_guest_phone') || '';
    const guestNick = wx.getStorageSync('wedding_guest_nickname') || '';
    const savedBlessing = wx.getStorageSync('wedding_guest_blessing') || '';

    const name = (guestNick && guestNick !== '亲朋好友' && guestNick !== '特邀宾客')
      ? guestNick
      : ((userInfo && userInfo.nickName) ? userInfo.nickName : (this.data.formData.name || ''));

    const avatarUrl = (userInfo && userInfo.avatarUrl) ? userInfo.avatarUrl : '';

    this.setData({
      'formData.name': name,
      'formData.avatarUrl': avatarUrl,
      'formData.phone': phone || this.data.formData.phone || '',
      'formData.blessing': savedBlessing || this.data.formData.blessing || ''
    });
  },

  // 微信最新规范：选择头像
  onChooseAvatar: function (e) {
    const { avatarUrl } = e.detail;
    if (!avatarUrl) return;
    this.setData({
      'formData.avatarUrl': avatarUrl
    });
    // 更新全局
    const curUser = app.globalData.userInfo || {};
    curUser.avatarUrl = avatarUrl;
    app.globalData.userInfo = curUser;
    wx.setStorageSync('wx_wedding_user', curUser);
    wx.showToast({ title: '已选取头像', icon: 'success' });
  },

  // 移除已选头像
  removeAvatar: function () {
    this.setData({
      'formData.avatarUrl': ''
    });
    const curUser = app.globalData.userInfo || {};
    curUser.avatarUrl = '';
    app.globalData.userInfo = curUser;
    wx.setStorageSync('wx_wedding_user', curUser);
    wx.showToast({ title: '已移除头像', icon: 'none' });
  },

  // 快捷点选祝词
  selectQuickBlessing: function (e) {
    const text = e.currentTarget.dataset.text;
    if (text) {
      this.setData({
        'formData.blessing': text
      });
    }
  },

  // 微信昵称输入与推荐选择
  onNicknameChange: function (e) {
    const name = (e.detail.value || '').trim();
    if (name) {
      this.setData({ 'formData.name': name });
      const curUser = app.globalData.userInfo || {};
      curUser.nickName = name;
      app.globalData.userInfo = curUser;
      wx.setStorageSync('wx_wedding_user', curUser);
      wx.setStorageSync('wedding_guest_nickname', name);
    }
  },

  onNicknameBlur: function (e) {
    const name = (e.detail.value || '').trim();
    if (name) {
      this.setData({ 'formData.name': name });
      const curUser = app.globalData.userInfo || {};
      curUser.nickName = name;
      app.globalData.userInfo = curUser;
      wx.setStorageSync('wx_wedding_user', curUser);
      wx.setStorageSync('wedding_guest_nickname', name);
    }
  },

  onNameInput: function (e) {
    const val = e.detail.value;
    this.setData({ 'formData.name': val });
    if (val && val.trim()) {
      wx.setStorageSync('wedding_guest_nickname', val.trim());
    }
  },

  onPhoneInput: function (e) {
    this.setData({ 'formData.phone': e.detail.value });
  },

  // 微信官方快捷获取手机号
  onGetPhoneNumber: function (e) {
    app.resolvePhoneNumber(e, (phone) => {
      this.setData({
        'formData.phone': phone
      });
    });
  },

  selectStatus: function (e) {
    const status = e.currentTarget.dataset.value;
    this.setData({
      'formData.status': status
    });
  },

  selectGuestCount: function (e) {
    const count = parseInt(e.currentTarget.dataset.value, 10);
    this.setData({
      'formData.guestsCount': count
    });
  },

  selectDietary: function (e) {
    const diet = e.currentTarget.dataset.value;
    this.setData({
      'formData.dietary': diet
    });
  },

  toggleShuttle: function (e) {
    const need = e.currentTarget.dataset.value;
    this.setData({
      'formData.needShuttle': need
    });
  },

  onBlessingInput: function (e) {
    this.setData({
      'formData.blessing': e.detail.value
    });
  },

  // 提交到 Notion
  onSubmitRsvp: function () {
    const { name, phone, status, guestsCount, dietary, needShuttle, blessing, avatarUrl } = this.data.formData;
    const openid = this.data.openid || app.globalData.openid || wx.getStorageSync('wx_wedding_openid') || '';

    if (!name || !name.trim()) {
      wx.showToast({ title: '请填写宾客姓名或昵称', icon: 'none' });
      return;
    }

    if (!phone || !phone.trim()) {
      wx.showToast({ title: '请授权或输入手机号', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      openid: openid,
      attending: status,
      guestCount: status === 'yes' ? guestsCount : 0,
      dietary: status === 'yes' ? dietary : '',
      needShuttle: status === 'yes' ? needShuttle : false,
      blessing: blessing ? blessing.trim() : '',
      avatarUrl: avatarUrl || '',
      submittedAt: new Date().toISOString()
    };

    api.submitRsvp(payload).then((res) => {
      this.setData({
        submitting: false,
        isSubmitted: true,
        isNotionMatched: true,
        isEditing: false
      });
      const savedData = Object.assign({}, this.data.formData, { openid: openid });
      wx.setStorageSync('wx_wedding_submitted_rsvp', savedData);
      app.globalData.matchedGuest = savedData;
      wx.showModal({
        title: '回执已送达',
        content: '新人已收到您的出席心意，期待与您在婚礼盛典相聚！',
        showCancel: false,
        confirmText: '好的'
      });
    }).catch((err) => {
      this.setData({ submitting: false });
      wx.showModal({
        title: '提交提示',
        content: err.message || '网络不稳定，本地已暂存',
        showCancel: false
      });
    });
  }
});
