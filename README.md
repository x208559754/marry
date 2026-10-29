# marry · 照片墙 + 婚礼小程序后端（多租户）

一个 **Hono + Cloudflare Workers + D1 + ImgBB** 的项目：

- **婚礼小程序后端**（`/api/*`）：微信登录、婚礼配置、宾客回执（RSVP）、祝福墙、相册、微信手机号、小程序码生成。
  **多租户**：一个小程序可服务多对新人，每场婚礼一个 `wid`（扫码短标识），所有数据完全隔离。
- **照片墙网页**（`/`）：浏览某场婚礼的相册（只读，用 `?wid=` 指定）。

> 微信小程序：见 `wxapp/miniprogram/`（微信开发者工具导入 `wxapp/` 目录，`miniprogramRoot` 已指向 `miniprogram/`）。

## 项目结构

```
├── src/
│   ├── index.ts       # Hono 应用：照片接口 + 挂载婚礼 API + 照片墙页面
│   ├── wedding.ts     # 婚礼 API（登录/配置/回执/祝福/婚礼管理/小程序码/手机号）
│   ├── auth.ts        # 登录 token（HMAC）+ 鉴权中间件（含婚礼管理员认定）
│   └── frontend.ts    # 照片墙页面（只读，需 ?wid=）
├── schema.sql         # D1 建表：weddings + users + rsvps + blessings + images + config
├── scripts/
│   ├── create-wedding.mjs      # 创建一场婚礼（多租户运营用）
│   ├── export-notion.mjs       # 旧 Notion 数据一次性导出（迁移用）
│   └── migrate-multitenant.sql # 单婚礼 → 多租户数据库迁移（非破坏性）
├── wrangler.jsonc     # Wrangler 配置（D1 绑定 + 环境变量 vars）
├── .dev.vars.example  # 本地环境变量模板（复制为 .dev.vars，已 gitignore）
└── wxapp/miniprogram/ # 婚礼小程序
```

## ⚠️ 前置要求

- **Node.js ≥ 22**（wrangler 4.x 硬性要求）
  - 本机如果用 nvm 且当前是旧版本，先切换：`nvm use 22.17.1`
  - 注意：`nvm use` 是全局切换，跑其他老项目时记得切回去
- Cloudflare 账号（免费额度足够）
- ImgBB API Key（免费）：到 https://api.imgbb.com/ 注册获取

## 快速开始（本地开发）

```bash
npm install
npm run db:create        # 首次：创建 D1 数据库，把输出的 database_id 填进 wrangler.jsonc
npm run db:local         # 本地开发库建表
cp .dev.vars.example .dev.vars
#   · IMGBB_API_KEY：必填（照片上传用）
#   · SESSION_SECRET：必填，随机字符串（生成命令见模板注释）
#   · WX_MOCK_LOGIN=1：本地不配微信密钥时启用 mock 登录（可离线联调）
#   · ADMIN_OPENIDS：平台超级管理员的 openid（逗号分隔；本地测试可先留空）
npm run dev              # 启动在 http://localhost:8787

# 本地建一场测试婚礼（否则小程序进入后是推广页）
node scripts/create-wedding.mjs demo 测试新郎 测试新娘 --local
```

## 多租户模型（wid 是什么）

| 概念 | 说明 |
| --- | --- |
| `wid` | 一场婚礼的短标识（2-32 位字母/数字/`_`/`-`），写在小程序码的 scene 参数里 |
| 扫码进入 | 小程序启动时解析 `scene`/`wid` → 所有接口带 `?wid=` → 只看得到这场婚礼的数据 |
| 没有 wid | 小程序展示**平台推广页**（无任何婚礼数据） |
| 数据隔离 | `users` 主键为 `(openid, wedding_id)`：**同一个微信在不同婚礼里是不同的用户行**（昵称/电话/祝福/管理员身份各自独立）；`rsvps`/`blessings`/`images` 也都带 `wedding_id` |
| 婚礼管理员 | 该婚礼 `users.is_admin = 1` 的账号（一般是新人的微信），只能管自己这场婚礼 |
| 平台超管 | `ADMIN_OPENIDS`（环境变量）里的 openid，可管理**所有**婚礼（运营方用） |

## 运营多场婚礼

```bash
# 1. 创建一场婚礼（wid 自定义；最后一个参数是新人的 openid，可稍后补设）
node scripts/create-wedding.mjs chenxu 陈长生 徐有容 wx_abc123
#    （改线下/本地用：加 --local）

# 2. 新人打开小程序 → 长按首页新人姓名进入管理后台 → 「我的婚礼二维码」
#    生成并保存专属小程序码（可选正式版/体验版/开发版；长按二维码保存到相册）

# 3. 把二维码发给亲友：扫码即可进入这场婚礼的请柬
#    小程序内转发分享卡片也会自动带上 wid
```

- **测试技巧**：微信开发者工具「编译模式 → 添加编译模式」，启动参数填 `wid=demo`，即可直接进入指定婚礼调试。
- **推广页文案定制**（可选）：在 D1 的 config 表插入 key=`promo` 的行，value 为 JSON：
  `{"title":"xxx","subtitle":"xxx","imageUrl":"https://..."}`（不配则用小程序内置默认样式）。

## 微信小程序联调

1. 微信开发者工具「导入项目」，目录选 `wxapp/`。
2. 「详情 → 本地设置」勾选 **不校验合法域名**（开发/体验期直连本地或 workers.dev）。
3. 后端地址唯一配置点：`wxapp/miniprogram/utils/config.js` 的 `BASE_URL`。
4. 没有扫码参数时看到的是推广页（正常）；带 `wid` 进入才会看到请柬。
5. 本地未配置微信密钥时自动走 **mock 登录**（openid 形如 `wx_guest_xxx`，控制台会打印）。

### 管理后台（小程序内）

- 入口：长按首页新人姓名大标题。
- 鉴权：婚礼管理员 = 该婚礼 `users.is_admin=1`；平台超管 = `ADMIN_OPENIDS`。
- 本地/线上给账号设婚礼管理员（二选一）：
  ```bash
  # 创建婚礼时直接指定（第 4 个参数），或：
  npx wrangler d1 execute marry-images --remote --command \
    "UPDATE users SET is_admin=1 WHERE openid='<新人的openid>' AND wedding_id='<wid>';"
  ```
- 功能：宾客回执名单与统计、相册上传/删除、婚礼信息编辑、**我的婚礼二维码**（生成/保存小程序码）。

## 部署上线

```bash
npx wrangler login
npm run db:create            # 若还没有：创建 D1，id 填进 wrangler.jsonc
npm run db:remote            # 线上建表
npx wrangler secret put IMGBB_API_KEY
npx wrangler secret put WX_APPSECRET
npx wrangler secret put SESSION_SECRET
npm run deploy
```

- 部署后得到 `xxx.workers.dev` 地址；**线上冒烟**：`POST /api/login` 应返回 `mock:false`（若为 `true` 说明线上误开了 `WX_MOCK_LOGIN`，必须关掉）。
- 小程序码（`GET /api/admin/qrcode`）需要小程序在微信侧已有对应环境的版本（正式版/体验版/开发版）；未发布前该接口会返回清晰的错误提示。

### 域名与微信白名单（正式版必须）

- 微信**正式版**小程序的 `request` / `uploadFile` 合法域名必须是**已 ICP 备案的自有域名**，`workers.dev` 无法加入白名单。
- 上线路径：购买域名并备案 → Cloudflare 绑定 Worker 自定义域名 → 微信公众平台「开发设置 → 服务器域名」加入该域名 → 把 `wxapp/miniprogram/utils/config.js` 的 `BASE_URL` 改为该域名。
- 开发 / 体验阶段：开发者工具勾选「不校验合法域名」即可。
- 已知限制：小程序「保存图片到相册」使用 `wx.downloadFile`，需要 downloadFile 白名单；`i.ibb.co` 无法备案加入 → 正式版该功能可能受限（仅影响保存，不影响浏览/预览）。

## API 一览

婚礼相关接口统一通过 `?wid=` 指定婚礼（GET/POST/PUT 一致）。

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/login` | 无 | `{code, mockId?, wid?}` → `{openid, token, exp, isAdmin, mock, wid, widExists}` |
| GET | `/api/promo` | 无 | 平台推广页配置（无 wid 时小程序展示用） |
| GET | `/api/config?wid=` | 无 | 该婚礼配置 JSON（婚礼不存在 → 404） |
| PUT | `/api/config?wid=` | 婚礼管理员 | 保存婚礼配置（≤100KB，字段白名单） |
| GET | `/api/me?wid=` | 登录 | 当前用户在该婚礼下的档案 `{matched, name, phone, blessing, rsvp, isAdmin}` |
| POST | `/api/users/sync?wid=` | 登录 | 上报昵称/手机号/祝福语；首次填名预建初步回执 |
| POST | `/api/bind?wid=` | 登录 | 按姓名/手机号绑定到新人预填名单 |
| POST | `/api/rsvp?wid=` | 登录(可匿名) | 提交/更新回执；带祝福自动上墙（去重） |
| GET | `/api/rsvps?wid=` | 婚礼管理员 | 全量回执列表 |
| GET | `/api/blessings?wid=` | 无 | 祝福列表（倒序） |
| POST | `/api/blessings?wid=` | 登录(可匿名) | 发祝福（同人同内容去重） |
| POST | `/api/blessings/:id/like` | 无 | 点赞 +1 |
| POST | `/api/wechat/phone` | 无 | 微信 `getPhoneNumber` code 换手机号 |
| GET | `/api/admin/qrcode?wid=&env=` | 婚礼管理员 | 生成该婚礼小程序码 PNG（`env`=release/trial/develop；支持 `&token=` 鉴权以便 `<image>` 展示） |
| GET | `/api/weddings` | 平台超管 | 婚礼列表（含用户数/回执数） |
| POST | `/api/weddings` | 平台超管 | 创建/更新婚礼 `{id, groomName?, brideName?, adminOpenid?, config?}` |
| GET | `/api/images?wid=` | 无 | 照片列表（按婚礼隔离） |
| POST | `/api/images?wid=` | 婚礼管理员 | multipart 上传（file/title）→ ImgBB → D1 |
| DELETE | `/api/images/:id?wid=` | 婚礼管理员 | 删除照片（校验归属） |

## 数据迁移（旧 Notion → D1，一次性）

```bash
node scripts/export-notion.mjs    # 读 wxapp/data_store/notion_credentials.json，生成 scripts/seed.sql（已 gitignore）
npx wrangler d1 execute marry-images --local  --file=scripts/seed.sql
npx wrangler d1 execute marry-images --remote --file=scripts/seed.sql
# 再把数据归入某场婚礼（如 demo）：参考 scripts/migrate-multitenant.sql 第 5 步
```

## 安全说明

- 旧版小程序把 **Notion Integration Token 与小程序 AppSecret 硬编码在客户端**（已随代码包泄露）。新版已全部移除、密钥只在 Worker。
- 建议：到 Notion 撤销旧 Integration 并重建；微信公众平台**重置 AppSecret**。
- `wxapp/server.ts`（React 网页版遗留后端）仍依赖旧 Notion token，弃用前别先撤。
- 内容安全：祝福/评论属用户生成内容，微信提审若被要求需接入 `msgSecCheck`（本项目暂未接入）。

## 常见问题

**Q: 上传提示「服务端未配置 IMGBB_API_KEY」？**
A：检查 `.dev.vars` 是否存在、变量名是否为 `IMGBB_API_KEY`，然后重启 `npm run dev`。

**Q: 「ImgBB 上传失败：You have been forbidden to use this website」？**
A：Key 被 ImgBB 封禁（错误码 103）。重新登录 https://ibb.co/ 后在 https://api.imgbb.com/ 重新生成 Key。

**Q: `npm run dev` 报 wrangler 需要 Node 22？**
A：`nvm use 22.17.1` 后重试。

**Q: 小程序打开是推广页？**
A：说明没有带 `wid` 进入。请通过新人分享的小程序码/分享卡片进入；调试时可在开发者工具「编译模式」里加启动参数 `wid=demo`。若扫码后提示"请柬不存在"，检查该 `wid` 是否已创建（`scripts/create-wedding.mjs`）。

**Q: 管理后台进不去？**
A：① 确认已扫码进入某场婚礼（页面会显示"当前婚礼"）；② 该账号需是这场婚礼的管理员（`users.is_admin=1`）或平台超管（`ADMIN_OPENIDS`）；③ 本地确认 BASE_URL 指对、勾选了"不校验合法域名"。

**Q: 怎么直接看 D1 里的数据？**

```bash
npx wrangler d1 execute marry-images --local --command "SELECT * FROM rsvps ORDER BY id DESC LIMIT 20"
npx wrangler d1 execute marry-images --local --command "SELECT * FROM weddings"
```

**Q: 图片除了 ImgBB 还能放哪？**
A：中期可以换成 Cloudflare R2（原生、免费 10GB），`images` 表加 `provider` 列即可平滑切换，暂未内置。
