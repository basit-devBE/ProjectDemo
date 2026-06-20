export const colors = {
  primary: '#0F172A',
  secondary: '#10B981',
  tertiary: '#6366F1',
  surface: '#F8F9FF',
  surfaceCard: '#FFFFFF',
  surfaceContainerLow: '#EFF4FF',
  surfaceContainerHigh: '#DCE9FF',
  onPrimary: '#FFFFFF',
  onSurface: '#0B1C30',
  onSurfaceVariant: '#45464D',
  outline: '#76777D',
  outlineVariant: '#C6C6CD',
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  success: '#10B981',
} as const;

export const typography = {
  displayLg: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 48, lineHeight: 58, letterSpacing: -0.96 },
  headlineLg: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 32, lineHeight: 40, letterSpacing: -0.32 },
  headlineMd: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 24, lineHeight: 34 },
  headlineSm: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 20, lineHeight: 28 },
  bodyLg: { fontFamily: 'Inter_400Regular', fontSize: 18, lineHeight: 29 },
  bodyMd: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24 },
  labelMd: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 17, letterSpacing: 0.14 },
  labelSm: { fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 14 },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
