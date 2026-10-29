import React, { useState } from 'react';
import { Music, Disc3, VolumeX } from 'lucide-react';
import { weddingAudio } from '../utils/audioPlayer';
import { BgmConfig } from '../types/wedding';

interface AudioPlayerButtonProps {
  bgm: BgmConfig;
  themePrimary: string;
}

export const AudioPlayerButton: React.FC<AudioPlayerButtonProps> = ({ bgm, themePrimary }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  const handleToggle = () => {
    const newState = weddingAudio.toggle(bgm.url);
    setIsPlaying(newState);
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 2500);
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        aria-label={isPlaying ? '暂停背景音乐' : '播放背景音乐'}
        className={`group relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full backdrop-blur-md transition-all duration-300 shadow-md ${
          isPlaying
            ? 'bg-white/80 text-stone-900 border border-amber-300/60 shadow-amber-500/10'
            : 'bg-black/40 text-white/80 border border-white/20'
        }`}
        style={{
          boxShadow: isPlaying ? `0 0 15px ${themePrimary}30` : undefined,
        }}
      >
        {isPlaying ? (
          <div className="relative flex items-center justify-center">
            {/* 旋转黑胶唱片 */}
            <Disc3
              className="h-6 w-6 animate-spin text-stone-800"
              style={{ animationDuration: '4s' }}
            />
            {/* 中心小红心/音符 */}
            <div
              className="absolute h-2 w-2 rounded-full"
              style={{ backgroundColor: themePrimary }}
            />
          </div>
        ) : (
          <div className="relative flex items-center justify-center">
            <Music className="h-5 w-5 text-white/70" />
            <VolumeX className="absolute -bottom-1 -right-1 h-3 w-3 text-red-300" />
          </div>
        )}
      </button>

      {/* 气泡悬浮提示 */}
      {showTooltip && (
        <div className="absolute right-0 top-12 z-50 whitespace-nowrap rounded-lg bg-stone-900/90 px-3 py-1.5 text-xs text-white shadow-lg backdrop-blur-sm animate-fade-in pointer-events-none">
          <div className="font-medium">
            {isPlaying ? '正在播放：' : '已暂停音乐'}
          </div>
          <div className="text-[11px] text-stone-300 truncate max-w-[160px]">
            {bgm.title}
          </div>
        </div>
      )}
    </div>
  );
};
