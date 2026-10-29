# 浪漫满溢 · 原生微信小程序婚礼请柬

纯原生微信小程序（WXML / WXSS / JS）婚礼请柬：开屏信封、请柬与倒计时、爱情故事、婚纱相册、盛典日程与导航、宾客回执（RSVP）、祝福弹幕墙，以及新人专属管理后台。

后端已迁移到 **Cloudflare Workers + D1**（图片转存 ImgBB），本目录通过 `utils/api.js` 调用云端 API——客户端不再包含任何 AppSecret / Notion 凭据。

## 快速开始

1. 微信开发者工具导入 `wxapp/` 目录（`miniprogramRoot` 已指向 `miniprogram/`）。
2. 「详情 → 本地设置」勾选 **不校验合法域名**（开发期直连本地服务）。
3. 先启动后端：仓库根目录执行 `npm run dev`（首次配置见根目录 README），默认地址 `http://127.0.0.1:8787`。
4. 需要切换后端地址时只改一处：`utils/config.js` 的 `BASE_URL`
   - 开发者工具：`http://127.0.0.1:8787`
   - 真机调试：电脑局域网 IP，如 `http://192.168.1.100:8787`（用 `wrangler dev --ip 0.0.0.0` 启动）
   - 线上：已绑定 Worker 的自定义域名（需 ICP 备案，见根目录 README）

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `utils/config.js` | 后端地址唯一配置点（BASE_URL） |
| `utils/api.js` | 云端 API 封装（登录、配置、相册、回执、祝福、手机号） |
| `utils/wechat.js` | 微信原生能力（拨号 / 地图导航 / 保存相册） |
| `pages/index` | 请柬（开屏火漆信封、倒计时、信笺） |
| `pages/story` | 爱情故事时间轴 |
| `pages/gallery` | 婚纱相册（图片来自云端，admin 上传） |
| `pages/schedule` | 盛典日程、地图导航、一键拨号 |
| `pages/rsvp` | 宾客回执（姓名/电话/人数/饮食/班车/祝福） |
| `pages/blessings` | 祝福弹幕墙 |
| `pages/admin` | 管理后台（OpenID 白名单鉴权） |

## 管理后台

- 入口：长按首页的新人姓名大标题（陈长生 & 徐有容 处）进入 `pages/admin/admin`
- 鉴权：微信 OpenID 白名单（服务端 `ADMIN_OPENIDS`），无口令
- 首次使用流程：
  1. 打开管理后台，页面会显示「当前 OpenID」（可一键复制）；
  2. 本地开发：把 OpenID 填入仓库根目录 `.dev.vars` 的 `ADMIN_OPENIDS`，重启 `npm run dev`；
     线上：填入 `wrangler.jsonc` 的 `ADMIN_OPENIDS`（或用 `wrangler secret put ADMIN_OPENIDS`），重新 `npm run deploy`；
  3. 回到管理后台点「重新检测权限」/下拉刷新即可进入。
- 功能：宾客回执名单与统计、相册上传/删除、婚礼信息编辑（新人信息、日期、酒店地址、联系电话）

## 注意事项

- 微信官方「获取手机号」需企业主体认证的小程序；未认证时宾客可直接手动输入手机号（已有兜底）。
- 正式版发布要求 request / uploadFile 合法域名为**已 ICP 备案的自有域名**（workers.dev 不能直接添加）；
  开发与体验阶段使用开发者工具的「不校验合法域名」即可。
- 展示图片来自 ImgBB（`i.ibb.co`）不需要域名白名单；但「保存图片到相册」用的 `wx.downloadFile` 需要
  downloadFile 白名单，正因如此该功能在正式版可能受限（仅影响保存，不影响浏览）。
