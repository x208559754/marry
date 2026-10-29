import React, { useState } from 'react';
import { WeddingConfig } from '../types/wedding';
import { THEME_PRESETS, ARTISTIC_COUPLE_COVER } from '../data/defaultData';
import { X, Copy, Check, QrCode, Smartphone, Code2 } from 'lucide-react';

interface SharePosterModalProps {
  config: WeddingConfig;
  isOpen: boolean;
  onClose: () => void;
}

export const SharePosterModal: React.FC<SharePosterModalProps> = ({ config, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'poster' | 'miniprogram'>('poster');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const theme = THEME_PRESETS[config.theme];

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://wedding.example.com';

  const miniProgramCode = `<!-- 微信小程序 pages/wedding/wedding.wxml -->
<web-view 
  src="${currentUrl}"
  bindmessage="handleMessage"
></web-view>

// 微信小程序 pages/wedding/wedding.js
Page({
  onShareAppMessage() {
    return {
      title: '${config.groom.name} & ${config.bride.name} 的婚礼请柬',
      path: '/pages/wedding/wedding',
      imageUrl: '/images/share-cover.jpg'
    }
  },
  onShareTimeline() {
    return {
      title: '${config.groom.name} & ${config.bride.name} 我们要结婚啦！诚邀见证',
      query: 'from=timeline'
    }
  }
})
`;

  const copyToClipboard = async (text: string, type: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
    } catch {
      // fallback
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-stone-200">
        {/* 顶部标签栏 */}
        <div className="flex items-center justify-between border-b border-stone-100 p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('poster')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'poster'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>请柬海报</span>
            </button>
            <button
              onClick={() => setActiveTab('miniprogram')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'miniprogram'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>小程序嵌码</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 标签页内容 */}
        <div className="p-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {activeTab === 'poster' ? (
            <div className="space-y-4">
              {/* 海报卡片 */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-stone-50 to-amber-50/40 p-5 border border-stone-200 text-center shadow-sm">
                <div className="text-2xl font-serif font-bold text-stone-900 mb-0.5">
                  {config.groom.name} <span style={{ color: theme.primary }}>&amp;</span> {config.bride.name}
                </div>
                <div className="text-xs text-stone-500 font-serif mb-4">
                  {config.date} · {config.venue.name}
                </div>

                {/* 封面缩略图 */}
                <div className="mx-auto h-48 w-36 overflow-hidden rounded-xl shadow-md border-2 border-white mb-4">
                  <img
                    src={ARTISTIC_COUPLE_COVER}
                    alt="Cover"
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* 二维码生成模拟 */}
                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-xl bg-white p-2 shadow-inner border border-stone-200">
                  <div className="grid grid-cols-5 gap-1 w-full h-full p-1 bg-stone-900 rounded">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-xs ${
                          i % 2 === 0 || i % 7 === 0 ? 'bg-white' : 'bg-stone-900'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-stone-400">
                  微信扫一扫 · 即刻体验沉浸式请柬
                </div>
              </div>

              {/* 复制邀请链接 */}
              <button
                onClick={() => copyToClipboard(currentUrl, 'link')}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-95"
                style={{ backgroundColor: theme.primary }}
              >
                {copiedLink ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>已复制请柬专属链接</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>复制请柬在线链接（发微信好友/群）</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-200 text-emerald-800 leading-relaxed">
                <div className="font-semibold mb-1 flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4" />
                  <span>微信小程序内嵌说明（Web-view）</span>
                </div>
                本应用已针对微信小程序内置浏览器（WebView）进行了100%全自适应优化，直接在小程序中新建页面并写入如下代码即可秒级运行！
              </div>

              <div>
                <div className="font-semibold text-stone-800 mb-1 flex items-center justify-between">
                  <span>小程序代码示例：</span>
                  <button
                    onClick={() => copyToClipboard(miniProgramCode, 'code')}
                    className="flex items-center gap-1 text-[11px] text-stone-600 hover:text-stone-900"
                  >
                    {copiedCode ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedCode ? '已复制代码' : '复制代码'}</span>
                  </button>
                </div>
                <pre className="rounded-xl bg-stone-900 p-3 font-mono text-[11px] text-stone-200 overflow-x-auto leading-relaxed">
                  {miniProgramCode}
                </pre>
              </div>

              <div className="text-[11px] text-stone-500 space-y-1">
                <div className="font-medium text-stone-600">使用提示：</div>
                <div>1. 需在微信公众平台后台将当前域名添加到【业务域名】列表中。</div>
                <div>2. 如果开发阶段本地测试，可在微信开发者工具中勾选【不校验合法域名、web-view（业务域名）】即可立即真机预览！</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
