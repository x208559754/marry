import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDateStr: string;
  themePrimary: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  totalDaysPast: number;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDateStr, themePrimary }) => {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false,
    totalDaysPast: 0,
  });

  useEffect(() => {
    const calculateTime = () => {
      // 解析目标时间，容错格式如 "2026-10-18 11:58"
      const formatted = targetDateStr.replace(' ', 'T');
      const targetTime = new Date(formatted).getTime();
      const now = new Date().getTime();
      const diff = targetTime - now;

      if (isNaN(targetTime)) {
        return;
      }

      if (diff <= 0) {
        const pastDays = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24));
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isPast: true,
          totalDaysPast: pastDays,
        });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        setTimeLeft({
          days,
          hours,
          minutes,
          seconds,
          isPast: false,
          totalDaysPast: 0,
        });
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDateStr]);

  return (
    <div className="w-full rounded-2xl bg-white/70 p-5 shadow-sm backdrop-blur-sm border border-stone-200/60 text-center">
      <div className="flex items-center justify-center gap-1.5 text-xs text-stone-500 mb-3 tracking-wider font-medium">
        <Clock className="h-3.5 w-3.5 text-amber-600" />
        <span>{timeLeft.isPast ? '携手相伴时光' : '距离幸福礼成还有'}</span>
      </div>

      {timeLeft.isPast ? (
        <div className="py-2">
          <div className="text-xl font-serif font-bold text-stone-800">
            今天是我们新婚相伴的第{' '}
            <span className="font-mono text-2xl" style={{ color: themePrimary }}>
              {timeLeft.totalDaysPast + 1}
            </span>{' '}
            天
          </div>
          <div className="text-xs text-stone-500 mt-1">感恩相遇，执手余生</div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-xl bg-stone-50 p-2.5 border border-stone-100">
            <div className="font-mono text-xl sm:text-2xl font-bold tabular-nums" style={{ color: themePrimary }}>
              {String(timeLeft.days).padStart(2, '0')}
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">天</div>
          </div>
          <div className="rounded-xl bg-stone-50 p-2.5 border border-stone-100">
            <div className="font-mono text-xl sm:text-2xl font-bold tabular-nums" style={{ color: themePrimary }}>
              {String(timeLeft.hours).padStart(2, '0')}
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">时</div>
          </div>
          <div className="rounded-xl bg-stone-50 p-2.5 border border-stone-100">
            <div className="font-mono text-xl sm:text-2xl font-bold tabular-nums" style={{ color: themePrimary }}>
              {String(timeLeft.minutes).padStart(2, '0')}
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">分</div>
          </div>
          <div className="rounded-xl bg-stone-50 p-2.5 border border-stone-100">
            <div className="font-mono text-xl sm:text-2xl font-bold tabular-nums" style={{ color: themePrimary }}>
              {String(timeLeft.seconds).padStart(2, '0')}
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">秒</div>
          </div>
        </div>
      )}
    </div>
  );
};
