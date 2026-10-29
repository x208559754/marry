import React from 'react';

export type WaxSealVariant = 'cinnabar-gold' | 'vintage-bronze' | 'ruby-rose';

interface OrganicWaxSealProps {
  size?: number;
  variant?: WaxSealVariant;
  className?: string;
  isOpening?: boolean;
  showDroplets?: boolean;
  onClick?: () => void;
  interactive?: boolean;
  altText?: string;
}

/**
 * 高定手工熔蜡火漆印章 (Organic Hand-Poured Wax Seal)
 * 告别机械死板的正圆与千篇一律的AI感，呈现真实的：
 * 1. 自然流淌融蜡不规则溢边 (Organic Molten Wax Puddle & Lobes)
 * 2. 印章挤压翻卷的隆起蜡唇 (Raised Molten Lip with Uneven Thickness)
 * 3. 模印微倾手盖凹槽 (Hand-Pressed Slightly Tilted Stamping Basin)
 * 4. 传统金石连珠纹环饰 (Traditional Beaded Rim)
 * 5. 3D浮雕扫金双喜字 (Embossed Gilded "囍" with Specular & Shadow Bevels)
 * 6. 随手盖印伴生的微小飞溅凝固蜡滴 (Molten Wax Splatter Droplets)
 */
export const OrganicWaxSeal: React.FC<OrganicWaxSealProps> = ({
  size = 88,
  variant = 'cinnabar-gold',
  className = '',
  isOpening = false,
  showDroplets = true,
  onClick,
  interactive = true,
  altText = '婚礼火漆印章',
}) => {
  // 唯一 ID 前缀避免页面中多个火漆印 SVG 滤镜与渐变冲突
  const id = React.useId().replace(/:/g, '');

  // 颜色调配：针对不同风格精细配置蜡体底色、反光、扫金材质
  const colorMap = {
    'cinnabar-gold': {
      // 经典朱砂赤红扫金
      puddleBase: '#4A0506',
      puddleMid: '#991518',
      puddleTop: '#C82327',
      lipDark: '#5E080A',
      lipMid: '#B31C1F',
      lipLight: '#E84A4D',
      basinBase: '#6B0D0F',
      basinTop: '#8A1417',
      goldLight: '#FFF2B2',
      goldMid: '#F5D061',
      goldDark: '#B87B14',
      goldShadow: '#380405',
      glowColor: 'rgba(220, 38, 38, 0.45)',
    },
    'vintage-bronze': {
      // 复古古铜暮金
      puddleBase: '#2E190E',
      puddleMid: '#6E4226',
      puddleTop: '#9C623C',
      lipDark: '#3D2012',
      lipMid: '#7E4D2E',
      lipLight: '#B87B50',
      basinBase: '#4E2B17',
      basinTop: '#683A20',
      goldLight: '#FFF8D6',
      goldMid: '#E6BE75',
      goldDark: '#997330',
      goldShadow: '#24140B',
      glowColor: 'rgba(180, 115, 60, 0.45)',
    },
    'ruby-rose': {
      // 烟粉暮色玫瑰红
      puddleBase: '#3D0D14',
      puddleMid: '#8A2635',
      puddleTop: '#B53C4E',
      lipDark: '#4D121B',
      lipMid: '#9E3243',
      lipLight: '#D1586C',
      basinBase: '#5E1824',
      basinTop: '#781F2E',
      goldLight: '#FFF5E0',
      goldMid: '#F7D69E',
      goldDark: '#BA884B',
      goldShadow: '#2E060D',
      glowColor: 'rgba(197, 68, 90, 0.45)',
    },
  }[variant];

  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : 'img'}
      aria-label={altText}
      tabIndex={interactive ? 0 : -1}
      className={`relative inline-flex items-center justify-center select-none transition-transform duration-300 ${
        interactive
          ? 'cursor-pointer hover:scale-105 active:scale-95 group focus:outline-none'
          : 'pointer-events-none'
      } ${isOpening ? 'scale-110 opacity-0 transition-all duration-500' : ''} ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      <svg
        viewBox="0 0 160 160"
        className="w-full h-full overflow-visible"
        style={{
          filter: `drop-shadow(0 10px 20px ${colorMap.glowColor}) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.35))`,
        }}
      >
        <defs>
          {/* 外围底层融蜡池渐变 (自然熔融厚度) */}
          <radialGradient
            id={`${id}-waxPuddle`}
            cx="36%"
            cy="32%"
            r="68%"
          >
            <stop offset="0%" stopColor={colorMap.puddleTop} />
            <stop offset="42%" stopColor={colorMap.puddleMid} />
            <stop offset="85%" stopColor={colorMap.puddleBase} />
            <stop offset="100%" stopColor="#1A0203" stopOpacity="0.9" />
          </radialGradient>

          {/* 印模压出的挤压蜡唇加厚环渐变 */}
          <radialGradient
            id={`${id}-waxLip`}
            cx="32%"
            cy="28%"
            r="65%"
          >
            <stop offset="0%" stopColor={colorMap.lipLight} />
            <stop offset="45%" stopColor={colorMap.lipMid} />
            <stop offset="88%" stopColor={colorMap.lipDark} />
            <stop offset="100%" stopColor="#1F0204" />
          </radialGradient>

          {/* 模头压下的圆形凹槽印底 (Recessed Basin) */}
          <radialGradient
            id={`${id}-waxBasin`}
            cx="40%"
            cy="36%"
            r="62%"
          >
            <stop offset="0%" stopColor={colorMap.basinTop} />
            <stop offset="70%" stopColor={colorMap.basinBase} />
            <stop offset="100%" stopColor="#1E0204" />
          </radialGradient>

          {/* 烫金/扫金浮雕渐变 (Gilded Relief) */}
          <linearGradient
            id={`${id}-goldGilding`}
            x1="15%"
            y1="10%"
            x2="85%"
            y2="95%"
          >
            <stop offset="0%" stopColor={colorMap.goldLight} />
            <stop offset="28%" stopColor={colorMap.goldMid} />
            <stop offset="72%" stopColor={colorMap.goldDark} />
            <stop offset="100%" stopColor="#784E0B" />
          </linearGradient>

          {/* 连珠纹细圈渐变 */}
          <linearGradient
            id={`${id}-beadGold`}
            x1="20%"
            y1="20%"
            x2="80%"
            y2="80%"
          >
            <stop offset="0%" stopColor={colorMap.goldLight} stopOpacity="0.95" />
            <stop offset="50%" stopColor={colorMap.goldMid} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colorMap.goldDark} stopOpacity="0.6" />
          </linearGradient>

          {/* 蜡滴渐变 */}
          <radialGradient
            id={`${id}-droplet`}
            cx="35%"
            cy="30%"
            r="65%"
          >
            <stop offset="0%" stopColor={colorMap.puddleTop} />
            <stop offset="55%" stopColor={colorMap.puddleMid} />
            <stop offset="100%" stopColor={colorMap.puddleBase} />
          </radialGradient>
        </defs>

        {/* -------------------------------------------------------------
            伴生自然微小飞溅凝固蜡滴 (Molten Wax Splatters)
            真实手浇火漆不可避免的生动微小飞溅，彻底消除冰冷机械对称感
            ------------------------------------------------------------- */}
        {showDroplets && (
          <g className="transition-opacity duration-300">
            {/* 右上方自然蜡滴 */}
            <circle
              cx="146"
              cy="36"
              r="3.6"
              fill={`url(#${id}-droplet)`}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="0.5"
              style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }}
            />
            <circle cx="145" cy="35" r="1.1" fill="rgba(255,255,255,0.6)" />

            {/* 左下方微小拉丝滴 */}
            <ellipse
              cx="20"
              cy="119"
              rx="2.6"
              ry="3.4"
              transform="rotate(28 20 119)"
              fill={`url(#${id}-droplet)`}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="0.5"
              style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.35))' }}
            />
            <circle cx="19.2" cy="117.8" r="0.8" fill="rgba(255,255,255,0.5)" />

            {/* 右下微小冷凝颗粒 */}
            <circle
              cx="138"
              cy="126"
              r="1.8"
              fill={`url(#${id}-droplet)`}
              opacity="0.85"
            />
          </g>
        )}

        {/* -------------------------------------------------------------
            底层：不规则流淌融蜡溢边底盘 (Organic Poured Wax Puddle)
            采用精心编排的手工非对称平滑贝塞尔曲线，具有明显的流淌蜡波与垂滴
            ------------------------------------------------------------- */}
        {/* 外圈接触阴影 */}
        <path
          d="
            M 78,14
            C 94,13 111,18 124,28
            C 137,38 145,51 143,67
            C 141,78 149,90 146,103
            C 143,117 131,129 117,134
            C 103,139 89,140 76,138
            C 59,136 45,133 33,123
            C 20,112 13,96 14,80
            C 15,64 11,50 20,36
            C 30,21 46,14 63,12
            Z
          "
          fill="#1C0203"
          opacity="0.4"
          transform="translate(0, 3)"
        />

        {/* 融蜡主盘 */}
        <path
          d="
            M 78,13
            C 95,12 112,17 125,27
            C 138,37 146,50 144,66
            C 142,77 151,89 148,102
            C 145,116 132,128 118,133
            C 104,138 90,139 77,137
            C 60,135 46,132 34,122
            C 21,111 14,95 15,79
            C 16,63 12,49 21,35
            C 31,20 47,13 64,11
            Z
          "
          fill={`url(#${id}-waxPuddle)`}
          stroke="rgba(255, 230, 200, 0.15)"
          strokeWidth="0.8"
        />

        {/* 融蜡边缘起伏折光 (Subtle Wax Rim Highlights) */}
        <path
          d="
            M 64,14
            C 78,13 96,16 112,23
            C 126,30 138,42 141,56
          "
          fill="none"
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="
            M 24,42
            C 16,56 16,72 17,86
            C 18,98 25,110 36,118
          "
          fill="none"
          stroke="rgba(255, 255, 255, 0.18)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        {/* -------------------------------------------------------------
            中层：印模强力下压挤出的加厚蜡唇 (Raised Molten Wax Lip)
            厚薄自然不均（右下方因下压挤出更宽，左上方更紧致），呈现起伏环状凸起
            ------------------------------------------------------------- */}
        <path
          d="
            M 80,26
            C 107,25 128,42 130,68
            C 132,95 119,122 94,128
            C 69,134 40,123 32,98
            C 23,73 37,36 63,27
            C 69,25 74,25 80,26
            Z
          "
          fill={`url(#${id}-waxLip)`}
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
        />

        {/* 蜡唇顶端的高光月牙反光 (Glossy Wax Crest Reflection) */}
        <path
          d="
            M 48,34
            C 62,25 79,25 98,28
            C 112,31 122,39 126,50
          "
          fill="none"
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <ellipse
          cx="44"
          cy="30"
          rx="6"
          ry="2.4"
          transform="rotate(-32 44 30)"
          fill="rgba(255, 255, 255, 0.35)"
        />

        {/* -------------------------------------------------------------
            内层：黄铜印章压入的凹槽印底 (Hand-Stamped Recessed Basin)
            带有极细微的人手按压微倾角 (-2.8°)，避免绝对平直机械感
            ------------------------------------------------------------- */}
        <ellipse
          cx="81"
          cy="79.5"
          rx="38"
          ry="37.2"
          transform="rotate(-2.8 81 79.5)"
          fill={`url(#${id}-waxBasin)`}
          stroke="rgba(0,0,0,0.5)"
          strokeWidth="1.2"
        />

        {/* 凹槽边缘内阴影深度感 */}
        <ellipse
          cx="81"
          cy="79.5"
          rx="37.2"
          ry="36.4"
          transform="rotate(-2.8 81 79.5)"
          fill="none"
          stroke="rgba(0,0,0,0.6)"
          strokeWidth="1.5"
        />

        {/* -------------------------------------------------------------
            传统金石印面细致连珠纹圈 (Traditional Beaded Rim)
            经典复古高定婚礼火漆印章最具辨识度的珠纹环
            ------------------------------------------------------------- */}
        <circle
          cx="81"
          cy="79.5"
          r="33"
          fill="none"
          stroke={`url(#${id}-beadGold)`}
          strokeWidth="2.2"
          strokeDasharray="1.8 5.2"
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.8))' }}
        />

        {/* -------------------------------------------------------------
            印心核心：3D浮雕扫金「囍」字 (Embossed Gilded "囍")
            三层浮雕渲染：
            1. 阴刻凹坑深色阴影 (Deep Offset Shadow)
            2. 阳刻受光边缘提亮 (Specular Bevel Highlight)
            3. 扫金矿物金箔本体 (Brushed Gold Leaf Relief)
            ------------------------------------------------------------- */}
        {/* 浮雕底部阴影 */}
        <text
          x="82.4"
          y="83"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="'STSong', 'Songti SC', 'Noto Serif SC', 'SimSun', serif"
          fontWeight="900"
          fontSize="41"
          letterSpacing="-1.2px"
          fill={colorMap.goldShadow}
          opacity="0.95"
          style={{ userSelect: 'none' }}
        >
          囍
        </text>

        {/* 浮雕受光左上微高光边缘 */}
        <text
          x="80"
          y="80.2"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="'STSong', 'Songti SC', 'Noto Serif SC', 'SimSun', serif"
          fontWeight="900"
          fontSize="41"
          letterSpacing="-1.2px"
          fill="rgba(255, 255, 255, 0.65)"
          style={{ userSelect: 'none' }}
        >
          囍
        </text>

        {/* 浮雕鎏金主字形 */}
        <text
          x="81"
          y="81.5"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="'STSong', 'Songti SC', 'Noto Serif SC', 'SimSun', serif"
          fontWeight="900"
          fontSize="41"
          letterSpacing="-1.2px"
          fill={`url(#${id}-goldGilding)`}
          style={{
            userSelect: 'none',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.65))',
          }}
        >
          囍
        </text>

        {/* 双喜字横笔局部闪光扫金点缀 */}
        <circle cx="73" cy="74" r="1.1" fill="#FFFFFF" opacity="0.8" />
        <circle cx="89" cy="74" r="1.1" fill="#FFFFFF" opacity="0.8" />
      </svg>
    </div>
  );
};
