/** 网页共用的工信部 ICP 备案号页脚。勿在此放密钥。 */

export const ICP_NUMBER = '皖ICP备2025100523号'
export const ICP_HREF = 'https://beian.miit.gov.cn/'

/** 内容页：与主体拉开间距，短页面沉底，浅色小字 */
export const icpFooterStyle = `
  .icp-beian{
    margin-top:auto;
    text-align:center;
    font-size:12px;
    line-height:1.6;
    color:var(--muted, #9ca3af);
    opacity:.62;
    padding:64px 20px 32px;
    letter-spacing:.08em;
    background:transparent;
  }
  .icp-beian::before{
    content:"";
    display:block;
    width:40px;
    height:1px;
    margin:0 auto 18px;
    background:currentColor;
    opacity:.55;
  }
  .icp-beian a{color:inherit;text-decoration:none}
  .icp-beian a:hover,.icp-beian a:focus{text-decoration:underline}
  footer .icp-beian{padding:28px 20px 0;opacity:.7}
`

/** 抽奖大屏：贴在视口最底，浅白字，不与奖项重叠 */
export const icpFooterOverlayStyle = `
  .icp-beian{
    position:fixed;
    left:0;right:0;bottom:0;
    z-index:6;
    text-align:center;
    font-size:12px;
    line-height:1.4;
    color:rgba(255,255,255,.35);
    padding:8px 88px calc(2.2vmin + 14px);
    margin:0;
    pointer-events:none;
    letter-spacing:.08em;
  }
  .icp-beian a{color:inherit;text-decoration:none;pointer-events:auto}
  .icp-beian a:hover,.icp-beian a:focus{text-decoration:underline;color:rgba(255,255,255,.5)}
  body[data-theme="pink"] .icp-beian,
  body[data-theme="champagne"] .icp-beian{color:rgba(70,40,30,.38)}
  body[data-theme="pink"] .icp-beian a:hover,
  body[data-theme="pink"] .icp-beian a:focus,
  body[data-theme="champagne"] .icp-beian a:hover,
  body[data-theme="champagne"] .icp-beian a:focus{color:rgba(70,40,30,.55)}
  .stage{padding-bottom:calc(5vmin + 48px)}
`

/** 平台总后台：贴在视口底部，与卡片、登录框留出空隙 */
export const icpFooterPlatformStyle = `
  .icp-beian{
    position:fixed;
    left:210px;right:0;bottom:0;
    z-index:40;
    text-align:center;
    font-size:12px;
    line-height:1.6;
    color:#8c7f78;
    opacity:.7;
    padding:16px 16px 14px;
    margin:0;
    pointer-events:none;
    letter-spacing:.08em;
    background:linear-gradient(180deg,transparent,rgba(250,246,240,.92) 36%);
  }
  .icp-beian::before{
    content:"";
    display:block;
    width:40px;
    height:1px;
    margin:0 auto 12px;
    background:currentColor;
    opacity:.45;
  }
  .icp-beian a{color:inherit;text-decoration:none;pointer-events:auto}
  .icp-beian a:hover,.icp-beian a:focus{text-decoration:underline}
  #login:not(.hide)~.icp-beian{
    left:0;
    color:rgba(255,250,244,.62);
    opacity:1;
    background:linear-gradient(180deg,transparent,rgba(125,23,28,.55) 40%);
  }
  #login{padding-bottom:72px}
  main{padding-bottom:80px}
  @media(max-width:860px){.icp-beian{left:0}main{padding-bottom:80px}}
`

export const icpFooterHtml =
  `<p class="icp-beian"><a href="${ICP_HREF}" target="_blank" rel="noopener noreferrer">${ICP_NUMBER}</a></p>`
