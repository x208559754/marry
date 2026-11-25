// 婚宴现场抽奖大屏（投影 / 电视浏览器全屏打开）：/lottery?wid=xxx 或 /l/xxx
// 由小程序管理后台「现场抽奖」控制；本页通过 WebSocket /api/lottery/ws 接收推送（连不上时回退为轮询 GET /api/lottery），不参与抽人。
// 注意：这是模板字符串，内嵌脚本里不要用反引号和 ${}
export const lotteryPage = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#5a1114">
<meta name="robots" content="noindex">
<title>幸运抽奖 · 有囍請柬</title>
<link rel="icon" href="/brand/mark.png">
<style>
  :root {
    --serif: "Songti SC", "STSong", "Noto Serif SC", "Noto Serif CJK SC", "Source Han Serif SC", "SimSun", serif;
    --sans: "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif;
  }
  /* ---------- 主题 ---------- */
  body, body[data-theme="red"] {
    --bg: radial-gradient(ellipse 70% 60% at 50% 42%, rgba(186, 48, 48, 0.55), transparent 70%),
          radial-gradient(ellipse at 50% 120%, rgba(217, 184, 118, 0.16), transparent 55%),
          linear-gradient(160deg, #6e1417 0%, #4a0c0f 55%, #2c0608 100%);
    --pattern: radial-gradient(circle at 50% 50%, rgba(217, 184, 118, 0.07) 1.5px, transparent 2px);
    --pattern-size: 4.2vmin 4.2vmin;
    --ink: #fbf3e4; --ink-2: rgba(251, 243, 228, 0.72); --muted: rgba(243, 226, 184, 0.45);
    --accent: #d9b876; --accent-soft: #f3e2b8; --accent-dim: rgba(217, 184, 118, 0.45); --accent-faint: rgba(217, 184, 118, 0.16);
    --title-grad: linear-gradient(180deg, #fff6dc 0%, #e9cc8a 55%, #b98f4a 100%);
    --win-grad: linear-gradient(180deg, #fff9e6, #f0d590 60%, #c99c52);
    --card: linear-gradient(180deg, rgba(255, 240, 210, 0.09), rgba(255, 240, 210, 0.02));
    --win-card: linear-gradient(180deg, rgba(120, 20, 22, 0.75), rgba(70, 8, 10, 0.75));
    --glow: rgba(243, 226, 184, 0.12); --win-glow: rgba(243, 214, 150, 0.35);
    --name: #fff8e6; --tools-bg: rgba(0, 0, 0, 0.25);
  }
  body[data-theme="pink"] {
    --bg: radial-gradient(ellipse 60% 50% at 50% 40%, rgba(255, 255, 255, 0.75), transparent 70%),
          radial-gradient(ellipse at 0% 0%, rgba(255, 196, 214, 0.9), transparent 50%),
          radial-gradient(ellipse at 100% 100%, rgba(246, 170, 196, 0.8), transparent 55%),
          linear-gradient(160deg, #fff4f6 0%, #fbdde5 55%, #f5c6d4 100%);
    --pattern: radial-gradient(circle at 50% 50%, rgba(214, 102, 140, 0.10) 1.5px, transparent 2px);
    --pattern-size: 4.2vmin 4.2vmin;
    --ink: #6e2a40; --ink-2: rgba(110, 42, 64, 0.72); --muted: rgba(150, 70, 98, 0.55);
    --accent: #cf5f86; --accent-soft: #a8395f; --accent-dim: rgba(207, 95, 134, 0.42); --accent-faint: rgba(207, 95, 134, 0.14);
    --title-grad: linear-gradient(180deg, #f08fb0 0%, #d4567f 55%, #9e2f55 100%);
    --win-grad: linear-gradient(180deg, #e46a93, #b8375f 70%, #8f2448);
    --card: linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.42));
    --win-card: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(255, 236, 242, 0.9));
    --glow: rgba(255, 255, 255, 0.6); --win-glow: rgba(232, 112, 152, 0.38);
    --name: #7a2a45; --tools-bg: rgba(255, 255, 255, 0.55);
  }
  body[data-theme="night"] {
    --bg: radial-gradient(ellipse 60% 45% at 50% 40%, rgba(110, 82, 200, 0.35), transparent 70%),
          radial-gradient(ellipse at 15% 110%, rgba(64, 120, 220, 0.30), transparent 55%),
          radial-gradient(ellipse at 90% -10%, rgba(180, 90, 200, 0.25), transparent 50%),
          linear-gradient(170deg, #121641 0%, #0b0d2a 55%, #05061a 100%);
    --pattern: none; --pattern-size: auto;
    --ink: #eef0ff; --ink-2: rgba(226, 230, 255, 0.72); --muted: rgba(200, 206, 255, 0.45);
    --accent: #f2d58a; --accent-soft: #fbeec4; --accent-dim: rgba(196, 184, 255, 0.40); --accent-faint: rgba(196, 184, 255, 0.14);
    --title-grad: linear-gradient(180deg, #ffffff 0%, #e4dcff 45%, #f2d58a 100%);
    --win-grad: linear-gradient(180deg, #ffffff, #fbeec4 55%, #e7c271);
    --card: linear-gradient(180deg, rgba(160, 150, 255, 0.12), rgba(160, 150, 255, 0.03));
    --win-card: linear-gradient(180deg, rgba(40, 34, 96, 0.85), rgba(18, 16, 52, 0.85));
    --glow: rgba(170, 150, 255, 0.16); --win-glow: rgba(242, 213, 138, 0.35);
    --name: #ffffff; --tools-bg: rgba(0, 0, 0, 0.3);
  }
  body[data-theme="forest"] {
    --bg: radial-gradient(ellipse 65% 55% at 50% 40%, rgba(96, 150, 100, 0.40), transparent 70%),
          radial-gradient(ellipse at 50% 120%, rgba(226, 206, 140, 0.16), transparent 55%),
          linear-gradient(160deg, #1f3d2c 0%, #142c20 55%, #0b1c14 100%);
    --pattern: radial-gradient(circle at 50% 50%, rgba(214, 228, 176, 0.06) 1.5px, transparent 2px);
    --pattern-size: 4.2vmin 4.2vmin;
    --ink: #f3f1e2; --ink-2: rgba(243, 241, 226, 0.72); --muted: rgba(220, 230, 196, 0.45);
    --accent: #d8c88e; --accent-soft: #eef0cf; --accent-dim: rgba(216, 200, 142, 0.42); --accent-faint: rgba(216, 200, 142, 0.15);
    --title-grad: linear-gradient(180deg, #fbf8e4 0%, #dfe7b8 50%, #b5a764 100%);
    --win-grad: linear-gradient(180deg, #fffbe8, #e6dca0 60%, #b9a75e);
    --card: linear-gradient(180deg, rgba(230, 240, 210, 0.09), rgba(230, 240, 210, 0.02));
    --win-card: linear-gradient(180deg, rgba(36, 70, 50, 0.85), rgba(18, 42, 30, 0.85));
    --glow: rgba(214, 236, 180, 0.12); --win-glow: rgba(230, 220, 160, 0.32);
    --name: #fdfbea; --tools-bg: rgba(0, 0, 0, 0.25);
  }
  body[data-theme="champagne"] {
    --bg: radial-gradient(ellipse 60% 50% at 50% 40%, rgba(255, 255, 255, 0.85), transparent 70%),
          radial-gradient(ellipse at 50% 120%, rgba(214, 180, 120, 0.35), transparent 55%),
          linear-gradient(160deg, #fdf9f1 0%, #f4ead6 55%, #e9dabd 100%);
    --pattern: radial-gradient(circle at 50% 50%, rgba(176, 138, 74, 0.10) 1.5px, transparent 2px);
    --pattern-size: 4.2vmin 4.2vmin;
    --ink: #4f3d27; --ink-2: rgba(79, 61, 39, 0.72); --muted: rgba(120, 96, 60, 0.55);
    --accent: #b08a4a; --accent-soft: #8a6630; --accent-dim: rgba(176, 138, 74, 0.45); --accent-faint: rgba(176, 138, 74, 0.15);
    --title-grad: linear-gradient(180deg, #d9b56e 0%, #b08a4a 50%, #7d5a26 100%);
    --win-grad: linear-gradient(180deg, #caa25a, #9a7232 65%, #6e4d1c);
    --card: linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.45));
    --win-card: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(250, 243, 228, 0.92));
    --glow: rgba(255, 255, 255, 0.7); --win-glow: rgba(196, 156, 82, 0.35);
    --name: #4f3d27; --tools-bg: rgba(255, 255, 255, 0.6);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; overflow: hidden; }
  body { color: var(--ink); font-family: var(--sans); background: var(--bg); -webkit-font-smoothing: antialiased; transition: color 0.6s; }
  body.hide-cursor { cursor: none; }
  .pattern { position: fixed; inset: 0; background-image: var(--pattern); background-size: var(--pattern-size); pointer-events: none; z-index: 0;
    -webkit-mask-image: radial-gradient(ellipse at 50% 45%, transparent 30%, #000 85%); mask-image: radial-gradient(ellipse at 50% 45%, transparent 30%, #000 85%); }
  canvas#amb { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; }
  .frame { position: fixed; inset: 2.2vmin; border: 1px solid var(--accent-dim); pointer-events: none; z-index: 2; border-radius: 0.6vmin; }
  .frame::before { content: ""; position: absolute; inset: 0.8vmin; border: 1px solid var(--accent-faint); border-radius: 0.4vmin; }
  .corner { position: absolute; width: 6vmin; height: 6vmin; border-color: var(--accent); border-style: solid; opacity: 0.9; }
  .corner::after { content: ""; position: absolute; width: 0.9vmin; height: 0.9vmin; background: var(--accent); transform: rotate(45deg); }
  .corner.tl { top: -1px; left: -1px; border-width: 2px 0 0 2px; }
  .corner.tr { top: -1px; right: -1px; border-width: 2px 2px 0 0; }
  .corner.bl { bottom: -1px; left: -1px; border-width: 0 0 2px 2px; }
  .corner.br { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; }
  .corner.tl::after { left: 1.2vmin; top: 1.2vmin; } .corner.tr::after { right: 1.2vmin; top: 1.2vmin; }
  .corner.bl::after { left: 1.2vmin; bottom: 1.2vmin; } .corner.br::after { right: 1.2vmin; bottom: 1.2vmin; }
  .glow { position: fixed; left: 50%; top: 48%; width: 95vmin; height: 95vmin; transform: translate(-50%, -50%);
    background: radial-gradient(circle, var(--glow), transparent 62%); pointer-events: none; z-index: 0; }
  .halo { position: fixed; left: 50%; top: 52%; width: 86vmin; height: 86vmin; margin: -43vmin 0 0 -43vmin; border-radius: 50%; pointer-events: none; z-index: 1;
    background: conic-gradient(from 0deg, transparent 0deg, var(--accent-dim) 40deg, transparent 90deg, transparent 180deg, var(--accent-dim) 220deg, transparent 270deg);
    -webkit-mask-image: radial-gradient(circle, transparent 60%, #000 61%, #000 62%, transparent 63%); mask-image: radial-gradient(circle, transparent 60%, #000 61%, #000 62%, transparent 63%);
    opacity: 0; transition: opacity 0.6s; animation: spin 3.2s linear infinite; }
  body.is-rolling .halo { opacity: 1; }
  @keyframes spin { to { transform: rotate(360deg); } }
  canvas#fx { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5; }

  .stage { position: relative; z-index: 3; height: 100%; display: flex; flex-direction: column; align-items: center; padding: 6vmin 7vmin 5vmin; }
  .top { text-align: center; }
  .mark { display: inline-flex; align-items: center; justify-content: center; width: 7.6vmin; height: 7.6vmin; border-radius: 50%;
    font-family: var(--serif); color: var(--accent); font-size: 4.2vmin; line-height: 1; border: 1px solid var(--accent-dim);
    box-shadow: 0 0 0 0.6vmin var(--accent-faint); }
  .couple { margin-top: 1.6vmin; font-family: var(--serif); font-size: 2.6vmin; letter-spacing: 0.5em; color: var(--accent-soft); padding-left: 0.5em; }
  .couple:empty { display: none; }
  .main { flex: 1; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 0; overflow: hidden;
    padding: 2vmin 0 1vmin; }
  /* 场景：头部 + 自适应区域（内容过多时先缩小，仍放不下再缓慢上下滚动）+ 底部 */
  .scene { width: 100%; height: 100%; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .scene > .fixed { flex: none; display: flex; flex-direction: column; align-items: center; }
  .vp { position: relative; width: 100%; min-height: 0; flex: 0 1 auto; overflow: hidden; display: flex; flex-direction: column; align-items: center; }
  .vp.scroll { flex: 1 1 auto; -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 4%, #000 96%, transparent 100%);
    mask-image: linear-gradient(180deg, transparent 0, #000 4%, #000 96%, transparent 100%); }
  .fit { flex: none; width: 100%; display: flex; flex-direction: column; align-items: center; }
  .vp.scroll .fit { animation: vscroll var(--dur, 12s) ease-in-out infinite alternate; }
  @keyframes vscroll { 0%, 10% { transform: translateY(0); } 90%, 100% { transform: translateY(var(--dist, 0px)); } }
  .foot { font-size: 1.6vmin; color: var(--muted); letter-spacing: 0.3em; padding-left: 0.3em; }

  .kicker { font-size: 2vmin; letter-spacing: 0.6em; padding-left: 0.6em; color: var(--accent); }
  .title { font-family: var(--serif); font-weight: 600; font-size: 11vmin; letter-spacing: 0.22em; padding-left: 0.22em; line-height: 1.15;
    background: var(--title-grad); -webkit-background-clip: text; background-clip: text; color: transparent;
    filter: drop-shadow(0 0.5vmin 1.6vmin rgba(0, 0, 0, 0.22)); }
  .rule { display: flex; align-items: center; gap: 2vmin; margin: 3vmin 0; color: var(--accent); font-size: 1.8vmin; }
  .rule::before, .rule::after { content: ""; width: 16vmin; height: 1px; background: linear-gradient(90deg, transparent, var(--accent)); }
  .rule::after { transform: scaleX(-1); }
  .hint { font-size: 2.4vmin; letter-spacing: 0.4em; padding-left: 0.4em; color: var(--accent-soft); opacity: 0.9; }
  .breath { animation: breath 2.8s ease-in-out infinite; }
  @keyframes breath { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }

  .prizes { --k: 1; margin-top: calc(4vmin * var(--k)); display: flex; flex-wrap: wrap; justify-content: center; gap: calc(2.2vmin * var(--k)); max-width: 92vw; padding-bottom: 1vmin; }
  .pz { position: relative; min-width: calc(21vmin * var(--k)); max-width: calc(34vmin * var(--k)); padding: calc(2.2vmin * var(--k)) calc(2.8vmin * var(--k)) calc(1.9vmin * var(--k));
    border: 1px solid var(--accent-dim); text-align: center;
    background: var(--card); border-radius: 1.2vmin; box-shadow: 0 1vmin 3vmin rgba(0, 0, 0, 0.12); animation: fadeup 0.7s ease both; }
  .pz::before { content: ""; position: absolute; left: 22%; right: 22%; top: -1px; height: 2px; background: linear-gradient(90deg, transparent, var(--accent), transparent); }
  .pz-name { font-family: var(--serif); font-size: calc(2.7vmin * var(--k)); color: var(--accent-soft); letter-spacing: 0.12em; }
  .pz-reward { margin-top: calc(0.7vmin * var(--k)); font-size: calc(2vmin * var(--k)); color: var(--ink); opacity: 0.9; }
  .pz-count { display: inline-block; margin-top: calc(1.1vmin * var(--k)); font-size: calc(1.5vmin * var(--k)); color: var(--accent); letter-spacing: 0.2em;
    padding: 0.3vmin 1.2vmin 0.3vmin 1.4vmin; border: 1px solid var(--accent-faint); border-radius: 99px; }
  .pz.done { opacity: 0.5; }

  .prize-head { text-align: center; margin-bottom: 4.2vmin; }
  .prize-head .pk { font-size: 1.8vmin; letter-spacing: 0.6em; padding-left: 0.6em; color: var(--accent); margin-bottom: 1.2vmin; }
  .prize-head .pn { font-family: var(--serif); font-weight: 600; font-size: 6.4vmin; letter-spacing: 0.18em; padding-left: 0.18em;
    background: var(--title-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .prize-head .pr { display: inline-block; margin-top: 1.4vmin; font-size: 2.8vmin; letter-spacing: 0.12em; color: var(--ink);
    padding: 0.6vmin 2.4vmin; border-top: 1px solid var(--accent-dim); border-bottom: 1px solid var(--accent-dim); }
  .slots { display: flex; flex-wrap: wrap; justify-content: center; align-content: center; gap: 0.4em 0.5em; max-width: 94vw; padding: 1.2vmin 0; }
  .slot { position: relative; display: flex; align-items: center; justify-content: center; min-width: 4.6em;
    padding: 0.34em 0.95em; font-family: var(--serif); color: var(--name); letter-spacing: 0.08em; white-space: nowrap;
    border: 1px solid var(--accent-dim); background: var(--card); border-radius: 0.18em; overflow: hidden; }
  .slot::before, .slot::after { content: ""; position: absolute; width: 0.5em; height: 0.5em; border-color: var(--accent); border-style: solid; }
  .slot::before { top: 0; left: 0; border-width: 1px 0 0 1px; }
  .slot::after { bottom: 0; right: 0; border-width: 0 1px 1px 0; }
  .rolling .slot { opacity: 0.88; }
  .rolling .slot span { display: inline-block; animation: blur 0.12s linear infinite alternate; }
  @keyframes blur { from { transform: translateY(-0.04em); filter: blur(0.6px); } to { transform: translateY(0.04em); filter: blur(0); } }
  .rolling .slot i.shine { position: absolute; top: 0; bottom: 0; width: 40%; left: -50%;
    background: linear-gradient(90deg, transparent, var(--accent-faint), transparent); animation: shine 1.1s ease-in-out infinite; }
  @keyframes shine { to { left: 110%; } }
  .slot.win { border-color: var(--accent); background: var(--win-card);
    box-shadow: 0 0 3vmin var(--win-glow), inset 0 0 2vmin var(--accent-faint);
    animation: land 0.75s cubic-bezier(0.2, 0.9, 0.25, 1.2) both, pulse 2.6s 1s ease-in-out infinite; }
  .slot.win span { background: var(--win-grad); -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: 600; }
  @keyframes land { 0% { transform: scale(0.6) rotateX(70deg); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); } }
  @keyframes pulse { 0%, 100% { box-shadow: 0 0 3vmin var(--win-glow), inset 0 0 2vmin var(--accent-faint); }
    50% { box-shadow: 0 0 5.5vmin var(--win-glow), inset 0 0 2.6vmin var(--accent-faint); } }
  .bar { position: relative; width: 50vmin; height: 0.5vmin; margin-top: 5vmin; background: var(--accent-faint); overflow: hidden; border-radius: 99px; }
  .bar i { display: block; height: 100%; width: 0; border-radius: 99px; background: linear-gradient(90deg, transparent, var(--accent), var(--accent-soft));
    box-shadow: 0 0 1.4vmin var(--accent); }
  .count-down { margin-top: 2vmin; font-size: 1.8vmin; letter-spacing: 0.5em; padding-left: 0.5em; color: var(--muted); }
  .congrats { display: flex; align-items: center; gap: 2.4vmin; margin-top: 4.5vmin; font-family: var(--serif); font-size: 3.6vmin; letter-spacing: 0.7em;
    padding-left: 0.7em; color: var(--accent); animation: fadeup 0.9s 0.4s ease both; }
  .congrats::before, .congrats::after { content: ""; width: 10vmin; height: 1px; background: linear-gradient(90deg, transparent, var(--accent)); }
  .congrats::after { transform: scaleX(-1); }
  @keyframes fadeup { from { opacity: 0; transform: translateY(1.5vmin); } to { opacity: 1; transform: none; } }

  .board { --k: 1; --cols: 3; --gap: calc(2.2vmin * var(--k)); width: 100%; max-width: 160vmin; display: flex; flex-wrap: wrap; justify-content: center;
    align-items: stretch; gap: var(--gap); padding: 0.6vmin 0; }
  .bd { flex: 0 0 calc((100% - (var(--cols) - 1) * var(--gap)) / var(--cols)); min-width: 0; border: 1px solid var(--accent-dim);
    padding: calc(1.8vmin * var(--k)) calc(2.2vmin * var(--k)); background: var(--card); border-radius: 1.2vmin; text-align: center;
    animation: fadeup 0.7s ease both; }
  .bd-h { display: flex; flex-direction: column; align-items: center; gap: calc(0.5vmin * var(--k)); border-bottom: 1px solid var(--accent-faint);
    padding-bottom: calc(1.1vmin * var(--k)); margin-bottom: calc(1.2vmin * var(--k)); }
  .bd-n { font-family: var(--serif); font-weight: 600; font-size: calc(2.8vmin * var(--k)); color: var(--accent-soft); letter-spacing: 0.12em; padding-left: 0.12em; }
  .bd-r { font-size: calc(1.7vmin * var(--k)); color: var(--ink); opacity: 0.85; }
  .bd-r i { font-style: normal; color: var(--accent); margin-left: 0.6em; }
  .bd-w { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.25em 0.9em; font-family: var(--serif); font-size: calc(2.5vmin * var(--k));
    color: var(--name); line-height: 1.55; }
  .bd-w span { white-space: nowrap; }
  .bd-w.none { color: var(--muted); font-size: calc(2vmin * var(--k)); font-family: var(--sans); }

  .calm { text-align: center; }
  .calm .t { font-family: var(--serif); font-size: 5vmin; letter-spacing: 0.2em; color: var(--accent-soft); }
  .calm .d { margin-top: 2vmin; font-size: 2.2vmin; color: var(--ink-2); letter-spacing: 0.1em; }

  .fade-in { animation: fadein 0.8s ease both; }
  @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }

  .tools { position: fixed; right: 3.5vmin; bottom: 3.5vmin; z-index: 8; display: flex; gap: 10px; align-items: center; transition: opacity 0.4s; }
  .tools.hidden { opacity: 0; pointer-events: none; }
  .tools button { font: inherit; font-size: 13px; color: var(--accent-soft); background: var(--tools-bg); border: 1px solid var(--accent-dim);
    padding: 7px 14px; cursor: pointer; letter-spacing: 0.15em; border-radius: 4px; }
  .net { position: fixed; left: 3.5vmin; bottom: 3.2vmin; z-index: 8; font-size: 12px; color: var(--muted); letter-spacing: 0.1em; }
  .net:empty { display: none; }
  @media (prefers-reduced-motion: reduce) { .halo, .rolling .slot span, .rolling .slot i.shine, .slot.win { animation: none; } }

  /* ---------- 套餐展示：专属标识 / 平台标识 / 开场动画 ---------- */
  .vip { display: none; margin: 1.4vmin auto 0; padding: 0.5vmin 2.2vmin; border-radius: 3vmin; font-family: var(--serif); font-size: 1.7vmin; letter-spacing: 0.4em;
    color: #5a1010; background: linear-gradient(110deg, #c99c52 0%, #f6e2b0 45%, #e2c27f 60%, #b98a45 100%); background-size: 220% 100%;
    box-shadow: 0 0 2.4vmin rgba(240, 205, 130, 0.45), 0 0 0 1px rgba(255, 240, 200, 0.6) inset; animation: vipShine 4.5s ease-in-out infinite; width: max-content; padding-left: calc(2.2vmin + 0.4em); }
  .vip.on { display: block; }
  @keyframes vipShine { 0%, 100% { background-position: 0% 0; } 50% { background-position: 100% 0; } }
  .wm { position: fixed; right: 9.5vmin; top: 3.6vmin; z-index: 8; font-size: 12px; letter-spacing: 0.12em; color: var(--muted); opacity: 0.75; display: none; }
  .wm.on { display: block; }
  #opening { position: fixed; inset: 0; z-index: 20; pointer-events: none; display: none; }
  #opening.on { display: block; }
  #opening .door { position: absolute; top: 0; bottom: 0; width: 50.5%; background: radial-gradient(circle at 100% 50%, #a8242a, #6b1216 70%, #4a0c0f);
    box-shadow: inset 0 0 0 1.2vmin rgba(201, 160, 99, 0.25); transition: transform 1.4s cubic-bezier(.7, 0, .2, 1) 0.15s; }
  #opening .door.l { left: 0; border-right: 2px solid #e2c27f; }
  #opening .door.r { right: 0; border-left: 2px solid #e2c27f; background: radial-gradient(circle at 0% 50%, #a8242a, #6b1216 70%, #4a0c0f); }
  #opening .seal { position: absolute; left: 50%; top: 50%; width: 22vmin; height: 22vmin; margin: -11vmin 0 0 -11vmin; border-radius: 50%; display: flex; flex-direction: column;
    align-items: center; justify-content: center; color: #f6e2b0; font-family: var(--serif); background: radial-gradient(circle, #b8282e, #7d171c);
    border: 2px solid #e2c27f; box-shadow: 0 0 6vmin rgba(240, 200, 120, 0.5); transition: opacity 0.6s, transform 0.9s; }
  #opening .seal b { font-size: 10vmin; line-height: 1; font-weight: 400; }
  #opening .seal span { margin-top: 1vmin; font-size: 1.6vmin; letter-spacing: 0.4em; padding-left: 0.4em; }
  #opening.open .door.l { transform: translateX(-102%); }
  #opening.open .door.r { transform: translateX(102%); }
  #opening.open .seal { opacity: 0; transform: scale(1.6); }
  @media (prefers-reduced-motion: reduce) { .vip { animation: none; } #opening { display: none !important; } }
</style>
</head>
<body>
<div class="glow"></div>
<div class="pattern"></div>
<canvas id="amb"></canvas>
<div class="halo"></div>
<div class="frame"><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i></div>
<canvas id="fx"></canvas>
<div class="stage">
  <div class="top">
    <div class="mark">囍</div>
    <div class="couple" id="couple"></div>
    <div class="vip" id="vip"></div>
  </div>
  <div class="main" id="main"><div class="calm"><div class="d breath">正在连接…</div></div></div>
  <div class="foot" id="foot">有囍請柬 · 现场抽奖</div>
</div>
<div class="tools" id="tools"><button type="button" id="fsBtn">全屏</button></div>
<div class="net" id="net"></div>
<div class="wm" id="wm">由 有囍請柬 提供技术支持</div>
<div id="opening"><div class="door l"></div><div class="door r"></div><div class="seal"><b>囍</b><span id="openingTxt">良缘永结</span></div></div>

<script>
(function () {
  var main = document.getElementById('main');
  var coupleEl = document.getElementById('couple');
  var netEl = document.getElementById('net');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  var wid = '';
  try { wid = (new URLSearchParams(location.search).get('wid') || '').trim(); } catch (e) {}
  if (!wid) {
    var m = /^\\/l\\/([^\\/?#]+)/.exec(location.pathname);
    if (m) { try { wid = decodeURIComponent(m[1]); } catch (e) { wid = m[1]; } }
  }

  // ---------- 主题 + 氛围粒子 ----------
  var THEMES = {
    red: { meta: '#4a0c0f', confetti: ['#f3e2b8', '#e2c27f', '#c99c52', '#fff4d6', '#b8323a'], amb: 'dust', ambColors: ['#f3e2b8', '#e2c27f', '#ffd98a'] },
    pink: { meta: '#f8d3dd', confetti: ['#f7a8c0', '#e46a93', '#ffffff', '#ffd1dc', '#f2c27a'], amb: 'petal', ambColors: ['#f7b6c8', '#f39ab5', '#ffd6e0', '#ffffff'] },
    night: { meta: '#0b0d2a', confetti: ['#fbeec4', '#f2d58a', '#c9b6ff', '#9fc3ff', '#ffffff'], amb: 'star', ambColors: ['#ffffff', '#e4dcff', '#fbeec4', '#bcd2ff'] },
    forest: { meta: '#142c20', confetti: ['#eef0cf', '#d8c88e', '#9cc58a', '#f6d8a8', '#ffffff'], amb: 'leaf', ambColors: ['#9cc58a', '#7fae74', '#c9d98f', '#e3d48f'] },
    champagne: { meta: '#f4ead6', confetti: ['#d9b56e', '#b08a4a', '#ffffff', '#f3e3c0', '#e8c9a0'], amb: 'bubble', ambColors: ['#d9b56e', '#c9a467', '#ffffff'] }
  };
  var urlTheme = '';
  try { urlTheme = (new URLSearchParams(location.search).get('theme') || '').trim(); } catch (e) {}
  var curTheme = '';
  var COLORS = THEMES.red.confetti;
  var metaTheme = document.querySelector('meta[name="theme-color"]');
  function setTheme(t) {
    if (THEMES[urlTheme]) t = urlTheme;
    if (!THEMES[t]) t = 'red';
    if (t === curTheme) return;
    curTheme = t;
    document.body.setAttribute('data-theme', t);
    COLORS = THEMES[t].confetti;
    if (metaTheme) metaTheme.setAttribute('content', THEMES[t].meta);
    try { if (wid) localStorage.setItem('lt-theme:' + wid, t); } catch (e) {}
    initAmb();
  }

  var acv = document.getElementById('amb');
  var actx = acv.getContext('2d');
  var amb = [];
  var ambT = 0;
  function aResize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    acv.width = innerWidth * dpr; acv.height = innerHeight * dpr;
    actx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  aResize();
  addEventListener('resize', function () { aResize(); initAmb(); });
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function newAmb(kind, w, h, anywhere) {
    var cs = THEMES[curTheme].ambColors;
    var p = { c: pick(cs), ph: rnd(0, 6.28) };
    if (kind === 'star') {
      p.x = rnd(0, w); p.y = rnd(0, h); p.r = rnd(0.4, 1.8); p.sp = rnd(0.01, 0.04);
    } else if (kind === 'petal' || kind === 'leaf') {
      p.x = rnd(-0.1 * w, w); p.y = anywhere ? rnd(-h, h) : rnd(-0.2 * h, -20);
      p.r = kind === 'petal' ? rnd(5, 11) : rnd(7, 13); p.vy = rnd(0.35, 1.0); p.vx = rnd(0.1, 0.6);
      p.rot = rnd(0, 6.28); p.vr = rnd(-0.02, 0.02); p.sw = rnd(0.6, 1.6); p.a = rnd(0.45, 0.9);
    } else {
      // dust / bubble：缓慢上升
      p.x = rnd(0, w); p.y = anywhere ? rnd(0, h) : h + rnd(5, 40);
      p.r = kind === 'bubble' ? rnd(2, 7) : rnd(0.6, 2.2); p.vy = -rnd(0.15, 0.6); p.vx = rnd(-0.15, 0.15); p.a = rnd(0.25, 0.8);
    }
    return p;
  }
  var shoot = null;
  function initAmb() {
    if (!curTheme) return;
    var w = innerWidth, h = innerHeight;
    var kind = THEMES[curTheme].amb;
    var n = kind === 'star' ? Math.round(w * h / 9000) : kind === 'dust' ? 70 : kind === 'bubble' ? 45 : 34;
    n = Math.min(n, 260);
    amb = [];
    for (var i = 0; i < n; i++) amb.push(newAmb(kind, w, h, true));
    shoot = null;
  }
  var reduceMotion = false;
  try { reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  function drawPetal(p) {
    actx.beginPath();
    actx.moveTo(0, -p.r);
    actx.bezierCurveTo(p.r * 0.9, -p.r * 0.6, p.r * 0.7, p.r * 0.7, 0, p.r);
    actx.bezierCurveTo(-p.r * 0.7, p.r * 0.7, -p.r * 0.9, -p.r * 0.6, 0, -p.r);
    actx.fill();
  }
  function drawLeaf(p) {
    actx.beginPath();
    actx.moveTo(0, -p.r);
    actx.quadraticCurveTo(p.r * 0.75, 0, 0, p.r);
    actx.quadraticCurveTo(-p.r * 0.75, 0, 0, -p.r);
    actx.fill();
    actx.globalAlpha *= 0.5;
    actx.strokeStyle = 'rgba(20, 50, 30, 0.6)'; actx.lineWidth = 0.8;
    actx.beginPath(); actx.moveTo(0, -p.r * 0.9); actx.lineTo(0, p.r * 0.9); actx.stroke();
  }
  function ambStep() {
    requestAnimationFrame(ambStep);
    if (!curTheme || document.hidden) return;
    ambT++;
    if (reduceMotion && ambT % 30 !== 1) return;
    var w = innerWidth, h = innerHeight;
    var kind = THEMES[curTheme].amb;
    actx.clearRect(0, 0, w, h);
    for (var i = 0; i < amb.length; i++) {
      var p = amb[i];
      actx.save();
      if (kind === 'star') {
        var tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(p.ph + ambT * p.sp));
        actx.globalAlpha = tw;
        actx.fillStyle = p.c;
        actx.beginPath(); actx.arc(p.x, p.y, p.r, 0, 6.283); actx.fill();
        if (p.r > 1.4) {
          actx.globalAlpha = tw * 0.5; actx.fillRect(p.x - p.r * 3, p.y - 0.4, p.r * 6, 0.8); actx.fillRect(p.x - 0.4, p.y - p.r * 3, 0.8, p.r * 6);
        }
      } else if (kind === 'petal' || kind === 'leaf') {
        p.y += p.vy; p.x += p.vx + Math.sin(p.ph + ambT * 0.02) * p.sw * 0.5; p.rot += p.vr;
        if (p.y > h + 30 || p.x > w + 30) amb[i] = newAmb(kind, w, h, false);
        actx.globalAlpha = p.a;
        actx.translate(p.x, p.y); actx.rotate(p.rot);
        actx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(p.ph + ambT * 0.03)));
        actx.fillStyle = p.c;
        if (kind === 'petal') drawPetal(p); else drawLeaf(p);
      } else {
        p.y += p.vy; p.x += p.vx + Math.sin(p.ph + ambT * 0.015) * 0.2;
        if (p.y < -20) amb[i] = newAmb(kind, w, h, false);
        var al = p.a * (0.6 + 0.4 * Math.sin(p.ph + ambT * 0.05));
        actx.globalAlpha = al;
        if (kind === 'bubble') {
          actx.strokeStyle = p.c; actx.lineWidth = 1;
          actx.beginPath(); actx.arc(p.x, p.y, p.r, 0, 6.283); actx.stroke();
          actx.globalAlpha = al * 0.6; actx.fillStyle = '#ffffff';
          actx.beginPath(); actx.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.25, 0, 6.283); actx.fill();
        } else {
          actx.shadowColor = p.c; actx.shadowBlur = 6;
          actx.fillStyle = p.c;
          actx.beginPath(); actx.arc(p.x, p.y, p.r, 0, 6.283); actx.fill();
        }
      }
      actx.restore();
    }
    // 星空：偶尔划过流星
    if (kind === 'star' && !reduceMotion) {
      if (!shoot && Math.random() < 0.004) shoot = { x: rnd(0.1 * w, 0.8 * w), y: rnd(0, 0.35 * h), l: 0 };
      if (shoot) {
        shoot.l++;
        var sx = shoot.x + shoot.l * 9, sy = shoot.y + shoot.l * 4;
        var g = actx.createLinearGradient(sx - 120, sy - 53, sx, sy);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.9)');
        actx.strokeStyle = g; actx.lineWidth = 1.6;
        actx.beginPath(); actx.moveTo(sx - 120, sy - 53); actx.lineTo(sx, sy); actx.stroke();
        if (shoot.l > 45) shoot = null;
      }
    }
    drawPlanFx(w, h);
  }
  // ---------- 套餐特效：petals = 金色花瓣；gold = 金色花瓣 + 闪烁金箔 ----------
  var planFx = 'none';
  var pfx = [];
  function newPfx(kind, w, h, anywhere) {
    if (kind === 'glint') return { k: 'glint', x: rnd(0, w), y: rnd(0, h), r: rnd(1.2, 3.2), ph: rnd(0, 6.28), sp: rnd(0.02, 0.05) };
    return { k: 'petal', x: rnd(-0.1 * w, w), y: anywhere ? rnd(-h, h) : rnd(-0.2 * h, -20), r: rnd(5, 9), vy: rnd(0.3, 0.8), vx: rnd(0.1, 0.5),
      rot: rnd(0, 6.28), vr: rnd(-0.02, 0.02), sw: rnd(0.6, 1.4), a: rnd(0.35, 0.7), ph: rnd(0, 6.28), c: pick(['#f3e2b8', '#e2c27f', '#ffd98a']) };
  }
  function setPlanFx(fx) {
    if (fx === planFx) return;
    planFx = fx; pfx = [];
    var w = innerWidth, h = innerHeight;
    if (fx === 'petals' || fx === 'gold') for (var i = 0; i < 16; i++) pfx.push(newPfx('petal', w, h, true));
    if (fx === 'gold') for (var j = 0; j < 46; j++) pfx.push(newPfx('glint', w, h, true));
  }
  function drawPlanFx(w, h) {
    for (var i = 0; i < pfx.length; i++) {
      var p = pfx[i];
      actx.save();
      if (p.k === 'glint') {
        var tw = Math.max(0, Math.sin(p.ph + ambT * p.sp));
        actx.globalAlpha = tw * 0.9;
        actx.fillStyle = '#ffe7a8'; actx.shadowColor = '#ffd27a'; actx.shadowBlur = 8;
        actx.beginPath(); actx.arc(p.x, p.y, p.r * 0.6, 0, 6.283); actx.fill();
        actx.globalAlpha = tw * 0.55;
        actx.fillRect(p.x - p.r * 3, p.y - 0.5, p.r * 6, 1); actx.fillRect(p.x - 0.5, p.y - p.r * 3, 1, p.r * 6);
        if (tw < 0.02 && Math.random() < 0.05) { p.x = rnd(0, w); p.y = rnd(0, h); }
      } else {
        p.y += p.vy; p.x += p.vx + Math.sin(p.ph + ambT * 0.02) * p.sw * 0.5; p.rot += p.vr;
        if (p.y > h + 30 || p.x > w + 30) pfx[i] = newPfx('petal', w, h, false);
        actx.globalAlpha = p.a;
        actx.translate(p.x, p.y); actx.rotate(p.rot);
        actx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(p.ph + ambT * 0.03)));
        actx.fillStyle = p.c;
        drawPetal(p);
      }
      actx.restore();
    }
  }
  var vipEl = document.getElementById('vip');
  var wmEl = document.getElementById('wm');
  var footEl = document.getElementById('foot');
  var openingShown = false;
  function applyPlan(pl, couple) {
    pl = pl || {};
    var wm = pl.watermark !== false;
    wmEl.classList.toggle('on', wm);
    footEl.textContent = wm ? '有囍請柬 · 现场抽奖' : '喜结良缘 · 幸运抽奖';
    if (pl.badge) { vipEl.textContent = pl.badge; vipEl.classList.add('on'); } else vipEl.classList.remove('on');
    setPlanFx(reduceMotion ? 'none' : (pl.effect || 'none'));
    if (pl.opening && !openingShown) {
      openingShown = true;
      var op = document.getElementById('opening');
      var cp = [couple.groom, couple.bride].filter(Boolean).join(' ♥ ');
      document.getElementById('openingTxt').textContent = cp || '良缘永结';
      op.classList.add('on');
      setTimeout(function () { op.classList.add('open'); }, 1100);
      setTimeout(function () { op.classList.remove('on'); }, 3000);
    }
    openingShown = true;
  }
  requestAnimationFrame(ambStep);
  var savedTheme = '';
  try { savedTheme = localStorage.getItem('lt-theme:' + wid) || ''; } catch (e) {}
  setTheme(urlTheme || savedTheme || 'red');

  function calm(t, d) {
    main.innerHTML = '<div class="calm fade-in"><div class="t">' + esc(t) + '</div><div class="d">' + esc(d || '') + '</div></div>';
  }

  if (!wid) {
    calm('请使用完整的抽奖网址', '在小程序「管理后台 · 现场抽奖」复制大屏网址后打开');
    return;
  }

  // ---------- 时间同步 ----------
  var offset = 0; // serverNow - localNow
  function serverNow() { return Date.now() + offset; }

  // ---------- 场景 ----------
  var data = null;
  var sceneKey = '';
  var rollTimer = null;
  var rollBar = null;
  var rollSlots = [];
  var rollStart = 0;
  var lastRollingKey = '';

  function prizeById(id) {
    if (!data) return null;
    for (var i = 0; i < data.prizes.length; i++) if (data.prizes[i].id === id) return data.prizes[i];
    return null;
  }
  function prizeLabel(p) { return p ? (p.name || p.reward || '') : ''; }
  function prizeSub(p) { return p && p.name && p.reward ? p.reward : ''; }

  function slotSize(n) {
    if (n <= 1) return 15;
    if (n <= 2) return 11;
    if (n <= 3) return 9;
    if (n <= 6) return 6.4;
    if (n <= 10) return 5;
    if (n <= 20) return 3.8;
    if (n <= 40) return 2.9;
    return 2.3;
  }

  function stopRoll() {
    fitFn = null;
    if (rollTimer) { clearTimeout(rollTimer); rollTimer = null; }
    rollSlots = [];
    rollBar = null;
  }

  function randName() {
    var ns = (data && data.names) || [];
    if (!ns.length) return '…';
    return ns[Math.floor(Math.random() * ns.length)];
  }

  function headHtml(p, kicker) {
    var sub = prizeSub(p);
    return '<div class="prize-head fade-in">' + (kicker ? '<div class="pk">' + esc(kicker) + '</div>' : '') + '<div class="pn">' + esc(prizeLabel(p)) + '</div>' +
      (sub ? '<div class="pr">' + esc(sub) + '</div>' : '') + '</div>';
  }

  // ---------- 自适应：内容放不下时先缩小，仍放不下则缓慢上下滚动 ----------
  var fitFn = null;
  function fitLoop(vp, inner, apply, from, to, step) {
    vp.classList.remove('scroll');
    inner.style.removeProperty('--dist');
    var k = from;
    for (;;) {
      apply(k);
      if (inner.offsetHeight <= vp.clientHeight + 1 || k <= to) break;
      k = Math.max(to, k - step);
    }
    if (inner.offsetHeight > vp.clientHeight + 1) {
      vp.classList.add('scroll');
      var dist = vp.clientHeight - inner.offsetHeight;
      inner.style.setProperty('--dist', dist + 'px');
      inner.style.setProperty('--dur', Math.max(8, Math.round(-dist / 35)) + 's');
    }
  }
  function runFit() { if (fitFn) { try { fitFn(); } catch (e) {} } }
  function setFit(fn) {
    fitFn = fn;
    runFit();
    setTimeout(runFit, 350);
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(runFit); } catch (e) {}
  }
  var fitT = null;
  addEventListener('resize', function () { if (fitT) clearTimeout(fitT); fitT = setTimeout(runFit, 120); });
  function boardCols(n) {
    var w = innerWidth, h = innerHeight;
    var max = w < 640 ? 1 : (w / h < 1.45 ? 2 : (n > 6 && w / h > 1.7 ? 4 : 3));
    var cols = Math.max(1, Math.min(n, max));
    var rows = Math.ceil(n / cols);
    return Math.ceil(n / rows);
  }
  // 名字格子：先用 vmin 字号缩到放得下，最小 1.6vmin
  function fitSlots(vpId, fitId, slotsId, start) {
    var vp = document.getElementById(vpId), inner = document.getElementById(fitId), sl = document.getElementById(slotsId);
    if (!vp || !inner || !sl) return;
    fitLoop(vp, inner, function (k) { sl.style.fontSize = k + 'vmin'; }, start, Math.min(start, 1.6), Math.max(0.2, start / 20));
  }

  function renderIdle() {
    stopRoll();
    var ps = data.prizes || [];
    var html = '<div class="scene calm fade-in"><div class="fixed">' +
      '<div class="kicker">LUCKY DRAW</div><div class="title">幸运抽奖</div><div class="rule">◆</div>';
    if (!ps.length) {
      html += '<div class="hint">抽奖尚未设置奖项</div></div>';
    } else {
      var allDone = true;
      for (var i = 0; i < ps.length; i++) if (!ps[i].drawn) allDone = false;
      html += '<div class="hint breath">' + (allDone ? '全部奖项已揭晓 · 感谢参与' : '等待开奖') + '</div></div>' +
        '<div class="vp" id="vp"><div class="fit" id="fit"><div class="prizes" id="prizes">';
      for (var j = 0; j < ps.length; j++) {
        var p = ps[j];
        html += '<div class="pz' + (p.drawn ? ' done' : '') + '" style="animation-delay:' + Math.min(j * 0.08, 1).toFixed(2) + 's"><div class="pz-name">' + esc(prizeLabel(p)) + '</div>' +
          (prizeSub(p) ? '<div class="pz-reward">' + esc(prizeSub(p)) + '</div>' : '') +
          '<div class="pz-count">' + (p.drawn ? '已揭晓' : ('共 ' + p.count + ' 名')) + '</div></div>';
      }
      html += '</div></div></div>';
    }
    html += '</div>';
    main.innerHTML = html;
    setFit(ps.length ? function () {
      var vp = document.getElementById('vp'), inner = document.getElementById('fit'), pz = document.getElementById('prizes');
      if (!vp || !inner || !pz) return;
      fitLoop(vp, inner, function (k) { pz.style.setProperty('--k', k); }, 1, 0.6, 0.05);
    } : null);
  }

  function renderBoard() {
    stopRoll();
    var ps = data.prizes || [];
    var html = '<div class="scene fade-in"><div class="fixed">' +
      '<div class="kicker">WINNERS</div><div class="title" style="font-size:7vmin">中奖名单</div></div>' +
      '<div class="vp" id="vp" style="margin-top:2.4vmin"><div class="fit" id="fit"><div class="board" id="board" style="--cols:' + boardCols(Math.max(1, ps.length)) + '">';
    if (!ps.length) html += '<div class="bd"><div class="bd-w none">尚未设置奖项</div></div>';
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      var wn = (p.winners || []).length;
      html += '<div class="bd" style="animation-delay:' + Math.min(i * 0.06, 0.8).toFixed(2) + 's"><div class="bd-h"><div class="bd-n">' + esc(prizeLabel(p)) + '</div>' +
        '<div class="bd-r">' + esc(prizeSub(p)) + (wn ? '<i>' + wn + ' 人</i>' : '') + '</div></div>' +
        (wn
          ? '<div class="bd-w">' + p.winners.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>'
          : '<div class="bd-w none">尚未抽取</div>') + '</div>';
    }
    html += '</div></div></div></div>';
    main.innerHTML = html;
    var nCards = Math.max(1, ps.length);
    setFit(function () {
      var vp = document.getElementById('vp'), inner = document.getElementById('fit'), bd = document.getElementById('board');
      if (!vp || !inner || !bd) return;
      bd.style.setProperty('--cols', boardCols(nCards));
      fitLoop(vp, inner, function (k) { bd.style.setProperty('--k', k); }, 1, 0.55, 0.05);
    });
  }

  function renderRolling() {
    stopRoll();
    var p = prizeById(data.prizeId);
    var n = p ? p.count : 1;
    var remainCap = Math.max(1, (data.names || []).length);
    n = Math.max(1, Math.min(n, remainCap));
    var html = '<div class="scene rolling"><div class="fixed">' + headHtml(p, '正在抽取') + '</div>' +
      '<div class="vp" id="vp"><div class="fit" id="fit"><div class="slots" id="slots" style="font-size:' + slotSize(n) + 'vmin">';
    for (var i = 0; i < n; i++) html += '<div class="slot"><i class="shine" style="animation-delay:' + (i % 7 * 0.13).toFixed(2) + 's"></i><span>' + esc(randName()) + '</span></div>';
    html += '</div></div></div><div class="fixed"><div class="bar"><i id="bar"></i></div><div class="count-down">好运降临中</div></div></div>';
    main.innerHTML = html;
    var nSlots = n;
    setFit(function () { fitSlots('vp', 'fit', 'slots', slotSize(nSlots)); });
    rollSlots = Array.prototype.slice.call(document.querySelectorAll('#slots .slot span'));
    rollBar = document.getElementById('bar');
    rollStart = data.startedAt || serverNow();
    tick();
  }

  function tick() {
    var now = serverNow();
    var total = Math.max(1, (data.revealAt || now) - rollStart);
    var left = (data.revealAt || now) - now;
    var prog = Math.min(1, Math.max(0, 1 - left / total));
    if (rollBar) rollBar.style.width = (prog * 100).toFixed(1) + '%';
    for (var i = 0; i < rollSlots.length; i++) rollSlots[i].textContent = randName();
    // 越接近揭晓越慢；到点后保持慢速直到拿到结果
    var delay = left > 1600 ? 55 : left > 0 ? 55 + (1600 - left) / 1600 * 170 : 240;
    if (left <= 0) schedulePoll(150);
    rollTimer = setTimeout(tick, delay);
  }

  function renderRevealed(fromRolling) {
    stopRoll();
    var p = prizeById(data.prizeId);
    var ws = (p && p.winners) || [];
    var html = '<div class="scene"><div class="fixed">' + headHtml(p, '中奖名单') + '</div>' +
      '<div class="vp" id="vp"><div class="fit" id="fit"><div class="slots" id="slots" style="font-size:' + (ws.length ? slotSize(ws.length) : 5) + 'vmin">';
    if (!ws.length) html += '<div class="slot"><span>暂无中奖人</span></div>';
    for (var i = 0; i < ws.length; i++) {
      html += '<div class="slot win" style="animation-delay:' + Math.min(i * 0.09, 1.8).toFixed(2) + 's"><span>' +
        esc(ws[i]) + '</span></div>';
    }
    html += '</div></div></div><div class="fixed"><div class="congrats">恭喜中奖</div></div></div>';
    main.innerHTML = html;
    var startSize = ws.length ? slotSize(ws.length) : 5;
    setFit(function () { fitSlots('vp', 'fit', 'slots', startSize); });
    if (ws.length) burst(fromRolling ? 1 : 0.5);
  }

  function render() {
    var st = data.status;
    var p = prizeById(data.prizeId);
    if ((st === 'rolling' || st === 'revealed') && !p) st = 'idle';
    var key = st + '|' + (data.prizeId || '') + '|' + (data.startedAt || '');
    if (st === 'idle') key += '|' + JSON.stringify(data.prizes.map(function (x) { return [x.name, x.reward, x.count, x.drawn]; }));
    if (st === 'board') key += '|' + JSON.stringify(data.prizes);
    if (st === 'revealed') key += '|' + JSON.stringify(p.winners);
    if (st === 'rolling') key += '|' + (data.revealAt || '') + '|' + (p ? p.count : 0);
    document.body.classList.toggle('is-rolling', st === 'rolling');
    if (key === sceneKey) return;
    var rk = (data.prizeId || '') + '|' + (data.startedAt || '');
    sceneKey = key;
    if (st === 'rolling') { lastRollingKey = rk; renderRolling(); }
    else if (st === 'revealed') renderRevealed(lastRollingKey === rk);
    else if (st === 'board') renderBoard();
    else renderIdle();
    if (st !== 'rolling') lastRollingKey = '';
  }

  // ---------- 数据：WebSocket 推送优先，轮询兜底 ----------
  var pollTimer = null;
  var polling = false;
  var fails = 0;
  var ws = null;
  var wsOpen = false;
  var wsFails = 0;
  var wsEverOpened = false;
  var wsGaveUp = typeof WebSocket === 'undefined';
  function schedulePoll(ms) {
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = setTimeout(poll, ms);
  }
  function notFound() {
    stopRoll();
    sceneKey = '';
    calm('没有找到这场婚礼', '请在小程序管理后台重新复制大屏网址');
  }
  function applyData(d, newOffset) {
    fails = 0;
    netEl.textContent = '';
    offset = newOffset;
    data = d;
    setTheme(d.theme);
    var c = d.couple || {};
    applyPlan(d.plan, c);
    var cp = [c.groom, c.bride].filter(Boolean).join(' ♥ ');
    coupleEl.textContent = cp ? cp + ' · 新婚喜宴' : '';
    if (cp) document.title = '幸运抽奖 · ' + cp;
    render();
    // 推送模式下只做低频兜底；抽奖中在揭晓时刻补一次
    var next = wsOpen ? 30000 : 900;
    if (d.status === 'rolling' && d.revealAt) {
      var left = d.revealAt - serverNow();
      if (wsOpen) next = Math.max(60, left + 400);
      else if (left < 900) next = Math.max(60, left + 40);
    }
    schedulePoll(next);
  }
  function poll() {
    pollTimer = null;
    if (polling) return;
    polling = true;
    var t0 = Date.now();
    fetch('/api/lottery?wid=' + encodeURIComponent(wid), { cache: 'no-store' })
      .then(function (r) { return r.json().then(function (b) { return { status: r.status, body: b }; }); })
      .then(function (res) {
        polling = false;
        if (res.status === 404) { notFound(); schedulePoll(5000); return; }
        if (!res.body || !res.body.ok) throw new Error('bad');
        var d = res.body.data;
        applyData(d, d.serverNow - Math.round((t0 + Date.now()) / 2));
      })
      .catch(function () {
        polling = false;
        fails++;
        if (fails >= 3 && !wsOpen) netEl.textContent = '网络重连中…';
        if (!data) calm('正在连接…', '请确认网络可用');
        schedulePoll(wsOpen ? 30000 : Math.min(5000, 900 + fails * 500));
      });
  }
  function connectWs() {
    if (wsGaveUp) return;
    var url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/api/lottery/ws?wid=' + encodeURIComponent(wid);
    var sock;
    try { sock = new WebSocket(url); } catch (e) { wsGaveUp = true; return; }
    ws = sock;
    var pingTimer = null;
    sock.onopen = function () {
      wsOpen = true; wsEverOpened = true; wsFails = 0;
      pingTimer = setInterval(function () { try { sock.send('ping'); } catch (e) {} }, 25000);
    };
    sock.onmessage = function (ev) {
      var m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (!m || !m.type) return;
      if (m.type === 'notfound') { notFound(); return; }
      if (m.type === 'state' && m.data) applyData(m.data, m.data.serverNow - Date.now());
    };
    sock.onclose = function () {
      if (pingTimer) clearInterval(pingTimer);
      var was = wsOpen;
      wsOpen = false;
      ws = null;
      wsFails++;
      // 从未连上过且连续失败：放弃推送，只用轮询
      if (!wsEverOpened && wsFails >= 3) { wsGaveUp = true; }
      schedulePoll(was ? 0 : 900);
      if (!wsGaveUp) setTimeout(connectWs, Math.min(15000, 1000 * Math.pow(2, Math.min(wsFails, 4))));
    };
    sock.onerror = function () { try { sock.close(); } catch (e) {} };
  }

  // ---------- 金箔礼花 ----------
  var cv = document.getElementById('fx');
  var ctx = cv.getContext('2d');
  var parts = [];
  var fxRunning = false;
  function resize() {
    var dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener('resize', resize);
  function burst(power) {
    var n = Math.round(150 * power);
    var w = innerWidth, h = innerHeight;
    for (var i = 0; i < n; i++) {
      var fromLeft = i % 2 === 0;
      parts.push({
        x: fromLeft ? -10 : w + 10, y: h * (0.55 + Math.random() * 0.4),
        vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 7) * (w / 1400 + 0.4),
        vy: -(6 + Math.random() * 9) * (h / 900 + 0.3),
        r: 3 + Math.random() * 5, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
        c: COLORS[Math.floor(Math.random() * COLORS.length)], life: 0, max: 160 + Math.random() * 120
      });
    }
    if (!fxRunning) { fxRunning = true; requestAnimationFrame(step); }
  }
  function step() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life++;
      p.vy += 0.16; p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      var a = Math.max(0, 1 - p.life / p.max);
      if (a <= 0 || p.y > innerHeight + 40) { parts.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r, -p.r * 0.35, p.r * 2, p.r * 0.7);
      ctx.restore();
    }
    if (parts.length) requestAnimationFrame(step);
    else { fxRunning = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  // ---------- 全屏 / 鼠标隐藏 / 防息屏 ----------
  var tools = document.getElementById('tools');
  var hideT = null;
  function wake() {
    tools.classList.remove('hidden');
    document.body.classList.remove('hide-cursor');
    if (hideT) clearTimeout(hideT);
    hideT = setTimeout(function () { tools.classList.add('hidden'); document.body.classList.add('hide-cursor'); }, 3000);
  }
  addEventListener('mousemove', wake);
  addEventListener('touchstart', wake);
  wake();
  function toggleFs() {
    var d = document;
    if (d.fullscreenElement || d.webkitFullscreenElement) {
      (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    } else {
      var el = d.documentElement;
      var fn = el.requestFullscreen || el.webkitRequestFullscreen;
      if (fn) fn.call(el);
    }
  }
  document.getElementById('fsBtn').addEventListener('click', toggleFs);
  addEventListener('dblclick', toggleFs);
  addEventListener('keydown', function (e) { if (e.key === 'f' || e.key === 'F') toggleFs(); });
  var lock = null;
  function keepAwake() {
    try {
      if (navigator.wakeLock && document.visibilityState === 'visible') {
        navigator.wakeLock.request('screen').then(function (l) { lock = l; }).catch(function () {});
      }
    } catch (e) {}
  }
  keepAwake();
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { keepAwake(); schedulePoll(0); if (!ws && !wsGaveUp) connectWs(); }
  });

  poll();
  connectWs();
})();
</script>
</body>
</html>`
