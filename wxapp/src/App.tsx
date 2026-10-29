import React, { useState, useEffect } from 'react';
import { WeddingConfig, GuestRSVP, GuestBlessing, WeddingTheme } from './types/wedding';
import {
  INITIAL_WEDDING_CONFIG,
  INITIAL_RSVP_LIST,
  INITIAL_BLESSINGS,
  THEME_PRESETS,
  ARTISTIC_COUPLE_COVER,
} from './data/defaultData';
import { FloatingParticles } from './components/FloatingParticles';
import { DanmakuOverlay } from './components/DanmakuOverlay';
import { AudioPlayerButton } from './components/AudioPlayerButton';
import { EnvelopeCover } from './components/EnvelopeCover';
import { CountdownTimer } from './components/CountdownTimer';
import { LoveStorySection } from './components/LoveStorySection';
import { PhotoGallerySection } from './components/PhotoGallerySection';
import { ScheduleSection } from './components/ScheduleSection';
import { VenueSection } from './components/VenueSection';
import { RsvpSection } from './components/RsvpSection';
import { GuestbookSection } from './components/GuestbookSection';
import { SharePosterModal } from './components/SharePosterModal';
import { AdminPanel } from './components/AdminPanel';
import { MiniProgramSimulatorModal } from './components/MiniProgramSimulatorModal';
import {
  fetchNotionConfig,
  fetchNotionRsvps,
  fetchNotionBlessings,
  submitNotionRsvp,
  submitNotionBlessing,
  saveNotionConfig,
} from './utils/notionService';

import {
  Phone,
  Settings,
  Share2,
  Eye,
  EyeOff,
  QrCode,
  RotateCcw,
  MailOpen,
  Camera,
  MapPin,
  Send,
  MessageSquareHeart,
  CalendarHeart,
  ChevronRight,
  Heart,
  Sparkles,
  User,
  Pencil,
  X,
  Smartphone,
} from 'lucide-react';

type NavigationTab = 'home' | 'gallery' | 'schedule' | 'rsvp' | 'blessings';

export default function App() {
  // 本地存储初始化
  const [config, setConfig] = useState<WeddingConfig>(() => {
    try {
      const saved = localStorage.getItem('wedding_config_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_WEDDING_CONFIG;
  });

  const [rsvpList, setRsvpList] = useState<GuestRSVP[]>(() => {
    try {
      const saved = localStorage.getItem('wedding_rsvp_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_RSVP_LIST;
  });

  const [blessings, setBlessings] = useState<GuestBlessing[]>(() => {
    try {
      const saved = localStorage.getItem('wedding_blessings_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_BLESSINGS;
  });

  // 宾客称谓与开帖心语持久化（必须填写称谓与祝福寄语后方可进入）
  const [guestName, setGuestName] = useState<string>(() => {
    try {
      return localStorage.getItem('wedding_guest_name_v1') || '';
    } catch {
      return '';
    }
  });

  const [guestBlessing, setGuestBlessing] = useState<string>(() => {
    try {
      return localStorage.getItem('wedding_guest_blessing_v1') || '';
    } catch {
      return '';
    }
  });

  // 修改称谓与寄语弹窗
  const [isGuestEditOpen, setIsGuestEditOpen] = useState(false);
  const [editGuestName, setEditGuestName] = useState('');
  const [editGuestBlessing, setEditGuestBlessing] = useState('');

  // 底部导航当前激活 Tab
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');

  // 弹窗与动效状态（未填写称谓时必须展示题名封套；已填写且已启开过则不重复遮挡）
  const [isEnvelopeOpen, setIsEnvelopeOpen] = useState<boolean>(() => {
    try {
      const savedName = localStorage.getItem('wedding_guest_name_v1');
      const hasOpened = sessionStorage.getItem('wedding_opened_v1') === 'true';
      return Boolean(savedName && hasOpened);
    } catch {
      return false;
    }
  });
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isPosterOpen, setIsPosterOpen] = useState(false);
  const [isMiniProgramOpen, setIsMiniProgramOpen] = useState(false);
  const [danmakuVisible, setDanmakuVisible] = useState(true);

  // 盛典页内快捷锚点：仅【导航】与【安排】两个
  const [eventAnchor, setEventAnchor] = useState<'venue' | 'schedule'>('venue');

  // 监听盛典Tab当前视口位置，自动高亮【导航】或【安排】
  useEffect(() => {
    if (activeTab !== 'schedule') return;

    const handleScroll = () => {
      const scheduleEl = document.getElementById('schedule-section');
      if (!scheduleEl) return;

      const scheduleRect = scheduleEl.getBoundingClientRect();
      if (scheduleRect.top <= window.innerHeight * 0.55) {
        setEventAnchor('schedule');
      } else {
        setEventAnchor('venue');
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [activeTab]);

  // 同步本地存储
  useEffect(() => {
    try {
      localStorage.setItem('wedding_config_v1', JSON.stringify(config));
    } catch {
      // ignore
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem('wedding_rsvp_v1', JSON.stringify(rsvpList));
    } catch {
      // ignore
    }
  }, [rsvpList]);

  useEffect(() => {
    try {
      localStorage.setItem('wedding_blessings_v1', JSON.stringify(blessings));
    } catch {
      // ignore
    }
  }, [blessings]);

  // 初次加载时，尝试从后端拉取 Notion / 本地缓存的最新数据
  useEffect(() => {
    fetchNotionConfig().then((res) => {
      if (res.config) {
        setConfig((prev) => ({ ...prev, ...res.config }));
      }
    });

    fetchNotionRsvps().then((res) => {
      if (res.list && res.list.length > 0) {
        setRsvpList(res.list);
      }
    });

    fetchNotionBlessings().then((res) => {
      if (res.list && res.list.length > 0) {
        setBlessings(res.list);
      }
    });
  }, []);

  // 供后台一键刷新全部数据
  const handleRefreshAllData = async () => {
    const [cRes, rRes, bRes] = await Promise.all([
      fetchNotionConfig(),
      fetchNotionRsvps(),
      fetchNotionBlessings(),
    ]);
    if (cRes.config) setConfig((prev) => ({ ...prev, ...cRes.config }));
    if (rRes.list && rRes.list.length > 0) setRsvpList(rRes.list);
    if (bRes.list && bRes.list.length > 0) setBlessings(bRes.list);
  };

  const handleUpdateConfig = (newConfig: WeddingConfig) => {
    setConfig(newConfig);
    saveNotionConfig(newConfig).catch((err) => console.warn('Notion config save error:', err));
  };

  const currentTheme = THEME_PRESETS[config.theme] || THEME_PRESETS.chinese;

  // 添加 RSVP 回执
  const handleAddRsvp = (newRsvp: GuestRSVP) => {
    setRsvpList((prev) => [newRsvp, ...prev]);
    // 异步同步到 Notion 数据库
    submitNotionRsvp(newRsvp).catch((err) => console.warn('Notion rsvp sync error:', err));
    if (newRsvp.blessing) {
      handleSendBlessing(newRsvp.name, newRsvp.blessing);
    }
  };

  const handleDeleteRsvp = (id: string) => {
    setRsvpList((prev) => prev.filter((r) => r.id !== id));
  };

  // 添加祝福留言（自动触发弹幕并推送到 Notion）
  const handleSendBlessing = (author: string, content: string) => {
    const colors = ['bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-pink-500'];
    const newBlessing: GuestBlessing = {
      id: `bless-${Date.now()}`,
      author,
      content,
      createdAt: '刚刚',
      likes: 1,
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
    };
    setBlessings((prev) => [newBlessing, ...prev]);
    setConfig((prev) => ({ ...prev, heartsCount: prev.heartsCount + 1 }));
    // 异步推送到 Notion 祝福数据库
    submitNotionBlessing(newBlessing).catch((err) => console.warn('Notion blessing sync error:', err));
  };

  const handleLikeBlessing = (id: string) => {
    setBlessings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, likes: b.likes + 1 } : b))
    );
  };

  const handleIncrementHeart = () => {
    setConfig((prev) => ({ ...prev, heartsCount: prev.heartsCount + 1 }));
  };

  // 确认开帖填写的宾客姓名与祝福心语
  const handleConfirmGuest = (name: string, blessingContent: string, phone?: string) => {
    setGuestName(name);
    setGuestBlessing(blessingContent);
    try {
      localStorage.setItem('wedding_guest_name_v1', name);
      localStorage.setItem('wedding_guest_blessing_v1', blessingContent);
      if (phone) {
        localStorage.setItem('wedding_guest_phone_v1', phone);
      }
    } catch {
      // ignore
    }
    // 自动将宾客在开帖时写下的祝福心语推送到留言板与弹幕
    if (blessingContent) {
      handleSendBlessing(name, blessingContent);
    }
  };

  // 保存修改后的宾客称谓
  const handleSaveGuestEdit = () => {
    if (!editGuestName.trim()) return;
    const newName = editGuestName.trim();
    const newBlessing = editGuestBlessing.trim();
    setGuestName(newName);
    if (newBlessing) {
      setGuestBlessing(newBlessing);
    }
    try {
      localStorage.setItem('wedding_guest_name_v1', newName);
      if (newBlessing) {
        localStorage.setItem('wedding_guest_blessing_v1', newBlessing);
      }
    } catch {
      // ignore
    }
    setIsGuestEditOpen(false);
  };

  const handleThemeChange = (theme: WeddingTheme) => {
    setConfig((prev) => ({ ...prev, theme }));
  };

  // 底部Tab配置
  const navTabs: { id: NavigationTab; label: string; enLabel: string; icon: React.ElementType }[] = [
    { id: 'home', label: '喜帖', enLabel: 'Invite', icon: MailOpen },
    { id: 'gallery', label: '相册', enLabel: 'Photos', icon: Camera },
    { id: 'schedule', label: '盛典', enLabel: 'Event', icon: CalendarHeart },
    { id: 'rsvp', label: '赴宴', enLabel: 'RSVP', icon: Send },
    { id: 'blessings', label: '祝福', enLabel: 'Wishes', icon: MessageSquareHeart },
  ];

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-start antialiased text-stone-800">
      {/* 桌面端顶部控制提示横条 */}
      <header className="hidden lg:flex w-full items-center justify-between px-8 py-3 bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-serif font-bold text-lg shadow-sm"
            style={{ backgroundColor: currentTheme.primary }}
          >
            {currentTheme.symbol}
          </div>
          <div>
            <h1 className="text-sm font-serif font-bold text-stone-900">
              浪漫满溢 · 电子结婚请柬 (支持微信小程序 WebView 内嵌)
            </h1>
            <div className="text-[11px] text-stone-500">
              新人：{config.groom.name} &amp; {config.bride.name} · {config.date}
            </div>
          </div>
        </div>

        {/* 桌面端快捷切换主题胶囊 */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl">
          {(Object.keys(THEME_PRESETS) as WeddingTheme[]).map((t) => (
            <button
              key={t}
              onClick={() => handleThemeChange(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                config.theme === t
                  ? 'bg-white text-stone-900 shadow-sm font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {THEME_PRESETS[t].name.split('·')[0]}
            </button>
          ))}
        </div>

        {/* 桌面端右侧管理与分享操作 */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMiniProgramOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#07C160] hover:bg-[#06AD56] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            title="查看并运行原生微信小程序"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>微信原生小程序 (真机模拟)</span>
          </button>
          <button
            onClick={() => setIsPosterOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
          >
            <QrCode className="h-3.5 w-3.5 text-stone-500" />
            <span>分享海报</span>
          </button>
          <button
            onClick={() => setIsAdminOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-95 cursor-pointer"
            style={{ backgroundColor: currentTheme.primary }}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>后台管理 / 可视化编辑</span>
          </button>
        </div>
      </header>

      {/* 手机形态主视口容器 (兼容移动端全屏和小程序WebView) */}
      <main className="w-full max-w-md lg:my-6 lg:rounded-[40px] lg:shadow-2xl lg:border-8 lg:border-stone-800 lg:ring-1 lg:ring-black/10 relative overflow-hidden bg-white h-screen lg:h-[854px] max-h-screen lg:max-h-[88vh] flex flex-col">
        {/* 手机灵动岛模拟 (仅桌面端显示) */}
        <div className="hidden lg:flex justify-center pt-2 pb-1 bg-transparent absolute top-0 left-0 right-0 z-40 pointer-events-none">
          <div className="h-4 w-28 bg-stone-800 rounded-full" />
        </div>

        {/* 飘落动效粒子层 */}
        <FloatingParticles theme={config.theme} enabled={config.particlesEnabled} />

        {/* 实时弹幕祝福层 (全页面可用) */}
        <DanmakuOverlay blessings={blessings} enabled={config.danmakuEnabled && danmakuVisible} />

        {/* 顶部紧凑导航工具栏 */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-4 py-3 bg-white/75 backdrop-blur-md border-b border-stone-200/50">
          {/* 左侧：当前 Tab 标题与宾客称谓铭牌 */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-serif font-bold text-sm text-stone-900 tracking-wide flex items-center gap-1 shrink-0">
              <span style={{ color: currentTheme.primary }}>{currentTheme.symbol}</span>
              <span>
                {activeTab === 'home' && '良辰喜帖'}
                {activeTab === 'gallery' && '婚纱相册'}
                {activeTab === 'schedule' && '盛典日程'}
                {activeTab === 'rsvp' && '宾客赴宴'}
                {activeTab === 'blessings' && '亲友祝福'}
              </span>
            </span>

            {/* 宾客专属称谓尊贵胶囊 */}
            {guestName && (
              <button
                onClick={() => {
                  setEditGuestName(guestName);
                  setEditGuestBlessing(guestBlessing);
                  setIsGuestEditOpen(true);
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100/80 border border-amber-300/70 text-[10px] text-amber-900 font-serif transition-colors truncate max-w-[85px] sm:max-w-[120px] cursor-pointer"
                title="点击修改我的称谓与寄语"
              >
                <User className="h-2.5 w-2.5 text-amber-700 shrink-0" />
                <span className="truncate">{guestName}</span>
                <Pencil className="h-2 w-2 text-stone-400 shrink-0" />
              </button>
            )}

            <button
              onClick={() => setIsAdminOpen(true)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors shrink-0"
              title="设置后台"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => setIsMiniProgramOpen(true)}
              className="flex h-7 px-2 items-center gap-1 rounded-full bg-[#07C160] hover:bg-[#06AD56] text-white text-[10px] font-bold transition-colors shrink-0 shadow-xs cursor-pointer"
              title="微信原生小程序真机体验"
            >
              <Smartphone className="h-3 w-3" />
              <span>小程序</span>
            </button>
          </div>

          {/* 右侧：弹幕切换、海报分享、音乐旋转播放器 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDanmakuVisible(!danmakuVisible)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100/80 hover:bg-stone-200 text-stone-700 transition-colors"
              title={danmakuVisible ? '隐藏弹幕' : '显示弹幕'}
            >
              {danmakuVisible ? <Eye className="h-3.5 w-3.5 text-emerald-600" /> : <EyeOff className="h-3.5 w-3.5 text-stone-400" />}
            </button>
            <button
              onClick={() => setIsPosterOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100/80 hover:bg-stone-200 text-stone-700 transition-colors"
              title="分享请柬"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
            <AudioPlayerButton bgm={config.bgm} themePrimary={currentTheme.primary} />
          </div>
        </div>

        {/* 视口内容区域：基于 Tab 动态切换，具备丝滑独立体验 */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-5 transition-colors duration-500 custom-scrollbar overscroll-contain"
          style={{ backgroundColor: currentTheme.bgLight }}
        >
          {/* ===================== TAB 1: 喜帖 (Home) ===================== */}
          {activeTab === 'home' && (
            <div className="space-y-6 animate-fade-in">
              {/* 专属宾客迎宾礼呈卡片 */}
              {guestName && (
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFFDF8] via-white to-amber-50/70 p-4 sm:p-5 shadow-sm border border-amber-300/80 text-center animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/70 border border-amber-300/60 text-amber-900 text-xs font-serif font-bold">
                      <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                      <span>致：{guestName} 亲启</span>
                    </span>
                    <button
                      onClick={() => {
                        setEditGuestName(guestName);
                        setEditGuestBlessing(guestBlessing);
                        setIsGuestEditOpen(true);
                      }}
                      className="text-[11px] text-amber-700 hover:text-amber-900 underline flex items-center gap-1 cursor-pointer"
                    >
                      <Pencil className="h-3 w-3" />
                      <span>修改称呼</span>
                    </button>
                  </div>
                  <p className="text-xs font-serif text-stone-600 leading-relaxed px-1">
                    新郎 <strong className="text-stone-900">{config.groom.name}</strong> 与新娘 <strong className="text-stone-900">{config.bride.name}</strong> 诚挚邀请您的光临与见证！
                  </p>
                  {guestBlessing && (
                    <div className="mt-2.5 flex items-start justify-center gap-1.5 rounded-xl bg-amber-50/60 p-2.5 border border-amber-200/60 text-[11px] text-amber-900 font-serif text-left sm:text-center">
                      <MessageSquareHeart className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span>您的祝福寄语：“{guestBlessing}”</span>
                    </div>
                  )}
                </div>
              )}

              {/* 迎宾封面大卡片 */}
              <div className="relative overflow-hidden rounded-3xl bg-white shadow-md border border-stone-200/80 p-5 text-center">
                <div className="font-serif italic text-xs tracking-[0.25em] text-stone-400 uppercase mb-1">
                  Wedding Invitation
                </div>

                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mb-1">
                  {config.groom.name} <span className="font-light text-amber-600">&amp;</span> {config.bride.name}
                </h1>

                <div className="text-xs text-stone-400 font-serif mb-4 tracking-widest">
                  {config.groom.pinyin} &amp; {config.bride.pinyin}
                </div>

                {/* 封面照片展示 */}
                <div className="relative mx-auto my-3 overflow-hidden rounded-2xl shadow-sm border border-stone-100 aspect-3/4 max-h-[360px]">
                  <img
                    src={config.photos[0]?.url || ARTISTIC_COUPLE_COVER}
                    alt="Wedding Cover"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white text-xs font-serif font-medium">
                    {config.invitationTitle}
                  </div>
                </div>

                {/* 倒计时 */}
                <div className="mt-4">
                  <CountdownTimer targetDateStr={config.date} themePrimary={currentTheme.primary} />
                </div>

                {/* 日期吉时 */}
                <div className="mt-4 pt-4 border-t border-dashed border-stone-200 text-xs text-stone-600">
                  <div className="font-semibold text-stone-800 text-sm">{config.date}</div>
                  <div className="text-[11px] text-amber-700/90 mt-0.5">{config.lunarDate}</div>
                </div>
              </div>

              {/* 诚邀致辞誓言 */}
              <div className="rounded-2xl bg-white p-5 shadow-sm border border-stone-200/60 text-center">
                <span className="text-[11px] uppercase tracking-[0.2em] text-stone-400 font-serif">
                  Our Vow &amp; Promise
                </span>
                <h2 className="text-lg font-serif font-bold text-stone-900 mt-1 mb-2">
                  谨定吉日 · 诚挚邀请
                </h2>
                <div className="mx-auto mb-3.5 h-0.5 w-10 rounded-full" style={{ backgroundColor: currentTheme.primary }} />
                <p className="text-xs text-stone-600 leading-relaxed font-serif whitespace-pre-line px-2">
                  {config.invitationProse}
                </p>
              </div>

              {/* 新郎新娘名片与一键致电 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white p-3.5 shadow-sm border border-stone-200/60 text-center">
                  <div
                    className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full font-serif font-bold text-white shadow-sm"
                    style={{ backgroundColor: currentTheme.primary }}
                  >
                    郎
                  </div>
                  <div className="font-serif font-bold text-stone-900 text-sm">{config.groom.name}</div>
                  <div className="text-[10px] text-stone-400 font-serif mb-2">GROOM</div>
                  <a
                    href={`tel:${config.groom.phone}`}
                    className="inline-flex items-center justify-center gap-1 text-[11px] px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors w-full"
                  >
                    <Phone className="h-3 w-3 text-emerald-600" />
                    <span>呼叫新郎</span>
                  </a>
                </div>

                <div className="rounded-2xl bg-white p-3.5 shadow-sm border border-stone-200/60 text-center">
                  <div
                    className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full font-serif font-bold text-white shadow-sm"
                    style={{ backgroundColor: currentTheme.primary }}
                  >
                    娘
                  </div>
                  <div className="font-serif font-bold text-stone-900 text-sm">{config.bride.name}</div>
                  <div className="text-[10px] text-stone-400 font-serif mb-2">BRIDE</div>
                  <a
                    href={`tel:${config.bride.phone}`}
                    className="inline-flex items-center justify-center gap-1 text-[11px] px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors w-full"
                  >
                    <Phone className="h-3 w-3 text-rose-500" />
                    <span>呼叫新娘</span>
                  </a>
                </div>
              </div>

              {/* 快捷跳转指引卡片 */}
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-stone-200/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: currentTheme.primary }}
                  >
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="text-xs">
                    <div className="font-semibold text-stone-900">{config.venue.name}</div>
                    <div className="text-stone-500 text-[11px] truncate max-w-[200px]">{config.venue.address}</div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className="flex items-center text-xs font-medium text-stone-600 hover:text-stone-900 gap-0.5"
                >
                  <span>查看路线</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* 底部重温封套按钮 */}
              <div className="pt-2 pb-4 text-center">
                <button
                  onClick={() => setIsEnvelopeOpen(false)}
                  className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-800 underline"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>重温开封火漆请柬</span>
                </button>
              </div>
            </div>
          )}

          {/* ===================== TAB 2: 相册 (Gallery) ===================== */}
          {activeTab === 'gallery' && (
            <div className="space-y-6 animate-fade-in">
              {/* 婚纱大片展 */}
              <PhotoGallerySection photos={config.photos} themePrimary={currentTheme.primary} />
              {/* 恋爱纪事时间轴 */}
              <LoveStorySection stories={config.stories} themePrimary={currentTheme.primary} />
            </div>
          )}

          {/* ===================== TAB 3: 盛典 (Schedule & Venue) ===================== */}
          {activeTab === 'schedule' && (
            <div className="space-y-6 animate-fade-in">
              {/* 宴席地图导航 */}
              <VenueSection venue={config.venue} themePrimary={currentTheme.primary} />
              {/* 婚礼当天议程与手机日历一键添加 */}
              <ScheduleSection
                schedule={config.schedule}
                themePrimary={currentTheme.primary}
                config={config}
                guestName={guestName}
              />
            </div>
          )}

          {/* ===================== TAB 4: 赴宴 (RSVP) ===================== */}
          {activeTab === 'rsvp' && (
            <div className="space-y-6 animate-fade-in">
              <RsvpSection
                themePrimary={currentTheme.primary}
                onAddRsvp={handleAddRsvp}
                guestName={guestName}
                guestBlessing={guestBlessing}
              />
              
              {/* 温馨提示卡片 */}
              <div className="rounded-2xl bg-amber-50/60 p-4 border border-amber-200/60 text-xs text-amber-900 leading-relaxed">
                <div className="font-semibold mb-1 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  <span>宴席温馨备忘</span>
                </div>
                {guestName ? `${guestName}，您好：` : ''}请尽量于婚礼举行前一周完成出席确认，若有行程变动可随时联系新人，期待与您相聚！
              </div>
            </div>
          )}

          {/* ===================== TAB 5: 祝福 (Blessings) ===================== */}
          {activeTab === 'blessings' && (
            <div className="space-y-6 animate-fade-in">
              <GuestbookSection
                blessings={blessings}
                themePrimary={currentTheme.primary}
                heartsCount={config.heartsCount}
                onSendBlessing={handleSendBlessing}
                onLikeBlessing={handleLikeBlessing}
                onIncrementHeart={handleIncrementHeart}
                guestName={guestName}
              />
            </div>
          )}

          {/* 底部专用防遮挡垫片 (保证所有页面最后一个卡片能完全滚过导航栏上方) */}
          <div className="h-28 w-full shrink-0 pointer-events-none" aria-hidden="true" />
        </div>

        {/* 盛典专属：固定在右侧中央的超高颜值双锚点胶囊导航 (仅盛典Tab显示，固定于手机屏幕右侧居中) */}
        {activeTab === 'schedule' && (
          <aside
            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1 p-1 bg-white/95 backdrop-blur-2xl rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.14)] border border-stone-200/90 animate-fade-in"
            aria-label="盛典快捷锚点"
          >
            {/* 导航按钮 */}
            <button
              onClick={() => {
                setEventAnchor('venue');
                document.getElementById('venue-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`flex flex-col items-center justify-center w-9 py-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                eventAnchor === 'venue'
                  ? 'text-white shadow-md scale-105'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/80 active:scale-95'
              }`}
              style={{
                backgroundColor: eventAnchor === 'venue' ? currentTheme.primary : 'transparent',
              }}
              title="快速定位到宴席导航"
            >
              <MapPin className={`h-4 w-4 mb-0.5 transition-transform ${eventAnchor === 'venue' ? 'scale-110 text-white' : 'text-stone-400'}`} />
              <span className="text-[10px] font-serif font-bold tracking-tight">导航</span>
            </button>

            {/* 优雅微细分割线 */}
            <div className="h-px w-4 bg-stone-200 my-0.5" />

            {/* 安排按钮 */}
            <button
              onClick={() => {
                setEventAnchor('schedule');
                document.getElementById('schedule-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`flex flex-col items-center justify-center w-9 py-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                eventAnchor === 'schedule'
                  ? 'text-white shadow-md scale-105'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100/80 active:scale-95'
              }`}
              style={{
                backgroundColor: eventAnchor === 'schedule' ? currentTheme.primary : 'transparent',
              }}
              title="快速定位到婚礼安排"
            >
              <CalendarHeart className={`h-4 w-4 mb-0.5 transition-transform ${eventAnchor === 'schedule' ? 'scale-110 text-white' : 'text-stone-400'}`} />
              <span className="text-[10px] font-serif font-bold tracking-tight">安排</span>
            </button>
          </aside>
        )}

        {/* 底部高设计感磨砂 Tab 导航菜单 (Bottom Tab Bar) */}
        <nav
          className="absolute bottom-0 left-0 right-0 z-40 bg-white/92 backdrop-blur-xl border-t border-stone-200/80 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] px-2 py-2"
          aria-label="底部主导航"
        >
          <div className="grid grid-cols-5 items-center">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex flex-col items-center justify-center min-h-[46px] py-1 transition-all duration-300 rounded-xl cursor-pointer ${
                    isActive ? 'scale-102' : 'hover:opacity-80 active:scale-95'
                  }`}
                >
                  {/* 激活状态下的微光背景胶囊 */}
                  {isActive && (
                    <div
                      className="absolute inset-0 rounded-xl opacity-10 transition-opacity"
                      style={{ backgroundColor: currentTheme.primary }}
                    />
                  )}

                  {/* 图标与微动效 */}
                  <div className="relative">
                    <Icon
                      className={`h-5 w-5 transition-transform duration-300 ${
                        isActive ? 'scale-110' : 'text-stone-400 group-hover:text-stone-600'
                      }`}
                      style={{
                        color: isActive ? currentTheme.primary : undefined,
                        strokeWidth: isActive ? 2.3 : 1.8,
                      }}
                    />
                    {/* 祝福与赴宴的微红心角标 */}
                    {tab.id === 'blessings' && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                      </span>
                    )}
                  </div>

                  {/* 中文字标签 */}
                  <span
                    className={`text-[11px] font-serif tracking-tight mt-1 transition-colors ${
                      isActive ? 'font-bold' : 'text-stone-500 font-normal'
                    }`}
                    style={{
                      color: isActive ? currentTheme.primary : undefined,
                    }}
                  >
                    {tab.label}
                  </span>

                  {/* 底部高亮微短线 */}
                  {isActive && (
                    <div
                      className="mt-0.5 h-0.5 w-3.5 rounded-full"
                      style={{ backgroundColor: currentTheme.primary }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </main>

      {/* 仪式感火漆信封 (首次访问迎宾：必须题名称谓与送上心愿后方可开帖) */}
      <EnvelopeCover
        config={config}
        isOpen={isEnvelopeOpen}
        initialGuestName={guestName}
        initialGuestBlessing={guestBlessing}
        onConfirmGuest={handleConfirmGuest}
        onOpen={() => {
          setIsEnvelopeOpen(true);
          try {
            sessionStorage.setItem('wedding_opened_v1', 'true');
          } catch {
            // ignore
          }
          setActiveTab('home');
        }}
      />

      {/* 宾客修改称谓与寄语弹窗 */}
      {isGuestEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-stone-200 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-white font-serif font-bold text-sm shadow-sm"
                  style={{ backgroundColor: currentTheme.primary }}
                >
                  客
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-sm">修改宾客称谓与寄语</h3>
                  <p className="text-[10px] text-stone-500">修改后将同步更新至全站各处</p>
                </div>
              </div>
              <button
                onClick={() => setIsGuestEditOpen(false)}
                className="rounded-full p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-stone-800 mb-1">您的姓名 / 尊名称谓 *</label>
                <input
                  type="text"
                  value={editGuestName}
                  onChange={(e) => setEditGuestName(e.target.value)}
                  placeholder="如：张伟、姑姑一家、阿强"
                  maxLength={20}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-stone-800 focus:outline-none focus:border-stone-400 font-serif"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-800 mb-1">开帖心语 / 祝福寄语 *</label>
                <textarea
                  value={editGuestBlessing}
                  onChange={(e) => setEditGuestBlessing(e.target.value)}
                  rows={2}
                  placeholder="送上一句对新人的美好祝福..."
                  maxLength={100}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-stone-800 focus:outline-none focus:border-stone-400 resize-none font-serif leading-relaxed"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setIsGuestEditOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-medium text-xs hover:bg-stone-50 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleSaveGuestEdit}
                className="flex-1 py-2.5 rounded-xl text-white font-medium text-xs shadow-sm hover:opacity-95 transition-opacity cursor-pointer font-serif"
                style={{ backgroundColor: currentTheme.primary }}
              >
                保存更新
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 后台可视化管理控制面板 */}
      <AdminPanel
        config={config}
        onUpdateConfig={handleUpdateConfig}
        rsvpList={rsvpList}
        onDeleteRsvp={handleDeleteRsvp}
        blessings={blessings}
        onDeleteBlessing={(id) => setBlessings((prev) => prev.filter((b) => b.id !== id))}
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onRefreshData={handleRefreshAllData}
      />

      {/* 分享海报与小程序 Web-view 接入指导弹窗 */}
      <SharePosterModal
        config={config}
        isOpen={isPosterOpen}
        onClose={() => setIsPosterOpen(false)}
      />

      {/* 微信原生小程序交互真机模拟器与工程导出中心 */}
      <MiniProgramSimulatorModal
        isOpen={isMiniProgramOpen}
        onClose={() => setIsMiniProgramOpen(false)}
        config={config}
        onRefreshData={handleRefreshAllData}
      />
    </div>
  );
}
