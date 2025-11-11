import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { BleDeviceMemory } from '../services/BleDeviceMemory';
import { useAuth } from './AuthContext'; // ✅ Add this import

// Lazy import BLE services to avoid crashes in Expo Go
let RealBleService: any = null;
let MockBleService: any = null;

// Detect if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Import appropriate service
if (isExpoGo || __DEV__) {
  console.log('[BleContext] Running in Expo Go or dev mode - using MockBleService');
  MockBleService = require('../services/MockBleService').default;
} else {
  console.log('[BleContext] Running in standalone build - using RealBleService');
  RealBleService = require('../services/RealBleService').default;
}

// Get the service to use
const BleService = isExpoGo ? MockBleService : RealBleService;

export interface BleDevice {
  id: string;
  name: string;
  signal: 'excellent' | 'good' | 'fair' | 'weak';
  rssi?: number;
}

export interface BleStatus {
  isScanning: boolean;
  isConnected: boolean;
  connectedDevice: BleDevice | null;
  error: string | null;
}

export interface TelemetryData {
  speed: number;
  rpm: number;
  obdSpeed: number;
  temperature: number;
  humidity: number;
  pressure: number;
  altitude: number;
  heading: number;
  pitch: number;
  roll: number;
  lux: number;
  gas: number;
  satellites: number;
  latitude: number;
  longitude: number;
  obdConnected: boolean;
  gForce: number;
}

interface BleContextType {
  status: BleStatus;
  devices: BleDevice[];
  telemetry: TelemetryData | null;
  scan: () => Promise<void>;
  connect: (device: BleDevice) => Promise<void>;
  disconnect: () => Promise<void>;
  sendCommand: (command: string) => Promise<void>;
  forgetDevice: () => Promise<void>;
  tryAutoConnect: () => Promise<boolean>;
  usingRealBle: boolean;
}

const BleContext = createContext<BleContextType | undefined>(undefined);

// ✅ Create internal provider component that has access to useAuth
function BleProviderInternal({ children }: { children: ReactNode }) {
  const { user } = useAuth(); // ✅ Get user from AuthContext
  const [status, setStatus] = useState<BleStatus>(BleService.getStatus());
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [usingRealBle] = useState(!isExpoGo);
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);

  // Subscribe to telemetry updates
  useEffect(() => {
    const unsubscribe = BleService.onTelemetry((data: TelemetryData) => {
      setTelemetry(data);
    });

    return unsubscribe;
  }, []);

  // ✅ Auto-connect only when user is logged in
  useEffect(() => {
    if (!user) {
      console.log('[BleContext] User not logged in, skipping auto-connect');
      setAutoConnectAttempted(false);
      return;
    }

    if (!autoConnectAttempted) {
      console.log('[BleContext] User logged in, attempting auto-connect');
      setAutoConnectAttempted(true);
      tryAutoConnect();
    }
  }, [user, autoConnectAttempted]);

  const tryAutoConnect = async (): Promise<boolean> => {
    try {
      console.log('[BleContext] Attempting auto-connect...');
      const remembered = await BleDeviceMemory.getRememberedDevice();

      if (!remembered) {
        console.log('[BleContext] No remembered device');
        return false;
      }

      const foundDevices = await BleService.scan();
      setDevices(foundDevices);
      setStatus(BleService.getStatus());

      const targetDevice = foundDevices.find((d: BleDevice) => d.id === remembered.id);

      if (targetDevice) {
        console.log('[BleContext] Found remembered device, connecting...');
        const success = await BleService.connect(targetDevice);
        setStatus(BleService.getStatus());
        
        if (success) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return true;
        }
      } else {
        console.log('[BleContext] Remembered device not found');
      }

      return false;
    } catch (error) {
      console.error('[BleContext] Auto-connect error:', error);
      return false;
    }
  };

  const scan = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const foundDevices = await BleService.scan();
      setDevices(foundDevices);
      setStatus(BleService.getStatus());
    } catch (error) {
      console.error('[BleContext] Scan error:', error);
    }
  };

  const connect = async (device: BleDevice) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const success = await BleService.connect(device);
      setStatus(BleService.getStatus());

      if (success) {
        await BleDeviceMemory.rememberDevice(device.id, device.name);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error('[BleContext] Connect error:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const disconnect = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await BleService.disconnect();
      setStatus(BleService.getStatus());
      setTelemetry(null);
    } catch (error) {
      console.error('[BleContext] Disconnect error:', error);
    }
  };

  const forgetDevice = async () => {
    try {
      await BleDeviceMemory.forgetDevice();
      console.log('[BleContext] Device forgotten');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[BleContext] Forget device error:', error);
      throw error;
    }
  };

  const sendCommand = async (command: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await BleService.sendCommand(command);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[BleContext] Command error:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw error;
    }
  };

  return (
    <BleContext.Provider
      value={{
        status,
        devices,
        telemetry,
        scan,
        connect,
        disconnect,
        sendCommand,
        forgetDevice,
        tryAutoConnect,
        usingRealBle,
      }}
    >
      {children}
    </BleContext.Provider>
  );
}

// ✅ Export wrapper that ensures AuthContext is available
export function BleProvider({ children }: { children: ReactNode }) {
  return <BleProviderInternal>{children}</BleProviderInternal>;
}

export function useBle() {
  const context = useContext(BleContext);
  if (!context) {
    throw new Error('useBle must be used within BleProvider');
  }
  return context;
}