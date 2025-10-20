import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  displayName: string;
  carModel: string;
  carYear: string;
}

export interface UnitsSettings {
  isMetric: boolean;
  tempCelsius: boolean;
  altitudeMetric: boolean;
  time24Hour: boolean;
}

export interface ThemeSettings {
  isDark: boolean;
  accentColor: 'cyan' | 'magenta' | 'lime';
}

export interface ConnectivitySettings {
  bleAutoConnect: boolean;
  lastDevice: string | null;
}

export interface AppSettings {
  profile: UserProfile;
  units: UnitsSettings;
  theme: ThemeSettings;
  connectivity: ConnectivitySettings;
  developerMode: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  profile: {
    displayName: 'Driver',
    carModel: '',
    carYear: '',
  },
  units: {
    isMetric: true,
    tempCelsius: true,
    altitudeMetric: true,
    time24Hour: true,
  },
  theme: {
    isDark: true,
    accentColor: 'cyan',
  },
  connectivity: {
    bleAutoConnect: false,
    lastDevice: null,
  },
  developerMode: false,
};

class SettingsService {
  private storageKey = 'apexbox_settings';

  async getSettings(): Promise<AppSettings> {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('[SettingsService] Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(updated));
      console.log('[SettingsService] Settings updated:', settings);
    } catch (error) {
      console.error('[SettingsService] Error updating settings:', error);
      throw error;
    }
  }

  async updateProfile(profile: Partial<UserProfile>): Promise<void> {
    const current = await this.getSettings();
    await this.updateSettings({
      profile: { ...current.profile, ...profile },
    });
  }

  async updateUnits(units: Partial<UnitsSettings>): Promise<void> {
    const current = await this.getSettings();
    await this.updateSettings({
      units: { ...current.units, ...units },
    });
  }

  async updateTheme(theme: Partial<ThemeSettings>): Promise<void> {
    const current = await this.getSettings();
    await this.updateSettings({
      theme: { ...current.theme, ...theme },
    });
  }

  async updateConnectivity(connectivity: Partial<ConnectivitySettings>): Promise<void> {
    const current = await this.getSettings();
    await this.updateSettings({
      connectivity: { ...current.connectivity, ...connectivity },
    });
  }

  async toggleDeveloperMode(): Promise<boolean> {
    const current = await this.getSettings();
    const newValue = !current.developerMode;
    await this.updateSettings({ developerMode: newValue });
    return newValue;
  }

  async resetSettings(): Promise<void> {
    await AsyncStorage.removeItem(this.storageKey);
    console.log('[SettingsService] Settings reset to defaults');
  }
}

export default new SettingsService();