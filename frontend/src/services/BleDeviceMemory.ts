import AsyncStorage from '@react-native-async-storage/async-storage';

const REMEMBERED_DEVICE_KEY = '@apexbox_remembered_device';

export interface RememberedDevice {
  id: string;
  name: string;
  timestamp: number;
}

export class BleDeviceMemory {
  /**
   * Save a device to remember for auto-connection
   */
  static async rememberDevice(deviceId: string, deviceName: string): Promise<void> {
    try {
      const device: RememberedDevice = {
        id: deviceId,
        name: deviceName,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(REMEMBERED_DEVICE_KEY, JSON.stringify(device));
      console.log('[BleMemory] Device remembered:', deviceName);
    } catch (error) {
      console.error('[BleMemory] Error saving device:', error);
      throw error;
    }
  }

  /**
   * Get the remembered device
   */
  static async getRememberedDevice(): Promise<RememberedDevice | null> {
    try {
      const data = await AsyncStorage.getItem(REMEMBERED_DEVICE_KEY);
      if (data) {
        const device = JSON.parse(data) as RememberedDevice;
        console.log('[BleMemory] Found remembered device:', device.name);
        return device;
      }
      console.log('[BleMemory] No remembered device found');
      return null;
    } catch (error) {
      console.error('[BleMemory] Error loading device:', error);
      return null;
    }
  }

  /**
   * Forget the remembered device
   */
  static async forgetDevice(): Promise<void> {
    try {
      await AsyncStorage.removeItem(REMEMBERED_DEVICE_KEY);
      console.log('[BleMemory] Device forgotten');
    } catch (error) {
      console.error('[BleMemory] Error forgetting device:', error);
      throw error;
    }
  }

  /**
   * Check if we have a remembered device
   */
  static async hasRememberedDevice(): Promise<boolean> {
    const device = await this.getRememberedDevice();
    return device !== null;
  }
}
