// pages/schedule/schedule.js
const app = getApp();
const api = require('../../utils/api.js');
const wechat = require('../../utils/wechat.js');

Page({
  data: {
    config: {},
    scheduleList: [
      { time: '10:18', title: '宾客签到·雅乐迎宾', desc: '签到处签到，领取婚礼专属喜礼与席位卡' },
      { time: '11:18', title: '花亭合影·挚友留念', desc: '与新人于花艺留影区同框合影，记录喜悦时光' },
      { time: '11:58', title: '神圣仪式·执手此生', desc: '新郎新娘步入殿堂，交换婚戒与神圣誓言' },
      { time: '12:28', title: '喜筵启席·举杯同庆', desc: '饕餮珍馐宴开，新人敬酒感恩亲朋' },
      { time: '14:00', title: '甜品欢聚·圆满礼成', desc: '法式甜品台分享，抽取幸运捧花大奖' }
    ],
    venue: {
      hotel: '半岛国际大酒店',
      hall: '三层金玉满堂宴会大厅',
      address: '上海市黄浦区中山东一路128号',
      latitude: 31.2389,
      longitude: 121.4905
    },
    contacts: {
      groomPhone: '13812345678',
      bridePhone: '13987654321'
    }
  },

  onLoad: function () {
    this.loadData();
  },

  onShow: function () {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2,
        visible: true
      });
    }
  },

  onPullDownRefresh: function () {
    this.loadData(() => {
      wx.stopPullDownRefresh();
    });
  },

  loadData: function (callback) {
    api.getWeddingConfig().then((cfg) => {
      this.setData({ config: cfg });
      if (cfg && cfg.schedule && cfg.schedule.length > 0) {
        this.setData({ scheduleList: cfg.schedule });
      }
      if (cfg && cfg.venue) {
        this.setData({
          venue: {
            hotel: cfg.venue.hotel || cfg.venue.name || this.data.venue.hotel,
            hall: cfg.venue.hall || this.data.venue.hall,
            address: cfg.venue.address || this.data.venue.address,
            latitude: parseFloat(cfg.venue.latitude) || this.data.venue.latitude,
            longitude: parseFloat(cfg.venue.longitude) || this.data.venue.longitude
          }
        });
      }
      if (cfg && cfg.contacts) {
        this.setData({ contacts: cfg.contacts });
      }
      if (typeof callback === 'function') callback();
    }).catch(() => {
      if (typeof callback === 'function') callback();
    });
  },

  // 微信原生一键导航
  openMapNavigation: function () {
    const { latitude, longitude, hotel, address } = this.data.venue;
    wechat.openMapLocation(latitude, longitude, hotel, address);
  },

  // 微信一键拨打电话
  callPhone: function (e) {
    const phone = e.currentTarget.dataset.phone;
    wechat.makePhoneCall(phone);
  }
});
