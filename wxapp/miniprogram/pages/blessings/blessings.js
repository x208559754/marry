// pages/blessings/blessings.js
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    theme: 'red',
    danmakuLanes: [],
    defaultAvatar: '',
    guestName: '',
    guestAvatar: '',
    inputContent: '',
    isSending: false,
    heartsCount: 0,
    heartBurst: [],
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
    const t = (app.getTheme && app.getTheme()) || 'red';
    this.setData({ theme: t });
    if (app.syncPageTheme) app.syncPageTheme(this);
    this.initUserProfile();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 4,
        visible: true,
        theme: t
      });
    }
  },

  onPullDownRefresh: function () {
    this.loadBlessings(function () {
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
    var that = this;
    var done = function () {
      if (typeof callback === 'function') callback();
    };
    Promise.all([
      api.getBlessingsList().catch(function () { return null; }),
      api.getHearts().catch(function () { return null; })
    ]).then(function (results) {
      var list = results[0];
      var hearts = results[1];
      var patch = {};
      if (list) {
        var formatted = (list || []).map(function (item, idx) {
          return {
            id: item.id || ('bless_' + idx),
            author: item.author || item.name || '挚友',
            avatar: item.avatar || that.data.defaultAvatar,
            content: item.content || item.text || '新婚大喜！',
            likes: item.likes || 1,
            createdAt: item.createdAt || '刚刚'
          };
        });
        patch.blessingsList = formatted;
        that.buildDanmaku(formatted);
        if (app.globalData) {
          app.globalData.blessingsCache = formatted;
          app.globalData.blessingsCacheWid = app.globalData.wid || '';
          app.globalData.blessingsLoadedAt = Date.now();
          if (app.notifyDanmakuChange) app.notifyDanmakuChange();
        }
      } else if (!(that.data.danmakuLanes && that.data.danmakuLanes.length)) {
        that.buildDanmaku([]);
      }
      if (hearts && typeof hearts.count === 'number') {
        patch.heartsCount = hearts.count;
      }
      if (Object.keys(patch).length) that.setData(patch);
      done();
    });
  },

  // 三轨无缝走马灯：每轨至少 6 条（不够就循环），内容复制一份后以 translateX(-50%) 循环，不再错位跳变
  buildDanmaku: function (list) {
    var source = [];
    (list || []).forEach(function (it) {
      var text = (it.content || '').trim();
      if (!text) return;
      source.push({
        author: it.author || '',
        text: text.length > 18 ? text.slice(0, 18) + '…' : text
      });
    });
    if (!source.length) {
      source = this.data.presetBlessings.map(function (t) {
        return { author: '', text: t };
      });
    }
    var durations = [28, 36, 32];
    var delays = [0, -12, -6];
    var minPerLane = 6;
    var lanes = [];
    for (var lane = 0; lane < 3; lane++) {
      var pool = [];
      for (var i = 0; i < source.length; i++) {
        if (i % 3 === lane) pool.push(source[i]);
      }
      if (!pool.length) pool = source.slice();
      var tags = [];
      var n = 0;
      while (tags.length < minPerLane) {
        var s = pool[n % pool.length];
        tags.push({
          key: 'l' + lane + '_' + tags.length,
          author: s.author,
          text: s.text
        });
        n++;
      }
      lanes.push({
        id: 'lane_' + lane,
        duration: durations[lane],
        delay: delays[lane],
        copies: [0, 1],
        tags: tags
      });
    }
    this.setData({ danmakuLanes: lanes });
  },

  sendHeart: function () {
    var now = Date.now();
    if (this._heartLock && now - this._heartLock < 200) return;
    this._heartLock = now;

    wx.vibrateShort({ type: 'light' });

    var burst = (this.data.heartBurst || []).concat([{
      key: 'hb_' + now + '_' + Math.floor(Math.random() * 1000),
      left: 30 + Math.floor(Math.random() * 40)
    }]);
    if (burst.length > 10) burst = burst.slice(-10);

    this.setData({
      heartsCount: (this.data.heartsCount || 0) + 1,
      heartBurst: burst
    });

    var that = this;
    if (this._burstTimer) clearTimeout(this._burstTimer);
    this._burstTimer = setTimeout(function () {
      that.setData({ heartBurst: [] });
    }, 1300);

    api.sendHeart().then(function (data) {
      if (data && typeof data.count === 'number') {
        that.setData({ heartsCount: data.count });
      }
    }).catch(function () {
      wx.showToast({ title: '心意发送失败，请稍后重试', icon: 'none' });
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

    var that = this;
    api.submitBlessing(newBlessing).then(function () {
      that.setData({
        isSending: false,
        inputContent: ''
      });
      if (app.pushSharedBlessing) app.pushSharedBlessing(newBlessing);
      wx.showToast({ title: '祝福已送达新人', icon: 'success' });
      that.loadBlessings();
    }).catch(function (err) {
      that.setData({ isSending: false });
      wx.showToast({ title: (err && err.message) || '发送失败', icon: 'none' });
    });
  },

  likeBlessing: function (e) {
    const id = e.currentTarget.dataset.id;
    api.likeBlessing(id).catch(function () {});
    const list = this.data.blessingsList.map(function (item) {
      if (item.id === id) {
        return Object.assign({}, item, { likes: (item.likes || 1) + 1 });
      }
      return item;
    });
    this.setData({ blessingsList: list });
    wx.vibrateShort({ type: 'light' });
  }
});
