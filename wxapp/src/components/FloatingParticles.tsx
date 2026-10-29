import React, { useEffect, useRef } from 'react';
import { WeddingTheme } from '../types/wedding';

interface FloatingParticlesProps {
  theme: WeddingTheme;
  enabled: boolean;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  opacity: number;
  shape: 'petal' | 'leaf' | 'sparkle' | 'gold_flake';
}

export const FloatingParticles: React.FC<FloatingParticlesProps> = ({ theme, enabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // 根据主题配置粒子风格
    const getParticleConfig = (t: WeddingTheme) => {
      switch (t) {
        case 'chinese':
          return {
            colors: ['#E11D48', '#BE123C', '#F59E0B', '#FBBF24'],
            shapes: ['petal', 'gold_flake'] as const,
            count: 24,
          };
        case 'french':
          return {
            colors: ['#FDE68A', '#FBCFE8', '#F59E0B', '#FFFBEB'],
            shapes: ['petal', 'sparkle'] as const,
            count: 22,
          };
        case 'forest':
          return {
            colors: ['#86EFAC', '#4ADE80', '#A7F3D0', '#FDE047'],
            shapes: ['leaf', 'petal'] as const,
            count: 24,
          };
        case 'minimalist':
        default:
          return {
            colors: ['#D4D4D8', '#A1A1AA', '#F4F4F5', '#E4E4E7'],
            shapes: ['sparkle', 'gold_flake'] as const,
            count: 18,
          };
      }
    };

    const config = getParticleConfig(theme);
    const particles: Particle[] = [];

    for (let i = 0; i < config.count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 9 + 6,
        speedY: Math.random() * 0.9 + 0.4,
        speedX: Math.random() * 0.8 - 0.4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.03,
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        opacity: Math.random() * 0.4 + 0.35,
        shape: config.shapes[Math.floor(Math.random() * config.shapes.length)],
      });
    }

    const drawPetal = (c: CanvasRenderingContext2D, p: Particle) => {
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rotation);
      c.beginPath();
      c.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
      c.fillStyle = p.color;
      c.globalAlpha = p.opacity;
      c.fill();
      c.restore();
    };

    const drawLeaf = (c: CanvasRenderingContext2D, p: Particle) => {
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rotation);
      c.beginPath();
      c.moveTo(0, -p.size);
      c.quadraticCurveTo(p.size * 0.7, 0, 0, p.size);
      c.quadraticCurveTo(-p.size * 0.7, 0, 0, -p.size);
      c.fillStyle = p.color;
      c.globalAlpha = p.opacity;
      c.fill();
      c.restore();
    };

    const drawSparkle = (c: CanvasRenderingContext2D, p: Particle) => {
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rotation);
      c.beginPath();
      c.arc(0, 0, p.size * 0.3, 0, Math.PI * 2);
      c.fillStyle = p.color;
      c.globalAlpha = p.opacity;
      c.fill();
      c.restore();
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += Math.sin(p.y * 0.015) * 0.7 + p.speedX;
        p.rotation += p.rotationSpeed;

        if (p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
        }
        if (p.x > width + 20) p.x = -20;
        if (p.x < -20) p.x = width + 20;

        if (p.shape === 'leaf') {
          drawLeaf(ctx, p);
        } else if (p.shape === 'sparkle' || p.shape === 'gold_flake') {
          drawSparkle(ctx, p);
        } else {
          drawPetal(ctx, p);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-hidden"
      aria-hidden="true"
    />
  );
};
