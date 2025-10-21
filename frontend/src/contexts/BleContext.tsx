import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import MockBleService, { BleDevice, BleStatus } from '../services/MockBleService';
import { TelemetryData } from '../utils/telemetry';
import * as Haptics from 'expo-haptics';

interface BleContextType {
  status: BleStatus;
  devices: BleDevice[];
  telemetry: TelemetryData | null;
  scan: () => Promise<void>;
  connect: (device: BleDevice) => Promise<void>;
  disconnect: () => Promise<void>;
  sendCommand: (command: string) => Promise<void>;
}

const BleContext = createContext<BleContextType | undefined>(undefined);

export function BleProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BleStatus>(MockBleService.getStatus());
  const [devices, setDevices] = useState<BleDevice[]>([]);

  const scan = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const foundDevices = await MockBleService.scan();
      setDevices(foundDevices);
      setStatus(MockBleService.getStatus());
    } catch (error) {
      console.error('[BleContext] Scan error:', error);
    }
  };

  const connect = async (device: BleDevice) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await MockBleService.connect(device);
      setStatus(MockBleService.getStatus());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[BleContext] Connect error:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const disconnect = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await MockBleService.disconnect();
      setStatus(MockBleService.getStatus());
    } catch (error) {
      console.error('[BleContext] Disconnect error:', error);
    }
  };

  const sendCommand = async (command: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await MockBleService.sendCommand(command);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[BleContext] Command error:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw error;
    }
  };

  return (
    <BleContext.Provider value={{ status, devices, scan, connect, disconnect, sendCommand }}>
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