import * as Location from 'expo-location';

export interface GPSCoordinate {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
  timestamp: number;
}

class GpsService {
  private locationSubscription: Location.LocationSubscription | null = null;
  private isTracking: boolean = false;
  private coordinates: GPSCoordinate[] = [];
  private listeners: ((coordinate: GPSCoordinate) => void)[] = [];

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        console.error('[GPS] Foreground permission denied');
        return false;
      }

      console.log('[GPS] Permissions granted');
      return true;
    } catch (error) {
      console.error('[GPS] Permission request error:', error);
      return false;
    }
  }

  /**
   * Check if location services are enabled
   */
  async isLocationEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('[GPS] Error checking location services:', error);
      return false;
    }
  }

  /**
   * Start tracking GPS coordinates
   */
  async startTracking(): Promise<boolean> {
    if (this.isTracking) {
      console.warn('[GPS] Already tracking');
      return true;
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permission not granted');
      }

      const isEnabled = await this.isLocationEnabled();
      if (!isEnabled) {
        throw new Error('Location services are disabled');
      }

      // Clear previous coordinates
      this.coordinates = [];

      // Start watching location with high accuracy
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // Update every 1 second
          distanceInterval: 1, // Update every 1 meter
        },
        (location) => {
          const coordinate: GPSCoordinate = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            altitude: location.coords.altitude,
            accuracy: location.coords.accuracy,
            speed: location.coords.speed,
            timestamp: location.timestamp,
          };

          this.coordinates.push(coordinate);
          
          // Notify listeners
          this.listeners.forEach(listener => listener(coordinate));
          
          console.log('[GPS] Coordinate captured:', {
            lat: coordinate.latitude.toFixed(6),
            lon: coordinate.longitude.toFixed(6),
            speed: coordinate.speed?.toFixed(1),
          });
        }
      );

      this.isTracking = true;
      console.log('[GPS] Tracking started');
      return true;
    } catch (error) {
      console.error('[GPS] Failed to start tracking:', error);
      return false;
    }
  }

  /**
   * Stop tracking GPS coordinates
   */
  stopTracking(): GPSCoordinate[] {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    this.isTracking = false;
    console.log(`[GPS] Tracking stopped. Captured ${this.coordinates.length} coordinates`);
    
    const capturedCoordinates = [...this.coordinates];
    this.coordinates = [];
    
    return capturedCoordinates;
  }

  /**
   * Get current coordinates
   */
  getCoordinates(): GPSCoordinate[] {
    return [...this.coordinates];
  }

  /**
   * Subscribe to GPS updates
   */
  onCoordinateUpdate(listener: (coordinate: GPSCoordinate) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get tracking status
   */
  isTrackingActive(): boolean {
    return this.isTracking;
  }

  /**
   * Clear all coordinates
   */
  clearCoordinates(): void {
    this.coordinates = [];
  }
}

export default new GpsService();
