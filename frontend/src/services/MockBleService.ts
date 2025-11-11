// src/services/MockBleService.ts
import { TelemetryData } from './RealBleService';

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

export type TelemetryCallback = (data: TelemetryData) => void;

class MockBleService {
  private status: BleStatus = {
    isScanning: false,
    isConnected: false,
    connectedDevice: null,
    error: null,
  };

  private mockDevices: BleDevice[] = [
    { id: '001', name: 'ApexBox-001', signal: 'excellent', rssi: -50 },
    { id: '002', name: 'ApexBox-002', signal: 'fair', rssi: -75 },
  ];

  private telemetryInterval: ReturnType<typeof setInterval> | null = null;
  private telemetryCallbacks: Set<TelemetryCallback> = new Set();

  async scan(): Promise<BleDevice[]> {
    console.log('[MockBLE] Scanning for devices...');
    this.status.isScanning = true;
    
    return new Promise((resolve) => {
      setTimeout(() => {
        this.status.isScanning = false;
        console.log('[MockBLE] Found devices:', this.mockDevices);
        resolve(this.mockDevices);
      }, 1500);
    });
  }

  async connect(device: BleDevice): Promise<boolean> {
    console.log('[MockBLE] Connecting to:', device.name);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        this.status.isConnected = true;
        this.status.connectedDevice = device;
        console.log('[MockBLE] Connected to:', device.name);
        
        // Start telemetry streaming
        this.startTelemetryStream();
        
        resolve(true);
      }, 1000);
    });
  }

  async disconnect(): Promise<void> {
    console.log('[MockBLE] Disconnecting...');
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // Stop telemetry streaming
        this.stopTelemetryStream();
        
        this.status.isConnected = false;
        this.status.connectedDevice = null;
        console.log('[MockBLE] Disconnected');
        resolve();
      }, 500);
    });
  }

  async sendCommand(command: string): Promise<void> {
    if (!this.status.isConnected) {
      throw new Error('Not connected to any device');
    }
    
    console.log('[MockBLE] Sending command:', command);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('[MockBLE] Command sent successfully:', command);
        resolve();
      }, 500);
    });
  }

  getStatus(): BleStatus {
    return { ...this.status };
  }

  onTelemetry(callback: TelemetryCallback): () => void {
    this.telemetryCallbacks.add(callback);
    console.log('[MockBLE] Telemetry subscriber added. Total:', this.telemetryCallbacks.size);
    
    return () => {
      this.telemetryCallbacks.delete(callback);
      console.log('[MockBLE] Telemetry subscriber removed. Total:', this.telemetryCallbacks.size);
    };
  }

  private generateMockData(): TelemetryData {
    const time = Date.now() / 1000;
    const speed = 40 + Math.sin(time / 10) * 30 + Math.random() * 10;
    
    return {
      speed: Math.max(0, speed),
      rpm: Math.floor(speed * 50 + Math.random() * 500),
      obdSpeed: Math.max(0, speed * 1.60934),
      temperature: 20 + Math.random() * 20,
      humidity: 40 + Math.random() * 40,
      pressure: 1000 + Math.random() * 50,
      altitude: 500 + Math.random() * 100,
      heading: (Date.now() / 100) % 360,
      pitch: (Math.random() - 0.5) * 10,
      roll: (Math.random() - 0.5) * 10,
      lux: Math.random() * 1000,
      gas: 3000 + Math.random() * 1000,
      satellites: Math.floor(Math.random() * 12) + 4,
      latitude: 47.6062 + (Math.random() - 0.5) * 0.01,
      longitude: -122.3321 + (Math.random() - 0.5) * 0.01,
      obdConnected: Math.random() > 0.3,
      gForce: Math.abs(Math.sin(time / 2) * 2 + Math.random() * 0.5),
    };
  }

  private startTelemetryStream() {
    if (this.telemetryInterval) {
      return;
    }

    console.log('[MockBLE] Starting telemetry stream at 20Hz');

    this.telemetryInterval = setInterval(() => {
      if (!this.status.isConnected) {
        this.stopTelemetryStream();
        return;
      }

      const data = this.generateMockData();
      
      this.telemetryCallbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[MockBLE] Error in telemetry callback:', error);
        }
      });
    }, 50);
  }

  private stopTelemetryStream() {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
      console.log('[MockBLE] Telemetry stream stopped');
    }
  }

  destroy() {
    this.disconnect();
  }
}

export default new MockBleService();