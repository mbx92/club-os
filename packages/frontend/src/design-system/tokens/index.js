/**
 * Dynasty Fitness Design Tokens
 * Complete design token system for the GYM + RESTAURANT membership platform.
 * All values are consumed by Tailwind config and component styles.
 *
 * @module tokens
 */

// ──────────────────────────────────
// COLORS
// ──────────────────────────────────

/** Brand colors */
export const brand = {
  charcoal: '#1A1A2E',
  gold: '#F4A823',
  goldDark: '#D4940F',
  goldLight: '#F8D16B',
  white: '#F8F8F6',
}

/** Module accent colors */
export const moduleAccent = {
  gym: '#2D6A9F',
  gymLight: '#4B8EC5',
  gymDark: '#1F4E75',
  restaurant: '#E8604C',
  restaurantLight: '#F08272',
  restaurantDark: '#C44A38',
}

/** Semantic colors */
export const semantic = {
  success: '#16A34A',
  successLight: '#DCFCE7',
  successDark: '#15803D',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#D97706',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  errorDark: '#B91C1C',
  info: '#0EA5E9',
  infoLight: '#E0F2FE',
  infoDark: '#0284C7',
}

/** Neutral scale (50–950) */
export const neutral = {
  50: '#FAFAFA',
  100: '#F5F5F5',
  200: '#E5E5E5',
  300: '#D4D4D4',
  400: '#A3A3A3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
  950: '#0A0A0A',
}

/** Membership tier colors */
export const tiers = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  vip: '#B026FF',
}

/** All colors grouped for Tailwind integration */
export const colors = { brand, moduleAccent, semantic, neutral, tiers }

// ──────────────────────────────────
// TYPOGRAPHY
// ──────────────────────────────────

/** Font families */
export const fontFamily = {
  display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
  body: ['"DM Sans"', 'system-ui', 'sans-serif'],
  mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
}

/** Font size scale (rem) */
export const fontSize = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  '5xl': '3rem',
  '6xl': '3.75rem',
  '7xl': '4.5rem',
  '8xl': '6rem',
}

/** Font weights */
export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
}

/** Line heights */
export const lineHeight = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
}

/** Letter spacing */
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
  display: '0.02em',
  eyebrow: '0.24em',
}

// ──────────────────────────────────
// SPACING (4px base)
// ──────────────────────────────────

export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem',
}

// ──────────────────────────────────
// BORDER RADIUS
// ──────────────────────────────────

export const borderRadius = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  full: '9999px',
}

// ──────────────────────────────────
// SHADOWS
// ──────────────────────────────────

export const boxShadow = {
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.06)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.06)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.15)',
  gold: '0 8px 24px -4px rgb(244 168 35 / 0.22)',
  'gold-lg': '0 12px 32px -6px rgb(244 168 35 / 0.28)',
  gym: '0 8px 24px -4px rgb(45 106 159 / 0.18)',
  restaurant: '0 8px 24px -4px rgb(232 96 76 / 0.18)',
  card: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
  inset: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.04)',
}

// ──────────────────────────────────
// BREAKPOINTS
// ──────────────────────────────────

export const breakpoints = {
  xs: 375,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

// ──────────────────────────────────
// TRANSITIONS
// ──────────────────────────────────

export const transitions = {
  /** Duration values in ms */
  duration: {
    instant: 80,
    fast: 150,
    normal: 200,
    slow: 300,
    slower: 500,
    snail: 800,
  },
  /** Easing curves */
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    smooth: 'cubic-bezier(0.65, 0, 0.35, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
  },
  /** Utility transition shorthand strings */
  preset: {
    base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    spring: '350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
}

// ──────────────────────────────────
// Z-INDEX LAYERS
// ──────────────────────────────────

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  offcanvas: 400,
  modalBackdrop: 500,
  modal: 600,
  popover: 700,
  tooltip: 800,
  toast: 900,
  loader: 1000,
}

// ──────────────────────────────────
// ANIMATION KEYFRAME DEFINITIONS
// ──────────────────────────────────

export const keyframes = {
  fadeIn: {
    from: { opacity: '0' },
    to: { opacity: '1' },
  },
  fadeOut: {
    from: { opacity: '1' },
    to: { opacity: '0' },
  },
  slideUp: {
    from: { opacity: '0', transform: 'translateY(12px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },
  slideDown: {
    from: { opacity: '0', transform: 'translateY(-12px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },
  slideInRight: {
    from: { opacity: '0', transform: 'translateX(16px)' },
    to: { opacity: '1', transform: 'translateX(0)' },
  },
  slideInLeft: {
    from: { opacity: '0', transform: 'translateX(-16px)' },
    to: { opacity: '1', transform: 'translateX(0)' },
  },
  scaleIn: {
    from: { opacity: '0', transform: 'scale(0.95)' },
    to: { opacity: '1', transform: 'scale(1)' },
  },
  pulseRing: {
    '0%': { boxShadow: '0 0 0 0 rgb(244 168 35 / 0.4)' },
    '70%': { boxShadow: '0 0 0 10px rgb(244 168 35 / 0)' },
    '100%': { boxShadow: '0 0 0 0 rgb(244 168 35 / 0)' },
  },
  shimmer: {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' },
  },
  countUp: {
    from: { opacity: '0', transform: 'translateY(8px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
}

/** Animation presets for Tailwind */
export const animations = {
  'fade-in': 'fadeIn 200ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
  'fade-out': 'fadeOut 200ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
  'slide-up': 'slideUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
  'slide-down': 'slideDown 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
  'slide-in-right': 'slideInRight 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
  'slide-in-left': 'slideInLeft 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
  'scale-in': 'scaleIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
  'pulse-ring': 'pulseRing 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
  shimmer: 'shimmer 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
  spin: 'spin 1s linear infinite',
}

// ──────────────────────────────────
// ICON MAPPINGS
// ──────────────────────────────────

/** Module icons (Tabler icon names) */
export const moduleIcons = {
  gym: 'IconDumbbell',
  restaurant: 'IconToolsKitchen2',
  member: 'IconUsers',
  dashboard: 'IconLayoutDashboard',
  finance: 'IconCash',
  report: 'IconChartBar',
  settings: 'IconSettings',
  notification: 'IconBell',
  checkIn: 'IconScan',
  pos: 'IconDeviceLaptop',
  search: 'IconSearch',
  filter: 'IconFilter',
  calendar: 'IconCalendar',
  logout: 'IconLogout',
  profile: 'IconUserCircle',
  help: 'IconHelpCircle',
  cart: 'IconShoppingCart',
  inventory: 'IconPackages',
  table: 'IconTable',
  kitchen: 'IconChefHat',
  trainer: 'IconRun',
}

/** Tier icons */
export const tierIcons = {
  bronze: 'IconMedal',
  silver: 'IconMedal',
  gold: 'IconCrown',
  platinum: 'IconDiamond',
  vip: 'IconStarFilled',
}

/** Payment channel icons */
export const paymentChannelIcons = {
  midtrans: 'IconCreditCard',
  xendit: 'IconWallet',
  cash: 'IconCashBanknote',
  transfer: 'IconBuildingBank',
  qris: 'IconQrcode',
}

/** Status icons */
export const statusIcons = {
  active: 'IconCircleCheck',
  expired: 'IconClockX',
  pending: 'IconClock',
  cancelled: 'IconCircleX',
  inactive: 'IconCircleOff',
  success: 'IconCircleCheck',
  error: 'IconAlertTriangle',
  warning: 'IconAlertCircle',
  info: 'IconInfoCircle',
}

// ──────────────────────────────────
// MEMBERSHIP TIER CONFIG
// ──────────────────────────────────

export const tierConfig = [
  { name: 'Bronze', key: 'bronze', color: tiers.bronze, minPoints: 0, icon: tierIcons.bronze },
  { name: 'Silver', key: 'silver', color: tiers.silver, minPoints: 1000, icon: tierIcons.silver },
  { name: 'Gold', key: 'gold', color: tiers.gold, minPoints: 5000, icon: tierIcons.gold },
  { name: 'Platinum', key: 'platinum', color: tiers.platinum, minPoints: 15000, icon: tierIcons.platinum },
  { name: 'VIP', key: 'vip', color: tiers.vip, minPoints: 50000, icon: tierIcons.vip },
]

/** Status labels in Indonesian */
export const statusLabels = {
  active: 'Aktif',
  expired: 'Kadaluarsa',
  pending: 'Tertunda',
  cancelled: 'Dibatalkan',
  inactive: 'Nonaktif',
}

/** Skeleton variant shapes for Tailwind */
export const skeletonShapes = {
  text: {
    sm: 'h-3 w-24',
    md: 'h-4 w-48',
    lg: 'h-5 w-64',
    full: 'h-4 w-full',
  },
  avatar: {
    xs: 'size-8',
    sm: 'size-10',
    md: 'size-12',
    lg: 'size-16',
    xl: 'size-24',
    '2xl': 'size-32',
  },
  card: 'h-48 w-full',
  table: 'h-8 w-full',
}

/**
 * Complete design token export — used by Tailwind config and component styles.
 * Named export for tree-shaking; also available as default.
 */
export default {
  brand,
  moduleAccent,
  semantic,
  neutral,
  tiers,
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  spacing,
  borderRadius,
  boxShadow,
  breakpoints,
  transitions,
  zIndex,
  keyframes,
  animations,
  moduleIcons,
  tierIcons,
  paymentChannelIcons,
  statusIcons,
  tierConfig,
  statusLabels,
  skeletonShapes,
}
