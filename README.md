# marry · 照片墙 + 婚礼小程序后端

一个 **Hono + Cloudflare Workers + D1 + ImgBB** 的项目，包含两部分：

- **照片墙网页**（`/`）：浏览相册（只读），管理与上传收敛到小程序内。
- **婚礼小程序后台 API**（`/api/*`）：为 `wxapp/miniprogram`（微信小程序婚礼请柬）提供微信登录、婚礼配置、宾客回执（RSVP）、祝福墙、相册管理、手机号换取等服务。

> 微信小程序：见 `wxapp/miniprogram/`（用微信开发者工具导入 `wxapp/` 目录，`miniprogramRoot` 已指向 `miniprogram/`）。

## 项目结构

```
├── src/
│   ├── index.ts       # Hono 应用：照片接口 + 挂载婚礼 API + 照片墙页面
│   ├── wedding.ts     # 婚礼小程序全部 API（登录/配置/回执/祝福/手机号）
│   ├── auth.ts        # 登录 token 签发校验（HMAC-SHA256）+ requireAuth / requireAdmin
│   └── frontend.ts    # 照片墙页面（内嵌 HTML，只读）
├── schema.sql         # D1 建表：images + users + rsvps + blessings + config
├── scripts/
│   └── export-notion.mjs   # 旧 Notion 数据一次性导出脚本（迁移用，见下）
├── wrangler.jsonc     # Wrangler 配置（D1 绑定 + 环境变量 vars）
├── .dev.vars.example  # 本地环境变量模板（复制为 .dev.vars，已 gitignore）
└── wxapp/miniprogram/ # 婚礼小程序（后端已切换到本 Worker）
```

## ⚠️ 前置要求

- **Node.js ≥ 22**（wrangler 4.x 硬性要求）
  - 本机如果用 nvm 且当前是旧版本（比如 14），先切换：`nvm use 22.17.1`
  - 注意：`nvm use` 是全局切换，跑其他老项目时记得切回去
- Cloudflare 账号（免费额度足够）
- ImgBB API Key（免费）：到 https://api.imgbb.com/ 注册获取

## 快速开始（本地开发）

```bash
# 1. 安装依赖
npm install

# 2. 创建 D1 数据库（输出 database_id 后填入 wrangler.jsonc）
npm run db:create

# 3. 初始化数据表（本地开发库；线上库部署前执行 npm run db:remote）
npm run db:local

# 4. 配置本地环境变量
cp .dev.vars.example .dev.vars
#   · IMGBB_API_KEY：必填（照片上传用）
#   · SESSION_SECRET：必填，随机字符串，生成命令见模板注释
#   · WX_MOCK_LOGIN=1：本地不配微信密钥时启用 mock 登录（可离线联调）
#   · ADMIN_OPENIDS：管理后台白名单（把 mock/s真实 openid 填这里）

# 5. 启动
npm run dev
```

打开 http://localhost:8787 是照片墙页面；小程序端联调见下。

## 微信小程序联调

1. 微信开发者工具「导入项目」，目录选 `wxapp/`。
2. 「详情 → 本地设置」勾选 **不校验合法域名**（开发/体验期直连本地或 workers.dev）。
3. 后端地址唯一配置点：`wxapp/miniprogram/utils/config.js` 的 `BASE_URL`（默认 `http://127.0.0.1:8787`）。
4. 本地未配置微信密钥时自动走 **mock 登录**（openid 形如 `wx_guest_xxx`，控制台会打印），身份保存在小程序本地，重启不变。

### 管理后台（小程序内，openid 白名单鉴权）

1. 打开小程序管理后台页面（长按首页新人姓名大标题进入），页面会显示「当前 OpenID」。
2. 把 OpenID 填进白名单：
   - 本地：`.dev.vars` 的 `ADMIN_OPENIDS=`（逗号分隔多个）→ 重启 `npm run dev`
   - 线上：`wrangler.jsonc` 的 `"ADMIN_OPENIDS"`（或 `npx wrangler secret put ADMIN_OPENIDS`）→ `npm run deploy`
3. 回到管理后台下拉刷新即可进入（白名单变更无需清登录缓存）。

后台功能：宾客回执名单与统计、相册上传/删除、婚礼信息编辑（新人/日期/酒店/联系方式）。

## API 一览

### 婚礼小程序（新）

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/login` | 无 | `{code, mockId?}` → 服务端 jscode2session → `{openid, token, exp, isAdmin, mock}` |
| GET | `/api/config` | 无 | 婚礼配置 JSON（空库返回 `{}`，小程序与内置默认值合并） |
| PUT | `/api/config` | 管理员 | 保存婚礼配置（≤100KB，字段白名单校验） |
| GET | `/api/me` | 登录 | 当前用户档案 `{matched, name, phone, blessing, rsvp, isAdmin}` |
| POST | `/api/users/sync` | 登录 | 上报昵称/手机号/祝福语；首次填名时预建初步回执 |
| POST | `/api/bind` | 登录 | 按姓名/手机号匹配新人预填名单并绑定 openid |
| POST | `/api/rsvp` | 登录(可匿名) | 提交/更新回执（按 openid upsert；无登录按手机号；带祝福自动上墙） |
| GET | `/api/rsvps` | 管理员 | 全量回执列表（后台统计用） |
| GET | `/api/blessings` | 无 | 祝福列表（倒序） |
| POST | `/api/blessings` | 登录(可匿名) | 发祝福（同 openid 同内容去重） |
| POST | `/api/blessings/:id/like` | 无 | 点赞 +1 |
| POST | `/api/wechat/phone` | 无 | 微信 `getPhoneNumber` code 换手机号（未配微信密钥时返回演示号） |

### 照片

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/images` | 无 | 照片列表（新→旧） |
| POST | `/api/images` | 管理员 | multipart：`file`（图片）、`title`（可选）；转存 ImgBB 后写 D1 |
| DELETE | `/api/images/:id` | 管理员 | 删除记录（并尽力通知 ImgBB） |

## 部署上线

```bash
npx wrangler login                                  # 登录 Cloudflare（交互一次）
npm run db:create                                   # 若还没有：创建 D1，id 填进 wrangler.jsonc
npm run db:remote                                   # 线上建表
npx wrangler secret put IMGBB_API_KEY               # 各项密钥
npx wrangler secret put WX_APPSECRET                # 小程序 AppSecret（服务端专属）
npx wrangler secret put SESSION_SECRET              # 随机长字符串
npm run deploy                                      # 部署
```

部署后得到 `xxx.workers.dev` 地址。把新人 openid 填入 `ADMIN_OPENIDS` 再 deploy 一次，管理后台即可用。
**冒烟检查**：线上 `POST /api/login` 应返回 `mock:false`（若为 `true` 说明线上漏配了 `WX_APPSECRET` 且开了 `WX_MOCK_LOGIN`，必须修正）。

### 域名与微信白名单（正式版必须）

- 微信**正式版**小程序的 `request` / `uploadFile` 合法域名必须是**已 ICP 备案的自有域名**，`workers.dev` 无法加入白名单。
- 上线路径：购买域名并备案 → 在 Cloudflare 把域名绑定到 Worker（Workers → 你的 Worker → Settings → Domains & Routes）→ 微信公众平台「开发设置 → 服务器域名」加入该域名 → 把 `wxapp/miniprogram/utils/config.js` 的 `BASE_URL` 改为该域名。
- 开发 / 体验阶段：开发者工具勾选「不校验合法域名」即可直连 `http://127.0.0.1:8787` 或 `https://xxx.workers.dev`。
- 已知限制：小程序「保存图片到相册」使用 `wx.downloadFile`，需要 downloadFile 白名单；`i.ibb.co` 无法备案加入 → 正式版该功能可能受限（仅影响保存，不影响浏览/预览）。

## 数据迁移（旧 Notion → D1，一次性）

旧版小程序把数据写在 Notion。迁移步骤（**在撤销旧 token 之前执行**）：

```bash
node scripts/export-notion.mjs       # 读 wxapp/data_store/notion_credentials.json，生成 scripts/seed.sql（已 gitignore）
npx wrangler d1 execute marry-images --local  --file=scripts/seed.sql   # 导入本地
npx wrangler d1 execute marry-images --remote --file=scripts/seed.sql   # 导入线上
```

## 安全说明

- 旧版小程序把 **Notion Integration Token 与小程序 AppSecret 硬编码在客户端**（已随代码包泄露）。新版已全部移除、改由 Worker 持密钥。
- 建议在新版验证通过后尽快：① 到 Notion 撤销该 Integration 并重建；② 在微信公众平台**重置 AppSecret**。
- 注意顺序：`wxapp/server.ts`（React 网页版遗留后端）仍依赖旧 Notion token，若仍在使用请最后再撤销，或一并停用。
- 内容安全提示：祝福/评论属用户生成内容，微信提审若被要求需接入 `msgSecCheck`（本项目暂未接入）。

## 常见问题

**Q: 上传提示「服务端未配置 IMGBB_API_KEY」？**
A：检查 `.dev.vars` 是否存在、变量名是否为 `IMGBB_API_KEY`，然后重启 `npm run dev`。

**Q: 上传提示「ImgBB 上传失败：You have been forbidden to use this website」？**
A：这个 Key 被 ImgBB 封禁了（错误码 103）。到 https://ibb.co/ 重新登录账号、在 https://api.imgbb.com/ 重新生成一个 Key，更新到 `.dev.vars` / Wrangler Secret。

**Q: 上传提示「Invalid API v1 key」？**
A：Key 复制错了，重新从 https://api.imgbb.com/ 复制一遍。

**Q: `npm run dev` 报 wrangler 需要 Node 22？**
A：本机 nvm 当前激活的是旧版 Node，执行 `nvm use 22.17.1` 后重试。

**Q: 小程序登录失败 / 管理后台进不去？**
A：依次检查：① `utils/config.js` 的 BASE_URL 是否指向已启动的后端；② 开发者工具是否勾选「不校验合法域名」；③ 管理后台场景确认 OpenID 已加入 `ADMIN_OPENIDS` 并重启/重新部署。

**Q: 怎么直接看 D1 里的数据？**

```bash
npx wrangler d1 execute marry-images --local --command "SELECT * FROM rsvps ORDER BY id DESC LIMIT 20"
npx wrangler d1 execute marry-images --local --command "SELECT * FROM blessings ORDER BY id DESC LIMIT 20"
```

**Q: 图片除了 ImgBB 还能放哪？**
A：中期可以把图床换成 Cloudflare R2（原生、免费 10GB），`images` 表加个 `provider` 列即可平滑切换，本项目暂未内置。
