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
        // Stop telemetry streaming
        this.stopTelemetryStream();
        
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

  /**
   * Subscribe to telemetry updates
   */
  onTelemetry(callback: TelemetryCallback): () => void {
    this.telemetryCallbacks.add(callback);
    console.log('[BLE] Telemetry subscriber added. Total:', this.telemetryCallbacks.size);
    
    // Return unsubscribe function
    return () => {
      this.telemetryCallbacks.delete(callback);
      console.log('[BLE] Telemetry subscriber removed. Total:', this.telemetryCallbacks.size);
    };
  }

  /**
   * Start streaming telemetry data (20Hz = 50ms interval)
   */
  private startTelemetryStream() {
    if (this.telemetryInterval) {
      return; // Already streaming
    }

    console.log('[BLE] Starting telemetry stream at 20Hz');
    this.telemetrySimulator.reset();

    this.telemetryInterval = setInterval(() => {
      if (!this.status.isConnected) {
        this.stopTelemetryStream();
        return;
      }

      const data = this.telemetrySimulator.generateSample();
      
      // Broadcast to all subscribers
      this.telemetryCallbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[BLE] Error in telemetry callback:', error);
        }
      });
    }, 50); // 20Hz update rate
  }

  /**
   * Stop telemetry streaming
   */
  private stopTelemetryStream() {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
      console.log('[BLE] Telemetry stream stopped');
    }
  }
}

export default new MockBleService();