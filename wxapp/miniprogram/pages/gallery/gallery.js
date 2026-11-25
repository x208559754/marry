// pages/gallery/gallery.js
const app = getApp();
const api = require('../../utils/api.js');

// 云端字段兼容：date/year、content/desc
function normalizeStories(list) {
  return (list || []).filter(function (it) { return it && typeof it === 'object'; }).map(function (it, i) {
    return {
      id: String(it.id || ('s' + i)),
      date: it.date || it.year || '',
      title: it.title || '',
      content: it.content || it.desc || '',
      image: it.image || ''
    };
  });
}

// 只读云端 story/stories；未配置则空列表，不再用内置示例
function pickCloudStories(cfg) {
  if (!cfg) return [];
  if (Array.isArray(cfg.story)) return cfg.story;
  if (Array.isArray(cfg.stories)) return cfg.stories;
  return [];
}

Page({
  data: {
    theme: 'red',
    photosList: [],
    storiesLoaded: false,
    storiesList: []
  },

  onLoad: function () {
    if (app.syncPageTheme) app.syncPageTheme(this);
    this.loadGallery();
  },

  onShow: function () {
    const t = (app.getTheme && app.getTheme()) || 'red';
    this.setData({ theme: t });
    if (app.syncPageTheme) app.syncPageTheme(this);
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1,
        visible: true,
        theme: t
      });
    }
  },

  onPullDownRefresh: function () {
    this.loadGallery(() => {
      wx.stopPullDownRefresh();
    });
  },

  loadGallery: function (callback) {
    const done = function () {
      if (typeof callback === 'function') callback();
    };
    const photosTask = api.getPhotosList().then((list) => {
      if (list && list.length > 0) {
        this.setData({ photosList: list });
      } else {
        const defaultList = [
          { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800', title: '相守晨曦' },
          { url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800', title: '春风十里' },
          { url: 'https://images.unsplash.com/photo-1529636798458-92182e662485?w=800', title: '星光誓约' },
          { url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800', title: '回眸一笑' },
          { url: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800', title: '余生皆你' }
        ];
        this.setData({ photosList: defaultList });
      }
    }).catch(() => {});

    const storiesTask = api.getWeddingConfig().then((cfg) => {
      this.setData({
        storiesLoaded: true,
        storiesList: normalizeStories(pickCloudStories(cfg))
      });
    }).catch(() => {
      if (!this.data.storiesLoaded) {
        this.setData({ storiesLoaded: true, storiesList: [] });
      }
    });

    Promise.all([photosTask, storiesTask]).then(done, done);
  },

  previewStoryImage: function (e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.previewImage({ current: url, urls: [url] });
  },

  previewImage: function (e) {
    const current = e.currentTarget.dataset.current;
    const urls = this.data.photosList.map((item) => item.url);
    wx.previewImage({
      current: current,
      urls: urls
    });
  },

  onShareAppMessage: function () {
    return {
      title: '婚纱大片 · 浪漫留影',
      path: '/pages/gallery/gallery'
    };
  }
});
