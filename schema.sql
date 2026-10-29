-- 照片表：保存 ImgBB 返回的图片信息
CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  imgbb_id TEXT NOT NULL,      -- ImgBB 上的图片 ID
  title TEXT,                  -- 用户填写的标题（可选）
  url TEXT NOT NULL,           -- 原图地址（i.ibb.co/...）
  thumb_url TEXT NOT NULL,     -- 缩略图地址
  delete_url TEXT,             -- ImgBB 提供的删除链接
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
