import React, { useState } from 'react';
import { WeddingConfig } from '../types/wedding';
import { THEME_PRESETS } from '../data/defaultData';
import { weddingAudio } from '../utils/audioPlayer';
import { OrganicWaxSeal, WaxSealVariant } from './OrganicWaxSeal';
import {
  Heart,
  User,
  Phone,
  MessageCircleHeart,
  Check,
  AlertCircle,
  Calendar,
  MapPin,
  ChevronRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface EnvelopeCoverProps {
  config: WeddingConfig;
  initialGuestName?: string;
  initialGuestBlessing?: string;
  initialGuestPhone?: string;
  onConfirmGuest: (name: string, blessing: string, phone?: string) => void;
  onOpen: () => void;
  isOpen: boolean;
}

const QUICK_BLESSINGS = [
  '百年好合，永结同心！',
  '新婚大喜，岁岁年年！',
  '佳偶天成，白头偕老！',
  '花好月圆，幸福美满！',
  '执手共漫步，恩爱两白头！',
];

export const EnvelopeCover: React.FC<EnvelopeCoverProps> = ({
  config,
  initialGuestName = '',
  initialGuestBlessing = '',
  initialGuestPhone = '',
  onConfirmGuest,
  onOpen,
  isOpen,
}) => {
  const [stage, setStage] = useState<'sealed' | 'opening' | 'unfolded' | 'entering'>('sealed');
  const [guestName, setGuestName] = useState(initialGuestName);
  const [guestPhone, setGuestPhone] = useState(initialGuestPhone || '13888888888');
  const [guestBlessing, setGuestBlessing] = useState(initialGuestBlessing || '新婚快乐，百年好合！');
  const [errorMessage, setErrorMessage] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const coverStyle = config.envelopeStyle || 'champagne-rose';
  const sealVariant = config.sealVariant || 'cinnabar-gold';

  const theme = THEME_PRESETS[config.theme] || THEME_PRESETS.chinese;

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // 点击火漆印解封
  const handleUnsealEnvelope = () => {
    if (stage !== 'sealed') return;

    if (config.bgm.autoPlay) {
      weddingAudio.play(config.bgm.url);
    }

    setStage('opening');
    setTimeout(() => {
      setStage('unfolded');
    }, 700);
  };

  // 提交宾客称谓、手机与祝福，进入主页面
  const handleEnterApp = () => {
    if (stage === 'entering') return;

    if (!guestName.trim()) {
      triggerError('请留下您的姓名或怎么称呼您（如：张伟、表姐、大伯全家）');
      return;
    }

    if (!guestPhone.trim()) {
      triggerError('请填写您的联系手机号（便于席位与接驳大巴信息通知）');
      return;
    }

    if (!guestBlessing.trim()) {
      triggerError('请为新人写下一句新婚祝福吧~');
      return;
    }

    setErrorMessage('');
    onConfirmGuest(guestName.trim(), guestBlessing.trim(), guestPhone.trim());
    setStage('entering');
    setTimeout(() => {
      onOpen();
      setStage('sealed');
    }, 500);
  };

  // 重新封口信封
  const handleReseal = () => {
    setStage('sealed');
    setErrorMessage('');
  };

  // 直接跳过
  const handleSkip = () => {
    const finalName = guestName.trim() || '特邀宾客';
    const finalBlessing = guestBlessing.trim() || '新婚快乐，百年好合！';
    onConfirmGuest(finalName, finalBlessing);
    if (config.bgm.autoPlay) {
      weddingAudio.play(config.bgm.url);
    }
    onOpen();
  };

  if (isOpen) return null;

  // 根据当前选择的信封风格设置视觉色彩
  const isRoseStyle = coverStyle === 'champagne-rose';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto custom-scrollbar transition-opacity duration-500 ${
        stage === 'entering' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: isRoseStyle
          ? 'radial-gradient(ellipse at 50% 25%, #FDF7F2 0%, #F5E3D8 35%, #E9D0C5 70%, #D8B7AC 100%)'
          : 'radial-gradient(ellipse at 50% 25%, #2D050B 0%, #1A0307 55%, #0D0103 100%)',
      }}
    >
      {/* 柔光星芒与丝缎光韵 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
        {isRoseStyle ? (
          <>
            <div className="absolute -top-1/4 left-1/4 w-96 h-96 rounded-full bg-rose-200/40 blur-3xl" />
            <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 rounded-full bg-amber-100/50 blur-3xl" />
            <div className="absolute top-1/4 left-1/6 w-1.5 h-1.5 rounded-full bg-amber-400 blur-[0.5px] animate-pulse" />
            <div className="absolute top-1/3 right-1/4 w-2 h-2 rounded-full bg-rose-300 blur-[0.5px] animate-pulse delay-300" />
            <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 rounded-full bg-amber-300 blur-[0.5px] animate-pulse delay-700" />
          </>
        ) : (
          <>
            <div className="absolute top-1/4 left-1/5 w-1.5 h-1.5 rounded-full bg-amber-300 blur-[0.5px] animate-pulse" />
            <div className="absolute top-1/3 right-1/4 w-2 h-2 rounded-full bg-amber-200 blur-[0.5px] animate-pulse delay-300" />
            <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 rounded-full bg-amber-400 blur-[0.5px] animate-pulse delay-700" />
          </>
        )}
      </div>

      {/* 顶部右上角：快速跳过直接进入 */}
      <div className="absolute top-4 right-4 z-50 pointer-events-auto">
        <button
          onClick={handleSkip}
          className={`rounded-full px-3.5 py-1 text-xs font-serif backdrop-blur-md transition-colors cursor-pointer border ${
            isRoseStyle
              ? 'bg-white/60 hover:bg-white/80 text-[#5C3026] border-stone-300/60 shadow-xs'
              : 'bg-white/10 hover:bg-white/20 text-amber-100 border-amber-300/30'
          }`}
        >
          直接进入
        </button>
      </div>

      {/* 居中请柬封套与信笺主展区 */}
      <div className="relative w-full max-w-[390px] sm:max-w-[430px] my-auto flex flex-col items-center py-5 sm:py-6">
        {/* =========================================================================
            顶部新人与诚邀抬头（预留安全间距，典雅纯正，去除AI浮夸腔调）
            ========================================================================= */}
        <div className="text-center mb-5 select-none animate-fade-in shrink-0">
          <div
            className={`text-[11px] sm:text-xs font-serif tracking-[0.35em] uppercase mb-1.5 ${
              isRoseStyle ? 'text-[#8D5E53] font-medium' : 'text-amber-200/90'
            }`}
          >
            WEDDING INVITATION
          </div>
          <h1
            className={`text-2xl sm:text-3xl font-serif font-bold tracking-wider flex items-center justify-center gap-2 ${
              isRoseStyle ? 'text-[#3E221E]' : 'text-amber-50'
            }`}
          >
            <span>{config.groom.name}</span>
            <span
              className={`font-light text-xl sm:text-2xl ${
                isRoseStyle ? 'text-[#C58B79]' : 'text-amber-400/90'
              }`}
            >
              &amp;
            </span>
            <span>{config.bride.name}</span>
          </h1>
          <p
            className={`text-xs font-serif mt-1 tracking-widest ${
              isRoseStyle ? 'text-[#8D645B]' : 'text-amber-200/75'
            }`}
          >
            诚挚邀请您见证我们的婚礼
          </p>
        </div>

        {/* =========================================================================
            【先是上面的】：实体高定婚礼火漆信封 (Sealed & Opening 阶段)
            严格还原参考图：
            - 温润丝绒质感信封封套（香槟烟粉 / 暮色暖金）
            - 烫金双细边与精致回纹折角
            - 向上三角翻盖与中心立体火漆朱印
            - 送呈题签与底部“2026·10·18 · 挚爱”字样
            ========================================================================= */}
        {(stage === 'sealed' || stage === 'opening') && (
          <div className="w-full flex flex-col items-center animate-scale-up">
            {/* 信封本体卡片 */}
            <div
              className={`relative w-full h-[245px] sm:h-[265px] rounded-2xl transition-all duration-500 select-none cursor-pointer overflow-hidden ${
                stage === 'opening' ? 'scale-[1.02]' : 'hover:scale-[1.01]'
              }`}
              style={{
                perspective: '1000px',
                boxShadow: isRoseStyle
                  ? '0 25px 60px -15px rgba(130, 75, 68, 0.35), 0 10px 25px rgba(0, 0, 0, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.6)'
                  : '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 30px rgba(185, 28, 28, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
              }}
              onClick={handleUnsealEnvelope}
            >
              {/* 信封底板 (Envelope Body) */}
              <div
                className="absolute inset-0 rounded-2xl overflow-hidden"
                style={{
                  background: isRoseStyle
                    ? 'linear-gradient(145deg, #DEABA4 0%, #D49990 40%, #BF7E75 100%)'
                    : 'linear-gradient(145deg, #82101B 0%, #630B14 50%, #46060D 100%)',
                }}
              >
                {/* 烫金双细边框 */}
                <div
                  className={`absolute inset-2.5 rounded-xl border pointer-events-none ${
                    isRoseStyle ? 'border-[#F8D798]/70' : 'border-amber-300/40'
                  }`}
                />
                <div
                  className={`absolute inset-3.5 rounded-lg border pointer-events-none ${
                    isRoseStyle ? 'border-[#FFF0C8]/40' : 'border-amber-400/20'
                  }`}
                />

                {/* 四角优雅传统折角点缀 */}
                <div
                  className={`absolute top-4 left-4 w-3.5 h-3.5 border-t border-l pointer-events-none ${
                    isRoseStyle ? 'border-[#F8D798]' : 'border-amber-300/70'
                  }`}
                />
                <div
                  className={`absolute top-4 right-4 w-3.5 h-3.5 border-t border-r pointer-events-none ${
                    isRoseStyle ? 'border-[#F8D798]' : 'border-amber-300/70'
                  }`}
                />
                <div
                  className={`absolute bottom-4 left-4 w-3.5 h-3.5 border-b border-l pointer-events-none ${
                    isRoseStyle ? 'border-[#F8D798]' : 'border-amber-300/70'
                  }`}
                />
                <div
                  className={`absolute bottom-4 right-4 w-3.5 h-3.5 border-b border-r pointer-events-none ${
                    isRoseStyle ? 'border-[#F8D798]' : 'border-amber-300/70'
                  }`}
                />

                {/* 信封下半部口袋折痕暗纹 (Pocket Folds) */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none opacity-45"
                  viewBox="0 0 400 260"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 0,260 L 200,145 L 400,260 Z"
                    fill={isRoseStyle ? '#A86860' : '#36040A'}
                    stroke={isRoseStyle ? '#F5CCA0' : '#D97706'}
                    strokeWidth="0.8"
                    strokeOpacity="0.5"
                  />
                  <path
                    d="M 0,260 L 200,145"
                    stroke={isRoseStyle ? '#FFE6B8' : '#FBBF24'}
                    strokeWidth="0.8"
                    strokeOpacity="0.4"
                  />
                  <path
                    d="M 400,260 L 200,145"
                    stroke={isRoseStyle ? '#FFE6B8' : '#FBBF24'}
                    strokeWidth="0.8"
                    strokeOpacity="0.4"
                  />
                </svg>

                {/* 居中精美“送呈 亲启”题签卡片条 */}
                <div className="absolute bottom-9 inset-x-8 flex justify-center z-10 pointer-events-none">
                  <div
                    className={`px-4 py-1.5 rounded-full backdrop-blur-md text-xs font-serif tracking-widest flex items-center gap-2 shadow-xs border ${
                      isRoseStyle
                        ? 'bg-white/80 border-[#F5CCA0]/80 text-[#5C3026]'
                        : 'bg-black/25 border-amber-300/35 text-amber-100'
                    }`}
                  >
                    <span
                      className={`text-[10px] ${
                        isRoseStyle ? 'text-[#9E6558]' : 'text-amber-300/80'
                      }`}
                    >
                      送呈
                    </span>
                    <span
                      className={`font-bold ${
                        isRoseStyle ? 'text-[#3E221E]' : 'text-amber-50'
                      }`}
                    >
                      {guestName.trim() || '特邀贵宾'}
                    </span>
                    <span
                      className={`text-[10px] ${
                        isRoseStyle ? 'text-[#9E6558]' : 'text-amber-300/80'
                      }`}
                    >
                      台启
                    </span>
                  </div>
                </div>

                {/* 信封底部婚期与誓言（对应参考图中的 2026·10·18 · 挚爱） */}
                <div
                  className={`absolute bottom-2.5 inset-x-0 text-center text-[11px] font-serif tracking-widest z-10 ${
                    isRoseStyle ? 'text-[#FFEBD0] drop-shadow-xs font-medium' : 'text-amber-200/60'
                  }`}
                >
                  {config.date.split(' ')[0].replace(/-/g, '·')} · 挚爱良缘
                </div>
              </div>

              {/* 信封内衬金箔衬纸（翻开时显露） */}
              <div
                className={`absolute inset-x-4 top-3.5 h-[140px] rounded-lg transition-all duration-400 ${
                  stage === 'opening' ? 'opacity-100 translate-y-[-5px]' : 'opacity-0'
                }`}
                style={{
                  background: isRoseStyle
                    ? 'linear-gradient(180deg, #FFFBF5 0%, #F8EAD6 100%)'
                    : 'linear-gradient(180deg, #FFF9ED 0%, #F5E8D0 100%)',
                  border: isRoseStyle
                    ? '1px solid rgba(245, 204, 160, 0.8)'
                    : '1px solid rgba(245, 158, 11, 0.6)',
                  boxShadow: 'inset 0 2px 8px rgba(217, 119, 6, 0.2)',
                }}
              />

              {/* 上方三角翻盖 (Top Triangular Flap) - 支持 3D 向上翻折 */}
              <div
                className={`absolute top-0 inset-x-0 h-[135px] transition-transform duration-700 origin-top z-20 ${
                  stage === 'opening' ? '-rotate-x-180 opacity-30 pointer-events-none' : 'rotate-x-0'
                }`}
                style={{
                  transformStyle: 'preserve-3d',
                }}
              >
                <svg
                  className="w-full h-full drop-shadow-[0_8px_12px_rgba(0,0,0,0.35)]"
                  viewBox="0 0 400 135"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 0,0 L 400,0 L 200,132 Z"
                    fill={isRoseStyle ? '#C9857D' : '#750E18'}
                    stroke={isRoseStyle ? '#F5CCA0' : '#FBBF24'}
                    strokeWidth="1"
                    strokeOpacity="0.7"
                  />
                  {/* 内层烫金细线 */}
                  <path
                    d="M 16,0 L 384,0 L 200,122 Z"
                    fill="none"
                    stroke={isRoseStyle ? '#FFF2D4' : '#FDE68A'}
                    strokeWidth="0.6"
                    strokeOpacity="0.5"
                  />
                </svg>
              </div>

              {/* 中心高定手浇立体火漆印章 (Organic Hand-Poured Molten Wax Seal) */}
              <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-auto">
                <div
                  className={`relative flex items-center justify-center transition-all duration-500 ${
                    stage === 'opening'
                      ? 'scale-125 opacity-0 translate-y-[-20px]'
                      : 'animate-seal-pulse'
                  }`}
                >
                  <OrganicWaxSeal
                    size={94}
                    variant={sealVariant}
                    isOpening={stage === 'opening'}
                    interactive={true}
                    onClick={() => {
                      handleUnsealEnvelope();
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 信封下方温和启封提示 */}
            <div
              className={`mt-4 flex items-center gap-1.5 text-xs font-serif select-none animate-pulse ${
                isRoseStyle ? 'text-[#8D5E53]' : 'text-amber-200/75'
              }`}
            >
              <Sparkles
                className={`h-3.5 w-3.5 ${
                  isRoseStyle ? 'text-[#D48978]' : 'text-amber-400'
                }`}
              />
              <span>轻触火漆印 · 启封请柬</span>
            </div>
          </div>
        )}

        {/* =========================================================================
            【再有下面的】：启封之后向下展开的婚礼信笺纸 (Unfolded Stationery Letter)
            严格按照“先是上面的，再有下面的”：
            - 信纸上面：婚礼邀请函抬头、真诚正文、时间与地点
            - 信纸底部：宾客称谓姓名与祝福留言登记
            ========================================================================= */}
        {stage === 'unfolded' && (
          <div className="w-full flex flex-col items-center animate-scale-up">
            {/* 顶栏：已启封状态与合上信封重温按钮 */}
            <div
              className={`w-full flex items-center justify-between px-3.5 py-1.5 mb-2.5 rounded-xl backdrop-blur-md border text-xs font-serif ${
                isRoseStyle
                  ? 'bg-white/60 border-stone-200 text-[#5C3026]'
                  : 'bg-white/10 border-white/15 text-amber-100'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-medium">请柬已启封</span>
              </span>
              <button
                type="button"
                onClick={handleReseal}
                className={`flex items-center gap-1 text-[11px] transition-colors cursor-pointer ${
                  isRoseStyle
                    ? 'text-[#8D5E53] hover:text-[#5C3026]'
                    : 'text-amber-200/80 hover:text-amber-100'
                }`}
              >
                <RotateCcw className="h-3 w-3" />
                <span>合上信封</span>
              </button>
            </div>

            {/* 纸质信笺主体 (Stationery Paper) */}
            <div
              className={`relative w-full rounded-2xl p-5 sm:p-6 text-stone-800 shadow-2xl border overflow-hidden ${
                isRoseStyle ? 'border-[#F0D5C7]' : 'border-amber-200/90'
              } ${isShaking ? 'animate-shake' : ''}`}
              style={{
                background:
                  'linear-gradient(180deg, #FFFFFF 0%, #FCF9F5 50%, #F8F2E8 100%)',
                boxShadow: isRoseStyle
                  ? '0 25px 60px -15px rgba(120, 70, 65, 0.25), 0 0 20px rgba(245, 158, 11, 0.1)'
                  : '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 20px rgba(245, 158, 11, 0.15)',
              }}
            >
              {/* 信纸烫金细致双线边框 */}
              <div className="absolute inset-2.5 rounded-xl border border-amber-400/35 pointer-events-none" />
              <div className="absolute inset-3.5 rounded-lg border border-amber-300/20 pointer-events-none" />

              {/* 四角传统点缀 */}
              <div className="absolute top-4 left-4 w-2.5 h-2.5 border-t border-l border-amber-500/50 pointer-events-none" />
              <div className="absolute top-4 right-4 w-2.5 h-2.5 border-t border-r border-amber-500/50 pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-2.5 h-2.5 border-b border-l border-amber-500/50 pointer-events-none" />
              <div className="absolute bottom-4 right-4 w-2.5 h-2.5 border-b border-r border-amber-500/50 pointer-events-none" />

              {/* ===================================================================
                  【先是上面的】：信笺邀请函抬头、正文、时间与地点
                  =================================================================== */}
              <div className="text-center pt-1 pb-3 border-b border-amber-200/70 select-none">
                <div className="flex justify-center mb-1">
                  <OrganicWaxSeal
                    size={44}
                    variant={sealVariant}
                    showDroplets={false}
                    interactive={false}
                    altText="信笺火漆印"
                  />
                </div>
                <div className="text-base sm:text-lg font-serif font-bold text-stone-900 tracking-wider">
                  婚礼邀请函
                </div>
                <div className="text-[10px] text-stone-400 font-serif tracking-widest mt-0.5 uppercase">
                  Wedding Invitation
                </div>
              </div>

              {/* 诚挚温馨的邀请正文（真实自然，无AI矫饰） */}
              <div className="mt-3.5 space-y-2 text-stone-700 text-xs sm:text-sm font-serif leading-relaxed text-justify px-0.5">
                <p className="indent-6">
                  从相遇、相知到相守，漫漫岁月因为彼此而格外温暖。
                </p>
                <p className="indent-6">
                  谨定于{' '}
                  <span className="font-bold text-amber-900">{config.date.split(' ')[0]}</span>（{config.lunarDate.split(' ')[0]}）为{' '}
                  <span className="font-bold text-stone-900">{config.groom.name}</span> 与{' '}
                  <span className="font-bold text-stone-900">{config.bride.name}</span> 举行结婚典礼。
                </p>
                <p className="indent-6 text-stone-800 font-medium">
                  真诚期待您和家人的到来，与我们共同见证这份幸福！
                </p>
              </div>

              {/* 婚礼时间与宴席地点卡片 */}
              <div className="mt-3.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200/70 text-stone-700 text-xs font-serif space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-amber-800 shrink-0" />
                  <span>
                    <strong className="text-stone-900">婚礼时间：</strong>
                    {config.date}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-rose-700 shrink-0" />
                  <span className="line-clamp-1">
                    <strong className="text-stone-900">宴席地点：</strong>
                    {config.venue.name} · {config.venue.hall}
                  </span>
                </div>
              </div>

              {/* ===================================================================
                  【贵宾题名 · 谨订雅席】：金笺名帖登记
                  =================================================================== */}
              <div className="mt-4 pt-3.5 border-t border-amber-300/70 space-y-2.5">
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

                {/* 错误提示 */}
                {errorMessage && (
                  <div className="mb-2.5 flex items-center gap-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errorMessage}</span>
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
                    value={guestName}
                    onChange={(e) => {
                      setGuestName(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="例如：张伟 / 表姐 / 大伯全家"
                    maxLength={20}
                    className="min-w-0 flex-1 bg-transparent text-xs sm:text-sm text-stone-900 font-serif placeholder:text-stone-400 focus:outline-none"
                  />
                  {guestName.trim() && (
                    <span className="text-[10px] text-amber-700 font-serif shrink-0">已录入</span>
                  )}
                </div>

                {/* 栏位 2：联系电话 */}
                <div className="rounded-xl bg-white/95 border border-[#E2D5C7] focus-within:border-[#9C2424] focus-within:ring-1 focus-within:ring-[#9C2424]/20 transition-all px-2.5 sm:px-3 py-2 flex items-center gap-2 shadow-2xs overflow-hidden">
                  <span className="text-[11px] font-serif font-medium text-[#7D5A4F] shrink-0 tracking-wider">
                    联络电话
                  </span>
                  <span className="w-px h-3.5 bg-[#E2D5C7] shrink-0" />
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => {
                      setGuestPhone(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="便于席位通知与迎宾核对"
                    maxLength={11}
                    className="min-w-0 flex-1 bg-transparent text-xs font-mono text-stone-900 placeholder:text-stone-400 focus:outline-none"
                  />
                  {guestPhone.trim() && (
                    <span className="text-[10px] text-amber-700 font-serif shrink-0">已填写</span>
                  )}
                </div>

                {/* 栏位 3：贺词祈愿 */}
                <div className="rounded-xl bg-white/95 border border-[#E2D5C7] focus-within:border-[#9C2424] focus-within:ring-1 focus-within:ring-[#9C2424]/20 transition-all p-2.5 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-serif text-[#7D5A4F]">
                    <span className="font-medium tracking-wider">贺词祈愿</span>
                    <span className="text-[10px] text-stone-400">可点选古风贺词或亲笔赐言</span>
                  </div>
                  <textarea
                    value={guestBlessing}
                    onChange={(e) => {
                      setGuestBlessing(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    rows={2}
                    placeholder="写下一句对新人的美好祝愿..."
                    maxLength={100}
                    className="w-full p-1.5 rounded-lg text-xs font-serif text-stone-800 bg-stone-50/70 border border-stone-200/60 focus:bg-white focus:outline-none focus:border-amber-500/80 leading-relaxed resize-none"
                  />

                  {/* 典雅古韵经典贺词点选 */}
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    {QUICK_BLESSINGS.slice(0, 4).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setGuestBlessing(tag);
                          if (errorMessage) setErrorMessage('');
                        }}
                        className={`text-[10px] py-1 px-2 rounded-lg text-left font-serif transition-all border flex items-center gap-1 cursor-pointer truncate ${
                          guestBlessing === tag
                            ? 'bg-amber-100/80 border-amber-400/80 text-amber-950 font-medium'
                            : 'bg-stone-50/90 hover:bg-stone-100 text-stone-600 border-stone-200/70'
                        }`}
                      >
                        <span className="text-[9px] text-amber-700">✦</span>
                        <span className="truncate">{tag.split('，')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 落款印章 */}
              <div className="flex items-center justify-between pt-2 border-t border-amber-200/60 text-xs font-serif text-stone-600 mb-3 select-none">
                <div>
                  <div className="text-stone-800 font-semibold">
                    新郎：{config.groom.name} &nbsp;&nbsp; 新娘：{config.bride.name}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">敬呈 · 恭候光临</div>
                </div>
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-xs text-amber-100 text-[10px] font-serif font-bold shadow-inner select-none relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #A81B1F 0%, #750A0E 100%)',
                    border: '1px solid rgba(251, 191, 36, 0.55)',
                    boxShadow:
                      'inset 0 1px 2px rgba(255,255,255,0.35), inset 0 -1px 2px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.2)',
                  }}
                >
                  <div className="absolute inset-0.5 border border-amber-300/35 rounded-2xs pointer-events-none" />
                  <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.85)' }}>良缘</span>
                </div>
              </div>

              {/* 开启请柬大按钮 */}
              <div>
                <button
                  onClick={handleEnterApp}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 px-5 text-sm font-serif font-medium text-[#FFF4DE] shadow-md transition-all hover:shadow-lg active:scale-[0.98] cursor-pointer bg-gradient-to-r from-[#9C2424] via-[#851818] to-[#6E1111] border border-[#E2B771]/70"
                >
                  <span className="text-[10px] text-[#F3C785]">✦</span>
                  <span className="tracking-widest">恭启良辰喜帖 · 步入盛典</span>
                  <span className="text-[10px] text-[#F3C785]">✦</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
