// pages/story/story.js
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    storyList: [
      {
        year: '2022年·初遇',
        title: '春风十里，初遇惊鸿',
        image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
        desc: '在图书馆转角的阳光下，那一抹浅浅的微笑，惊艳了整个漫长春季。我们关于未来的对话，便从那一刻悄然开启。'
      },
      {
        year: '2024年·心动',
        title: '同甘共苦，岁月并肩',
        image: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800',
        desc: '走过四时三餐，行遍山川湖海。在无数个平凡与不平凡的日子里，你的陪伴成为我最坚定的底气与归宿。'
      },
      {
        year: '2026年·定情',
        title: '执手许诺，共度余生',
        image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
        desc: '单膝跪地，倾尽一生的深情与承诺。“愿意”两个字，定格成我们生命中最动人的永恒回响。'
      }
    ]
  },

  onLoad: function () {
    this.loadStory();
  },

  loadStory: function () {
    api.getWeddingConfig().then((cfg) => {
      if (cfg && cfg.story && cfg.story.length > 0) {
        this.setData({ storyList: cfg.story });
      }
    }).catch(() => {});
  }
});
