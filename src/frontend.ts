// 照片墙页面（只读版：上传/删除已收敛到小程序「管理后台」）
// 注意：这是模板字符串，内嵌脚本里不要用反引号和 ${}
export const page = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>照片墙</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    background: #f6f7fb; color: #24292f; min-height: 100vh;
  }
  .container { max-width: 960px; margin: 0 auto; padding: 32px 20px 64px; }
  header { text-align: center; margin-bottom: 28px; }
  header h1 { font-size: 28px; }
  header p { color: #6b7280; margin-top: 8px; font-size: 14px; }
  .gallery {
    display: grid; gap: 16px;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
  .photo {
    background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
    overflow: hidden; transition: transform 0.15s, box-shadow 0.15s;
  }
  .photo:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08); }
  .photo img { width: 100%; height: 180px; object-fit: cover; display: block; }
  .photo .meta { padding: 12px; }
  .photo .meta .name { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .photo .meta .date { font-size: 12px; color: #9ca3af; margin-top: 2px; }
  .empty { text-align: center; color: #9ca3af; padding: 48px 0; grid-column: 1 / -1; }
  .error { text-align: center; color: #dc2626; padding: 48px 0; grid-column: 1 / -1; }
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>📷 照片墙</h1>
    <p>图片存于 ImgBB，记录存于 Cloudflare D1 · 上传/删除请在小程序「管理后台」操作</p>
  </header>

  <div id="gallery" class="gallery"></div>
</div>

<script>
  var gallery = document.getElementById('gallery');

  // SQLite 的 datetime('now') 是 UTC，转成本地时间显示
  function fmtDate(s) {
    var d = new Date(String(s).replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return s;
    return d.toLocaleString('zh-CN', { hour12: false });
  }

  function renderCard(img) {
    var card = document.createElement('div');
    card.className = 'photo';

    var a = document.createElement('a');
    a.href = img.url;
    a.target = '_blank';
    a.rel = 'noopener';
    var image = document.createElement('img');
    image.src = img.thumb_url || img.url;
    image.loading = 'lazy';
    image.alt = img.title || 'photo';
    a.appendChild(image);
    card.appendChild(a);

    var meta = document.createElement('div');
    meta.className = 'meta';
    var name = document.createElement('div');
    name.className = 'name';
    name.textContent = img.title || '未命名';
    var date = document.createElement('div');
    date.className = 'date';
    date.textContent = fmtDate(img.created_at);
    meta.appendChild(name);
    meta.appendChild(date);
    card.appendChild(meta);
    return card;
  }

  function load() {
    fetch('/api/images')
      .then(function (r) { return r.json(); })
      .then(function (list) {
        gallery.innerHTML = '';
        if (!list.length) {
          var empty = document.createElement('div');
          empty.className = 'empty';
          empty.textContent = '还没有照片，请在小程序管理后台上传 ✨';
          gallery.appendChild(empty);
          return;
        }
        for (var i = 0; i < list.length; i++) {
          gallery.appendChild(renderCard(list[i]));
        }
      })
      .catch(function () {
        gallery.innerHTML = '<div class="error">加载照片失败</div>';
      });
  }

  load();
</script>
</body>
</html>`
