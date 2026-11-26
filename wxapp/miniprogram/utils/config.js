// utils/config.js — 后端地址唯一配置点
// 当前：自建服务器 https://youxitie.site（Node + MySQL，照片走 ImgBB；Caddy + 腾讯云证书）。
// 需在小程序后台配置：
//   request / socket：https://youxitie.site 与 wss://youxitie.site
//   uploadFile：https://youxitie.site（图片）以及 https://up-z2.qiniup.com（视频直传七牛；换区域后改为新的上传域名）
//   downloadFile：https://youxitie.site 以及视频访问域名（当前 https://qn.youxitie.site，该域名存在数据库 config.qiniu_domain，更换后这里和小程序后台都要同步改）
// 旧线上（Cloudflare Worker）：https://marry.x208559754.workers.dev
// 本地联调（mock 登录）：改用 http://127.0.0.1:8787，并运行 npm run dev
module.exports = {
  // BASE_URL: 'http://127.0.0.1:8787'
  // BASE_URL: 'https://marry.x208559754.workers.dev'
  BASE_URL: 'https://youxitie.site'
};
