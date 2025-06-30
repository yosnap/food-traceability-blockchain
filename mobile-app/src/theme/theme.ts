import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#22c55e', // green-500
    primaryContainer: '#bbf7d0', // green-200
    secondary: '#3b82f6', // blue-500
    secondaryContainer: '#bfdbfe', // blue-200
    tertiary: '#f59e0b', // amber-500
    tertiaryContainer: '#fed7aa', // amber-100
    surface: '#ffffff',
    surfaceVariant: '#f3f4f6', // gray-100
    background: '#fafafa', // gray-50
    error: '#ef4444', // red-500
    errorContainer: '#fecaca', // red-200
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onTertiary: '#ffffff',
    onSurface: '#111827', // gray-900
    onSurfaceVariant: '#6b7280', // gray-500
    onBackground: '#111827', // gray-900
    onError: '#ffffff',
    outline: '#d1d5db', // gray-300
    outlineVariant: '#e5e7eb', // gray-200
    inverseSurface: '#374151', // gray-700
    inverseOnSurface: '#f9fafb', // gray-50
    inversePrimary: '#86efac', // green-300
    shadow: '#000000',
    scrim: '#000000',
  },
  fonts: {
    ...DefaultTheme.fonts,
    displayLarge: {
      ...DefaultTheme.fonts.displayLarge,
      fontWeight: '700' as const,
    },
    displayMedium: {
      ...DefaultTheme.fonts.displayMedium,
      fontWeight: '600' as const,
    },
    displaySmall: {
      ...DefaultTheme.fonts.displaySmall,
      fontWeight: '600' as const,
    },
    headlineLarge: {
      ...DefaultTheme.fonts.headlineLarge,
      fontWeight: '600' as const,
    },
    headlineMedium: {
      ...DefaultTheme.fonts.headlineMedium,
      fontWeight: '600' as const,
    },
    headlineSmall: {
      ...DefaultTheme.fonts.headlineSmall,
      fontWeight: '600' as const,
    },
    titleLarge: {
      ...DefaultTheme.fonts.titleLarge,
      fontWeight: '600' as const,
    },
    titleMedium: {
      ...DefaultTheme.fonts.titleMedium,
      fontWeight: '500' as const,
    },
    titleSmall: {
      ...DefaultTheme.fonts.titleSmall,
      fontWeight: '500' as const,
    },
  },
  roundness: 8,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const shadows = {
  small: {
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6.27,
    elevation: 4,
  },
  large: {
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8.30,
    elevation: 6,
  },
};

export type Theme = typeof theme;