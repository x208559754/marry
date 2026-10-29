// 照片墙页面（单文件 HTML/CSS/JS，由 Hono 直接返回）
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
  .card {
    background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
    padding: 20px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
  form { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  input[type="text"] {
    flex: 1; min-width: 180px; padding: 10px 12px;
    border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px;
  }
  input[type="file"] { flex: 2; min-width: 220px; font-size: 14px; }
  button {
    padding: 10px 20px; border: 0; border-radius: 8px;
    background: #2563eb; color: #fff; font-size: 14px; cursor: pointer;
  }
  button:hover { background: #1d4ed8; }
  button:disabled { background: #93c5fd; cursor: not-allowed; }
  #status { margin-top: 12px; font-size: 14px; min-height: 20px; }
  #status.ok { color: #16a34a; }
  #status.err { color: #dc2626; }
  .gallery {
    margin-top: 32px; display: grid; gap: 16px;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
  .photo {
    background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
    overflow: hidden; transition: transform 0.15s, box-shadow 0.15s;
  }
  .photo:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08); }
  .photo img { width: 100%; height: 180px; object-fit: cover; display: block; }
  .photo .meta { padding: 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .photo .meta .t { overflow: hidden; }
  .photo .meta .name { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .photo .meta .date { font-size: 12px; color: #9ca3af; margin-top: 2px; }
  .photo .del {
    border: 0; background: transparent; color: #9ca3af;
    cursor: pointer; padding: 6px; font-size: 15px;
  }
  .photo .del:hover { background: transparent; color: #dc2626; }
  .empty { text-align: center; color: #9ca3af; padding: 48px 0; grid-column: 1 / -1; }
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>📷 照片墙</h1>
    <p>图片存于 ImgBB，记录存于 Cloudflare D1 · Hono on Workers</p>
  </header>

  <div class="card">
    <form id="upload-form">
      <input type="file" id="file" accept="image/*" required>
      <input type="text" id="title" placeholder="给照片起个名字（可选）" maxlength="50">
      <button type="submit" id="submit-btn">上传</button>
    </form>
    <div id="status"></div>
  </div>

  <div id="gallery" class="gallery"></div>
</div>

<script>
  var gallery = document.getElementById('gallery');
  var statusEl = document.getElementById('status');
  var form = document.getElementById('upload-form');
  var fileInput = document.getElementById('file');
  var titleInput = document.getElementById('title');
  var submitBtn = document.getElementById('submit-btn');

  function setStatus(text, ok) {
    statusEl.textContent = text || '';
    statusEl.className = text ? (ok ? 'ok' : 'err') : '';
  }

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

    var t = document.createElement('div');
    t.className = 't';
    var name = document.createElement('div');
    name.className = 'name';
    name.textContent = img.title || '未命名';
    var date = document.createElement('div');
    date.className = 'date';
    date.textContent = fmtDate(img.created_at);
    t.appendChild(name);
    t.appendChild(date);
    meta.appendChild(t);

    var del = document.createElement('button');
    del.className = 'del';
    del.title = '删除';
    del.textContent = '✕';
    del.onclick = function () { removeImage(img.id); };
    meta.appendChild(del);

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
          empty.textContent = '还没有照片，上传第一张吧 ✨';
          gallery.appendChild(empty);
          return;
        }
        for (var i = 0; i < list.length; i++) {
          gallery.appendChild(renderCard(list[i]));
        }
      })
      .catch(function () { setStatus('加载照片列表失败', false); });
  }

  function removeImage(id) {
    if (!confirm('确定删除这张照片吗？')) return;
    fetch('/api/images/' + id, { method: 'DELETE' })
      .then(function (r) {
        if (!r.ok) throw new Error('删除失败');
        load();
      })
      .catch(function (e) { setStatus(e.message, false); });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var file = fileInput.files[0];
    if (!file) return;
    if (file.size > 32 * 1024 * 1024) {
      setStatus('图片不能超过 32MB（ImgBB 限制）', false);
      return;
    }
    var fd = new FormData();
    fd.append('file', file);
    fd.append('title', titleInput.value);

    submitBtn.disabled = true;
    submitBtn.textContent = '上传中…';
    setStatus('正在上传：' + file.name, true);

    fetch('/api/images', { method: 'POST', body: fd })
      .then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok) throw new Error(data.error || '上传失败');
          setStatus('上传成功 ✔', true);
          form.reset();
          load();
        });
      })
      .catch(function (err) {
        setStatus('上传失败：' + err.message, false);
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = '上传';
      });
  });

  load();
</script>
</body>
</html>`
