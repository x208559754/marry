// components/ambient-overlay/ambient-overlay.js
function getAppSafe() {
  try {
    return typeof getApp === 'function' ? getApp() : null;
  } catch (e) {
    return null;
  }
}

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

// 26 片覆盖全屏宽度的花瓣种子（负 animation-delay，开屏首帧即满屏柔美飘散）
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
  { id: 'fb-3', author: '大学闺蜜', content: '最美的新娘，愿你们幸福到白头！' },
  { id: 'fb-4', author: '发小陈晨', content: '佳偶天成，执手相伴一生一世！' },
  { id: 'fb-5', author: '同事同仁', content: '喜结良缘，花好月圆，早生贵子！' },
  { id: 'fb-6', author: '小姨', content: '良缘永结，琴瑟和鸣，幸福长久！' }
];

// 5 条大间距错落高度轨道（覆盖 17vh ~ 71vh，轨距 13–14vh，绝不垂直贴脸或重叠）
const LANE_TOPS_VH = [17, 30, 44, 58, 71];
const SPAWN_INTERVAL_MS = 3200;
const LANE_COOLDOWN_MS = 8200;
const MAX_ACTIVE_PILLS = 4;

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

function normalizeBlessingPool(list) {
  const raw = (Array.isArray(list) && list.length ? list : FALLBACK_BLESSINGS)
    .map(function (it, idx) {
      const textRaw = String((it && (it.content || it.text)) || '').trim();
      if (!textRaw) return null;
      return {
        id: String((it && it.id) || ('b_' + idx)),
        author: String((it && (it.author || it.name)) || '').trim().slice(0, 8),
        text: textRaw.length > 20 ? textRaw.slice(0, 20) + '…' : textRaw,
        justSent: !!(it && it._justSent)
      };
    })
    .filter(Boolean)
    .slice(0, 24);
  return raw.length ? raw : normalizeBlessingPool(FALLBACK_BLESSINGS);
}

Component({
  properties: {
    theme: {
      type: String,
      value: 'red',
      observer: function (val) {
        const next = val || 'red';
        if (next === this._curTheme) return;
        this._curTheme = next;
        this.setData({ petals: buildPetals(next) });
      }
    },
    showPetals: {
      type: Boolean,
      value: true
    },
    showDanmaku: {
      type: Boolean,
      value: true,
      observer: function (val) {
        if (val) {
          this.startDanmakuLoop();
        } else {
          this.stopDanmakuLoop(true);
        }
      }
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
    toggleTopPx: 14
  },

  lifetimes: {
    attached: function () {
      const app = getAppSafe();
      this._pool = normalizeBlessingPool([]);
      this._cursor = 0;
      this._seq = 0;
      this._lastLane = -1;
      this._laneBusyUntil = LANE_TOPS_VH.map(function () { return 0; });
      this._lastJustSentId = '';

      this.computeToggleTop();
      const t = this.properties.theme || (app && app.getTheme && app.getTheme()) || 'red';
      this._curTheme = t;
      const visible = !(app && app.globalData && app.globalData.danmakuVisible === false);
      this.setData({
        petals: buildPetals(t),
        danmakuOn: visible
      });

      this._onDanmakuUpdate = (state) => {
        if (state && typeof state.visible === 'boolean') {
          if (state.visible !== this.data.danmakuOn) {
            this.setData({ danmakuOn: state.visible });
          }
          if (!state.visible) {
            this.stopDanmakuLoop(true);
          }
        }
        if (state && Array.isArray(state.list)) {
          this._pool = normalizeBlessingPool(state.list);
          // 若宾客刚刚发了一条新祝福，立即高亮飘出
          const first = this._pool[0];
          if (first && first.justSent && first.id !== this._lastJustSentId) {
            this._lastJustSentId = first.id;
            if (this.properties.showDanmaku && this.data.danmakuOn) {
              this.spawnOnePill(first, 0);
            }
          }
        }
        if (this.properties.showDanmaku && this.data.danmakuOn) {
          this.startDanmakuLoop();
        }
      };

      if (app && app.addDanmakuListener) {
        app.addDanmakuListener(this._onDanmakuUpdate);
      }
      if (app && app.loadSharedBlessings) {
        app.loadSharedBlessings(false);
      }
      if (this.properties.showDanmaku && visible) {
        this.startDanmakuLoop();
      }
    },

    detached: function () {
      this.stopDanmakuLoop(true);
      const app = getAppSafe();
      if (this._onDanmakuUpdate && app && app.removeDanmakuListener) {
        app.removeDanmakuListener(this._onDanmakuUpdate);
      }
    }
  },

  pageLifetimes: {
    show: function () {
      const app = getAppSafe();
      const t = this.properties.theme || (app && app.getTheme && app.getTheme()) || 'red';
      const visible = !(app && app.globalData && app.globalData.danmakuVisible === false);
      const patch = { danmakuOn: visible };
      if (t !== this._curTheme) {
        this._curTheme = t;
        patch.petals = buildPetals(t);
      }
      this.setData(patch);
      if (app && app.loadSharedBlessings) {
        app.loadSharedBlessings(false);
      }
      if (this.properties.showDanmaku && visible) {
        this.startDanmakuLoop();
      }
    },
    hide: function () {
      this.stopDanmakuLoop(false);
    }
  },

  methods: {
    computeToggleTop: function () {
      const custom = Number(this.properties.toggleOffsetTop) || 0;
      const top = custom > 0 ? custom : 14;
      if (top !== this.data.toggleTopPx) {
        this.setData({ toggleTopPx: top });
      }
    },

    pickFreeLane: function (now) {
      const busy = this._laneBusyUntil || [];
      const free = [];
      for (var i = 0; i < LANE_TOPS_VH.length; i++) {
        if ((busy[i] || 0) <= now) free.push(i);
      }
      if (!free.length) return -1;
      // 尽量不连续使用同一轨道，让弹幕在不同高度间优雅错落
      const preferred = free.filter((l) => l !== this._lastLane);
      const candidates = preferred.length ? preferred : free;
      return candidates[Math.floor(Math.random() * candidates.length)];
    },

    spawnOnePill: function (customItem, delaySec) {
      if (!this.properties.showDanmaku || !this.data.danmakuOn) return;
      const pool = this._pool && this._pool.length ? this._pool : normalizeBlessingPool([]);
      const now = Date.now();

      // 先清理已飘出屏幕的旧弹幕，保持界面始终清爽有序
      let active = (this.data.danmakuItems || []).filter(function (it) {
        return it && it.expiresAt > now;
      });
      if (!customItem && active.length >= MAX_ACTIVE_PILLS) return;

      let lane = this.pickFreeLane(now);
      if (lane === -1) {
        if (!customItem) return;
        // 刚发的新祝福优先挑一条最快释放的轨道
        lane = 1;
      }

      const item = customItem || pool[(this._cursor++) % pool.length];
      if (!item) return;

      const textLen = (item.author ? item.author.length : 0) + item.text.length;
      // 文字越长稍微多给一点时间，视觉飘动速度均匀舒缓
      const duration = Number(Math.min(16, Math.max(12.5, 11.8 + textLen * 0.14)).toFixed(1));
      const dSec = typeof delaySec === 'number' ? delaySec : 0;

      this._lastLane = lane;
      this._laneBusyUntil[lane] = now + LANE_COOLDOWN_MS + Math.round(dSec * 1000);
      this._seq = (this._seq || 0) + 1;

      const pill = {
        id: 'dm_' + this._seq + '_' + lane,
        author: item.author,
        text: item.text,
        top: LANE_TOPS_VH[lane],
        duration: duration,
        delay: dSec,
        highlight: !!item.justSent,
        expiresAt: now + Math.round((duration + dSec + 0.6) * 1000)
      };

      active = active.concat([pill]).slice(-6);
      this.setData({ danmakuItems: active });
    },

    startDanmakuLoop: function () {
      if (!this.properties.showDanmaku || !this.data.danmakuOn) return;
      if (this._spawnTimer) return;

      const now = Date.now();
      const alive = (this.data.danmakuItems || []).filter(function (it) { return it && it.expiresAt > now; });
      // 首屏先有序铺出 2 条错峰弹幕（不扎堆，不空白）
      if (alive.length === 0) {
        this.spawnOnePill(null, -2.6);
        this.spawnOnePill(null, 0);
      }

      this._spawnTimer = setInterval(() => {
        if (!this.properties.showDanmaku || !this.data.danmakuOn) {
          this.stopDanmakuLoop(true);
          return;
        }
        this.spawnOnePill(null, 0);
      }, SPAWN_INTERVAL_MS);
    },

    stopDanmakuLoop: function (clearList) {
      if (this._spawnTimer) {
        clearInterval(this._spawnTimer);
        this._spawnTimer = null;
      }
      if (clearList && this.data.danmakuItems && this.data.danmakuItems.length) {
        this.setData({ danmakuItems: [] });
        this._laneBusyUntil = LANE_TOPS_VH.map(function () { return 0; });
      }
    },

    onToggleDanmaku: function () {
      const app = getAppSafe();
      const next = !this.data.danmakuOn;
      if (app && app.setDanmakuVisible) {
        app.setDanmakuVisible(next);
      } else {
        this.setData({ danmakuOn: next });
        if (next) this.startDanmakuLoop();
        else this.stopDanmakuLoop(true);
      }
      wx.showToast({
        title: next ? '已开启祝福弹幕' : '已隐藏祝福弹幕',
        icon: 'none',
        duration: 1100
      });
    }
  }
});
