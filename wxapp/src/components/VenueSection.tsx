import React, { useState } from 'react';
import { VenueInfo } from '../types/wedding';
import { MapPin, Navigation, Copy, Check, Bus, Car } from 'lucide-react';
import { ARTISTIC_HALL_PHOTO } from '../data/defaultData';

interface VenueSectionProps {
  venue: VenueInfo;
  themePrimary: string;
}

export const VenueSection: React.FC<VenueSectionProps> = ({ venue, themePrimary }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    const fullText = `${venue.name}（${venue.hall}）地址：${venue.address}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降级复制
      const textarea = document.createElement('textarea');
      textarea.value = fullText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 统一调起地图导航（标准高德/微信全平台通用通用链接）
  const handleOpenNavigation = () => {
    const encodedName = encodeURIComponent(venue.name);
    const url = `https://uri.amap.com/marker?position=${venue.lng},${venue.lat}&name=${encodedName}&callnative=1`;
    window.open(url, '_blank');
  };

  return (
    <section id="venue-section" className="my-8 scroll-mt-16">
      <div className="text-center mb-6">
        <span className="text-xs uppercase tracking-[0.25em] text-stone-400 font-serif">
          Venue &amp; Location
        </span>
        <h2 className="text-2xl font-serif font-bold text-stone-900 mt-1">
          宴席导航 · 恭迎嘉礼
        </h2>
        <div className="mx-auto mt-2 h-0.5 w-12 rounded-full" style={{ backgroundColor: themePrimary }} />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-stone-200/60">
        {/* 场馆形象大图卡片 */}
        <div className="relative h-44 w-full overflow-hidden bg-stone-100">
          <img
            src={ARTISTIC_HALL_PHOTO}
            alt={venue.name}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <h3 className="text-lg font-serif font-bold">{venue.name}</h3>
            <div className="text-xs text-amber-200 font-serif">{venue.hall}</div>
          </div>
        </div>

        {/* 详细地址与指引 */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex items-start gap-2 text-stone-700 text-xs">
            <MapPin className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-stone-900 text-sm mb-0.5">宴席地址</div>
              <div className="text-stone-600 leading-relaxed text-xs">{venue.address}</div>
            </div>
          </div>

          {/* 交通指引贴士 */}
          {venue.transportTips && (
            <div className="rounded-xl bg-stone-50 p-3 text-xs text-stone-600 border border-stone-100 flex items-start gap-2">
              <div className="flex items-center gap-1 text-amber-700 font-medium shrink-0 pt-0.5">
                <Bus className="h-3.5 w-3.5" />
                <Car className="h-3.5 w-3.5" />
              </div>
              <div className="leading-relaxed text-[11px] text-stone-600">
                <span className="font-semibold text-stone-800">出行贴士：</span>
                {venue.transportTips}
              </div>
            </div>
          )}

          {/* 统一的高质感操作按钮组合：不再五颜六色分散 */}
          <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={handleOpenNavigation}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white shadow-md active:scale-98 transition-all cursor-pointer font-serif text-sm"
              style={{ backgroundColor: themePrimary }}
            >
              <Navigation className="h-4 w-4" />
              <span>一 键 地 图 导 航</span>
            </button>

            <button
              onClick={handleCopyAddress}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-medium">已复制详细地址</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-stone-500" />
                  <span>复制地址</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
