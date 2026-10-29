# 浪漫满溢·原生微信小程序婚礼请柬

## 🎯 项目特点
- **纯原生微信小程序**：基于微信官方 WXML、WXSS、JS 原生架构，绝非网页 WebView 嵌套。
- **微信官方授权登录**：
  - 支持微信标准头像选择 (`open-type="chooseAvatar"`) 与微信昵称填写 (`type="nickname"`)。
  - 支持微信原生一键手机号授权绑定 (`open-type="getPhoneNumber"`，后台自动安全解密与换取手机号)。
- **小程序即前端亦是后台**：
  - 普通宾客享受沉浸式婚礼请柬浏览、大片相册、一键地图导航、出席回执、弹幕留言互动。
  - 婚礼主人可通过口令（默认 8888）进入内置管理后台，查看 Notion 实时回执名单、统计人数与车次、上传照片至 Notion。
- **Notion 作为全栈数据库与资源库**：
  - **微信自动登录与 Notion 比对**：小程序静默执行 `wx.login` 获取 OpenID，后端自动在 Notion RSVP 数据库中比对匹配。若已在名单中（或已提交过回执），自动识别宾客身份并恢复状态；
  - **仅需存储 OpenID**：Notion RSVP 数据库自动补齐 `OpenID` 属性列，仅存储 OpenID 即可完成微信用户身份唯一标识与鉴权；
  - **宾客名单自动绑定**：新人可在 Notion 预填宾客姓名或手机号，宾客登录或填写入场信息时自动与该行比对并绑定 OpenID；
  - 宾客回执 (RSVP) 实时写入 Notion RSVP Database。
  - 弹幕留言实时写入 Notion Blessings Database。
  - 婚纱照片上传并存储至 Notion 资源库并在小程序画廊中无缝展示。

---

## 🚀 导入与运行指南 (微信开发者工具)

### 1. 下载或解压工程
在 Web 端点击**「一键下载微信小程序工程包 (ZIP)」**并解压，解压后目录结构如下：
```text
miniprogram/
├── project.config.json    # 小程序项目配置
├── app.json               # 页面路由与 tabBar 配置
├── app.js                 # 全局逻辑、登录与 Notion 交互
├── app.wxss               # 婚礼主题样式
├── utils/                 # 工具封装 (Notion, 微信专属API)
└── pages/
    ├── index/             # 婚礼请柬主页与倒计时
    ├── story/             # 爱情历程故事轴
    ├── gallery/           # Notion 婚纱大片展卷
    ├── schedule/          # 盛典日程与微信原生地图导航
    ├── rsvp/              # 宾客回执 (微信登录与一键手机号)
    ├── blessings/         # 祝福弹幕与留言墙
    └── admin/             # 小程序内置管理后台 (查看回执与上传照片)
```

### 2. 导入到微信开发者工具
1. 打开 [微信开发者工具 (WeChat DevTools)](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. 点击 **「导入项目」** (Import Project)。
3. **目录**选择当前解压出的 `miniprogram` 文件夹。
4. **AppID**：可填写您在微信公众平台申请的真实小程序 AppID，或者选择**「测试号 / 游客模式」**。
5. **项目名称**：填写 `wedding-invitation`。
6. 点击**「确定」**即可立即在模拟器中看到婚礼请柬！

### 3. 本地调试技巧 (重要)
在「微信开发者工具」右上角点击 **「详情」 -> 「本地设置」**：
- 勾选 **「不校验合法域名、web-view（业务域名）、TLS版本以及HTTPS证书」**。
- 这样在开发调试时，小程序可直接与后端 API 及 Notion 实时通信，无需等待域名白名单配置！

### 4. 正式生产环境服务地址说明
- **正式生产地址 (Shared App URL)**：
  `https://ais-pre-tu3wda4ph65z74rogikrl2-267716153838.asia-northeast1.run.app`
  *(无需开发者登录态，对外公开可访问的标准生产环境接口)*
- **开发预览地址 (Dev Preview)**：
  `https://ais-dev-tu3wda4ph65z74rogikrl2-267716153838.asia-northeast1.run.app`
- **一键下载 ZIP**：系统在打包下载时已自动将 `app.js` 与 `notion.js` 的接口地址设为正式生产地址；
- **自定义正式域名**：若您将后端部署到自己的独立服务器或微信云托管，只需在 `app.js` 的 `globalData.apiBase` 改为您自己的域名。

### 5. 正式上线与生产配置
正式提交微信公众平台审核与上线时：
1. 登录 [微信公众平台 (mp.weixin.qq.com)](https://mp.weixin.qq.com)。
2. 在 **「开发」 -> 「开发管理」 -> 「开发设置」 -> 「服务器域名」** 中：
   - 将正式线上域名（如 `https://ais-pre-tu3wda4ph65z74rogikrl2-267716153838.asia-northeast1.run.app` 或您的独立域名）添加到：
     - `request合法域名`
     - `uploadFile合法域名`
3. 在开发者工具中点击 **「上传」**，提交审核发布即可！
