/** 网页共用的工信部 ICP 备案号页脚。勿在此放密钥。 */

export const ICP_NUMBER = '皖ICP备2025100523号'
export const ICP_HREF = 'https://beian.miit.gov.cn/'

/** 通用：居中小号灰色文字，不挡正文 */
export const icpFooterStyle = `
  .icp-beian{text-align:center;font-size:12px;line-height:1.6;color:#9ca3af;padding:12px 16px 20px;margin:0}
  .icp-beian a{color:inherit;text-decoration:none}
  .icp-beian a:hover,.icp-beian a:focus{text-decoration:underline}
`

/** 抽奖大屏：贴在底部正中，半透明、避开左右操作区 */
export const icpFooterOverlayStyle = `
  .icp-beian{position:fixed;left:0;right:0;bottom:0;z-index:5;text-align:center;font-size:11px;line-height:1.4;color:var(--muted);padding:4px 96px 7px;margin:0;pointer-events:none;letter-spacing:.04em}
  .icp-beian a{color:inherit;text-decoration:none;pointer-events:auto}
  .icp-beian a:hover,.icp-beian a:focus{text-decoration:underline;opacity:.9}
`

/** 平台总后台：贴在主栏底部；登录页用浅色字、通栏显示 */
export const icpFooterPlatformStyle = `
  .icp-beian{position:fixed;left:210px;right:0;bottom:0;z-index:40;text-align:center;font-size:12px;line-height:1.6;color:#8c7f78;padding:8px 16px 10px;margin:0;pointer-events:none}
  .icp-beian a{color:inherit;text-decoration:none;pointer-events:auto}
  .icp-beian a:hover,.icp-beian a:focus{text-decoration:underline}
  #login:not(.hide)~.icp-beian{left:0;color:rgba(255,250,244,.72)}
  @media(max-width:860px){.icp-beian{left:0}}
`

export const icpFooterHtml =
  `<p class="icp-beian"><a href="${ICP_HREF}" target="_blank" rel="noopener noreferrer">${ICP_NUMBER}</a></p>`
