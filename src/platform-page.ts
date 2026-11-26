import { icpFooterHtml, icpFooterPlatformStyle } from './icp-footer'

// src/platform-page.ts — 平台总后台网页（单页，原生 JS；接口见 src/platform.ts）
// 注意：本文件是模板字符串，内嵌脚本里不要使用反引号和美元花括号
export const platformPage = String.raw`<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>有囍請柬 · 平台总后台</title>
<style>
:root{--red:#b8282e;--red2:#8f1d22;--gold:#c9a063;--gold2:#e8d3a8;--bg:#faf6f0;--card:#fff;--ink:#2b2321;--mut:#8c7f78;--line:#eee4d8;--ok:#2e8b57;--warn:#d48806;--bad:#c0392b}
*{box-sizing:border-box}
body{margin:0;font:14px/1.6 -apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--ink)}
a{color:var(--red);text-decoration:none;cursor:pointer}
button{font:inherit;cursor:pointer;border:1px solid var(--line);background:#fff;color:var(--ink);border-radius:8px;padding:6px 14px}
button:hover{border-color:var(--gold)}
button.pri{background:var(--red);border-color:var(--red);color:#fff}
button.pri:hover{background:var(--red2)}
button.danger{color:var(--bad);border-color:#f0c9c4}
button.sm{padding:2px 10px;font-size:12px;border-radius:6px}
button:disabled{opacity:.5;cursor:default}
input,select,textarea{font:inherit;border:1px solid var(--line);border-radius:8px;padding:6px 10px;background:#fff;color:var(--ink);outline:none}
input:focus,select:focus,textarea:focus{border-color:var(--gold)}
.hide{display:none!important}
#login{min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 30% 20%,#c7353b,#7d171c)}
.lbox{width:340px;background:#fff;border-radius:18px;padding:36px 30px;box-shadow:0 20px 60px rgba(0,0,0,.25);text-align:center}
.lbox .xi{font-size:44px;color:var(--red);font-family:"STKaiti","KaiTi",serif;line-height:1}
.lbox h1{font-size:18px;margin:10px 0 4px}
.lbox p{color:var(--mut);margin:0 0 22px;font-size:13px}
.lbox input{width:100%;padding:10px 12px;margin-bottom:12px}
.lbox button{width:100%;padding:10px}
.lerr{color:var(--bad);font-size:13px;min-height:20px;margin-top:8px}
#app{display:flex;min-height:100vh;background:linear-gradient(90deg,#7d171c 210px,var(--bg) 210px)}
aside{width:210px;flex:none;background:linear-gradient(180deg,#a8242a,#7d171c);color:#fbeee0;padding:22px 0;position:sticky;top:0;height:100vh}
.brand{padding:0 22px 22px;border-bottom:1px solid rgba(255,255,255,.12);margin-bottom:10px}
.brand b{font-size:17px;letter-spacing:1px;display:block}
.brand span{font-size:12px;color:var(--gold2);opacity:.85}
nav a{display:flex;align-items:center;gap:10px;padding:11px 22px;color:#fbeee0;opacity:.82;border-left:3px solid transparent}
nav a:hover{opacity:1;background:rgba(255,255,255,.06)}
nav a.on{opacity:1;background:rgba(255,255,255,.12);border-left-color:var(--gold)}
nav a i{font-style:normal;width:18px;text-align:center}
nav a em{margin-left:auto;font-style:normal;background:var(--gold);color:#5a1010;border-radius:10px;padding:0 7px;font-size:11px;font-weight:600}
.logout{position:absolute;bottom:20px;left:22px;color:var(--gold2);font-size:13px;opacity:.8}
.aside-foot{position:absolute;bottom:20px;left:22px;right:16px;display:flex;flex-direction:column;gap:8px}
.aside-foot a{color:var(--gold2);font-size:13px;opacity:.8}
.aside-foot a:hover{opacity:1}
main{flex:1;min-width:0;padding:26px 30px 60px}
.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.top h2{margin:0;font-size:20px}
.top .sub{color:var(--mut);font-size:13px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin-bottom:18px}
.card h3{margin:0 0 12px;font-size:15px}
.stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px;margin-bottom:18px}
.stat{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px 18px;position:relative;overflow:hidden}
.stat:after{content:"";position:absolute;right:-18px;top:-18px;width:64px;height:64px;border-radius:50%;background:rgba(201,160,99,.12)}
.stat .k{color:var(--mut);font-size:12px}
.stat .v{font-size:26px;font-weight:600;margin-top:2px;color:var(--ink)}
.stat .d{font-size:12px;color:var(--mut)}
.stat.hl .v{color:var(--red)}
table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--mut);font-weight:500;font-size:12px;background:#fdfaf5;white-space:nowrap}
tr:hover td{background:#fffcf7}
.tag{display:inline-block;padding:0 8px;border-radius:10px;font-size:12px;line-height:20px;white-space:nowrap;background:#f4efe8;color:var(--mut)}
.tag.red{background:#fde8e6;color:var(--bad)}.tag.gold{background:#fbf1de;color:#9a6b1f}.tag.green{background:#e5f4ea;color:var(--ok)}.tag.warn{background:#fff3dc;color:var(--warn)}
.bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}
.bar input[type=search]{width:240px}
.pager{display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:12px;color:var(--mut);font-size:13px}
.muted{color:var(--mut)}
.content{max-width:420px;word-break:break-all;white-space:pre-wrap}
.chart{width:100%;height:220px}
.legend{display:flex;gap:16px;font-size:12px;color:var(--mut);margin-bottom:6px}
.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.kv{display:grid;grid-template-columns:110px 1fr;gap:6px 12px;font-size:13px}
.kv b{color:var(--mut);font-weight:400}
.empty{text-align:center;color:var(--mut);padding:30px 0}
#toast{position:fixed;left:50%;top:22px;transform:translateX(-50%);background:#2b2321;color:#fff;padding:9px 18px;border-radius:10px;font-size:13px;z-index:99;opacity:0;transition:opacity .2s;pointer-events:none}
#toast.show{opacity:.95}
.mask{position:fixed;inset:0;background:rgba(30,15,10,.45);display:flex;align-items:flex-start;justify-content:center;padding-top:8vh;z-index:50;overflow:auto}
.dlg{background:#fff;border-radius:16px;width:720px;max-width:94vw;padding:22px 24px;margin-bottom:40px}
.dlg h3{margin:0 0 14px;display:flex;justify-content:space-between}
.form{display:grid;grid-template-columns:150px 1fr;gap:10px 14px;align-items:center}
.form label{color:var(--mut);font-size:13px}
.form textarea{min-height:70px}
.sys{display:flex;gap:10px;flex-wrap:wrap;font-size:12px}
.tag.vip{background:linear-gradient(90deg,#8f1d22,#b8282e);color:#f6dfa8;box-shadow:0 0 0 1px #c9a063 inset}
.dlg.wide{width:980px}
.dlg h4{margin:0 0 8px;font-size:14px}
.plan-box{margin-top:16px;border:1px solid #ecd9b8;background:linear-gradient(180deg,#fffaf0,#fff);border-radius:12px;padding:14px 16px}
.pb-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap}
.pb-name{font-size:16px;font-weight:600;color:var(--red2)}
.ubar{margin-bottom:10px}
.ubar .ul{display:flex;justify-content:space-between;font-size:13px;color:var(--mut)}
.ubar .ul b{color:var(--ink);font-weight:500}
.ut{height:8px;border-radius:5px;background:#f3ebe0;overflow:hidden;margin-top:3px}
.ut i{display:block;height:100%;border-radius:5px;background:linear-gradient(90deg,#d9b56e,#c9a063)}
.ut i.warn{background:linear-gradient(90deg,#f0b54a,#d48806)}.ut i.full{background:linear-gradient(90deg,#d9534f,#b8282e)}.ut i.ok{background:repeating-linear-gradient(45deg,#e5f4ea,#e5f4ea 6px,#d3ecdc 6px,#d3ecdc 12px)}
.picks{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.pick{border:1px solid var(--line);border-radius:10px;padding:10px 12px;cursor:pointer;display:flex;flex-direction:column;gap:2px}
.pick input{display:none}.pick b{font-size:14px}.pick span{font-size:12px;color:var(--mut)}
.pick.on{border-color:var(--red);background:#fff6f4;box-shadow:0 0 0 1px var(--red) inset}
.plan-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:16px;margin-bottom:18px}
.pcard{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px 18px;display:flex;flex-direction:column}
.pcard.off{opacity:.72;background:#fcfaf7}
.pc-top{display:flex;justify-content:space-between;align-items:center}
.pc-price{font-size:24px;font-weight:600;color:var(--red);margin:8px 0 2px}
.pc-price s{font-size:13px;color:var(--mut);font-weight:400}.pc-price span{font-size:12px;color:var(--mut);font-weight:400;margin-left:8px}
.pc-foot{margin-top:auto;display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding-top:10px;font-size:12px}
.pdist{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px}
.pd-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}.pd-h b{font-size:20px}
a.wtag{display:inline-flex;align-items:center;gap:4px;color:var(--ink);margin:0 6px 4px 0}

@media(max-width:860px){aside{display:none}.grid2{grid-template-columns:1fr}main{padding:16px 16px 80px}}
` + icpFooterPlatformStyle + `
</style>
</head>
<body>
<div id="login">
  <div class="lbox">
    <div class="xi">囍</div>
    <h1>有囍請柬 · 平台总后台</h1>
    <p>仅限平台运营人员使用</p>
    <input id="pwd" type="password" placeholder="请输入后台密码" autocomplete="current-password">
    <button class="pri" id="loginBtn">登 录</button>
    <div class="lerr" id="lerr"></div>
  </div>
</div>
<div id="app" class="hide">
  <aside>
    <div class="brand"><b>有囍請柬</b><span>平台总后台</span></div>
    <nav id="nav">
      <a data-v="overview"><i>◎</i>数据概览</a>
      <a data-v="weddings"><i>囍</i>婚礼管理</a>
      <a data-v="users"><i>☺</i>用户</a>
      <a data-v="orders"><i>¥</i>订单</a>
      <a data-v="moderation"><i>⚑</i>内容审核<em id="flagN" class="hide"></em></a>
      <a data-v="blessings"><i>✉</i>祝福 / 弹幕</a>
      <a data-v="plans"><i>♛</i>套餐管理</a>
      <a data-v="pricing"><i>⚙</i>设置</a>
    </nav>
    <div class="aside-foot">
      <a id="chgPw">修改密码</a>
      <a id="logout">退出登录</a>
    </div>
  </aside>
  <main id="main"></main>
</div>
<div id="toast"></div>
` + icpFooterHtml + `
<script>
(function(){
var TOKEN = sessionStorage.getItem('yx_platform_token') || '';
var main = document.getElementById('main');
var state = { view: 'overview', q: {} };

function $(id){ return document.getElementById(id); }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function yuan(fen){ return '¥' + (Number(fen || 0) / 100).toFixed(2).replace(/\.00$/, ''); }
function toast(msg){ var t = $('toast'); t.textContent = msg; t.className = 'show'; clearTimeout(toast._t); toast._t = setTimeout(function(){ t.className = ''; }, 2200); }
function qs(o){ var a = []; for (var k in o) if (o[k] !== '' && o[k] != null) a.push(encodeURIComponent(k) + '=' + encodeURIComponent(o[k])); return a.length ? '?' + a.join('&') : ''; }

function api(method, path, body){
  return fetch('/api/platform' + path, {
    method: method,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
    body: body ? JSON.stringify(body) : undefined
  }).then(function(r){
    return r.json().catch(function(){ return { ok: false, error: '服务器错误 ' + r.status }; }).then(function(j){
      if (r.status === 401 && path !== '/login') { logout(); throw new Error(j.error || '请重新登录'); }
      if (!j.ok) throw new Error(j.error || '请求失败');
      return j.data;
    });
  });
}
function fail(e){ toast(e && e.message ? e.message : String(e)); }

function showApp(){ $('login').classList.add('hide'); $('app').classList.remove('hide'); loadPlans().catch(function(){}).then(function(){ go(location.hash.slice(1) || 'overview'); }); }
function logout(){ TOKEN = ''; sessionStorage.removeItem('yx_platform_token'); $('app').classList.add('hide'); $('login').classList.remove('hide'); }
function doLogin(){
  var p = $('pwd').value; if (!p) return;
  $('loginBtn').disabled = true; $('lerr').textContent = '';
  api('POST', '/login', { password: p }).then(function(d){
    TOKEN = d.token; sessionStorage.setItem('yx_platform_token', TOKEN); $('pwd').value = ''; showApp();
  }).catch(function(e){ $('lerr').textContent = e.message; }).then(function(){ $('loginBtn').disabled = false; });
}
$('loginBtn').onclick = doLogin;
$('pwd').onkeydown = function(e){ if (e.key === 'Enter') doLogin(); };
$('logout').onclick = logout;
$('chgPw').onclick = function(){ go('pricing'); };

function doChangePw(){
  var oldP = $('curPwd').value, nw = $('newPwd').value, cf = $('cfmPwd').value;
  if (!oldP || !nw || !cf) { toast('请填写完整'); return; }
  if (nw.length < 8) { toast('新密码至少 8 位'); return; }
  if (nw !== cf) { toast('两次输入的新密码不一致'); return; }
  $('pwBtn').disabled = true;
  api('POST', '/password', { oldPassword: oldP, newPassword: nw, confirmPassword: cf }).then(function(d){
    if (d.token) { TOKEN = d.token; sessionStorage.setItem('yx_platform_token', TOKEN); }
    $('curPwd').value = ''; $('newPwd').value = ''; $('cfmPwd').value = '';
    toast('密码已更新，其它登录会话已失效');
  }).catch(fail).then(function(){ $('pwBtn').disabled = false; });
}

var navs = document.querySelectorAll('#nav a');
for (var i = 0; i < navs.length; i++) navs[i].onclick = function(){ go(this.getAttribute('data-v')); };
window.onhashchange = function(){ var v = location.hash.slice(1); if (v && v !== state.view && TOKEN) go(v); };

function go(v){
  if (!VIEWS[v]) v = 'overview';
  state.view = v; if (location.hash.slice(1) !== v) location.hash = v;
  for (var i = 0; i < navs.length; i++) navs[i].classList.toggle('on', navs[i].getAttribute('data-v') === v);
  main.innerHTML = '<div class="empty">加载中…</div>';
  VIEWS[v]();
}
function head(title, sub, right){ return '<div class="top"><div><h2>' + title + '</h2><div class="sub">' + (sub || '') + '</div></div><div>' + (right || '') + '</div></div>'; }
function pager(d, fn){
  var pages = Math.max(1, Math.ceil(d.total / d.size));
  return '<div class="pager">共 ' + d.total + ' 条 · 第 ' + d.page + '/' + pages + ' 页 <button class="sm" ' + (d.page <= 1 ? 'disabled' : '') + ' data-pg="' + (d.page - 1) + '">上一页</button><button class="sm" ' + (d.page >= pages ? 'disabled' : '') + ' data-pg="' + (d.page + 1) + '">下一页</button></div>';
}
function bindPager(fn){ var b = main.querySelectorAll('[data-pg]'); for (var i = 0; i < b.length; i++) b[i].onclick = function(){ fn(Number(this.getAttribute('data-pg'))); }; }
var PLANS = [], THEMES = [], EFFECTS = [];
function loadPlans(){ return api('GET', '/plans').then(function(d){ PLANS = d.plans; THEMES = d.themes; EFFECTS = d.effects; return d; }); }
function planOf(code){ for (var i = 0; i < PLANS.length; i++) if (PLANS[i].code === code) return PLANS[i]; return null; }
function planTag(code, expired){
  var p = planOf(code), maxLv = 0;
  for (var i = 0; i < PLANS.length; i++) if (PLANS[i].level > maxLv) maxLv = PLANS[i].level;
  var lv = p ? p.level : (code === 'free' ? 0 : 1);
  var cls = lv <= 0 ? '' : (lv >= maxLv && PLANS.length > 2 ? 'vip' : 'gold');
  return '<span class="tag ' + cls + '">' + esc(p ? p.name : code) + '</span>' + (expired ? ' <span class="tag warn">已过期</span>' : '');
}
function statusTag(s){ return s === 'disabled' ? '<span class="tag red">已停用</span>' : '<span class="tag green">正常</span>'; }
var ORDER_ST = { pending: ['待支付', ''], paid: ['已支付', 'green'], refunded: ['已退款', 'red'], closed: ['已关闭', ''], failed: ['失败', 'red'] };
function orderTag(s){ var x = ORDER_ST[s] || [s, '']; return '<span class="tag ' + x[1] + '">' + x[0] + '</span>'; }
var RES = { pass: ['通过', 'green'], review: ['疑似', 'warn'], risky: ['违规', 'red'], error: ['检测失败', 'warn'], skipped: ['未检测', ''], pending: ['检测中', ''] };
function resTag(s){ var x = RES[s] || [s, '']; return '<span class="tag ' + x[1] + '">' + x[0] + '</span>'; }
var TT = { blessing: '祝福/弹幕', rsvp: '回执', profile: '个人资料', config: '婚礼设置', lottery: '抽奖', image: '相册图片', 'image-inline': '配图' };
var HANDLED = { none: '<span class="muted">待处理</span>', approved: '已放行', hidden: '已隐藏', deleted: '已删除' };

// ---------------- 概览 ----------------
var VIEWS = {};
VIEWS.overview = function(){
  api('GET', '/overview').then(function(d){
    var t = d.totals, s = d.system;
    setFlag(t.flagged);
    var payLabel = s.payMode === 'wxpay' ? '<span class="tag green">微信支付已接入</span>' : s.payMode === 'mock' ? '<span class="tag warn">模拟支付（测试）</span>' : '<span class="tag red">支付未配置</span>';
    var m = s.moderation;
    var html = head('数据概览', '北京时间 · 近 30 天趋势', '<button id="rf">刷新</button>');
    html += '<div class="stats">' +
      stat('婚礼总数', t.weddings, '近 7 天新增 ' + t.newWeddings7) +
      stat('付费婚礼', t.premium, '转化率 ' + (t.weddings ? Math.round(t.premium * 100 / t.weddings) : 0) + '%', 1) +
      stat('用户（去重）', t.users, '近 7 天新增 ' + t.newUsers7) +
      stat('累计收入', yuan(t.revenueFen), '已支付 ' + t.paidOrders + ' 单 · 退款 ' + t.refunded, 1) +
      stat('回执', t.rsvps, '宾客提交') +
      stat('祝福 / 弹幕', t.blessings, '') +
      stat('待审核', t.flagged, t.flagged ? '<a data-go="moderation">去处理 →</a>' : '暂无', t.flagged ? 1 : 0) +
      stat('已停用婚礼', t.disabled, '') +
      '</div>';
    html += '<div class="card"><h3>每日趋势</h3><div class="legend"><span><i style="background:#b8282e"></i>新增用户</span><span><i style="background:#c9a063"></i>新婚礼</span><span><i style="background:#6b8f71"></i>祝福</span><span><i style="background:#3d5a80"></i>回执</span></div>' + lineChart(d.trend, [['users', '#b8282e'], ['weddings', '#c9a063'], ['blessings', '#6b8f71'], ['rsvps', '#3d5a80']]) + '</div>';
    if (d.planCounts && d.planCounts.length) {
      var tot = 0; d.planCounts.forEach(function(x){ tot += x.count; });
      html += '<div class="card"><h3>各套餐婚礼数 <a data-go="plans" style="font-size:12px;font-weight:400;margin-left:8px">套餐管理 →</a></h3><div class="pdist">' + d.planCounts.map(function(x){ var pct = tot ? Math.round(x.count * 100 / tot) : 0; return '<div class="pd"><div class="pd-h">' + planTag(x.code) + (x.active ? '' : ' <span class="muted" style="font-size:12px">未上架</span>') + '<b>' + x.count + '</b></div><div class="ut"><i style="width:' + pct + '%"></i></div><div class="muted" style="font-size:12px">' + pct + '%' + (x.expired ? ' · 其中已过期 ' + x.expired : '') + '</div></div>'; }).join('') + '</div></div>';
    }
    html += '<div class="grid2"><div class="card"><h3>每日收入</h3>' + barChart(d.trend) + '</div>';
    html += '<div class="card"><h3>系统状态</h3><div class="kv">' +
      '<b>支付</b><div>' + payLabel + (s.payMissing && s.payMissing.length && s.payMode !== 'wxpay' ? '<div class="muted" style="font-size:12px;margin-top:4px">缺少：' + esc(s.payMissing.join('、')) + '</div>' : '') + '</div>' +
      '<b>内容安全</b><div>' + (m.enabled ? (m.mock ? '<span class="tag warn">模拟模式</span>' : '<span class="tag green">已开启</span>') : '<span class="tag red">已关闭</span>') + ' <span class="muted">' + (m.failOpen ? '接口异常时放行' : '接口异常时拦截') + ' · ' + (m.blockReview ? '疑似内容拦截' : '疑似内容放行并记录') + '</span></div>' +
      '<b>图片审核回调</b><div>' + (m.pushConfigured ? '<span class="tag green">已配置</span>' : '<span class="tag">未配置消息推送</span>') + '</div>' +
      '</div></div></div>';
    main.innerHTML = html;
    $('rf').onclick = VIEWS.overview;
    var g = main.querySelectorAll('[data-go]'); for (var i = 0; i < g.length; i++) g[i].onclick = function(){ go(this.getAttribute('data-go')); };
  }).catch(fail);
};
function stat(k, v, d, hl){ return '<div class="stat' + (hl ? ' hl' : '') + '"><div class="k">' + k + '</div><div class="v">' + v + '</div><div class="d">' + (d || '&nbsp;') + '</div></div>'; }
function setFlag(n){ var e = $('flagN'); if (n > 0) { e.textContent = n > 99 ? '99+' : n; e.classList.remove('hide'); } else e.classList.add('hide'); }
function lineChart(rows, series){
  var W = 900, H = 220, L = 34, R = 10, T = 10, B = 26, max = 1;
  rows.forEach(function(r){ series.forEach(function(s){ if (r[s[0]] > max) max = r[s[0]]; }); });
  max = Math.ceil(max * 1.15);
  var dx = (W - L - R) / Math.max(1, rows.length - 1);
  var y = function(v){ return T + (H - T - B) * (1 - v / max); };
  var svg = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">';
  for (var g = 0; g <= 4; g++) { var gv = Math.round(max * g / 4), gy = y(gv); svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + gy + '" y2="' + gy + '" stroke="#f0e8dc"/><text x="' + (L - 6) + '" y="' + (gy + 4) + '" font-size="11" fill="#a99" text-anchor="end">' + gv + '</text>'; }
  rows.forEach(function(r, i){ if (i % 5 === 0 || i === rows.length - 1) svg += '<text x="' + (L + i * dx) + '" y="' + (H - 6) + '" font-size="11" fill="#a99" text-anchor="middle">' + r.day.slice(5) + '</text>'; });
  series.forEach(function(s){
    var pts = rows.map(function(r, i){ return (L + i * dx).toFixed(1) + ',' + y(r[s[0]]).toFixed(1); }).join(' ');
    svg += '<polyline fill="none" stroke="' + s[1] + '" stroke-width="2" points="' + pts + '"/>';
    rows.forEach(function(r, i){ if (r[s[0]]) svg += '<circle cx="' + (L + i * dx).toFixed(1) + '" cy="' + y(r[s[0]]).toFixed(1) + '" r="3" fill="' + s[1] + '"><title>' + r.day + '：' + r[s[0]] + '</title></circle>'; });
  });
  return svg + '</svg>';
}
function barChart(rows){
  var W = 440, H = 200, L = 40, B = 24, T = 10, max = 100;
  rows.forEach(function(r){ if (r.revenueFen > max) max = r.revenueFen; });
  max = Math.ceil(max * 1.15 / 1000) * 1000;
  var bw = (W - L - 6) / rows.length;
  var svg = '<svg class="chart" style="height:200px" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">';
  svg += '<text x="' + (L - 6) + '" y="' + (T + 8) + '" font-size="11" fill="#a99" text-anchor="end">' + yuan(max) + '</text><line x1="' + L + '" x2="' + W + '" y1="' + (H - B) + '" y2="' + (H - B) + '" stroke="#eadfcf"/>';
  rows.forEach(function(r, i){
    var h = (H - B - T) * r.revenueFen / max, x = L + i * bw + 1;
    if (r.revenueFen) svg += '<rect x="' + x + '" y="' + (H - B - h) + '" width="' + Math.max(2, bw - 3) + '" height="' + h + '" rx="2" fill="#c9a063"><title>' + r.day + '：' + yuan(r.revenueFen) + ' · ' + r.orders + ' 单</title></rect>';
    if (i % 7 === 0) svg += '<text x="' + (x + bw / 2) + '" y="' + (H - 6) + '" font-size="11" fill="#a99" text-anchor="middle">' + r.day.slice(5) + '</text>';
  });
  return svg + '</svg>';
}

// ---------------- 婚礼 ----------------
VIEWS.weddings = function(pg){
  var q = state.q.weddings || (state.q.weddings = { q: '', status: '', plan: '' });
  api('GET', '/weddings' + qs({ q: q.q, status: q.status, plan: q.plan, page: pg || 1 })).then(function(d){
    var html = head('婚礼管理', '每场婚礼一个租户（wid）· 点击行查看套餐用量、修改套餐或单独调整权益');
    var popts = [['', '全部套餐']].concat(PLANS.map(function(p){ return [p.code, p.name]; })).concat([['expired', '已过期']]);
    html += '<div class="card"><div class="bar"><input type="search" id="wq" placeholder="搜索 wid / 新人姓名" value="' + esc(q.q) + '">' +
      sel('wst', [['', '全部状态'], ['active', '正常'], ['disabled', '已停用']], q.status) +
      sel('wpl', popts, q.plan) + '<button id="wgo">查询</button></div>';
    if (!d.items.length) html += '<div class="empty">没有婚礼</div>';
    else {
      html += '<table><tr><th>wid</th><th>新人</th><th>套餐</th><th>到期</th><th>状态</th><th>相册</th><th>用户</th><th>回执</th><th>祝福</th><th>付费</th><th>创建时间</th><th></th></tr>';
      d.items.forEach(function(w){
        html += '<tr><td><a data-w="' + esc(w.id) + '">' + esc(w.id) + '</a></td><td>' + (esc(w.couple) || '<span class="muted">未填写</span>') + '</td><td>' + planTag(w.plan, w.expired) + (w.hasOverrides ? ' <span class="tag warn" title="该婚礼有单独调整的权益">已调整</span>' : '') + '</td><td class="muted">' + (w.plan === 'free' ? '-' : (w.expiresAt || '永久')) + '</td><td>' + statusTag(w.status) + '</td><td>' + w.imageCount + '</td><td>' + w.userCount + '</td><td>' + w.rsvpCount + '</td><td>' + w.blessingCount + '</td><td>' + (w.paidFen ? yuan(w.paidFen) : '-') + '</td><td class="muted">' + esc(w.createdAt) + '</td><td><button class="sm" data-w="' + esc(w.id) + '">详情</button></td></tr>';
      });
      html += '</table>' + pager(d);
    }
    main.innerHTML = html + '</div>';
    var run = function(){ q.q = $('wq').value.trim(); q.status = $('wst').value; q.plan = $('wpl').value; VIEWS.weddings(1); };
    $('wgo').onclick = run; $('wq').onkeydown = function(e){ if (e.key === 'Enter') run(); };
    $('wst').onchange = run; $('wpl').onchange = run;
    bindPager(VIEWS.weddings);
    var a = main.querySelectorAll('[data-w]'); for (var i = 0; i < a.length; i++) a[i].onclick = function(){ weddingDetail(this.getAttribute('data-w')); };
  }).catch(fail);
};
function sel(id, opts, v){ return '<select id="' + id + '">' + opts.map(function(o){ return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; }
function dialog(html, wide){
  var m = document.createElement('div'); m.className = 'mask';
  m.innerHTML = '<div class="dlg' + (wide ? ' wide' : '') + '">' + html + '</div>';
  m.onclick = function(e){ if (e.target === m) m.remove(); };
  document.body.appendChild(m);
  var x = m.querySelector('[data-close]'); if (x) x.onclick = function(){ m.remove(); };
  return m;
}
// ---- 权益展示 ----
var ENT_KEYS = ['photos', 'lotteryPrizes', 'lotteryParticipants', 'lotteryThemes', 'watermark', 'badge', 'effect', 'opening'];
var ENT_LABEL = { photos: '相册上限', lotteryPrizes: '抽奖奖项', lotteryParticipants: '抽奖人数', lotteryThemes: '可用主题', watermark: '平台标识', badge: '专属标识', effect: '氛围特效', opening: '开场动画' };
function themeName(k){ for (var i = 0; i < THEMES.length; i++) if (THEMES[i].key === k) return THEMES[i].name; return k; }
function effectName(k){ for (var i = 0; i < EFFECTS.length; i++) if (EFFECTS[i].key === k) return EFFECTS[i].name; return k; }
function entVal(k, e){
  var v = e[k];
  if (k === 'photos') return v + ' 张';
  if (k === 'lotteryPrizes') return v > 0 ? v + ' 个' : '不限';
  if (k === 'lotteryParticipants') return v > 0 ? v + ' 人' : '不限';
  if (k === 'lotteryThemes') return v.length >= THEMES.length ? '全部 ' + v.length + ' 套' : v.map(themeName).join('、');
  if (k === 'watermark') return v ? '显示「有囍請柬」' : '<span style="color:var(--ok)">已去除</span>';
  if (k === 'badge') return v ? '<span class="tag vip">' + esc(v) + '</span>' : '<span class="muted">无</span>';
  if (k === 'effect') return v === 'none' ? '<span class="muted">' + esc(effectName(v)) + '</span>' : esc(effectName(v));
  if (k === 'opening') return v ? '红金启幕' : '<span class="muted">无</span>';
  return esc(v);
}
function ubar(label, used, limit, unit){
  var unl = !(limit > 0), pct = unl ? Math.min(100, used ? 12 : 0) : Math.min(100, Math.round(used * 100 / limit));
  var cls = unl ? 'ok' : pct >= 100 ? 'full' : pct >= 80 ? 'warn' : '';
  return '<div class="ubar"><div class="ul"><span>' + label + '</span><b>' + used + ' / ' + (unl ? '不限' : limit + (unit || '')) + '</b></div><div class="ut"><i class="' + cls + '" style="width:' + (unl ? 100 : pct) + '%"></i></div></div>';
}
function ovText(raw){ var o; try { o = JSON.parse(raw); } catch (e) { return raw; } return Object.keys(o).map(function(k){ return (ENT_LABEL[k] || k) + '：' + String(entVal(k, o)).replace(/<[^>]+>/g, ''); }).join('；'); }
var LOG_ACT = { purchase: '购买', manual: '手动设置', override: '调整权益', clear: '清除调整', refund: '退款降级' };
function weddingDetail(id){
  api('GET', '/weddings/' + encodeURIComponent(id)).then(function(w){
    var c = w.counts, i = w.info, pi = w.planInfo, u = pi.usage, e = pi.ent, ov = pi.overrides || {};
    var html = '<h3><span>' + esc(w.couple || w.id) + ' ' + planTag(pi.code, false) + ' ' + statusTag(w.status) + '</span><a data-close>✕</a></h3>';
    html += '<div class="grid2"><div class="kv"><b>wid</b><div>' + esc(w.id) + '</div><b>婚期</b><div>' + esc((i.date || '-') + ' ' + (i.time || '')) + '</div><b>地点</b><div>' + esc(i.venue || '-') + '</div><b>创建 / 更新</b><div>' + esc(w.createdAt) + ' / ' + esc(w.updatedAt) + '</div>' + (w.status === 'disabled' ? '<b>停用原因</b><div style="color:var(--bad)">' + esc(w.disabledReason || '-') + '</div>' : '') + '</div>';
    html += '<div class="kv"><b>访问用户</b><div>' + c.users + '（管理员 ' + c.admins + '）</div><b>回执</b><div>' + c.rsvps + '（出席 ' + c.attending + ' · 共 ' + c.guests + ' 人）</div><b>祝福</b><div>' + c.blessings + (c.hiddenBlessings ? '（已隐藏 ' + c.hiddenBlessings + '）' : '') + '</div><b>相册</b><div>' + c.images + ' 张</div><b>爱心</b><div>' + c.hearts + '</div></div></div>';
    // 套餐与用量
    html += '<div class="plan-box"><div class="pb-head"><div><div class="pb-name">' + esc(pi.name) + (pi.expired ? ' <span class="tag warn">「' + esc(pi.storedName) + '」已于 ' + esc(pi.expiresDay) + ' 过期，按免费版生效</span>' : '') + '</div>' +
      '<div class="muted" style="font-size:12px">' + (pi.code === 'free' && !pi.expired ? '免费版' : (pi.expired ? '' : '到期：' + (pi.expiresDay || '永久有效') + ' · ')) + (w.planActivatedAt ? '开通于 ' + esc(w.planActivatedAt) + ' ' : '') + (w.planOrderNo ? '<span class="muted">' + (w.planOrderNo === 'MANUAL' ? '（后台手动设置）' : '订单 ' + esc(w.planOrderNo)) + '</span>' : '') + (pi.note ? ' · 备注：' + esc(pi.note) : '') + '</div></div>' +
      '<div><button class="pri" id="dPlan">更改套餐</button> <button id="dOv">单独调整权益</button></div></div>';
    html += '<div class="grid2" style="gap:24px"><div><h4>用量</h4>' +
      ubar('相册照片', u.photos, e.photos, ' 张') + ubar('抽奖奖项', u.lotteryPrizes, e.lotteryPrizes, ' 个') + ubar('抽奖人数', u.lotteryParticipants, e.lotteryParticipants, ' 人') +
      '<div class="kv" style="margin-top:10px"><b>祝福 / 弹幕</b><div>' + u.blessings + ' 条</div><b>回执</b><div>' + u.rsvps + ' 份</div><b>当前主题</b><div>' + esc(u.themeName) + (e.lotteryThemes.indexOf(u.theme) < 0 ? ' <span class="tag warn">当前套餐不含，展示为' + esc(themeName(e.lotteryThemes[0])) + '</span>' : '') + '</div></div></div>';
    html += '<div><h4>实际权益' + (Object.keys(ov).length ? ' <span class="tag warn">含单独调整</span>' : '') + '</h4><div class="kv">' + ENT_KEYS.map(function(k){ return '<b>' + ENT_LABEL[k] + '</b><div>' + entVal(k, e) + (k in ov ? ' <span class="tag warn" title="套餐默认：' + esc(String(entVal(k, pi.base)).replace(/<[^>]+>/g, '')) + '">单独调整</span>' : '') + '</div>'; }).join('') + '</div></div></div></div>';
    html += '<div class="bar" style="margin-top:16px">' + (w.status === 'disabled' ? '<button class="pri" id="dEn">恢复启用</button>' : '<button class="danger" id="dDis">停用婚礼</button>') + '<button id="dBl">查看全部祝福</button></div>';
    html += '<h4 style="margin:14px 0 6px">套餐变更记录</h4>' + (pi.logs.length ? '<table><tr><th>时间</th><th>操作</th><th>套餐</th><th>到期</th><th>说明</th><th>操作人</th></tr>' + pi.logs.map(function(l){ return '<tr><td class="muted" style="white-space:nowrap">' + esc(l.createdAt) + '</td><td>' + esc(LOG_ACT[l.action] || l.action) + '</td><td>' + (l.from && l.from !== l.to ? esc(l.from) + ' → ' : '') + esc(l.to) + '</td><td class="muted">' + esc(l.expiresAt || (l.action === 'manual' || l.action === 'purchase' ? '永久' : '')) + '</td><td class="content" style="font-size:12px">' + esc(l.note) + (l.action === 'override' && l.detail ? '<div class="muted">' + esc(ovText(l.detail)) + '</div>' : '') + '</td><td class="muted">' + esc({ platform: '平台', user: '新人', system: '系统' }[l.operator] || l.operator) + '</td></tr>'; }).join('') + '</table>' : '<div class="muted">暂无</div>');
    html += '<h4 style="margin:14px 0 6px">订单</h4>' + (w.orders.length ? '<table><tr><th>订单号</th><th>套餐</th><th>金额</th><th>状态</th><th>方式</th><th>下单</th><th>支付</th></tr>' + w.orders.map(function(o){ var p = planOf(o.product); return '<tr><td>' + esc(o.orderNo) + '</td><td>' + esc(p ? p.name : o.product) + '</td><td>' + yuan(o.amountFen) + '</td><td>' + orderTag(o.status) + '</td><td>' + (o.payMode === 'mock' ? '<span class="tag warn">模拟</span>' : '微信') + '</td><td class="muted">' + esc(o.createdAt) + '</td><td class="muted">' + esc(o.paidAt) + '</td></tr>'; }).join('') + '</table>' : '<div class="muted">暂无订单</div>');
    html += '<h4 style="margin:14px 0 6px">最近祝福</h4>' + (w.blessings.length ? '<table>' + w.blessings.map(function(b){ return '<tr><td style="width:90px">' + esc(b.author) + '</td><td class="content">' + esc(b.content) + '</td><td>' + (b.status === 'hidden' ? '<span class="tag red">已隐藏</span>' : '') + '</td><td class="muted" style="white-space:nowrap">' + esc(b.createdAt) + '</td></tr>'; }).join('') + '</table>' : '<div class="muted">暂无</div>');
    var m = dialog(html, true);
    var refresh = function(){ m.remove(); weddingDetail(id); if (state.view === 'weddings') VIEWS.weddings(); };
    var act = function(path, body, msg){ api('POST', '/weddings/' + encodeURIComponent(id) + path, body).then(function(){ toast(msg); refresh(); }).catch(fail); };
    var b;
    if ((b = m.querySelector('#dDis'))) b.onclick = function(){ var r = prompt('停用原因（新人和宾客打开时会看到“该婚礼已被平台停用”）', '内容违规'); if (r !== null) act('/status', { status: 'disabled', reason: r }, '已停用'); };
    if ((b = m.querySelector('#dEn'))) b.onclick = function(){ act('/status', { status: 'active' }, '已恢复'); };
    m.querySelector('#dPlan').onclick = function(){ planDialog(w, refresh); };
    m.querySelector('#dOv').onclick = function(){ overrideDialog(w, refresh); };
    m.querySelector('#dBl').onclick = function(){ m.remove(); state.q.blessings = { q: '', status: '', wid: id }; go('blessings'); };
  }).catch(fail);
}
// 更改套餐：选套餐 + 到期日（留空 = 永久）+ 备注
function planDialog(w, done){
  var pi = w.planInfo;
  var cur = pi.expired ? 'free' : pi.storedPlan;
  var opts = PLANS.map(function(p){ return '<label class="pick' + (p.code === cur ? ' on' : '') + '"><input type="radio" name="pp" value="' + esc(p.code) + '"' + (p.code === cur ? ' checked' : '') + '><b>' + esc(p.name) + '</b><span>' + (p.priceFen ? yuan(p.priceFen) : '免费') + (p.active ? '' : ' · 未上架') + '</span></label>'; }).join('');
  var m = dialog('<h3><span>更改套餐 · ' + esc(w.couple || w.id) + '</span><a data-close>✕</a></h3><div class="picks">' + opts + '</div>' +
    '<div class="form" style="margin-top:14px"><label>有效期</label><div><label style="color:var(--ink);margin-right:14px"><input type="radio" name="pe" value="forever"' + (pi.expiresDay ? '' : ' checked') + '> 永久</label><label style="color:var(--ink)"><input type="radio" name="pe" value="date"' + (pi.expiresDay ? ' checked' : '') + '> 到期日 </label><input type="date" id="pDate" value="' + esc(pi.expiresDay || '') + '"> <span class="muted" style="font-size:12px">北京时间当天 23:59 到期，到期后自动按免费版生效</span></div>' +
    '<label>备注 / 原因</label><input id="pNote" placeholder="如：线下转账已收款、合作赠送、客服补偿" value=""></div>' +
    '<div class="muted" style="font-size:12px;margin-top:10px">手动设置不产生订单、不收费，会记录在「套餐变更记录」里。单独调整过的权益会继续保留。</div>' +
    '<div class="bar" style="justify-content:flex-end;margin:18px 0 0"><button data-close2>取消</button><button class="pri" id="pGo">保存</button></div>');
  var radios = m.querySelectorAll('input[name=pp]');
  for (var i = 0; i < radios.length; i++) radios[i].onchange = function(){ var ls = m.querySelectorAll('.pick'); for (var j = 0; j < ls.length; j++) ls[j].classList.toggle('on', ls[j].querySelector('input').checked); };
  m.querySelector('#pDate').onfocus = function(){ m.querySelector('input[name=pe][value=date]').checked = true; };
  m.querySelector('[data-close2]').onclick = function(){ m.remove(); };
  m.querySelector('#pGo').onclick = function(){
    var code = (m.querySelector('input[name=pp]:checked') || {}).value;
    var useDate = m.querySelector('input[name=pe][value=date]').checked;
    var date = $('pDate').value;
    if (useDate && !date && code !== 'free') return toast('请选择到期日，或选择“永久”');
    api('POST', '/weddings/' + encodeURIComponent(w.id) + '/plan', { plan: code, expiresAt: useDate ? date : '', note: $('pNote').value }).then(function(){ toast('套餐已更新'); m.remove(); done(); }).catch(fail);
  };
}
// 单独调整权益：每项可“跟随套餐”或单独设置
function overrideDialog(w, done){
  var pi = w.planInfo, ov = pi.overrides || {}, base = pi.base;
  var has = function(k){ return Object.prototype.hasOwnProperty.call(ov, k); };
  var numRow = function(k, hint){ return '<label>' + ENT_LABEL[k] + '</label><div><input id="o_' + k + '" type="number" min="0" style="width:120px" placeholder="跟随套餐" value="' + (has(k) ? ov[k] : '') + '"> <span class="muted" style="font-size:12px">套餐默认 ' + String(entVal(k, base)).replace(/<[^>]+>/g, '') + (hint || '') + '，留空 = 跟随套餐</span></div>'; };
  var triRow = function(k, on, off){ var v = has(k) ? (ov[k] ? '1' : '0') : ''; return '<label>' + ENT_LABEL[k] + '</label><div>' + sel('o_' + k, [['', '跟随套餐（' + (base[k] ? on : off) + '）'], ['1', on], ['0', off]], v) + '</div>'; };
  var html = '<h3><span>单独调整权益 · ' + esc(w.couple || w.id) + '</span><a data-close>✕</a></h3><div class="muted" style="font-size:13px;margin-bottom:12px">只对这一场婚礼生效，优先于套餐设置；改套餐后仍然保留。当前套餐：' + esc(pi.name) + '</div><div class="form">' +
    numRow('photos') + numRow('lotteryPrizes', '，0 = 不限') + numRow('lotteryParticipants', '，0 = 不限') +
    '<label>' + ENT_LABEL.lotteryThemes + '</label><div><label style="color:var(--ink)"><input type="checkbox" id="o_th_on"' + (has('lotteryThemes') ? ' checked' : '') + '> 单独设置</label> <span id="o_th">' + THEMES.map(function(t){ var on = (has('lotteryThemes') ? ov.lotteryThemes : base.lotteryThemes).indexOf(t.key) >= 0; return '<label style="color:var(--ink);margin-left:10px"><input type="checkbox" value="' + t.key + '"' + (on ? ' checked' : '') + '> ' + esc(t.name) + '</label>'; }).join('') + '</span></div>' +
    triRow('watermark', '显示平台标识', '去除平台标识') +
    '<label>' + ENT_LABEL.badge + '</label><div><label style="color:var(--ink)"><input type="checkbox" id="o_badge_on"' + (has('badge') ? ' checked' : '') + '> 单独设置</label> <input id="o_badge" maxlength="6" style="width:120px" placeholder="如：尊享，留空=不显示" value="' + esc(has('badge') ? ov.badge : base.badge) + '"></div>' +
    '<label>' + ENT_LABEL.effect + '</label><div>' + sel('o_effect', [['', '跟随套餐（' + effectName(base.effect) + '）']].concat(EFFECTS.map(function(x){ return [x.key, x.name]; })), has('effect') ? ov.effect : '') + '</div>' +
    triRow('opening', '开启开场动画', '关闭开场动画') +
    '<label>备注 / 原因</label><input id="o_note" placeholder="如：客户加购 50 张相册">' +
    '</div><div class="bar" style="justify-content:space-between;margin:18px 0 0"><button class="danger" id="oClear">清除全部调整</button><span><button data-close2>取消</button> <button class="pri" id="oGo">保存</button></span></div>';
  var m = dialog(html);
  m.querySelector('[data-close2]').onclick = function(){ m.remove(); };
  var save = function(o){ api('PUT', '/weddings/' + encodeURIComponent(w.id) + '/overrides', { overrides: o, note: $('o_note').value }).then(function(){ toast('权益已更新'); m.remove(); done(); }).catch(fail); };
  m.querySelector('#oClear').onclick = function(){ if (confirm('清除后这场婚礼的权益完全跟随套餐，确定？')) save({}); };
  m.querySelector('#oGo').onclick = function(){
    var o = {};
    ['photos', 'lotteryPrizes', 'lotteryParticipants'].forEach(function(k){ var v = $('o_' + k).value.trim(); if (v !== '') o[k] = Number(v); });
    if ($('o_th_on').checked) { var ts = []; var cb = m.querySelectorAll('#o_th input:checked'); for (var i = 0; i < cb.length; i++) ts.push(cb[i].value); if (!ts.length) return toast('至少选一个主题'); o.lotteryThemes = ts; }
    ['watermark', 'opening'].forEach(function(k){ var v = $('o_' + k).value; if (v !== '') o[k] = v === '1'; });
    if ($('o_badge_on').checked) o.badge = $('o_badge').value.trim();
    if ($('o_effect').value) o.effect = $('o_effect').value;
    save(o);
  };
}

// ---------------- 用户 ----------------
VIEWS.users = function(pg){
  var q = state.q.users || (state.q.users = { q: '' });
  api('GET', '/users' + qs({ q: q.q, page: pg || 1 })).then(function(d){
    var html = head('用户', '按微信身份去重；身份标识已脱敏 · 点击婚礼可查看 / 修改套餐');
    html += '<div class="card"><div class="bar"><input type="search" id="uq" placeholder="搜索昵称 / 手机 / wid" value="' + esc(q.q) + '"><button id="ugo">查询</button></div>';
    if (!d.items.length) html += '<div class="empty">没有用户</div>';
    else {
      html += '<table><tr><th>昵称</th><th>手机</th><th>参与婚礼 · 套餐</th><th>角色</th><th>访问次数</th><th>首次访问</th><th>最近访问</th><th>标识</th></tr>';
      d.items.forEach(function(u){
        html += '<tr><td>' + (esc(u.name) || '<span class="muted">未填写</span>') + '</td><td>' + esc(u.phone || '-') + '</td><td>' + (u.weddingPlans || u.weddings.map(function(w){ return { wid: w, plan: 'free', planName: '' }; })).map(function(w){ return '<a class="wtag" data-uw="' + esc(w.wid) + '">' + esc(w.wid) + ' ' + planTag(w.plan, /已过期/.test(w.planName)) + '</a>'; }).join(' ') + (u.weddingCount > u.weddings.length ? ' …' : '') + '</td><td>' + (u.isAdmin ? '<span class="tag gold">新人/管理员</span>' : '宾客') + '</td><td>' + u.logins + '</td><td class="muted">' + esc(u.firstSeen) + '</td><td class="muted">' + esc(u.lastSeen) + '</td><td class="muted" style="font-size:12px">' + esc(u.id) + '</td></tr>';
      });
      html += '</table>' + pager(d);
    }
    main.innerHTML = html + '</div>';
    var run = function(){ q.q = $('uq').value.trim(); VIEWS.users(1); };
    $('ugo').onclick = run; $('uq').onkeydown = function(e){ if (e.key === 'Enter') run(); };
    bindPager(VIEWS.users);
    var uw = main.querySelectorAll('[data-uw]'); for (var k = 0; k < uw.length; k++) uw[k].onclick = function(){ weddingDetail(this.getAttribute('data-uw')); };
  }).catch(fail);
};

// ---------------- 订单 ----------------
VIEWS.orders = function(pg){
  var q = state.q.orders || (state.q.orders = { q: '', status: '' });
  api('GET', '/orders' + qs({ q: q.q, status: q.status, page: pg || 1 })).then(function(d){
    var html = head('订单', '金额单位：元');
    html += '<div class="card"><div class="bar"><input type="search" id="oq" placeholder="订单号 / wid / 微信交易号" value="' + esc(q.q) + '">' + sel('ost', [['', '全部状态'], ['paid', '已支付'], ['pending', '待支付'], ['refunded', '已退款'], ['closed', '已关闭']], q.status) + '<button id="ogo">查询</button></div>';
    if (!d.items.length) html += '<div class="empty">暂无订单</div>';
    else {
      html += '<table><tr><th>订单号</th><th>婚礼</th><th>商品</th><th>金额</th><th>状态</th><th>方式</th><th>下单时间</th><th>支付时间</th><th>备注</th><th></th></tr>';
      d.items.forEach(function(o){
        html += '<tr><td style="font-size:12px">' + esc(o.orderNo) + (o.transactionId ? '<div class="muted">' + esc(o.transactionId) + '</div>' : '') + '</td><td>' + esc(o.wid) + '<div class="muted">' + esc(o.couple) + '</div></td><td>' + esc(o.description) + '</td><td>' + yuan(o.amountFen) + '</td><td>' + orderTag(o.status) + '</td><td>' + (o.payMode === 'mock' ? '<span class="tag warn">模拟</span>' : '微信支付') + '</td><td class="muted">' + esc(o.createdAt) + '</td><td class="muted">' + esc(o.paidAt) + (o.refundedAt ? '<div style="color:var(--bad)">退 ' + esc(o.refundedAt) + '</div>' : '') + '</td><td class="muted" style="max-width:160px">' + esc(o.note) + '</td><td>' + (o.status === 'paid' ? '<button class="sm danger" data-rf="' + esc(o.orderNo) + '" data-mode="' + esc(o.payMode) + '">退款</button>' : '') + '</td></tr>';
      });
      html += '</table>' + pager(d);
    }
    main.innerHTML = html + '</div>';
    var run = function(){ q.q = $('oq').value.trim(); q.status = $('ost').value; VIEWS.orders(1); };
    $('ogo').onclick = run; $('oq').onkeydown = function(e){ if (e.key === 'Enter') run(); }; $('ost').onchange = run;
    bindPager(VIEWS.orders);
    var b = main.querySelectorAll('[data-rf]'); for (var i = 0; i < b.length; i++) b[i].onclick = function(){ refundDialog(this.getAttribute('data-rf'), this.getAttribute('data-mode')); };
  }).catch(fail);
};
function refundDialog(no, mode){
  var m = dialog('<h3><span>退款 · ' + esc(no) + '</span><a data-close>✕</a></h3><div class="form"><label>退款备注</label><input id="rfNote" placeholder="如：新人申请退款"><label>原路退回</label><label style="color:var(--ink)"><input type="checkbox" id="rfWx"' + (mode === 'wxpay' ? ' checked' : ' disabled') + '> 调用微信支付退款接口' + (mode === 'wxpay' ? '' : '（模拟订单仅标记）') + '</label><label>套餐</label><label style="color:var(--ink)"><input type="checkbox" id="rfDown" checked> 同时把该婚礼降回免费版</label></div><div class="bar" style="justify-content:flex-end;margin:18px 0 0"><button data-close2>取消</button><button class="pri" id="rfGo">确认退款</button></div>');
  m.querySelector('[data-close2]').onclick = function(){ m.remove(); };
  m.querySelector('#rfGo').onclick = function(){
    this.disabled = true;
    api('POST', '/orders/' + encodeURIComponent(no) + '/refund', { note: $('rfNote').value, wxRefund: $('rfWx').checked, downgrade: $('rfDown').checked }).then(function(){ toast('已标记退款'); m.remove(); VIEWS.orders(); }).catch(function(e){ fail(e); m.querySelector('#rfGo').disabled = false; });
  };
}

// ---------------- 内容审核 ----------------
VIEWS.moderation = function(pg){
  var q = state.q.moderation || (state.q.moderation = { filter: 'flagged' });
  api('GET', '/moderation' + qs({ filter: q.filter, page: pg || 1 })).then(function(d){
    if (q.filter === 'flagged') setFlag(d.total);
    var html = head('内容审核', '微信内容安全接口判定为疑似/违规、或检测失败的内容；违规内容在提交时已被拦截');
    html += '<div class="card"><div class="bar">' + ['flagged:待处理', 'handled:已处理', 'skipped:未检测', 'all:全部记录'].map(function(x){ var p = x.split(':'); return '<button class="' + (q.filter === p[0] ? 'pri' : '') + '" data-f="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>';
    if (!d.items.length) html += '<div class="empty">' + (q.filter === 'flagged' ? '没有待处理的内容 🎉' : '暂无记录') + '</div>';
    else {
      html += '<table><tr><th>时间</th><th>婚礼</th><th>类型</th><th>内容</th><th>结果</th><th>处理</th><th></th></tr>';
      d.items.forEach(function(r){
        var content = r.kind === 'image' ? '<a href="' + esc(r.content) + '" target="_blank" rel="noopener"><img src="' + esc(r.content) + '" style="max-width:120px;max-height:90px;border-radius:6px"></a>' : esc(r.content);
        var canAct = r.handled === 'none';
        var hasTarget = r.targetId && (r.targetType === 'blessing' || r.targetType === 'image');
        html += '<tr><td class="muted" style="white-space:nowrap">' + esc(r.createdAt) + '</td><td>' + esc(r.wid) + '</td><td>' + esc(TT[r.targetType] || r.targetType) + '</td><td class="content">' + content + (r.detail ? '<div class="muted" style="font-size:12px">' + esc(r.detail) + '</div>' : '') + '</td><td>' + resTag(r.result) + (r.label ? ' <span class="tag">' + esc(r.label) + '</span>' : '') + '</td><td>' + (HANDLED[r.handled] || esc(r.handled)) + '</td><td style="white-space:nowrap">' +
          (canAct ? '<button class="sm" data-m="approve" data-id="' + r.id + '">' + (r.result === 'risky' && !hasTarget ? '已阅' : '放行') + '</button> ' + (hasTarget ? '<button class="sm" data-m="hide" data-id="' + r.id + '">隐藏</button> <button class="sm danger" data-m="delete" data-id="' + r.id + '">删除</button>' : '') : '') + '</td></tr>';
      });
      html += '</table>' + pager(d);
    }
    main.innerHTML = html + '</div>';
    var f = main.querySelectorAll('[data-f]'); for (var i = 0; i < f.length; i++) f[i].onclick = function(){ q.filter = this.getAttribute('data-f'); VIEWS.moderation(1); };
    bindPager(VIEWS.moderation);
    var b = main.querySelectorAll('[data-m]'); for (var j = 0; j < b.length; j++) b[j].onclick = function(){
      var a = this.getAttribute('data-m'), id = this.getAttribute('data-id');
      if (a === 'delete' && !confirm('删除后不可恢复，确定删除？')) return;
      api('POST', '/moderation/' + id, { action: a }).then(function(){ toast('已处理'); VIEWS.moderation(d.page); }).catch(fail);
    };
  }).catch(fail);
};

// ---------------- 祝福 / 弹幕 ----------------
VIEWS.blessings = function(pg){
  var q = state.q.blessings || (state.q.blessings = { q: '', status: '', wid: '' });
  api('GET', '/blessings' + qs({ q: q.q, status: q.status, wid: q.wid, page: pg || 1 })).then(function(d){
    var html = head('祝福 / 弹幕', '全平台用户发布的祝福，隐藏后不再出现在请柬和大屏弹幕中');
    html += '<div class="card"><div class="bar"><input type="search" id="bq" placeholder="搜索内容 / 署名" value="' + esc(q.q) + '"><input id="bw" placeholder="wid" style="width:120px" value="' + esc(q.wid) + '">' + sel('bst', [['', '全部'], ['visible', '显示中'], ['hidden', '已隐藏']], q.status) + '<button id="bgo">查询</button></div>';
    if (!d.items.length) html += '<div class="empty">暂无祝福</div>';
    else {
      html += '<table><tr><th>时间</th><th>婚礼</th><th>署名</th><th>内容</th><th>赞</th><th>状态</th><th></th></tr>';
      d.items.forEach(function(b){
        html += '<tr><td class="muted" style="white-space:nowrap">' + esc(b.createdAt) + '</td><td>' + esc(b.wid) + '</td><td>' + esc(b.author) + '</td><td class="content">' + esc(b.content) + '</td><td>' + b.likes + '</td><td>' + (b.status === 'hidden' ? '<span class="tag red">已隐藏</span>' : '<span class="tag green">显示中</span>') + '</td><td style="white-space:nowrap">' + (b.status === 'hidden' ? '<button class="sm" data-b="show" data-id="' + b.id + '">恢复</button>' : '<button class="sm" data-b="hide" data-id="' + b.id + '">隐藏</button>') + ' <button class="sm danger" data-b="delete" data-id="' + b.id + '">删除</button></td></tr>';
      });
      html += '</table>' + pager(d);
    }
    main.innerHTML = html + '</div>';
    var run = function(){ q.q = $('bq').value.trim(); q.wid = $('bw').value.trim(); q.status = $('bst').value; VIEWS.blessings(1); };
    $('bgo').onclick = run; $('bq').onkeydown = $('bw').onkeydown = function(e){ if (e.key === 'Enter') run(); }; $('bst').onchange = run;
    bindPager(VIEWS.blessings);
    var b = main.querySelectorAll('[data-b]'); for (var i = 0; i < b.length; i++) b[i].onclick = function(){
      var a = this.getAttribute('data-b'), id = this.getAttribute('data-id');
      if (a === 'delete' && !confirm('删除后不可恢复，确定删除？')) return;
      api('POST', '/blessings/' + id, { action: a }).then(function(){ toast('已处理'); VIEWS.blessings(d.page); }).catch(fail);
    };
  }).catch(fail);
};

// ---------------- 套餐管理 ----------------
VIEWS.plans = function(){
  loadPlans().then(function(){
    var html = head('套餐管理', '每档套餐的价格和权益；上架的套餐会出现在小程序「升级」页，档位越高越靠后', '<button class="pri" id="plNew">＋ 新增套餐</button>');
    html += '<div class="plan-grid">';
    PLANS.forEach(function(p){
      var e = p.ent;
      html += '<div class="pcard' + (p.active ? '' : ' off') + '"><div class="pc-top"><div>' + planTag(p.code) + ' <span class="muted" style="font-size:12px">' + esc(p.code) + ' · 档位 ' + p.level + '</span></div>' + (p.active ? '<span class="tag green">上架中</span>' : '<span class="tag">未上架</span>') + '</div>' +
        '<div class="pc-price">' + (p.priceFen ? yuan(p.priceFen) : '免费') + (p.originalFen ? ' <s>' + yuan(p.originalFen) + '</s>' : '') + '<span>' + (p.code === 'free' ? '' : (p.days ? p.days + ' 天' : '永久有效')) + '</span></div>' +
        '<div class="muted" style="font-size:12px;min-height:18px">' + esc(p.desc) + '</div>' +
        '<div class="kv" style="margin:10px 0">' + ENT_KEYS.map(function(k){ return '<b>' + ENT_LABEL[k] + '</b><div>' + entVal(k, e) + '</div>'; }).join('') + '</div>' +
        '<div class="pc-foot"><span class="muted">' + p.weddings + ' 场婚礼在用</span><span><button class="sm" data-pe="' + esc(p.code) + '">编辑</button>' + (p.code === 'free' || p.code === 'premium' ? '' : ' <button class="sm danger" data-pd="' + esc(p.code) + '">删除</button>') + '</span></div></div>';
    });
    html += '</div><div class="card"><h3>说明</h3><div class="muted" style="font-size:13px;line-height:1.9">' +
      '· <b>档位</b>决定高低：新人只能购买比当前档位更高的套餐，升级时按新套餐<b>全价</b>付费（不折算差价）。<br>' +
      '· <b>平台标识</b>：请柬底部和抽奖大屏显示「有囍請柬 提供技术支持」。<b>专属标识</b>：请柬封面、首页和大屏显示一枚金色标识（如「尊享」）。<br>' +
      '· <b>氛围特效</b>：花瓣纷飞 = 请柬首页花瓣更多更灵动、大屏飘金色花瓣；金箔流光 = 在花瓣之上再加闪烁的金色粒子。<b>开场动画</b>：打开请柬和大屏时先播放红金双门启幕。<br>' +
      '· 免费版与高级版是内置套餐，不能删除但可以修改；其它套餐有婚礼在用时不能删除，可以先下架。<br>' +
      '· 需要给某一场婚礼特殊照顾（如多给相册张数），在「婚礼管理 → 详情 → 单独调整权益」里改，不用新建套餐。</div></div>';
    main.innerHTML = html;
    $('plNew').onclick = function(){ planEditor(null); };
    var b = main.querySelectorAll('[data-pe]'); for (var i = 0; i < b.length; i++) b[i].onclick = function(){ planEditor(planOf(this.getAttribute('data-pe'))); };
    var dl = main.querySelectorAll('[data-pd]'); for (var j = 0; j < dl.length; j++) dl[j].onclick = function(){
      var code = this.getAttribute('data-pd');
      if (!confirm('确定删除套餐「' + (planOf(code) || {}).name + '」？')) return;
      api('DELETE', '/plans/' + encodeURIComponent(code)).then(function(){ toast('已删除'); VIEWS.plans(); }).catch(fail);
    };
  }).catch(fail);
};
function planEditor(p){
  var isNew = !p, isFree = p && p.code === 'free';
  var top = PLANS.length ? PLANS[PLANS.length - 1] : null;
  if (isNew) p = { code: '', name: '', level: (top ? top.level : 0) + 10, priceFen: 9900, originalFen: 0, days: 0, desc: '', features: [], active: false, sort: (top ? top.sort : 0) + 10, ent: JSON.parse(JSON.stringify((top || {}).ent || { photos: 200, lotteryPrizes: 0, lotteryParticipants: 0, lotteryThemes: ['red'], watermark: false, badge: '', effect: 'petals', opening: false })) };
  var e = p.ent;
  var html = '<h3><span>' + (isNew ? '新增套餐' : '编辑套餐 · ' + esc(p.name)) + '</span><a data-close>✕</a></h3><div class="grid2"><div class="form">' +
    (isNew ? '<label>套餐编码</label><input id="eCode" placeholder="英文，如 basic / vip（创建后不可改）">' : '<label>套餐编码</label><div class="muted">' + esc(p.code) + '</div>') +
    '<label>名称</label><input id="eName" maxlength="20" value="' + esc(p.name) + '" placeholder="如：基础版 / 至尊版">' +
    (isFree ? '' :
      '<label>档位（越大越高级）</label><input id="eLevel" type="number" min="1" value="' + p.level + '">' +
      '<label>售价（元）</label><input id="ePrice" type="number" min="0.01" step="0.01" value="' + (p.priceFen / 100) + '">' +
      '<label>划线原价（元）</label><input id="eOrig" type="number" min="0" step="0.01" value="' + ((p.originalFen || 0) / 100) + '" placeholder="0 = 不显示">' +
      '<label>有效天数</label><input id="eDays" type="number" min="0" value="' + p.days + '" placeholder="0 = 永久">' +
      '<label>在小程序上架</label><label style="color:var(--ink)"><input type="checkbox" id="eActive"' + (p.active ? ' checked' : '') + '> 上架（新人可在升级页购买）</label>') +
    '<label>一句话说明</label><input id="eDesc" maxlength="80" value="' + esc(p.desc) + '">' +
    '<label>权益文案（每行一条）</label><textarea id="eFeat" rows="6">' + esc(p.features.join('\n')) + '</textarea>' +
    '</div><div class="form">' +
    '<label>相册上限（张）</label><input id="ePhotos" type="number" min="1" value="' + e.photos + '">' +
    '<label>抽奖奖项上限</label><input id="ePrizes" type="number" min="0" value="' + e.lotteryPrizes + '" placeholder="0 = 不限">' +
    '<label>抽奖人数上限</label><input id="ePeople" type="number" min="0" value="' + e.lotteryParticipants + '" placeholder="0 = 不限">' +
    '<label>可用主题</label><div id="eThemes">' + THEMES.map(function(t){ return '<label style="color:var(--ink);margin-right:10px;white-space:nowrap"><input type="checkbox" value="' + t.key + '"' + (e.lotteryThemes.indexOf(t.key) >= 0 ? ' checked' : '') + '> ' + esc(t.name) + '</label>'; }).join('') + '</div>' +
    '<label>平台标识</label><label style="color:var(--ink)"><input type="checkbox" id="eWm"' + (e.watermark ? ' checked' : '') + '> 显示「有囍請柬 提供技术支持」</label>' +
    '<label>专属标识文字</label><input id="eBadge" maxlength="6" value="' + esc(e.badge) + '" placeholder="如：尊享，留空 = 不显示">' +
    '<label>氛围特效</label>' + sel('eEffect', EFFECTS.map(function(x){ return [x.key, x.name]; }), e.effect) +
    '<label>开场动画</label><label style="color:var(--ink)"><input type="checkbox" id="eOpen"' + (e.opening ? ' checked' : '') + '> 红金双门启幕（请柬 + 大屏）</label>' +
    '</div></div><div class="bar" style="justify-content:flex-end;margin:18px 0 0"><button data-close2>取消</button><button class="pri" id="eGo">' + (isNew ? '创建' : '保存') + '</button></div>';
  var m = dialog(html, true);
  m.querySelector('[data-close2]').onclick = function(){ m.remove(); };
  m.querySelector('#eGo').onclick = function(){
    var ts = []; var cb = m.querySelectorAll('#eThemes input:checked'); for (var i = 0; i < cb.length; i++) ts.push(cb[i].value);
    if (!ts.length) return toast('至少选一个主题');
    if (!$('eName').value.trim()) return toast('请填写名称');
    var body = { name: $('eName').value, desc: $('eDesc').value, features: $('eFeat').value.split('\n').map(function(s){ return s.trim(); }).filter(Boolean),
      ent: { photos: Number($('ePhotos').value), lotteryPrizes: Number($('ePrizes').value || 0), lotteryParticipants: Number($('ePeople').value || 0), lotteryThemes: ts, watermark: $('eWm').checked, badge: $('eBadge').value.trim(), effect: $('eEffect').value, opening: $('eOpen').checked } };
    if (!isFree) {
      body.level = Number($('eLevel').value); body.priceFen = Math.round(Number($('ePrice').value) * 100); body.originalFen = Math.round(Number($('eOrig').value || 0) * 100); body.days = Number($('eDays').value || 0); body.active = $('eActive').checked;
      if (!(body.priceFen > 0)) return toast('售价必须大于 0');
    }
    if (isNew) body.code = $('eCode').value.trim().toLowerCase();
    var req = isNew ? api('POST', '/plans', body) : api('PUT', '/plans/' + encodeURIComponent(p.code), body);
    req.then(function(){ toast(isNew ? '已创建' : '已保存'); m.remove(); VIEWS.plans(); }).catch(fail);
  };
}

// ---------------- 设置（敏感词） ----------------
VIEWS.pricing = function(){
  Promise.all([api('GET', '/keywords'), api('GET', '/qiniu-domain')]).then(function(arr){
    var kw = arr[0].keywords;
    var domain = (arr[1] && arr[1].domain) || 'https://qn.youxitie.site';
    var html = head('设置', '账号安全与内容安全；价格和套餐权益在「套餐管理」');
    html += '<div class="card" id="pwCard"><h3>修改密码</h3><div class="muted" style="margin-bottom:10px;font-size:13px">密码保存在服务器数据库中，修改后其它已登录的会话会立即失效。</div>';
    html += '<div class="form" style="max-width:420px">';
    html += '<label>当前密码</label><input id="curPwd" type="password" autocomplete="current-password">';
    html += '<label>新密码</label><input id="newPwd" type="password" autocomplete="new-password" placeholder="至少 8 位">';
    html += '<label>确认新密码</label><input id="cfmPwd" type="password" autocomplete="new-password">';
    html += '</div><div class="bar" style="margin:14px 0 0"><button class="pri" id="pwBtn">保存新密码</button></div></div>';
    html += '<div class="card"><h3>七牛云访问域名</h3><div class="muted" style="margin-bottom:8px;font-size:13px">存于数据库 <code>config</code> 表，键名 <code>qiniu_domain</code>。库里只保存视频文件路径，展示时用这里的域名拼接。改完大约 30 秒内生效，不必重启服务。AccessKey / SecretKey 仍放在服务器环境变量，不会写入数据库。更换域名后，还需要在小程序后台同步更新 downloadFile 合法域名。</div>';
    html += '<div class="form" style="max-width:520px"><label>访问域名（https）</label><input id="qnDomain" type="url" value="' + esc(domain) + '" placeholder="https://qn.youxitie.site"></div>';
    html += '<div class="bar" style="margin:10px 0 0"><button class="pri" id="qnSave">保存域名</button></div></div>';
    html += '<div class="card"><h3>平台补充敏感词</h3><div class="muted" style="margin-bottom:8px;font-size:13px">在微信内容安全接口之外额外拦截的词，一行一个或用逗号分隔。</div><textarea id="kw" rows="8" style="width:100%">' + esc(kw) + '</textarea><div class="bar" style="margin:10px 0 0"><button class="pri" id="kwSave">保存敏感词</button> <a data-go="plans">去套餐管理改价格 →</a></div></div>';
    main.innerHTML = html;
    $('pwBtn').onclick = doChangePw;
    $('qnSave').onclick = function(){ api('PUT', '/qiniu-domain', { domain: $('qnDomain').value }).then(function(r){ toast('已保存：' + (r.domain || '')); }).catch(fail); };
    $('kwSave').onclick = function(){ api('PUT', '/keywords', { keywords: $('kw').value }).then(function(){ toast('敏感词已保存'); }).catch(fail); };
    main.querySelector('[data-go]').onclick = function(){ go('plans'); };
  }).catch(fail);
};

if (TOKEN) showApp(); else $('pwd').focus();
})();
</script>
</body>
</html>`
