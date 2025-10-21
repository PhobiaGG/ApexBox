import { TelemetrySimulator, TelemetryData } from '../utils/telemetry';

export interface BleDevice {
  id: string;
  name: string;
  signal: 'excellent' | 'good' | 'fair' | 'weak';
}

export interface BleStatus {
  isScanning: boolean;
  isConnected: boolean;
  connectedDevice: BleDevice | null;
}

export type TelemetryCallback = (data: TelemetryData) => void;

class MockBleService {
  private status: BleStatus = {
    isScanning: false,
    isConnected: false,
    connectedDevice: null,
  };

  private mockDevices: BleDevice[] = [
    { id: '001', name: 'ApexBox-001', signal: 'excellent' },
    { id: '002', name: 'ApexBox-002', signal: 'fair' },
  ];

  private telemetrySimulator: TelemetrySimulator = new TelemetrySimulator();
  private telemetryInterval: NodeJS.Timeout | null = null;
  private telemetryCallbacks: Set<TelemetryCallback> = new Set();

  async scan(): Promise<BleDevice[]> {
    console.log('[BLE] Scanning for devices...');
    this.status.isScanning = true;
    
    return new Promise((resolve) => {
      setTimeout(() => {
        this.status.isScanning = false;
        console.log('[BLE] Found devices:', this.mockDevices);
        resolve(this.mockDevices);
      }, 1500);
    });
  }

  async connect(device: BleDevice): Promise<boolean> {
    console.log('[BLE] Connecting to:', device.name);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        this.status.isConnected = true;
        this.status.connectedDevice = device;
        console.log('[BLE] Connected to:', device.name);
        
        // Start telemetry streaming
        this.startTelemetryStream();
        
        resolve(true);
      }, 1000);
    });
  }

  async disconnect(): Promise<void> {
    console.log('[BLE] Disconnecting...');
    
    return new Promise((resolve) => {
      setTimeout(() => {
        this.status.isConnected = false;
        this.status.connectedDevice = null;
        console.log('[BLE] Disconnected');
        resolve();
      }, 500);
    });
  }

  async sendCommand(command: string): Promise<void> {
    if (!this.status.isConnected) {
      throw new Error('Not connected to any device');
    }
    
    console.log('[BLE] Sending command:', command);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('[BLE] Command sent successfully:', command);
        resolve();
      }, 500);
    });
  }

  getStatus(): BleStatus {
    return { ...this.status };
  }
}

export default new MockBleService();