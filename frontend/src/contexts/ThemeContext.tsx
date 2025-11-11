import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS as LIGHT_COLORS } from '../constants/theme';

export type ThemeMode = 'light' | 'dark';
export type AccentColor = 'cyan' | 'magenta' | 'lime';

interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  cyan: string;
  magenta: string;
  lime: string;
  orange: string;
  error: string;
}

interface ThemeContextType {
  mode: ThemeMode;
  accentColor: AccentColor;
  colors: ThemeColors;
  toggleMode: () => Promise<void>;
  setAccentColor: (color: AccentColor) => Promise<void>;
  getCurrentAccent: () => string;
}

const DARK_COLORS: ThemeColors = {
  background: '#0A0A0A',
  card: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textTertiary: '#666666',
  border: '#333333',
  cyan: '#00D4FF',
  magenta: '#FF00FF',
  lime: '#00FF88',
  orange: '#FF8800',
  error: '#FF4444',
};

const LIGHT_COLORS_THEME: ThemeColors = {
  background: '#F5F5F5',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#E0E0E0',
  cyan: '#00A8CC',
  magenta: '#CC00CC',
  lime: '#00CC66',
  orange: '#FF8800',
  error: '#CC0000',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@apexbox_theme_mode';
const ACCENT_STORAGE_KEY = '@apexbox_accent_color';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [accentColor, setAccentColorState] = useState<AccentColor>('cyan');
  const [colors, setColors] = useState<ThemeColors>(DARK_COLORS);

  useEffect(() => {
    loadThemePreferences();
  }, []);

  useEffect(() => {
    updateColors();
  }, [mode]);

  const loadThemePreferences = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      const savedAccent = await AsyncStorage.getItem(ACCENT_STORAGE_KEY);

      if (savedMode === 'light' || savedMode === 'dark') {
        setMode(savedMode);
      } else {
        // Use system preference on first launch
        const systemMode = Appearance.getColorScheme();
        setMode(systemMode === 'light' ? 'light' : 'dark');
      }

      if (savedAccent === 'cyan' || savedAccent === 'magenta' || savedAccent === 'lime') {
        setAccentColorState(savedAccent);
      }

      console.log('[Theme] Loaded preferences:', { mode: savedMode, accent: savedAccent });
    } catch (error) {
      console.error('[Theme] Error loading preferences:', error);
    }
  };

  const updateColors = () => {
    setColors(mode === 'dark' ? DARK_COLORS : LIGHT_COLORS_THEME);
  };

  const toggleMode = async () => {
    const newMode = mode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    console.log('[Theme] Mode toggled to:', newMode);
  };

  const setAccentColor = async (color: AccentColor) => {
    setAccentColorState(color);
    await AsyncStorage.setItem(ACCENT_STORAGE_KEY, color);
    console.log('[Theme] Accent color changed to:', color);
  };

  const getCurrentAccent = (): string => {
    return colors[accentColor];
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        accentColor,
        colors,
        toggleMode,
        setAccentColor,
        getCurrentAccent,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// Backward compatibility with old hook
export function useAccentColor(): string {
  const { getCurrentAccent } = useTheme();
  return getCurrentAccent();
}
