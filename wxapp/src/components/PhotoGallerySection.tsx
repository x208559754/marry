import React, { useState } from 'react';
import { PhotoItem } from '../types/wedding';
import { X, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

interface PhotoGallerySectionProps {
  photos: PhotoItem[];
  themePrimary: string;
}

export const PhotoGallerySection: React.FC<PhotoGallerySectionProps> = ({ photos, themePrimary }) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => {
    setActivePhotoIndex(index);
  };

  const closeLightbox = () => {
    setActivePhotoIndex(null);
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePhotoIndex !== null) {
      setActivePhotoIndex((activePhotoIndex + 1) % photos.length);
    }
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePhotoIndex !== null) {
      setActivePhotoIndex((activePhotoIndex - 1 + photos.length) % photos.length);
    }
  };

  return (
    <section className="my-8">
      <div className="text-center mb-6">
        <span className="text-xs uppercase tracking-[0.25em] text-stone-400 font-serif">
          Wedding Memories
        </span>
        <h2 className="text-2xl font-serif font-bold text-stone-900 mt-1">
          婚纱大片 · 定格幸福
        </h2>
        <div className="mx-auto mt-2 h-0.5 w-12 rounded-full" style={{ backgroundColor: themePrimary }} />
      </div>

      {/* 照片瀑布/栅格卡片 */}
      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            onClick={() => openLightbox(index)}
            className={`group relative overflow-hidden rounded-2xl bg-stone-100 shadow-sm border border-stone-200/60 cursor-pointer ${
              photo.aspect === 'landscape' ? 'col-span-2 aspect-16/10' : 'col-span-1 aspect-3/4'
            }`}
          >
            <img
              src={photo.url}
              alt={photo.title}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* 渐变遮罩 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
            
            {/* 悬浮预览提示 */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-sm">
                <Eye className="h-3.5 w-3.5" />
                <span>查看大图</span>
              </div>
            </div>

            {/* 标题 */}
            <div className="absolute bottom-2.5 left-3 right-3 text-white text-xs font-serif font-medium truncate">
              {photo.title}
            </div>
          </div>
        ))}
      </div>

      {/* 全屏灯箱展示 (Lightbox) */}
      {activePhotoIndex !== null && (
        <div
          onClick={closeLightbox}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md animate-fade-in"
        >
          {/* 关闭按钮 */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
          >
            <X className="h-5 w-5" />
          </button>

          {/* 切换上一张 */}
          <button
            onClick={prevPhoto}
            className="absolute left-2 sm:left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* 切换下一张 */}
          <button
            onClick={nextPhoto}
            className="absolute right-2 sm:right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* 图片主容器 */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-full overflow-hidden rounded-xl text-center"
          >
            <img
              src={photos[activePhotoIndex].url}
              alt={photos[activePhotoIndex].title}
              referrerPolicy="no-referrer"
              className="max-h-[75vh] w-auto max-w-full object-contain mx-auto rounded-lg shadow-2xl"
            />
            <div className="mt-3 text-sm font-serif text-stone-200">
              {photos[activePhotoIndex].title}
              <span className="ml-2 font-mono text-xs text-stone-400">
                ({activePhotoIndex + 1} / {photos.length})
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
