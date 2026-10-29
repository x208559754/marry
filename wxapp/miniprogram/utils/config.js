// utils/config.js — 后端地址唯一配置点
// 本地联调：用 http://127.0.0.1:8787（开发者工具「详情 → 本地设置」勾选“不校验合法域名”）
// 真机预览：改成电脑的局域网 IP，如 http://192.168.1.100:8787（需 wrangler dev --ip 0.0.0.0 启动）
// 线上正式：改成已绑定 Cloudflare Worker 的备案域名，如 https://wedding.example.com
module.exports = {
  BASE_URL: 'http://127.0.0.1:8787'
};
