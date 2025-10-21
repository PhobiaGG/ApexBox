import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import RealBleService from '../services/RealBleService';
import MockBleService, { BleDevice, BleStatus } from '../services/MockBleService';
import { TelemetryData } from '../utils/telemetry';
import { BleDeviceMemory } from '../services/BleDeviceMemory';
import * as Haptics from 'expo-haptics';

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

export function BleProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BleStatus>(RealBleService.getStatus());
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [usingRealBle, setUsingRealBle] = useState(true);
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);

  // Subscribe to telemetry updates
  useEffect(() => {
    const unsubscribe = RealBleService.onTelemetry((data) => {
      setTelemetry(data);
    });

    return unsubscribe;
  }, []);

  // Auto-connect on mount if we have a remembered device
  useEffect(() => {
    if (!autoConnectAttempted) {
      setAutoConnectAttempted(true);
      tryAutoConnect();
    }
  }, []);

  const tryAutoConnect = async (): Promise<boolean> => {
    try {
      console.log('[BleContext] Attempting auto-connect...');
      const remembered = await BleDeviceMemory.getRememberedDevice();
      
      if (!remembered) {
        console.log('[BleContext] No remembered device');
        return false;
      }

      // Scan for the remembered device
      const foundDevices = await RealBleService.scan();
      const targetDevice = foundDevices.find(d => d.id === remembered.id);

      if (targetDevice) {
        console.log('[BleContext] Found remembered device, connecting...');
        await RealBleService.connect(targetDevice);
        setStatus(RealBleService.getStatus());
        setDevices(foundDevices);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return true;
      } else {
        console.log('[BleContext] Remembered device not found');
        setDevices(foundDevices);
        return false;
      }
    } catch (error) {
      console.error('[BleContext] Auto-connect error:', error);
      return false;
    }
  };

  const scan = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const foundDevices = await RealBleService.scan();
      setDevices(foundDevices);
      setStatus(RealBleService.getStatus());
    } catch (error) {
      console.error('[BleContext] Scan error:', error);
    }
  };

  const connect = async (device: BleDevice) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await RealBleService.connect(device);
      setStatus(RealBleService.getStatus());
      
      // Remember this device for future auto-connect
      await BleDeviceMemory.rememberDevice(device.id, device.name);
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[BleContext] Connect error:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const disconnect = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await RealBleService.disconnect();
      setStatus(RealBleService.getStatus());
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
      await RealBleService.sendCommand(command);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[BleContext] Command error:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw error;
    }
  };

  return (
    <BleContext.Provider value={{ status, devices, telemetry, scan, connect, disconnect, sendCommand, usingRealBle }}>
      {children}
    </BleContext.Provider>
  );
}

export function useBle() {
  const context = useContext(BleContext);
  if (!context) {
    throw new Error('useBle must be used within BleProvider');
  }
  return context;
}