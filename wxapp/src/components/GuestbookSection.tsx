import React, { useState } from 'react';
import { GuestBlessing } from '../types/wedding';
import { Heart, Send, MessageSquareQuote } from 'lucide-react';

interface GuestbookSectionProps {
  blessings: GuestBlessing[];
  themePrimary: string;
  heartsCount: number;
  onSendBlessing: (author: string, content: string) => void;
  onLikeBlessing: (id: string) => void;
  onIncrementHeart: () => void;
  guestName?: string;
}

const QUICK_TAGS = ['百年好合 永结同心', '佳偶天成 白头偕老', '新婚大喜 甜甜蜜蜜', '琴瑟和鸣 早生贵子', '岁岁年年 执手相伴'];

export const GuestbookSection: React.FC<GuestbookSectionProps> = ({
  blessings,
  themePrimary,
  heartsCount,
  onSendBlessing,
  onLikeBlessing,
  onIncrementHeart,
  guestName = '',
}) => {
  const [author, setAuthor] = useState(guestName);
  const [content, setContent] = useState('');
  const [burstHearts, setBurstHearts] = useState<{ id: number; x: number }[]>([]);

  React.useEffect(() => {
    if (guestName && !author) {
      setAuthor(guestName);
    }
  }, [guestName]);

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSendBlessing(author.trim() || '热心好友', content.trim());
    setContent('');
  };

  const handleHeartClick = () => {
    onIncrementHeart();
    const newId = Date.now();
    const randomX = Math.random() * 40 - 20;
    setBurstHearts((prev) => [...prev.slice(-6), { id: newId, x: randomX }]);
    setTimeout(() => {
      setBurstHearts((prev) => prev.filter((h) => h.id !== newId));
    }, 1200);
  };

  return (
    <section id="blessings-anchor" className="my-8">
      <div className="text-center mb-6">
        <span className="text-xs uppercase tracking-[0.25em] text-stone-400 font-serif">
          Blessings &amp; Wishes
        </span>
        <h2 className="text-2xl font-serif font-bold text-stone-900 mt-1">
          宾客留言 · 弹幕送福
        </h2>
        <div className="mx-auto mt-2 h-0.5 w-12 rounded-full" style={{ backgroundColor: themePrimary }} />
      </div>

      {/* 爱心互动能量区 */}
      <div className="relative mb-6 rounded-2xl bg-white p-5 shadow-sm border border-stone-200/60 text-center overflow-hidden">
        <div className="text-xs text-stone-500 mb-1">已累计收到亲友祝福与心意</div>
        <div className="font-mono text-3xl font-bold tracking-tight text-stone-900 mb-3">
          {heartsCount.toLocaleString()} <span className="text-xs font-normal text-stone-400">次心动</span>
        </div>

        {/* 悬浮微动画爱心池 */}
        <div className="relative flex justify-center">
          {burstHearts.map((h) => (
            <div
              key={h.id}
              className="pointer-events-none absolute bottom-8 z-30 animate-rise-fade text-rose-500"
              style={{ transform: `translateX(${h.x}px)` }}
            >
              <Heart className="h-6 w-6 fill-current animate-pulse" />
            </div>
          ))}

          <button
            onClick={handleHeartClick}
            className="group relative flex items-center gap-2 rounded-full py-2.5 px-6 font-medium text-white shadow-md transition-all active:scale-95 cursor-pointer text-xs"
            style={{ backgroundColor: themePrimary }}
          >
            <Heart className="h-4 w-4 fill-white animate-bounce" />
            <span>为新人送上一颗小心心</span>
          </button>
        </div>
      </div>

      {/* 发表留言卡片 */}
      <div className="rounded-2xl bg-white p-5 shadow-sm border border-stone-200/60 mb-6">
        <form onSubmit={handlePost} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="您的称呼（如：表妹小婷）"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-1/3 rounded-xl border border-stone-200 p-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-400"
            />
            <input
              type="text"
              required
              placeholder="写下温暖的祝福（将实时化为弹幕飘过屏幕）..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 rounded-xl border border-stone-200 p-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-400"
            />
            <button
              type="submit"
              className="flex items-center justify-center rounded-xl px-4 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-95"
              style={{ backgroundColor: themePrimary }}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 快捷祝福点选标签 */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {QUICK_TAGS.map((tag, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => setContent(tag)}
                className="rounded-full bg-stone-100 hover:bg-stone-200 px-2.5 py-1 text-[11px] text-stone-600 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* 留言墙列表 (随整屏平滑自然滚动，杜绝嵌套滚动冲突) */}
      <div className="space-y-3">
        {blessings.map((b) => (
          <div
            key={b.id}
            className="flex items-start gap-3 rounded-2xl bg-white p-3.5 shadow-sm border border-stone-200/60"
          >
            {/* 头像 */}
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-inner ${b.avatarColor}`}
            >
              {b.author.slice(0, 1)}
            </div>

            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-800 text-xs">{b.author}</span>
                <span className="text-[10px] text-stone-400">{b.createdAt}</span>
              </div>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed break-words">
                {b.content}
              </p>
            </div>

            {/* 点赞 */}
            <button
              onClick={() => onLikeBlessing(b.id)}
              className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-rose-500 transition-colors"
            >
              <Heart className="h-3.5 w-3.5 hover:fill-rose-500" />
              <span>{b.likes}</span>
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes riseFade {
          0% {
            opacity: 1;
            transform: translateY(0) scale(0.8);
          }
          100% {
            opacity: 0;
            transform: translateY(-70px) scale(1.4);
          }
        }
        .animate-rise-fade {
          animation: riseFade 1.2s ease-out forwards;
        }
      `}</style>
    </section>
  );
};
