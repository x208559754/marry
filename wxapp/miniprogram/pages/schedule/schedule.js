// pages/schedule/schedule.js
const app = getApp();
const api = require('../../utils/api.js');
const wechat = require('../../utils/wechat.js');

function normalizeSchedule(list) {
  return (list || []).filter(function (it) { return it && typeof it === 'object'; }).map(function (it, i) {
    return {
      id: String(it.id || ('t' + i)),
      time: it.time || '',
      title: it.title || '',
      desc: it.desc || it.content || ''
    };
  });
}

Page({
  data: {
    theme: 'red',
    config: {},
    scheduleLoaded: false,
    scheduleList: [],
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
    if (app.syncPageTheme) app.syncPageTheme(this);
    this.loadData();
  },

  onShow: function () {
    const t = (app.getTheme && app.getTheme()) || 'red';
    this.setData({ theme: t });
    if (app.syncPageTheme) app.syncPageTheme(this);
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2,
        visible: true,
        theme: t
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
      // 只读云端行程，未配置则空列表，不用内置示例
      this.setData({
        scheduleLoaded: true,
        scheduleList: (cfg && Array.isArray(cfg.schedule)) ? normalizeSchedule(cfg.schedule) : []
      });
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
      if (!this.data.scheduleLoaded) this.setData({ scheduleLoaded: true, scheduleList: [] });
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
