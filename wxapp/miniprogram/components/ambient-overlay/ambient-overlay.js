// components/ambient-overlay/ambient-overlay.js
const app = getApp();

const THEME_PALETTES = {
  red: {
    colors: [
      'linear-gradient(135deg, #F43F5E 0%, #BE123C 100%)',
      'linear-gradient(135deg, #FB7185 0%, #E11D48 100%)',
      'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)',
      'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)'
    ],
    shapes: ['petal', 'petal-wide', 'petal', 'flake'],
    shadow: '0 2rpx 8rpx rgba(190, 18, 60, 0.22)'
  },
  pink: {
    colors: [
      'linear-gradient(135deg, #FFF1F2 0%, #FBCFE8 100%)',
      'linear-gradient(135deg, #FBCFE8 0%, #F472B6 100%)',
      'linear-gradient(135deg, #FFE4E6 0%, #FB7185 100%)',
      'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)'
    ],
    shapes: ['petal-wide', 'petal', 'petal-wide', 'flake'],
    shadow: '0 2rpx 10rpx rgba(244, 114, 182, 0.24)'
  },
  night: {
    colors: [
      'linear-gradient(135deg, #EDE9FE 0%, #A78BFA 100%)',
      'linear-gradient(135deg, #DBEAFE 0%, #60A5FA 100%)',
      'linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)',
      'linear-gradient(135deg, #F5F3FF 0%, #C4B5FD 100%)'
    ],
    shapes: ['petal', 'flake', 'petal-wide', 'flake'],
    shadow: '0 0 12rpx rgba(196, 181, 253, 0.45)'
  },
  forest: {
    colors: [
      'linear-gradient(135deg, #BBF7D0 0%, #4ADE80 100%)',
      'linear-gradient(135deg, #D1FAE5 0%, #34D399 100%)',
      'linear-gradient(135deg, #FEF9C3 0%, #FDE047 100%)',
      'linear-gradient(135deg, #ECFDF5 0%, #86EFAC 100%)'
    ],
    shapes: ['leaf', 'petal', 'leaf', 'flake'],
    shadow: '0 2rpx 8rpx rgba(52, 211, 153, 0.22)'
  },
  champagne: {
    colors: [
      'linear-gradient(135deg, #FFFBEB 0%, #F3D59B 100%)',
      'linear-gradient(135deg, #FEF3C7 0%, #D9A85B 100%)',
      'linear-gradient(135deg, #FDE68A 0%, #C59348 100%)',
      'linear-gradient(135deg, #FFFFFF 0%, #EAD6B1 100%)'
    ],
    shapes: ['petal', 'petal-wide', 'flake', 'petal'],
    shadow: '0 2rpx 10rpx rgba(197, 147, 72, 0.24)'
  }
};

// 26 片覆盖全屏宽度的花瓣种子（使用负 animation-delay，打开页面首帧即满屏飘散）
const PETAL_SEEDS = [
  { left: 3,  size: 22, dur: 11.4, delay: -1.2,  path: 'a', op: 0.72 },
  { left: 7,  size: 16, dur: 14.8, delay: -7.5,  path: 'b', op: 0.56 },
  { left: 11, size: 28, dur: 10.2, delay: -4.1,  path: 'c', op: 0.78 },
  { left: 15, size: 19, dur: 13.5, delay: -9.8,  path: 'a', op: 0.64 },
  { left: 19, size: 25, dur: 11.8, delay: -2.6,  path: 'b', op: 0.74 },
  { left: 23, size: 15, dur: 15.6, delay: -11.4, path: 'c', op: 0.52 },
  { left: 27, size: 30, dur: 9.8,  delay: -6.0,  path: 'a', op: 0.76 },
  { left: 31, size: 20, dur: 12.6, delay: -0.7,  path: 'b', op: 0.66 },
  { left: 35, size: 24, dur: 13.9, delay: -8.3,  path: 'c', op: 0.70 },
  { left: 39, size: 17, dur: 15.0, delay: -3.4,  path: 'a', op: 0.58 },
  { left: 43, size: 26, dur: 10.6, delay: -10.1, path: 'b', op: 0.76 },
  { left: 47, size: 14, dur: 14.2, delay: -5.2,  path: 'c', op: 0.54 },
  { left: 51, size: 29, dur: 11.1, delay: -1.9,  path: 'a', op: 0.78 },
  { left: 55, size: 21, dur: 13.1, delay: -7.9,  path: 'b', op: 0.68 },
  { left: 59, size: 16, dur: 16.0, delay: -12.6, path: 'c', op: 0.55 },
  { left: 63, size: 27, dur: 10.4, delay: -4.8,  path: 'a', op: 0.75 },
  { left: 67, size: 19, dur: 12.8, delay: -9.1,  path: 'b', op: 0.64 },
  { left: 71, size: 24, dur: 11.6, delay: -2.2,  path: 'c', op: 0.72 },
  { left: 75, size: 15, dur: 15.2, delay: -10.9, path: 'a', op: 0.52 },
  { left: 79, size: 30, dur: 9.6,  delay: -6.4,  path: 'b', op: 0.78 },
  { left: 83, size: 20, dur: 13.4, delay: -0.5,  path: 'c', op: 0.66 },
  { left: 87, size: 25, dur: 12.0, delay: -8.7,  path: 'a', op: 0.74 },
  { left: 91, size: 17, dur: 14.5, delay: -3.8,  path: 'b', op: 0.58 },
  { left: 95, size: 23, dur: 10.9, delay: -11.8, path: 'c', op: 0.70 },
  { left: 48, size: 18, dur: 12.2, delay: -6.7,  path: 'b', op: 0.62 },
  { left: 76, size: 22, dur: 13.8, delay: -4.4,  path: 'a', op: 0.68 }
];

const FALLBACK_BLESSINGS = [
  { id: 'fb-1', author: '挚友阿杰', content: '祝两位新人百年好合，永结同心！' },
  { id: 'fb-2', author: '表姐一家', content: '新婚大喜，岁岁年年甜甜蜜蜜！' },
  { id: 'fb-3', author: '大学闺蜜', content: '最美的新娘，愿你们幸福美满到白头！' },
  { id: 'fb-4', author: '发小陈晨', content: '佳偶天成，执手相伴一生一世！' },
  { id: 'fb-5', author: '同事同仁', content: '喜结良缘，花好月圆，早生贵子！' },
  { id: 'fb-6', author: '小姨', content: '良缘永结，琴瑟和鸣，幸福长久！' },
  { id: 'fb-7', author: '老同学', content: '一定要狠狠幸福呀，婚礼现场见！' }
];

// 7 条覆盖整屏高度（14vh ~ 76vh）的任意分布弹幕高度槽
const LANE_TOPS_VH = [14, 24, 35, 46, 57, 67, 76];

function buildPetals(themeKey) {
  const pal = THEME_PALETTES[themeKey] || THEME_PALETTES.red;
  return PETAL_SEEDS.map(function (s, idx) {
    const shape = pal.shapes[idx % pal.shapes.length];
    const bg = pal.colors[idx % pal.colors.length];
    const isFlake = shape === 'flake';
    const w = isFlake ? Math.max(10, Math.round(s.size * 0.45)) : s.size;
    const h = isFlake ? w : Math.round(s.size * (shape === 'leaf' ? 1.32 : 1.18));
    return {
      id: 'p_' + idx,
      left: s.left,
      w: w,
      h: h,
      shape: shape,
      path: s.path,
      bg: bg,
      shadow: pal.shadow,
      opacity: s.op,
      duration: s.dur,
      delay: s.delay
    };
  });
}

function buildDanmakuItems(list) {
  const raw = (Array.isArray(list) && list.length ? list : FALLBACK_BLESSINGS)
    .filter(function (it) { return it && String(it.content || it.text || '').trim(); })
    .slice(0, 14);
  if (!raw.length) return [];

  // 若祝福不足 7 条，轻量循环补齐到 7 条，保证整屏不同高度都有弹幕优雅飘过
  const source = raw.slice();
  let guard = 0;
  while (source.length < 7 && guard < 14) {
    source.push(raw[guard % raw.length]);
    guard++;
  }

  return source.map(function (it, idx) {
    const lane = idx % LANE_TOPS_VH.length;
    const round = Math.floor(idx / LANE_TOPS_VH.length);
    // 同轨相邻弹幕错开半程，且高度带轻微有机微调（任意感强且绝不重叠）
    const jitter = ((idx * 17) % 5) - 2; // -2 ~ +2 vh
    const top = Math.max(12, Math.min(78, LANE_TOPS_VH[lane] + jitter));
    const duration = Number((13.5 + (lane % 4) * 1.9 + (round % 2) * 0.8).toFixed(1));
    const lanePhase = (lane * 2.4 + round * (duration * 0.52)) % duration;
    const delay = Number((-lanePhase).toFixed(1));
    const textRaw = String(it.content || it.text || '').trim();
    const text = textRaw.length > 24 ? textRaw.slice(0, 24) + '…' : textRaw;
    return {
      id: 'dm_' + (it.id || idx) + '_' + idx,
      author: String(it.author || it.name || '').trim().slice(0, 10),
      text: text,
      top: top,
      duration: duration,
      delay: delay,
      highlight: !!it._justSent
    };
  });
}

Component({
  properties: {
    theme: {
      type: String,
      value: 'red',
      observer: function (val) {
        this.setData({ petals: buildPetals(val || 'red') });
      }
    },
    showPetals: {
      type: Boolean,
      value: true
    },
    showDanmaku: {
      type: Boolean,
      value: true
    },
    showToggle: {
      type: Boolean,
      value: true
    },
    toggleOffsetTop: {
      type: Number,
      value: 0,
      observer: function () {
        this.computeToggleTop();
      }
    }
  },

  data: {
    petals: buildPetals('red'),
    danmakuItems: [],
    danmakuOn: true,
    toggleTopPx: 18
  },

  lifetimes: {
    attached: function () {
      this.computeToggleTop();
      this.setData({
        petals: buildPetals(this.properties.theme || (app.getTheme && app.getTheme()) || 'red'),
        danmakuOn: app.globalData.danmakuVisible !== false
      });

      this._onDanmakuUpdate = (state) => {
        const patch = {};
        if (state && typeof state.visible === 'boolean') patch.danmakuOn = state.visible;
        if (state && Array.isArray(state.list)) patch.danmakuItems = buildDanmakuItems(state.list);
        if (Object.keys(patch).length) this.setData(patch);
      };
      if (app.addDanmakuListener) {
        app.addDanmakuListener(this._onDanmakuUpdate);
      }
      if (app.loadSharedBlessings) {
        app.loadSharedBlessings(false);
      } else {
        this.setData({ danmakuItems: buildDanmakuItems([]) });
      }
    },

    detached: function () {
      if (this._onDanmakuUpdate && app.removeDanmakuListener) {
        app.removeDanmakuListener(this._onDanmakuUpdate);
      }
    }
  },

  pageLifetimes: {
    show: function () {
      const t = this.properties.theme || (app.getTheme && app.getTheme()) || 'red';
      this.setData({
        petals: buildPetals(t),
        danmakuOn: app.globalData.danmakuVisible !== false
      });
      if (app.loadSharedBlessings) {
        app.loadSharedBlessings(false);
      }
    }
  },

  methods: {
    computeToggleTop: function () {
      const custom = Number(this.properties.toggleOffsetTop) || 0;
      if (custom > 0) {
        this.setData({ toggleTopPx: custom });
        return;
      }
      // 默认用于有系统导航栏的子页面（右上角距顶 14px，清晰不遮挡标题）
      this.setData({ toggleTopPx: 14 });
    },

    onToggleDanmaku: function () {
      const next = !this.data.danmakuOn;
      if (app.setDanmakuVisible) {
        app.setDanmakuVisible(next);
      } else {
        this.setData({ danmakuOn: next });
      }
      wx.showToast({
        title: next ? '已开启祝福弹幕' : '已隐藏祝福弹幕',
        icon: 'none',
        duration: 1100
      });
    }
  }
});
