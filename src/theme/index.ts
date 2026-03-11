export interface ThemeColors {
  // Backgrounds
  bg: string;
  bgSecondary: string;
  card: string;
  cardBorder: string;
  surface: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Accent
  accent: string;
  accentLight: string;
  accentMuted: string;

  // Status
  success: string;
  error: string;
  warning: string;
  info: string;

  // UI Elements
  inputBg: string;
  inputBorder: string;
  divider: string;
  tabBar: string;
  tabBarBorder: string;
  overlay: string;
  badge: string;
  shimmer: string;
}

export const darkTheme: ThemeColors = {
  bg: '#0B0B14',
  bgSecondary: '#10101C',
  card: '#161625',
  cardBorder: '#1F1F35',
  surface: '#1C1C30',

  text: '#E8E8F0',
  textSecondary: '#9090AD',
  textMuted: '#55556E',
  textInverse: '#0B0B14',

  accent: '#7B6CF6',
  accentLight: '#9D91FF',
  accentMuted: 'rgba(123, 108, 246, 0.15)',

  success: '#34D399',
  error: '#F87171',
  warning: '#FBBF24',
  info: '#60A5FA',

  inputBg: '#12121F',
  inputBorder: '#252540',
  divider: '#1A1A2E',
  tabBar: '#0E0E18',
  tabBarBorder: '#1A1A2E',
  overlay: 'rgba(0, 0, 0, 0.7)',
  badge: '#7B6CF6',
  shimmer: '#1F1F35',
};

export const lightTheme: ThemeColors = {
  bg: '#F4F4F8',
  bgSecondary: '#EEEEF3',
  card: '#FFFFFF',
  cardBorder: '#E4E4EC',
  surface: '#FFFFFF',

  text: '#1A1A2E',
  textSecondary: '#6B6B82',
  textMuted: '#A0A0B4',
  textInverse: '#FFFFFF',

  accent: '#6B5CE7',
  accentLight: '#8577F5',
  accentMuted: 'rgba(107, 92, 231, 0.1)',

  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  inputBg: '#F7F7FB',
  inputBorder: '#DDDDE6',
  divider: '#EAEAF0',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E8E8F0',
  overlay: 'rgba(0, 0, 0, 0.4)',
  badge: '#6B5CE7',
  shimmer: '#EEEEF3',
};
