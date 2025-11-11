import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';

const REVENUECAT_API_KEY = {
  android: 'goog_KSuWlCmfVxIvodAXHSoXioOVCwJ',
  ios: 'your-ios-key-here', // Add your iOS key when ready
};

export const initRevenueCat = async () => {
  try {
    if (Platform.OS === 'android') {
      await Purchases.configure({ apiKey: REVENUECAT_API_KEY.android });
    } else if (Platform.OS === 'ios') {
      await Purchases.configure({ apiKey: REVENUECAT_API_KEY.ios });
    }
    console.log('RevenueCat initialized successfully');
  } catch (error) {
    console.error('Error initializing RevenueCat:', error);
  }
};