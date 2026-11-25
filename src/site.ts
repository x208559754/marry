import { icpFooterHtml, icpFooterStyle } from './icp-footer'

// 官网：介绍微信小程序「有囍請柬」。
// 这是模板字符串，内嵌脚本里不要用反引号和 ${}
export const site = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#8B1E1E">
<meta name="description" content="有囍請柬是微信里的婚礼请柬。新人发专属小程序码，亲友扫码启封、看行程与相册、回执出席、留下祝福。">
<title>有囍請柬</title>
<link rel="icon" href="/brand/mark.png">
<style>
` + icpFooterStyle + `

  :root {
    --ink: #3c2422;
    --muted: #6d564c;
    --red: #8B1E1E;
    --red-deep: #6e1616;
    --gold: #a68456;
    --line: #ead9c9;
    --paper: #f6efe6;
    --card: #fffaf4;
    --guest: #7a4e32;
  }
  * { box-sizing: border-box; }
  :root { --nav-offset: 72px; }
  html { scroll-behavior: smooth; color-scheme: light; scroll-padding-top: var(--nav-offset); }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    color: var(--ink);
    background:
      radial-gradient(ellipse at 12% -8%, rgba(196, 122, 134, 0.18), transparent 42%),
      radial-gradient(ellipse at 100% 0%, rgba(166, 132, 86, 0.14), transparent 34%),
      var(--paper);
    font-family: "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", sans-serif;
    line-height: 1.7;
  }
  img { max-width: 100%; }
  a { color: inherit; }
  .skip { position: absolute; left: -999px; top: 8px; background: #fff; padding: 8px 12px; z-index: 80; }
  .skip:focus { left: 12px; }
  .wrap { width: min(1080px, calc(100% - 40px)); margin: 0 auto; }
  .nav {
    position: sticky; top: 0; z-index: 20;
    background: rgba(246, 239, 230, 0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(234, 217, 201, 0.9);
  }
  .nav-inner {
    display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 18px;
    padding: 14px 0;
  }
  .brand { display: flex; align-items: center; gap: 10px; color: var(--ink); text-decoration: none; }
  .brand img { width: 40px; height: 40px; border-radius: 50%; display: block; }
  .brand span { font-family: "Songti SC", "STSong", "Noto Serif SC", serif; font-size: 22px; letter-spacing: 0.12em; }
  .nav-links { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px 18px; }
  .nav-links a { color: var(--muted); text-decoration: none; font-size: 14px; }
  .nav-links a:hover { color: var(--red); }
  .nav-ask, .btn {
    border: 0; cursor: pointer; font: inherit;
    background: var(--red); color: #fff;
    border-radius: 999px; padding: 8px 16px; text-decoration: none;
    display: inline-flex; align-items: center;
  }
  .nav-ask { white-space: nowrap; }
  .btn.ghost {
    background: transparent; color: var(--red);
    box-shadow: inset 0 0 0 1px rgba(139, 30, 30, 0.4);
  }
  .hero {
    display: grid; gap: 28px; align-items: center;
    padding: 18px 0 56px;
  }
  .kicker {
    margin: 0 0 10px; color: var(--red); font-size: 12px; letter-spacing: 0.28em;
  }
  h1, h2, h3 { font-family: "Songti SC", "STSong", "Noto Serif SC", serif; font-weight: 500; }
  .hero h1 {
    margin: 0; color: var(--ink);
    font-size: clamp(48px, 7vw, 76px);
    letter-spacing: 0.14em; line-height: 1.05;
  }
  .lede { margin: 18px 0 0; max-width: 36em; font-size: 17px; color: var(--muted); }
  .hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
  main { padding-bottom: 24px; }
  section { padding: 48px 0 8px; }
  #kefu { min-height: calc(100vh - var(--nav-offset)); min-height: calc(100svh - var(--nav-offset)); }
  section.hero { padding: 42px 0 8px; }
  .section-head { max-width: 40em; margin-bottom: 8px; }
  .section-head h2 { font-size: clamp(28px, 4vw, 40px); margin: 0 0 8px; letter-spacing: 0.04em; }
  .section-head p { margin: 0; color: var(--muted); }
  #flow { display: grid; grid-template-columns: 1fr; gap: 14px; }
  .flow-start {
    display: flex; align-items: center; gap: 14px;
    background: var(--card); border: 1px solid var(--line); border-radius: 18px;
    padding: 16px 18px;
  }
  .flow-start strong { display: block; font-size: 16px; }
  .flow-start span { color: var(--muted); font-size: 14px; }
  .lane {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 22px;
    padding: 18px 16px 16px;
    margin: 0;
  }
  .lane-name {
    display: flex; align-items: center; gap: 8px;
    letter-spacing: 0.22em; font-size: 13px; margin-bottom: 12px;
    color: var(--red);
  }
  .lane-name::before {
    content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--red);
  }
  .lane-guest .lane-name { color: var(--guest); }
  .lane-guest .lane-name::before { background: var(--guest); }
  .lane-track { display: flex; flex-direction: column; }
  .node {
    width: 100%; min-width: 0; text-align: left; cursor: pointer; font: inherit; color: inherit;
    background: #fff; border: 1px solid var(--line); border-radius: 14px;
    padding: 12px 14px; display: flex; gap: 12px; align-items: center;
  }
  .node:hover { border-color: #e2c8bc; }
  .node-no { color: var(--gold); font-variant-numeric: tabular-nums; font-size: 13px; width: 1.6em; flex: none; }
  .node-name { line-height: 1.45; }
  .node.is-on { border-color: var(--red); background: #fff6f4; box-shadow: 0 8px 20px rgba(210, 58, 50, 0.08); }
  .lane-guest .node.is-on { border-color: var(--guest); background: #fff8f3; box-shadow: 0 8px 20px rgba(154, 91, 50, 0.08); }
  .join { width: 1px; height: 10px; background: #e3d5c8; margin-left: 26px; }
  .detail {
    background: var(--card); border: 1px solid var(--line); border-radius: 18px;
    padding: 20px 20px 18px;
  }
  .detail-kicker { margin: 0 0 4px; color: var(--gold); font-size: 13px; letter-spacing: 0.08em; }
  .detail h3 { margin: 0 0 8px; font-size: 26px; }
  .detail p { margin: 0; color: var(--muted); }
  .note { margin: 0; color: var(--muted); font-size: 14px; }
  .grid { display: grid; gap: 14px; grid-template-columns: 1fr; }
  .card {
    background: var(--card); border: 1px solid var(--line); border-radius: 18px;
    padding: 18px 18px 16px;
  }
  .card .ix { color: var(--gold); font-size: 12px; letter-spacing: 0.16em; }
  .card h3 { margin: 6px 0 8px; font-size: 22px; }
  .card p { margin: 0; color: var(--muted); font-size: 14px; }
  .steps { display: grid; gap: 14px; }
  .step {
    display: grid; grid-template-columns: auto 1fr; gap: 14px; align-items: start;
    background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 18px;
  }
  .step b {
    width: 42px; height: 42px; border-radius: 50%;
    display: grid; place-items: center;
    background: #fff1ef; color: var(--red);
    font-family: "Songti SC", "STSong", serif; font-size: 16px; font-weight: 500;
  }
  .step h3 { margin: 0 0 4px; font-size: 20px; }
  .step p { margin: 0; color: var(--muted); font-size: 14px; }
  main { flex: 1 0 auto; }
  footer { margin-top: auto; padding: 64px 0 120px; color: var(--muted); font-size: 13px; text-align: center; }
  .fab {
    position: fixed; right: 16px; bottom: 16px; z-index: 30;
    display: flex; align-items: center; gap: 8px;
    border: 0; cursor: pointer; font: inherit;
    background: var(--red); color: #fffaf4;
    border-radius: 999px; padding: 12px 16px;
    box-shadow: 0 10px 24px rgba(139, 30, 30, 0.24);
  }
  .fab-seal {
    width: 28px; height: 28px; border-radius: 50%;
    display: grid; place-items: center; background: rgba(255, 250, 244, 0.16); color: #fffaf4;
    font-family: "Songti SC", "STSong", serif;
  }
  .chat {
    display: none; position: fixed; z-index: 40;
    right: 16px; bottom: 76px;
    width: min(380px, calc(100vw - 24px));
    height: min(560px, calc(100vh - 110px));
    background: #fffaf6; color: var(--ink);
    border: 1px solid var(--line); border-radius: 20px;
    box-shadow: 0 18px 50px rgba(44, 36, 34, 0.2);
    flex-direction: column; overflow: hidden;
  }
  .chat.is-open { display: flex; }
  .chat-head {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 12px 12px 12px 14px; background: var(--red); color: #fffaf4;
  }
  .chat-head strong { display: block; font-weight: 600; }
  .chat-head span { display: block; font-size: 12px; opacity: 0.72; }
  .chat-x {
    border: 0; background: transparent; color: #fff; font: inherit;
    cursor: pointer; width: 32px; height: 32px; border-radius: 8px;
  }
  .chat-log { flex: 1; overflow: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
  .msg {
    max-width: 88%; padding: 10px 12px; border-radius: 14px;
    white-space: pre-wrap; font-size: 14px; line-height: 1.6;
  }
  .msg-bot { background: #fff; border: 1px solid var(--line); align-self: flex-start; }
  .msg-user { background: var(--red); color: #fff; align-self: flex-end; }
  .chat-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 14px 8px; }
  .chip {
    border: 1px solid var(--line); background: #fff; color: var(--red-deep);
    border-radius: 999px; padding: 5px 10px; font: inherit; font-size: 12px; cursor: pointer;
  }
  .chat-form { display: flex; gap: 8px; padding: 10px; border-top: 1px solid var(--line); background: #fff; }
  .chat-form input {
    flex: 1; border: 1px solid var(--line); border-radius: 999px;
    padding: 10px 12px; font: inherit; background: #fff; color: var(--ink);
  }
  .chat-form button {
    border: 0; background: var(--red); color: #fff; border-radius: 999px;
    padding: 0 14px; font: inherit; cursor: pointer;
  }
  .node:focus-visible, .btn:focus-visible, .chip:focus-visible, .fab:focus-visible, .nav-ask:focus-visible, .look-item:focus-visible {
    outline: 2px solid var(--red); outline-offset: 2px;
  }
  .lookbook {
    display: grid; grid-template-columns: auto 1fr;
    margin-top: 18px; min-height: 460px;
    border: 1px solid var(--line); border-radius: 28px; overflow: hidden;
    background: #fffaf6;
  }
  .look-index {
    display: flex; align-items: stretch;
    background: #fffaf6; border-right: 1px solid var(--line);
  }
  .look-item {
    writing-mode: vertical-rl; border: 0; cursor: pointer; font: inherit;
    flex: none; width: 52px;
    display: grid; place-items: center;
    background: transparent; color: var(--pick, var(--ink));
    padding: 0; opacity: 0.72;
  }
  .look-item + .look-item { box-shadow: inset 1px 0 0 rgba(60, 36, 34, 0.06); }
  .look-item.is-on { opacity: 1; background: var(--pick-bg, #fff); }
  .look-name {
    font-family: "Songti SC", "STSong", "Noto Serif SC", serif;
    font-size: 18px; letter-spacing: 0.45em;
  }
  .look-sheet {
    position: relative; overflow: hidden; min-height: 460px;
    display: grid; place-items: center; padding: 40px 28px;
    background:
      radial-gradient(circle at 88% 8%, var(--a, #f3b6c8), transparent 34%),
      var(--bg, #fff1f5);
    color: var(--ink, #6b3044);
    --p: #d4567c; --a: #f3b6c8; --bg: #fff1f5; --ink: #6b3044; --petal: #f4a7c1;
    transition: background 0.35s ease;
  }
  .look-mark {
    position: absolute; right: 6%; bottom: -8%;
    font-family: "Songti SC", "STSong", serif; font-size: 200px; line-height: 1;
    color: var(--p); opacity: 0.09; pointer-events: none; user-select: none;
  }
  .petal { display: none; }
  .is-sakura .petal {
    display: block; position: absolute; width: 12px; height: 16px; border-radius: 80% 0 80% 0;
    background: var(--petal); opacity: 0.85; pointer-events: none;
    animation: fall 9s linear infinite;
  }
  .petal:nth-child(1) { left: 8%; animation-duration: 8s; }
  .petal:nth-child(2) { left: 28%; animation-delay: 1.5s; width: 10px; height: 14px; }
  .petal:nth-child(3) { left: 52%; animation-delay: 3s; animation-duration: 11s; }
  .petal:nth-child(4) { left: 70%; animation-delay: 0.6s; }
  .petal:nth-child(5) { left: 86%; animation-delay: 2.4s; animation-duration: 10s; }
  @keyframes fall {
    0% { transform: translateY(-30px) rotate(0deg); }
    100% { transform: translateY(520px) rotate(200deg); }
  }
  .theme-paper {
    position: relative; z-index: 1;
    width: min(360px, 100%);
    background: rgba(255, 255, 255, 0.84);
    padding: 42px 28px 32px; text-align: center;
    box-shadow: 0 18px 40px rgba(60, 36, 34, 0.06);
  }
  .theme-paper::before {
    content: ""; position: absolute; inset: 8px; pointer-events: none;
    border: 1px solid var(--a, #f3b6c8);
  }
  .theme-kicker {
    margin: 0; letter-spacing: 0.42em; font-size: 12px; color: var(--p);
  }
  .theme-paper h3 {
    margin: 18px 0 8px; font-size: clamp(26px, 3vw, 34px);
    letter-spacing: 0.08em; color: var(--ink); white-space: nowrap;
  }
  .theme-paper p { margin: 0; color: var(--muted); font-size: 14px; }
  .theme-rule {
    width: 36px; height: 1px; margin: 18px auto; background: var(--p);
  }
  .theme-couple { letter-spacing: 0.18em; color: var(--ink); font-size: 15px; }
  .theme-couple b { color: var(--p); font-weight: 500; }
  .theme-date { margin-top: 14px !important; letter-spacing: 0.28em; font-size: 12px !important; color: var(--p) !important; }
  @media (min-width: 880px) {
    .hero { padding: 28px 0 72px; }
    #flow { grid-template-columns: 1fr 1fr; }
    #flow > .section-head,
    #flow > .flow-start,
    #flow > .detail,
    #flow > .note { grid-column: 1 / -1; }
    .grid { grid-template-columns: repeat(3, 1fr); }
    .steps { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 960px) {
    :root { --nav-offset: 72px; }
  }
  @media (max-width: 720px) {
    :root { --nav-offset: 72px; }
    .nav-links a { display: none; }
    .brand span { font-size: 18px; }
    .lookbook { grid-template-columns: 1fr; }
    .look-index {
      border-right: 0; border-bottom: 1px solid var(--line);
      overflow-x: auto;
    }
    .look-item { padding: 16px 12px; }
    .look-sheet { min-height: 380px; padding: 28px 16px; }
    .look-mark { font-size: 140px; }
    .theme-paper h3 { font-size: 24px; }
  }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    .petal { animation: none; opacity: 0.35; }
  }
  .kefu-card {
    display: flex; align-items: center; gap: 28px;
    max-width: 540px; margin-top: 20px;
    padding: 24px 28px;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 24px;
    box-shadow: 0 10px 28px rgba(44, 36, 34, 0.06);
  }
  .kefu-card img {
    width: 168px; height: 168px; flex: none;
    border-radius: 12px; background: #fff;
    box-shadow: 0 0 0 1px rgba(60, 36, 34, 0.06);
  }
  .kefu-meta { min-width: 0; }
  .kefu-label {
    margin: 0; color: var(--muted); font-size: 12px; letter-spacing: 0.2em;
  }
  .kefu-id {
    margin: 6px 0 16px; color: var(--red);
    font-size: 28px; font-weight: 600; letter-spacing: 0.08em; line-height: 1.2;
  }
  .kefu-hint { margin: 12px 0 0; color: var(--muted); font-size: 13px; }
  .chat-kefu {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 12px; background: #fff7ee;
    border-bottom: 1px solid var(--line);
  }
  .chat-kefu img {
    width: 64px; height: 64px; flex: none; border-radius: 8px; background: #fff;
  }
  .chat-kefu strong { display: block; font-size: 13px; font-weight: 600; }
  .chat-kefu .kefu-id { margin: 0 0 6px; font-size: 16px; }
  .chat-kefu .btn { padding: 4px 10px; font-size: 12px; }
  @media (max-width: 640px) {
    .kefu-card { flex-direction: column; align-items: center; text-align: center; padding: 28px 22px; }
  }
</style>
</head>
<body>
<a class="skip" href="#flow">跳到使用流程</a>
<header class="nav">
  <div class="wrap nav-inner">
    <a class="brand" href="/">
      <img src="/brand/mark.png" alt="">
      <span>有囍請柬</span>
    </a>
    <nav class="nav-links">
      <a href="#themes">颜色主题</a>
      <a href="#flow">使用流程</a>
      <a href="#inside">请柬里有什么</a>
      <a href="#start">怎么开始</a>
      <a href="#kefu">联系客服</a>
      <button class="nav-ask" type="button" id="open-chat">问小囍</button>
    </nav>
  </div>
</header>

<main class="wrap">
  <section class="hero">
    <div>
      <p class="kicker">微信小程序 · 婚礼请柬</p>
      <h1>有囍請柬</h1>
      <p class="lede">一对新人一张喜帖。亲友扫码启封，看日子、故事和照片，确认来不来，再留下一句祝福。这个网页是官网，喜帖在小程序里打开。</p>
      <div class="hero-actions">
        <a class="btn" href="#flow">看使用流程</a>
        <a class="btn ghost" href="#kefu">联系客服</a>
      </div>
    </div>
  </section>

  <section id="themes">
    <div class="section-head">
      <h2>颜色可以换</h2>
      <p>五套颜色写在喜帖旁边。点一个名字，这一张就换成那套。樱花会落下花瓣。</p>
    </div>
    <div class="lookbook">
      <div class="look-index" id="theme-picks">
        <button class="look-item is-on" type="button" data-id="sakura" data-name="樱花 · 春日粉黛" data-line="粉瓣轻落，春风十里" data-symbol="樱" data-primary="#d4567c" data-accent="#f3b6c8" data-bg="#fff1f5" data-ink="#6b3044" data-petal="#f4a7c1" style="--pick:#d4567c;--pick-bg:#fff1f5">
          <span class="look-name">樱花</span>
        </button>
        <button class="look-item" type="button" data-id="chinese" data-name="新中式 · 国潮喜韵" data-line="绛红烫金，鸾凤和鸣" data-symbol="囍" data-primary="#8B1E1E" data-accent="#c4a15a" data-bg="#fff8ef" data-ink="#3c2422" data-petal="#e7c7a2" style="--pick:#8B1E1E;--pick-bg:#fff8ef">
          <span class="look-name">新中式</span>
        </button>
        <button class="look-item" type="button" data-id="french" data-name="法式 · 浪漫香槟" data-line="珠光玫瑰，电影质感" data-symbol="❦" data-primary="#a16207" data-accent="#e7c98a" data-bg="#fffdf6" data-ink="#5c3b16" data-petal="#f6d7c4" style="--pick:#a16207;--pick-bg:#fffdf6">
          <span class="look-name">法式</span>
        </button>
        <button class="look-item" type="button" data-id="forest" data-name="森系 · 草木晨曦" data-line="橄榄新绿，户外草坪" data-symbol="叶" data-primary="#166534" data-accent="#86efac" data-bg="#f3faf4" data-ink="#143d28" data-petal="#b7e4c7" style="--pick:#166534;--pick-bg:#f3faf4">
          <span class="look-name">森系</span>
        </button>
        <button class="look-item" type="button" data-id="minimal" data-name="现代 · 艺术轻奢" data-line="黑白留白，画廊杂志" data-symbol="✦" data-primary="#18181b" data-accent="#a1a1aa" data-bg="#f6f6f7" data-ink="#18181b" data-petal="#d4d4d8" style="--pick:#18181b;--pick-bg:#f6f6f7">
          <span class="look-name">轻奢</span>
        </button>
      </div>
      <div class="look-sheet is-sakura" id="theme-stage" aria-live="polite">
        <span class="petal"></span><span class="petal"></span><span class="petal"></span><span class="petal"></span><span class="petal"></span>
        <div class="look-mark" id="theme-symbol" aria-hidden="true">樱</div>
        <div class="theme-paper">
          <p class="theme-kicker">有囍請柬</p>
          <h3 id="theme-name">樱花 · 春日粉黛</h3>
          <p id="theme-line">粉瓣轻落，春风十里</p>
          <div class="theme-rule"></div>
          <div class="theme-couple">新郎 <b>&</b> 新娘</div>
          <p class="theme-date">敬备喜酌 · 恭请光临</p>
        </div>
      </div>
    </div>
  </section>

  <section id="flow">
    <div class="section-head">
      <h2>一张喜帖，两条路</h2>
      <p>一条给新人，一条给宾客。点任意一步，看这一步实际发生什么。</p>
    </div>
    <div class="flow-start">
      <div>
        <strong>打开有囍請柬</strong>
        <span>没有婚礼码时，小程序只显示介绍；扫到哪一场，就进入那一场。</span>
      </div>
    </div>

    <div class="lane lane-couple">
      <div class="lane-name">新人</div>
      <div class="lane-track" id="couple-track">
        <button class="node is-on" type="button" data-lane="couple" data-i="0"><span class="node-no">01</span><span class="node-name">开通这场婚礼</span></button>
        <span class="join" aria-hidden="true"></span>
        <button class="node" type="button" data-lane="couple" data-i="1"><span class="node-no">02</span><span class="node-name">写成你们的喜帖</span></button>
        <span class="join" aria-hidden="true"></span>
        <button class="node" type="button" data-lane="couple" data-i="2"><span class="node-no">03</span><span class="node-name">生成小程序码</span></button>
        <span class="join" aria-hidden="true"></span>
        <button class="node" type="button" data-lane="couple" data-i="3"><span class="node-no">04</span><span class="node-name">发给亲友</span></button>
        <span class="join" aria-hidden="true"></span>
        <button class="node" type="button" data-lane="couple" data-i="4"><span class="node-no">05</span><span class="node-name">看回执和祝福</span></button>
      </div>
    </div>

    <div class="lane lane-guest">
      <div class="lane-name">宾客</div>
      <div class="lane-track">
        <button class="node" type="button" data-lane="guest" data-i="0"><span class="node-no">01</span><span class="node-name">扫新人发来的码</span></button>
        <span class="join" aria-hidden="true"></span>
        <button class="node" type="button" data-lane="guest" data-i="1"><span class="node-no">02</span><span class="node-name">启封喜帖</span></button>
        <span class="join" aria-hidden="true"></span>
        <button class="node" type="button" data-lane="guest" data-i="2"><span class="node-no">03</span><span class="node-name">看日子、故事和照片</span></button>
        <span class="join" aria-hidden="true"></span>
        <button class="node" type="button" data-lane="guest" data-i="3"><span class="node-no">04</span><span class="node-name">提交出席回执</span></button>
        <span class="join" aria-hidden="true"></span>
        <button class="node" type="button" data-lane="guest" data-i="4"><span class="node-no">05</span><span class="node-name">送上一句祝福</span></button>
      </div>
    </div>

    <div class="detail" id="flow-detail">
      <p class="detail-kicker" id="detail-kicker">新人 · 第 1 步</p>
      <h3 id="detail-title">开通这场婚礼</h3>
      <p id="detail-body">平台为你们单独建一场婚礼。之后的照片、回执、祝福和宾客留下的称呼，都只属于这一场。</p>
    </div>
    <p class="note">一个小程序可以同时招待很多场婚礼。同一位亲友参加两场，两边的回执和祝福互不影响。</p>
  </section>

  <section id="inside">
    <div class="section-head">
      <h2>请柬里的六件事</h2>
      <p>宾客扫码之后，小程序底部就是这些入口。故事写在「岁月印记」里，会出现在故事页和相册页。</p>
    </div>
    <div class="grid">
      <article class="card"><div class="ix">01</div><h3>火漆请柬</h3><p>开屏是一封信封。轻触火漆印展开邀请信，首页按婚礼日期倒计时，背景音乐可以关掉。</p></article>
      <article class="card"><div class="ix">02</div><h3>岁月印记</h3><p>把相遇、相知写成一段段纪事。保存之后，宾客在「我们相遇的故事」里按时间读到。</p></article>
      <article class="card"><div class="ix">03</div><h3>婚纱相册</h3><p>照片在管理里上传，宾客在相册页翻看。带婚礼标识的网页链接，打开的是这场婚礼的照片墙。</p></article>
      <article class="card"><div class="ix">04</div><h3>盛典日程</h3><p>当天的环节按时间排开。酒店和地址写好之后，宾客可以地图导航，也可以一键拨打电话。</p></article>
      <article class="card"><div class="ix">05</div><h3>出席回执</h3><p>宾客选择出席或请假，填上称呼和同行人数，也可以附一句祝福。管理里能看到名单和人数。</p></article>
      <article class="card"><div class="ix">06</div><h3>祝福墙</h3><p>亲友的寄语变成弹幕。同一句话不会重复刷上墙。</p></article>
    </div>
  </section>

  <section id="start">
    <div class="section-head">
      <h2>新人从这里开始</h2>
      <p>最短的路径就这三步。细一点的顺序，就是上面那条新人流程。</p>
    </div>
    <div class="steps">
      <article class="step"><b>01</b><div><h3>开通一场婚礼</h3><p>告诉平台两个人的名字和日子。我们为这场婚礼单独建档，和其他场次隔开。</p></div></article>
      <article class="step"><b>02</b><div><h3>写成你们的喜帖</h3><p>姓名、吉日、酒店、行程、故事和照片，都写进这一场。小程序首页长按新人姓名，进入管理。</p></div></article>
      <article class="step"><b>03</b><div><h3>把码发给亲友</h3><p>生成这场婚礼的小程序码，发到亲友群。他们扫码就能看请柬、回执、祝福。</p></div></article>
    </div>
  </section>

  <section id="kefu">
    <div class="section-head">
      <h2>联系客服</h2>
      <p>加微信即可咨询开通、发票或使用上的问题。用微信扫描二维码，或复制微信号添加。</p>
    </div>
    <div class="kefu-card">
      <img src="/kefu/wechat-qr.png" width="168" height="168" alt="客服微信二维码">
      <div class="kefu-meta">
        <p class="kefu-label">微信号</p>
        <p class="kefu-id">lzx91697</p>
        <button class="btn ghost copy-wechat" type="button">复制微信号</button>
        <p class="kefu-hint">微信扫一扫即可添加</p>
      </div>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">有囍請柬 · 微信婚礼请柬。完整喜帖在小程序里打开。</div>
` + icpFooterHtml + `
</footer>

<button class="fab" type="button" id="chat-fab" aria-expanded="false" aria-controls="chat-panel">
  <span class="fab-seal">囍</span>
  <span>问小囍</span>
</button>

<section class="chat" id="chat-panel" aria-hidden="true" aria-labelledby="chat-title">
  <div class="chat-head">
    <div>
      <strong id="chat-title">小囍</strong>
      <span>有囍請柬的喜帖顾问</span>
    </div>
    <button class="chat-x" type="button" id="chat-close" aria-label="关闭客服">×</button>
  </div>
  <div class="chat-kefu">
    <img src="/kefu/wechat-qr.png" width="64" height="64" alt="客服微信二维码">
    <div>
      <strong>微信客服</strong>
      <p class="kefu-id">lzx91697</p>
      <button class="btn ghost copy-wechat" type="button">复制微信号</button>
    </div>
  </div>
  <div class="chat-log" id="chat-log" aria-live="polite">
    <div class="msg msg-bot">你好，我是小囍。可以问我新人怎么发请柬，宾客扫码之后能做什么，或者相册、回执、祝福分别在哪。</div>
  </div>
  <div class="chat-chips" id="chat-chips"></div>
  <form class="chat-form" id="chat-form">
    <input id="chat-input" type="text" maxlength="200" placeholder="问问这场喜帖怎么用" aria-label="输入问题">
    <button type="submit">发送</button>
  </form>
</section>

<script>
(function () {
  function syncNavOffset() {
    var nav = document.querySelector("header.nav");
    if (!nav) return;
    var h = nav.getBoundingClientRect().height;
    document.documentElement.style.setProperty("--nav-offset", h + "px");
  }
  function scrollToCurrentHash() {
    if (!location.hash) return;
    var target = null;
    try { target = document.querySelector(location.hash); } catch (e) {}
    if (!target) return;
    var nav = document.querySelector("header.nav");
    var offset = nav ? nav.getBoundingClientRect().height : 0;
    var y = window.pageYOffset + target.getBoundingClientRect().top - offset;
    if (y < 0) y = 0;
    window.scrollTo({ left: 0, top: y, behavior: "auto" });
  }
  document.documentElement.style.scrollBehavior = "auto";
  syncNavOffset();
  scrollToCurrentHash();
  window.addEventListener("resize", function () {
    syncNavOffset();
    scrollToCurrentHash();
  });
  window.addEventListener("hashchange", function () {
    scrollToCurrentHash();
  });
  window.addEventListener("load", function () {
    syncNavOffset();
    scrollToCurrentHash();
    document.documentElement.style.scrollBehavior = "";
  });

  var couple = [
    { t: "开通这场婚礼", d: "平台为你们单独建一场婚礼。之后的照片、回执、祝福和宾客留下的称呼，都只属于这一场。" },
    { t: "写成你们的喜帖", d: "写上两个人的名字、吉日吉时、酒店和地址，排好当天行程，把故事放进岁月印记，再上传婚纱照。小程序首页长按新人姓名进入管理。若页面要总管口令，这一步由平台后台来改，你把想改的内容告诉平台即可。" },
    { t: "生成小程序码", d: "管理里可以生成这场婚礼专属的小程序码，有正式版、体验版和开发版。发给亲友用正式版。码还没准备好时，会提示先发布对应的版本。" },
    { t: "发给亲友", d: "把二维码发到群里，或在微信里转发小程序卡片。两种方式都会带上这场婚礼。没有这个码，对方打开小程序只能看到介绍，看不到你们的请柬。" },
    { t: "看回执和祝福", d: "宾客提交之后，管理里能看到出席户数和人数。祝福出现在弹幕墙上。相册、行程和故事可以继续改，亲友再次打开就是最新的。" }
  ];
  var guest = [
    { t: "扫新人发来的码", d: "用微信扫描小程序码，或点开新人转发的卡片。码里已经写明是哪一场。扫到不存在的婚礼时，会提示请柬不存在或未开通。" },
    { t: "启封喜帖", d: "第一眼是一封火漆信封。轻触印章打开邀请信，可以先写上自己的称谓，也可以直接翻阅。首页有倒计时，音乐可以关掉。" },
    { t: "看日子、故事和照片", d: "请柬之后可以读「我们相遇的故事」、翻婚纱相册、看当天行程。酒店写好了就能地图导航，电话可以一键拨打。" },
    { t: "提交出席回执", d: "选择出席或请假，填上称呼和同行人数，也可以附一句祝福。手机号自己填；小程序若完成了企业认证，也可以用微信一键填写。" },
    { t: "送上一句祝福", d: "祝福会飘在弹幕墙上。同一个人重复发送同一句话，不会再刷一次。" }
  ];

  var introChips = ["我是新人，怎么开始", "我是宾客，扫码后做什么", "请柬里有哪些功能", "每场婚礼的数据会串吗"];

  var KB = [
    { id: "what", keys: ["这是什么", "干什么", "介绍一下", "什么产品", "什么小程序", "有囍", "有喜"], chips: introChips,
      a: "有囍請柬是微信里的婚礼请柬。一对新人一场婚礼。亲友扫专属小程序码进入，启封之后可以看故事、相册和日程，再回执、送祝福。你现在打开的网页是官网，不是某一场的喜帖。" },
    { id: "themes", keys: ["主题", "樱花", "配色", "换颜色", "什么颜色", "森系", "香槟", "轻奢", "中式", "颜色主题"], chips: ["请柬里有哪些功能"],
      a: "有囍請柬有五套颜色，官网上都能点开看：樱花春日粉黛、新中式国潮喜韵、法式浪漫香槟、森系草木晨曦、现代艺术轻奢。樱花是粉色花瓣，新中式是绛红烫金，法式是香槟金，森系是草木绿，轻奢是黑白留白。" },
    { id: "features", keys: ["请柬里", "有哪些功能", "哪些功能", "有什么功能", "里面有"], chips: ["有哪些颜色主题", "相册在哪", "回执怎么填"],
      a: "宾客能用的有六块：火漆请柬和倒计时、岁月印记、婚纱相册、盛典日程（含导航和拨号）、出席回执、祝福弹幕。底部栏是请柬、相册、盛典、回执、祝福。故事页从请柬里进去。" },
    { id: "couple", keys: ["我是新人", "怎么开始", "新人怎么", "怎么办婚礼", "怎么发请柬", "怎么发给", "我们要结婚", "准备结婚"], chips: ["下一步", "我是宾客，扫码后做什么"],
      a: "新人路径有五步：开通这场婚礼、写成喜帖、生成小程序码、发给亲友、看回执和祝福。开通由平台为你们单独建档。回复「下一步」，我按顺序讲。" },
    { id: "guest", keys: ["宾客怎么", "扫码后", "收到请柬", "亲友怎么", "朋友怎么看", "我是宾客"], chips: ["下一步", "回执怎么填"],
      a: "宾客路径有五步：扫码、启封、看日子故事和照片、提交回执、送上祝福。没有新人发来的码，打开小程序只能看到介绍。回复「下一步」，我按顺序讲。" },
    { id: "admin", keys: ["管理后台", "后台", "长按", "管理员", "怎么改", "修改请柬"], chips: ["口令是什么", "怎么生成二维码"],
      a: "小程序首页长按两位新人的姓名进入管理。在里面可以改婚礼信息、岁月印记、当天行程和相册，也能看回执、生成这场婚礼的小程序码。平台总后台还可以新建婚礼、在不同场次之间切换。" },
    { id: "pass", keys: ["口令", "密码", "总管"], chips: ["管理后台怎么进", "我是新人，怎么开始"],
      a: "总管口令只给平台保管，官网查不到，我也不能告诉你。本场婚礼的管理员身份不能代替这个口令。若你是新人，想改名字、日子或照片，直接把内容告诉平台即可。" },
    { id: "qr", keys: ["二维码", "小程序码", "正式版", "体验版", "开发版"], chips: ["怎么发给亲友", "扫不出来"],
      a: "每一场婚礼有自己的小程序码，在管理里生成。发给亲友请用正式版。体验版和开发版用来在发布前自己看。微信转发的小程序卡片同样会带上这场婚礼。码对应的版本还没发布时，生成会失败并说明原因。" },
    { id: "rsvp", keys: ["回执", "出席", "请假", "人数", "来不来", "名单"], chips: ["祝福在哪", "回执名单在哪"],
      a: "宾客在「回执」里选择出席或请假，填上称呼和同行人数，也可以写一句祝福。提交后可以再更新。回执名单在管理里，能看到出席户数和到场人数。" },
    { id: "bless", keys: ["祝福", "弹幕", "寄语"], chips: ["回执怎么填", "可以点赞吗"],
      a: "「祝福」页是亲友的寄语墙，句子会以弹幕飘过。同一个人把同一句话再发一次，不会重复上墙。回执里附带的祝福也可以出现在这里。" },
    { id: "like", keys: ["点赞", "喜欢"], chips: ["祝福在哪"],
      a: "祝福可以点赞，点一下加一。不需要先登录。" },
    { id: "photos", keys: ["相册", "婚纱", "照片", "照片墙", "上传", "太大"], chips: ["故事在哪写", "照片太大怎么办"],
      a: "婚纱照在小程序「相册」里看，由这场婚礼的管理上传或删除。单张不要超过 15MB。如果有人发你一条带婚礼标识的网页链接，打开的是这一场的照片墙，只能看，不能在网页上上传。" },
    { id: "story", keys: ["故事", "岁月", "纪事", "相遇"], chips: ["相册在哪", "怎么改请柬"],
      a: "故事写在管理的「岁月印记」里，每条有日期、标题和内容，可以配一张图。保存之后，宾客在「我们相遇的故事」和相册页的时间轴里都能看到。还没保存时，宾客端不显示这些纪事。" },
    { id: "schedule", keys: ["日程", "行程", "酒店", "导航", "地址", "拨打", "电话"], chips: ["回执怎么填"],
      a: "「盛典」页按时间列出当天的环节，例如接亲、仪式、宴会。下面是酒店名称、厅和地址。地址写好后可以打开地图导航，电话写好后可以一键拨打。行程还没填时，宾客会看到「正在筹备」。" },
    { id: "phone", keys: ["手机号", "获取手机", "一键"], chips: ["回执怎么填"],
      a: "回执里的手机号可以自己输入。用微信一键取号，需要这个小程序完成企业主体认证。还没认证时，手动填写就行，不影响提交回执。" },
    { id: "isolate", keys: ["会串", "隔离", "混在", "另一场", "多场", "数据会", "wid"], chips: ["小程序码是什么", "扫不出来"],
      a: "不会串。每一场婚礼有自己的短标识，相册、回执、祝福、宾客称呼都按这场婚礼分开存。同一个微信参加两场婚礼，两边是两条独立记录。亲友扫到哪一个码，就只看见那一场。" },
    { id: "missing", keys: ["不存在", "未开通", "扫不出来", "打不开", "推广", "空白", "只有介绍"], chips: ["扫不出来怎么办", "我是宾客，扫码后做什么"],
      a: "直接搜索打开小程序、或链接里没有这场婚礼时，看到的是介绍，不是某一对新人的请柬。这是正常的。若提示「请柬不存在或未开通」，说明这个码对应的婚礼还没建好，或码已经不对，需要新人重新发一次。" },
    { id: "music", keys: ["音乐", "歌曲", "声音", "火漆", "信封", "倒计时"], chips: ["请柬里有哪些功能"],
      a: "打开后先是火漆信封，轻触印章才展开邀请信。首页按婚礼日期做倒计时。背景音乐有一个悬浮按钮，点一下就能关。" },
    { id: "price", keys: ["价格", "多少钱", "收费", "免费", "怎么卖"], chips: ["我是新人，怎么开始"],
      a: "官网上不标价格。每一场婚礼单独开通，包含请柬、故事、相册、日程、回执和祝福墙。你要是准备用，告诉我两个人的称呼和大概日子就行，我可以先把开通后要准备的内容列给你。具体合作不在这个对话框里报价。" },
    { id: "contact", keys: ["联系", "客服电话", "人工", "微信多少", "怎么找你们"], chips: ["我是新人，怎么开始", "口令是什么"],
      a: "加微信 lzx91697，或扫描本页和对话框里的客服二维码。发票、开通或使用上的问题都可以找我们。产品相关的问题也可以直接在这里问我。" },
    { id: "web", keys: ["网页能", "这个网站", "官网", "和微信"], chips: ["照片墙是什么", "是什么产品"],
      a: "这个网站是官网，用来介绍产品。完整的启封、回执和祝福在微信小程序里。网页上只有一种婚礼内容：别人如果把带婚礼标识的链接发给你，打开后是那场婚礼的照片墙。" },
    { id: "openid", keys: ["openid"], chips: ["管理后台怎么进"],
      a: "OpenID 是微信给「这个小程序里的这个用户」的标识。管理页登录后可以复制。宾客看请柬、填回执、送祝福，都不需要知道它。" }
  ];

  var tour = "";
  var tourStep = -1;

  var kicker = document.getElementById("detail-kicker");
  var title = document.getElementById("detail-title");
  var body = document.getElementById("detail-body");
  var nodes = document.querySelectorAll(".node");

  function showStep(lane, index) {
    var list = lane === "guest" ? guest : couple;
    var item = list[index];
    if (!item) return;
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].className = nodes[i].getAttribute("data-lane") === lane && Number(nodes[i].getAttribute("data-i")) === index ? "node is-on" : "node";
    }
    kicker.textContent = (lane === "guest" ? "宾客" : "新人") + " · 第 " + (index + 1) + " 步";
    title.textContent = item.t;
    body.textContent = item.d;
  }

  for (var n = 0; n < nodes.length; n++) {
    nodes[n].addEventListener("click", function (e) {
      var btn = e.currentTarget;
      showStep(btn.getAttribute("data-lane"), Number(btn.getAttribute("data-i")));
    });
  }

  var panel = document.getElementById("chat-panel");
  var fab = document.getElementById("chat-fab");
  var log = document.getElementById("chat-log");
  var chips = document.getElementById("chat-chips");
  var form = document.getElementById("chat-form");
  var input = document.getElementById("chat-input");

  function openChat() {
    panel.className = "chat is-open";
    panel.setAttribute("aria-hidden", "false");
    fab.setAttribute("aria-expanded", "true");
    input.focus();
  }
  function closeChat() {
    panel.className = "chat";
    panel.setAttribute("aria-hidden", "true");
    fab.setAttribute("aria-expanded", "false");
    fab.focus();
  }
  document.getElementById("open-chat").addEventListener("click", openChat);

  var wechatId = "lzx91697";
  var copyBtns = document.querySelectorAll(".copy-wechat");
  function copied(btn) {
    var old = btn.textContent;
    btn.textContent = "已复制";
    setTimeout(function () { btn.textContent = old; }, 1600);
  }
  function copyWechat(btn) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = wechatId;
      ta.setAttribute("readonly", "readonly");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); copied(btn); } catch (e) {}
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(wechatId).then(function () { copied(btn); }).catch(fallback);
    } else {
      fallback();
    }
  }
  for (var c = 0; c < copyBtns.length; c++) {
    copyBtns[c].addEventListener("click", function (e) { copyWechat(e.currentTarget); });
  }

  fab.addEventListener("click", function () {
    if (panel.className.indexOf("is-open") >= 0) closeChat();
    else openChat();
  });
  document.getElementById("chat-close").addEventListener("click", closeChat);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeChat();
  });

  function addMsg(text, who) {
    var el = document.createElement("div");
    el.className = "msg " + (who === "user" ? "msg-user" : "msg-bot");
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }
  function setChips(list) {
    chips.innerHTML = "";
    for (var i = 0; i < list.length; i++) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = list[i];
      b.addEventListener("click", function (e) { ask(e.currentTarget.textContent); });
      chips.appendChild(b);
    }
  }
  function norm(s) {
    return String(s || "").toLowerCase().replace(/\\s+/g, "");
  }
  function best(q) {
    var found = null;
    var score = 0;
    var longest = 0;
    for (var i = 0; i < KB.length; i++) {
      var item = KB[i];
      var s = 0;
      var long = 0;
      for (var k = 0; k < item.keys.length; k++) {
        var key = item.keys[k].toLowerCase();
        if (q.indexOf(key) !== -1) {
          s += key.length;
          if (key.length > long) long = key.length;
        }
      }
      if (long > longest || (long === longest && long > 0 && s >= score)) {
        longest = long;
        score = s;
        found = item;
      }
    }
    if (longest < 2) return null;
    return found;
  }
  function stepText(list, index) {
    var item = list[index];
    var who = tour === "guest" ? "宾客" : "新人";
    return who + " · 第 " + (index + 1) + " 步，共 " + list.length + " 步\\n" + item.t + "\\n" + item.d;
  }
  function stepChips(index, length) {
    if (index < length - 1) return ["下一步", "上一步"];
    return ["看看另一条路径", "请柬里有哪些功能"];
  }
  function startTour(name) {
    tour = name;
    tourStep = -1;
    var item = null;
    for (var i = 0; i < KB.length; i++) if (KB[i].id === name) item = KB[i];
    return { text: item.a, chips: item.chips };
  }
  function answer(raw) {
    var q = norm(raw);
    if (!q) return { text: "你可以直接问，比如「新人怎么发请柬」。", chips: introChips };
    if (/^(你好|您好|嗨|hi|hello|在吗)[!！。.?？呀啊]*$/.test(q)) {
      return { text: "你好，我在。你是准备办婚礼的新人，还是想知道宾客扫码后会看到什么？", chips: introChips };
    }
    if (/^(谢谢|感谢|多谢)/.test(q)) {
      return { text: "不客气。还想了解哪一步，直接问我就行。", chips: introChips };
    }
    if (q.indexOf("另一条") !== -1 || q.indexOf("换一条") !== -1) {
      return startTour(tour === "guest" ? "couple" : "guest");
    }
    if (tour && (q === "下一步" || q === "然后" || q === "然后呢" || q === "继续" || q === "接着")) {
      var list = tour === "guest" ? guest : couple;
      if (tourStep >= list.length - 1) {
        return { text: "这条路径已经讲完了。可以换另一条看看，或问我某一个功能。", chips: ["看看另一条路径", "请柬里有哪些功能"] };
      }
      tourStep += 1;
      showStep(tour, tourStep);
      return { text: stepText(list, tourStep), chips: stepChips(tourStep, list.length) };
    }
    if (tour && q.indexOf("上一步") !== -1) {
      var back = tour === "guest" ? guest : couple;
      if (tourStep <= 0) {
        tourStep = 0;
        showStep(tour, 0);
        return { text: "这就是第 1 步。\\n" + stepText(back, 0), chips: stepChips(0, back.length) };
      }
      tourStep -= 1;
      showStep(tour, tourStep);
      return { text: stepText(back, tourStep), chips: stepChips(tourStep, back.length) };
    }
    if (tour && q.indexOf("回到刚才") !== -1) {
      var cur = tour === "guest" ? guest : couple;
      if (tourStep < 0) return startTour(tour);
      showStep(tour, tourStep);
      return { text: stepText(cur, tourStep), chips: stepChips(tourStep, cur.length) };
    }
    var hit = best(q);
    if (hit && (hit.id === "couple" || hit.id === "guest")) return startTour(hit.id);
    if (hit) {
      var extra = hit.chips.slice();
      if (tour) extra.push("回到刚才的流程");
      return { text: hit.a, chips: extra };
    }
    return {
      text: "这句我还对不上请柬里的功能。可以换个说法，例如「新人怎么发请柬」「宾客扫码后做什么」「相册和回执在哪」。",
      chips: introChips
    };
  }
  function ask(text) {
    var clean = String(text || "").trim();
    if (!clean) return;
    if (clean.length > 200) clean = clean.slice(0, 200);
    addMsg(clean, "user");
    var out = answer(clean);
    addMsg(out.text, "bot");
    setChips(out.chips);
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var value = input.value;
    input.value = "";
    ask(value);
  });
  setChips(introChips);

  var stage = document.getElementById("theme-stage");
  var picks = document.querySelectorAll(".look-item");
  function paintTheme(btn) {
    if (!stage || !btn) return;
    stage.style.setProperty("--p", btn.getAttribute("data-primary"));
    stage.style.setProperty("--a", btn.getAttribute("data-accent"));
    stage.style.setProperty("--bg", btn.getAttribute("data-bg"));
    stage.style.setProperty("--ink", btn.getAttribute("data-ink"));
    stage.style.setProperty("--petal", btn.getAttribute("data-petal"));
    stage.className = btn.getAttribute("data-id") === "sakura" ? "look-sheet is-sakura" : "look-sheet";
    document.getElementById("theme-symbol").textContent = btn.getAttribute("data-symbol");
    document.getElementById("theme-name").textContent = btn.getAttribute("data-name");
    document.getElementById("theme-line").textContent = btn.getAttribute("data-line");
    for (var i = 0; i < picks.length; i++) picks[i].className = "look-item";
    btn.className = "look-item is-on";
  }
  for (var t = 0; t < picks.length; t++) {
    picks[t].addEventListener("click", function (e) { paintTheme(e.currentTarget); });
  }
})();
</script>
</body>
</html>`
