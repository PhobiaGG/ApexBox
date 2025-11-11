import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';

class LocationService {
  private isTracking: boolean = false;
  private locationSubscription: Location.LocationSubscription | null = null;

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      console.log('[LocationService] Requesting permissions...');

      // Request foreground permissions first
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'ApexBox needs location access to track your driving sessions and display GPS data.',
          [{ text: 'OK' }]
        );
        return false;
      }

      console.log('[LocationService] Foreground permission granted');

      // For Android, optionally request background permission
      if (Platform.OS === 'android') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.log('[LocationService] Background permission not granted');
          // This is OK - we can still track in foreground
        } else {
          console.log('[LocationService] Background permission granted');
        }
      }

      return true;
    } catch (error) {
      console.error('[LocationService] Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Check if permissions are already granted
   */
  async hasPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('[LocationService] Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Get current location (one-time)
   */
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) return null;
      }

      console.log('[LocationService] Getting current location...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      console.log('[LocationService] Current location:', location.coords.latitude, location.coords.longitude);
      return location;
    } catch (error) {
      console.error('[LocationService] Error getting current location:', error);
      return null;
    }
  }

  /**
   * Start tracking location (continuous)
   */
  async startTracking(
    callback: (location: Location.LocationObject) => void
  ): Promise<boolean> {
    try {
      if (this.isTracking) {
        console.log('[LocationService] Already tracking');
        return true;
      }

      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) return false;
      }

      console.log('[LocationService] Starting location tracking...');

      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // Update every second
          distanceInterval: 5, // Or every 5 meters
        },
        (location) => {
          callback(location);
        }
      );

      this.isTracking = true;
      console.log('[LocationService] Location tracking started');
      return true;
    } catch (error) {
      console.error('[LocationService] Error starting tracking:', error);
      return false;
    }
  }

  /**
   * Stop tracking location
   */
  async stopTracking(): Promise<void> {
    try {
      if (!this.isTracking) {
        console.log('[LocationService] Not tracking');
        return;
      }

      console.log('[LocationService] Stopping location tracking...');
      
      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }

      this.isTracking = false;
      console.log('[LocationService] Location tracking stopped');
    } catch (error) {
      console.error('[LocationService] Error stopping tracking:', error);
    }
  }

  /**
   * Check if currently tracking
   */
  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Get location permission status
   */
  async getPermissionStatus(): Promise<Location.PermissionStatus> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status;
    } catch (error) {
      console.error('[LocationService] Error getting permission status:', error);
      return Location.PermissionStatus.UNDETERMINED;
    }
  }
}

export default new LocationService();