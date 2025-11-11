import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import LocationService from '../services/LocationService';

export interface LocationState {
  location: Location.LocationObject | null;
  hasPermission: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    location: null,
    hasPermission: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const hasPermission = await LocationService.hasPermissions();
      setState(prev => ({
        ...prev,
        hasPermission,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to check permissions',
        isLoading: false,
      }));
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    const granted = await LocationService.requestPermissions();
    
    setState(prev => ({
      ...prev,
      hasPermission: granted,
      isLoading: false,
      error: granted ? null : 'Location permission denied',
    }));

    return granted;
  };

  const getCurrentLocation = async (): Promise<Location.LocationObject | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    const location = await LocationService.getCurrentLocation();
    
    setState(prev => ({
      ...prev,
      location,
      isLoading: false,
      error: location ? null : 'Failed to get location',
    }));

    return location;
  };

  return {
    ...state,
    requestPermissions,
    getCurrentLocation,
    checkPermissions,
  };
}