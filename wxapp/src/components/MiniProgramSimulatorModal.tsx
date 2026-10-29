import React, { useState, useEffect } from 'react';
import { WeddingConfig, GuestRSVP, GuestBlessing, WeddingTheme } from '../types/wedding';
import { THEME_PRESETS, ARTISTIC_COUPLE_COVER } from '../data/defaultData';
import { OrganicWaxSeal } from './OrganicWaxSeal';
import { FloatingParticles } from './FloatingParticles';
import { DanmakuOverlay } from './DanmakuOverlay';
import { CountdownTimer } from './CountdownTimer';
import {
  X,
  Smartphone,
  Download,
  Share2,
  Code2,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Phone,
  MapPin,
  Camera,
  Heart,
  Send,
  Sparkles,
  Lock,
  Unlock,
  ChevronRight,
  User,
  Music,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Pencil,
  RotateCcw,
  CalendarHeart,
  MessageSquareHeart,
  Calendar,
  CloudUpload,
  Key,
  MailOpen,
  ChevronLeft,
  Settings,
  Flame,
  CheckCheck,
  AlertCircle,
  Database,
  Users,
  Plus,
} from 'lucide-react';
import {
  weChatLogin,
  weChatGetPhone,
  submitNotionRsvp,
  submitNotionBlessing,
  fetchNotionRsvps,
  fetchNotionBlessings,
  uploadNotionImage,
  fetchNotionImages,
  initNotionDatabaseSchema,
} from '../utils/notionService';

interface MiniProgramSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WeddingConfig;
  onRefreshData?: () => Promise<void>;
}

type MPPage = 'index' | 'gallery' | 'schedule' | 'rsvp' | 'blessings' | 'admin';

export const MiniProgramSimulatorModal: React.FC<MiniProgramSimulatorModalProps> = ({
  isOpen,
  onClose,
  config,
  onRefreshData,
}) => {
  // 当前激活小程序页面
  const [currentPage, setCurrentPage] = useState<MPPage>('index');
  const [isPlayingBgm, setIsPlayingBgm] = useState(true);

  // =========================================================
  // 开屏封套与火漆开帖核心状态（全屏开屏，先解封登记后方可进入）
  // =========================================================
  const [isAppOpened, setIsAppOpened] = useState(false);
  const [splashStage, setSplashStage] = useState<'sealed' | 'opening' | 'unfolded'>('sealed');
  const [isEnteringAppAnim, setIsEnteringAppAnim] = useState(false);

  // 开屏表单填写状态
  const [splashInputName, setSplashInputName] = useState('微信贵宾');
  const [splashInputPhone, setSplashInputPhone] = useState('13888888888');
  const [splashInputBlessing, setSplashInputBlessing] = useState('新婚大喜，永结同心，百年好合！');
  const [splashErrorMsg, setSplashErrorMsg] = useState('');

  // 微信用户正式登录与身份态
  const [wxOpenId, setWxOpenId] = useState<string>('wx_guest_sample01');
  const [wxNickName, setWxNickName] = useState<string>('微信贵宾');
  const [wxAvatar, setWxAvatar] = useState<string>(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'
  );
  const [wxPhone, setWxPhone] = useState<string>('13888888888');
  const [isPhoneAuthorized, setIsPhoneAuthorized] = useState(true);

  // 微信原生手机号授权模拟弹窗
  const [isPhoneAuthDialogShow, setIsPhoneAuthDialogShow] = useState(false);

  // 回执表单
  const [rsvpStatus, setRsvpStatus] = useState<'yes' | 'no'>('yes');
  const [rsvpGuestsCount, setRsvpGuestsCount] = useState<number>(1);
  const [rsvpDietary, setRsvpDietary] = useState<'standard' | 'vegetarian' | 'halal' | 'child'>('standard');
  const [rsvpNeedShuttle, setRsvpNeedShuttle] = useState<boolean>(false);
  const [rsvpBlessing, setRsvpBlessing] = useState<string>('新婚大喜，永结同心，百年好合！');
  const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false);
  const [rsvpSuccessTip, setRsvpSuccessTip] = useState(false);

  // 祝福弹幕与留言墙
  const [blessingsList, setBlessingsList] = useState<GuestBlessing[]>([]);
  const [inputBlessing, setInputBlessing] = useState('');
  const [isSendingBlessing, setIsSendingBlessing] = useState(false);
  const [heartsCount, setHeartsCount] = useState(config.heartsCount || 1314);
  const [burstHearts, setBurstHearts] = useState<{ id: number; x: number }[]>([]);

  // 相册大图 Lightbox
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  // Notion 婚纱照资源
  const [photosList, setPhotosList] = useState<Array<{ url: string; title: string; aspect?: string }>>([]);

  // 小程序内嵌管理后台
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminTab, setAdminTab] = useState<'guests' | 'photos' | 'notion'>('guests');
  const [adminRsvps, setAdminRsvps] = useState<GuestRSVP[]>([]);
  const [loadingAdminRsvps, setLoadingAdminRsvps] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadMsg, setPhotoUploadMsg] = useState('');
  const [isAutoInitColumns, setIsAutoInitColumns] = useState(false);

  // 源码浏览器抽屉
  const [isCodeDrawerOpen, setIsCodeDrawerOpen] = useState(false);
  const [mpFiles, setMpFiles] = useState<Array<{ path: string; name: string; content: string; ext: string }>>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  const currentTheme = THEME_PRESETS[config.theme] || THEME_PRESETS.chinese;

  // 初始化微信登录与数据拉取
  useEffect(() => {
    if (!isOpen) return;

    // 模拟微信登录获取 openid
    weChatLogin('mock_code_' + Date.now()).then((res) => {
      if (res.openid) setWxOpenId(res.openid);
    });

    // 从 Notion 读取祝福
    fetchNotionBlessings().then((res) => {
      if (res.list && res.list.length > 0) setBlessingsList(res.list);
    });

    // 从 Notion 页面读取所有相片资源
    fetchNotionImages().then((imgs) => {
      if (imgs && imgs.length > 0) {
        setPhotosList(imgs);
      } else if (config.photos && config.photos.length > 0) {
        setPhotosList(config.photos.map((p) => ({ url: p.url, title: p.title, aspect: p.aspect })));
      }
    });
  }, [isOpen, config]);

  // 加载后台回执
  const loadAdminRsvps = async () => {
    setLoadingAdminRsvps(true);
    try {
      const res = await fetchNotionRsvps();
      if (res.list) setAdminRsvps(res.list);
    } finally {
      setLoadingAdminRsvps(false);
    }
  };

  // 点击火漆印：解封并展出纸质信笺
  const handleUnsealWax = () => {
    if (splashStage !== 'sealed') return;
    setSplashStage('opening');
    setTimeout(() => {
      setSplashStage('unfolded');
    }, 600);
  };

  // 微信原生手机号授权模拟确认
  const handleConfirmPhoneAuth = async () => {
    const res = await weChatGetPhone('sample_phone_code_' + Date.now());
    const phone = res.phoneNumber || '13888888888';
    setWxPhone(phone);
    setSplashInputPhone(phone);
    setIsPhoneAuthorized(true);
    setIsPhoneAuthDialogShow(false);
  };

  // 开屏填写信息后确认进入请柬
  const handleConfirmSplashAndEnter = async () => {
    if (!splashInputName.trim()) {
      setSplashErrorMsg('请填写您的称谓或姓名（如：张伟、表姐）');
      return;
    }
    if (!splashInputPhone.trim()) {
      setSplashErrorMsg('请授权获取或填写联系手机号');
      return;
    }

    setSplashErrorMsg('');
    const finalName = splashInputName.trim();
    const finalPhone = splashInputPhone.trim();
    const finalBlessing = splashInputBlessing.trim() || '百年好合，永结同心！';

    setWxNickName(finalName);
    setWxPhone(finalPhone);
    setRsvpBlessing(finalBlessing);

    // 自动将祝福心语同步推送到 Notion
    const newB: GuestBlessing = {
      id: `bless_${Date.now()}`,
      author: finalName,
      content: finalBlessing,
      createdAt: '刚刚',
      likes: 1,
      avatarColor: 'bg-rose-500',
    };
    setBlessingsList((prev) => [newB, ...prev]);
    submitNotionBlessing(newB).catch(() => {});

    setIsEnteringAppAnim(true);
    setTimeout(() => {
      setIsAppOpened(true);
      setIsEnteringAppAnim(false);
    }, 500);
  };

  // 重新合上信封（重温开屏开帖流程）
  const handleResealEnvelope = () => {
    setIsAppOpened(false);
    setSplashStage('sealed');
  };

  // 提交出席回执到 Notion
  const handleSubmitRsvp = async () => {
    if (!wxNickName.trim()) {
      alert('请填写宾客姓名或微信昵称');
      return;
    }
    if (!wxPhone.trim()) {
      alert('请授权获取或填写手机号');
      return;
    }

    setIsSubmittingRsvp(true);
    try {
      const payload: GuestRSVP = {
        id: `rsvp_${Date.now()}`,
        name: wxNickName.trim(),
        phone: wxPhone.trim(),
        attending: rsvpStatus,
        guestCount: rsvpStatus === 'yes' ? rsvpGuestsCount : 0,
        dietary: rsvpStatus === 'yes' ? rsvpDietary : 'standard',
        needsShuttle: rsvpStatus === 'yes' ? rsvpNeedShuttle : false,
        blessing: rsvpBlessing.trim(),
        submittedAt: new Date().toLocaleString(),
      };

      await submitNotionRsvp(payload);
      setIsSubmittingRsvp(false);
      setRsvpSuccessTip(true);

      if (rsvpBlessing.trim()) {
        const newB: GuestBlessing = {
          id: `bless_${Date.now()}`,
          author: wxNickName,
          content: rsvpBlessing.trim(),
          createdAt: '刚刚',
          likes: 1,
          avatarColor: 'bg-rose-500',
        };
        setBlessingsList((prev) => [newB, ...prev]);
        await submitNotionBlessing(newB);
      }

      if (onRefreshData) onRefreshData();
    } catch (e: any) {
      setIsSubmittingRsvp(false);
      alert('提交失败: ' + e.message);
    }
  };

  // 发送祝福弹幕
  const handleSendBlessing = async (contentToSend?: string) => {
    const text = (contentToSend || inputBlessing).trim();
    if (!text) return;

    setIsSendingBlessing(true);
    try {
      const newB: GuestBlessing = {
        id: `bless_${Date.now()}`,
        author: wxNickName,
        content: text,
        createdAt: '刚刚',
        likes: 1,
        avatarColor: 'bg-rose-500',
      };
      setBlessingsList((prev) => [newB, ...prev]);
      setInputBlessing('');
      setHeartsCount((c) => c + 1);
      await submitNotionBlessing(newB);
      setIsSendingBlessing(false);
    } catch {
      setIsSendingBlessing(false);
    }
  };

  // 点赞心动动画
  const handleHeartClick = () => {
    setHeartsCount((c) => c + 1);
    const newId = Date.now();
    const randomX = Math.random() * 40 - 20;
    setBurstHearts((prev) => [...prev.slice(-6), { id: newId, x: randomX }]);
    setTimeout(() => {
      setBurstHearts((prev) => prev.filter((h) => h.id !== newId));
    }, 1200);
  };

  // 小程序内直传照片至 Notion 资源库
  const handleUploadPhotoToNotion = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      if (base64) {
        setIsUploadingPhoto(true);
        setPhotoUploadMsg('正在推送到 Notion 页面图片 Block...');
        try {
          const res = await uploadNotionImage(base64, file.name.replace(/\.[^/.]+$/, ''));
          setIsUploadingPhoto(false);
          if (res.success && res.imageUrl) {
            setPhotoUploadMsg('✅ 上传成功！已作为 Notion 图片资源生效');
            setPhotosList((prev) => [{ url: res.imageUrl!, title: '婚纱大片' }, ...prev]);
            setTimeout(() => setPhotoUploadMsg(''), 4000);
          } else {
            setPhotoUploadMsg('❌ 上传失败: ' + (res.message || '未知错误'));
          }
        } catch (err: any) {
          setIsUploadingPhoto(false);
          setPhotoUploadMsg('❌ 请求异常: ' + err.message);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // 打开源码浏览器
  const handleOpenCodeDrawer = async () => {
    setIsCodeDrawerOpen(true);
    try {
      const res = await fetch('/api/miniprogram/files');
      const data = await res.json();
      if (data.files) setMpFiles(data.files);
    } catch (e) {
      console.warn('获取源码列表异常:', e);
    }
  };

  const handleCopyCode = () => {
    if (mpFiles[selectedFileIndex]) {
      navigator.clipboard.writeText(mpFiles[selectedFileIndex].content);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  if (!isOpen) return null;

  // 5大核心导航 Tab 配置 (采用与原版完全相同的精美矢量图标和排版)
  const navTabs = [
    { id: 'index' as MPPage, label: '喜帖', enLabel: 'Invite', icon: MailOpen },
    { id: 'gallery' as MPPage, label: '相册', enLabel: 'Photos', icon: Camera },
    { id: 'schedule' as MPPage, label: '盛典', enLabel: 'Event', icon: CalendarHeart },
    { id: 'rsvp' as MPPage, label: '回执', enLabel: 'RSVP', icon: Send },
    { id: 'blessings' as MPPage, label: '祝福', enLabel: 'Wishes', icon: MessageSquareHeart },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fade-in font-sans">
      <div className="relative flex flex-col lg:flex-row h-[94vh] w-full max-w-6xl rounded-3xl bg-stone-900 border border-stone-800 shadow-2xl overflow-hidden">
        
        {/* 左侧/主区域：真机微信小程序超高颜值全真运行视口 (100% 同步原版唯美视觉体系) */}
        <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-5 bg-gradient-to-b from-stone-900 via-stone-950 to-black overflow-y-auto">
          
          {/* 仿真手机外壳 */}
          <div className="relative w-[360px] sm:w-[390px] h-[730px] sm:h-[760px] rounded-[48px] bg-[#1C1A18] p-3 shadow-[0_25px_60px_rgba(0,0,0,0.85)] border-[4px] border-stone-700/80 ring-1 ring-white/10 flex flex-col">
            
            {/* 顶部刘海/灵动岛 */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-black rounded-full z-50 flex items-center justify-center pointer-events-none">
              <div className="w-3 h-3 rounded-full bg-stone-900 border border-stone-800" />
            </div>

            {/* 小程序屏幕 */}
            <div className="relative w-full h-full rounded-[38px] bg-[#FAF7F2] overflow-hidden flex flex-col select-none text-stone-800">
              
              {/* 微信原生沉浸式透明状态栏 (全屏显示，无遮挡白条) */}
              <div className="absolute top-0 left-0 right-0 h-10 px-6 flex items-end justify-between pb-1 text-[11px] font-medium z-50 select-none text-stone-700/80 pointer-events-none">
                <span>09:41</span>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* 微信小程序官方经典悬浮胶囊 (遵循 navigationStyle: custom 规范，右上角悬浮毛玻璃胶囊，去除多余顶栏) */}
              <div className="absolute top-8.5 right-3.5 z-50 flex items-center h-7 px-2.5 rounded-full bg-white/50 hover:bg-white/70 backdrop-blur-md border border-stone-300/60 text-stone-700 gap-2 text-xs shadow-2xs transition-colors">
                <button
                  onClick={() => {
                    if (isAppOpened) setCurrentPage('admin');
                  }}
                  className="hover:text-black cursor-pointer font-mono font-bold text-xs"
                  title="小程序主人后台 (Notion)"
                >
                  ···
                </button>
                <div className="w-px h-3 bg-stone-300/80" />
                <button onClick={onClose} className="hover:text-black cursor-pointer text-xs" title="退出小程序">
                  ○
                </button>
              </div>

              {/* 仅在正式进入喜帖且处于次级页面 (非首页) 时展示轻盈顶栏 */}
              {isAppOpened && currentPage !== 'index' && (
                <div className="h-11 pt-1 bg-white/90 backdrop-blur-md text-stone-900 px-4 flex items-center justify-between border-b border-stone-200/50 z-40 mt-10 shadow-2xs shrink-0">
                  <div className="flex items-center gap-1.5 truncate max-w-[190px]">
                    <span className="text-sm font-serif font-bold text-[#8B1E1E]">
                      {currentTheme.symbol}
                    </span>
                    <span className="font-serif font-bold text-xs tracking-wide text-stone-900 truncate">
                      {currentPage === 'gallery' && '婚纱大片 · 浪漫纪事'}
                      {currentPage === 'schedule' && '盛典日程 · 席设导航'}
                      {currentPage === 'rsvp' && '宾客赴宴 · 出席回执'}
                      {currentPage === 'blessings' && '亲友祝福 · 弹幕留言'}
                      {currentPage === 'admin' && '婚礼主人后台 (Notion)'}
                    </span>
                  </div>
                </div>
              )}

              {/* 飘落花瓣动效层 */}
              <FloatingParticles theme={config.theme} enabled={config.particlesEnabled} />

              {/* 实时弹幕祝福流动层 - 仅在正式进入喜帖后展示，开屏与信封阶段保持静谧典雅 */}
              <DanmakuOverlay blessings={blessingsList} enabled={config.danmakuEnabled && isAppOpened} />

              {/* 音乐悬浮旋转播放球 (高定黑胶唱片质感) */}
              <button
                onClick={() => setIsPlayingBgm(!isPlayingBgm)}
                className={`absolute top-18 right-3.5 z-40 w-7.5 h-7.5 rounded-full bg-white/95 backdrop-blur-sm border border-[#C5A059] shadow-xs flex items-center justify-center transition-transform cursor-pointer ${
                  isPlayingBgm ? 'animate-spin' : ''
                }`}
                style={{ animationDuration: '6s' }}
                title="背景音乐"
              >
                <div className="w-5.5 h-5.5 rounded-full bg-gradient-to-br from-[#9C2424] to-[#590F0F] flex items-center justify-center border border-amber-200/50 shadow-inner">
                  <Music className="h-2.5 w-2.5 text-amber-200" />
                </div>
              </button>

              {/* =========================================================================
                  【阶段 1】：全屏开屏火漆信封 (彻底去除顶栏，沉浸式全屏展示)
                  ========================================================================= */}
              {!isAppOpened ? (
                <div
                  className={`absolute inset-0 z-30 overflow-y-auto px-4 pt-12 pb-6 flex flex-col items-center justify-start text-center transition-opacity duration-500 custom-scrollbar ${
                    isEnteringAppAnim ? 'opacity-0' : 'opacity-100'
                  }`}
                  style={{
                    background:
                      'radial-gradient(ellipse at 50% 25%, #FDF7F2 0%, #F5E3D8 35%, #E9D0C5 70%, #D8B7AC 100%)',
                  }}
                >
                  {/* 顶部极简抬头 (已预留充足顶部安全 padding，确保英文 WEDDING INVITATION 绝不被刘海与状态栏遮挡) */}
                  <div className="text-center mb-4 animate-fade-in shrink-0">
                    <div className="text-[10px] font-serif tracking-[0.3em] uppercase text-[#8D5E53] font-medium">
                      WEDDING INVITATION
                    </div>
                    <h1 className="text-2xl font-serif font-bold text-[#3E221E] my-1 flex items-center justify-center gap-2">
                      <span>{config.groom.name}</span>
                      <span className="font-light text-xl text-[#C58B79]">&amp;</span>
                      <span>{config.bride.name}</span>
                    </h1>
                    <p className="text-xs font-serif text-[#8D645B] tracking-wider">
                      诚挚邀请您见证我们的婚礼
                    </p>
                  </div>

                  {/* 1.1 信封封口阶段 (Sealed / Opening) */}
                  {(splashStage === 'sealed' || splashStage === 'opening') && (
                    <div className="w-full flex flex-col items-center animate-scale-up">
                      <div
                        onClick={handleUnsealWax}
                        className={`relative w-full h-[220px] rounded-2xl cursor-pointer overflow-hidden transition-transform ${
                          splashStage === 'opening' ? 'scale-105' : 'hover:scale-[1.01]'
                        }`}
                        style={{
                          background: 'linear-gradient(145deg, #DEABA4 0%, #D49990 40%, #BF7E75 100%)',
                          boxShadow:
                            '0 20px 50px rgba(130, 75, 68, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.6)',
                        }}
                      >
                        {/* 烫金双细边框 */}
                        <div className="absolute inset-2.5 rounded-xl border border-[#F8D798]/70 pointer-events-none" />
                        <div className="absolute inset-3.5 rounded-lg border border-[#FFF0C8]/40 pointer-events-none" />

                        {/* 三角翻盖 */}
                        <div
                          className="absolute top-0 left-0 right-0 h-[100px]"
                          style={{
                            background:
                              'linear-gradient(180deg, rgba(201, 133, 125, 0.95) 0%, rgba(191, 126, 117, 0.95) 100%)',
                            clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                            borderBottom: '2px solid rgba(248, 215, 152, 0.7)',
                          }}
                        />

                        {/* 中心 3D 火漆印 */}
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                          <OrganicWaxSeal
                            size={84}
                            variant="cinnabar-gold"
                            isOpening={splashStage === 'opening'}
                            interactive={true}
                            onClick={handleUnsealWax}
                            altText="轻触火漆印启封"
                          />
                        </div>

                        <div className="absolute bottom-3 left-0 right-0 text-center text-[10px] text-[#FFF2D4] font-serif tracking-widest">
                          {config.date} · 良缘永结
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-1.5 text-xs font-serif text-[#8D5E53] animate-pulse">
                        <Sparkles className="h-3.5 w-3.5 text-[#D48978]" />
                        <span className="font-bold">轻触火漆印 · 启封请柬</span>
                      </div>
                    </div>
                  )}

                  {/* 1.2 点击火漆印后展出的纸质信笺与信息登记表单 (Unfolded Stationery - 典雅金笺题名雅鉴) */}
                  {splashStage === 'unfolded' && (
                    <div className="w-full flex flex-col items-center animate-scale-up">
                      <div className="relative w-full rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-[#FFFDF9] via-[#FAF6F0] to-[#F5EEE4] shadow-2xl border border-amber-300/80 text-left text-xs font-serif">
                        {/* 烫金双细框 */}
                        <div className="absolute inset-2 rounded-xl border border-amber-400/40 pointer-events-none" />
                        <div className="absolute inset-3 rounded-lg border border-amber-300/20 pointer-events-none" />

                        {/* 信笺头部 */}
                        <div className="text-center pb-2.5 border-b border-amber-200/70">
                          <div className="w-8 h-8 rounded-full bg-[#8B1E1E] text-amber-100 flex items-center justify-center font-bold text-xs mx-auto mb-1 shadow-xs border border-amber-400/30">
                            囍
                          </div>
                          <div className="font-serif font-bold text-stone-900 text-sm tracking-wider">婚礼邀请函</div>
                          <div className="text-[9px] text-stone-400 tracking-widest uppercase">Wedding Invitation</div>
                        </div>

                        {/* 诚意邀请词句 */}
                        <div className="py-2.5 text-stone-700 text-[11px] leading-relaxed text-justify indent-5 font-serif">
                          从相遇、相知到相守，漫漫岁月因为彼此而格外温暖。谨定于 <strong className="text-[#8B1E1E] font-bold">{config.date}</strong> 为 <strong className="text-stone-900 font-bold">{config.groom.name}</strong> 与 <strong className="text-stone-900 font-bold">{config.bride.name}</strong> 举行结婚典礼，诚邀您的见证！
                        </div>

                        {/* 时间地点备忘卡片 */}
                        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] space-y-1.5 mb-3 font-serif">
                          <div className="flex items-center gap-1.5 text-stone-700">
                            <Calendar className="h-3 w-3 text-amber-800 shrink-0" />
                            <span><strong className="text-stone-900">盛典吉时：</strong>{config.date}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-stone-700">
                            <MapPin className="h-3 w-3 text-rose-700 shrink-0" />
                            <span className="truncate"><strong className="text-stone-900">喜筵雅座：</strong>{config.venue.name} · {config.venue.hall}</span>
                          </div>
                        </div>

                        {/* 宾客赐墨署名雅鉴（高定纸质登记 slip） */}
                        <div className="relative pt-3.5 border-t border-amber-300/70 space-y-2.5">
                          {/* 优雅标题 */}
                          <div className="text-center mb-2">
                            <div className="flex items-center justify-center gap-2">
                              <span className="h-px w-6 bg-gradient-to-r from-transparent to-amber-400" />
                              <span className="text-[12px] font-serif font-bold text-[#4A2618] tracking-widest">
                                贵客题名 · 谨订雅席
                              </span>
                              <span className="h-px w-6 bg-gradient-to-l from-transparent to-amber-400" />
                            </div>
                            <p className="text-[10px] text-[#8C6D62] font-serif mt-0.5 tracking-wide">
                              谨呈寸笺，祈候芳音 · 留名以启良辰喜帖
                            </p>
                          </div>

                          {splashErrorMsg && (
                            <div className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[10px] flex items-center gap-1.5">
                              <AlertCircle className="h-3 w-3 shrink-0" />
                              <span>{splashErrorMsg}</span>
                            </div>
                          )}

                          {/* 栏位 1：尊名雅称 */}
                          <div className="rounded-xl bg-white/95 border border-[#E2D5C7] focus-within:border-[#9C2424] focus-within:ring-1 focus-within:ring-[#9C2424]/20 transition-all px-2.5 sm:px-3 py-2 flex items-center gap-2 shadow-2xs overflow-hidden">
                            <span className="text-[11px] font-serif font-medium text-[#7D5A4F] shrink-0 tracking-wider">
                              尊名雅称
                            </span>
                            <span className="w-px h-3.5 bg-[#E2D5C7] shrink-0" />
                            <input
                              type="text"
                              value={splashInputName}
                              onChange={(e) => {
                                setSplashInputName(e.target.value);
                                if (splashErrorMsg) setSplashErrorMsg('');
                              }}
                              placeholder="如：张伟、表姐、大伯全家"
                              maxLength={20}
                              className="min-w-0 flex-1 bg-transparent text-xs text-stone-900 font-serif placeholder:text-stone-400 focus:outline-none"
                            />
                            {splashInputName.trim() && (
                              <span className="text-[10px] text-amber-700 font-serif shrink-0">已录入</span>
                            )}
                          </div>

                          {/* 栏位 2：联络电话 & 优雅微信授权 (自适应防溢出) */}
                          <div className="rounded-xl bg-white/95 border border-[#E2D5C7] focus-within:border-[#9C2424] focus-within:ring-1 focus-within:ring-[#9C2424]/20 transition-all px-2.5 sm:px-3 py-1.5 flex items-center gap-2 shadow-2xs overflow-hidden">
                            <span className="text-[11px] font-serif font-medium text-[#7D5A4F] shrink-0 tracking-wider">
                              联络电话
                            </span>
                            <span className="w-px h-3.5 bg-[#E2D5C7] shrink-0" />
                            <input
                              type="tel"
                              value={splashInputPhone}
                              onChange={(e) => {
                                setSplashInputPhone(e.target.value);
                                if (splashErrorMsg) setSplashErrorMsg('');
                              }}
                              placeholder="手机号"
                              maxLength={11}
                              className="min-w-0 flex-1 bg-transparent text-xs font-mono text-stone-900 placeholder:text-stone-400 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setIsPhoneAuthDialogShow(true)}
                              className="h-6.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-500/30 text-[10px] font-serif font-medium flex items-center gap-1 shrink-0 transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
                              title="一键调取微信授权手机号"
                            >
                              <svg className="w-3 h-3 fill-current text-emerald-600 shrink-0" viewBox="0 0 24 24">
                                <path d="M8.5 2C4.36 2 1 4.91 1 8.5c0 1.99.98 3.78 2.53 4.99L2.8 16.5l3.43-1.72c.72.2 1.48.31 2.27.31.27 0 .53-.02.79-.05-.2-.63-.31-1.3-.31-2 0-3.87 3.58-7 8-7 .2 0 .39.02.59.04C16.27 3.73 12.69 2 8.5 2zM6 6.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm5 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm6.5 2.5c-3.59 0-6.5 2.46-6.5 5.5s2.91 5.5 6.5 5.5c.67 0 1.32-.09 1.92-.26L22.5 21l-.6-2.42c1.32-1.04 2.1-2.53 2.1-4.08 0-3.04-2.91-5.5-6.5-5.5zm-2.25 3.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm4.5 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
                              </svg>
                              <span>微信填入</span>
                            </button>
                          </div>

                          {/* 栏位 3：贺词祈愿 */}
                          <div className="rounded-xl bg-white/95 border border-[#E2D5C7] focus-within:border-[#9C2424] focus-within:ring-1 focus-within:ring-[#9C2424]/20 transition-all p-2.5 shadow-2xs space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-serif text-[#7D5A4F]">
                              <span className="font-medium tracking-wider">贺词祈愿</span>
                              <span className="text-[10px] text-stone-400">可点选古风贺词或亲笔赐言</span>
                            </div>
                            <div className="relative">
                              <textarea
                                rows={2}
                                value={splashInputBlessing}
                                onChange={(e) => setSplashInputBlessing(e.target.value)}
                                placeholder="写下对新人的美好祝愿..."
                                maxLength={100}
                                className="w-full p-1.5 rounded-lg text-xs font-serif text-stone-800 bg-stone-50/70 border border-stone-200/60 focus:bg-white focus:outline-none focus:border-amber-500/80 leading-relaxed resize-none"
                              />
                            </div>
                            
                            {/* 典雅古韵经典贺词选择（去除廉价AI药丸，改为清秀印泥文字标签） */}
                            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                              {[
                                '两姓缔约，百年好合，永结同心！',
                                '佳偶天成，珠联璧合，白首成约！',
                                '朝暮成双，岁岁相欢，琴瑟和鸣！',
                                '新婚大喜，万事胜意，幸福长久！',
                              ].map((txt) => (
                                <button
                                  key={txt}
                                  type="button"
                                  onClick={() => setSplashInputBlessing(txt)}
                                  className={`text-[10px] py-1 px-2 rounded-lg text-left font-serif transition-all border flex items-center gap-1 cursor-pointer truncate ${
                                    splashInputBlessing === txt
                                      ? 'bg-amber-100/80 border-amber-400/80 text-amber-950 font-medium'
                                      : 'bg-stone-50/90 hover:bg-stone-100 text-stone-600 border-stone-200/70'
                                  }`}
                                >
                                  <span className="text-[9px] text-amber-700">✦</span>
                                  <span className="truncate">{txt.split('，')[0]}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 启封请柬大按钮 */}
                          <button
                            type="button"
                            onClick={handleConfirmSplashAndEnter}
                            className="w-full mt-3 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#9C2424] via-[#851818] to-[#6E1111] hover:from-[#A82828] hover:to-[#7A1515] text-[#FFF4DE] font-serif font-medium text-xs tracking-widest shadow-md hover:shadow-lg transition-all cursor-pointer border border-[#E2B771]/70 flex items-center justify-center gap-2"
                          >
                            <span className="text-[10px] text-[#F3C785]">✦</span>
                            <span>恭启良辰喜帖 · 步入盛典</span>
                            <span className="text-[10px] text-[#F3C785]">✦</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* =========================================================================
                   【阶段 2】：已开屏进入喜帖内部 (App Opened)
                   ========================================================================= */
                <>
                  {/* 核心内容区 */}
                  <div
                    className="flex-1 overflow-y-auto overscroll-contain text-xs text-stone-800 custom-scrollbar pb-16"
                    style={{ backgroundColor: currentTheme.bgLight }}
                  >
                    {/* ==================== 1. 请柬主页 (Index) ==================== */}
                    {currentPage === 'index' && (
                      <div className="space-y-4 p-3.5 pt-14 animate-fade-in">
                        
                        {/* 专属宾客尊贵迎宾名牌 (致用户名就好了) */}
                        <div className="rounded-3xl p-4 bg-gradient-to-br from-[#FFFDF8] via-white to-amber-50/70 border border-amber-300/80 shadow-sm space-y-2 text-center animate-fade-in">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/70 border border-amber-300/60 text-amber-900 text-xs font-serif font-bold">
                              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                              <span>致：{wxNickName} 亲启</span>
                            </span>
                            <button
                              onClick={handleResealEnvelope}
                              className="text-[11px] text-amber-800 hover:text-amber-950 underline flex items-center gap-1 cursor-pointer font-serif"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>合上信封 / 重温开屏</span>
                            </button>
                          </div>

                          <p className="text-xs font-serif text-stone-600 leading-relaxed px-1">
                            新郎 <strong className="text-stone-900">{config.groom.name}</strong> 与新娘 <strong className="text-stone-900">{config.bride.name}</strong> 诚挚邀请您的光临与见证！
                          </p>

                          {rsvpBlessing && (
                            <div className="mt-2 flex items-start justify-center gap-1.5 rounded-xl bg-amber-50/60 p-2 border border-amber-200/60 text-[11px] text-amber-900 font-serif">
                              <MessageSquareHeart className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                              <span>您的祝福寄语：“{rsvpBlessing}”</span>
                            </div>
                          )}
                        </div>

                        {/* 迎宾封面卡片 (Wedding Invitation 经典高定构图) */}
                        <div className="rounded-3xl bg-white shadow-md border border-stone-200/80 p-5 text-center space-y-2">
                          <div className="font-serif italic text-[10px] tracking-[0.25em] text-stone-400 uppercase">
                            Wedding Invitation
                          </div>

                          <h1 className="text-2xl font-serif font-bold text-stone-900">
                            {config.groom.name} <span className="font-light text-amber-600">&amp;</span> {config.bride.name}
                          </h1>

                          <div className="text-[10px] text-stone-400 font-serif tracking-widest">
                            {config.groom.pinyin} &amp; {config.bride.pinyin}
                          </div>

                          {/* 婚纱封面大片 (Notion 资源直连) */}
                          <div className="relative mx-auto my-2 overflow-hidden rounded-2xl shadow-sm border border-stone-100 aspect-3/4 max-h-[300px]">
                            <img
                              src={photosList[0]?.url || config.photos[0]?.url || ARTISTIC_COUPLE_COVER}
                              alt="封面婚纱"
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white text-xs font-serif font-medium">
                              {config.invitationTitle || '良缘永结 · 匹配同称'}
                            </div>
                          </div>

                          {/* 优雅倒计时卡片 */}
                          <div className="mt-3">
                            <CountdownTimer targetDateStr={config.date} themePrimary={currentTheme.primary} />
                          </div>

                          {/* 日期吉时 */}
                          <div className="pt-3 border-t border-dashed border-stone-200 text-xs text-stone-600">
                            <div className="font-semibold text-stone-800">{config.date}</div>
                            <div className="text-[11px] text-amber-800/90 mt-0.5">{config.lunarDate}</div>
                          </div>
                        </div>

                        {/* 诚邀致辞誓言卡片 */}
                        <div className="rounded-2xl bg-white p-5 shadow-sm border border-stone-200/60 text-center space-y-1.5">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-serif">
                            Our Vow &amp; Promise
                          </span>
                          <h2 className="text-base font-serif font-bold text-stone-900">
                            谨定吉日 · 诚挚邀请
                          </h2>
                          <div className="mx-auto h-0.5 w-10 rounded-full" style={{ backgroundColor: currentTheme.primary }} />
                          <p className="text-xs text-stone-600 leading-relaxed font-serif whitespace-pre-line px-1 text-justify indent-6">
                            {config.invitationProse || '从相遇、相知到相守，漫漫岁月因为彼此而格外温暖。\n真诚期待您和家人的到来，与我们共同见证这份幸福！'}
                          </p>
                        </div>

                        {/* 新郎新娘名片与一键致电 */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-white p-3.5 shadow-sm border border-stone-200/60 text-center">
                            <div
                              className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-full font-serif font-bold text-white shadow-sm text-xs"
                              style={{ backgroundColor: currentTheme.primary }}
                            >
                              郎
                            </div>
                            <div className="font-serif font-bold text-stone-900 text-xs">{config.groom.name}</div>
                            <div className="text-[9px] text-stone-400 font-serif mb-2">GROOM</div>
                            <button
                              onClick={() => alert(`微信调起拨打电话：${config.groom.phone}`)}
                              className="inline-flex items-center justify-center gap-1 text-[10px] px-2.5 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors w-full cursor-pointer"
                            >
                              <Phone className="h-2.5 w-2.5 text-emerald-600" />
                              <span>呼叫新郎</span>
                            </button>
                          </div>

                          <div className="rounded-2xl bg-white p-3.5 shadow-sm border border-stone-200/60 text-center">
                            <div
                              className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-full font-serif font-bold text-white shadow-sm text-xs"
                              style={{ backgroundColor: currentTheme.primary }}
                            >
                              娘
                            </div>
                            <div className="font-serif font-bold text-stone-900 text-xs">{config.bride.name}</div>
                            <div className="text-[9px] text-stone-400 font-serif mb-2">BRIDE</div>
                            <button
                              onClick={() => alert(`微信调起拨打电话：${config.bride.phone}`)}
                              className="inline-flex items-center justify-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors w-full cursor-pointer font-serif"
                            >
                              <Phone className="h-2.5 w-2.5 text-[#8B1E1E]" />
                              <span>致电新娘</span>
                            </button>
                          </div>
                        </div>

                        {/* 盛典席设快捷卡片 */}
                        <div className="rounded-2xl bg-white p-3.5 shadow-sm border border-stone-200/60 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="flex h-9 w-9 items-center justify-center rounded-xl text-white shrink-0 shadow-xs"
                              style={{ backgroundColor: currentTheme.primary }}
                            >
                              <MapPin className="h-4 w-4" />
                            </div>
                            <div className="text-xs">
                              <div className="font-semibold text-stone-900">{config.venue.name}</div>
                              <div className="text-[11px] text-stone-500 truncate max-w-[170px]">{config.venue.address}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => setCurrentPage('schedule')}
                            className="px-2.5 py-1.5 rounded-full text-[11px] font-bold text-white shrink-0 shadow-xs cursor-pointer flex items-center gap-0.5"
                            style={{ backgroundColor: currentTheme.primary }}
                          >
                            <span>盛典安排</span>
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>

                        {/* 快捷操作区 (彻底移除廉价 AI 表情符号与 Notion 开发者字样，换用高定雅致矢量图标与古风礼仪文案) */}
                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                          <button
                            onClick={() => setCurrentPage('rsvp')}
                            className="p-3.5 rounded-2xl bg-gradient-to-br from-[#9C2424] to-[#8B1E1E] text-white flex flex-col items-center justify-center shadow-md cursor-pointer hover:opacity-95 transition-all"
                          >
                            <MailOpen className="h-5 w-5 mb-1 text-amber-200 stroke-[1.8]" />
                            <span className="font-bold text-xs font-serif tracking-wide">出席回执</span>
                            <span className="text-[10px] text-white/85 mt-0.5">敬备喜筵 · 恭候光临</span>
                          </button>
                          <button
                            onClick={() => setCurrentPage('blessings')}
                            className="p-3.5 rounded-2xl bg-gradient-to-br from-[#FFFDF8] to-[#FAF4EC] text-[#5C3D1E] border border-amber-300/80 flex flex-col items-center justify-center shadow-xs cursor-pointer hover:bg-amber-100/50 transition-all"
                          >
                            <MessageSquareHeart className="h-5 w-5 mb-1 text-[#8B1E1E] stroke-[1.8]" />
                            <span className="font-bold text-xs font-serif tracking-wide">亲友祝福</span>
                            <span className="text-[10px] text-stone-500 mt-0.5">字句真情 · 共贺良缘</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ==================== 2. 婚纱相册与恋爱纪事 (Gallery) ==================== */}
                    {currentPage === 'gallery' && (
                      <div className="p-3.5 space-y-6 animate-fade-in">
                        <div className="text-center">
                          <span className="text-[10px] uppercase tracking-[0.25em] text-stone-400 font-serif">
                            Wedding Memories
                          </span>
                          <h2 className="text-xl font-serif font-bold text-stone-900 mt-0.5">
                            婚纱大片 · 定格幸福
                          </h2>
                          <div className="mx-auto mt-2 h-0.5 w-10 rounded-full" style={{ backgroundColor: currentTheme.primary }} />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          {(photosList.length > 0 ? photosList : config.photos).map((photo, index) => (
                            <div
                              key={index}
                              onClick={() => setActivePhotoIndex(index)}
                              className={`group relative overflow-hidden rounded-2xl bg-stone-100 shadow-sm border border-stone-200/60 cursor-pointer ${
                                photo.aspect === 'landscape' ? 'col-span-2 aspect-16/10' : 'col-span-1 aspect-3/4'
                              }`}
                            >
                              <img
                                src={photo.url}
                                alt={photo.title}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                              <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white text-[11px] font-serif font-medium truncate">
                                {photo.title || '幸福剪影'}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 恋爱历程时间轴 */}
                        <div className="mt-8">
                          <div className="text-center mb-5">
                            <span className="text-[10px] uppercase tracking-[0.25em] text-stone-400 font-serif">
                              Our Love Story
                            </span>
                            <h2 className="text-xl font-serif font-bold text-stone-900 mt-0.5 flex items-center justify-center gap-2">
                              <span>浪漫纪事 · 甜蜜时光</span>
                            </h2>
                            <div className="mx-auto mt-2 h-0.5 w-10 rounded-full" style={{ backgroundColor: currentTheme.primary }} />
                          </div>

                          <div className="relative pl-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-200">
                            {config.stories.map((story) => (
                              <div key={story.id} className="relative mb-6 last:mb-0">
                                <div
                                  className="absolute -left-[27px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm border"
                                  style={{ borderColor: currentTheme.primary }}
                                >
                                  <Heart className="h-3 w-3 fill-current" style={{ color: currentTheme.primary }} />
                                </div>

                                <div className="rounded-2xl bg-white p-4 shadow-sm border border-stone-200/60 overflow-hidden">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                                      {story.date}
                                    </span>
                                    <span className="text-[10px] font-serif text-stone-400">Memory</span>
                                  </div>

                                  <h3 className="text-sm font-serif font-bold text-stone-800 mb-1.5">
                                    {story.title}
                                  </h3>

                                  {story.image && (
                                    <div className="mb-2.5 overflow-hidden rounded-xl bg-stone-100 max-h-36">
                                      <img
                                        src={story.image}
                                        alt={story.title}
                                        className="h-full w-full object-cover"
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
                        </div>
                      </div>
                    )}

                    {/* ==================== 3. 盛典与席设导航 (Schedule) ==================== */}
                    {currentPage === 'schedule' && (
                      <div className="p-3.5 space-y-5 animate-fade-in">
                        <div className="text-center">
                          <span className="text-[10px] uppercase tracking-[0.25em] text-stone-400 font-serif">
                            Location &amp; Schedule
                          </span>
                          <h2 className="text-xl font-serif font-bold text-stone-900 mt-0.5">
                            盛典日程 · 席设导航
                          </h2>
                          <div className="mx-auto mt-2 h-0.5 w-10 rounded-full" style={{ backgroundColor: currentTheme.primary }} />
                        </div>

                        {/* 宴席卡片 */}
                        <div className="rounded-3xl bg-white p-5 border border-amber-200/80 shadow-md text-center space-y-2.5">
                          <div className="font-serif italic text-[10px] tracking-[0.25em] text-stone-400 uppercase">
                            Reception &amp; Banquet
                          </div>
                          <div className="text-lg font-serif font-bold text-stone-900">
                            {config.venue.name}
                          </div>
                          <div className="text-xs text-[#B8860B] font-serif font-semibold">{config.venue.hall}</div>

                          <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80 text-xs text-stone-700 flex items-center justify-center gap-1.5 my-2">
                            <MapPin className="h-4 w-4 text-[#8B1E1E] shrink-0" />
                            <span>{config.venue.address}</span>
                          </div>

                          <button
                            onClick={() =>
                              alert(`微信调起原生腾讯地图导航：\n目的地：${config.venue.name}\n详细地址：${config.venue.address}`)
                            }
                            className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#9C2424] to-[#8B1E1E] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer hover:opacity-95 transition-all"
                          >
                            <MapPin className="h-3.5 w-3.5 text-amber-200" />
                            <span>开启地图导航</span>
                          </button>
                        </div>

                        {/* 盛典时间轴 */}
                        <div className="rounded-3xl bg-white p-5 border border-stone-200/80 shadow-sm space-y-3.5">
                          <div className="text-center pb-2 border-b border-stone-100">
                            <div className="text-xs font-serif font-bold text-stone-900">盛典当日议程安排</div>
                            <div className="text-[10px] text-stone-400 font-serif">WEDDING TIMELINE</div>
                          </div>

                          {(config.schedule || []).map((item, i) => (
                            <div key={i} className="flex items-center gap-3 py-1.5 border-b border-stone-100/60 last:border-0">
                              <span className="font-mono font-bold text-xs text-[#8B1E1E] shrink-0 w-12 text-right">
                                {item.time}
                              </span>
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                              <div className="flex-1">
                                <div className="font-serif font-bold text-xs text-stone-900">{item.title}</div>
                                <div className="text-[10px] text-stone-500 font-serif">{item.desc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ==================== 4. 出席回执登记 (RSVP) ==================== */}
                    {currentPage === 'rsvp' && (
                      <div className="p-3.5 space-y-4 animate-fade-in">
                        <div className="text-center">
                          <span className="text-[10px] uppercase tracking-[0.25em] text-stone-400 font-serif">
                            RSVP &amp; Attendance
                          </span>
                          <h2 className="text-xl font-serif font-bold text-stone-900 mt-0.5">
                            宾客回执 · 席位确认
                          </h2>
                          <div className="mx-auto mt-2 h-0.5 w-10 rounded-full" style={{ backgroundColor: currentTheme.primary }} />
                        </div>

                        {/* 微信官方授权互联尊贵卡片 */}
                        <div className="rounded-3xl p-4 bg-gradient-to-br from-[#FFFDF9] via-white to-amber-50/60 border border-amber-300/80 shadow-sm space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-[#07C160]" />
                              <span>微信官方授权互联</span>
                            </span>
                            <span className="text-[10px] text-stone-500">已授权绑定微信</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              <img
                                src={wxAvatar}
                                alt="微信头像"
                                className="w-12 h-12 rounded-full border-2 border-amber-400 object-cover shadow-xs"
                              />
                              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#8B1E1E] text-white text-[8px] px-1.5 rounded-full whitespace-nowrap">
                                点选
                              </span>
                            </div>
                            <div className="flex-1">
                              <label className="text-[11px] font-medium text-stone-700 block mb-0.5 font-serif">
                                宾客称谓 / 微信昵称 <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={wxNickName}
                                onChange={(e) => setWxNickName(e.target.value)}
                                placeholder="如：伴郎小明、表姐全家"
                                className="w-full px-3 py-1.5 rounded-xl border border-stone-200 text-xs bg-white focus:outline-none focus:border-[#8B1E1E] font-medium font-serif"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-medium text-stone-700 block mb-0.5 font-serif">
                              联系电话 <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={wxPhone}
                                onChange={(e) => setWxPhone(e.target.value)}
                                placeholder="请授权或输入手机号"
                                className="flex-1 px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-mono bg-white focus:outline-none focus:border-[#8B1E1E]"
                              />
                              <button
                                onClick={() => setIsPhoneAuthDialogShow(true)}
                                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-[#8B1E1E] border border-amber-300/70 font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
                              >
                                <span>微信授权填入</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 出席信息表单 */}
                        <div className="rounded-3xl bg-white p-5 border border-stone-200/80 shadow-sm space-y-3.5">
                          <div>
                            <label className="font-serif font-bold text-xs text-stone-900 block mb-1.5">
                              您是否能拨冗出席盛宴？ <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setRsvpStatus('yes')}
                                className={`py-2 rounded-xl font-serif font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                  rsvpStatus === 'yes'
                                    ? 'bg-amber-50 border-[#8B1E1E] text-[#8B1E1E] shadow-2xs'
                                    : 'bg-stone-50 border-stone-200 text-stone-600'
                                }`}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>准时赴宴</span>
                              </button>
                              <button
                                onClick={() => setRsvpStatus('no')}
                                className={`py-2 rounded-xl font-serif font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                  rsvpStatus === 'no'
                                    ? 'bg-amber-50 border-[#8B1E1E] text-[#8B1E1E] shadow-2xs'
                                    : 'bg-stone-50 border-stone-200 text-stone-600'
                                }`}
                              >
                                <Heart className="h-3.5 w-3.5 opacity-60" />
                                <span>遗憾缺席</span>
                              </button>
                            </div>
                          </div>

                          {rsvpStatus === 'yes' && (
                            <>
                              <div>
                                <label className="font-serif font-bold text-xs text-stone-900 block mb-1">
                                  同行出席人数 (含本人)
                                </label>
                                <div className="flex gap-1.5">
                                  {[1, 2, 3, 4, 5].map((cnt) => (
                                    <button
                                      key={cnt}
                                      onClick={() => setRsvpGuestsCount(cnt)}
                                      className={`flex-1 py-1.5 rounded-xl text-xs font-serif font-bold border transition-colors cursor-pointer ${
                                        rsvpGuestsCount === cnt
                                          ? 'bg-[#8B1E1E] border-[#8B1E1E] text-white shadow-2xs'
                                          : 'bg-stone-50 border-stone-200 text-stone-600'
                                      }`}
                                    >
                                      {cnt}人
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="font-serif font-bold text-xs text-stone-900 block mb-1">
                                  饮食偏好 / 忌口
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                  {[
                                    { key: 'standard', label: '正常荤素' },
                                    { key: 'halal', label: '清真饮食' },
                                    { key: 'vegetarian', label: '纯素食' },
                                    { key: 'child', label: '儿童餐' },
                                  ].map((diet) => (
                                    <button
                                      key={diet.key}
                                      onClick={() => setRsvpDietary(diet.key as any)}
                                      className={`px-3 py-1 rounded-full text-xs font-serif border transition-colors cursor-pointer ${
                                        rsvpDietary === diet.key
                                          ? 'bg-[#D4AF37] border-[#D4AF37] text-white font-bold'
                                          : 'bg-stone-50 border-stone-200 text-stone-600'
                                      }`}
                                    >
                                      {diet.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="font-serif font-bold text-xs text-stone-900 block mb-1">
                                  婚礼接驳大巴需求
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => setRsvpNeedShuttle(true)}
                                    className={`py-1.5 rounded-xl text-xs border font-serif cursor-pointer ${
                                      rsvpNeedShuttle
                                        ? 'bg-amber-50 border-[#8B1E1E] text-[#8B1E1E] font-bold'
                                        : 'bg-stone-50 border-stone-200 text-stone-600'
                                    }`}
                                  >
                                    需要接驳班车
                                  </button>
                                  <button
                                    onClick={() => setRsvpNeedShuttle(false)}
                                    className={`py-1.5 rounded-xl text-xs border font-serif cursor-pointer ${
                                      !rsvpNeedShuttle
                                        ? 'bg-amber-50 border-[#8B1E1E] text-[#8B1E1E] font-bold'
                                        : 'bg-stone-50 border-stone-200 text-stone-600'
                                    }`}
                                  >
                                    自行前往 / 自驾
                                  </button>
                                </div>
                              </div>
                            </>
                          )}

                          <div>
                            <label className="font-serif font-bold text-xs text-stone-900 block mb-1">
                              对新人的祝福寄语
                            </label>
                            <textarea
                              rows={2}
                              value={rsvpBlessing}
                              onChange={(e) => setRsvpBlessing(e.target.value)}
                              placeholder="写下对新人的美好愿景..."
                              className="w-full p-2.5 rounded-2xl border border-stone-200 text-xs bg-stone-50 focus:bg-white focus:outline-none focus:border-[#8B1E1E] font-serif"
                            />
                          </div>

                          <button
                            onClick={handleSubmitRsvp}
                            disabled={isSubmittingRsvp}
                            className="w-full py-3 rounded-full bg-gradient-to-r from-[#9C2424] to-[#8B1E1E] text-white font-bold text-xs shadow-md cursor-pointer hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
                          >
                            {isSubmittingRsvp ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                <span>正在推送到 Notion 数据库...</span>
                              </>
                            ) : (
                              <>
                                <Send className="h-3.5 w-3.5" />
                                <span>确认提交回执 (实时写入 Notion)</span>
                              </>
                            )}
                          </button>

                          {rsvpSuccessTip && (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs text-center flex items-center justify-center gap-1.5 animate-fade-in">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              <span>回执登记成功！已实时推送到新人的 Notion 数据库！</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ==================== 5. 真挚祝福与弹幕留言 (Blessings) ==================== */}
                    {currentPage === 'blessings' && (
                      <div className="p-3.5 space-y-5 animate-fade-in">
                        <div className="text-center">
                          <span className="text-[10px] uppercase tracking-[0.25em] text-stone-400 font-serif">
                            Blessings &amp; Wishes
                          </span>
                          <h2 className="text-xl font-serif font-bold text-stone-900 mt-0.5">
                            宾客留言 · 弹幕送福
                          </h2>
                          <div className="mx-auto mt-2 h-0.5 w-10 rounded-full" style={{ backgroundColor: currentTheme.primary }} />
                        </div>

                        <div className="relative rounded-3xl bg-white p-5 shadow-sm border border-stone-200/60 text-center overflow-hidden">
                          <div className="text-xs text-stone-500 mb-1">已收到亲友真挚祝福</div>
                          <div className="font-mono text-3xl font-bold tracking-tight text-stone-900 mb-3">
                            {heartsCount.toLocaleString()} <span className="text-xs font-normal text-stone-400">条心意</span>
                          </div>

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
                              style={{ backgroundColor: currentTheme.primary }}
                            >
                              <Heart className="h-4 w-4 fill-white" />
                              <span>送上新婚祝福</span>
                            </button>
                          </div>
                        </div>

                        <div className="rounded-3xl bg-white p-4.5 border border-stone-200/80 shadow-sm space-y-3">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={inputBlessing}
                              onChange={(e) => setInputBlessing(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSendBlessing()}
                              placeholder="写下对新人的真挚新婚祝愿..."
                              className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:bg-white focus:outline-none focus:border-[#8B1E1E] font-serif"
                            />
                            <button
                              onClick={() => handleSendBlessing()}
                              disabled={isSendingBlessing || !inputBlessing.trim()}
                              className="px-4 py-2 rounded-xl bg-[#8B1E1E] text-white font-bold text-xs shrink-0 shadow-xs cursor-pointer hover:bg-[#731919] disabled:opacity-50"
                            >
                              发送
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {['百年好合 永结同心', '佳偶天成 白头偕老', '新婚大喜 甜甜蜜蜜', '琴瑟和鸣 早生贵子'].map((tag) => (
                              <button
                                key={tag}
                                onClick={() => handleSendBlessing(tag)}
                                className="text-[10px] font-serif px-2.5 py-1 rounded-full bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 border border-stone-200/60 transition-colors cursor-pointer"
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          {blessingsList.map((item) => (
                            <div
                              key={item.id}
                              className="p-3.5 rounded-2xl bg-white border border-stone-200/70 shadow-xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-[10px]">
                                    {item.author.slice(0, 1)}
                                  </div>
                                  <span className="font-serif font-bold text-xs text-stone-900">{item.author}</span>
                                </div>
                                <span className="text-[10px] text-stone-400 font-mono">{item.createdAt || '刚刚'}</span>
                              </div>
                              <p className="text-xs text-stone-700 font-serif leading-relaxed pl-8">
                                {item.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ==================== 6. 小程序内嵌管理后台 (Admin - Notion) ==================== */}
                    {currentPage === 'admin' && (
                      <div className="p-3.5 space-y-4 animate-fade-in">
                        {!isAdminUnlocked ? (
                          <div className="rounded-3xl bg-white p-6 border border-stone-200 shadow-md text-center space-y-3 mt-6">
                            <div className="w-12 h-12 rounded-full bg-amber-50 text-[#8B1E1E] mx-auto flex items-center justify-center font-serif text-2xl font-bold border-2 border-[#C5A059] shadow-xs">
                              囍
                            </div>
                            <div className="font-serif font-bold text-sm text-stone-900">
                              婚礼主人专属后台 (Notion)
                            </div>
                            <p className="text-[11px] text-stone-500">
                              默认进入密码：<strong className="text-[#8B1E1E]">8888</strong>
                            </p>
                            <input
                              type="password"
                              value={adminPin}
                              onChange={(e) => setAdminPin(e.target.value)}
                              placeholder="请输入 4 位主人密码"
                              className="w-full text-center px-4 py-2 rounded-xl border border-stone-300 text-sm tracking-widest"
                            />
                            <button
                              onClick={() => {
                                if (adminPin === '8888' || adminPin === '1314') {
                                  setIsAdminUnlocked(true);
                                  loadAdminRsvps();
                                } else {
                                  alert('密码有误，默认密码为 8888');
                                }
                              }}
                              className="w-full py-2.5 rounded-full bg-[#8B1E1E] text-white font-bold text-xs shadow-sm cursor-pointer"
                            >
                              验证进入后台
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="font-serif font-bold text-xs text-stone-900 flex items-center gap-1.5">
                                <Settings className="h-3.5 w-3.5 text-[#8B1E1E]" />
                                <span>婚礼主人管理后台</span>
                              </span>
                              <button
                                onClick={() => setIsAdminUnlocked(false)}
                                className="text-[10px] text-stone-500 hover:text-stone-800 underline cursor-pointer"
                              >
                                退出管理
                              </button>
                            </div>

                            <div className="flex gap-1 p-1 bg-stone-200/70 rounded-xl text-[11px]">
                              <button
                                onClick={() => {
                                  setAdminTab('guests');
                                  loadAdminRsvps();
                                }}
                                className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                  adminTab === 'guests' ? 'bg-[#8B1E1E] text-white shadow-2xs' : 'text-stone-700'
                                }`}
                              >
                                <Users className="h-3 w-3" />
                                <span>宾客回执</span>
                              </button>
                              <button
                                onClick={() => setAdminTab('photos')}
                                className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                  adminTab === 'photos' ? 'bg-[#8B1E1E] text-white shadow-2xs' : 'text-stone-700'
                                }`}
                              >
                                <Camera className="h-3 w-3" />
                                <span>相册管理</span>
                              </button>
                              <button
                                onClick={() => setAdminTab('notion')}
                                className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                  adminTab === 'notion' ? 'bg-[#8B1E1E] text-white shadow-2xs' : 'text-stone-700'
                                }`}
                              >
                                <Database className="h-3 w-3" />
                                <span>数据属性</span>
                              </button>
                            </div>

                            {adminTab === 'guests' && (
                              <div className="space-y-2">
                                <div className="flex justify-between items-center text-[11px] text-stone-500">
                                  <span>共 {adminRsvps.length} 条 Notion 实时记录</span>
                                  <button onClick={loadAdminRsvps} className="text-[#8B1E1E] font-bold underline cursor-pointer">
                                    {loadingAdminRsvps ? '刷新中...' : '刷新'}
                                  </button>
                                </div>
                                {adminRsvps.map((r, i) => (
                                  <div
                                    key={r.id || i}
                                    className="bg-white p-3 rounded-2xl border border-stone-200 text-xs space-y-1 shadow-2xs"
                                  >
                                    <div className="flex justify-between font-bold">
                                      <span>{r.name}</span>
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[10px] ${
                                          r.attending === 'yes'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-stone-100 text-stone-600'
                                        }`}
                                      >
                                        {r.attending === 'yes' ? '出席' : '缺席'} · {r.guestCount}人
                                      </span>
                                    </div>
                                    <div className="text-stone-600 text-[11px] flex justify-between">
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-2.5 w-2.5 text-[#8B1E1E]" />
                                        <span>{r.phone}</span>
                                      </span>
                                      <span>{r.dietary || '正常'}</span>
                                    </div>
                                    {r.blessing && (
                                      <div className="text-[10px] text-[#8B1E1E] italic bg-amber-50 p-1.5 rounded-xl font-serif">
                                        "{r.blessing}"
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {adminTab === 'photos' && (
                              <div className="bg-white p-4 rounded-3xl border border-amber-300/80 space-y-2.5">
                                <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                                  <Camera className="h-3.5 w-3.5 text-[#8B1E1E]" />
                                  <span>上传相片至婚纱相册</span>
                                </div>
                                <div className="text-[10px] text-stone-500">
                                  选取照片直接存入 Notion 页面图片块，小程序相册实时呈现！
                                </div>

                                <label className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#8B1E1E] text-white font-bold text-xs cursor-pointer hover:bg-[#731919]">
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>选取手机照片上传</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleUploadPhotoToNotion}
                                    className="hidden"
                                  />
                                </label>

                                {isUploadingPhoto && (
                                  <div className="text-center text-xs text-amber-700 font-bold animate-pulse">
                                    {photoUploadMsg}
                                  </div>
                                )}

                                <div className="grid grid-cols-3 gap-1.5 pt-2">
                                  {photosList.map((p, i) => (
                                    <img
                                      key={i}
                                      src={p.url}
                                      alt="相片"
                                      className="w-full h-16 rounded-xl object-cover border border-stone-200"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {adminTab === 'notion' && (
                              <div className="bg-white p-4 rounded-3xl border border-stone-200 space-y-2">
                                <div className="font-bold text-xs text-stone-800 flex items-center gap-1.5">
                                  <Database className="h-3.5 w-3.5 text-[#8B1E1E]" />
                                  <span>Notion 数据库表头属性列</span>
                                </div>
                                <div className="text-[10px] text-stone-500">
                                  包含：姓名(Title)、出席状态(Select)、同行人数(Number)、手机号(Phone/RichText)、饮食(Select)、班车(Checkbox)、祝福(RichText)
                                </div>
                                <button
                                  onClick={async () => {
                                    setIsAutoInitColumns(true);
                                    await initNotionDatabaseSchema('all');
                                    setIsAutoInitColumns(false);
                                    alert('已自动为 Notion 数据库补齐 6 大标准属性列！');
                                  }}
                                  disabled={isAutoInitColumns}
                                  className="w-full py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#B8860B] text-white font-bold text-xs cursor-pointer shadow-xs"
                                >
                                  {isAutoInitColumns ? '正在更新列...' : '初始化并补齐 Notion 数据库属性列'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 微信原生底部 TabBar (仅在进入喜帖后显示) */}
                  <div className="h-14 bg-white/95 backdrop-blur-xl border-t border-stone-200/80 flex items-center justify-around px-2 z-40 select-none shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
                    {navTabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = currentPage === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setCurrentPage(tab.id)}
                          className={`relative flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-all ${
                            isActive ? 'scale-105' : 'hover:opacity-80 active:scale-95'
                          }`}
                        >
                          <div className="relative">
                            <Icon
                              className={`h-5 w-5 transition-transform ${
                                isActive ? 'scale-110' : 'text-stone-400'
                              }`}
                              style={{
                                color: isActive ? currentTheme.primary : undefined,
                                strokeWidth: isActive ? 2.3 : 1.8,
                              }}
                            />
                            {tab.id === 'blessings' && (
                              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                              </span>
                            )}
                          </div>

                          <span
                            className={`text-[11px] font-serif tracking-tight mt-0.5 transition-colors ${
                              isActive ? 'font-bold' : 'text-stone-500 font-normal'
                            }`}
                            style={{
                              color: isActive ? currentTheme.primary : undefined,
                            }}
                          >
                            {tab.label}
                          </span>

                          {isActive && (
                            <div
                              className="mt-0.5 h-0.5 w-3 rounded-full"
                              style={{ backgroundColor: currentTheme.primary }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* 微信原生手机号授权模拟弹窗 */}
              {isPhoneAuthDialogShow && (
                <div className="absolute inset-0 z-50 bg-black/60 flex items-end justify-center animate-fade-in">
                  <div className="w-full bg-white rounded-t-3xl p-5 space-y-4 shadow-2xl animate-slide-up">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#07C160] text-white flex items-center justify-center text-xs font-bold">
                          微
                        </div>
                        <span className="font-bold text-xs text-stone-900">
                          {config.invitationTitle || '结婚请柬'} 申请
                        </span>
                      </div>
                      <button
                        onClick={() => setIsPhoneAuthDialogShow(false)}
                        className="text-stone-400 hover:text-stone-700 text-sm cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="text-left space-y-1">
                      <div className="text-sm font-bold text-stone-900">
                        获取你的手机号
                      </div>
                      <div className="text-[11px] text-stone-500">
                        用于向新人提交宴席出席席位回执与联系确认
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200">
                      <div>
                        <div className="text-xs font-bold font-mono text-stone-900">
                          138 8888 8888
                        </div>
                        <div className="text-[10px] text-stone-400">
                          微信绑定号码
                        </div>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-[#07C160]" />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <button
                        onClick={() => setIsPhoneAuthDialogShow(false)}
                        className="py-2.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs cursor-pointer"
                      >
                        拒绝
                      </button>
                      <button
                        onClick={handleConfirmPhoneAuth}
                        className="py-2.5 rounded-full bg-[#07C160] hover:bg-[#06AD56] text-white font-bold text-xs shadow-md cursor-pointer"
                      >
                        允许并填入
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 全屏灯箱展示 (Lightbox) */}
              {activePhotoIndex !== null && (
                <div
                  onClick={() => setActivePhotoIndex(null)}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md animate-fade-in"
                >
                  <button
                    onClick={() => setActivePhotoIndex(null)}
                    className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <img
                    src={(photosList[activePhotoIndex] || config.photos[activePhotoIndex])?.url}
                    alt="大图"
                    className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
                  />
                </div>
              )}

            </div>
          </div>
        </div>

        {/* 右侧面板：原生小程序工程一键导出与项目源码 */}
        <div className="hidden lg:flex w-[380px] flex-col bg-stone-950 border-l border-stone-800 p-5 overflow-y-auto text-xs text-stone-300">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-[#07C160] text-white font-bold text-xs">
                WX
              </span>
              <div>
                <h3 className="font-bold text-white text-sm">原生微信小程序工程</h3>
                <p className="text-[10px] text-stone-400">已包含全套原生 WXML/WXSS/JS</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 核心亮点提示 */}
          <div className="my-4 space-y-2.5">
            <div className="p-3 rounded-2xl bg-stone-900 border border-stone-800 space-y-1">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                <span>开屏火漆印开帖 + 必须登记称谓手机号</span>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                全屏火漆信封开屏，点击火漆印展开信笺，登记称谓、手机号及祝福后步入盛典。
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-stone-900 border border-stone-800 space-y-1">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                <span>进入请柬呈现「致：用户名 亲启」</span>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                内部主页直接呈现客制化专属致辞，并支持合上信封随时重温。
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-stone-900 border border-stone-800 space-y-1">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                <span>微信官方登录与手机号授权</span>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                遵循官方规范，支持 open-type="chooseAvatar" 与 getPhoneNumber。
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-stone-900 border border-stone-800 space-y-1">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                <span>Notion 数据库双向直通</span>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                开屏填入的称谓、手机与祝福实时同步写入 Notion 数据库。
              </p>
            </div>
          </div>

          {/* 正式生产环境地址提示 */}
          <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-[11px] text-stone-300 flex items-center justify-between flex-wrap gap-1.5">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="text-stone-400">正式生产接口:</span>
              <span className="font-mono text-emerald-400 truncate select-all">
                https://ais-pre-tu3wda4ph65z74rogikrl2-267716153838.asia-northeast1.run.app
              </span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0">
              已内置正式生产域名
            </span>
          </div>

          {/* 一键操作按钮组 */}
          <div className="space-y-2 pt-1">
            <a
              href="/api/miniprogram/download"
              download="wedding-miniprogram.zip"
              className="w-full py-3 rounded-xl bg-[#07C160] hover:bg-[#06AD56] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all text-center"
            >
              <Download className="h-4 w-4" />
              <span>一键下载微信小程序完整源码包 (.zip)</span>
            </a>

            <button
              onClick={handleOpenCodeDrawer}
              className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-xs flex items-center justify-center gap-1.5 border border-stone-700 cursor-pointer"
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>在线浏览微信小程序工程文件 ({mpFiles.length || 18}个文件)</span>
            </button>
          </div>

          {/* 导入开发者工具教程 */}
          <div className="mt-5 p-3.5 rounded-2xl bg-stone-900/80 border border-stone-800/80 text-[11px] text-stone-400 space-y-1.5">
            <div className="font-bold text-stone-200">微信开发者工具导入步骤：</div>
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li>点击上方按钮下载并解压 zip 压缩包；</li>
              <li>打开【微信开发者工具】，选择“导入项目”；</li>
              <li>目录选择解压出来的 miniprogram 文件夹；</li>
              <li>AppID 填自己的或选择“测试号”即可直接编译预览！</li>
            </ol>
          </div>
        </div>

        {/* 源码抽屉 */}
        {isCodeDrawerOpen && (
          <div className="absolute inset-0 z-50 bg-black/90 flex flex-col p-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2 text-white font-bold">
                <Code2 className="h-4 w-4 text-[#07C160]" />
                <span>微信小程序原生工程文件查看器</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-stone-300" />}
                  <span>{copiedCode ? '已复制' : '复制代码'}</span>
                </button>
                <button
                  onClick={() => setIsCodeDrawerOpen(false)}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden pt-3 gap-3">
              <div className="w-64 bg-stone-950 rounded-xl p-2 overflow-y-auto space-y-1 border border-stone-800">
                {mpFiles.map((file, idx) => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFileIndex(idx)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs truncate cursor-pointer transition-colors ${
                      selectedFileIndex === idx
                        ? 'bg-[#07C160] text-white font-bold'
                        : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
                    }`}
                  >
                    {file.name}
                  </button>
                ))}
              </div>

              <div className="flex-1 bg-stone-950 rounded-xl p-4 overflow-y-auto font-mono text-xs text-stone-300 border border-stone-800">
                <pre className="whitespace-pre-wrap">
                  {mpFiles[selectedFileIndex]?.content || '加载中...'}
                </pre>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
