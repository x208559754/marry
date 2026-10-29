import React, { useState } from 'react';
import { ScheduleItem, WeddingConfig } from '../types/wedding';
import {
  Sun,
  HeartHandshake,
  Heart,
  Gem,
  UtensilsCrossed,
  Camera,
  Sparkles,
  Wine,
  Clock,
  CalendarPlus,
  BellRing,
  Check,
  Copy,
  ExternalLink,
  Calendar,
} from 'lucide-react';

interface ScheduleSectionProps {
  schedule: ScheduleItem[];
  themePrimary: string;
  config?: WeddingConfig;
  guestName?: string;
}

export const ScheduleSection: React.FC<ScheduleSectionProps> = ({
  schedule,
  themePrimary,
  config,
  guestName = '',
}) => {
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const getScheduleIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="h-4 w-4" />;
      case 'Heart':
      case 'HeartHandshake':
        return <Heart className="h-4 w-4 fill-current opacity-80" />;
      case 'Gem':
        return <Gem className="h-4 w-4" />;
      case 'Camera':
        return <Camera className="h-4 w-4" />;
      case 'Wine':
        return <Wine className="h-4 w-4" />;
      case 'UtensilsCrossed':
        return <UtensilsCrossed className="h-4 w-4" />;
      case 'Sun':
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // 生成标准的 iCalendar (.ics) 文件并触发手机系统日历调起
  const handleAddToCalendar = () => {
    const groom = config?.groom.name || '新郎';
    const bride = config?.bride.name || '新娘';
    const venueName = config?.venue.name || '婚礼艺术中心';
    const venueHall = config?.venue.hall || '水晶宴会厅';
    const venueAddress = config?.venue.address || '';
    const dateStr = config?.date || '2026-10-18 11:58';

    const formattedDate = dateStr.replace(' ', 'T');
    const startDate = new Date(formattedDate);
    const validStart = !isNaN(startDate.getTime()) ? startDate : new Date();
    const endDate = new Date(validStart.getTime() + 3.5 * 60 * 60 * 1000);

    const formatICSDate = (d: Date) => {
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const startICS = formatICSDate(validStart);
    const endICS = formatICSDate(endDate);
    const nowICS = formatICSDate(new Date());

    const scheduleNotes = schedule
      .map((s) => `${s.time} ${s.title} (${s.desc})`)
      .join('\\n');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Romantic Wedding Invitation//CN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:wedding-${Date.now()}@wedding-invite.com`,
      `DTSTAMP:${nowICS}`,
      `DTSTART:${startICS}`,
      `DTEND:${endICS}`,
      `SUMMARY:${guestName ? `【${guestName}】赴宴：` : ''}${groom} & ${bride} 的婚礼喜宴`,
      `DESCRIPTION:${guestName ? `${guestName}：` : ''}诚邀您见证我们的婚礼！\\n\\n【婚礼议程】\\n${scheduleNotes}\\n\\n【场地】${venueName} (${venueHall})\\n【地址】${venueAddress}`,
      `LOCATION:${venueName}（${venueHall}）- ${venueAddress}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      'DESCRIPTION:婚礼喜宴明天举行提醒',
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-PT2H',
      'ACTION:DISPLAY',
      'DESCRIPTION:婚礼喜宴即将开始提醒',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${groom}_${bride}_婚礼喜宴日程.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCalendarAdded(true);
    setShowCalendarModal(true);
    setTimeout(() => setCalendarAdded(false), 3000);
  };

  const handleCopyScheduleText = async () => {
    const groom = config?.groom.name || '新郎';
    const bride = config?.bride.name || '新娘';
    const text = `【婚礼日程提醒】\n新人：${groom} & ${bride}\n时间：${config?.date || '2026-10-18 11:58'}\n地点：${config?.venue.name}（${config?.venue.hall}）\n地址：${config?.venue.address}\n\n日程安排：\n${schedule.map((s) => `${s.time} - ${s.title}`).join('\n')}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      // ignore
    }
  };

  const getGoogleCalendarUrl = () => {
    const groom = config?.groom.name || '新郎';
    const bride = config?.bride.name || '新娘';
    const title = encodeURIComponent(`${groom} & ${bride} 的婚礼喜宴`);
    const dateStr = (config?.date || '2026-10-18 11:58').replace(' ', 'T');
    const start = new Date(dateStr);
    const validStart = !isNaN(start.getTime()) ? start : new Date();
    const end = new Date(validStart.getTime() + 3.5 * 60 * 60 * 1000);

    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dates = `${fmt(validStart)}/${fmt(end)}`;
    const details = encodeURIComponent(
      `诚挚邀请您参加 ${groom} & ${bride} 的婚礼喜宴！\n地点：${config?.venue.name} - ${config?.venue.address}`
    );
    const location = encodeURIComponent(`${config?.venue.name} - ${config?.venue.address}`);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
  };

  return (
    <section id="schedule-section" className="my-8 scroll-mt-16">
      <div className="text-center mb-6">
        <span className="text-xs uppercase tracking-[0.25em] text-stone-400 font-serif">
          Wedding Schedule
        </span>
        <h2 className="text-2xl font-serif font-bold text-stone-900 mt-1">
          婚礼安排 · 喜乐华章
        </h2>
        <div className="mx-auto mt-2 h-0.5 w-12 rounded-full" style={{ backgroundColor: themePrimary }} />
      </div>

      {/* “添加到手机日历” 核心交互卡片 */}
      <div className="mb-6 rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-stone-200/80 text-center overflow-hidden relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
            <BellRing className="h-4 w-4 text-amber-600 animate-pulse" />
            <span>智能日程提醒</span>
          </div>
          <span className="text-[11px] text-stone-400 font-mono">
            提前1天 &amp; 提前2小时提醒
          </span>
        </div>

        <p className="text-xs text-stone-500 mb-4 text-left leading-relaxed">
          一键将婚礼吉日写入您的 iPhone / 安卓手机系统日历，设置专属婚礼闹钟与路线提醒，不错过神圣仪式。
        </p>

        <button
          onClick={handleAddToCalendar}
          className="group relative w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white shadow-md active:scale-98 transition-all cursor-pointer text-xs sm:text-sm font-serif"
          style={{ backgroundColor: themePrimary }}
        >
          {calendarAdded ? (
            <>
              <Check className="h-4 w-4 text-emerald-300" />
              <span>已唤起系统日历设置</span>
            </>
          ) : (
            <>
              <CalendarPlus className="h-4 w-4 transition-transform group-hover:scale-110" />
              <span>添 加 到 手 机 日 历</span>
            </>
          )}
        </button>

        <div className="mt-2.5 flex items-center justify-center gap-4 text-[11px] text-stone-400">
          <button
            onClick={handleCopyScheduleText}
            className="hover:text-stone-700 flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copiedText ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
            <span>{copiedText ? '已复制日程' : '复制日程备忘'}</span>
          </button>
          <span>·</span>
          <a
            href={getGoogleCalendarUrl()}
            target="_blank"
            rel="noreferrer"
            className="hover:text-stone-700 flex items-center gap-1 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            <span>Google 日历在线预约</span>
          </a>
        </div>
      </div>

      {/* 议程卡片列表区域 */}
      <div className="space-y-3.5">
        {schedule.map((item, index) => (
          <div
            key={item.id}
            className="relative flex items-center gap-3.5 rounded-2xl bg-white p-3.5 shadow-sm border border-stone-200/60 transition-all duration-300"
          >
            {/* 时间标签 */}
            <div
              className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-xl font-mono text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: themePrimary }}
            >
              <span>{item.time}</span>
              <span className="text-[10px] font-normal opacity-80">PROG.{index + 1}</span>
            </div>

            {/* 图标与流程描述 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 font-serif font-bold text-stone-800 text-sm">
                <span style={{ color: themePrimary }}>{getScheduleIcon(item.iconName)}</span>
                <span className="truncate">{item.title}</span>
              </div>
              <div className="text-xs text-stone-500 mt-0.5 leading-relaxed truncate">
                {item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 添加日历成功提示引导弹窗 */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-xl border border-stone-200">
            <div
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-md"
              style={{ backgroundColor: themePrimary }}
            >
              <Calendar className="h-6 w-6" />
            </div>

            <h3 className="text-base font-serif font-bold text-stone-900 mb-1">
              日历日程已生成
            </h3>

            <p className="text-xs text-stone-600 leading-relaxed mb-4">
              系统已下载婚礼日程文件（.ics）。<br />
              iPhone 点击文件后请选择【<strong>添加全部</strong>】或【<strong>存储到日历</strong>】；<br />
              安卓手机将自动唤起系统日历新建日程。
            </p>

            <div className="rounded-xl bg-stone-50 p-3 text-[11px] text-stone-500 mb-4 text-left space-y-1">
              <div><strong>默认提醒：</strong>前1天 09:00 &amp; 当天提前 2 小时</div>
              <div><strong>席设地点：</strong>{config?.venue.name}</div>
            </div>

            <button
              onClick={() => setShowCalendarModal(false)}
              className="w-full rounded-xl py-2.5 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-95 cursor-pointer"
              style={{ backgroundColor: themePrimary }}
            >
              好的，我知道了
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
