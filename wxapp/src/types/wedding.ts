export type WeddingTheme = 'chinese' | 'french' | 'forest' | 'minimalist';

export interface CouplePerson {
  name: string;
  pinyin: string;
  phone: string;
  role: string;
  avatar?: string;
}

export interface VenueInfo {
  name: string;
  hall: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  mapEmbedUrl?: string;
  transportTips: string;
}

export interface BgmConfig {
  title: string;
  artist: string;
  url: string;
  autoPlay: boolean;
  synthFallback: boolean;
}

export interface StoryItem {
  id: string;
  date: string;
  title: string;
  content: string;
  image: string;
}

export interface PhotoItem {
  id: string;
  url: string;
  title: string;
  aspect: 'portrait' | 'landscape';
}

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  desc: string;
  iconName: string;
}

export type EnvelopeStyle = 'champagne-rose' | 'burgundy';
export type WaxSealVariant = 'cinnabar-gold' | 'vintage-bronze' | 'ruby-rose';

export interface WeddingConfig {
  theme: WeddingTheme;
  envelopeStyle?: EnvelopeStyle;
  sealVariant?: WaxSealVariant;
  groom: CouplePerson;
  bride: CouplePerson;
  date: string; // ISO or 'YYYY-MM-DD HH:mm'
  lunarDate: string;
  invitationTitle: string;
  invitationProse: string;
  venue: VenueInfo;
  bgm: BgmConfig;
  stories: StoryItem[];
  photos: PhotoItem[];
  schedule: ScheduleItem[];
  heartsCount: number;
  particlesEnabled: boolean;
  danmakuEnabled: boolean;
}

export interface GuestRSVP {
  id: string;
  name: string;
  phone: string;
  openid?: string;
  attending: 'yes' | 'no';
  guestCount: number;
  dietary: 'standard' | 'vegetarian' | 'halal' | 'child';
  needsShuttle: boolean;
  blessing: string;
  submittedAt: string;
}

export interface GuestBlessing {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  likes: number;
  avatarColor: string;
}
