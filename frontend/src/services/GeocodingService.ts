import * as Location from 'expo-location';
import LocationService from './LocationService';

interface RoadInfo {
  roadName: string;
  city: string;
  state: string;
  country: string;
  formattedAddress: string;
}

class GeocodingService {
  private cache: Map<string, RoadInfo> = new Map();
  private readonly CACHE_KEY_PRECISION = 4;

  private getCacheKey(latitude: number, longitude: number): string {
    const lat = latitude.toFixed(this.CACHE_KEY_PRECISION);
    const lon = longitude.toFixed(this.CACHE_KEY_PRECISION);
    return `${lat},${lon}`;
  }

  async getRoadInfo(latitude: number, longitude: number): Promise<RoadInfo | null> {
    try {
      // Check permissions first
      const hasPermission = await LocationService.hasPermissions();
      if (!hasPermission) {
        console.warn('[GeocodingService] No location permission');
        return null;
      }

      // Check cache first
      const cacheKey = this.getCacheKey(latitude, longitude);
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!;
      }

      // Perform reverse geocoding
      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (results && results.length > 0) {
        const location = results[0];
        
        const roadInfo: RoadInfo = {
          roadName: location.street || location.name || 'Unknown Road',
          city: location.city || location.subregion || '',
          state: location.region || '',
          country: location.country || '',
          formattedAddress: this.formatAddress(location),
        };

        // Cache the result
        this.cache.set(cacheKey, roadInfo);

        // Limit cache size to 100 entries
        if (this.cache.size > 100) {
          const firstKey = this.cache.keys().next().value;
          if (firstKey !== undefined) {
            this.cache.delete(firstKey);
          }
        }

        return roadInfo;
      }

      return null;
    } catch (error) {
      console.error('[GeocodingService] Error:', error);
      return null;
    }
  }

  private formatAddress(location: Location.LocationGeocodedAddress): string {
    const parts: string[] = [];
    
    if (location.street) parts.push(location.street);
    if (location.city) parts.push(location.city);
    if (location.region) parts.push(location.region);
    
    return parts.join(', ') || 'Unknown Location';
  }

  async getRoadName(latitude: number, longitude: number): Promise<string> {
    const info = await this.getRoadInfo(latitude, longitude);
    return info?.roadName || 'Unknown Road';
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export default new GeocodingService();