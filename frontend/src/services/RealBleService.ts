// src/services/RealBleService.ts
import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';

// ApexBox BLE Service UUIDs
const APEXBOX_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const TELEMETRY_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

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

// Telemetry data from ESP32
export interface TelemetryData {
  speed: number;           // GPS speed in MPH
  rpm: number;             // Engine RPM from OBD
  obdSpeed: number;        // Speed from OBD in KPH
  temperature: number;     // Temperature in Celsius (renamed from temp)
  humidity: number;
  pressure: number;        // Pressure in hPa
  altitude: number;        // Altitude in feet
  heading: number;         // Compass heading
  pitch: number;
  roll: number;
  lux: number;
  gas: number;
  satellites: number;
  latitude: number;        // GPS lat (renamed from lat)
  longitude: number;       // GPS lon (renamed from lon)
  obdConnected: boolean;
  gForce: number;          // Calculated from acceleration
}

export type TelemetryCallback = (data: TelemetryData) => void;

class RealBleService {
  private manager: BleManager;
  private device: Device | null = null;
  private characteristic: Characteristic | null = null;
  private telemetryCallbacks: Set<TelemetryCallback> = new Set();
  private status: BleStatus = {
    isScanning: false,
    isConnected: false,
    connectedDevice: null,
    error: null,
  };

  constructor() {
    this.manager = new BleManager();
    console.log('[RealBleService] Initialized');
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android' && Platform.Version >= 31) {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const allGranted = Object.values(granted).every(
          (status) => status === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          console.log('[RealBleService] Not all permissions granted');
          return false;
        }
      } catch (err) {
        console.error('[RealBleService] Permission error:', err);
        return false;
      }
    }
    return true;
  }

  async scan(): Promise<BleDevice[]> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.log('[RealBleService] Permissions not granted');
      return [];
    }

    return new Promise((resolve) => {
      const foundDevices: BleDevice[] = [];
      this.status.isScanning = true;
      this.status.error = null;

      console.log('[RealBleService] Starting scan...');

      this.manager.startDeviceScan(
        [APEXBOX_SERVICE_UUID],
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            console.error('[RealBleService] Scan error:', error);
            this.status.error = error.message;
            this.status.isScanning = false;
            return;
          }

          if (device && device.name && device.name.includes('ApexBox')) {
            console.log('[RealBleService] Found:', device.name, device.rssi);
            
            const rssi = device.rssi || -100;
            let signal: 'excellent' | 'good' | 'fair' | 'weak' = 'weak';
            if (rssi > -60) signal = 'excellent';
            else if (rssi > -70) signal = 'good';
            else if (rssi > -80) signal = 'fair';

            const bleDevice: BleDevice = {
              id: device.id,
              name: device.name,
              signal,
              rssi,
            };

            // Add if not already in list
            if (!foundDevices.find(d => d.id === device.id)) {
              foundDevices.push(bleDevice);
            }
          }
        }
      );

      // Stop after 10 seconds
      setTimeout(() => {
        this.manager.stopDeviceScan();
        this.status.isScanning = false;
        console.log('[RealBleService] Scan complete. Found:', foundDevices.length);
        resolve(foundDevices);
      }, 10000);
    });
  }

  async connect(device: BleDevice): Promise<boolean> {
    try {
      console.log('[RealBleService] Connecting to:', device.name);
      this.status.error = null;

      // Stop scanning
      if (this.status.isScanning) {
        this.manager.stopDeviceScan();
        this.status.isScanning = false;
      }

      // Connect
      this.device = await this.manager.connectToDevice(device.id);
      console.log('[RealBleService] Connected');

      // Discover services
      await this.device.discoverAllServicesAndCharacteristics();
      console.log('[RealBleService] Services discovered');

      // Get characteristic
      const services = await this.device.services();
      const apexBoxService = services.find(
        s => s.uuid.toLowerCase() === APEXBOX_SERVICE_UUID.toLowerCase()
      );

      if (!apexBoxService) {
        console.error('[RealBleService] Service not found');
        this.status.error = 'ApexBox service not found';
        return false;
      }

      const characteristics = await apexBoxService.characteristics();
      this.characteristic = characteristics.find(
        c => c.uuid.toLowerCase() === TELEMETRY_CHAR_UUID.toLowerCase()
      ) || null;

      if (!this.characteristic) {
        console.error('[RealBleService] Characteristic not found');
        this.status.error = 'Telemetry characteristic not found';
        return false;
      }

      console.log('[RealBleService] Characteristic found');

      // Subscribe to notifications
      await this.subscribeToTelemetry();

      // Update status
      this.status.isConnected = true;
      this.status.connectedDevice = device;

      // Setup disconnect handler
      this.device.onDisconnected((error, device) => {
        console.log('[RealBleService] Disconnected:', device?.id);
        if (error) {
          console.error('[RealBleService] Disconnect error:', error);
        }
        this.device = null;
        this.characteristic = null;
        this.status.isConnected = false;
        this.status.connectedDevice = null;
      });

      return true;
    } catch (error: any) {
      console.error('[RealBleService] Connection error:', error);
      this.status.error = error.message || 'Connection failed';
      this.status.isConnected = false;
      this.status.connectedDevice = null;
      return false;
    }
  }

  private async subscribeToTelemetry() {
    if (!this.characteristic) return;

    console.log('[RealBleService] Subscribing to telemetry...');

    this.characteristic.monitor((error, characteristic) => {
      if (error) {
        console.error('[RealBleService] Monitor error:', error);
        return;
      }

      if (characteristic?.value) {
        try {
          const rawData = atob(characteristic.value);
          const jsonData = JSON.parse(rawData);
          
          // Map ESP32 data to TelemetryData format
          const telemetry: TelemetryData = {
            speed: jsonData.speed || 0,
            rpm: jsonData.rpm || 0,
            obdSpeed: jsonData.obdSpeed || 0,
            temperature: jsonData.temp || 0,
            humidity: jsonData.humidity || 0,
            pressure: jsonData.pressure || 0,
            altitude: jsonData.altitude || 0,
            heading: jsonData.heading || 0,
            pitch: jsonData.pitch || 0,
            roll: jsonData.roll || 0,
            lux: jsonData.lux || 0,
            gas: jsonData.gas || 0,
            satellites: jsonData.satellites || 0,
            latitude: jsonData.lat || 0,
            longitude: jsonData.lon || 0,
            obdConnected: jsonData.obdConnected || false,
            gForce: 0, // Calculate from acceleration if needed
          };

          // Broadcast to all subscribers
          this.telemetryCallbacks.forEach(callback => {
            try {
              callback(telemetry);
            } catch (err) {
              console.error('[RealBleService] Callback error:', err);
            }
          });
        } catch (parseError) {
          console.error('[RealBleService] Parse error:', parseError);
        }
      }
    });
  }

  async disconnect() {
    if (this.device) {
      try {
        console.log('[RealBleService] Disconnecting...');
        await this.manager.cancelDeviceConnection(this.device.id);
        this.device = null;
        this.characteristic = null;
        this.status.isConnected = false;
        this.status.connectedDevice = null;
      } catch (error) {
        console.error('[RealBleService] Disconnect error:', error);
      }
    }
  }

  async sendCommand(command: string): Promise<void> {
    if (!this.status.isConnected) {
      throw new Error('Not connected to any device');
    }
    
    console.log('[RealBleService] Command sent (mock):', command);
    // ESP32 doesn't have command support yet - just simulate
    return Promise.resolve();
  }

  getStatus(): BleStatus {
    return { ...this.status };
  }

  onTelemetry(callback: TelemetryCallback): () => void {
    this.telemetryCallbacks.add(callback);
    console.log('[RealBleService] Subscriber added. Total:', this.telemetryCallbacks.size);

    return () => {
      this.telemetryCallbacks.delete(callback);
      console.log('[RealBleService] Subscriber removed');
    };
  }

  destroy() {
    this.disconnect();
    this.manager.destroy();
  }
}

export default new RealBleService();