// wxapp/miniprogram/utils/qiniu-upload.js — 视频直传七牛：凭证由服务端签发，上传地址不写死。
const api = require('./api.js');
const media = require('./media.js');

function uploadVideo(filePath, title, onProgress, opts) {
  if (!filePath) return Promise.reject(new Error('请选择要上传的视频'));
  opts = opts || {};
  return api.getVideoUploadToken({ gallery: opts.gallery }).then(function (t) {
    if (!t || !t.token || !t.key || !t.uploadUrl) {
      throw new Error((t && t.error) || '未获得七牛上传凭证');
    }
    return new Promise(function (resolve, reject) {
      var task = wx.uploadFile({
        url: t.uploadUrl,
        filePath: filePath,
        name: 'file',
        formData: { token: t.token, key: t.key },
        success: function (res) {
          var body = {};
          try { body = typeof res.data === 'string' ? JSON.parse(res.data || '{}') : (res.data || {}); } catch (e) {}
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error((body && (body.error || body.error_code)) || ('七牛上传失败（HTTP ' + res.statusCode + '）')));
            return;
          }
          var key = (body && body.key) || t.key;
          api.saveVideo({ key: key, title: title || '', gallery: opts.gallery }).then(resolve, reject);
        },
        fail: function (err) {
          reject(new Error((err && err.errMsg) || '七牛上传失败'));
        }
      });
      if (task && typeof task.onProgressUpdate === 'function' && typeof onProgress === 'function') {
        task.onProgressUpdate(function (p) {
          onProgress(p.progress || 0);
        });
      }
    });
  });
}


function uploadChosenFile(file, title, onProgress, opts) {
  opts = opts || {};
  if (!file || !file.tempFilePath) return Promise.reject(new Error('请选择要上传的文件'));
  if (media.isVideoFile(file)) {
    return uploadVideo(file.tempFilePath, title, onProgress, opts);
  }
  if (opts.gallery === 0) return api.uploadMedia(file.tempFilePath, title);
  return api.uploadPhoto(file.tempFilePath, title);
}

module.exports = { uploadVideo: uploadVideo, uploadChosenFile: uploadChosenFile };
