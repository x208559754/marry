# marry · 照片墙

一个 **Hono + Cloudflare Workers + D1 + ImgBB** 的入门小项目：

- 前端：一个极简照片墙页面（上传 / 浏览 / 删除）
- 后端：Hono 跑在 Cloudflare Workers 上
- 存储：图片文件转存到 ImgBB（免费图床），元数据（标题、URL、时间）存进 Cloudflare D1

## 项目结构

```
├── src/
│   ├── index.ts      # Hono 应用：路由 + D1 读写 + ImgBB 转存
│   └── frontend.ts   # 照片墙页面（内嵌 HTML/CSS/JS）
├── schema.sql        # D1 建表语句
├── wrangler.jsonc    # Wrangler 配置（D1 绑定在这里）
├── .dev.vars.example # 本地环境变量模板（ImgBB Key）
└── .dev.vars         # 本地密钥（已 gitignore，不要提交）
```

## ⚠️ 前置要求

- **Node.js ≥ 22**（wrangler 4.x 硬性要求）
  - 本机如果用 nvm 且当前是旧版本（比如 14），先切换：`nvm use 22.17.1`
  - 注意：`nvm use` 是全局切换，跑其他老项目时记得切回去
- Cloudflare 账号（免费额度足够）
- ImgBB API Key（免费）：到 https://api.imgbb.com/ 注册获取

## 快速开始

### 1️⃣ 安装依赖

```bash
npm install
```

### 2️⃣ 创建 D1 数据库

```bash
npm run db:create
```

命令会输出 `database_id`，把它填到 `wrangler.jsonc` 的 `database_id` 字段里（替换 `REPLACE_WITH_YOUR_DATABASE_ID`）。

### 3️⃣ 初始化数据表

```bash
npm run db:local    # 本地开发库（首次必须执行）
npm run db:remote   # 线上库（部署前执行一次）
```

### 4️⃣ 配置 ImgBB API Key

```bash
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars，填入你的 IMGBB_API_KEY
```

> 修改 `.dev.vars` 后需要重启 `npm run dev` 才会生效。

### 5️⃣ 启动本地开发

```bash
npm run dev
```

打开 http://localhost:8787 ，上传一张图片试试 🎉

## 部署上线

```bash
npx wrangler secret put IMGBB_API_KEY   # 配置线上密钥（只需一次）
npm run deploy
```

部署完成后会输出线上地址（`xxx.workers.dev`）。

## API 一览

| 方法   | 路径              | 说明           | 请求体                                          |
| ------ | ----------------- | -------------- | ----------------------------------------------- |
| GET    | `/`               | 照片墙页面     | -                                               |
| GET    | `/api/images`     | 照片列表（新→旧） | -                                             |
| POST   | `/api/images`     | 上传照片       | multipart：`file`（图片）、`title`（可选标题）  |
| DELETE | `/api/images/:id` | 删除照片记录   | -                                               |

## 常见问题

**Q: 上传提示「服务端未配置 IMGBB_API_KEY」？**
A：检查 `.dev.vars` 是否存在、变量名是否为 `IMGBB_API_KEY`，然后重启 `npm run dev`。

**Q: 上传提示「ImgBB 上传失败：You have been forbidden to use this website」？**
A：这个 Key 被 ImgBB 封禁了（错误码 103）。到 https://ibb.co/ 重新登录账号、在 https://api.imgbb.com/ 重新生成一个 Key，更新到 `.dev.vars`。

**Q: 上传提示「Invalid API v1 key」？**
A：Key 复制错了，重新从 https://api.imgbb.com/ 复制一遍。

**Q: `npm run dev` 报 wrangler 需要 Node 22？**
A：本机 nvm 当前激活的是旧版 Node，执行 `nvm use 22.17.1` 后重试。

**Q: 线上部署后接口报错？**
A：按顺序检查：`npx wrangler secret put IMGBB_API_KEY` 是否执行过、`npm run db:remote` 是否建过表。

**Q: 怎么直接看 D1 里的数据？**

```bash
npx wrangler d1 execute marry-images --local --command "SELECT * FROM images"
```
