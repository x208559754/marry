// pages/blessings/blessings.js
const app = getApp();
const notion = require('../../utils/notion.js');

Page({
  data: {
    defaultAvatar: '',
    guestName: '',
    guestAvatar: '',
    inputContent: '',
    isSending: false,
    heartsCount: 1314,
    presetBlessings: [
      '百年好合 永结同心',
      '佳偶天成 白头偕老',
      '新婚大喜 甜甜蜜蜜',
      '琴瑟和鸣 早生贵子',
      '岁岁年年 执手相伴'
    ],
    blessingsList: []
  },

  onLoad: function () {
    this.initUserProfile();
    this.loadBlessings();
  },

  onShow: function () {
    this.initUserProfile();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 4,
        visible: true
      });
    }
  },

  onPullDownRefresh: function () {
    this.loadBlessings(() => {
      wx.stopPullDownRefresh();
    });
  },

  initUserProfile: function () {
    const user = app.globalData.userInfo || wx.getStorageSync('wx_wedding_user');
    const guestNick = wx.getStorageSync('wedding_guest_nickname');
    const matched = app.globalData.matchedGuest || wx.getStorageSync('wx_wedding_submitted_rsvp');

    const name = (user && user.nickName) || guestNick || (matched && matched.name) || '';
    const avatar = (user && user.avatarUrl) || (matched && matched.avatarUrl) || '';

    if (name || avatar) {
      this.setData({
        guestName: name,
        guestAvatar: avatar
      });
    }
  },

  loadBlessings: function (callback) {
    notion.getBlessingsList().then((list) => {
      const formatted = (list || []).map((item, idx) => ({
        id: item.id || `bless_${idx}`,
        author: item.author || item.name || '挚友',
        avatar: item.avatar || this.data.defaultAvatar,
        content: item.content || item.text || '新婚大喜！',
        likes: item.likes || 1,
        createdAt: item.createdAt || '刚刚'
      }));

      this.setData({
        blessingsList: formatted,
        heartsCount: 1314 + formatted.length
      });
      if (typeof callback === 'function') callback();
    }).catch(() => {
      if (typeof callback === 'function') callback();
    });
  },

  sendHeart: function () {
    wx.vibrateShort({ type: 'light' });
    this.setData({
      heartsCount: this.data.heartsCount + 1
    });
    wx.showToast({
      title: '心动 +1 ♥',
      icon: 'none',
      duration: 1000
    });
  },

  selectPreset: function (e) {
    const text = e.currentTarget.dataset.text;
    this.setData({ inputContent: text });
  },

  onInput: function (e) {
    this.setData({ inputContent: e.detail.value });
  },

  sendBlessing: function () {
    const content = this.data.inputContent.trim();
    if (!content) {
      wx.showToast({ title: '请输入祝福寄语', icon: 'none' });
      return;
    }

    const author = this.data.guestName || '特邀宾客';
    const avatar = this.data.guestAvatar || this.data.defaultAvatar;

    this.setData({ isSending: true });

    const newBlessing = {
      author: author,
      content: content,
      avatar: avatar,
      likes: 1,
      createdAt: '刚刚'
    };

    notion.submitBlessing(newBlessing).then(() => {
      this.setData({
        isSending: false,
        inputContent: '',
        heartsCount: this.data.heartsCount + 1
      });
      wx.showToast({ title: '祝福已送达新人', icon: 'success' });
      this.loadBlessings();
    }).catch((err) => {
      this.setData({ isSending: false });
      wx.showToast({ title: err.message || '发送失败', icon: 'none' });
    });
  },

  likeBlessing: function (e) {
    const id = e.currentTarget.dataset.id;
    const list = this.data.blessingsList.map((item) => {
      if (item.id === id) {
        return Object.assign({}, item, { likes: (item.likes || 1) + 1 });
      }
      return item;
    });
    this.setData({ blessingsList: list });
    wx.vibrateShort({ type: 'light' });
    wx.showToast({ title: '点赞成功 ♥', icon: 'none' });
  }
});
