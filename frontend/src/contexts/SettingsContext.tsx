import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import SettingsService, { AppSettings } from '../services/SettingsService';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  updateProfile: (profile: Partial<AppSettings['profile']>) => Promise<void>;
  updateUnits: (units: Partial<AppSettings['units']>) => Promise<void>;
  updateTheme: (theme: Partial<AppSettings['theme']>) => Promise<void>;
  updateConnectivity: (connectivity: Partial<AppSettings['connectivity']>) => Promise<void>;
  toggleDeveloperMode: () => Promise<void>;
  resetSettings: () => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loaded = await SettingsService.getSettings();
      setSettings(loaded);
    } catch (error) {
      console.error('[SettingsContext] Load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<AppSettings>) => {
    try {
      await SettingsService.updateSettings(updates);
      await loadSettings();
    } catch (error) {
      console.error('[SettingsContext] Update error:', error);
    }
  };

  const updateProfile = async (profile: Partial<AppSettings['profile']>) => {
    try {
      await SettingsService.updateProfile(profile);
      await loadSettings();
    } catch (error) {
      console.error('[SettingsContext] Update profile error:', error);
    }
  };

  const updateUnits = async (units: Partial<AppSettings['units']>) => {
    try {
      await SettingsService.updateUnits(units);
      await loadSettings();
    } catch (error) {
      console.error('[SettingsContext] Update units error:', error);
    }
  };

  const updateTheme = async (theme: Partial<AppSettings['theme']>) => {
    try {
      await SettingsService.updateTheme(theme);
      await loadSettings();
    } catch (error) {
      console.error('[SettingsContext] Update theme error:', error);
    }
  };

  const updateConnectivity = async (connectivity: Partial<AppSettings['connectivity']>) => {
    try {
      await SettingsService.updateConnectivity(connectivity);
      await loadSettings();
    } catch (error) {
      console.error('[SettingsContext] Update connectivity error:', error);
    }
  };

  const toggleDeveloperMode = async () => {
    try {
      await SettingsService.toggleDeveloperMode();
      await loadSettings();
    } catch (error) {
      console.error('[SettingsContext] Toggle developer mode error:', error);
    }
  };

  const resetSettings = async () => {
    try {
      await SettingsService.resetSettings();
      await loadSettings();
    } catch (error) {
      console.error('[SettingsContext] Reset error:', error);
    }
  };

  if (!settings) {
    return null;
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        updateProfile,
        updateUnits,
        updateTheme,
        updateConnectivity,
        toggleDeveloperMode,
        resetSettings,
        isLoading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}