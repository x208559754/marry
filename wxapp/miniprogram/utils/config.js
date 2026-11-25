// utils/config.js — 后端地址唯一配置点
// 当前：自建服务器 https://youxitie.site（Node + MySQL，照片走 ImgBB；Caddy + 腾讯云证书）。
// 需在小程序后台配置 request / uploadFile / downloadFile 合法域名 https://youxitie.site，socket 合法域名 wss://youxitie.site
// 旧线上（Cloudflare Worker）：https://marry.x208559754.workers.dev
// 本地联调（mock 登录）：改用 http://127.0.0.1:8787，并运行 npm run dev
module.exports = {
  // BASE_URL: 'http://127.0.0.1:8787'
  // BASE_URL: 'https://marry.x208559754.workers.dev'
  BASE_URL: 'https://youxitie.site'
};
