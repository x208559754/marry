// custom-tab-bar/index.js - 高定婚礼导航底栏控制
Component({
  data: {
    selected: 0,
    visible: true,
    list: [
      {
        pagePath: "/pages/index/index",
        text: "请柬",
        iconPath: "/images/tab-home-v2.svg",
        selectedIconPath: "/images/tab-home-active-v2.svg"
      },
      {
        pagePath: "/pages/gallery/gallery",
        text: "相册",
        iconPath: "/images/tab-gallery-v2.svg",
        selectedIconPath: "/images/tab-gallery-active-v2.svg"
      },
      {
        pagePath: "/pages/schedule/schedule",
        text: "盛典",
        iconPath: "/images/tab-schedule-v2.svg",
        selectedIconPath: "/images/tab-schedule-active-v2.svg"
      },
      {
        pagePath: "/pages/rsvp/rsvp",
        text: "回执",
        iconPath: "/images/tab-rsvp-v2.svg",
        selectedIconPath: "/images/tab-rsvp-active-v2.svg"
      },
      {
        pagePath: "/pages/blessings/blessings",
        text: "祝福",
        iconPath: "/images/tab-bless-v2.svg",
        selectedIconPath: "/images/tab-bless-active-v2.svg"
      }
    ]
  },

  methods: {
    switchTab: function (e) {
      const idx = e.currentTarget.dataset.index;
      const item = this.data.list[idx];
      if (item && item.pagePath) {
        wx.switchTab({
          url: item.pagePath
        });
      }
    }
  }
});
