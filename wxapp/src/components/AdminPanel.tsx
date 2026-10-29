import React, { useState, useEffect, useRef } from 'react';
import { WeddingConfig, WeddingTheme, GuestRSVP, GuestBlessing, PhotoItem } from '../types/wedding';
import { THEME_PRESETS, DEFAULT_BGM_LIST } from '../data/defaultData';
import {
  getNotionStatus,
  testNotionConnection,
  saveNotionConfig,
  fetchNotionConfig,
  fetchNotionRsvps,
  fetchNotionBlessings,
  fetchNotionCredentials,
  saveNotionCredentials,
  cleanNotionId,
  autoDiscoverNotion,
  initNotionDatabaseSchema,
  uploadNotionImage,
  fetchNotionImages,
  fetchWeChatConfig,
  saveWeChatConfig,
  weChatLogin,
  weChatGetPhone,
  NotionStatus,
  NotionCredentials,
  NotionConnectionTestResult,
} from '../utils/notionService';
import {
  X,
  Palette,
  Users,
  MapPin,
  Image,
  Calendar,
  Music,
  Download,
  Trash2,
  Plus,
  Upload,
  Check,
  Sparkles,
  Database,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Server,
  CheckCircle2,
  CloudUpload,
  Key,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Save,
  HelpCircle,
  MessageSquareHeart,
  CheckCircle,
  TableProperties,
  Smartphone,
  Copy,
  Code2,
  Cloud,
  Heart,
  Mail,
  ClipboardList,
  Sliders,
} from 'lucide-react';

interface AdminPanelProps {
  config: WeddingConfig;
  onUpdateConfig: (newConfig: WeddingConfig) => void;
  rsvpList: GuestRSVP[];
  onDeleteRsvp: (id: string) => void;
  blessings: GuestBlessing[];
  onDeleteBlessing: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  config,
  onUpdateConfig,
  rsvpList,
  onDeleteRsvp,
  blessings,
  onDeleteBlessing,
  isOpen,
  onClose,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<
    'theme' | 'basic' | 'venue' | 'photos' | 'music' | 'schedule' | 'rsvp' | 'blessings' | 'notion' | 'miniprogram'
  >('theme');

  const tabsRef = useRef<HTMLDivElement>(null);
  const [savedTip, setSavedTip] = useState(false);
  const [notionStatus, setNotionStatus] = useState<NotionStatus | null>(null);
  const [isTestingNotion, setIsTestingNotion] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [isPushingNotion, setIsPushingNotion] = useState(false);
  const [isPullingNotion, setIsPullingNotion] = useState(false);
  const [syncTip, setSyncTip] = useState<string | null>(null);

  // Notion 动态交互表单状态
  const [credsForm, setCredsForm] = useState<NotionCredentials>({
    apiKey: '',
    rsvpDbId: '',
    blessingsDbId: '',
    configPageId: '',
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSavingCreds, setIsSavingCreds] = useState(false);
  const [credsSaveResult, setCredsSaveResult] = useState<NotionConnectionTestResult | null>(null);

  // Notion 婚纱照直传与资源管理
  const [isUploadingToNotion, setIsUploadingToNotion] = useState(false);
  const [notionPhotoUploadStatus, setNotionPhotoUploadStatus] = useState<string | null>(null);

  const handleUploadDirectToNotion = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      if (base64) {
        setIsUploadingToNotion(true);
        setNotionPhotoUploadStatus('正在上传并推送到 Notion 页面图片 Block...');
        try {
          const res = await uploadNotionImage(base64, file.name.replace(/\.[^/.]+$/, ''));
          setIsUploadingToNotion(false);
          if (res.success && res.imageUrl) {
            setNotionPhotoUploadStatus('图片已成功上传并嵌入 Notion 页面图片 Block！');
            const newPhoto: PhotoItem = {
              id: `photo-notion-${Date.now()}`,
              url: res.imageUrl,
              title: file.name.replace(/\.[^/.]+$/, '') || 'Notion 婚纱大片',
              aspect: 'portrait',
            };
            updateField('photos', [newPhoto, ...config.photos]);
            setTimeout(() => setNotionPhotoUploadStatus(null), 4000);
          } else {
            setNotionPhotoUploadStatus(`上传失败: ${res.message}`);
          }
        } catch (err: any) {
          setIsUploadingToNotion(false);
          setNotionPhotoUploadStatus(`上传异常: ${err.message}`);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // 微信小程序配置状态
  const [weChatAppId, setWeChatAppId] = useState('');
  const [weChatAppSecret, setWeChatAppSecret] = useState('');
  const [weChatConfigStatus, setWeChatConfigStatus] = useState<{
    hasAppId: boolean;
    appId: string;
    rawAppId?: string;
    hasAppSecret: boolean;
  } | null>(null);
  const [isSavingWeChat, setIsSavingWeChat] = useState(false);
  const [weChatSaveTip, setWeChatSaveTip] = useState<string | null>(null);

  useEffect(() => {
    fetchWeChatConfig().then((cfg) => {
      setWeChatConfigStatus(cfg);
      if (cfg.rawAppId) setWeChatAppId(cfg.rawAppId);
    });
  }, [isOpen]);

  const handleSaveWeChat = async () => {
    setIsSavingWeChat(true);
    try {
      const res = await saveWeChatConfig(weChatAppId, weChatAppSecret);
      setWeChatSaveTip(res.message);
      const updated = await fetchWeChatConfig();
      setWeChatConfigStatus(updated);
    } catch (err: any) {
      setWeChatSaveTip(`保存失败: ${err.message}`);
    } finally {
      setIsSavingWeChat(false);
      setTimeout(() => setWeChatSaveTip(null), 4000);
    }
  };

  // 左右滚动标签导航栏
  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({ left: direction === 'left' ? -220 : 220, behavior: 'smooth' });
    }
  };

  // 鼠标滚轮滑动自动横向滑动标签导航栏
  const handleTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && tabsRef.current) {
      tabsRef.current.scrollLeft += e.deltaY * 0.8;
    }
  };

  // 当打开后台或切换到 Notion 选项卡时，自动读取已存凭据与状态
  useEffect(() => {
    if (isOpen) {
      loadNotionStatus();
      loadCredentials();
    }
  }, [isOpen, activeTab]);

  const loadCredentials = async () => {
    try {
      const creds = await fetchNotionCredentials();
      setCredsForm(creds);
    } catch {
      // ignore
    }
  };

  const loadNotionStatus = async () => {
    try {
      const status = await getNotionStatus();
      setNotionStatus(status);
    } catch {
      // ignore
    }
  };

  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverTip, setDiscoverTip] = useState<string | null>(null);

  const handleAutoDiscover = async () => {
    setIsDiscovering(true);
    setDiscoverTip(null);
    try {
      const res = await autoDiscoverNotion(credsForm.apiKey);
      if (res.success && res.suggested) {
        const newCreds: NotionCredentials = {
          apiKey: credsForm.apiKey,
          rsvpDbId: res.suggested.rsvpDbId || credsForm.rsvpDbId,
          blessingsDbId: res.suggested.blessingsDbId || credsForm.blessingsDbId,
          configPageId: res.suggested.configPageId || credsForm.configPageId,
        };
        setCredsForm(newCreds);
        setDiscoverTip(
          `自动匹配成功！RSVP库: 「${res.suggested.rsvpDbTitle || '已匹配'}」, 祝福库: 「${res.suggested.blessingsDbTitle || '已匹配'}」, 页面: 「${res.suggested.configPageTitle || '已匹配'}」`
        );
        const saveRes = await saveNotionCredentials(newCreds);
        setCredsSaveResult(saveRes);
        await loadNotionStatus();
      } else {
        setDiscoverTip(`未发现数据库: ${res.message || '请确保在 Notion 页面中添加了机器人'}`);
      }
    } catch (err: any) {
      setDiscoverTip(`识别失败: ${err.message}`);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSaveCredentials = async () => {
    setIsSavingCreds(true);
    setCredsSaveResult(null);
    try {
      const res = await saveNotionCredentials(credsForm);
      setCredsSaveResult(res);
      if (res.credentials) {
        setCredsForm(res.credentials);
      }
      await loadNotionStatus();
    } catch (err: any) {
      setCredsSaveResult({ success: false, message: `保存失败: ${err.message}` });
    } finally {
      setIsSavingCreds(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingNotion(true);
    setTestResult(null);
    try {
      const res = await testNotionConnection({
        apiKey: credsForm.apiKey,
        rsvpDbId: credsForm.rsvpDbId,
        blessingsDbId: credsForm.blessingsDbId,
        configPageId: credsForm.configPageId,
      });
      setTestResult(res);
      await loadNotionStatus();
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || '测试失败' });
    } finally {
      setIsTestingNotion(false);
    }
  };

  const handlePushCurrentToNotion = async () => {
    setIsPushingNotion(true);
    setSyncTip(null);
    try {
      const res = await saveNotionConfig(config);
      setSyncTip(res.message || '当前配置已推送到 Notion');
    } catch (err: any) {
      setSyncTip(`推送失败: ${err.message}`);
    } finally {
      setIsPushingNotion(false);
      setTimeout(() => setSyncTip(null), 4000);
    }
  };

  const handlePullFromNotion = async () => {
    setIsPullingNotion(true);
    setSyncTip(null);
    try {
      if (onRefreshData) {
        await onRefreshData();
        setSyncTip('已从 Notion / 服务端成功拉取最新数据！');
      } else {
        const remoteConf = await fetchNotionConfig();
        if (remoteConf.config) {
          onUpdateConfig(remoteConf.config);
          setSyncTip('婚礼配置已从 Notion 同步覆盖');
        } else {
          setSyncTip('未在 Notion 页面中找到配置数据');
        }
      }
    } catch (err: any) {
      setSyncTip(`拉取失败: ${err.message}`);
    } finally {
      setIsPullingNotion(false);
      setTimeout(() => setSyncTip(null), 4000);
    }
  };

  const [isInitializingSchema, setIsInitializingSchema] = useState<string | null>(null);
  const [schemaInitResult, setSchemaInitResult] = useState<{
    success: boolean;
    message?: string;
    results?: any;
  } | null>(null);

  const handleInitDatabaseSchema = async (type: 'rsvp' | 'blessings' | 'all') => {
    setIsInitializingSchema(type);
    setSchemaInitResult(null);
    try {
      const res = await initNotionDatabaseSchema(type);
      setSchemaInitResult(res);
      await loadNotionStatus();
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err: any) {
      setSchemaInitResult({ success: false, message: `初始化失败: ${err.message}` });
    } finally {
      setIsInitializingSchema(null);
    }
  };

  const showSavedTip = () => {
    setSavedTip(true);
    setTimeout(() => setSavedTip(false), 2000);
  };

  const updateField = <K extends keyof WeddingConfig>(field: K, value: WeddingConfig[K]) => {
    onUpdateConfig({ ...config, [field]: value });
    showSavedTip();
  };

  // 导出 RSVP 回执为 CSV
  const handleExportCSV = () => {
    const headers = ['宾客姓名', '联系电话', '微信OpenID', '是否出席', '出席人数', '用餐偏好', '大巴接送', '祝福寄语', '提交时间'];
    const rows = rsvpList.map((r) => [
      `"${r.name}"`,
      `"${r.phone}"`,
      `"${r.openid || ''}"`,
      r.attending === 'yes' ? '出席' : '遗憾无法到场',
      r.guestCount,
      r.dietary,
      r.needsShuttle ? '需要' : '无需',
      `"${r.blessing.replace(/"/g, '""')}"`,
      r.submittedAt,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `婚礼宾客回执统计_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 本地照片上传转 Base64
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, photoIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        const newPhotos = [...config.photos];
        newPhotos[photoIndex] = {
          ...newPhotos[photoIndex],
          url: result,
        };
        updateField('photos', newPhotos);
      }
    };
    reader.readAsDataURL(file);
  };

  // 新增照片
  const handleAddPhoto = () => {
    const newPhoto: PhotoItem = {
      id: `photo-${Date.now()}`,
      url: config.photos[0]?.url || '',
      title: '甜蜜浪漫时光',
      aspect: 'portrait',
    };
    updateField('photos', [...config.photos, newPhoto]);
  };

  if (!isOpen) return null;

  // 统计数据
  const totalAttending = rsvpList.filter((r) => r.attending === 'yes').reduce((acc, cur) => acc + cur.guestCount, 0);
  const totalSubmissions = rsvpList.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-stone-200">
        {/* 顶部标题与保存提示 */}
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3.5 bg-stone-50">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-serif font-bold text-stone-900">请柬管理控制台 · 可视化配置</h2>
            {savedTip && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Check className="h-3 w-3" /> 已自动同步至前端
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 hover:bg-stone-200 hover:text-stone-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 标签导航栏容器：集成左右滚动箭头与滚轮事件，确保在任何屏幕或鼠标下均可顺畅滑动切换 */}
        <div className="relative flex items-center border-b border-stone-200 bg-stone-50/70 px-2 py-1.5">
          {/* 左侧平滑滚动按钮 */}
          <button
            type="button"
            onClick={() => scrollTabs('left')}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-200 hover:text-stone-900 transition-colors mr-1 cursor-pointer"
            title="向左滚动标签"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div
            ref={tabsRef}
            onWheel={handleTabsWheel}
            className="flex flex-1 overflow-x-auto py-1 gap-1.5 text-xs scroll-smooth custom-scrollbar"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {[
              { id: 'theme', label: '主题风格', icon: Palette },
              { id: 'basic', label: '新人信息', icon: Users },
              { id: 'venue', label: '宴席地点', icon: MapPin },
              { id: 'photos', label: '婚纱相册', icon: Image },
              { id: 'music', label: '背景音乐', icon: Music },
              { id: 'schedule', label: '婚礼日程', icon: Calendar },
              { id: 'rsvp', label: `宾客回执 (${totalAttending}人)`, icon: Download },
              { id: 'blessings', label: `祝福管理 (${blessings.length})`, icon: Sparkles },
              { id: 'notion', label: 'Notion 数据库', icon: Database },
              { id: 'miniprogram', label: '微信原生小程序', icon: Smartphone },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={(e) => {
                    setActiveTab(tab.id as typeof activeTab);
                    e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                  }}
                  className={`flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-xl font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-stone-900 text-white shadow-sm ring-1 ring-stone-900'
                      : 'text-stone-600 hover:bg-white hover:text-stone-900 border border-transparent hover:border-stone-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 右侧平滑滚动按钮 */}
          <button
            type="button"
            onClick={() => scrollTabs('right')}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-200 hover:text-stone-900 transition-colors ml-1 cursor-pointer"
            title="向右滚动标签"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* 标签主体内容 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-xs text-stone-700 custom-scrollbar overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* 1. 主题风格与信封视觉配置 */}
          {activeTab === 'theme' && (
            <div className="space-y-6">
              {/* 迎宾信封封套与手工火漆印配置 (由后台统一设定，不在前端宾客页冗余展示) */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4.5 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-amber-700" />
                      <span>迎宾信封封面与手工火漆印配置</span>
                    </h3>
                    <span className="text-[10px] text-amber-800 font-medium bg-amber-100/90 border border-amber-300/60 px-2 py-0.5 rounded-full">
                      后台统一配置 · 宾客开封直达
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    宾客首次访问请柬时，将直接呈现您在此设定的信封材质与手工火漆印章质感，前台不再显示多余切换按钮：
                  </p>
                </div>

                {/* 1. 信封封面材质与风格 */}
                <div>
                  <label className="block font-medium text-stone-800 mb-2">1. 信封封套材质与色调：</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => updateField('envelopeStyle', 'champagne-rose')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        (config.envelopeStyle || 'champagne-rose') === 'champagne-rose'
                          ? 'border-stone-900 bg-white shadow-sm ring-1 ring-stone-900/10'
                          : 'border-stone-200 bg-white/60 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-serif font-bold text-stone-900 flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-stone-300 inline-block shadow-inner"
                            style={{ background: 'linear-gradient(135deg, #F8EBE6 0%, #ECD8CE 100%)' }}
                          />
                          香槟烟粉（经典参考图版）
                        </span>
                        {(config.envelopeStyle || 'champagne-rose') === 'champagne-rose' && (
                          <span className="rounded-full bg-stone-900 text-white text-[10px] px-2 py-0.5 font-medium">
                            已启用
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 leading-relaxed">
                        温润法式微绒烟粉、珠光香槟细金边、V型三角翻折封套，唯美浪漫
                      </p>
                    </div>

                    <div
                      onClick={() => updateField('envelopeStyle', 'burgundy')}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        config.envelopeStyle === 'burgundy'
                          ? 'border-stone-900 bg-white shadow-sm ring-1 ring-stone-900/10'
                          : 'border-stone-200 bg-white/60 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-serif font-bold text-stone-900 flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-stone-300 inline-block shadow-inner"
                            style={{ background: 'linear-gradient(135deg, #7A0C16 0%, #4D050B 100%)' }}
                          />
                          典雅酒红（传统盛典版）
                        </span>
                        {config.envelopeStyle === 'burgundy' && (
                          <span className="rounded-full bg-stone-900 text-white text-[10px] px-2 py-0.5 font-medium">
                            已启用
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 leading-relaxed">
                        传统丝绒暗绯红底、高雅暗纹光泽、烫金双喜边框，喜庆庄重
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. 手工火漆印泥质感 */}
                <div>
                  <label className="block font-medium text-stone-800 mb-2">2. 手盖立体火漆印泥质感：</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div
                      onClick={() => updateField('sealVariant', 'cinnabar-gold')}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        (config.sealVariant || 'cinnabar-gold') === 'cinnabar-gold'
                          ? 'border-stone-900 bg-white shadow-sm ring-1 ring-stone-900/10'
                          : 'border-stone-200 bg-white/60 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-[#991518] border border-amber-300 shadow-inner shrink-0" />
                          朱砂赤金
                        </span>
                        {(config.sealVariant || 'cinnabar-gold') === 'cinnabar-gold' && (
                          <span className="rounded-full bg-stone-900 text-white text-[9px] px-1.5 py-0.2 font-medium">
                            当前
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-stone-500 leading-snug">
                        天然融蜡溢边、手工扫金立体双喜、连珠金石印纹
                      </p>
                    </div>

                    <div
                      onClick={() => updateField('sealVariant', 'vintage-bronze')}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        config.sealVariant === 'vintage-bronze'
                          ? 'border-stone-900 bg-white shadow-sm ring-1 ring-stone-900/10'
                          : 'border-stone-200 bg-white/60 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-[#6E4226] border border-amber-400 shadow-inner shrink-0" />
                          古铜暮金
                        </span>
                        {config.sealVariant === 'vintage-bronze' && (
                          <span className="rounded-full bg-stone-900 text-white text-[9px] px-1.5 py-0.2 font-medium">
                            当前
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-stone-500 leading-snug">
                        复古金属暮铜微光、沉稳雅致、欧式金箔浮雕
                      </p>
                    </div>

                    <div
                      onClick={() => updateField('sealVariant', 'ruby-rose')}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        config.sealVariant === 'ruby-rose'
                          ? 'border-stone-900 bg-white shadow-sm ring-1 ring-stone-900/10'
                          : 'border-stone-200 bg-white/60 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-serif font-bold text-stone-900 flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-[#831843] border border-rose-300 shadow-inner shrink-0" />
                          经典红玫
                        </span>
                        {config.sealVariant === 'ruby-rose' && (
                          <span className="rounded-full bg-stone-900 text-white text-[9px] px-1.5 py-0.2 font-medium">
                            当前
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-stone-500 leading-snug">
                        红宝石玫瑰绯红、温润剔透、浪漫优雅
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-stone-900 mb-1">精选中式与现代视觉主题</h3>
                <p className="text-stone-500 mb-4">一键切换请柬全局配色、传统印章纹样、艺术卡片与氛围色温：</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(Object.keys(THEME_PRESETS) as WeddingTheme[]).map((themeKey) => {
                    const preset = THEME_PRESETS[themeKey];
                    const isSelected = config.theme === themeKey;
                    return (
                      <div
                        key={themeKey}
                        onClick={() => updateField('theme', themeKey)}
                        className={`relative rounded-2xl p-4 border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-stone-900 bg-stone-50 shadow-md ring-2 ring-stone-900/10'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-base font-serif font-bold text-stone-900 flex items-center gap-1.5">
                            <span className="text-lg" style={{ color: preset.primary }}>{preset.symbol}</span>
                            {preset.name}
                          </span>
                          {isSelected && (
                            <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-medium text-white">
                              当前使用中
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-stone-500 mb-3">{preset.tagline}</p>

                        {/* 色彩预览小圆点 */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-stone-400">主色调:</span>
                          <div className="h-5 w-5 rounded-full shadow-inner border border-white" style={{ backgroundColor: preset.primary }} />
                          <div className="h-5 w-5 rounded-full shadow-inner border border-white" style={{ backgroundColor: preset.accent }} />
                          <div className="h-5 w-5 rounded-full shadow-inner border border-stone-200" style={{ backgroundColor: preset.bgLight }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 动效开关 */}
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
                <div className="font-semibold text-stone-800">动效与交互微调：</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-stone-700">飘落粒子特效（花瓣/金箔/晨曦绿叶）</div>
                    <div className="text-[11px] text-stone-400">开启后屏幕将随主题飘落浪漫粒子</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.particlesEnabled}
                    onChange={(e) => updateField('particlesEnabled', e.target.checked)}
                    className="h-4 w-4 rounded text-stone-900"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-stone-700">实时祝福弹幕飘屏</div>
                    <div className="text-[11px] text-stone-400">开启后亲友的温暖祝福将化作弹幕缓缓掠过屏幕</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.danmakuEnabled}
                    onChange={(e) => updateField('danmakuEnabled', e.target.checked)}
                    className="h-4 w-4 rounded text-stone-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. 基本信息设置 */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 新郎 */}
                <div className="rounded-xl border border-stone-200 p-4 space-y-3 bg-stone-50/50">
                  <div className="font-serif font-bold text-stone-900">新郎资料</div>
                  <div>
                    <label className="block text-stone-600 mb-1">新郎姓名</label>
                    <input
                      type="text"
                      value={config.groom.name}
                      onChange={(e) => updateField('groom', { ...config.groom, name: e.target.value })}
                      className="w-full rounded-lg border border-stone-200 bg-white p-2 text-stone-800"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-600 mb-1">拼音 / 英文名</label>
                    <input
                      type="text"
                      value={config.groom.pinyin}
                      onChange={(e) => updateField('groom', { ...config.groom, pinyin: e.target.value })}
                      className="w-full rounded-lg border border-stone-200 bg-white p-2 text-stone-800"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-600 mb-1">联系电话</label>
                    <input
                      type="text"
                      value={config.groom.phone}
                      onChange={(e) => updateField('groom', { ...config.groom, phone: e.target.value })}
                      className="w-full rounded-lg border border-stone-200 bg-white p-2 text-stone-800"
                    />
                  </div>
                </div>

                {/* 新娘 */}
                <div className="rounded-xl border border-stone-200 p-4 space-y-3 bg-stone-50/50">
                  <div className="font-serif font-bold text-stone-900">新娘资料</div>
                  <div>
                    <label className="block text-stone-600 mb-1">新娘姓名</label>
                    <input
                      type="text"
                      value={config.bride.name}
                      onChange={(e) => updateField('bride', { ...config.bride, name: e.target.value })}
                      className="w-full rounded-lg border border-stone-200 bg-white p-2 text-stone-800"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-600 mb-1">拼音 / 英文名</label>
                    <input
                      type="text"
                      value={config.bride.pinyin}
                      onChange={(e) => updateField('bride', { ...config.bride, pinyin: e.target.value })}
                      className="w-full rounded-lg border border-stone-200 bg-white p-2 text-stone-800"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-600 mb-1">联系电话</label>
                    <input
                      type="text"
                      value={config.bride.phone}
                      onChange={(e) => updateField('bride', { ...config.bride, phone: e.target.value })}
                      className="w-full rounded-lg border border-stone-200 bg-white p-2 text-stone-800"
                    />
                  </div>
                </div>
              </div>

              {/* 日期与吉日 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-600 mb-1">婚礼公历日期时间 (YYYY-MM-DD HH:mm)</label>
                  <input
                    type="text"
                    value={config.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    className="w-full rounded-lg border border-stone-200 p-2 text-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">农历吉日描述</label>
                  <input
                    type="text"
                    value={config.lunarDate}
                    onChange={(e) => updateField('lunarDate', e.target.value)}
                    className="w-full rounded-lg border border-stone-200 p-2 text-stone-800"
                  />
                </div>
              </div>

              {/* 诚邀请柬辞 */}
              <div>
                <label className="block text-stone-600 mb-1">请柬诚邀辞</label>
                <textarea
                  rows={3}
                  value={config.invitationProse}
                  onChange={(e) => updateField('invitationProse', e.target.value)}
                  className="w-full rounded-lg border border-stone-200 p-2 text-stone-800 leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* 3. 宴席地点设置 */}
          {activeTab === 'venue' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-600 mb-1">宴会酒店 / 婚礼堂名称</label>
                  <input
                    type="text"
                    value={config.venue.name}
                    onChange={(e) => updateField('venue', { ...config.venue, name: e.target.value })}
                    className="w-full rounded-lg border border-stone-200 p-2 text-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">具体宴会厅 / 楼层</label>
                  <input
                    type="text"
                    value={config.venue.hall}
                    onChange={(e) => updateField('venue', { ...config.venue, hall: e.target.value })}
                    className="w-full rounded-lg border border-stone-200 p-2 text-stone-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-600 mb-1">详细地址 (用于地图导航与一键复制)</label>
                <input
                  type="text"
                  value={config.venue.address}
                  onChange={(e) => updateField('venue', { ...config.venue, address: e.target.value })}
                  className="w-full rounded-lg border border-stone-200 p-2 text-stone-800"
                />
              </div>

              <div>
                <label className="block text-stone-600 mb-1">交通与停车指引小贴士</label>
                <textarea
                  rows={2}
                  value={config.venue.transportTips}
                  onChange={(e) => updateField('venue', { ...config.venue, transportTips: e.target.value })}
                  className="w-full rounded-lg border border-stone-200 p-2 text-stone-800"
                />
              </div>
            </div>
          )}

          {/* 4. 婚纱相册管理 */}
          {activeTab === 'photos' && (
            <div className="space-y-4">
              {/* 直传图片至 Notion 资源库 */}
              <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-amber-700 shrink-0" />
                    <div>
                      <h4 className="font-bold text-xs text-amber-950">直传相片到 Notion 页面图片 Blocks (资源库)</h4>
                      <p className="text-[11px] text-amber-800/80">
                        在此处上传婚纱照，将自动同步推送到 Notion 页面图片 Block。小程序与请柬前台将直接以 Notion 资源展示！
                      </p>
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-all shrink-0">
                    <CloudUpload className="h-3.5 w-3.5" />
                    <span>{isUploadingToNotion ? '正在上传至Notion...' : '上传照片到 Notion 资源'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadDirectToNotion}
                      disabled={isUploadingToNotion}
                    />
                  </label>
                </div>
                {notionPhotoUploadStatus && (
                  <div className="text-[11px] font-medium p-2 rounded-lg bg-white border border-amber-200 text-amber-900 animate-fade-in">
                    {notionPhotoUploadStatus}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-stone-900">婚纱大片与相册维护</h3>
                  <p className="text-[11px] text-stone-500">支持直接点击【本地上传】替换为你自己的甜蜜婚纱照，亦可修改照片标题：</p>
                </div>
                <button
                  onClick={handleAddPhoto}
                  className="flex items-center gap-1 bg-stone-900 text-white px-3 py-1.5 rounded-xl hover:bg-stone-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>添加一张照片</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {config.photos.map((photo, idx) => (
                  <div key={photo.id} className="rounded-xl border border-stone-200 p-3 bg-stone-50/50 flex gap-3">
                    {/* 缩略图预览 */}
                    <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-stone-200 border border-stone-200">
                      <img
                        src={photo.url}
                        alt={photo.title}
                        className="h-full w-full object-cover"
                      />
                      <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 hover:opacity-100 cursor-pointer transition-opacity text-[10px]">
                        <Upload className="h-3 w-3 mr-1" /> 更换
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e, idx)}
                        />
                      </label>
                    </div>

                    {/* 配置字段 */}
                    <div className="flex-1 space-y-2 min-w-0">
                      <div>
                        <label className="block text-[11px] text-stone-500 mb-0.5">照片标题</label>
                        <input
                          type="text"
                          value={photo.title}
                          onChange={(e) => {
                            const newPhotos = [...config.photos];
                            newPhotos[idx] = { ...photo, title: e.target.value };
                            updateField('photos', newPhotos);
                          }}
                          className="w-full rounded border border-stone-200 bg-white p-1 text-xs"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <label className="cursor-pointer text-stone-700 bg-white border border-stone-200 px-2 py-1 rounded text-[11px] flex items-center gap-1 hover:bg-stone-50">
                          <Upload className="h-3 w-3 text-stone-500" />
                          <span>本地换图</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handlePhotoUpload(e, idx)}
                          />
                        </label>

                        {config.photos.length > 1 && (
                          <button
                            onClick={() => {
                              const newPhotos = config.photos.filter((_, i) => i !== idx);
                              updateField('photos', newPhotos);
                            }}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. 背景音乐管理 */}
          {activeTab === 'music' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-stone-900 mb-1">婚礼背景音乐配置</h3>
                <p className="text-stone-500 mb-3">支持从精选经典婚礼名曲中点选，或输入您自定义的 MP3 音乐外链：</p>
              </div>

              <div className="space-y-2">
                {DEFAULT_BGM_LIST.map((bgmItem, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      updateField('bgm', {
                        ...config.bgm,
                        title: bgmItem.title,
                        artist: bgmItem.artist,
                        url: bgmItem.url,
                      });
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      config.bgm.url === bgmItem.url
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-800'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-xs">{bgmItem.title}</div>
                      <div className={`text-[10px] ${config.bgm.url === bgmItem.url ? 'text-stone-300' : 'text-stone-400'}`}>
                        {bgmItem.artist}
                      </div>
                    </div>
                    {config.bgm.url === bgmItem.url && (
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">当前选中</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <label className="block text-stone-600 mb-1">自定义音乐音频 URL (支持 .mp3 / .ogg)</label>
                <input
                  type="text"
                  value={config.bgm.url}
                  onChange={(e) => updateField('bgm', { ...config.bgm, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-stone-200 p-2 text-stone-800 font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-stone-50 p-3 border border-stone-100">
                <div>
                  <div className="font-medium text-stone-700">开封请柬后自动播放</div>
                  <div className="text-[11px] text-stone-400">符合现代移动端手势合规播放策略</div>
                </div>
                <input
                  type="checkbox"
                  checked={config.bgm.autoPlay}
                  onChange={(e) => updateField('bgm', { ...config.bgm, autoPlay: e.target.checked })}
                  className="h-4 w-4 rounded text-stone-900"
                />
              </div>
            </div>
          )}

          {/* 6. 婚礼日程设置 */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-stone-900">婚礼当天日程时间表</h3>
                <button
                  onClick={() => {
                    updateField('schedule', [
                      ...config.schedule,
                      {
                        id: `sch-${Date.now()}`,
                        time: '15:00',
                        title: '新环节',
                        desc: '说明文字',
                        iconName: 'Clock',
                      },
                    ]);
                  }}
                  className="flex items-center gap-1 bg-stone-900 text-white px-3 py-1.5 rounded-xl hover:bg-stone-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>添加日程节点</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {config.schedule.map((sch, idx) => (
                  <div key={sch.id} className="flex items-center gap-2 rounded-xl border border-stone-200 p-2.5 bg-stone-50/50">
                    <input
                      type="text"
                      value={sch.time}
                      onChange={(e) => {
                        const newSch = [...config.schedule];
                        newSch[idx] = { ...sch, time: e.target.value };
                        updateField('schedule', newSch);
                      }}
                      className="w-20 rounded border border-stone-200 bg-white p-1 text-center font-mono font-bold"
                    />
                    <input
                      type="text"
                      value={sch.title}
                      onChange={(e) => {
                        const newSch = [...config.schedule];
                        newSch[idx] = { ...sch, title: e.target.value };
                        updateField('schedule', newSch);
                      }}
                      className="w-44 rounded border border-stone-200 bg-white p-1 font-semibold"
                    />
                    <input
                      type="text"
                      value={sch.desc}
                      onChange={(e) => {
                        const newSch = [...config.schedule];
                        newSch[idx] = { ...sch, desc: e.target.value };
                        updateField('schedule', newSch);
                      }}
                      className="flex-1 rounded border border-stone-200 bg-white p-1 text-stone-600"
                    />
                    <button
                      onClick={() => {
                        updateField(
                          'schedule',
                          config.schedule.filter((_, i) => i !== idx)
                        );
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. 宾客 RSVP 回执管理 */}
          {activeTab === 'rsvp' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-stone-500 text-xs">已收到回执: </span>
                    <span className="font-mono font-bold text-stone-900">{totalSubmissions} 份</span>
                  </div>
                  <div>
                    <span className="text-stone-500 text-xs">确定到场总人数: </span>
                    <span className="font-mono font-bold text-emerald-600 text-sm">{totalAttending} 人</span>
                  </div>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 font-medium text-white hover:bg-emerald-700 shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>导出为 Excel / CSV 格式</span>
                </button>
              </div>

              {rsvpList.length === 0 ? (
                <div className="py-12 text-center text-stone-400">暂无宾客提交回执</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-100 text-stone-600">
                      <tr>
                        <th className="p-2.5">宾客姓名</th>
                        <th className="p-2.5">电话</th>
                        <th className="p-2.5">微信 OpenID</th>
                        <th className="p-2.5">状态</th>
                        <th className="p-2.5">人数</th>
                        <th className="p-2.5">用餐偏好</th>
                        <th className="p-2.5">大巴需求</th>
                        <th className="p-2.5">寄语</th>
                        <th className="p-2.5 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {rsvpList.map((r) => (
                        <tr key={r.id} className="hover:bg-stone-50">
                          <td className="p-2.5 font-semibold text-stone-900">{r.name}</td>
                          <td className="p-2.5 font-mono text-stone-600">{r.phone}</td>
                          <td className="p-2.5">
                            {r.openid ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-mono border border-emerald-200" title={r.openid}>
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                {r.openid.length > 12 ? (r.openid.slice(0, 6) + '...' + r.openid.slice(-4)) : r.openid}
                              </span>
                            ) : (
                              <span className="text-[10px] text-stone-400">待微信登录</span>
                            )}
                          </td>
                          <td className="p-2.5">
                            {r.attending === 'yes' ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-medium">
                                准时出席
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] bg-stone-100 text-stone-600">
                                无法出席
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono font-bold">{r.guestCount}人</td>
                          <td className="p-2.5 text-stone-600">{r.dietary}</td>
                          <td className="p-2.5 text-stone-600">{r.needsShuttle ? '需要' : '无需'}</td>
                          <td className="p-2.5 text-stone-600 max-w-xs truncate">{r.blessing}</td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => onDeleteRsvp(r.id)}
                              className="text-stone-400 hover:text-red-600 p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 8. 祝福留言管理 */}
          {activeTab === 'blessings' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-stone-900">亲友留言与弹幕内容管理</h3>
                <span className="text-stone-400">共 {blessings.length} 条</span>
              </div>

              <div className="space-y-2">
                {blessings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-white">
                    <div className="flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900">{b.author}</span>
                        <span className="text-[10px] text-stone-400">{b.createdAt}</span>
                        <span className="text-[10px] text-rose-500 flex items-center gap-0.5">
                          <Heart className="h-2.5 w-2.5 fill-current" />
                          <span>{b.likes}</span>
                        </span>
                      </div>
                      <p className="text-stone-600 mt-1">{b.content}</p>
                    </div>
                    <button
                      onClick={() => onDeleteBlessing(b.id)}
                      className="text-stone-400 hover:text-red-600 p-1.5"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. Notion 数据库云存储集成 */}
          {activeTab === 'notion' && (
            <div className="space-y-6">
              {/* 核心配置表单：支持用户直接在 UI 中输入或修改 API Key、RSVP 数据库 ID、祝福弹幕数据库 ID */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-white shadow-xs">
                      <Key className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                        <span>Notion 账号与数据库绑定设置</span>
                        {notionStatus?.connectionValid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" /> 连通正常 · {notionStatus.botName}
                          </span>
                        ) : notionStatus?.configured ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                            <AlertCircle className="h-3 w-3" /> 待校验授权
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600 border border-stone-200">
                            <Server className="h-3 w-3" /> 本地安全存储中
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-stone-500">
                        在此配置您的 Notion 集成密钥与数据库，可直接粘贴数据库完整 URL，系统将自动提取 32 位 ID。
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={handleAutoDiscover}
                      disabled={isDiscovering}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                      title="自动扫描机器人所授权的全部 Database 并自动填入正确 ID"
                    >
                      <Sparkles className={`h-3.5 w-3.5 ${isDiscovering ? 'animate-spin' : ''}`} />
                      <span>{isDiscovering ? '智能扫描中...' : '一键智能识别匹配'}</span>
                    </button>
                    <a
                      href="https://www.notion.so/profile/integrations"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-stone-600 hover:text-stone-900 underline font-medium"
                    >
                      <span>Notion 开发者中心</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* 智能扫描反馈通知 */}
                {discoverTip && (
                  <div className="rounded-xl bg-purple-50/90 border border-purple-200 px-3.5 py-2 text-xs text-purple-900 animate-fade-in font-medium flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-purple-600" />
                    <span>{discoverTip}</span>
                  </div>
                )}

                {/* 数据库表头初始化/补齐操作反馈通知 */}
                {schemaInitResult && (
                  <div
                    className={`rounded-xl border p-3.5 text-xs animate-fade-in ${
                      schemaInitResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      {schemaInitResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      )}
                      <span>{schemaInitResult.message}</span>
                    </div>
                    {schemaInitResult.success && (
                      <p className="text-[11px] text-emerald-700 mt-1 pl-6 leading-relaxed">
                        所有标准列属性已直接在 Notion 数据表中创建完成，已有宾客（如伴郎小明）的出席状态、电话、人数与偏好也已同步回填。请直接回到您的 Notion 页面刷新查看！
                      </p>
                    )}
                  </div>
                )}

                {/* 表单输入项列表 */}
                <div className="space-y-4">
                  {/* 1. Notion API Token */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-semibold text-stone-800 text-xs flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5 text-amber-600" />
                        <span>1. Notion Integration Secret (API 密钥)</span>
                      </label>
                      <span className="text-[10px] text-stone-400 font-mono">NOTION_API_KEY</span>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={credsForm.apiKey}
                        onChange={(e) => setCredsForm({ ...credsForm, apiKey: e.target.value.trim() })}
                        placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2 pr-10 text-xs font-mono text-stone-800 placeholder-stone-400 focus:bg-white focus:border-stone-900 focus:outline-none transition-all shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2.5 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                        title={showApiKey ? '隐藏密钥' : '查看密钥'}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500">
                      <span>在 Notion Integrations 页面创建内部机器人后获得的 Internal Integration Secret</span>
                      {notionStatus?.connectionValid && (
                        <span className="text-emerald-700 font-medium">工作区: {notionStatus.botWorkspace || '默认工作区'}</span>
                      )}
                    </div>
                  </div>

                  {/* 2. RSVP 数据库 ID */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-semibold text-stone-800 text-xs flex items-center gap-1.5">
                        <Download className="h-3.5 w-3.5 text-blue-600" />
                        <span>2. 宾客出席回执表 (RSVP) 数据库 ID 或链接</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        {notionStatus?.databaseIds.rsvpDatabaseValid ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>已绑定: {notionStatus.databaseIds.rsvpDatabaseTitle || 'RSVP 库'}</span>
                          </span>
                        ) : credsForm.rsvpDbId ? (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            <span>ID已填，请确认已在 Notion 中共享该库</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                            本地回执存储保护中
                          </span>
                        )}
                        <span className="text-[10px] text-stone-400 font-mono">NOTION_RSVP_DATABASE_ID</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={credsForm.rsvpDbId}
                      onChange={(e) => setCredsForm({ ...credsForm, rsvpDbId: e.target.value.trim() })}
                      onBlur={() => {
                        if (credsForm.rsvpDbId) {
                          setCredsForm({ ...credsForm, rsvpDbId: cleanNotionId(credsForm.rsvpDbId) });
                        }
                      }}
                      placeholder="如 13936994a55d80d282f6c0128cf69032 或粘贴整个 Notion 数据库页面网址"
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs font-mono text-stone-800 placeholder-stone-400 focus:bg-white focus:border-stone-900 focus:outline-none transition-all shadow-2xs"
                    />

                    {/* 缺列警示横幅 */}
                    {notionStatus?.databaseIds.rsvpMissingColumns && notionStatus.databaseIds.rsvpMissingColumns.length > 0 && (
                      <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-amber-900">Notion 数据表缺少以下列字段（导致 Notion 里只有姓名无法显示详情）：</p>
                          <p className="text-[11px] text-amber-800 mt-0.5">
                            缺少：<span className="font-mono font-medium underline">{notionStatus.databaseIds.rsvpMissingColumns.join('、')}</span>。请点击下方一键补齐按钮，系统会自动在 Notion 表头创建这些列并回填已有数据！
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 一键补齐列属性工具条 */}
                    <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-blue-50/80 border border-blue-200">
                      <div>
                        <div className="text-xs font-semibold text-blue-950 flex items-center gap-1.5 mb-1">
                          <TableProperties className="h-3.5 w-3.5 text-blue-600" />
                          <span>一键智能在 Notion 表头创建全部 6 个标准列并回填数据</span>
                        </div>
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">姓名 (Title)</span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">手机号 (Phone)</span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">出席状态 (Select)</span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">同行人数 (Number)</span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">饮食偏好 (Select)</span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">需要接驳车 (Checkbox)</span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">祝福寄语 (Text)</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleInitDatabaseSchema('rsvp')}
                        disabled={!credsForm.rsvpDbId || isInitializingSchema === 'rsvp'}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer transition-all shrink-0"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isInitializingSchema === 'rsvp' ? 'animate-spin' : ''}`} />
                        <span>{isInitializingSchema === 'rsvp' ? '正在创建列并回填...' : '一键补齐列 & 回填已有数据'}</span>
                      </button>
                    </div>

                    <p className="mt-1 text-[11px] text-stone-500">
                      包含字段：宾客姓名、出席状态、同行人数、手机号、饮食偏好、接驳车与祝福（支持粘贴网页 URL 自动提取 ID）。
                    </p>
                  </div>

                  {/* 3. 祝福弹幕留言墙 数据库 ID */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-semibold text-stone-800 text-xs flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-pink-600" />
                        <span>3. 祝福弹幕留言墙 数据库 ID 或链接</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        {notionStatus?.databaseIds.blessingsDatabaseValid ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>已绑定: {notionStatus.databaseIds.blessingsDatabaseTitle || '祝福留言库'}</span>
                          </span>
                        ) : credsForm.blessingsDbId ? (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            <span>ID已填，请确认已在 Notion 中共享该库</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                            本地留言存储保护中
                          </span>
                        )}
                        <span className="text-[10px] text-stone-400 font-mono">NOTION_BLESSINGS_DATABASE_ID</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={credsForm.blessingsDbId}
                      onChange={(e) => setCredsForm({ ...credsForm, blessingsDbId: e.target.value.trim() })}
                      onBlur={() => {
                        if (credsForm.blessingsDbId) {
                          setCredsForm({ ...credsForm, blessingsDbId: cleanNotionId(credsForm.blessingsDbId) });
                        }
                      }}
                      placeholder="如 13936994a55d80d282f6c0128cf69032 或粘贴整个 Notion 祝福数据库页面网址"
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs font-mono text-stone-800 placeholder-stone-400 focus:bg-white focus:border-stone-900 focus:outline-none transition-all shadow-2xs"
                    />

                    {/* 弹幕缺列提示与一键补齐 */}
                    <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-pink-50/80 border border-pink-200">
                      <div>
                        <div className="text-xs font-semibold text-pink-950 flex items-center gap-1.5 mb-1">
                          <TableProperties className="h-3.5 w-3.5 text-pink-600" />
                          <span>一键智能在弹幕库表头创建标准列属性并同步</span>
                        </div>
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-pink-100 text-pink-800 font-medium">宾客称谓 (Title)</span>
                          <span className="px-1.5 py-0.5 rounded bg-pink-100 text-pink-800 font-medium">祝福内容 (Rich Text)</span>
                          <span className="px-1.5 py-0.5 rounded bg-pink-100 text-pink-800 font-medium">点赞数 (Number)</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleInitDatabaseSchema('blessings')}
                        disabled={!credsForm.blessingsDbId || isInitializingSchema === 'blessings'}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer transition-all shrink-0"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isInitializingSchema === 'blessings' ? 'animate-spin' : ''}`} />
                        <span>{isInitializingSchema === 'blessings' ? '正在补齐列...' : '一键补齐弹幕列 & 同步数据'}</span>
                      </button>
                    </div>

                    <p className="mt-1 text-[11px] text-stone-500">
                      包含字段：宾客称谓(Title)、祝福寄语内容(Rich Text)、点赞数(Number)（亲友发送弹幕将实时推送入库）。
                    </p>
                  </div>

                  {/* 4. 婚礼全站配置 页面 ID (可选) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-semibold text-stone-800 text-xs flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-stone-600" />
                        <span>4. 婚礼全站配置 页面 ID 或链接 (可选)</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        {notionStatus?.databaseIds.configPageValid ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>已绑定 Page</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                            本地持久化存储
                          </span>
                        )}
                        <span className="text-[10px] text-stone-400 font-mono">NOTION_CONFIG_PAGE_ID</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={credsForm.configPageId}
                      onChange={(e) => setCredsForm({ ...credsForm, configPageId: e.target.value.trim() })}
                      onBlur={() => {
                        if (credsForm.configPageId) {
                          setCredsForm({ ...credsForm, configPageId: cleanNotionId(credsForm.configPageId) });
                        }
                      }}
                      placeholder="32位 Notion 页面 ID 或页面完整 URL（可选，用于备份全站配置 JSON）"
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs font-mono text-stone-800 placeholder-stone-400 focus:bg-white focus:border-stone-900 focus:outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {/* 保存与测试按钮 */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100">
                  <div className="text-[11px] text-stone-500">
                    💡 提示：点击保存后，服务端将自动持久化保存并即时探测各个 Database 的连通性。
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveCredentials}
                    disabled={isSavingCreds}
                    className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-stone-800 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Save className={`h-3.5 w-3.5 ${isSavingCreds ? 'animate-spin' : ''}`} />
                    <span>{isSavingCreds ? '保存并校验中...' : '保存配置并验证连通性'}</span>
                  </button>
                </div>

                {/* 凭据保存与连通性自检结果提示 */}
                {credsSaveResult && (
                  <div
                    className={`rounded-xl border p-3.5 text-xs animate-fade-in ${
                      credsSaveResult.success
                        ? 'border-emerald-200 bg-emerald-50/80 text-emerald-950'
                        : 'border-red-200 bg-red-50/80 text-red-950'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold">
                      {credsSaveResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                      )}
                      <span>{credsSaveResult.message}</span>
                    </div>
                    {credsSaveResult.details && (
                      <div className="mt-2 space-y-1 pl-5 font-mono text-[11px] text-stone-700">
                        {Object.entries(credsSaveResult.details).map(([k, v]) => (
                          <div key={k}>
                            <span className="font-semibold">{k}: </span>
                            <span>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 快捷操作与同步栏 */}
              <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-50 via-white to-stone-50 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">数据同步操作与全量拉取</h3>
                    <p className="mt-1 text-xs text-stone-500">
                      可随时从 Notion 远程表格拉取最新数据，或把当前网页中的配置全量推送覆盖至远程数据库。
                    </p>
                  </div>

                  {/* 快捷操作按钮组 */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleTestConnection}
                      disabled={isTestingNotion}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-300 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isTestingNotion ? 'animate-spin' : ''}`} />
                      <span>{isTestingNotion ? '测试中...' : '测试连通性'}</span>
                    </button>
                    <button
                      onClick={handlePullFromNotion}
                      disabled={isPullingNotion}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 hover:border-stone-300 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                    >
                      <Download className={`h-3.5 w-3.5 ${isPullingNotion ? 'animate-pulse' : ''}`} />
                      <span>{isPullingNotion ? '拉取中...' : '从 Notion 拉取'}</span>
                    </button>
                    <button
                      onClick={handlePushCurrentToNotion}
                      disabled={isPushingNotion}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                    >
                      <CloudUpload className={`h-3.5 w-3.5 ${isPushingNotion ? 'animate-bounce' : ''}`} />
                      <span>{isPushingNotion ? '推送中...' : '推送到 Notion'}</span>
                    </button>
                  </div>
                </div>

                {/* 实时提示信息 */}
                {syncTip && (
                  <div className="mt-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200 px-3.5 py-2 text-xs text-emerald-800 animate-fade-in flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span>{syncTip}</span>
                  </div>
                )}

                {/* 连通测试诊断输出 */}
                {testResult && (
                  <div
                    className={`mt-3.5 rounded-xl border p-3.5 text-xs animate-fade-in ${
                      testResult.success
                        ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                        : 'border-red-200 bg-red-50/70 text-red-900'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold">
                      {testResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                    {testResult.details && (
                      <div className="mt-2 space-y-1 pl-5 font-mono text-[11px] text-stone-600">
                        {Object.entries(testResult.details).map(([k, v]) => (
                          <div key={k}>
                            <span className="font-semibold text-stone-800">{k}: </span>
                            <span>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 三大数据集合挂载概览卡片 */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2.5">
                  已映射的数据存储目标
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* 1. 婚礼设置 */}
                  <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
                        <Users className="h-4 w-4" />
                      </div>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          notionStatus?.databaseIds.configPageValid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {notionStatus?.databaseIds.configPageValid ? '已绑定 Page' : '本地存储'}
                      </span>
                    </div>
                    <div className="font-semibold text-stone-900 text-xs">婚礼全站配置</div>
                    <p className="mt-1 text-[11px] text-stone-500 leading-relaxed">
                      新人姓名、宴席地址、仪式日程、信封封套与手工火漆印质感等全套配置。
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-stone-100 text-[10px] font-mono text-stone-400">
                      NOTION_CONFIG_PAGE_ID
                    </div>
                  </div>

                  {/* 2. RSVP 回执 */}
                  <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                        <ClipboardList className="h-4 w-4" />
                      </div>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          notionStatus?.databaseIds.rsvpDatabaseValid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : notionStatus?.databaseIds.hasRsvpDatabase
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {notionStatus?.databaseIds.rsvpDatabaseValid
                          ? '已绑定 Database'
                          : notionStatus?.databaseIds.hasRsvpDatabase
                          ? '未授权接入'
                          : '本地存储'}
                      </span>
                    </div>
                    <div className="font-semibold text-stone-900 text-xs">宾客出席回执表 (RSVP)</div>
                    <p className="mt-1 text-[11px] text-stone-500 leading-relaxed">
                      宾客姓名、出席状态、同行人数、手机号、饮食偏好、接驳车与祝福。
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-stone-100 text-[10px] font-mono text-stone-400">
                      NOTION_RSVP_DATABASE_ID
                    </div>
                  </div>

                  {/* 3. 祝福留言 */}
                  <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-50 text-pink-700">
                        <Mail className="h-4 w-4" />
                      </div>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          notionStatus?.databaseIds.blessingsDatabaseValid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : notionStatus?.databaseIds.hasBlessingsDatabase
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {notionStatus?.databaseIds.blessingsDatabaseValid
                          ? '已绑定 Database'
                          : notionStatus?.databaseIds.hasBlessingsDatabase
                          ? '未授权接入'
                          : '本地存储'}
                      </span>
                    </div>
                    <div className="font-semibold text-stone-900 text-xs">祝福弹幕留言墙</div>
                    <p className="mt-1 text-[11px] text-stone-500 leading-relaxed">
                      开帖心语与弹幕祝福记录，实时追加至 Notion 表格并累计亲友点赞数。
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-stone-100 text-[10px] font-mono text-stone-400">
                      NOTION_BLESSINGS_DATABASE_ID
                    </div>
                  </div>
                </div>
              </div>

              {/* 重点指引：解决 404 / 无法访问问题的说明卡片 */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4.5 space-y-2.5">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>核心说明：为什么填了 Database ID 却提示「无法访问 (404)」？</span>
                </h4>
                <div className="text-xs text-amber-950/90 leading-relaxed space-y-1.5">
                  <p>
                    Notion 的官方安全机制要求：<b>每一个新建的 Database 或 Page，都必须手动将 Integration (集成机器人) 添加进授权名单中</b>。否则即使 Token 和 ID 完全正确，Notion API 也会出于安全保护返回 404 (object_not_found)。
                  </p>
                  <div className="rounded-xl bg-white/90 p-3 border border-amber-200/80 font-medium text-stone-800 space-y-1">
                    <div className="font-bold text-amber-900">授权操作仅需 2 步：</div>
                    <div>1. 在电脑或手机端打开您的 Notion RSVP 或祝福 Database 页面。</div>
                    <div>2. 点击页面右上角的 <b>「···」设置图标 › 滚动到底部点击「Connect to (连接)」› 搜索并选中您创建的机器人名称</b> 即可！</div>
                  </div>
                </div>
              </div>

              {/* Notion 数据库字段对照表（Schema 模板） */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs">
                <h4 className="text-xs font-bold text-stone-900 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Notion 数据库建议表头规范（支持中文或英文列名全自动适配）</span>
                </h4>
                <p className="text-[11px] text-stone-500 mb-4">
                  系统采用弹性属性映射器，您在创建 Notion Database 时无论使用中文还是英文列名，系统均能精准匹配写入！
                </p>

                {/* RSVP 表结构 */}
                <div className="overflow-x-auto rounded-xl border border-stone-100 bg-stone-50/50 mb-4">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-stone-100/70 text-stone-600 font-semibold border-b border-stone-200/60">
                      <tr>
                        <th className="px-3.5 py-2">数据表</th>
                        <th className="px-3.5 py-2">字段名 (中文 / 英文)</th>
                        <th className="px-3.5 py-2">Notion 属性类型</th>
                        <th className="px-3.5 py-2">说明与取值示例</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-serif text-stone-700">
                      <tr>
                        <td rowSpan={7} className="px-3.5 py-2 font-sans font-bold bg-white text-stone-900 border-r border-stone-200/60">
                          RSVP 赴宴名单表
                        </td>
                        <td className="px-3.5 py-2 font-mono">姓名 / Name</td>
                        <td className="px-3.5 py-2"><span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px]">Title (标题)</span></td>
                        <td className="px-3.5 py-2">宾客姓名（如：李雷、王小明一家）</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2 font-mono">手机号 / Phone</td>
                        <td className="px-3.5 py-2"><span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px]">Phone / Text</span></td>
                        <td className="px-3.5 py-2">宾客联系方式</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2 font-mono">出席状态 / Attending</td>
                        <td className="px-3.5 py-2"><span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px]">Select (单选)</span></td>
                        <td className="px-3.5 py-2">出席盛典 / 遗憾缺席</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2 font-mono">人数 / GuestCount</td>
                        <td className="px-3.5 py-2"><span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px]">Number (数字)</span></td>
                        <td className="px-3.5 py-2">到场同行人数 (如 1, 2)</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2 font-mono">饮食偏好 / Dietary</td>
                        <td className="px-3.5 py-2"><span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px]">Select (单选)</span></td>
                        <td className="px-3.5 py-2">标准宴席 / 素食养生 / 清真风味 / 儿童餐配</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2 font-mono">接驳车 / NeedsShuttle</td>
                        <td className="px-3.5 py-2"><span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px]">Checkbox (勾选)</span></td>
                        <td className="px-3.5 py-2">是否需要大巴接送（已勾选/未勾选）</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2 font-mono">祝福寄语 / Blessing</td>
                        <td className="px-3.5 py-2"><span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px]">Rich Text (长文本)</span></td>
                        <td className="px-3.5 py-2">宾客提交的美好祝愿</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Blessings 表结构 */}
                <div className="overflow-x-auto rounded-xl border border-stone-100 bg-stone-50/50">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-stone-100/70 text-stone-600 font-semibold border-b border-stone-200/60">
                      <tr>
                        <th className="px-3.5 py-2">数据表</th>
                        <th className="px-3.5 py-2">字段名 (中文 / 英文)</th>
                        <th className="px-3.5 py-2">Notion 属性类型</th>
                        <th className="px-3.5 py-2">说明与取值示例</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-serif text-stone-700">
                      <tr>
                        <td rowSpan={3} className="px-3.5 py-2 font-sans font-bold bg-white text-stone-900 border-r border-stone-200/60">
                          祝福留言墙
                        </td>
                        <td className="px-3.5 py-2 font-mono">姓名 / Author</td>
                        <td className="px-3.5 py-2"><span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px]">Title (标题)</span></td>
                        <td className="px-3.5 py-2">宾客称谓或好友昵称</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2 font-mono">内容 / Content</td>
                        <td className="px-3.5 py-2"><span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px]">Rich Text (文本)</span></td>
                        <td className="px-3.5 py-2">弹幕留言与心语内容</td>
                      </tr>
                      <tr>
                        <td className="px-3.5 py-2 font-mono">点赞数 / Likes</td>
                        <td className="px-3.5 py-2"><span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px]">Number (数字)</span></td>
                        <td className="px-3.5 py-2">点赞计数值</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3步接入流程指南 */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4.5 space-y-3">
                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <span>💡 3 步快速接入您的 Notion 工作区</span>
                </h4>
                <div className="space-y-2 text-xs text-stone-600 leading-relaxed">
                  <div className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-200 text-stone-700 text-[11px] font-bold">1</span>
                    <div>
                      访问{' '}
                      <a
                        href="https://www.notion.so/profile/integrations"
                        target="_blank"
                        rel="noreferrer"
                        className="text-stone-900 underline font-medium hover:text-black"
                      >
                        Notion 开发者中心 (notion.so/profile/integrations)
                      </a>
                      ，点击 <b>+ New integration</b> 创建一个内部机器人，获取以 <code>secret_</code> 开头的 Token。
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-200 text-stone-700 text-[11px] font-bold">2</span>
                    <div>
                      在 Notion 中新建一个页面或两个 Database（可根据上方表头建立），点击页面右上角的 <b>··· (设置) ➜ Connect to</b>（或 Share），找到并添加刚才创建的机器人。
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-200 text-stone-700 text-[11px] font-bold">3</span>
                    <div>
                      复制数据库链接中 <code>notion.so/workspace/</code> 后面的 32 位 ID，将 <code>NOTION_API_KEY</code>、<code>NOTION_RSVP_DATABASE_ID</code> 等填入环境变量即可！
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 10. 微信原生小程序工程与配置 */}
          {activeTab === 'miniprogram' && (
            <div className="space-y-6">
              {/* 顶部醒目横幅 */}
              <div className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/50 p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#07C160] text-white shadow-md">
                      <Smartphone className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                        <span>微信原生小程序全栈工程已就绪</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          非 WebView 网页嵌套 · 100% 原生代码
                        </span>
                      </h3>
                      <p className="text-xs text-stone-600 mt-0.5">
                        基于微信官方 WXML / WXSS / JS 架构打造，支持微信官方头像昵称、一键手机号授权，Notion 数据库直连驱动！
                      </p>
                    </div>
                  </div>

                  <a
                    href="/api/miniprogram/download"
                    download="wedding-invitation-miniprogram.zip"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#07C160] hover:bg-[#06AD56] text-white text-xs font-bold shadow-md transition-all shrink-0 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>一键下载原生小程序工程 (ZIP)</span>
                  </a>
                </div>

                {/* 正式生产接口域名指示 */}
                <div className="mt-3 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="font-medium text-[11px]">正式生产 API 接口 (Shared URL):</span>
                    <code className="px-1.5 py-0.5 rounded bg-white border border-emerald-200 font-mono text-[11px] text-emerald-800 select-all">
                      https://ais-pre-tu3wda4ph65z74rogikrl2-267716153838.asia-northeast1.run.app
                    </code>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium shrink-0 self-start sm:self-auto">
                    ✓ ZIP 已自动预设正式生产地址
                  </span>
                </div>
              </div>

              {/* 核心架构特性对照 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2">
                  <div className="flex items-center gap-2 text-stone-900 font-bold text-xs">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>微信官方登录与手机号</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    在 <code>pages/rsvp</code> 中调用 <code>open-type="getPhoneNumber"</code> 与最新规范 <code>open-type="chooseAvatar"</code>，一键授权宾客真实手机号并入库。
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2">
                  <div className="flex items-center gap-2 text-stone-900 font-bold text-xs">
                    <Cloud className="h-4 w-4 text-blue-600" />
                    <span>Notion 作为唯一数据库</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    回执直接写入 Notion RSVP 表格，留言实时汇入 Notion 弹幕库，相片拍照直传至 Notion 页面图片 Block。
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2">
                  <div className="flex items-center gap-2 text-stone-900 font-bold text-xs">
                    <Sliders className="h-4 w-4 text-amber-600" />
                    <span>小程序既是前端也是后台</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    内置 <code>pages/admin</code> 主人控制台（口令 8888 保护），新郎新娘在手机端即可直接核查宾客、统计桌数与直传婚纱相片。
                  </p>
                </div>
              </div>

              {/* 微信开发者凭据配置卡片 */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Key className="h-4 w-4 text-[#07C160]" />
                      <span>微信小程序 AppID 与 AppSecret 配置 (可选)</span>
                    </h4>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      填入微信公众平台申请的小程序 AppID 与 AppSecret，即可换取真实线上 openid 与解密真实手机号；未填时自动启动开发沙盒模拟。
                    </p>
                  </div>
                  {weChatConfigStatus?.hasAppId && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      已配置 AppID: {weChatConfigStatus.appId}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      微信小程序 AppID (以 wx 开头)
                    </label>
                    <input
                      type="text"
                      value={weChatAppId}
                      onChange={(e) => setWeChatAppId(e.target.value.trim())}
                      placeholder="如: wx1234567890abcdef"
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-mono text-stone-800 focus:outline-none focus:border-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      微信小程序 AppSecret (32位秘钥)
                    </label>
                    <input
                      type="password"
                      value={weChatAppSecret}
                      onChange={(e) => setWeChatAppSecret(e.target.value.trim())}
                      placeholder="微信公众平台开发设置中的 AppSecret"
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-mono text-stone-800 focus:outline-none focus:border-stone-900"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-stone-500">
                    {weChatSaveTip && <span className="text-emerald-600 font-bold">{weChatSaveTip}</span>}
                  </div>
                  <button
                    onClick={handleSaveWeChat}
                    disabled={isSavingWeChat}
                    className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSavingWeChat ? '正在保存...' : '保存微信开发者配置'}
                  </button>
                </div>
              </div>

              {/* 微信开发者工具 3 步快速导入保姆级指南 */}
              <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3">
                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Code2 className="h-4 w-4 text-emerald-600" />
                  <span>微信开发者工具 1分钟快速导入体验</span>
                </h4>

                <div className="space-y-2 text-xs text-stone-600">
                  <div className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-800 font-bold text-[11px]">
                      1
                    </span>
                    <div>
                      点击本页上方的<b>「一键下载原生小程序工程 (ZIP)」</b>，将压缩包解压至您的电脑文件夹。
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-800 font-bold text-[11px]">
                      2
                    </span>
                    <div>
                      打开 <b>微信开发者工具</b>，在欢迎界面点击<b>「导入」</b>，选择刚刚解压的 <code>miniprogram</code> 目录。
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-800 font-bold text-[11px]">
                      3
                    </span>
                    <div>
                      AppID 可填您的真实小程序 ID 或选择<b>「测试号」</b>；导入后在右上角点击<b>「详情 › 本地设置」</b>，勾选<b>「不校验合法域名」</b>，即可立即在电脑与真机上流畅运行！
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
