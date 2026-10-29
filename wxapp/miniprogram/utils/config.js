// utils/config.js — 后端地址唯一配置点
// 当前：线上 Cloudflare Worker（密钥与迁移数据已就绪；开发者工具勾选“不校验合法域名”即可直连）
// 本地联调（mock 登录）：注释掉线上这行、改用 http://127.0.0.1:8787，并运行 npm run dev
// 真机预览：本地可用电脑局域网 IP（wrangler dev --ip 0.0.0.0）；正式版需备案域名，见根 README
module.exports = {
  // BASE_URL: 'http://127.0.0.1:8787'
  BASE_URL: 'https://marry.x208559754.workers.dev'
};
