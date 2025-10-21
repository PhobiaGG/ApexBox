import { useSettings } from '../contexts/SettingsContext';
import { COLORS } from '../constants/theme';

/**
 * Hook to get the currently selected accent color
 */
export function useAccentColor() {
  const { settings } = useSettings();
  
  const accentColorMap = {
    cyan: COLORS.cyan,
    magenta: COLORS.magenta,
    lime: COLORS.lime,
  };

  return accentColorMap[settings.theme.accentColor] || COLORS.cyan;
}

/**
 * Get accent color from settings object directly
 */
export function getAccentColor(accentColorName: 'cyan' | 'magenta' | 'lime'): string {
  const accentColorMap = {
    cyan: COLORS.cyan,
    magenta: COLORS.magenta,
    lime: COLORS.lime,
  };

  return accentColorMap[accentColorName] || COLORS.cyan;
}
