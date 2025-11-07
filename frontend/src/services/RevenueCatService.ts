import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Optional import - only works with custom dev client, not Expo Go
let Purchases: any = null;
let PURCHASES_ERROR_CODE: any = null;

try {
  const purchasesModule = require('react-native-purchases');
  Purchases = purchasesModule.default;
  PURCHASES_ERROR_CODE = purchasesModule.PURCHASES_ERROR_CODE;
} catch (error) {
  console.log('[RevenueCat] Module not available in Expo Go - purchases will be mocked');
}

export type PurchasesOffering = any;
export type PurchasesPackage = any;
export type CustomerInfo = any;
export type PurchasesError = any;

// RevenueCat API Key from environment variables
const REVENUECAT_API_KEY = 
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || 
  Constants.expoConfig?.extra?.revenuecatApiKey ||
  '';

// Product Identifier (matches your RevenueCat setup)
export const PREMIUM_PRODUCT_ID = 'premium_lifetime';

// Entitlement Identifier (YOUR ACTUAL ENTITLEMENT)
export const PREMIUM_ENTITLEMENT_ID = 'premium'; // Your entitlement identifier

export interface PremiumStatus {
  isPremium: boolean;
  expirationDate?: string;
  productIdentifier?: string;
}

class RevenueCatService {
  private initialized: boolean = false;

  /**
   * Initialize RevenueCat SDK
   * Call this once at app startup
   */
  async initialize(userId?: string): Promise<void> {
    try {
      if (this.initialized) {
        console.log('[RevenueCat] Already initialized');
        return;
      }

      if (!Purchases) {
        console.log('[RevenueCat] SDK not available (Expo Go) - using mock mode');
        this.initialized = true;
        return;
      }

      console.log('[RevenueCat] Initializing SDK...');
      
      Purchases.configure({ apiKey: REVENUECAT_API_KEY });
      
      // Set user ID if provided (for cross-platform purchases)
      if (userId) {
        await Purchases.logIn(userId);
        console.log('[RevenueCat] User logged in:', userId);
      }

      this.initialized = true;
      console.log('[RevenueCat] SDK initialized successfully');
    } catch (error) {
      console.error('[RevenueCat] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Get available offerings (products/packages)
   */
  async getOfferings(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current !== null) {
        console.log('[RevenueCat] Current offering:', offerings.current.identifier);
        console.log('[RevenueCat] Available packages:', offerings.current.availablePackages.length);
        return offerings.current;
      } else {
        console.log('[RevenueCat] No current offering available');
        return null;
      }
    } catch (error) {
      console.error('[RevenueCat] Error fetching offerings:', error);
      return null;
    }
  }

  /**
   * Purchase a package
   */
  async purchasePackage(pkg: PurchasesPackage): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
    try {
      console.log('[RevenueCat] Initiating purchase:', pkg.identifier);
      
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      
      console.log('[RevenueCat] Purchase successful');
      console.log('[RevenueCat] Active entitlements:', Object.keys(customerInfo.entitlements.active));
      
      return { success: true, customerInfo };
    } catch (error: any) {
      const purchasesError = error as PurchasesError;
      
      if (purchasesError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        console.log('[RevenueCat] Purchase cancelled by user');
        return { success: false, error: 'Purchase cancelled' };
      } else if (purchasesError.code === PURCHASES_ERROR_CODE.PURCHASE_INVALID_ERROR) {
        console.error('[RevenueCat] Purchase invalid');
        return { success: false, error: 'Invalid purchase' };
      } else {
        console.error('[RevenueCat] Purchase error:', purchasesError.message);
        return { success: false, error: purchasesError.message || 'Purchase failed' };
      }
    }
  }

  /**
   * Restore purchases
   */
  async restorePurchases(): Promise<{ success: boolean; customerInfo?: CustomerInfo }> {
    try {
      console.log('[RevenueCat] Restoring purchases...');
      
      const customerInfo = await Purchases.restorePurchases();
      
      const activePurchases = Object.keys(customerInfo.entitlements.active);
      console.log('[RevenueCat] Restored purchases:', activePurchases.length);
      
      return { success: true, customerInfo };
    } catch (error) {
      console.error('[RevenueCat] Restore error:', error);
      return { success: false };
    }
  }

  /**
   * Check if user has premium access
   */
  async checkPremiumStatus(): Promise<PremiumStatus> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      
      // Check if user has the "premium" entitlement (YOUR ACTUAL ENTITLEMENT)
      const premiumEntitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];
      
      if (premiumEntitlement) {
        return {
          isPremium: true,
          expirationDate: premiumEntitlement.expirationDate || undefined,
          productIdentifier: premiumEntitlement.productIdentifier,
        };
      } else {
        return { isPremium: false };
      }
    } catch (error) {
      console.error('[RevenueCat] Error checking premium status:', error);
      return { isPremium: false };
    }
  }

  /**
   * Get customer info
   */
  async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      return await Purchases.getCustomerInfo();
    } catch (error) {
      console.error('[RevenueCat] Error getting customer info:', error);
      return null;
    }
  }

  /**
   * Log in a user (for cross-platform purchases)
   */
  async login(userId: string): Promise<void> {
    try {
      await Purchases.logIn(userId);
      console.log('[RevenueCat] User logged in:', userId);
    } catch (error) {
      console.error('[RevenueCat] Login error:', error);
      throw error;
    }
  }

  /**
   * Log out current user
   */
  async logout(): Promise<void> {
    try {
      await Purchases.logOut();
      console.log('[RevenueCat] User logged out');
    } catch (error) {
      console.error('[RevenueCat] Logout error:', error);
      throw error;
    }
  }

  /**
   * Set user attributes (for analytics and targeting)
   */
  async setUserAttributes(attributes: { [key: string]: string | null }): Promise<void> {
    try {
      await Purchases.setAttributes(attributes);
      console.log('[RevenueCat] User attributes set');
    } catch (error) {
      console.error('[RevenueCat] Error setting attributes:', error);
    }
  }
}

export default new RevenueCatService();
