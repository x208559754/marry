# 自建服务器部署（Node + MySQL + ImgBB）

`src/` 里的 Hono 应用原样跑在 Node 上：`d1-mysql.ts` 用 mysql2 模拟 D1 接口并把 SQLite 写法改写为 MySQL；
`node.ts` 是入口，另外提供抽奖大屏 WebSocket `/api/lottery/ws?wid=`（抽奖状态写库后推送给该场所有大屏）。

## 构建
    cd server && npm install && npm run build   # 产物 dist/server.mjs（单文件，依赖已打包）

## 服务器（https://youxitie.site → 82.156.169.200，Ubuntu 26.04）
- 程序：/home/ubuntu/youxi/dist/server.mjs，systemd 服务 `youxi`（监听 127.0.0.1:3000）
- 环境变量：/home/ubuntu/youxi/.env（600 权限，仅在服务器上；见下方变量名）
- Caddy：/etc/caddy/Caddyfile，youxitie.site 443 反代到 3000（含 WebSocket / wss），www 301 到主域名；
  证书为腾讯云 TrustAsia DV（/etc/caddy/ssl/，到期 2027-02-15，需续期后替换并 `systemctl reload caddy`）；:80 IP 访问暂时保留兜底
- MySQL 8.4：库 `youxi`，用户 `youxi`@localhost，只监听 127.0.0.1；表结构 `schema.mysql.sql`

.env 变量：DATABASE_URL、IMGBB_API_KEY、WX_APPID、WX_APPSECRET、WX_MOCK_LOGIN、SESSION_SECRET、ADMIN_OPENIDS、HOST、PORT
  七牛视频直传（密钥只放环境变量，切勿写入仓库）：QINIU_AK、QINIU_SK、QINIU_BUCKET（youxisite）、QINIU_UPLOAD_URL（默认 https://up-z2.qiniup.com，华南 z2）、可选 QINIU_RS_URL；
  访问域名存在数据库 `config` 表、键名 `qiniu_domain`（默认 https://qn.youxitie.site），运行时读取并短缓存，改库即生效、不必重启。环境变量 QINIU_DOMAIN 仅作兜底。可在 `/platform`「设置」里修改。

### 平台总后台
- 网址：`https://youxitie.site/platform`（接口 `/api/platform/*`），用 `PLATFORM_ADMIN_PASSWORD` 登录（≥12 位，改密码后旧登录立即失效）
- 功能：数据概览（含各套餐婚礼数）、婚礼（停用/启用、手动设置套餐与到期日、单独调整权益、用量与套餐变更记录）、用户（显示各婚礼套餐）、
  套餐管理（新增/编辑/上下架/删除多档套餐）、订单（标记退款）、内容审核、祝福/弹幕、敏感词

### 多档套餐（src/billing.ts）
- 套餐定义在 `plans` 表：编码、名称、档位 level、售价、划线价、有效天数（0=永久）、上架、权益文案，以及权益 ent：
  相册上限、抽奖奖项/人数上限（0=不限）、可用主题、平台标识 watermark、专属标识 badge、氛围特效 effect（none/petals/gold）、开场动画 opening
- 首次启动自动按旧 `config.pricing` 写入 免费版 / 高级版 / 至尊版（至尊版默认未上架）
- 婚礼：`weddings.plan`（套餐编码）、`plan_expires_at`（到期后按免费版生效）、`plan_overrides`（单场覆盖权益 JSON）、`plan_note`
- 升级：只能购买档位更高的套餐，按新套餐全价计费；所有变更写 `plan_logs`
- 展示：`/api/config` 的 `_plan`、`/api/lottery` 的 `plan` 返回 watermark/badge/effect/opening，小程序与大屏据此渲染

### 内容安全（微信 msgSecCheck v2 / mediaCheckAsync v2）
- `MODERATION_ENABLED`=1（默认开启）；`MODERATION_FAIL_OPEN`=1（接口异常时放行并记录，=0 时拦截）
- `MODERATION_BLOCK_REVIEW`=0（“疑似”内容默认放行并进入后台待审核，=1 时直接拦截）；“违规”内容始终拦截
- `MODERATION_MOCK`=1 本地模拟：含「测试违规」→ 拦截，「测试疑似」→ 待审核
- 图片异步检测结果通过小程序「消息推送」回调：公众平台 → 开发 → 开发设置 → 消息推送，
  URL 填 `https://youxitie.site/api/wx/push`，Token 与 `.env` 的 `WX_PUSH_TOKEN` 一致，数据格式选 JSON、明文模式

### 收费 / 微信支付（APIv3 JSAPI）
- `WXPAY_MCHID` 商户号；`WXPAY_API_V3_KEY` APIv3 密钥（32 位）；`WXPAY_SERIAL_NO` 商户证书序列号
- `WXPAY_PRIVATE_KEY_PATH` 商户私钥 apiclient_key.pem 路径（放服务器、600 权限，勿入库）
- `WXPAY_NOTIFY_URL` 回调地址，**必须是 HTTPS 域名**，即 `https://youxitie.site/api/pay/notify`（已写入服务器 .env）
- 可选 `WXPAY_PUBLIC_KEY_PATH` + `WXPAY_PUBLIC_KEY_ID`（“微信支付公钥”验签模式；不填则自动下载平台证书）
- `PAY_MOCK`=1：未配置微信支付时走模拟支付（仅测试；正式收费前务必改为 0）
- 商户号需在商户平台「产品中心 → JSAPI 支付 / 小程序支付」开通，并在「AppID 账号管理」关联小程序 appid
- 数据库：启动时自动执行 `migrate.ts`（只新增表/列）。新表 `orders`、`moderation_logs`；
  新列 weddings.plan / plan_activated_at / plan_order_no / status / disabled_reason，blessings.status，images.status

## 更新发布
    npm run build
    scp dist/server.mjs ubuntu@youxitie.site:/home/ubuntu/youxi/dist/server.mjs
    ssh ubuntu@youxitie.site sudo systemctl restart youxi
