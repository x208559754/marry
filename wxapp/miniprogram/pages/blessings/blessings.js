// pages/blessings/blessings.js
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    danmakuList: [],
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
    this.initUserProfile();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 4,
        visible: true
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
      } else if (!that.data.danmakuList.length) {
        that.buildDanmaku([]);
      }
      if (hearts && typeof hearts.count === 'number') {
        patch.heartsCount = hearts.count;
      }
      if (Object.keys(patch).length) that.setData(patch);
      done();
    });
  },

  // 组装弹幕：真实祝福优先；数量不够时循环补满，保证舞台不空场、同轨道错开
  buildDanmaku: function (list) {
    var source = [];
    (list || []).forEach(function (it) {
      var text = (it.content || '').trim();
      if (!text) return;
      source.push({
        author: it.author || '',
        text: text.length > 22 ? text.slice(0, 22) + '…' : text
      });
    });
    if (!source.length) {
      source = this.data.presetBlessings.map(function (t) {
        return { author: '', text: t };
      });
    }
    var target = Math.max(12, Math.min(source.length * 2, 16));
    var items = [];
    for (var i = 0; i < target; i++) {
      var src = source[i % source.length];
      items.push({
        key: 'dm_' + i,
        author: src.author,
        text: src.text,
        style: i % 3,
        lane: i % 4,
        duration: 16 + (i % 5) * 3,
        delay: -(i * 1.9 + (i % 4) * 0.35)
      });
    }
    this.setData({ danmakuList: items });
  },

  sendHeart: function () {
    var now = Date.now();
    if (this._heartLock && now - this._heartLock < 200) return;
    this._heartLock = now;

    wx.vibrateShort({ type: 'light' });

    var burst = (this.data.heartBurst || []).concat([{
      key: 'hb_' + now + '_' + Math.floor(Math.random() * 1000),
      left: 28 + Math.floor(Math.random() * 44),
      drift: Math.floor(Math.random() * 40) - 20
    }]);
    if (burst.length > 10) burst = burst.slice(-10);

    this.setData({
      heartsCount: (this.data.heartsCount || 0) + 1,
      heartBurst: burst
    });

    var that = this;
    setTimeout(function () {
      var remain = (that.data.heartBurst || []).filter(function (h) {
        return h.key !== burst[burst.length - 1].key;
      });
      // 只清掉已经播完的，避免把后来的点击一并清掉
    }, 1200);
    // 延迟统一清掉过期动画，避免数组无限增长
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
