// utils/wechat.js - 微信专属能力封装（拨号、地图导航、保存相册）
// 注意：登录/换 openid 已全部移到服务端（utils/api.js → Worker /api/login），
// 客户端不再接触 AppSecret，也不存在 jscode2session 直连。

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

module.exports = {
  makePhoneCall,
  openMapLocation,
  saveImageToPhotosAlbum
};
