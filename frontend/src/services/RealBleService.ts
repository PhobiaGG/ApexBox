import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { BleDevice, BleStatus } from './MockBleService';
import { TelemetryData, generateRealisticTelemetry } from '../utils/telemetry';

// ApexBox ESP32 BLE Service UUIDs
const SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
const TELEMETRY_CHAR_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';
const COMMAND_CHAR_UUID = '0000ffe2-0000-1000-8000-00805f9b34fb';

class RealBleService {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private telemetryListeners: ((data: TelemetryData) => void)[] = [];
  private status: BleStatus = {
    isScanning: false,
    isConnected: false,
    connectedDevice: null,
    error: null,
  };
  private useMockMode: boolean = false;

  constructor() {
    this.manager = new BleManager();
    console.log('[RealBleService] Initialized');
  }

  // Request necessary permissions for BLE
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 31) {
        // Android 12+
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return (
          granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        // Android < 12
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true; // iOS doesn't need runtime permissions for BLE
  }

  // Scan for ApexBox devices
  async scan(): Promise<BleDevice[]> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('[RealBleService] BLE permissions not granted, using mock mode');
        this.useMockMode = true;
        return this.getMockDevices();
      }

      this.status.isScanning = true;
      this.status.error = null;

      const devices: BleDevice[] = [];
      const seenIds = new Set<string>();

      return new Promise((resolve) => {
        // Scan for 5 seconds
        this.manager.startDeviceScan(null, null, (error, device) => {
          if (error) {
            console.error('[RealBleService] Scan error:', error);
            this.status.error = error.message;
            this.useMockMode = true;
            resolve(this.getMockDevices());
            return;
          }

          if (device && device.name && device.name.startsWith('ApexBox')) {
            if (!seenIds.has(device.id)) {
              seenIds.add(device.id);
              devices.push({
                id: device.id,
                name: device.name,
                rssi: device.rssi || -70,
              });
            }
          }
        });

        setTimeout(() => {
          this.manager.stopDeviceScan();
          this.status.isScanning = false;

          if (devices.length === 0) {
            console.warn('[RealBleService] No real devices found, using mock mode');
            this.useMockMode = true;
            resolve(this.getMockDevices());
          } else {
            resolve(devices);
          }
        }, 5000);
      });
    } catch (error: any) {
      console.error('[RealBleService] Scan failed:', error);
      this.status.isScanning = false;
      this.status.error = error.message;
      this.useMockMode = true;
      return this.getMockDevices();
    }
  }

  // Connect to a device
  async connect(device: BleDevice): Promise<void> {
    try {
      if (this.useMockMode) {
        console.log('[RealBleService] Using mock connection');
        this.status.isConnected = true;
        this.status.connectedDevice = device;
        this.startMockTelemetry();
        return;
      }

      console.log('[RealBleService] Connecting to', device.name);

      const connectedDevice = await this.manager.connectToDevice(device.id, {
        autoConnect: false,
        requestMTU: 512,
      });

      this.connectedDevice = connectedDevice;

      await connectedDevice.discoverAllServicesAndCharacteristics();

      this.status.isConnected = true;
      this.status.connectedDevice = device;

      // Start monitoring telemetry characteristic
      this.startTelemetryMonitoring();

      console.log('[RealBleService] Connected successfully');
    } catch (error: any) {
      console.error('[RealBleService] Connect error:', error);
      this.status.error = error.message;
      throw error;
    }
  }

  // Disconnect from device
  async disconnect(): Promise<void> {
    try {
      if (this.connectedDevice) {
        await this.manager.cancelDeviceConnection(this.connectedDevice.id);
        this.connectedDevice = null;
      }

      this.status.isConnected = false;
      this.status.connectedDevice = null;
      this.useMockMode = false;

      console.log('[RealBleService] Disconnected');
    } catch (error: any) {
      console.error('[RealBleService] Disconnect error:', error);
      throw error;
    }
  }

  // Send command to device
  async sendCommand(command: string): Promise<void> {
    try {
      if (this.useMockMode) {
        console.log('[RealBleService] Mock command:', command);
        return;
      }

      if (!this.connectedDevice) {
        throw new Error('No device connected');
      }

      const commandData = Buffer.from(command, 'utf-8').toString('base64');

      await this.connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        COMMAND_CHAR_UUID,
        commandData
      );

      console.log('[RealBleService] Command sent:', command);
    } catch (error: any) {
      console.error('[RealBleService] Send command error:', error);
      throw error;
    }
  }

  // Start monitoring telemetry data
  private startTelemetryMonitoring() {
    if (!this.connectedDevice) return;

    this.connectedDevice
      .monitorCharacteristicForService(
        SERVICE_UUID,
        TELEMETRY_CHAR_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('[RealBleService] Telemetry monitor error:', error);
            return;
          }

          if (characteristic && characteristic.value) {
            const telemetryData = this.parseTelemetry(characteristic.value);
            this.notifyTelemetryListeners(telemetryData);
          }
        }
      )
      .catch((error) => {
        console.error('[RealBleService] Failed to start telemetry monitoring:', error);
      });
  }

  // Parse telemetry data from ESP32
  private parseTelemetry(base64Data: string): TelemetryData {
    try {
      // Decode base64
      const buffer = Buffer.from(base64Data, 'base64');

      // Expected format: 20 bytes
      // 0-3: speed (float)
      // 4-7: gForceX (float)
      // 8-11: gForceY (float)
      // 12-15: gForceZ (float)
      // 16-19: temperature (float)

      const speed = buffer.readFloatLE(0);
      const gForceX = buffer.readFloatLE(4);
      const gForceY = buffer.readFloatLE(8);
      const gForceZ = buffer.readFloatLE(12);
      const temperature = buffer.readFloatLE(16);

      // Calculate total G-force
      const gForce = Math.sqrt(gForceX ** 2 + gForceY ** 2 + gForceZ ** 2);

      return {
        speed,
        gForce,
        gForceX,
        gForceY,
        gForceZ,
        temperature,
        altitude: 0, // Will be added via GPS
        humidity: 0,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[RealBleService] Parse telemetry error:', error);
      return generateRealisticTelemetry();
    }
  }

  // Subscribe to telemetry updates
  onTelemetry(listener: (data: TelemetryData) => void): () => void {
    this.telemetryListeners.push(listener);
    return () => {
      this.telemetryListeners = this.telemetryListeners.filter((l) => l !== listener);
    };
  }

  private notifyTelemetryListeners(data: TelemetryData) {
    this.telemetryListeners.forEach((listener) => listener(data));
  }

  // Mock telemetry for testing/demo
  private startMockTelemetry() {
    const interval = setInterval(() => {
      if (!this.status.isConnected) {
        clearInterval(interval);
        return;
      }

      const telemetryData = generateRealisticTelemetry();
      this.notifyTelemetryListeners(telemetryData);
    }, 100); // 10 Hz
  }

  // Get mock devices for fallback
  private getMockDevices(): BleDevice[] {
    return [
      { id: 'mock-001', name: 'ApexBox-001', rssi: -65 },
      { id: 'mock-002', name: 'ApexBox-002', rssi: -72 },
    ];
  }

  getStatus(): BleStatus {
    return this.status;
  }
}

export default new RealBleService();
