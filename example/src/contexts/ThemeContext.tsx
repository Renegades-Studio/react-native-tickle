import React, { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

export interface ThemeColors {
  // Main colors
  background: string;
  text: string;
  secondaryText: string;
  tertiaryText: string;

  // Palette colors
  padColor: string;
  flashColor: string;
  touchIndicator: string;

  // Accent colors
  accent: string;
  blue: string;
  green: string;

  // Surface colors
  card: string;
  cardSelected: string;
  border: string;
  borderActive: string;

  // Timeline colors
  timelineBackground: string;
  timelineGrid: string;
  timelineGridLight: string;
  timelineLaneSeparator: string;
  playhead: string;
}

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const colors: ThemeColors = {
    // Main colors
    background: isDark ? '#000000' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    secondaryText: isDark ? '#8E8E93' : '#8E8E93',
    tertiaryText: isDark ? '#636366' : '#636366',

    // Palette colors
    padColor: isDark ? '#3A3A3C' : '#D1D1D6',
    flashColor: isDark ? '#48484A' : '#C7C7CC',
    touchIndicator: '#F7A98A',

    // Accent colors
    accent: '#FF3B30',
    blue: '#007AFF',
    green: '#34C759',

    // Surface colors
    card: isDark ? '#1C1C1E' : '#F2F2F7',
    cardSelected: isDark ? '#0A1A2E' : '#E5F1FF',
    border: 'transparent',
    borderActive: '#007AFF',

    // Timeline colors
    timelineBackground: isDark ? '#1C1C1E' : '#F2F2F7',
    timelineGrid: isDark ? '#2C2C2E' : '#D1D1D6',
    timelineGridLight: isDark ? '#3A3A3C' : '#E5E5EA',
    timelineLaneSeparator: isDark ? '#3A3A3C' : '#C7C7CC',
    playhead: isDark ? '#FFFFFF' : '#000000',
  };

  return (
    <ThemeContext.Provider value={{ colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
