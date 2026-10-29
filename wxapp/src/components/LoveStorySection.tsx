import React from 'react';
import { StoryItem } from '../types/wedding';
import { Heart } from 'lucide-react';

interface LoveStorySectionProps {
  stories: StoryItem[];
  themePrimary: string;
}

export const LoveStorySection: React.FC<LoveStorySectionProps> = ({ stories, themePrimary }) => {
  return (
    <section className="my-8">
      <div className="text-center mb-6">
        <span className="text-xs uppercase tracking-[0.25em] text-stone-400 font-serif">
          Our Love Story
        </span>
        <h2 className="text-2xl font-serif font-bold text-stone-900 mt-1 flex items-center justify-center gap-2">
          <span>浪漫纪事 · 甜蜜时光</span>
        </h2>
        <div className="mx-auto mt-2 h-0.5 w-12 rounded-full" style={{ backgroundColor: themePrimary }} />
      </div>

      <div className="relative pl-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-200">
        {stories.map((story) => (
          <div key={story.id} className="relative mb-8 last:mb-0">
            {/* 时间轴节点 */}
            <div
              className="absolute -left-[27px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm border"
              style={{ borderColor: themePrimary }}
            >
              <Heart className="h-3 w-3 fill-current" style={{ color: themePrimary }} />
            </div>

            {/* 内容卡片 */}
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-stone-200/60 overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                  {story.date}
                </span>
                <span className="text-xs font-serif text-stone-400">Memory</span>
              </div>

              <h3 className="text-base font-serif font-bold text-stone-800 mb-2">
                {story.title}
              </h3>

              {story.image && (
                <div className="mb-3 overflow-hidden rounded-xl bg-stone-100 max-h-48">
                  <img
                    src={story.image}
                    alt={story.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              )}

              <p className="text-xs text-stone-600 leading-relaxed font-serif">
                {story.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
