// wxapp/miniprogram/utils/media.js — 按数据源判断图片 / 视频（小程序共用）
// 优先用已存的 kind；否则看 qiniu:video/ 前缀；再看网址扩展名（忽略查询串）。兼容 ImgBB 等旧的完整网址。

var VIDEO_EXT = /\.(mp4|mov|m4v|webm|avi|mkv|3gp|m3u8)$/i;

function stripUrlQuery(url) {
  return String(url || '').split('#')[0].split('?')[0];
}

function collectCandidates(item) {
  if (item == null) return [];
  if (typeof item === 'string') return [item];
  if (typeof item !== 'object') return [];
  var keys = ['url', 'image', 'src', 'thumb_url', 'thumbUrl', 'imgbb_id', 'key', 'coverImage'];
  var out = [];
  for (var i = 0; i < keys.length; i++) {
    var v = item[keys[i]];
    if (typeof v === 'string' && v) out.push(v);
  }
  return out;
}

function mediaKindOf(item) {
  if (item && typeof item === 'object') {
    var kind = String(item.kind || item.type || '').toLowerCase();
    if (kind === 'video' || kind === 'image') return kind;
  }
  var cands = collectCandidates(item);
  for (var i = 0; i < cands.length; i++) {
    var s = cands[i].trim();
    if (!s) continue;
    if (s.indexOf('qiniu:video/') === 0 || s.indexOf('qiniu:video/') !== -1) return 'video';
    if (VIDEO_EXT.test(stripUrlQuery(s))) return 'video';
  }
  return 'image';
}

function isVideoMedia(item) {
  return mediaKindOf(item) === 'video';
}

function isVideoFile(file) {
  if (!file) return false;
  if (file.fileType === 'video') return true;
  if (file.fileType === 'image') return false;
  return isVideoMedia({ url: file.tempFilePath || file.path || file.thumbTempFilePath || '' });
}

function tagMedia(item) {
  var it = item && typeof item === 'object' ? item : { url: item };
  var kind = mediaKindOf(it);
  it.kind = kind;
  it.isVideo = kind === 'video';
  return it;
}

module.exports = {
  stripUrlQuery: stripUrlQuery,
  mediaKindOf: mediaKindOf,
  isVideoMedia: isVideoMedia,
  isVideoFile: isVideoFile,
  tagMedia: tagMedia
};
