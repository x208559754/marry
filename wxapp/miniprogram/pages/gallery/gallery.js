// pages/gallery/gallery.js
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    photosList: [],
    storiesList: [
      {
        id: '1',
        date: '2022.05.20',
        title: '初遇 · 心动的序章',
        content: '在那个满溢着初夏微风的午后，一次偶遇，开启了我们故事的序章。彼此对视的那一刻，眼中便有了星河。',
        image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800'
      },
      {
        id: '2',
        date: '2023.10.01',
        title: '相知 · 执手同行',
        content: '从春日漫步到秋日看海，四季轮转里，我们成为了彼此最坚定而温暖的依靠。走过千山万水，风景不及身旁的你。',
        image: 'https://images.unsplash.com/photo-1529636798458-92182e662485?w=800'
      },
      {
        id: '3',
        date: '2025.02.14',
        title: '求婚 · 许诺余生',
        content: '星光为证，玫瑰为信。“愿与你携手，共赴余生朝暮”，这是最庄重的誓言，也是最笃定的浪漫。',
        image: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=800'
      }
    ]
  },

  onLoad: function () {
    this.loadGallery();
  },

  onShow: function () {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1,
        visible: true
      });
    }
  },

  onPullDownRefresh: function () {
    this.loadGallery(() => {
      wx.stopPullDownRefresh();
    });
  },

  loadGallery: function (callback) {
    api.getPhotosList().then((list) => {
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
      if (typeof callback === 'function') callback();
    }).catch(() => {
      if (typeof callback === 'function') callback();
    });
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
