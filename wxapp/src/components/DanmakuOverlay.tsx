import React, { useMemo } from 'react';
import { GuestBlessing } from '../types/wedding';

interface DanmakuOverlayProps {
  blessings: GuestBlessing[];
  enabled: boolean;
}

interface DanmakuTrackItem {
  id: string;
  text: string;
  author: string;
  lane: number;
  duration: number; // 持续时间（秒）
  delay: number; // 负延迟使得初始状态就均匀分布在屏幕各处，避免堆叠
}

export const DanmakuOverlay: React.FC<DanmakuOverlayProps> = ({ blessings, enabled }) => {
  // 保持弹幕项目稳定计算，避免每次父组件重新渲染时被打乱位置
  const trackItems: DanmakuTrackItem[] = useMemo(() => {
    if (!blessings || blessings.length === 0) return [];

    // 取前 15 条祝福进行 3 条宽敞轨道排布，确保每条弹幕完全在可视区域内，绝不贴顶或被裁剪
    const list = blessings.slice(0, 15);
    return list.map((b, index) => {
      const lane = index % 3; // 优化为 3 条宽敞轨道，避免拥挤和顶部遮挡
      const duration = 12 + (index % 3) * 2.5; // 12s - 17s 柔和浮动速度
      // 采用负延迟 (Negative Delay)，让动画在首次加载时就已经处于屏幕不同位置，彻底避免齐刷刷停滞在左侧或重叠
      const delay = -((index * 4.2) % duration);

      return {
        id: `${b.id}-${index}`,
        text: b.content,
        author: b.author,
        lane,
        duration,
        delay,
      };
    });
  }, [blessings]);

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-[68px] z-30 h-38 overflow-hidden transition-opacity duration-300 ${
        enabled ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden={!enabled}
    >
      {trackItems.map((item) => (
        <div
          key={item.id}
          className="danmaku-pill absolute whitespace-nowrap text-xs font-medium backdrop-blur-md rounded-full px-3 py-1 text-white shadow-sm flex items-center gap-1.5 border border-white/25 will-change-transform"
          style={{
            top: `${item.lane * 38 + 12}px`,
            left: '100%',
            animation: `danmakuFly ${item.duration}s linear infinite`,
            animationDelay: `${item.delay}s`,
            background: 'rgba(20, 20, 20, 0.65)',
          }}
        >
          <span className="text-amber-300 font-semibold">{item.author}:</span>
          <span className="text-white/95">{item.text}</span>
        </div>
      ))}
      <style>{`
        @keyframes danmakuFly {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-100vw - 120%));
          }
        }
      `}</style>
    </div>
  );
};
