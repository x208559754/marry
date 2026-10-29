// scripts/create-wedding.mjs — 创建一场婚礼（多租户）
//
// 用法：node scripts/create-wedding.mjs <wid> [新郎姓名] [新娘姓名] [管理员openid] [--local]
// 例：  node scripts/create-wedding.mjs chenxu 陈长生 徐有容 wx_abc123
//       node scripts/create-wedding.mjs test1 --local
//
// 说明：
//   · wid 是小程序码的 scene 参数（2-32 位字母/数字/下划线/中划线），扫码进入时带在小程序启动参数里
//   · 管理员（新郎/新娘的微信账号）在小程序「管理后台」页可看到自己的 OpenID，填到第 4 个参数即可
//   · 默认写线上数据库；加 --local 写本地开发库
//   · 创建完成后，管理员进入小程序管理后台 →「我的婚礼二维码」即可生成/保存专属小程序码
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const args = process.argv.slice(2);
const isLocal = args.includes('--local');
const [wid, groom = '', bride = '', adminOpenid = ''] = args.filter((a) => a !== '--local');

if (!wid || !/^[A-Za-z0-9_-]{2,32}$/.test(wid)) {
  console.error('用法: node scripts/create-wedding.mjs <wid> [新郎姓名] [新娘姓名] [管理员openid] [--local]');
  console.error('  wid 需为 2-32 位字母/数字/下划线/中划线（扫码参数）');
  process.exit(1);
}

const esc = (v) => String(v || '').replace(/'/g, "''");

// 初始配置：只放新人姓名，其余字段客户端会用内置默认值合并
const cfgObj = {};
if (groom) cfgObj.groom = { name: groom };
if (bride) cfgObj.bride = { name: bride };
const cfgJson = JSON.stringify(cfgObj);

const statements = [
  `INSERT INTO weddings (id, groom_name, bride_name, config, updated_at) VALUES ('${esc(wid)}', '${esc(groom)}', '${esc(bride)}', '${esc(cfgJson)}', datetime('now')) ` +
    'ON CONFLICT(id) DO UPDATE SET groom_name = excluded.groom_name, bride_name = excluded.bride_name, updated_at = datetime(\'now\');',
];

if (adminOpenid) {
  statements.push(
    `INSERT INTO users (openid, wedding_id, is_admin, first_seen, last_seen, login_count) VALUES ('${esc(adminOpenid)}', '${esc(wid)}', 1, datetime('now'), datetime('now'), 0) ` +
      'ON CONFLICT(openid, wedding_id) DO UPDATE SET is_admin = 1;',
  );
}

const sqlFile = path.join(os.tmpdir(), `create-wedding-${Date.now()}.sql`);
fs.writeFileSync(sqlFile, statements.join('\n'), 'utf8');

console.log(`创建婚礼：wid=${wid} | 新郎=${groom || '(未填)'} | 新娘=${bride || '(未填)'} | 管理员=${adminOpenid || '(未设)'}`);
console.log(`目标库：${isLocal ? '本地 (--local)' : '线上 (--remote)'}`);

try {
  execSync(`npx wrangler d1 execute marry-images ${isLocal ? '--local' : '--remote'} --file="${sqlFile}" -y`, {
    stdio: 'inherit',
  });
} finally {
  fs.unlinkSync(sqlFile);
}

console.log('');
console.log(`✓ 婚礼 ${wid} 已创建`);
console.log('  下一步：管理员进入小程序「管理后台」→「我的婚礼二维码」生成专属小程序码，分享给宾客扫码进入');
if (!adminOpenid) {
  console.log('  提示：还没设置管理员。把新人的 OpenID 用如下 SQL 设为管理员（或重新跑本脚本带上第 4 个参数）：');
  console.log(`  npx wrangler d1 execute marry-images --remote --command "UPDATE users SET is_admin=1 WHERE openid='<新人的openid>' AND wedding_id='${wid}';"`);
}
