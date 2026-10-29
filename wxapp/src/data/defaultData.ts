import { WeddingConfig, GuestRSVP, GuestBlessing, WeddingTheme } from '../types/wedding';

// 高品质内嵌矢量艺术画卷（确保护盾级零死链与离线加载）
export const ARTISTIC_COUPLE_COVER = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1060" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBF7F0"/>
      <stop offset="50%" stop-color="#F5EBE1"/>
      <stop offset="100%" stop-color="#EAD9C8"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F6D365"/>
      <stop offset="100%" stop-color="#FDA085"/>
    </linearGradient>
    <filter id="softGlow">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <rect width="800" height="1060" fill="url(#bgGrad)"/>
  <rect x="24" y="24" width="752" height="1012" rx="16" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-dasharray="8 6" opacity="0.6"/>
  <circle cx="400" cy="460" r="260" fill="#FFFFFF" opacity="0.75" filter="url(#softGlow)"/>
  
  <!-- 艺术新娘婚纱轮廓 -->
  <path d="M370 330 C370 290, 430 290, 430 330 C430 360, 415 390, 415 410 C460 470, 520 620, 550 780 C500 810, 300 810, 250 780 C280 620, 340 470, 385 410 Z" fill="#FFFFFF" opacity="0.95" stroke="#E5D3BF" stroke-width="2"/>
  <!-- 头纱轻盈流动 -->
  <path d="M400 300 C430 260, 490 320, 490 440 C490 560, 560 690, 580 790 C530 800, 470 780, 440 700 Z" fill="#FFFFFF" opacity="0.45"/>
  <!-- 新郎礼服剪影 -->
  <path d="M320 330 C320 280, 370 280, 370 330 C370 370, 340 410, 330 460 C320 540, 310 650, 310 780 L390 780 C390 650, 380 540, 370 460 Z" fill="#2C3437" opacity="0.9"/>
  <!-- 鲜花捧花点缀 -->
  <circle cx="395" cy="480" r="24" fill="#F87171" opacity="0.9"/>
  <circle cx="410" cy="470" r="20" fill="#FBCFE8" opacity="0.9"/>
  <circle cx="380" cy="475" r="18" fill="#FDE047" opacity="0.9"/>
  <circle cx="400" cy="495" r="16" fill="#F43F5E" opacity="0.9"/>
  <path d="M380 500 Q400 550 410 570" stroke="#16A34A" stroke-width="4" stroke-linecap="round"/>
  
  <!-- 双喜与祝福文字 -->
  <text x="400" y="170" font-family="'Noto Serif SC', serif" font-size="42" font-weight="600" fill="#991B1B" text-anchor="middle" letter-spacing="12">我们要结婚啦</text>
  <text x="400" y="215" font-family="'Cormorant Garamond', serif" font-size="20" font-style="italic" fill="#78716C" text-anchor="middle" letter-spacing="4">WE ARE GETTING MARRIED</text>
  <line x1="280" y1="240" x2="520" y2="240" stroke="#D4AF37" stroke-width="1.5"/>
  
  <text x="400" y="870" font-family="'Noto Serif SC', serif" font-size="34" font-weight="600" fill="#1C1917" text-anchor="middle">沈逸晨 <tspan fill="#D4AF37" font-size="28">&amp;</tspan> 温林夕</text>
  <text x="400" y="915" font-family="'Noto Serif SC', serif" font-size="18" fill="#57534E" text-anchor="middle" letter-spacing="2">2026年10月18日 · 诚邀见证</text>
  <text x="400" y="945" font-family="'Noto Serif SC', serif" font-size="15" fill="#78716C" text-anchor="middle">农历九月初八 · 宜嫁娶 · 谨定良辰</text>
</svg>
`)}`;

export const ARTISTIC_CHINESE_PHOTO = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="100%" height="100%">
  <rect width="600" height="800" fill="#7F1D1D"/>
  <rect x="20" y="20" width="560" height="760" fill="none" stroke="#FBBF24" stroke-width="2" stroke-opacity="0.8"/>
  <circle cx="300" cy="380" r="200" fill="#991B1B" stroke="#F59E0B" stroke-width="1.5"/>
  
  <!-- 中式双喜字印花 -->
  <text x="300" y="320" font-family="'Noto Serif SC', serif" font-size="110" font-weight="bold" fill="#FDE68A" text-anchor="middle" letter-spacing="4">囍</text>
  <text x="300" y="420" font-family="'Noto Serif SC', serif" font-size="30" font-weight="600" fill="#FEF3C7" text-anchor="middle" letter-spacing="6">百年好合 · 永结同心</text>
  <text x="300" y="470" font-family="'Noto Serif SC', serif" font-size="18" fill="#FCD34D" text-anchor="middle" letter-spacing="2">红丝系定良缘 · 锦瑟和鸣永谐</text>
  <path d="M220 540 Q300 580 380 540" fill="none" stroke="#FBBF24" stroke-width="3" stroke-linecap="round"/>
  
  <text x="300" y="650" font-family="'Noto Serif SC', serif" font-size="22" fill="#FEF08A" text-anchor="middle">良辰吉日 喜迎佳客</text>
  <text x="300" y="690" font-family="'Noto Serif SC', serif" font-size="16" fill="#FDE68A" text-anchor="middle" opacity="0.9">金玉满堂 · 鸾凤和鸣</text>
</svg>
`)}`;

export const ARTISTIC_OUTDOOR_PHOTO = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FEF3C7"/>
      <stop offset="60%" stop-color="#BAE6FD"/>
      <stop offset="100%" stop-color="#BBF7D0"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#sky)"/>
  <circle cx="680" cy="140" r="60" fill="#FDE047" opacity="0.8"/>
  <!-- 草坪山丘与繁花 -->
  <path d="M0 400 Q200 350 450 390 T800 380 L800 600 L0 600 Z" fill="#4ADE80" opacity="0.8"/>
  <path d="M0 450 Q300 410 550 460 T800 430 L800 600 L0 600 Z" fill="#22C55E" opacity="0.95"/>
  <!-- 鲜花簇拥 -->
  <circle cx="150" cy="480" r="16" fill="#FB7185"/>
  <circle cx="280" cy="495" r="14" fill="#F472B6"/>
  <circle cx="420" cy="475" r="18" fill="#FDE047"/>
  <circle cx="580" cy="510" r="15" fill="#FB923C"/>
  <circle cx="700" cy="485" r="16" fill="#F43F5E"/>
  
  <!-- 漫步夕阳下的新人情侣剪影 -->
  <path d="M370 330 C370 290 410 290 410 330 C410 360 400 390 395 440 L415 440 L420 530 L395 530 L390 470 L380 530 L355 530 Z" fill="#1E293B"/>
  <path d="M420 340 C420 300 450 300 450 340 C450 370 435 410 470 530 L400 530 C425 430 420 370 420 340 Z" fill="#FFFFFF" opacity="0.9" stroke="#E2E8F0" stroke-width="2"/>
  
  <text x="400" y="100" font-family="'Cormorant Garamond', serif" font-size="34" font-weight="600" fill="#0F172A" text-anchor="middle" letter-spacing="6">LOVE IN FULL BLOOM</text>
  <text x="400" y="140" font-family="'Noto Serif SC', serif" font-size="20" fill="#334155" text-anchor="middle" letter-spacing="4">春风十里，不及相遇有你</text>
</svg>
`)}`;

export const ARTISTIC_HALL_PHOTO = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <defs>
    <linearGradient id="hallBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#18181B"/>
      <stop offset="60%" stop-color="#27272A"/>
      <stop offset="100%" stop-color="#3F3F46"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#hallBg)"/>
  <!-- 水晶吊灯艺术光辉 -->
  <circle cx="400" cy="100" r="150" fill="#FEF08A" opacity="0.15"/>
  <path d="M360 30 L440 30 L420 90 L380 90 Z" fill="#FBBF24"/>
  <circle cx="400" cy="110" r="16" fill="#FDE047"/>
  <circle cx="370" cy="130" r="10" fill="#FDE68A"/>
  <circle cx="430" cy="130" r="10" fill="#FDE68A"/>
  
  <!-- 鲜花花拱仪式台 -->
  <path d="M260 480 Q400 160 540 480" fill="none" stroke="#F5F5F4" stroke-width="36" stroke-linecap="round"/>
  <path d="M260 480 Q400 160 540 480" fill="none" stroke="#FDE047" stroke-width="12" stroke-linecap="round" stroke-dasharray="20 25"/>
  
  <!-- 仪式地毯 -->
  <polygon points="360,480 440,480 420,340 380,340" fill="#E11D48" opacity="0.9"/>
  
  <text x="400" y="270" font-family="'Noto Serif SC', serif" font-size="28" font-weight="600" fill="#FFFFFF" text-anchor="middle" letter-spacing="4">格乐利雅婚礼艺术中心 · 凡尔赛水晶厅</text>
  <text x="400" y="310" font-family="'Cormorant Garamond', serif" font-size="18" fill="#FDE047" text-anchor="middle" letter-spacing="2">DREAM WEDDING CEREMONY</text>
</svg>
`)}`;

export const THEME_PRESETS: Record<WeddingTheme, {
  name: string;
  tagline: string;
  primary: string;
  primaryHover: string;
  accent: string;
  bgLight: string;
  bgGradient: string;
  cardBg: string;
  border: string;
  titleColor: string;
  textColor: string;
  mutedColor: string;
  ribbonBg: string;
  symbol: string;
}> = {
  chinese: {
    name: '新中式·国潮喜韵',
    tagline: '良辰吉日 鸾凤和鸣 喜结良缘',
    primary: '#991B1B', // 绛红
    primaryHover: '#7F1D1D',
    accent: '#D97706', // 烫金
    bgLight: '#FFFBEB',
    bgGradient: 'from-amber-50 via-rose-50 to-stone-100',
    cardBg: '#FFFFFF',
    border: '#FECDD3',
    titleColor: '#881337',
    textColor: '#374151',
    mutedColor: '#6B7280',
    ribbonBg: '#991B1B',
    symbol: '囍',
  },
  french: {
    name: '法式·浪漫香槟',
    tagline: '温润珠光 凡尔赛玫瑰 电影质感',
    primary: '#B45309', // 琥珀香槟
    primaryHover: '#92400E',
    accent: '#D97706',
    bgLight: '#FFFDF7',
    bgGradient: 'from-amber-50/60 via-stone-50 to-orange-50/40',
    cardBg: '#FFFFFF',
    border: '#FEF3C7',
    titleColor: '#78350F',
    textColor: '#374151',
    mutedColor: '#6B7280',
    ribbonBg: '#B45309',
    symbol: '❦',
  },
  forest: {
    name: '森系·草木晨曦',
    tagline: '青翠橄榄 清新治愈 户外草坪',
    primary: '#166534', // 鼠尾草常绿
    primaryHover: '#14532D',
    accent: '#65A30D',
    bgLight: '#F0FDF4',
    bgGradient: 'from-emerald-50/70 via-stone-50 to-lime-50/50',
    cardBg: '#FFFFFF',
    border: '#BBF7D0',
    titleColor: '#14532D',
    textColor: '#374151',
    mutedColor: '#4B5563',
    ribbonBg: '#166534',
    symbol: '🌿',
  },
  minimalist: {
    name: '现代·艺术轻奢',
    tagline: '纯粹黑白 当代留白 画廊杂志风',
    primary: '#18181B', // 雅致黑
    primaryHover: '#09090B',
    accent: '#52525B',
    bgLight: '#FAFAFA',
    bgGradient: 'from-zinc-100 via-stone-50 to-zinc-50',
    cardBg: '#FFFFFF',
    border: '#E4E4E7',
    titleColor: '#18181B',
    textColor: '#3F3F46',
    mutedColor: '#71717A',
    ribbonBg: '#18181B',
    symbol: '✦',
  },
};

export const DEFAULT_BGM_LIST = [
  {
    title: 'Canon in D (卡农·唯美钢琴版)',
    artist: 'Johann Pachelbel',
    url: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Canon_in_D_Major_%28Johann_Pachelbel%29.ogg',
  },
  {
    title: 'Wedding March (门德尔松婚礼进行曲)',
    artist: 'Felix Mendelssohn',
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Mendelssohn_Wedding_March.ogg',
  },
  {
    title: 'Clair de Lune (德彪西·月光)',
    artist: 'Claude Debussy',
    url: 'https://upload.wikimedia.org/wikipedia/commons/6/63/Clair_de_lune_%28Debussy%29.ogg',
  },
];

export const INITIAL_WEDDING_CONFIG: WeddingConfig = {
  theme: 'chinese',
  envelopeStyle: 'champagne-rose',
  sealVariant: 'cinnabar-gold',
  groom: {
    name: '沈逸晨',
    pinyin: 'Chen Shen',
    phone: '138 0018 2026',
    role: '新郎',
  },
  bride: {
    name: '温林夕',
    pinyin: 'Linxi Wen',
    phone: '139 0018 2026',
    role: '新娘',
  },
  date: '2026-10-18 11:58',
  lunarDate: '丙午年九月初八 宜嫁娶 · 良辰吉时',
  invitationTitle: '诚挚邀请 · 见证美好',
  invitationProse: '两颗心漫步于人海，从相知到相许，在漫长岁月里找到了彼此最温暖的归宿。\n我们诚挚邀请您莅临我们的婚礼，共同见证这一份坚定而美好的誓约。',
  venue: {
    name: '格乐利雅婚礼艺术中心',
    hall: '3楼 · 凡尔赛水晶宴会厅',
    address: '上海市浦东新区世博大道1888号',
    city: '上海市',
    lat: 31.1895,
    lng: 121.4921,
    transportTips: '地铁8号线中华艺术宫站3号口出，步行约600米；自驾宾客可免费停放于地下B2停车场。',
  },
  bgm: {
    title: 'Canon in D (卡农·唯美钢琴版)',
    artist: 'Johann Pachelbel',
    url: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Canon_in_D_Major_%28Johann_Pachelbel%29.ogg',
    autoPlay: true,
    synthFallback: true,
  },
  stories: [
    {
      id: 'story-1',
      date: '2021.05.20',
      title: '初遇 · 图书馆窗前的微风',
      content: '在大学图书馆的阳光借书角，那一缕微风吹翻了书页，也让我们不期而遇。目光交汇的那一刻，故事悄然写下第一笔。',
      image: ARTISTIC_OUTDOOR_PHOTO,
    },
    {
      id: 'story-2',
      date: '2023.08.15',
      title: '同行 · 见证山河与四季日落',
      content: '我们一起走过青海湖的碧蓝、大理的晚霞和北方的初雪。一路上彼此陪伴，柴米油盐也变成了诗意篇章。',
      image: ARTISTIC_COUPLE_COVER,
    },
    {
      id: 'story-3',
      date: '2025.10.01',
      title: '求婚 · 繁星下的坚定誓言',
      content: '“以爱之名，余生请多关照。”漫天烟火之下单膝跪地，一句“我愿意”，让漫长的等待都有了圆满的答案。',
      image: ARTISTIC_HALL_PHOTO,
    },
  ],
  photos: [
    {
      id: 'photo-1',
      url: ARTISTIC_COUPLE_COVER,
      title: '主纱大片 · 浪漫誓约',
      aspect: 'portrait',
    },
    {
      id: 'photo-2',
      url: ARTISTIC_CHINESE_PHOTO,
      title: '秀禾喜韵 · 百年好合',
      aspect: 'portrait',
    },
    {
      id: 'photo-3',
      url: ARTISTIC_OUTDOOR_PHOTO,
      title: '草坪外景 · 阳光微风',
      aspect: 'landscape',
    },
    {
      id: 'photo-4',
      url: ARTISTIC_HALL_PHOTO,
      title: '宴会典礼 · 水晶流光',
      aspect: 'landscape',
    },
  ],
  schedule: [
    {
      id: 'sch-1',
      time: '08:30',
      title: '晨曦迎亲 · 喜气洋洋',
      desc: '迎亲车队抵达，趣味互动，新郎接亲',
      iconName: 'Sparkles',
    },
    {
      id: 'sch-2',
      time: '10:00',
      title: '敬茶感恩 · 父母改口',
      desc: '感恩双亲养育之恩，长辈赐福添喜',
      iconName: 'Heart',
    },
    {
      id: 'sch-3',
      time: '11:18',
      title: '宾客签到 · 浪漫合影',
      desc: '签到台签到留念，享用迎宾甜品台',
      iconName: 'Camera',
    },
    {
      id: 'sch-4',
      time: '11:58',
      title: '婚礼仪式 · 神圣宣誓',
      desc: '新人入场、交换婚戒、宣读真挚誓词',
      iconName: 'Gem',
    },
    {
      id: 'sch-5',
      time: '12:38',
      title: '答谢喜宴 · 觥筹交错',
      desc: '举杯同庆、新人敬酒、抽奖互动环节',
      iconName: 'Wine',
    },
  ],
  heartsCount: 999,
  particlesEnabled: true,
  danmakuEnabled: true,
};

export const INITIAL_RSVP_LIST: GuestRSVP[] = [
  {
    id: 'rsvp-1',
    name: '林浩然 & 夫人',
    phone: '13688889999',
    attending: 'yes',
    guestCount: 2,
    dietary: 'standard',
    needsShuttle: false,
    blessing: '祝两位新人永结同心，百年好合，早生贵子！',
    submittedAt: '2026-10-08 14:20',
  },
  {
    id: 'rsvp-2',
    name: '苏晓晴',
    phone: '13912345678',
    attending: 'yes',
    guestCount: 1,
    dietary: 'vegetarian',
    needsShuttle: true,
    blessing: '最美的新娘，最好的新郎，愿你们的未来比童话还要甜！',
    submittedAt: '2026-10-08 16:45',
  },
  {
    id: 'rsvp-3',
    name: '陈建国（叔叔）',
    phone: '13700001111',
    attending: 'yes',
    guestCount: 3,
    dietary: 'standard',
    needsShuttle: false,
    blessing: '喜结良缘，家和万事兴！',
    submittedAt: '2026-10-09 09:12',
  },
];

export const INITIAL_BLESSINGS: GuestBlessing[] = [
  {
    id: 'bless-1',
    author: '大学室友阿杰',
    content: '看着你们从大一图书馆走到今天婚礼殿堂，太感动了！百年好合！',
    createdAt: '10分钟前',
    likes: 38,
    avatarColor: 'bg-rose-500',
  },
  {
    id: 'bless-2',
    author: '林夕的闺蜜小敏',
    content: '今天你就是世界上最美最幸福的公主，新郎一定要好好宠爱她一辈子！',
    createdAt: '25分钟前',
    likes: 52,
    avatarColor: 'bg-amber-500',
  },
  {
    id: 'bless-3',
    author: '同事老张',
    content: '恭喜晨哥！新婚快乐，琴瑟和鸣，幸福美满！',
    createdAt: '1小时前',
    likes: 19,
    avatarColor: 'bg-emerald-500',
  },
  {
    id: 'bless-4',
    author: '表姐文静',
    content: '良辰吉日，两姓联姻，愿你们一生平安喜乐，白头偕老！',
    createdAt: '2小时前',
    likes: 41,
    avatarColor: 'bg-indigo-500',
  },
  {
    id: 'bless-5',
    author: '同窗好友思齐',
    content: '佳偶天成，百年好合！永远支持你们！',
    createdAt: '3小时前',
    likes: 27,
    avatarColor: 'bg-pink-500',
  },
];
