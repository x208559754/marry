// pages/upgrade/upgrade.js — 多档套餐对比 + 购买 / 升级（微信支付 JSAPI；服务端 PAY_MOCK=1 时为模拟支付）
// 套餐列表来自 GET /api/plan 的 plans（平台总后台「套餐管理」配置）；只能买比当前档位高的套餐，按新套餐全价计费
const api = require('../../utils/api.js');

function yuan(fen) {
  const v = (Number(fen) || 0) / 100;
  return v % 1 ? v.toFixed(2) : String(v);
}
function isTop(plans, p) {
  let max = 0;
  plans.forEach(function (x) { if (x.level > max) max = x.level; });
  return p.level > 0 && p.level >= max && plans.length > 2;
}

Page({
  data: {
    loading: true,
    error: '',
    isCreateMode: false,
    groomName: '',
    brideName: '',
    myWedding: null,
    premium: false,
    currentCode: 'free',
    currentName: '免费版',
    currentLevel: 0,
    expiresText: '',
    expired: false,
    activatedAt: '',
    payMode: 'unavailable',
    plans: [],
    selected: '',
    selectedPlan: null,
    priceText: '',
    canBuy: false,
    isUpgrade: false,
    paying: false,
    wid: '',
    showKefu: false,
    wechatId: 'lzx91697'
  },

  onLoad: function (q) {
    this._want = (q && q.plan) || '';
    this._forceCreate = !!(q && q.mode === 'create');
    this.load();
  },

  onGroomInput: function (e) {
    this.setData({ groomName: e.detail.value });
  },

  onBrideInput: function (e) {
    this.setData({ brideName: e.detail.value });
  },

  enterMyWedding: function () {
    const w = this.data.myWedding;
    if (!w || !w.id) return;
    this._enterAdminForWid(w.id);
  },

  _enterAdminForWid: function (wid) {
    api.setWid(wid);
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.wid = wid;
      app.globalData.isAdmin = true;
    }
    api.login().catch(function () {}).then(function () {
      wx.redirectTo({ url: '/pages/admin/admin' });
    });
  },

  load: function () {
    const that = this;
    const curWid = api.getWid() || 'demo';
    const isCreateMode = this._forceCreate || (curWid === 'demo' && !api.getSuperAdminPasscode());
    this.setData({ loading: true, error: '', wid: curWid, isCreateMode: isCreateMode });
    if (isCreateMode) {
      wx.setNavigationBarTitle({ title: '开通我的专属请柬' });
      api.getMyWeddings().then(function (res) {
        const list = (res && res.weddings) || [];
        that.setData({ myWedding: list.length ? list[0] : null });
      }).catch(function () {});
    }
    api.getPlan().then(function (d) {
      const w = (d && d.wedding) || {};
      const raw = (d && d.plans) || [];
      const level = isCreateMode ? -1 : (Number(w.level) || 0);
      const plans = raw.map(function (p) {
        const buyable = isCreateMode ? true : (p.code !== 'free' && p.level > level);
        return Object.assign({}, p, {
          priceText: yuan(p.priceFen),
          originalText: p.originalFen && p.originalFen > p.priceFen ? yuan(p.originalFen) : '',
          periodText: p.code === 'free' ? '基础体验 · 永久免费' : (p.days ? '按场次 · ' + p.days + ' 天有效' : '按场次 · 一次付费 · 永久有效'),
          current: isCreateMode ? false : (p.code === w.plan),
          included: isCreateMode ? false : (p.level < level),
          buyable: buyable,
          top: isTop(raw, p)
        });
      });
      // 默认选中：指定的套餐 > 首个付费套餐 > 首个可选套餐
      let sel = '';
      const want = that._want;
      plans.forEach(function (p) { if (p.buyable && p.code === want) sel = p.code; });
      if (!sel) for (let i = 0; i < plans.length; i++) if (plans[i].buyable && plans[i].code !== 'free') { sel = plans[i].code; break; }
      if (!sel) for (let i = 0; i < plans.length; i++) if (plans[i].buyable) { sel = plans[i].code; break; }
      that.setData({
        loading: false,
        premium: isCreateMode ? false : !!w.premium,
        currentCode: isCreateMode ? '' : (w.plan || 'free'),
        currentName: isCreateMode ? '' : (w.planName || '免费版'),
        currentLevel: isCreateMode ? 0 : level,
        expired: isCreateMode ? false : !!w.expired,
        expiresText: !isCreateMode && w.expiresAt && !w.expired ? String(w.expiresAt).slice(0, 10) : '',
        activatedAt: !isCreateMode && w.activatedAt ? String(w.activatedAt).slice(0, 10) : '',
        payMode: d.payMode || 'unavailable',
        plans: plans
      });
      that._select(sel);
    }).catch(function (err) {
      that.setData({ loading: false, error: (err && err.message) || '加载失败，请重试' });
    });
  },

  _select: function (code) {
    let p = null;
    this.data.plans.forEach(function (x) { if (x.code === code) p = x; });
    this.setData({
      selected: p ? p.code : '',
      selectedPlan: p,
      priceText: p ? p.priceText : '',
      canBuy: !!(p && p.buyable),
      isUpgrade: !!(p && !this.data.isCreateMode && this.data.currentLevel > 0)
    });
  },

  choose: function (e) {
    const code = e.currentTarget.dataset.code;
    let p = null;
    this.data.plans.forEach(function (x) { if (x.code === code) p = x; });
    if (!p || !p.buyable || this.data.paying) return;
    this._select(code);
  },

  pay: function () {
    if (this.data.paying || !this.data.canBuy) return;
    const p = this.data.selectedPlan;
    const that = this;

    // 开通模式 + 免费版：直接免费创建专属婚礼并进入后台
    if (this.data.isCreateMode && p && p.code === 'free') {
      this.setData({ paying: true });
      api.createFreeWedding({
        groomName: (this.data.groomName || '').trim(),
        brideName: (this.data.brideName || '').trim()
      }).then(function (res) {
        that.setData({ paying: false });
        wx.showToast({ title: '已开通免费版，正在进入后台', icon: 'success' });
        setTimeout(function () {
          that._enterAdminForWid(res.wid);
        }, 900);
      }).catch(function (err) {
        that.setData({ paying: false });
        if (err && err.existingWid) {
          wx.showModal({
            title: '您已拥有专属请柬',
            content: '每个微信号可免费开通 1 场请柬。您可以直接进入自己的管理后台，或选择付费套餐再开通一场。',
            confirmText: '进入我的后台',
            confirmColor: '#8B1E1E',
            success: function (r) {
              if (r.confirm) that._enterAdminForWid(err.existingWid);
            }
          });
          return;
        }
        wx.showModal({ title: '开通失败', content: (err && err.message) || '网络异常，请重试', showCancel: false });
      });
      return;
    }

    if (this.data.payMode === 'unavailable') {
      this.setData({ showKefu: true });
      return;
    }
    const go = function () {
      that.setData({ paying: true });
      const orderPromise = that.data.isCreateMode
        ? api.createNewWeddingOrder(p.code, {
            groomName: (that.data.groomName || '').trim(),
            brideName: (that.data.brideName || '').trim()
          })
        : api.createPayOrder(p.code);
      orderPromise.then(function (o) {
        if (o.mock) return that._mockPay(o, p);
        return that._wxPay(o);
      }).catch(function (err) {
        that.setData({ paying: false });
        wx.showModal({ title: '无法下单', content: (err && err.message) || '网络异常，请重试', showCancel: false });
      });
    };
    if (!this.data.isCreateMode && this.data.currentLevel > 0) {
      wx.showModal({
        title: '升级到' + p.name,
        content: '当前已是「' + this.data.currentName + '」。升级按「' + p.name + '」全价 ¥' + p.priceText + ' 计费，不折算已付金额，确认升级？',
        confirmText: '确认升级',
        confirmColor: '#8B1E1E',
        success: function (r) { if (r.confirm) go(); }
      });
      return;
    }
    go();
  },

  _mockPay: function (o, p) {
    const that = this;
    return new Promise(function (resolve) {
      wx.showModal({
        title: '测试模式',
        content: '当前为模拟支付（不会真实扣款），确认支付 ¥' + yuan(o.amountFen) + ' 开通「' + ((p && p.name) || '套餐') + '」？',
        confirmText: '模拟支付',
        confirmColor: '#8B1E1E',
        success: function (r) {
          if (!r.confirm) { that.setData({ paying: false }); return resolve(); }
          api.mockConfirmPay(o.orderNo).then(function (d) {
            that._done(!!(d && d.order && d.order.status === 'paid'), d && d.planName, (d && d.wid) || o.wid);
            resolve();
          }).catch(function (err) {
            that.setData({ paying: false });
            wx.showToast({ title: (err && err.message) || '支付失败', icon: 'none' });
            resolve();
          });
        }
      });
    });
  },

  _wxPay: function (o) {
    const that = this;
    const p = o.payParams || {};
    return new Promise(function (resolve) {
      wx.requestPayment({
        timeStamp: p.timeStamp,
        nonceStr: p.nonceStr,
        package: p.package,
        signType: p.signType || 'RSA',
        paySign: p.paySign,
        success: function () {
          wx.showLoading({ title: '确认支付结果', mask: true });
          that._poll(o.orderNo, 0, resolve, o.wid);
        },
        fail: function (err) {
          that.setData({ paying: false });
          const msg = (err && err.errMsg) || '';
          wx.showToast({ title: msg.indexOf('cancel') !== -1 ? '已取消支付' : '支付未完成', icon: 'none' });
          resolve();
        }
      });
    });
  },

  // 支付成功后轮询订单（回调可能稍有延迟；服务端会主动向微信查单）
  _poll: function (orderNo, n, resolve, expectedWid) {
    const that = this;
    api.getPayOrder(orderNo).then(function (d) {
      if (d && d.order && d.order.status === 'paid') {
        wx.hideLoading();
        that._done(true, d.planName, d.wid || expectedWid);
        return resolve();
      }
      if (n >= 7) throw new Error('timeout');
      setTimeout(function () { that._poll(orderNo, n + 1, resolve, expectedWid); }, 1500);
    }).catch(function () {
      if (n < 7) { setTimeout(function () { that._poll(orderNo, n + 1, resolve, expectedWid); }, 1500); return; }
      wx.hideLoading();
      that.setData({ paying: false });
      wx.showModal({ title: '支付结果确认中', content: '如已扣款，套餐会在几分钟内自动生效；也可稍后重新进入本页查看。', showCancel: false });
      resolve();
    });
  },

  _done: function (ok, name, newWid) {
    const that = this;
    this.setData({ paying: false });
    if (!ok) { this.load(); return; }
    if (this.data.isCreateMode && newWid) {
      wx.showToast({ title: '已开通，正在进入后台', icon: 'success' });
      setTimeout(function () {
        that._enterAdminForWid(newWid);
      }, 1200);
      return;
    }
    wx.showToast({ title: '已开通' + (name || (this.data.selectedPlan && this.data.selectedPlan.name) || '套餐'), icon: 'success' });
    this.load();
    setTimeout(function () {
      const pages = getCurrentPages();
      if (pages.length > 1) wx.navigateBack();
    }, 1600);
  },

  contact: function () {
    this.setData({ showKefu: true });
  },

  closeKefu: function () {
    this.setData({ showKefu: false });
  },

  noop: function () {},

  copyWechat: function () {
    wx.setClipboardData({
      data: 'lzx91697',
      success: function () {
        wx.showToast({ title: '已复制微信号', icon: 'success' });
      }
    });
  }
});
