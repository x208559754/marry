// wxapp/miniprogram/utils/qiniu-upload.js — 视频直传七牛：上传前自动压缩画质，按套餐上限校验大小，凭证由服务端签发。
const api = require('./api.js');
const media = require('./media.js');

var DEFAULT_VIDEO_MAX_MB = 100;

function getFileSizeBytes(filePath) {
  return new Promise(function (resolve) {
    if (!filePath || typeof wx.getFileSystemManager !== 'function') {
      resolve(0);
      return;
    }
    try {
      wx.getFileSystemManager().getFileInfo({
        filePath: filePath,
        success: function (res) {
          resolve(Number(res && res.size) || 0);
        },
        fail: function () {
          resolve(0);
        }
      });
    } catch (e) {
      resolve(0);
    }
  });
}

// 上传前自动压缩视频画质（medium 档位：兼顾手机端清晰度与体积，大幅节省流量与上传耗时）
function compressVideoForUpload(filePath) {
  return getFileSizeBytes(filePath).then(function (origBytes) {
    if (typeof wx.compressVideo !== 'function') {
      return { filePath: filePath, sizeBytes: origBytes, compressed: false };
    }
    return new Promise(function (resolve) {
      wx.compressVideo({
        src: filePath,
        quality: 'medium',
        success: function (res) {
          var outPath = res && res.tempFilePath;
          if (!outPath) {
            resolve({ filePath: filePath, sizeBytes: origBytes, compressed: false });
            return;
          }
          // 微信 wx.compressVideo 返回的 res.size 单位为 KB，优先用 getFileInfo 获取精确字节数
          getFileSizeBytes(outPath).then(function (outBytes) {
            var compBytes = outBytes || (Number(res.size) > 0 ? Math.round(Number(res.size) * 1024) : 0);
            if (origBytes > 0 && compBytes > 0 && compBytes >= origBytes) {
              resolve({ filePath: filePath, sizeBytes: origBytes, compressed: false });
            } else {
              resolve({ filePath: outPath, sizeBytes: compBytes || origBytes, compressed: true });
            }
          });
        },
        fail: function () {
          // 开发者工具或部分机型不支持压缩时降级为原视频
          resolve({ filePath: filePath, sizeBytes: origBytes, compressed: false });
        }
      });
    });
  });
}

function uploadVideo(filePath, title, onProgress, opts) {
  if (!filePath) return Promise.reject(new Error('请选择要上传的视频'));
  opts = opts || {};
  var notifyStage = function (stage) {
    if (typeof opts.onStage === 'function') opts.onStage(stage);
  };
  return api.getVideoUploadToken({ gallery: opts.gallery }).then(function (t) {
    if (!t || !t.token || !t.key || !t.uploadUrl) {
      throw new Error((t && t.error) || '未获得七牛上传凭证');
    }
    var maxBytes = Number(t.maxBytes) || (DEFAULT_VIDEO_MAX_MB * 1024 * 1024);
    var maxMb = Number(t.maxMb) || Math.max(1, Math.round(maxBytes / (1024 * 1024)));
    notifyStage('compressing');
    return compressVideoForUpload(filePath).then(function (prepared) {
      if (prepared.sizeBytes > 0 && prepared.sizeBytes > maxBytes) {
        var actualMb = (prepared.sizeBytes / (1024 * 1024)).toFixed(1);
        throw new Error('视频压缩后仍为 ' + actualMb + 'MB，超出当前套餐上限（' + maxMb + 'MB），请缩短视频时长后重试');
      }
      notifyStage('uploading');
      return new Promise(function (resolve, reject) {
        var task = wx.uploadFile({
          url: t.uploadUrl,
          filePath: prepared.filePath,
          name: 'file',
          formData: { token: t.token, key: t.key },
          success: function (res) {
            var body = {};
            try { body = typeof res.data === 'string' ? JSON.parse(res.data || '{}') : (res.data || {}); } catch (e) {}
            if (res.statusCode < 200 || res.statusCode >= 300) {
              if (res.statusCode === 413 || /fsize/i.test(String(body && body.error || ''))) {
                reject(new Error('视频大小超出当前套餐上限（' + maxMb + 'MB），请缩短时长后重试'));
                return;
              }
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
  });
}


function formatKbLabel(kb) {
  var n = Math.max(1, Math.round(Number(kb) || 500));
  return n >= 1024 && n % 1024 === 0 ? (n / 1024) + 'MB' : n + 'KB';
}

function formatBytesLabel(bytes) {
  var kb = Math.ceil((Number(bytes) || 0) / 1024);
  return kb >= 1024 ? (kb / 1024).toFixed(2) + 'MB' : kb + 'KB';
}

function compressImageOnce(filePath, quality, compressedWidth) {
  return new Promise(function (resolve) {
    if (typeof wx.compressImage !== 'function') {
      resolve(null);
      return;
    }
    var params = {
      src: filePath,
      quality: quality,
      success: function (res) {
        resolve((res && res.tempFilePath) || null);
      },
      fail: function () {
        resolve(null);
      }
    };
    if (compressedWidth) params.compressedWidth = compressedWidth;
    wx.compressImage(params);
  });
}

// 图片超限时按画质阶梯自动压缩，尽可能保留清晰度并压到套餐单图上限以内
function compressImageToLimit(filePath, maxBytes) {
  return getFileSizeBytes(filePath).then(function (origBytes) {
    if (!maxBytes || (origBytes > 0 && origBytes <= maxBytes)) {
      return { filePath: filePath, sizeBytes: origBytes, compressed: false };
    }
    if (typeof wx.compressImage !== 'function') {
      return { filePath: filePath, sizeBytes: origBytes, compressed: false };
    }
    var steps = [
      { quality: 75, width: 1920 },
      { quality: 55, width: 1440 },
      { quality: 38, width: 1080 },
      { quality: 25, width: 800 }
    ];
    var best = { filePath: filePath, sizeBytes: origBytes, compressed: false };
    var idx = 0;
    function nextStep() {
      if (idx >= steps.length) return Promise.resolve(best);
      var st = steps[idx++];
      return compressImageOnce(filePath, st.quality, st.width).then(function (outPath) {
        if (!outPath) return nextStep();
        return getFileSizeBytes(outPath).then(function (outBytes) {
          if (outBytes > 0 && (!best.sizeBytes || outBytes < best.sizeBytes)) {
            best = { filePath: outPath, sizeBytes: outBytes, compressed: true };
          }
          if (best.sizeBytes > 0 && best.sizeBytes <= maxBytes) {
            return best;
          }
          return nextStep();
        });
      });
    }
    return nextStep();
  });
}

function uploadImageWithLimit(filePath, title, opts) {
  opts = opts || {};
  var maxKb = Number(opts.maxImageKb) || 0;
  var maxBytes = maxKb > 0 ? maxKb * 1024 : 0;
  return compressImageToLimit(filePath, maxBytes).then(function (prepared) {
    if (maxBytes > 0 && prepared.sizeBytes > 0 && prepared.sizeBytes > maxBytes) {
      var err = new Error('图片压缩后仍为 ' + formatBytesLabel(prepared.sizeBytes) + '，超出当前套餐单图上限（' + formatKbLabel(maxKb) + '）');
      if (opts.canUpgrade) err.needUpgrade = true;
      throw err;
    }
    if (opts.gallery === 0) return api.uploadMedia(prepared.filePath, title);
    return api.uploadPhoto(prepared.filePath, title);
  });
}

function uploadChosenFile(file, title, onProgress, opts) {
  opts = opts || {};
  if (!file || !file.tempFilePath) return Promise.reject(new Error('请选择要上传的文件'));
  if (media.isVideoFile(file)) {
    return uploadVideo(file.tempFilePath, title, onProgress, opts);
  }
  return uploadImageWithLimit(file.tempFilePath, title, opts);
}

function uploadAudio(filePath, title, onProgress, filename) {
  if (!filePath) return Promise.reject(new Error('请选择要上传的音频'));
  return api.getMusicUploadToken(filename || '').then(function (t) {
    if (!t || !t.token || !t.key || !t.uploadUrl) {
      var err = new Error((t && t.error) || '未获得音频上传凭证');
      if (t && t.needUpgrade) err.needUpgrade = true;
      throw err;
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
          api.saveMusic({ key: key, title: title || '' }).then(resolve, reject);
        },
        fail: function (err) {
          reject(new Error((err && err.errMsg) || '七牛上传失败'));
        }
      });
      if (task && typeof task.onProgressUpdate === 'function' && typeof onProgress === 'function') {
        task.onProgressUpdate(function (p) { onProgress(p.progress || 0); });
      }
    });
  });
}

module.exports = { uploadVideo: uploadVideo, uploadChosenFile: uploadChosenFile, uploadAudio: uploadAudio };

