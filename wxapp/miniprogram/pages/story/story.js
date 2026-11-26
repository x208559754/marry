// pages/story/story.js
const app = getApp();
const api = require('../../utils/api.js');
const media = require('../../utils/media.js');

function normalizeStories(list) {
  return (list || []).filter(function (it) { return it && typeof it === 'object'; }).map(function (it, i) {
    return media.tagMedia({
      id: String(it.id || ('s' + i)),
      year: it.year || it.date || '',
      date: it.date || it.year || '',
      title: it.title || '',
      image: it.image || '',
      url: it.image || '',
      desc: it.desc || it.content || '',
      content: it.content || it.desc || ''
    });
  });
}

Page({
  data: {
    theme: 'red',
    loaded: false,
    storyList: []
  },

  onLoad: function () {
    if (app.syncPageTheme) app.syncPageTheme(this);
    this.loadStory();
  },

  onShow: function () {
    if (app.syncPageTheme) app.syncPageTheme(this);
  },

  onPullDownRefresh: function () {
    this.loadStory(function () {
      wx.stopPullDownRefresh();
    });
  },

  // 只读云端配置，未配置则空列表，不用内置示例
  loadStory: function (callback) {
    const done = function () {
      if (typeof callback === 'function') callback();
    };
    api.getWeddingConfig().then((cfg) => {
      let cloud = [];
      if (cfg && Array.isArray(cfg.story)) cloud = cfg.story;
      else if (cfg && Array.isArray(cfg.stories)) cloud = cfg.stories;
      this.setData({
        loaded: true,
        storyList: normalizeStories(cloud)
      });
      done();
    }).catch(() => {
      if (!this.data.loaded) this.setData({ loaded: true, storyList: [] });
      done();
    });
  }
});
