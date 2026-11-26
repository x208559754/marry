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
<link rel="preload" as="image" href="/brand/wax-seal.png">
<script>(function(){if(!location.hash||location.hash==="#"){document.documentElement.className+=" is-sealed";}})();</script>
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

  /* ===== 全屏绯绒锦封 → 透光素绢 → 官网层层递进 ===== */
  .splash {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 90;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
  }
  html.is-sealed .splash,
  .splash.is-active {
    display: flex;
  }
  .splash.is-gone {
    display: none !important;
  }
  html.is-sealed body {
    overflow: hidden;
  }

  /* 第二层：透光晨曦素绢衬页（绯绒门扉对开后显露，再如晨雾消散） */
  .splash-vellum {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(circle at 50% 44%, rgba(255, 252, 247, 0.95) 0%, rgba(247, 238, 227, 0.9) 62%, rgba(238, 224, 208, 0.88) 100%);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    transition: opacity 0.82s cubic-bezier(0.22, 1, 0.36, 1), transform 0.88s cubic-bezier(0.22, 1, 0.36, 1);
    pointer-events: none;
  }
  .splash.is-vellum-out .splash-vellum {
    opacity: 0;
    transform: translate3d(0, -18px, 0) scale(1.04);
  }
  .vellum-card {
    position: relative;
    width: min(420px, calc(100% - 48px));
    padding: 52px 32px 46px;
    text-align: center;
    border: 1px solid rgba(182, 145, 92, 0.38);
    border-radius: 210px 210px 14px 14px;
    background: linear-gradient(180deg, rgba(255, 253, 250, 0.92), rgba(251, 244, 234, 0.78));
    box-shadow: 0 28px 70px -24px rgba(108, 42, 36, 0.16);
    opacity: 0;
    transform: translate3d(0, 18px, 0) scale(0.96);
    transition: opacity 0.72s cubic-bezier(0.22, 1, 0.36, 1) 0.18s, transform 0.86s cubic-bezier(0.22, 1, 0.36, 1) 0.18s;
  }
  .vellum-card::before {
    content: "";
    position: absolute;
    inset: 9px;
    border: 1px solid rgba(182, 145, 92, 0.22);
    border-radius: 202px 202px 10px 10px;
    pointer-events: none;
  }
  .splash.is-wings-open .vellum-card {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
  .vellum-mark {
    width: 40px;
    height: 40px;
    margin: 0 auto 18px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: linear-gradient(145deg, #9f2027, #6d1217);
    color: #f6ddb0;
    font-family: "Songti SC", "STSong", "Noto Serif SC", serif;
    font-size: 18px;
    box-shadow: 0 8px 20px rgba(139, 30, 30, 0.22);
  }
  .vellum-kicker {
    margin: 0 0 10px;
    font-size: 11px;
    letter-spacing: 0.42em;
    text-indent: 0.42em;
    color: var(--gold);
  }
  .vellum-title {
    margin: 0;
    font-family: "Songti SC", "STSong", "Noto Serif SC", serif;
    font-size: clamp(28px, 4.5vw, 38px);
    letter-spacing: 0.32em;
    text-indent: 0.32em;
    color: var(--ink);
    font-weight: 500;
  }
  .vellum-rule {
    width: 56px;
    height: 1px;
    margin: 20px auto;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
    transform: scaleX(0.2);
    transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.32s;
  }
  .splash.is-wings-open .vellum-rule {
    transform: scaleX(1);
  }
  .vellum-note {
    margin: 0;
    font-family: "Songti SC", "STSong", "Noto Serif SC", serif;
    font-size: 14px;
    letter-spacing: 0.3em;
    text-indent: 0.3em;
    color: var(--muted);
  }

  /* 第一层：全屏绯绒丝缎对开请柬双翼 */
  .splash-wing {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 50.5%;
    z-index: 5;
    overflow: hidden;
    transition: transform 1.06s cubic-bezier(0.66, 0, 0.22, 1), box-shadow 0.45s ease;
    will-change: transform;
  }
  .splash-wing.is-left {
    left: 0;
    background:
      radial-gradient(ellipse at 100% 50%, rgba(168, 46, 56, 0.52) 0%, rgba(112, 22, 31, 0.14) 48%, transparent 72%),
      radial-gradient(ellipse at 18% 16%, rgba(212, 148, 128, 0.14), transparent 52%),
      linear-gradient(115deg, #32070d 0%, #520e17 44%, #6a1620 82%, #721924 100%);
  }
  .splash-wing.is-right {
    right: 0;
    background:
      radial-gradient(ellipse at 0% 50%, rgba(168, 46, 56, 0.52) 0%, rgba(112, 22, 31, 0.14) 48%, transparent 72%),
      radial-gradient(ellipse at 82% 84%, rgba(212, 162, 118, 0.14), transparent 52%),
      linear-gradient(245deg, #32070d 0%, #520e17 44%, #6a1620 82%, #721924 100%);
  }
  /* 丝绒斜向织锦光泽 */
  .splash-wing::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      repeating-linear-gradient(
        135deg,
        rgba(255, 228, 196, 0.018) 0px,
        rgba(255, 228, 196, 0.018) 2px,
        transparent 2px,
        transparent 10px
      );
  }
  /* 中央鎏金拱形折翼金线与独立等比花枝 */
  .wing-ornament {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .wing-floral {
    position: absolute;
    width: min(360px, 68vw);
    height: auto;
    pointer-events: none;
  }
  .wing-floral.is-tl { top: 26px; left: 26px; }
  .wing-floral.is-br { bottom: 26px; right: 26px; }
  .splash.is-wings-open .splash-wing.is-left {
    transform: translate3d(-104%, 0, 0);
    box-shadow: inset -1.5px 0 0 rgba(238, 206, 146, 0.48), 26px 0 64px rgba(24, 4, 7, 0.48);
  }
  .splash.is-wings-open .splash-wing.is-right {
    transform: translate3d(104%, 0, 0);
    box-shadow: inset 1.5px 0 0 rgba(238, 206, 146, 0.48), -26px 0 64px rgba(24, 4, 7, 0.48);
  }

  /* 左右错落竖排题字（避开中线丝带，留白如画卷） */
  .wing-verse {
    position: absolute;
    writing-mode: vertical-rl;
    font-family: "Songti SC", "STSong", "Noto Serif SC", serif;
    font-size: 13px;
    letter-spacing: 0.46em;
    color: rgba(244, 219, 174, 0.62);
    display: flex;
    align-items: center;
    gap: 12px;
    pointer-events: none;
    opacity: 0;
    animation: spVerseIn 1s cubic-bezier(0.22, 1, 0.36, 1) 0.42s forwards;
  }
  .wing-verse i {
    display: block;
    width: 1px;
    height: 22px;
    background: linear-gradient(180deg, transparent, rgba(238, 206, 146, 0.55), transparent);
  }
  .splash-wing.is-left .wing-verse { left: clamp(36px, 6vw, 88px); bottom: clamp(54px, 11vh, 110px); }
  .splash-wing.is-right .wing-verse { right: clamp(36px, 6vw, 88px); top: clamp(78px, 13vh, 130px); }
  @keyframes spVerseIn {
    from { opacity: 0; transform: translate3d(0, 12px, 0); }
    to { opacity: 1; transform: translate3d(0, 0, 0); }
  }

  /* 柔光光斑与飘落花瓣氛围层 */
  .splash-ambient {
    position: absolute;
    inset: 0;
    z-index: 6;
    pointer-events: none;
    overflow: hidden;
    transition: opacity 0.6s ease;
  }
  .splash.is-wings-open .splash-ambient {
    opacity: 0;
  }
  .sp-bokeh {
    position: absolute;
    border-radius: 50%;
    filter: blur(34px);
    opacity: 0.35;
    animation: spBokehFloat 9s ease-in-out infinite;
  }
  .sp-bokeh.b1 { width: 280px; height: 280px; left: 10%; top: 12%; background: radial-gradient(circle, rgba(246, 198, 152, 0.55), transparent 70%); animation-delay: 0s; }
  .sp-bokeh.b2 { width: 340px; height: 340px; right: 8%; bottom: 10%; background: radial-gradient(circle, rgba(232, 150, 156, 0.42), transparent 70%); animation-delay: 2.5s; }
  .sp-bokeh.b3 { width: 220px; height: 220px; left: 50%; top: 50%; transform: translate(-50%, -50%); background: radial-gradient(circle, rgba(252, 220, 168, 0.44), transparent 68%); animation-duration: 7s; animation-name: spCenterGlow; }
  @keyframes spBokehFloat {
    0%, 100% { opacity: 0.28; transform: translate3d(0, 0, 0) scale(0.96); }
    50% { opacity: 0.48; transform: translate3d(0, -14px, 0) scale(1.06); }
  }
  @keyframes spCenterGlow {
    0%, 100% { opacity: 0.32; transform: translate(-50%, -50%) scale(0.94); }
    50% { opacity: 0.56; transform: translate(-50%, -50%) scale(1.08); }
  }

  .sp-petal {
    position: absolute;
    top: -32px;
    width: 11px;
    height: 16px;
    border-radius: 85% 0 85% 0;
    background: linear-gradient(145deg, rgba(252, 224, 214, 0.72), rgba(226, 148, 158, 0.32));
    opacity: 0;
    animation: spDrift 14s linear infinite;
  }
  .sp-petal.p1 { left: 14%; animation-duration: 14s; animation-delay: 0s; }
  .sp-petal.p2 { left: 32%; animation-duration: 16.5s; animation-delay: 2.6s; width: 9px; height: 13px; }
  .sp-petal.p3 { left: 54%; animation-duration: 13.2s; animation-delay: 5.1s; width: 12px; height: 17px; }
  .sp-petal.p4 { left: 73%; animation-duration: 15s; animation-delay: 1.4s; width: 10px; height: 14px; }
  .sp-petal.p5 { left: 88%; animation-duration: 17s; animation-delay: 3.9s; }
  @keyframes spDrift {
    0% { transform: translate3d(0, -10px, 0) rotate(0deg); opacity: 0; }
    12% { opacity: 0.62; }
    50% { transform: translate3d(28px, 50vh, 0) rotate(140deg); opacity: 0.45; }
    88% { opacity: 0.28; }
    100% { transform: translate3d(-16px, 108vh, 0) rotate(270deg); opacity: 0; }
  }
  .sp-mote {
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 232, 178, 0.98), rgba(235, 192, 114, 0));
    animation: spTwinkle 4.4s ease-in-out infinite;
  }
  .sp-mote.m1 { left: 20%; top: 26%; width: 5px; height: 5px; }
  .sp-mote.m2 { left: 76%; top: 22%; animation-delay: 1.2s; width: 6px; height: 6px; }
  .sp-mote.m3 { left: 26%; top: 74%; animation-delay: 2.3s; }
  .sp-mote.m4 { left: 78%; top: 70%; animation-delay: 0.8s; width: 5px; height: 5px; }
  .sp-mote.m5 { left: 48%; top: 18%; animation-delay: 2.8s; }
  .sp-mote.m6 { left: 56%; top: 82%; animation-delay: 1.7s; }
  @keyframes spTwinkle {
    0%, 100% { opacity: 0.2; transform: scale(0.75); }
    50% { opacity: 0.95; transform: scale(1.55); }
  }

  /* 鎏金礼盒外框 */
  .splash-frame {
    position: absolute;
    inset: 20px;
    z-index: 7;
    pointer-events: none;
    border: 1px solid rgba(236, 204, 144, 0.24);
    transition: opacity 0.55s ease, transform 0.72s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .splash-frame::before {
    content: "";
    position: absolute;
    inset: 6px;
    border: 1px solid rgba(236, 204, 144, 0.11);
  }
  .splash-corner {
    position: absolute;
    width: 20px;
    height: 20px;
    border-color: rgba(242, 212, 158, 0.62);
    border-style: solid;
    border-width: 0;
  }
  .splash-corner.tl { top: -1px; left: -1px; border-top-width: 1.5px; border-left-width: 1.5px; }
  .splash-corner.tr { top: -1px; right: -1px; border-top-width: 1.5px; border-right-width: 1.5px; }
  .splash-corner.bl { bottom: -1px; left: -1px; border-bottom-width: 1.5px; border-left-width: 1.5px; }
  .splash-corner.br { bottom: -1px; right: -1px; border-bottom-width: 1.5px; border-right-width: 1.5px; }
  .splash.is-wings-open .splash-frame {
    opacity: 0;
    transform: scale(1.03);
  }

  /* 贯穿全屏的香槟真丝缎带（严格居中 50%） */
  .splash-ribbon {
    position: absolute;
    top: 50%;
    height: 18px;
    width: 50%;
    z-index: 8;
    transform: translateY(-50%);
    pointer-events: none;
    background: linear-gradient(
      180deg,
      rgba(248, 224, 174, 0.18) 0%,
      rgba(226, 188, 126, 0.52) 22%,
      rgba(255, 240, 206, 0.84) 50%,
      rgba(204, 162, 98, 0.58) 78%,
      rgba(128, 72, 42, 0.22) 100%
    );
    box-shadow: 0 6px 18px rgba(24, 4, 7, 0.34);
    transition: transform 0.72s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.52s ease;
  }
  .splash-ribbon::before,
  .splash-ribbon::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    background: rgba(255, 242, 212, 0.55);
  }
  .splash-ribbon::before { top: 2px; }
  .splash-ribbon::after { bottom: 2px; opacity: 0.35; }
  .splash-ribbon.is-l { left: 0; }
  .splash-ribbon.is-r { right: 0; }
  .splash.is-unsealing .splash-ribbon.is-l {
    transform: translate3d(-100%, -50%, 0);
    opacity: 0;
  }
  .splash.is-unsealing .splash-ribbon.is-r {
    transform: translate3d(100%, -50%, 0);
    opacity: 0;
  }

  /* 顶部右上角跳过按钮 */
  .splash-skip {
    position: absolute;
    top: 30px;
    right: 32px;
    z-index: 12;
    border: 1px solid rgba(242, 212, 158, 0.36);
    background: rgba(48, 8, 14, 0.42);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: rgba(248, 232, 204, 0.84);
    font: inherit;
    font-size: 12px;
    letter-spacing: 0.18em;
    padding: 6px 15px;
    border-radius: 999px;
    cursor: pointer;
    transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease, opacity 0.4s ease;
  }
  .splash-skip:hover {
    background: rgba(88, 18, 26, 0.78);
    border-color: rgba(248, 224, 174, 0.72);
    color: #fff6e6;
  }
  .splash-skip:focus-visible {
    outline: 2px solid #f5d89e;
    outline-offset: 2px;
  }
  .splash.is-unsealing .splash-skip,
  .splash.is-wings-open .splash-skip {
    opacity: 0;
    pointer-events: none;
  }

  /* 中央主视觉：火漆印严格锁死视口 (50%, 50%) 与丝带、拱线精准交汇 */
  .splash-center {
    position: absolute;
    inset: 0;
    z-index: 10;
    pointer-events: none;
  }
  .splash-crown {
    position: absolute;
    left: 50%;
    bottom: calc(50% + 112px);
    width: min(560px, calc(100% - 48px));
    text-align: center;
    opacity: 0;
    transform: translate3d(-50%, 14px, 0);
    animation: spCrownIn 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.12s forwards;
  }
  .splash.is-unsealing .splash-crown {
    animation: spCrownOut 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  @keyframes spCrownIn {
    to { opacity: 1; transform: translate3d(-50%, 0, 0); }
  }
  @keyframes spCrownOut {
    from { opacity: 1; transform: translate3d(-50%, 0, 0); }
    to { opacity: 0; transform: translate3d(-50%, -18px, 0); }
  }
  @keyframes spCueIn {
    to { opacity: 1; transform: translate3d(-50%, 0, 0); }
  }
  @keyframes spCueOut {
    from { opacity: 1; transform: translate3d(-50%, 0, 0); }
    to { opacity: 0; transform: translate3d(-50%, 14px, 0); }
  }
  .splash-en {
    margin: 0 0 12px;
    font-size: 11px;
    letter-spacing: 0.48em;
    text-indent: 0.48em;
    color: rgba(240, 212, 160, 0.7);
  }
  .splash-brand {
    margin: 0;
    font-family: "Songti SC", "STSong", "Noto Serif SC", serif;
    font-size: clamp(32px, 5vw, 48px);
    font-weight: 500;
    letter-spacing: 0.38em;
    text-indent: 0.38em;
    color: #fbf1df;
    text-shadow: 0 6px 26px rgba(24, 3, 6, 0.46);
  }
  .splash-tagline {
    margin: 12px 0 0;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-family: "Songti SC", "STSong", "Noto Serif SC", serif;
    font-size: 13px;
    letter-spacing: 0.34em;
    text-indent: 0.34em;
    color: rgba(244, 218, 172, 0.82);
  }
  .splash-tagline i {
    display: block;
    width: 24px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(244, 218, 172, 0.65), transparent);
  }

  /* 中心珠宝感火漆印按钮（严格居中于 50%, 50%） */
  .seal-stage {
    position: absolute;
    left: 50%;
    top: 50%;
    display: grid;
    place-items: center;
    pointer-events: auto;
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.86);
    animation: spSealIn 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.28s forwards;
  }
  @keyframes spSealIn {
    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
  /* 缓慢旋转鎏金细珠光环 */
  .seal-orbit {
    position: absolute;
    width: 172px;
    height: 172px;
    border-radius: 50%;
    border: 1px dashed rgba(244, 218, 168, 0.38);
    pointer-events: none;
    animation: sealSpin 32s linear infinite;
    transition: opacity 0.42s ease, transform 0.55s ease;
  }
  .seal-orbit::before {
    content: "";
    position: absolute;
    inset: -12px;
    border-radius: 50%;
    border: 1px solid rgba(244, 218, 168, 0.16);
  }
  @keyframes sealSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .splash.is-unsealing .seal-orbit {
    opacity: 0;
    transform: scale(1.3);
  }
  .seal-halo {
    position: absolute;
    width: 152px;
    height: 152px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 232, 184, 0.34) 0%, rgba(255, 218, 152, 0.08) 54%, transparent 72%);
    pointer-events: none;
    animation: sealBreathe 3s ease-in-out infinite;
  }
  @keyframes sealBreathe {
    0%, 100% { transform: scale(0.95); opacity: 0.65; }
    50% { transform: scale(1.12); opacity: 1; }
  }
  .splash.is-unsealing .seal-halo {
    animation: none;
    opacity: 0;
  }
  .seal-burst {
    position: absolute;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    border: 1.5px solid rgba(252, 226, 168, 0.92);
    box-shadow: 0 0 32px rgba(252, 220, 152, 0.6);
    transform: scale(0.65);
    opacity: 0;
    pointer-events: none;
  }
  .splash.is-unsealing .seal-burst {
    animation: sealRipple 0.88s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  @keyframes sealRipple {
    0% { transform: scale(0.8); opacity: 0.95; }
    100% { transform: scale(2.8); opacity: 0; }
  }
  .env-seal {
    position: relative;
    width: 134px;
    height: 134px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    display: grid;
    place-items: center;
    border-radius: 50%;
    transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.45s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .env-seal:hover {
    transform: scale(1.07);
  }
  .env-seal:active {
    transform: scale(0.94);
  }
  .env-seal:focus-visible {
    outline: 2px solid #f5d89e;
    outline-offset: 8px;
  }
  .env-seal-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    pointer-events: none;
    filter: drop-shadow(0 16px 28px rgba(24, 4, 7, 0.56)) drop-shadow(0 4px 10px rgba(24, 4, 7, 0.36));
    transition: filter 0.38s ease;
  }
  .env-seal:hover .env-seal-img {
    filter: drop-shadow(0 20px 34px rgba(24, 4, 7, 0.64)) drop-shadow(0 0 18px rgba(248, 222, 168, 0.32));
  }
  .splash.is-unsealing .env-seal {
    transform: translate3d(0, -20px, 0) scale(1.2);
    opacity: 0;
    pointer-events: none;
  }

  /* 底部启封指引（对称位于火漆印下方） */
  .splash-cue {
    position: absolute;
    left: 50%;
    top: calc(50% + 124px);
    display: inline-flex;
    align-items: center;
    gap: 12px;
    white-space: nowrap;
    font-family: "Songti SC", "STSong", "Noto Serif SC", serif;
    font-size: 13px;
    letter-spacing: 0.34em;
    color: rgba(246, 226, 188, 0.88);
    opacity: 0;
    transform: translate3d(-50%, 12px, 0);
    animation: spCueIn 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.42s forwards;
  }
  .splash-cue-dot {
    color: #f3d08b;
    font-size: 10px;
    animation: spPulseCue 2.4s ease-in-out infinite;
  }
  @keyframes spPulseCue {
    0%, 100% { opacity: 0.35; }
    50% { opacity: 1; }
  }
  .splash.is-unsealing .splash-cue {
    animation: spCueOut 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  /* ===== 官网层层递进显影 ===== */
  html.is-sealed .rv-hero,
  html.is-sealed .rv-scroll {
    opacity: 0;
    transform: translate3d(0, 24px, 0);
    will-change: transform, opacity;
  }
  html.is-sealed header.nav.rv-hero {
    transform: translate3d(0, -14px, 0);
  }
  html.is-sealed .fab.rv-hero {
    transform: translate3d(0, 14px, 0) scale(0.9);
  }
  html.is-revealed .rv-hero {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
    transition:
      opacity 0.85s cubic-bezier(0.22, 1, 0.36, 1) var(--d, 0ms),
      transform 0.92s cubic-bezier(0.22, 1, 0.36, 1) var(--d, 0ms);
  }
  html.is-revealed .rv-scroll {
    opacity: 0;
    transform: translate3d(0, 24px, 0);
    transition:
      opacity 0.78s cubic-bezier(0.22, 1, 0.36, 1) var(--d, 0ms),
      transform 0.84s cubic-bezier(0.22, 1, 0.36, 1) var(--d, 0ms);
  }
  html.is-revealed .rv-scroll.is-in {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }

  .replay-splash {
    border: 0;
    background: transparent;
    color: var(--gold);
    font: inherit;
    font-size: 13px;
    padding: 0 4px;
    margin-left: 8px;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .replay-splash:hover { color: var(--red); }

  /* 官网浪漫背景音乐悬浮唱片按钮 */
  .bgm-fab {
    position: fixed;
    left: 16px;
    bottom: 16px;
    z-index: 30;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid rgba(166, 132, 86, 0.38);
    background: rgba(255, 250, 244, 0.9);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    color: var(--ink);
    font: inherit;
    font-size: 13px;
    border-radius: 999px;
    padding: 8px 14px 8px 8px;
    cursor: pointer;
    box-shadow: 0 10px 24px rgba(60, 36, 34, 0.12);
    transition: border-color 0.25s ease, color 0.25s ease, transform 0.25s ease, opacity 0.5s ease;
  }
  .bgm-fab:hover {
    border-color: rgba(139, 30, 30, 0.45);
    color: var(--red);
  }
  .bgm-fab:focus-visible {
    outline: 2px solid var(--red);
    outline-offset: 2px;
  }
  .bgm-disc {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: radial-gradient(circle at 35% 30%, #a5242b, #6f1419);
    color: #f6ddb0;
    font-size: 13px;
    line-height: 1;
    box-shadow: inset 0 0 0 1px rgba(244, 218, 168, 0.45);
  }
  .bgm-fab.is-playing .bgm-disc {
    animation: bgmSpin 7s linear infinite;
  }
  @keyframes bgmSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .bgm-fab.is-muted .bgm-disc {
    background: #d8c8b8;
    color: #7c685c;
    box-shadow: none;
  }
  .bgm-label {
    font-family: "Songti SC", "STSong", "Noto Serif SC", serif;
    letter-spacing: 0.12em;
  }

  /* ===== 开屏与官网丰富动效增强 ===== */
  /* 1) 开屏：暗金花枝与双拱线如画笔徐徐勾勒 */
  .wing-ornament path {
    stroke-dasharray: 1200;
    stroke-dashoffset: 1200;
    animation: goldDraw 1.9s cubic-bezier(0.22, 1, 0.36, 1) 0.15s forwards;
  }
  .wing-floral path {
    stroke-dasharray: 460;
    stroke-dashoffset: 460;
    animation: goldDraw 2.1s cubic-bezier(0.22, 1, 0.36, 1) 0.35s forwards;
  }
  .wing-floral circle {
    opacity: 0;
    transform-box: fill-box;
    transform-origin: center;
    animation: blossomPop 0.9s cubic-bezier(0.22, 1, 0.36, 1) 1.25s forwards;
  }
  @keyframes goldDraw {
    to { stroke-dashoffset: 0; }
  }
  @keyframes blossomPop {
    from { opacity: 0; transform: scale(0.2); }
    to { opacity: 1; transform: scale(1); }
  }

  /* 2) 开屏：丝绒斜向暖金流光掠过 + 鼠标烛光跟随 */
  .splash-sheen {
    position: absolute;
    inset: -20%;
    z-index: 6;
    pointer-events: none;
    background: linear-gradient(112deg, transparent 36%, rgba(255, 232, 186, 0.08) 48%, rgba(255, 240, 204, 0.14) 50%, rgba(255, 232, 186, 0.07) 52%, transparent 64%);
    transform: translate3d(-70%, 0, 0);
    animation: velvetSweep 7.6s ease-in-out 1s infinite;
  }
  @keyframes velvetSweep {
    0%, 24% { transform: translate3d(-75%, 0, 0); opacity: 0; }
    38% { opacity: 1; }
    64% { transform: translate3d(75%, 0, 0); opacity: 0.85; }
    72%, 100% { transform: translate3d(75%, 0, 0); opacity: 0; }
  }
  .splash.is-wings-open .splash-sheen {
    opacity: 0;
    animation: none;
  }
  .splash-pointer {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 360px;
    height: 360px;
    margin: -180px 0 0 -180px;
    border-radius: 50%;
    z-index: 6;
    pointer-events: none;
    background: radial-gradient(circle, rgba(255, 224, 168, 0.18) 0%, rgba(244, 176, 152, 0.07) 42%, transparent 72%);
    opacity: 0;
    transition: opacity 0.55s ease;
    will-change: transform;
  }
  .splash.has-pointer .splash-pointer { opacity: 1; }
  .splash.is-wings-open .splash-pointer { opacity: 0; }

  /* 3) 开屏：更多 3D 旋落花瓣 & 上升流金微尘 */
  .sp-petal.p6 { left: 6%; animation-duration: 15.2s; animation-delay: 1.8s; width: 10px; height: 14px; }
  .sp-petal.p7 { left: 23%; animation-duration: 13.8s; animation-delay: 6.4s; width: 13px; height: 18px; }
  .sp-petal.p8 { left: 63%; animation-duration: 16.2s; animation-delay: 3.1s; width: 9px; height: 13px; }
  .sp-petal.p9 { left: 80%; animation-duration: 12.6s; animation-delay: 7.2s; width: 11px; height: 15px; }
  .sp-petal.p10 { left: 93%; animation-duration: 15.8s; animation-delay: 0.9s; width: 8px; height: 12px; }
  @keyframes spDrift {
    0% { transform: translate3d(0, -14px, 0) rotateX(0deg) rotateY(0deg) rotateZ(0deg); opacity: 0; }
    12% { opacity: 0.72; }
    35% { transform: translate3d(34px, 34vh, 0) rotateX(110deg) rotateY(65deg) rotateZ(95deg); opacity: 0.56; }
    70% { transform: translate3d(-24px, 72vh, 0) rotateX(230deg) rotateY(150deg) rotateZ(205deg); opacity: 0.42; }
    100% { transform: translate3d(20px, 108vh, 0) rotateX(340deg) rotateY(220deg) rotateZ(310deg); opacity: 0; }
  }
  .sp-rise {
    position: absolute;
    bottom: -12px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: radial-gradient(circle, #fff0c2 0%, rgba(242, 198, 120, 0.5) 55%, transparent 100%);
    opacity: 0;
    animation: spFloatUp 10s linear infinite;
  }
  .sp-rise.r1 { left: 16%; animation-duration: 9.5s; animation-delay: 0s; width: 5px; height: 5px; }
  .sp-rise.r2 { left: 29%; animation-duration: 11.4s; animation-delay: 2.2s; }
  .sp-rise.r3 { left: 42%; animation-duration: 8.8s; animation-delay: 4.1s; width: 6px; height: 6px; }
  .sp-rise.r4 { left: 58%; animation-duration: 10.6s; animation-delay: 1.3s; }
  .sp-rise.r5 { left: 72%; animation-duration: 12s; animation-delay: 3.4s; width: 5px; height: 5px; }
  .sp-rise.r6 { left: 85%; animation-duration: 9.2s; animation-delay: 5.2s; }
  @keyframes spFloatUp {
    0% { transform: translate3d(0, 0, 0) scale(0.6); opacity: 0; }
    18% { opacity: 0.85; }
    50% { transform: translate3d(18px, -48vh, 0) scale(1.15); opacity: 0.65; }
    85% { opacity: 0.28; }
    100% { transform: translate3d(-14px, -96vh, 0) scale(0.4); opacity: 0; }
  }

  /* 4) 破印双环涟漪 + 18 颗金粉星芒粒子 + 3D 门扉透视对开 + 素绢红印落章 */
  .seal-burst-2 {
    position: absolute;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    border: 1px solid rgba(255, 236, 196, 0.72);
    transform: scale(0.65);
    opacity: 0;
    pointer-events: none;
  }
  .splash.is-unsealing .seal-burst-2 {
    animation: sealRipple 1.08s cubic-bezier(0.16, 1, 0.3, 1) 0.16s forwards;
  }
  .seal-sparks {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .seal-spark {
    position: absolute;
    left: 50%;
    top: 50%;
    width: var(--sz, 6px);
    height: var(--sz, 6px);
    margin-left: calc(var(--sz, 6px) * -0.5);
    margin-top: calc(var(--sz, 6px) * -0.5);
    border-radius: var(--rad, 50%);
    background: var(--col, #ffe8b0);
    box-shadow: 0 0 10px rgba(255, 224, 152, 0.85);
    animation: sparkFly var(--dur, 0.9s) cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  @keyframes sparkFly {
    0% { transform: translate3d(0, 0, 0) scale(0.4) rotate(0deg); opacity: 1; }
    65% { opacity: 0.92; }
    100% { transform: translate3d(var(--tx), var(--ty), 0) scale(0.15) rotate(var(--rot, 160deg)); opacity: 0; }
  }
  .splash { perspective: 1500px; }
  .splash-wing.is-left { transform-origin: left center; }
  .splash-wing.is-right { transform-origin: right center; }
  .splash.is-wings-open .splash-wing.is-left {
    transform: translate3d(-104%, 0, 0) rotateY(14deg);
  }
  .splash.is-wings-open .splash-wing.is-right {
    transform: translate3d(104%, 0, 0) rotateY(-14deg);
  }
  .vellum-mark {
    transform: scale(1.28);
    opacity: 0;
    transition: transform 0.68s cubic-bezier(0.22, 1, 0.36, 1) 0.28s, opacity 0.52s ease 0.28s;
  }
  .splash.is-wings-open .vellum-mark {
    transform: scale(1);
    opacity: 1;
  }

  /* 5) 官网阅读流金进度条 & 全局轻盈氛围光斑/花瓣 */
  .nav-progress {
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1px;
    height: 2px;
    background: linear-gradient(90deg, var(--red), #d4a65a, #e8b4be);
    transform-origin: left center;
    transform: scaleX(0);
    pointer-events: none;
    transition: transform 0.08s linear;
  }
  .page-ambient {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }
  main, footer { position: relative; z-index: 1; }
  header.nav { z-index: 20; }
  .pa-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(64px);
    opacity: 0.42;
    animation: paFloat 16s ease-in-out infinite;
  }
  .pa-orb.o1 { width: 420px; height: 420px; left: -100px; top: 8%; background: radial-gradient(circle, rgba(226, 164, 174, 0.42), transparent 70%); }
  .pa-orb.o2 { width: 380px; height: 380px; right: -80px; top: 44%; background: radial-gradient(circle, rgba(214, 180, 126, 0.36), transparent 70%); animation-delay: 5s; animation-duration: 19s; }
  @keyframes paFloat {
    0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
    50% { transform: translate3d(24px, -28px, 0) scale(1.08); }
  }
  .pa-petal {
    position: absolute;
    top: -24px;
    width: 9px;
    height: 13px;
    border-radius: 85% 0 85% 0;
    background: linear-gradient(145deg, rgba(236, 178, 190, 0.55), rgba(214, 166, 120, 0.25));
    opacity: 0;
    animation: paDrift 20s linear infinite;
  }
  .pa-petal.pp1 { left: 9%; animation-duration: 19s; }
  .pa-petal.pp2 { left: 34%; animation-duration: 23s; animation-delay: 4s; width: 8px; height: 11px; }
  .pa-petal.pp3 { left: 68%; animation-duration: 21s; animation-delay: 8s; }
  .pa-petal.pp4 { left: 89%; animation-duration: 24s; animation-delay: 12s; width: 10px; height: 14px; }
  @keyframes paDrift {
    0% { transform: translate3d(0, -10px, 0) rotate(0deg); opacity: 0; }
    10% { opacity: 0.45; }
    50% { transform: translate3d(38px, 50vh, 0) rotate(145deg); opacity: 0.32; }
    90% { opacity: 0.2; }
    100% { transform: translate3d(-20px, 106vh, 0) rotate(280deg); opacity: 0; }
  }

  /* 6) 导航链接、按钮流光、卡片与步骤微交互 */
  .brand img { transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1); }
  .brand:hover img { transform: rotate(-10deg) scale(1.06); }
  .nav-links a { position: relative; padding: 4px 0; transition: color 0.25s ease; }
  .nav-links a::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1.5px;
    background: linear-gradient(90deg, var(--red), var(--gold));
    transform: scaleX(0);
    transform-origin: center;
    transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .nav-links a:hover::after { transform: scaleX(1); }
  .nav-ask, .btn {
    position: relative;
    overflow: hidden;
    transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.28s ease, background 0.25s ease, color 0.25s ease;
  }
  .nav-ask::after, .btn:not(.ghost)::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(115deg, transparent 30%, rgba(255, 245, 224, 0.34) 50%, transparent 70%);
    transform: translateX(-120%);
    transition: transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .nav-ask:hover::after, .btn:not(.ghost):hover::after { transform: translateX(120%); }
  .nav-ask:hover, .btn:hover { transform: translateY(-2px); box-shadow: 0 10px 22px rgba(139, 30, 30, 0.2); }
  .btn.ghost:hover { background: rgba(139, 30, 30, 0.05); box-shadow: inset 0 0 0 1px var(--red), 0 8px 18px rgba(139, 30, 30, 0.1); }
  .nav-ask:active, .btn:active { transform: translateY(0) scale(0.97); }

  .hero .kicker { display: inline-flex; align-items: center; gap: 10px; }
  .hero .kicker::before {
    content: "";
    display: inline-block;
    width: 28px;
    height: 1px;
    background: linear-gradient(90deg, var(--red), var(--gold));
    transform-origin: left center;
    transform: scaleX(0);
    transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.28s;
  }
  html.is-revealed .hero .kicker::before,
  html:not(.is-sealed) .hero .kicker::before { transform: scaleX(1); }

  .node {
    transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
  }
  .node:hover { transform: translateX(5px); }
  .node.is-on { transform: translateX(6px); }
  .detail { transition: border-color 0.35s ease, box-shadow 0.35s ease; }
  .detail.is-swap h3,
  .detail.is-swap p {
    animation: detailSwap 0.42s cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes detailSwap {
    from { opacity: 0; transform: translate3d(0, 8px, 0); }
    to { opacity: 1; transform: translate3d(0, 0, 0); }
  }

  .card {
    position: relative;
    overflow: hidden;
    transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s ease, box-shadow 0.34s ease;
  }
  .card::before {
    content: "";
    position: absolute;
    left: 18px;
    right: 18px;
    top: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--gold), var(--red), transparent);
    opacity: 0;
    transform: scaleX(0.3);
    transition: opacity 0.35s ease, transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .card:hover {
    transform: translateY(-6px);
    border-color: rgba(166, 132, 86, 0.55);
    box-shadow: 0 18px 36px -14px rgba(108, 42, 36, 0.14);
  }
  .card:hover::before { opacity: 1; transform: scaleX(1); }
  .card .ix { display: inline-block; transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), color 0.3s ease; }
  .card:hover .ix { transform: translateX(4px); color: var(--red); }

  .step {
    transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s ease, box-shadow 0.34s ease;
  }
  .step:hover {
    transform: translateY(-5px);
    border-color: rgba(166, 132, 86, 0.55);
    box-shadow: 0 16px 32px -14px rgba(108, 42, 36, 0.14);
  }
  .step b { transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), background 0.3s ease, color 0.3s ease, box-shadow 0.3s ease; }
  .step:hover b { transform: scale(1.1); background: var(--red); color: #fffaf4; box-shadow: 0 6px 18px rgba(139, 30, 30, 0.26); }

  .kefu-card { transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.34s ease; }
  .kefu-card:hover { transform: translateY(-4px); box-shadow: 0 18px 40px -12px rgba(108, 42, 36, 0.14); }

  /* 7) 悬浮问小囍脉冲光环 & 丝滑聊天弹窗展开 */
  .fab { transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.28s ease; }
  .fab::before {
    content: "";
    position: absolute;
    inset: -4px;
    border-radius: 999px;
    border: 1.5px solid rgba(139, 30, 30, 0.36);
    opacity: 0;
    pointer-events: none;
    animation: fabPing 3.8s ease-out infinite;
  }
  @keyframes fabPing {
    0% { transform: scale(0.95); opacity: 0.7; }
    60% { transform: scale(1.14, 1.32); opacity: 0; }
    100% { opacity: 0; }
  }
  .fab:hover { transform: translateY(-3px) scale(1.03); box-shadow: 0 14px 28px rgba(139, 30, 30, 0.3); }
  .chat {
    display: flex;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translate3d(0, 16px, 0) scale(0.96);
    transform-origin: bottom right;
    transition: opacity 0.28s ease, transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), visibility 0.28s ease;
  }
  .chat.is-open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translate3d(0, 0, 0) scale(1);
  }
  .msg { animation: msgIn 0.28s cubic-bezier(0.22, 1, 0.36, 1); }
  @keyframes msgIn {
    from { opacity: 0; transform: translate3d(0, 8px, 0) scale(0.98); }
    to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }
  .chip { transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease; }
  .chip:hover { transform: translateY(-1px); background: #fff6f4; border-color: rgba(139, 30, 30, 0.36); }

  /* 8) 五套颜色主题全系动态特效 + 滑动切换指示滑块与方向切卡动效 */
  .look-index {
    position: relative;
    user-select: none;
    -webkit-user-select: none;
    touch-action: pan-y;
  }
  .look-slider {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 52px;
    z-index: 0;
    pointer-events: none;
    background: var(--slider-bg, #fff1f5);
    transition: transform 0.36s cubic-bezier(0.22, 1, 0.36, 1), width 0.36s cubic-bezier(0.22, 1, 0.36, 1), background 0.32s ease;
  }
  .look-slider::after {
    content: "";
    position: absolute;
    left: 10px;
    right: 10px;
    bottom: 0;
    height: 3px;
    border-radius: 3px 3px 0 0;
    background: var(--slider-bar, #d4567c);
    transition: background 0.32s ease;
  }
  .look-item {
    position: relative;
    z-index: 1;
    background: transparent !important;
    transition: opacity 0.25s ease, transform 0.25s ease;
  }
  .look-item.is-on { opacity: 1; }
  .look-sheet {
    touch-action: pan-y;
    user-select: none;
    -webkit-user-select: none;
    cursor: grab;
  }
  .look-sheet.is-dragging { cursor: grabbing; }
  .look-sheet.is-dragging .theme-paper { transition: none; }
  .look-mark { transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.45s ease, color 0.35s ease; }
  .theme-paper { transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.36s ease, box-shadow 0.4s ease; }
  .look-sheet.is-flipping.is-next .theme-paper {
    animation: cardSlideNext 0.48s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .look-sheet.is-flipping.is-prev .theme-paper {
    animation: cardSlidePrev 0.48s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .look-sheet.is-flipping.is-next .look-mark {
    animation: markGlideNext 0.56s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .look-sheet.is-flipping.is-prev .look-mark {
    animation: markGlidePrev 0.56s cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes cardSlideNext {
    0% { opacity: 0.35; transform: translate3d(42px, 0, 0) scale(0.96); }
    100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }
  @keyframes cardSlidePrev {
    0% { opacity: 0.35; transform: translate3d(-42px, 0, 0) scale(0.96); }
    100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }
  @keyframes markGlideNext {
    0% { opacity: 0; transform: translate3d(34px, 8px, 0) scale(0.92); }
    100% { opacity: 0.09; transform: translate3d(0, 0, 0) scale(1); }
  }
  @keyframes markGlidePrev {
    0% { opacity: 0; transform: translate3d(-34px, 8px, 0) scale(0.92); }
    100% { opacity: 0.09; transform: translate3d(0, 0, 0) scale(1); }
  }
  .look-dots {
    position: absolute;
    left: 50%;
    bottom: 18px;
    transform: translateX(-50%);
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .look-dot {
    width: 7px;
    height: 7px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: var(--p);
    opacity: 0.28;
    cursor: pointer;
    transition: width 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease, background 0.3s ease;
  }
  .look-dot.is-on {
    width: 22px;
    opacity: 0.85;
  }
  @media (max-width: 720px) {
    .look-index { overflow: hidden; }
    .look-item { flex: 1; width: auto; padding: 14px 4px; }
  }
  .splash-center { transition: transform 0.28s ease-out; will-change: transform; }
  .is-chinese .petal {
    display: block; position: absolute; bottom: -16px; width: 8px; height: 8px; border-radius: 50%;
    background: radial-gradient(circle, #d49632 0%, rgba(196, 138, 48, 0.72) 55%, transparent 100%);
    box-shadow: 0 0 8px rgba(212, 150, 50, 0.45);
    opacity: 0; pointer-events: none;
    animation-name: goldRise; animation-duration: 7.5s; animation-timing-function: ease-in-out; animation-iteration-count: infinite;
  }
  .is-french .petal {
    display: block; position: absolute; bottom: -20px; width: 18px; height: 18px; border-radius: 50%;
    background: radial-gradient(circle, rgba(224, 174, 96, 0.65), rgba(231, 201, 138, 0.22) 65%, transparent 100%);
    filter: blur(0.6px); opacity: 0; pointer-events: none;
    animation-name: goldRise; animation-duration: 9s; animation-timing-function: ease-in-out; animation-iteration-count: infinite;
  }
  .is-forest .petal {
    display: block; position: absolute; top: -24px; width: 13px; height: 18px; border-radius: 90% 0 90% 0;
    background: linear-gradient(135deg, rgba(134, 239, 172, 0.78), rgba(22, 101, 52, 0.32));
    opacity: 0.78; pointer-events: none;
    animation-name: fall; animation-duration: 11s; animation-timing-function: linear; animation-iteration-count: infinite;
  }
  .look-sheet .petal:nth-child(1) { left: 8%; animation-delay: 0s; animation-duration: 8.2s; }
  .look-sheet .petal:nth-child(2) { left: 28%; animation-delay: 1.5s; animation-duration: 9.4s; }
  .look-sheet .petal:nth-child(3) { left: 52%; animation-delay: 3s; animation-duration: 10.8s; }
  .look-sheet .petal:nth-child(4) { left: 70%; animation-delay: 0.6s; animation-duration: 8.8s; }
  .look-sheet .petal:nth-child(5) { left: 86%; animation-delay: 2.4s; animation-duration: 10s; }
  .look-sheet .petal:nth-child(6) { left: 18%; animation-delay: 4.1s; animation-duration: 9.6s; }
  .look-sheet .petal:nth-child(7) { left: 42%; animation-delay: 1.9s; animation-duration: 8.6s; }
  .look-sheet .petal:nth-child(8) { left: 61%; animation-delay: 5.2s; animation-duration: 10.4s; }
  .look-sheet .petal:nth-child(9) { left: 92%; animation-delay: 3.4s; animation-duration: 9.2s; }
  .is-minimal::after {
    content: "";
    position: absolute;
    inset: -30%;
    pointer-events: none;
    background: linear-gradient(118deg, transparent 40%, rgba(255, 255, 255, 0.72) 50%, transparent 60%);
    animation: galleryBeam 6.5s ease-in-out infinite;
  }
  @keyframes goldRise {
    0% { transform: translate3d(0, 0, 0) scale(0.5); opacity: 0; }
    20% { opacity: 0.85; }
    75% { opacity: 0.55; }
    100% { transform: translate3d(20px, -460px, 0) scale(1.25); opacity: 0; }
  }
  @keyframes galleryBeam {
    0%, 20% { transform: translateX(-70%); opacity: 0; }
    45% { opacity: 1; }
    75%, 100% { transform: translateX(70%); opacity: 0; }
  }

  /* 9) 顶部导航栏「小程序码」入口（悬浮预览 + 点击放大扫码弹窗） */
  .nav-qr-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
  }
  .nav-qr {
    border: 1px solid rgba(166, 132, 86, 0.52);
    background: linear-gradient(135deg, #fffdf9, #fff5e9);
    color: var(--red);
    border-radius: 999px;
    padding: 7px 14px;
    font: inherit;
    font-size: 13px;
    letter-spacing: 0.04em;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(139, 30, 30, 0.06);
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
  }
  .nav-qr:hover {
    transform: translateY(-1.5px);
    border-color: var(--red);
    background: #fff8f2;
    box-shadow: 0 8px 18px rgba(139, 30, 30, 0.14);
  }
  .nav-qr:focus-visible {
    outline: 2px solid var(--red);
    outline-offset: 2px;
  }
  .nav-qr-ic { flex: none; opacity: 0.88; }
  .nav-qr-pop {
    position: absolute;
    top: calc(100% + 12px);
    right: 0;
    width: 192px;
    padding: 16px 14px 13px;
    border-radius: 20px;
    background: linear-gradient(165deg, #fffdf9, #fff5eb);
    border: 1px solid rgba(196, 161, 90, 0.45);
    box-shadow: 0 18px 42px rgba(44, 24, 22, 0.18);
    text-align: center;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translate3d(0, 8px, 0) scale(0.96);
    transform-origin: top right;
    transition: opacity 0.24s ease, transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), visibility 0.24s ease;
    z-index: 35;
  }
  .nav-qr-pop img {
    width: 148px;
    height: 148px;
    display: block;
    margin: 0 auto 8px;
    padding: 7px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 6px 18px rgba(139, 30, 30, 0.1), 0 0 0 1px rgba(196, 161, 90, 0.36);
  }
  .nav-qr-pop span {
    display: block;
    font-size: 12px;
    color: var(--muted);
    letter-spacing: 0.04em;
  }
  @media (hover: hover) and (pointer: fine) {
    .nav-qr-wrap:hover .nav-qr-pop {
      opacity: 1;
      visibility: visible;
      transform: translate3d(0, 0, 0) scale(1);
    }
  }
  .qr-modal {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(36, 10, 14, 0.56);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.28s ease, visibility 0.28s ease;
  }
  .qr-modal.is-open {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
  .qr-modal-box {
    position: relative;
    width: min(350px, 100%);
    padding: 32px 28px 26px;
    text-align: center;
    border-radius: 28px;
    background: linear-gradient(165deg, #fffdf9, #fff5eb);
    border: 1px solid rgba(196, 161, 90, 0.45);
    box-shadow: 0 28px 70px rgba(24, 6, 8, 0.34);
    transform: translate3d(0, 16px, 0) scale(0.95);
    transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .qr-modal.is-open .qr-modal-box {
    transform: translate3d(0, 0, 0) scale(1);
  }
  .qr-modal-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 50%;
    background: rgba(139, 30, 30, 0.08);
    color: var(--red);
    font: inherit;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.2s ease;
  }
  .qr-modal-close:hover { background: rgba(139, 30, 30, 0.16); transform: scale(1.06); }
  .qr-modal-img {
    width: 244px;
    height: 244px;
    margin: 4px auto 16px;
    padding: 12px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 12px 30px rgba(139, 30, 30, 0.12), 0 0 0 1px rgba(196, 161, 90, 0.4);
    display: block;
  }
  .qr-modal-box h3 { margin: 0 0 6px; font-size: 22px; letter-spacing: 0.1em; color: var(--ink); }
  .qr-modal-box p { margin: 0; font-size: 13px; color: var(--muted); }

  @media (max-width: 720px) {
    .nav-inner { flex-wrap: nowrap; gap: 8px; padding: 10px 0; }
    .brand { gap: 7px; }
    .brand img { width: 32px; height: 32px; }
    .brand span { font-size: 17px; white-space: nowrap; }
    .nav-links { gap: 8px; flex-wrap: nowrap; }
    .nav-qr, .nav-ask { padding: 6px 11px; font-size: 12px; }
    .splash-frame { inset: 12px; }
    .splash-skip { top: 20px; right: 20px; padding: 5px 12px; }
    .wing-verse { display: none; }
    .wing-floral { width: min(220px, 56vw); }
    .wing-floral.is-tl { top: 18px; left: 16px; }
    .wing-floral.is-br { bottom: 18px; right: 16px; }
    .splash-crown { bottom: calc(50% + 96px); }
    .splash-cue { top: calc(50% + 106px); font-size: 12px; letter-spacing: 0.28em; }
    .env-seal { width: 114px; height: 114px; }
    .seal-orbit { width: 148px; height: 148px; }
    .seal-halo { width: 130px; height: 130px; }
    .splash-ribbon { height: 14px; }
    .vellum-card { padding: 42px 22px 36px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sp-petal, .sp-mote, .sp-rise, .sp-bokeh, .splash-sheen, .seal-halo, .seal-orbit, .splash-cue-dot,
    .pa-orb, .pa-petal, .fab::before, .bgm-fab.is-playing .bgm-disc, .is-minimal::after { animation: none !important; }
    .wing-ornament path, .wing-floral path { stroke-dashoffset: 0 !important; animation: none !important; }
    .wing-floral circle { opacity: 1 !important; animation: none !important; }
    .splash-crown, .seal-stage, .splash-cue, .wing-verse { animation: none !important; opacity: 1 !important; }
    .splash-crown { transform: translate3d(-50%, 0, 0) !important; }
    .seal-stage { transform: translate(-50%, -50%) !important; }
    .splash-cue { transform: translate3d(-50%, 0, 0) !important; }
    .splash-wing, .splash-vellum, .vellum-card, .vellum-rule, .vellum-mark, .splash-ribbon, .env-seal,
    html.is-revealed .rv-hero, html.is-revealed .rv-scroll {
      transition-duration: 0.01ms !important;
      transition-delay: 0ms !important;
    }
  }
</style>
</head>
<body>
<div class="page-ambient" aria-hidden="true">
  <span class="pa-orb o1"></span>
  <span class="pa-orb o2"></span>
  <span class="pa-petal pp1"></span>
  <span class="pa-petal pp2"></span>
  <span class="pa-petal pp3"></span>
  <span class="pa-petal pp4"></span>
</div>

<div class="splash" id="splash" role="dialog" aria-modal="true" aria-label="有囍請柬开屏">
  <!-- 第二层：透光晨曦素绢衬页 -->
  <div class="splash-vellum" aria-hidden="true">
    <div class="vellum-card">
      <div class="vellum-mark">囍</div>
      <p class="vellum-kicker">WEDDING INVITATION</p>
      <p class="vellum-title">有囍請柬</p>
      <div class="vellum-rule"></div>
      <p class="vellum-note">良辰已备 · 恭迎启阅</p>
    </div>
  </div>

  <!-- 第一层：全屏绯绒丝缎对开双翼 -->
  <div class="splash-wing is-left" aria-hidden="true">
    <svg class="wing-ornament" viewBox="0 0 640 800" preserveAspectRatio="none">
      <path d="M640,0 Q568,210 640,400 Q568,590 640,800" fill="none" stroke="rgba(244,218,168,0.28)" stroke-width="1.2"/>
      <path d="M626,0 Q550,210 626,400 Q550,590 626,800" fill="none" stroke="rgba(244,218,168,0.12)" stroke-width="0.9"/>
    </svg>
    <svg class="wing-floral is-tl" viewBox="0 0 360 220" preserveAspectRatio="xMinYMin meet">
      <defs>
        <linearGradient id="goldFoilL" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f7dfb0" stop-opacity="0.58"/>
          <stop offset="55%" stop-color="#d8ae68" stop-opacity="0.32"/>
          <stop offset="100%" stop-color="#f7dfb0" stop-opacity="0.1"/>
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#goldFoilL)" stroke-width="1.15" stroke-linecap="round">
        <path d="M0,78 C64,66 132,102 204,82 C250,69 292,44 342,54"/>
        <path d="M98,84 C132,122 182,146 238,140"/>
        <path d="M180,86 C206,54 238,28 280,16"/>
        <circle cx="208" cy="80" r="7"/>
        <circle cx="208" cy="80" r="2" fill="#f7dfb0" opacity="0.5"/>
        <circle cx="280" cy="16" r="5"/>
        <circle cx="238" cy="140" r="5.5"/>
        <circle cx="340" cy="54" r="4"/>
        <path d="M138,112 Q152,99 164,112 Q150,123 138,112 Z"/>
        <path d="M248,60 Q262,48 272,60 Q258,72 248,60 Z"/>
      </g>
    </svg>
    <div class="wing-verse"><i></i><span>一纸红笺 · 见字如晤</span><i></i></div>
  </div>

  <div class="splash-wing is-right" aria-hidden="true">
    <svg class="wing-ornament" viewBox="0 0 640 800" preserveAspectRatio="none">
      <path d="M0,0 Q72,210 0,400 Q72,590 0,800" fill="none" stroke="rgba(244,218,168,0.28)" stroke-width="1.2"/>
      <path d="M14,0 Q90,210 14,400 Q90,590 14,800" fill="none" stroke="rgba(244,218,168,0.12)" stroke-width="0.9"/>
    </svg>
    <svg class="wing-floral is-br" viewBox="0 0 360 220" preserveAspectRatio="xMaxYMax meet">
      <defs>
        <linearGradient id="goldFoilR" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#f7dfb0" stop-opacity="0.58"/>
          <stop offset="55%" stop-color="#d8ae68" stop-opacity="0.32"/>
          <stop offset="100%" stop-color="#f7dfb0" stop-opacity="0.1"/>
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#goldFoilR)" stroke-width="1.15" stroke-linecap="round">
        <path d="M360,142 C296,154 228,118 156,138 C110,151 68,176 18,166"/>
        <path d="M262,136 C228,98 178,74 122,80"/>
        <path d="M180,134 C154,166 122,192 80,204"/>
        <circle cx="152" cy="140" r="7"/>
        <circle cx="152" cy="140" r="2" fill="#f7dfb0" opacity="0.5"/>
        <circle cx="80" cy="204" r="5"/>
        <circle cx="122" cy="80" r="5.5"/>
        <circle cx="20" cy="166" r="4"/>
        <path d="M222,108 Q208,121 196,108 Q210,97 222,108 Z"/>
        <path d="M112,160 Q98,172 88,160 Q102,148 112,160 Z"/>
      </g>
    </svg>
    <div class="wing-verse"><i></i><span>佳期如梦 · 共赴良辰</span><i></i></div>
  </div>

  <!-- 丝绒暖金流光 & 指针烛光 -->
  <div class="splash-sheen" aria-hidden="true"></div>
  <div class="splash-pointer" id="splash-pointer" aria-hidden="true"></div>

  <!-- 氛围柔光、旋落花瓣与上升流金微尘 -->
  <div class="splash-ambient" aria-hidden="true">
    <span class="sp-bokeh b1"></span>
    <span class="sp-bokeh b2"></span>
    <span class="sp-bokeh b3"></span>
    <span class="sp-petal p1"></span>
    <span class="sp-petal p2"></span>
    <span class="sp-petal p3"></span>
    <span class="sp-petal p4"></span>
    <span class="sp-petal p5"></span>
    <span class="sp-petal p6"></span>
    <span class="sp-petal p7"></span>
    <span class="sp-petal p8"></span>
    <span class="sp-petal p9"></span>
    <span class="sp-petal p10"></span>
    <span class="sp-mote m1"></span>
    <span class="sp-mote m2"></span>
    <span class="sp-mote m3"></span>
    <span class="sp-mote m4"></span>
    <span class="sp-mote m5"></span>
    <span class="sp-mote m6"></span>
    <span class="sp-rise r1"></span>
    <span class="sp-rise r2"></span>
    <span class="sp-rise r3"></span>
    <span class="sp-rise r4"></span>
    <span class="sp-rise r5"></span>
    <span class="sp-rise r6"></span>
  </div>

  <!-- 鎏金双细框 -->
  <div class="splash-frame" aria-hidden="true">
    <span class="splash-corner tl"></span>
    <span class="splash-corner tr"></span>
    <span class="splash-corner bl"></span>
    <span class="splash-corner br"></span>
  </div>

  <!-- 贯穿香槟金真丝缎带 -->
  <span class="splash-ribbon is-l" aria-hidden="true"></span>
  <span class="splash-ribbon is-r" aria-hidden="true"></span>

  <button class="splash-skip" type="button" id="splash-skip">跳过启封</button>

  <!-- 中央主视觉 -->
  <div class="splash-center" id="splash-center">
    <div class="splash-crown">
      <p class="splash-en">WEDDING INVITATION</p>
      <p class="splash-brand">有囍請柬</p>
      <p class="splash-tagline"><i></i><span>一纸红笺 · 敬邀雅鉴</span><i></i></p>
    </div>

    <div class="seal-stage">
      <span class="seal-orbit" aria-hidden="true"></span>
      <span class="seal-halo" aria-hidden="true"></span>
      <span class="seal-burst" aria-hidden="true"></span>
      <span class="seal-burst-2" aria-hidden="true"></span>
      <div class="seal-sparks" id="seal-sparks" aria-hidden="true"></div>
      <button class="env-seal" type="button" id="wax-seal-btn" aria-label="轻触火漆印，启封有囍請柬官网">
        <img class="env-seal-img" src="/brand/wax-seal.png" alt="" draggable="false">
      </button>
    </div>

    <div class="splash-cue">
      <span class="splash-cue-dot">✦</span>
      <span>轻触火漆印 · 启封官网</span>
      <span class="splash-cue-dot">✦</span>
    </div>
  </div>
</div>

<a class="skip" href="#flow">跳到使用流程</a>
<header class="nav rv-hero" style="--d:0ms">
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
      <div class="nav-qr-wrap">
        <button class="nav-qr open-qr-modal" type="button" aria-label="查看有囍請柬微信小程序码">
          <svg class="nav-qr-ic" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1.2"/>
            <rect x="14" y="3" width="7" height="7" rx="1.2"/>
            <rect x="3" y="14" width="7" height="7" rx="1.2"/>
            <path d="M14 14h3v3h-3zM20 14v3M14 20h6"/>
          </svg>
          <span>小程序码</span>
        </button>
        <div class="nav-qr-pop" aria-hidden="true">
          <img src="/brand/miniprogram-qr.png" width="148" height="148" alt="">
          <span>微信扫一扫 · 打开小程序</span>
        </div>
      </div>
      <button class="nav-ask" type="button" id="open-chat">问小囍</button>
    </nav>
  </div>
  <div class="nav-progress" id="scroll-progress" aria-hidden="true"></div>
</header>

<main class="wrap">
  <section class="hero">
    <div>
      <p class="kicker rv-hero" style="--d:110ms">微信小程序 · 婚礼请柬</p>
      <h1 class="rv-hero" style="--d:220ms">有囍請柬</h1>
      <p class="lede rv-hero" style="--d:340ms">一对新人一张喜帖。亲友扫码启封，看日子、故事和照片，确认来不来，再留下一句祝福。这个网页是官网，喜帖在小程序里打开。</p>
      <div class="hero-actions rv-hero" style="--d:460ms">
        <a class="btn" href="#flow">看使用流程</a>
        <a class="btn ghost" href="#kefu">联系客服</a>
      </div>
    </div>
  </section>

  <section id="themes">
    <div class="section-head rv-hero" style="--d:560ms">
      <h2>颜色可以换</h2>
      <p>五套颜色写在喜帖旁边。划过名字或左右滑动喜帖，即可切换配色与专属氛围动效。</p>
    </div>
    <div class="lookbook rv-hero" style="--d:680ms">
      <div class="look-index" id="theme-picks">
        <span class="look-slider" id="theme-slider" aria-hidden="true"></span>
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
        <span class="petal"></span><span class="petal"></span><span class="petal"></span><span class="petal"></span><span class="petal"></span><span class="petal"></span><span class="petal"></span><span class="petal"></span><span class="petal"></span>
        <div class="look-mark" id="theme-symbol" aria-hidden="true">樱</div>
        <div class="theme-paper" id="theme-paper">
          <p class="theme-kicker">有囍請柬</p>
          <h3 id="theme-name">樱花 · 春日粉黛</h3>
          <p id="theme-line">粉瓣轻落，春风十里</p>
          <div class="theme-rule"></div>
          <div class="theme-couple">新郎 <b>&</b> 新娘</div>
          <p class="theme-date">敬备喜酌 · 恭请光临</p>
        </div>
        <div class="look-dots" id="theme-dots" aria-label="主题切换指示点">
          <button class="look-dot is-on" type="button" data-idx="0" aria-label="樱花"></button>
          <button class="look-dot" type="button" data-idx="1" aria-label="新中式"></button>
          <button class="look-dot" type="button" data-idx="2" aria-label="法式"></button>
          <button class="look-dot" type="button" data-idx="3" aria-label="森系"></button>
          <button class="look-dot" type="button" data-idx="4" aria-label="轻奢"></button>
        </div>
      </div>
    </div>
  </section>

  <section id="flow">
    <div class="section-head rv-scroll" style="--d:0ms">
      <h2>一张喜帖，两条路</h2>
      <p>一条给新人，一条给宾客。点任意一步，看这一步实际发生什么。</p>
    </div>
    <div class="flow-start rv-scroll" style="--d:80ms">
      <div>
        <strong>打开有囍請柬</strong>
        <span>没有婚礼码时，小程序只显示介绍；扫到哪一场，就进入那一场。</span>
      </div>
    </div>

    <div class="lane lane-couple rv-scroll" style="--d:140ms">
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

    <div class="lane lane-guest rv-scroll" style="--d:220ms">
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

    <div class="detail rv-scroll" id="flow-detail" style="--d:280ms">
      <p class="detail-kicker" id="detail-kicker">新人 · 第 1 步</p>
      <h3 id="detail-title">开通这场婚礼</h3>
      <p id="detail-body">平台为你们单独建一场婚礼。之后的照片、回执、祝福和宾客留下的称呼，都只属于这一场。</p>
    </div>
    <p class="note rv-scroll" style="--d:340ms">一个小程序可以同时招待很多场婚礼。同一位亲友参加两场，两边的回执和祝福互不影响。</p>
  </section>

  <section id="inside">
    <div class="section-head rv-scroll" style="--d:0ms">
      <h2>请柬里的六件事</h2>
      <p>宾客扫码之后，小程序底部就是这些入口。故事写在「岁月印记」里，会出现在故事页和相册页。</p>
    </div>
    <div class="grid">
      <article class="card rv-scroll" style="--d:60ms"><div class="ix">01</div><h3>火漆请柬</h3><p>开屏是一封信封。轻触火漆印展开邀请信，首页按婚礼日期倒计时，背景音乐可以关掉。</p></article>
      <article class="card rv-scroll" style="--d:130ms"><div class="ix">02</div><h3>岁月印记</h3><p>把相遇、相知写成一段段纪事。保存之后，宾客在「我们相遇的故事」里按时间读到。</p></article>
      <article class="card rv-scroll" style="--d:200ms"><div class="ix">03</div><h3>婚纱相册</h3><p>照片在管理里上传，宾客在相册页翻看。带婚礼标识的网页链接，打开的是这场婚礼的照片墙。</p></article>
      <article class="card rv-scroll" style="--d:270ms"><div class="ix">04</div><h3>盛典日程</h3><p>当天的环节按时间排开。酒店和地址写好之后，宾客可以地图导航，也可以一键拨打电话。</p></article>
      <article class="card rv-scroll" style="--d:340ms"><div class="ix">05</div><h3>出席回执</h3><p>宾客选择出席或请假，填上称呼和同行人数，也可以附一句祝福。管理里能看到名单和人数。</p></article>
      <article class="card rv-scroll" style="--d:410ms"><div class="ix">06</div><h3>祝福墙</h3><p>亲友的寄语变成弹幕。同一句话不会重复刷上墙。</p></article>
    </div>
  </section>

  <section id="start">
    <div class="section-head rv-scroll" style="--d:0ms">
      <h2>新人从这里开始</h2>
      <p>最短的路径就这三步。细一点的顺序，就是上面那条新人流程。</p>
    </div>
    <div class="steps">
      <article class="step rv-scroll" style="--d:80ms"><b>01</b><div><h3>开通一场婚礼</h3><p>告诉平台两个人的名字和日子。我们为这场婚礼单独建档，和其他场次隔开。</p></div></article>
      <article class="step rv-scroll" style="--d:180ms"><b>02</b><div><h3>写成你们的喜帖</h3><p>姓名、吉日、酒店、行程、故事和照片，都写进这一场。小程序首页长按新人姓名，进入管理。</p></div></article>
      <article class="step rv-scroll" style="--d:280ms"><b>03</b><div><h3>把码发给亲友</h3><p>生成这场婚礼的小程序码，发到亲友群。他们扫码就能看请柬、回执、祝福。</p></div></article>
    </div>
  </section>

  <section id="kefu">
    <div class="section-head rv-scroll" style="--d:0ms">
      <h2>联系客服</h2>
      <p>加微信即可咨询开通、发票或使用上的问题。用微信扫描二维码，或复制微信号添加。</p>
    </div>
    <div class="kefu-card rv-scroll" style="--d:120ms">
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

<div class="qr-modal" id="qr-modal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="qr-modal-title">
  <div class="qr-modal-box">
    <button class="qr-modal-close" type="button" id="qr-modal-close" aria-label="关闭二维码弹窗">×</button>
    <img class="qr-modal-img" src="/brand/miniprogram-qr.png" width="244" height="244" alt="有囍請柬微信小程序码">
    <h3 id="qr-modal-title">有囍請柬小程序</h3>
    <p>打开微信扫一扫，立即进入小程序体验请柬</p>
  </div>
</div>

<footer>
  <div class="wrap">有囍請柬 · 微信婚礼请柬。完整喜帖在小程序里打开。<button class="replay-splash" type="button" id="replay-splash">重温启封</button></div>
` + icpFooterHtml + `
</footer>

<audio id="site-bgm" src="/brand/bgm.mp3" loop preload="metadata"></audio>

<button class="bgm-fab rv-hero is-muted" style="--d:840ms" type="button" id="bgm-fab" aria-pressed="false" aria-label="播放或暂停背景音乐 红笺良辰">
  <span class="bgm-disc" aria-hidden="true">♫</span>
  <span class="bgm-label" id="bgm-label">红笺良辰</span>
</button>

<button class="fab rv-hero" style="--d:800ms" type="button" id="chat-fab" aria-expanded="false" aria-controls="chat-panel">
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
  var root = document.documentElement;
  var splash = document.getElementById("splash");
  var splashCenter = document.getElementById("splash-center");
  var splashPointer = document.getElementById("splash-pointer");
  var sealSparks = document.getElementById("seal-sparks");
  var scrollProgress = document.getElementById("scroll-progress");
  var sealBtn = document.getElementById("wax-seal-btn");
  var skipBtn = document.getElementById("splash-skip");
  var replayBtn = document.getElementById("replay-splash");
  var bgmEl = document.getElementById("site-bgm");
  var bgmFab = document.getElementById("bgm-fab");
  var bgmLabel = document.getElementById("bgm-label");
  var bgmFadeTimer = null;
  var splashTimers = [];
  var splashBusy = false;
  var scrollObserver = null;
  var progressRaf = 0;
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;

  function syncBgmUi(playing) {
    if (!bgmFab) return;
    bgmFab.classList.toggle("is-playing", !!playing);
    bgmFab.classList.toggle("is-muted", !playing);
    bgmFab.setAttribute("aria-pressed", playing ? "true" : "false");
    if (bgmLabel) bgmLabel.textContent = playing ? "红笺良辰" : "开启音乐";
  }
  function startBgm(fadeIn) {
    if (!bgmEl) return;
    if (bgmFadeTimer) { clearInterval(bgmFadeTimer); bgmFadeTimer = null; }
    var targetVol = 0.55;
    try {
      bgmEl.volume = fadeIn ? 0.04 : targetVol;
      var p = bgmEl.play();
      if (p && typeof p.then === "function") {
        p.then(function () {
          syncBgmUi(true);
          if (fadeIn) {
            bgmFadeTimer = setInterval(function () {
              if (!bgmEl || bgmEl.paused) { clearInterval(bgmFadeTimer); bgmFadeTimer = null; return; }
              var next = Math.min(targetVol, bgmEl.volume + 0.04);
              bgmEl.volume = next;
              if (next >= targetVol) { clearInterval(bgmFadeTimer); bgmFadeTimer = null; }
            }, 90);
          }
        }).catch(function () {
          syncBgmUi(false);
        });
      } else {
        syncBgmUi(true);
      }
    } catch (e) {
      syncBgmUi(false);
    }
  }
  function pauseBgm() {
    if (!bgmEl) return;
    if (bgmFadeTimer) { clearInterval(bgmFadeTimer); bgmFadeTimer = null; }
    try { bgmEl.pause(); } catch (e) {}
    syncBgmUi(false);
  }
  if (bgmFab) {
    bgmFab.addEventListener("click", function () {
      if (bgmEl && !bgmEl.paused) pauseBgm();
      else startBgm(false);
    });
  }
  if (bgmEl) {
    bgmEl.addEventListener("pause", function () { syncBgmUi(false); });
    bgmEl.addEventListener("play", function () { syncBgmUi(true); });
  }

  function clearSplashTimers() {
    for (var i = 0; i < splashTimers.length; i++) clearTimeout(splashTimers[i]);
    splashTimers = [];
  }
  function after(ms, fn) {
    splashTimers.push(setTimeout(fn, ms));
  }
  function resetSplashPointer() {
    if (splash) splash.classList.remove("has-pointer");
    if (splashCenter) splashCenter.style.transform = "";
  }
  function spawnSealSparks() {
    if (!sealSparks || reducedMotion) return;
    sealSparks.innerHTML = "";
    var colors = ["#fff3d0", "#f4d48e", "#e8b4be", "#ffe4a8", "#f7c7b8"];
    var count = 18;
    for (var i = 0; i < count; i++) {
      var sp = document.createElement("span");
      sp.className = "seal-spark";
      var angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.28;
      var dist = 76 + Math.random() * 96;
      var tx = Math.cos(angle) * dist;
      var ty = Math.sin(angle) * dist;
      var isPetal = i % 3 === 0;
      var sz = isPetal ? (8 + Math.random() * 5) : (4.5 + Math.random() * 4.5);
      var dur = 0.78 + Math.random() * 0.44;
      var rot = (Math.random() > 0.5 ? 1 : -1) * (110 + Math.random() * 140);
      sp.style.setProperty("--tx", tx.toFixed(1) + "px");
      sp.style.setProperty("--ty", ty.toFixed(1) + "px");
      sp.style.setProperty("--sz", sz.toFixed(1) + "px");
      sp.style.setProperty("--rad", isPetal ? "85% 0 85% 0" : "50%");
      sp.style.setProperty("--col", colors[i % colors.length]);
      sp.style.setProperty("--dur", dur.toFixed(2) + "s");
      sp.style.setProperty("--rot", rot.toFixed(0) + "deg");
      sealSparks.appendChild(sp);
    }
    after(1350, function () {
      if (sealSparks) sealSparks.innerHTML = "";
    });
  }
  function updateScrollProgress() {
    progressRaf = 0;
    if (!scrollProgress) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var pct = max > 0 ? Math.min(1, Math.max(0, window.pageYOffset / max)) : 0;
    scrollProgress.style.transform = "scaleX(" + pct.toFixed(4) + ")";
  }
  function scheduleScrollProgress() {
    if (!scrollProgress || progressRaf) return;
    progressRaf = window.requestAnimationFrame ? window.requestAnimationFrame(updateScrollProgress) : (updateScrollProgress(), 0);
  }
  function revealAllIn(scope) {
    var list = (scope || document).querySelectorAll(".rv-scroll");
    for (var i = 0; i < list.length; i++) list[i].classList.add("is-in");
  }
  function startScrollReveal() {
    var items = document.querySelectorAll(".rv-scroll");
    if (!items.length) return;
    if (scrollObserver) {
      scrollObserver.disconnect();
      scrollObserver = null;
    }
    if (reducedMotion || typeof IntersectionObserver === "undefined") {
      revealAllIn(document);
      return;
    }
    scrollObserver = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add("is-in");
          scrollObserver.unobserve(entries[i].target);
        }
      }
    }, { threshold: 0.06, rootMargin: "0px 0px -6% 0px" });
    for (var j = 0; j < items.length; j++) {
      scrollObserver.observe(items[j]);
    }
  }
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
    revealAllIn(target);
    var nav = document.querySelector("header.nav");
    var offset = nav ? nav.getBoundingClientRect().height : 0;
    var y = window.pageYOffset + target.getBoundingClientRect().top - offset;
    if (y < 0) y = 0;
    window.scrollTo({ left: 0, top: y, behavior: "auto" });
  }
  function enterSiteNow() {
    root.classList.remove("is-sealed");
    root.classList.add("is-revealed");
    syncNavOffset();
    startScrollReveal();
    updateScrollProgress();
  }
  function unsealSplash() {
    if (!splash || splashBusy) return;
    splashBusy = true;
    clearSplashTimers();
    resetSplashPointer();
    startBgm(true);
    if (reducedMotion) {
      enterSiteNow();
      splash.className = "splash is-gone";
      splashBusy = false;
      return;
    }
    splash.classList.add("is-active", "is-unsealing");
    spawnSealSparks();
    after(260, function () {
      splash.classList.add("is-wings-open");
    });
    after(1240, function () {
      splash.classList.add("is-vellum-out");
    });
    after(1380, function () {
      enterSiteNow();
    });
    after(2240, function () {
      splash.className = "splash is-gone";
      splashBusy = false;
    });
  }
  function skipSplash() {
    if (!splash || splashBusy) return;
    splashBusy = true;
    clearSplashTimers();
    resetSplashPointer();
    if (reducedMotion) {
      enterSiteNow();
      splash.className = "splash is-gone";
      splashBusy = false;
      return;
    }
    splash.classList.add("is-active", "is-unsealing", "is-wings-open", "is-vellum-out");
    after(140, function () {
      enterSiteNow();
    });
    after(1040, function () {
      splash.className = "splash is-gone";
      splashBusy = false;
    });
  }
  function replaySplash() {
    if (!splash) return;
    clearSplashTimers();
    resetSplashPointer();
    if (sealSparks) sealSparks.innerHTML = "";
    splashBusy = false;
    window.scrollTo({ left: 0, top: 0, behavior: "auto" });
    updateScrollProgress();
    var list = document.querySelectorAll(".rv-scroll");
    for (var i = 0; i < list.length; i++) list[i].classList.remove("is-in");
    if (scrollObserver) {
      scrollObserver.disconnect();
      scrollObserver = null;
    }
    root.classList.remove("is-revealed");
    root.classList.add("is-sealed");
    splash.className = "splash is-active";
    if (sealBtn) sealBtn.focus();
  }

  if (splash && finePointer && !reducedMotion) {
    splash.addEventListener("mousemove", function (e) {
      if (splashBusy || !root.classList.contains("is-sealed")) return;
      var w = window.innerWidth || 1;
      var h = window.innerHeight || 1;
      var dx = e.clientX - w * 0.5;
      var dy = e.clientY - h * 0.5;
      splash.classList.add("has-pointer");
      if (splashPointer) {
        splashPointer.style.transform = "translate3d(" + dx.toFixed(1) + "px, " + dy.toFixed(1) + "px, 0)";
      }
      if (splashCenter) {
        var px = (dx / w) * 12;
        var py = (dy / h) * 10;
        splashCenter.style.transform = "translate3d(" + px.toFixed(1) + "px, " + py.toFixed(1) + "px, 0)";
      }
    });
    splash.addEventListener("mouseleave", resetSplashPointer);
  }

  if (sealBtn) sealBtn.addEventListener("click", unsealSplash);
  if (skipBtn) skipBtn.addEventListener("click", skipSplash);
  if (replayBtn) replayBtn.addEventListener("click", replaySplash);

  if (!root.classList.contains("is-sealed") && splash) {
    splash.className = "splash is-gone";
  }

  document.documentElement.style.scrollBehavior = "auto";
  syncNavOffset();
  scrollToCurrentHash();
  updateScrollProgress();
  window.addEventListener("scroll", scheduleScrollProgress, { passive: true });
  window.addEventListener("resize", function () {
    syncNavOffset();
    scrollToCurrentHash();
    scheduleScrollProgress();
  });
  window.addEventListener("hashchange", function () {
    if (root.classList.contains("is-sealed")) {
      clearSplashTimers();
      splashBusy = false;
      enterSiteNow();
      if (splash) splash.className = "splash is-gone";
    }
    scrollToCurrentHash();
    scheduleScrollProgress();
  });
  window.addEventListener("load", function () {
    syncNavOffset();
    scrollToCurrentHash();
    updateScrollProgress();
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

  var flowDetail = document.getElementById("flow-detail");
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
    if (flowDetail && !reducedMotion) {
      flowDetail.classList.remove("is-swap");
      void flowDetail.offsetWidth;
      flowDetail.classList.add("is-swap");
    }
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

  var qrModal = document.getElementById("qr-modal");
  var qrCloseBtn = document.getElementById("qr-modal-close");
  var qrOpenBtns = document.querySelectorAll(".open-qr-modal");
  function openQrModal() {
    if (!qrModal) return;
    qrModal.classList.add("is-open");
    qrModal.setAttribute("aria-hidden", "false");
    if (qrCloseBtn) qrCloseBtn.focus();
  }
  function closeQrModal() {
    if (!qrModal) return;
    qrModal.classList.remove("is-open");
    qrModal.setAttribute("aria-hidden", "true");
  }
  for (var q = 0; q < qrOpenBtns.length; q++) {
    qrOpenBtns[q].addEventListener("click", openQrModal);
  }
  if (qrCloseBtn) qrCloseBtn.addEventListener("click", closeQrModal);
  if (qrModal) {
    qrModal.addEventListener("click", function (e) {
      if (e.target === qrModal) closeQrModal();
    });
  }

  fab.addEventListener("click", function () {
    if (panel.className.indexOf("is-open") >= 0) closeChat();
    else openChat();
  });
  document.getElementById("chat-close").addEventListener("click", closeChat);
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (root.classList.contains("is-sealed")) skipSplash();
    else if (qrModal && qrModal.classList.contains("is-open")) closeQrModal();
    else if (panel.className.indexOf("is-open") >= 0) closeChat();
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
  var themePaper = document.getElementById("theme-paper");
  var picksWrap = document.getElementById("theme-picks");
  var themeSlider = document.getElementById("theme-slider");
  var picks = document.querySelectorAll(".look-item");
  var themeDots = document.querySelectorAll(".look-dot");
  var activeThemeIdx = 0;

  function syncThemeSlider(btn, instant) {
    if (!themeSlider || !btn) return;
    if (instant) themeSlider.style.transition = "none";
    themeSlider.style.width = btn.offsetWidth + "px";
    themeSlider.style.transform = "translate3d(" + btn.offsetLeft + "px, 0, 0)";
    themeSlider.style.setProperty("--slider-bg", btn.getAttribute("data-bg") || "#fff1f5");
    themeSlider.style.setProperty("--slider-bar", btn.getAttribute("data-primary") || "#d4567c");
    if (instant) {
      void themeSlider.offsetWidth;
      themeSlider.style.transition = "";
    }
  }

  function paintThemeByIndex(idx, dirOverride) {
    if (!stage || !picks.length) return;
    var nextIdx = ((idx % picks.length) + picks.length) % picks.length;
    var btn = picks[nextIdx];
    if (!btn) return;
    if (nextIdx === activeThemeIdx) {
      syncThemeSlider(btn, false);
      return;
    }
    var dir = dirOverride || (nextIdx > activeThemeIdx ? 1 : -1);
    activeThemeIdx = nextIdx;
    var tid = btn.getAttribute("data-id") || "sakura";
    stage.style.setProperty("--p", btn.getAttribute("data-primary"));
    stage.style.setProperty("--a", btn.getAttribute("data-accent"));
    stage.style.setProperty("--bg", btn.getAttribute("data-bg"));
    stage.style.setProperty("--ink", btn.getAttribute("data-ink"));
    stage.style.setProperty("--petal", btn.getAttribute("data-petal"));
    stage.className = "look-sheet is-" + tid;
    document.getElementById("theme-symbol").textContent = btn.getAttribute("data-symbol");
    document.getElementById("theme-name").textContent = btn.getAttribute("data-name");
    document.getElementById("theme-line").textContent = btn.getAttribute("data-line");
    if (!reducedMotion) {
      void stage.offsetWidth;
      stage.className = "look-sheet is-" + tid + " is-flipping " + (dir > 0 ? "is-next" : "is-prev");
    }
    for (var i = 0; i < picks.length; i++) picks[i].className = i === nextIdx ? "look-item is-on" : "look-item";
    for (var d = 0; d < themeDots.length; d++) themeDots[d].className = d === nextIdx ? "look-dot is-on" : "look-dot";
    syncThemeSlider(btn, false);
  }

  function pickIndexAtX(clientX) {
    if (!picksWrap || !picks.length) return -1;
    var rect = picksWrap.getBoundingClientRect();
    if (!rect.width) return -1;
    var rel = (clientX - rect.left) / rect.width;
    var idx = Math.floor(rel * picks.length);
    if (idx < 0) idx = 0;
    if (idx >= picks.length) idx = picks.length - 1;
    return idx;
  }

  for (var t = 0; t < picks.length; t++) {
    (function (idx) {
      picks[idx].addEventListener("click", function () { paintThemeByIndex(idx); });
      if (finePointer) {
        picks[idx].addEventListener("mouseenter", function () { paintThemeByIndex(idx); });
      }
    })(t);
  }
  for (var td = 0; td < themeDots.length; td++) {
    (function (idx) {
      themeDots[idx].addEventListener("click", function (e) {
        e.stopPropagation();
        paintThemeByIndex(idx);
      });
    })(td);
  }

  // 在色卡条上按住左右滑动连续切换
  if (picksWrap) {
    var pickTouch = { active: false, sx: 0, sy: 0, horiz: false };
    picksWrap.addEventListener("touchstart", function (e) {
      if (!e.touches || !e.touches.length) return;
      pickTouch.active = true;
      pickTouch.sx = e.touches[0].clientX;
      pickTouch.sy = e.touches[0].clientY;
      pickTouch.horiz = false;
      var i0 = pickIndexAtX(pickTouch.sx);
      if (i0 >= 0) paintThemeByIndex(i0);
    }, { passive: true });
    picksWrap.addEventListener("touchmove", function (e) {
      if (!pickTouch.active || !e.touches || !e.touches.length) return;
      var cx = e.touches[0].clientX;
      var cy = e.touches[0].clientY;
      if (!pickTouch.horiz) {
        if (Math.abs(cx - pickTouch.sx) > Math.abs(cy - pickTouch.sy) && Math.abs(cx - pickTouch.sx) > 6) {
          pickTouch.horiz = true;
        } else if (Math.abs(cy - pickTouch.sy) > 10) {
          pickTouch.active = false;
          return;
        }
      }
      if (pickTouch.horiz) {
        var idx = pickIndexAtX(cx);
        if (idx >= 0) paintThemeByIndex(idx);
      }
    }, { passive: true });
    picksWrap.addEventListener("touchend", function () { pickTouch.active = false; }, { passive: true });
  }

  // 在喜帖展示区左右滑动 / 鼠标拖拽切换上下一套主题
  if (stage) {
    var swipe = { down: false, sx: 0, sy: 0, dx: 0, horiz: false };
    function swipeStart(x, y) {
      swipe.down = true;
      swipe.sx = x;
      swipe.sy = y;
      swipe.dx = 0;
      swipe.horiz = false;
    }
    function swipeMove(x, y) {
      if (!swipe.down) return;
      var dx = x - swipe.sx;
      var dy = y - swipe.sy;
      if (!swipe.horiz) {
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
          swipe.horiz = true;
          stage.classList.add("is-dragging");
        } else if (Math.abs(dy) > 12) {
          swipe.down = false;
          return;
        }
      }
      if (swipe.horiz) {
        swipe.dx = dx;
        if (themePaper && !reducedMotion) {
          var drag = Math.max(-56, Math.min(56, dx * 0.28));
          themePaper.style.transform = "translate3d(" + drag.toFixed(1) + "px, 0, 0)";
        }
      }
    }
    function swipeEnd() {
      if (!swipe.down) return;
      var dx = swipe.dx;
      var wasHoriz = swipe.horiz;
      swipe.down = false;
      swipe.horiz = false;
      stage.classList.remove("is-dragging");
      if (themePaper) themePaper.style.transform = "";
      if (wasHoriz && Math.abs(dx) > 36) {
        if (dx < 0) paintThemeByIndex(activeThemeIdx + 1, 1);
        else paintThemeByIndex(activeThemeIdx - 1, -1);
      }
    }
    stage.addEventListener("touchstart", function (e) {
      if (e.touches && e.touches.length) swipeStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    stage.addEventListener("touchmove", function (e) {
      if (e.touches && e.touches.length) swipeMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    stage.addEventListener("touchend", swipeEnd, { passive: true });
    stage.addEventListener("touchcancel", swipeEnd, { passive: true });
    stage.addEventListener("mousedown", function (e) {
      if (e.button === 0) swipeStart(e.clientX, e.clientY);
    });
    window.addEventListener("mousemove", function (e) {
      if (swipe.down) swipeMove(e.clientX, e.clientY);
    });
    window.addEventListener("mouseup", swipeEnd);
  }

  if (picks.length) {
    syncThemeSlider(picks[0], true);
    window.addEventListener("resize", function () { syncThemeSlider(picks[activeThemeIdx], true); });
    window.addEventListener("load", function () { syncThemeSlider(picks[activeThemeIdx], true); });
  }
})();
</script>
</body>
</html>`
