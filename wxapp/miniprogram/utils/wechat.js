// utils/wechat.js - 微信专属能力封装（登录、手机号、头像选择、地图导航、电话拨打）

/**
 * 微信一键拨打电话
 */
function makePhoneCall(phoneNumber) {
  if (!phoneNumber) {
    wx.showToast({ title: '未提供联系电话', icon: 'none' });
    return;
  }
  wx.makePhoneCall({
    phoneNumber: phoneNumber
  });
}

/**
 * 微信原生打开地图导航 (腾讯地图/高德地图)
 */
function openMapLocation(latitude, longitude, name, address) {
  const lat = parseFloat(latitude) || 31.2304;
  const lng = parseFloat(longitude) || 121.4737;

  wx.openLocation({
    latitude: lat,
    longitude: lng,
    name: name || '婚礼盛典宴会厅',
    address: address || '详细地址请见请柬',
    scale: 16
  });
}

/**
 * 保存图片到系统相册
 */
function saveImageToPhotosAlbum(url) {
  wx.showLoading({ title: '正在保存...' });
  wx.downloadFile({
    url: url,
    success: (res) => {
      if (res.statusCode === 200) {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.hideLoading();
            wx.showToast({ title: '已保存至手机相册', icon: 'success' });
          },
          fail: (err) => {
            wx.hideLoading();
            if (err.errMsg.indexOf('auth') !== -1) {
              wx.showModal({
                title: '权限提示',
                content: '需要保存相册权限，请在设置中打开',
                confirmText: '去设置',
                success: (settingRes) => {
                  if (settingRes.confirm) wx.openSetting();
                }
              });
            } else {
              wx.showToast({ title: '保存失败', icon: 'none' });
            }
          }
        });
      }
    },
    fail: () => {
      wx.hideLoading();
      wx.showToast({ title: '下载图片失败', icon: 'none' });
    }
  });
}

/**
 * 微信官方 jscode2session 接口直接解析用户凭据 (openid, session_key, unionid)
 */
function jscode2session(code, appId, appSecret) {
  return new Promise((resolve, reject) => {
    if (!code) {
      return reject(new Error('缺少 code 参数'));
    }
    const finalAppId = appId || 'wx12a496fabe6eb244';
    const finalSecret = appSecret || 'REDACTED_OLD_APPSECRET';
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(finalAppId)}&secret=${encodeURIComponent(finalSecret)}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;
    wx.request({
      url: url,
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.openid) {
          resolve(res.data);
        } else {
          reject(res.data || new Error('微信登录凭证解析失败'));
        }
      },
      fail: reject
    });
  });
}

module.exports = {
  makePhoneCall,
  openMapLocation,
  saveImageToPhotosAlbum,
  jscode2session
};
