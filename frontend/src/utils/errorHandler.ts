import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class ErrorHandler {
  // Firebase errors
  static readonly FIREBASE_ERRORS = {
    'auth/user-not-found': {
      code: 'AUTH_USER_NOT_FOUND',
      userMessage: 'Account not found. Please check your email or sign up.',
      severity: 'medium' as const,
    },
    'auth/wrong-password': {
      code: 'AUTH_WRONG_PASSWORD',
      userMessage: 'Incorrect password. Please try again.',
      severity: 'medium' as const,
    },
    'auth/network-request-failed': {
      code: 'NETWORK_ERROR',
      userMessage: 'Network error. Please check your internet connection and try again.',
      severity: 'high' as const,
    },
    'firestore/unavailable': {
      code: 'FIRESTORE_UNAVAILABLE',
      userMessage: 'Service temporarily unavailable. Your data is safe. Please try again in a moment.',
      severity: 'high' as const,
    },
    'storage/unauthorized': {
      code: 'STORAGE_UNAUTHORIZED',
      userMessage: 'Permission denied. Please log in again.',
      severity: 'high' as const,
    },
  };

  // BLE errors
  static readonly BLE_ERRORS = {
    CONNECTION_FAILED: {
      code: 'BLE_CONNECTION_FAILED',
      userMessage: 'Could not connect to ApexBox. Make sure it\'s powered on and nearby.',
      severity: 'medium' as const,
    },
    DEVICE_NOT_FOUND: {
      code: 'BLE_DEVICE_NOT_FOUND',
      userMessage: 'ApexBox not found. Check if Bluetooth is enabled.',
      severity: 'medium' as const,
    },
    DISCONNECTED: {
      code: 'BLE_DISCONNECTED',
      userMessage: 'ApexBox disconnected. Reconnecting...',
      severity: 'low' as const,
    },
    TIMEOUT: {
      code: 'BLE_TIMEOUT',
      userMessage: 'Connection timeout. Move closer to your ApexBox.',
      severity: 'medium' as const,
    },
  };

  // Storage errors
  static readonly STORAGE_ERRORS = {
    LOW_SPACE: {
      code: 'STORAGE_LOW_SPACE',
      userMessage: 'Low storage space. Consider deleting old sessions.',
      severity: 'high' as const,
    },
    FULL: {
      code: 'STORAGE_FULL',
      userMessage: 'Storage full. Please delete old sessions to continue.',
      severity: 'critical' as const,
    },
    READ_ERROR: {
      code: 'STORAGE_READ_ERROR',
      userMessage: 'Could not read session data. File may be corrupted.',
      severity: 'medium' as const,
    },
  };

  // Generic errors
  static readonly GENERIC_ERRORS = {
    UNKNOWN: {
      code: 'UNKNOWN_ERROR',
      userMessage: 'Something went wrong. Please try again.',
      severity: 'medium' as const,
    },
    NO_INTERNET: {
      code: 'NO_INTERNET',
      userMessage: 'No internet connection. Some features may be unavailable.',
      severity: 'medium' as const,
    },
  };

  /**
   * Handle error with user-friendly message and optional action
   */
  static async handle(error: any, action?: { label: string; onPress: () => void }): Promise<void> {
    console.error('[ErrorHandler] Handling error:', error);

    let appError: AppError;

    // Parse Firebase errors
    if (error?.code && this.FIREBASE_ERRORS[error.code as keyof typeof this.FIREBASE_ERRORS]) {
      const firebaseError = this.FIREBASE_ERRORS[error.code as keyof typeof this.FIREBASE_ERRORS];
      appError = {
        ...firebaseError,
        message: error.message,
        action,
      };
    }
    // Generic unknown error
    else {
      appError = {
        ...this.GENERIC_ERRORS.UNKNOWN,
        message: error?.message || 'Unknown error',
        action,
      };
    }

    // Haptic feedback based on severity
    if (appError.severity === 'critical' || appError.severity === 'high') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    // Show alert
    this.showAlert(appError);
  }

  /**
   * Handle BLE specific errors
   */
  static handleBleError(errorType: keyof typeof this.BLE_ERRORS, action?: { label: string; onPress: () => void }): void {
    const bleError = this.BLE_ERRORS[errorType];
    const appError: AppError = {
      ...bleError,
      message: bleError.userMessage,
      action,
    };

    if (appError.severity !== 'low') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    this.showAlert(appError);
  }

  /**
   * Handle storage errors
   */
  static handleStorageError(errorType: keyof typeof this.STORAGE_ERRORS, action?: { label: string; onPress: () => void }): void {
    const storageError = this.STORAGE_ERRORS[errorType];
    const appError: AppError = {
      ...storageError,
      message: storageError.userMessage,
      action,
    };

    if (appError.severity === 'critical') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    this.showAlert(appError);
  }

  /**
   * Show alert dialog
   */
  private static showAlert(error: AppError): void {
    const buttons: any[] = [];

    if (error.action) {
      buttons.push({
        text: error.action.label,
        onPress: error.action.onPress,
      });
    }

    buttons.push({
      text: 'OK',
      style: 'cancel',
    });

    Alert.alert(
      this.getSeverityTitle(error.severity),
      error.userMessage,
      buttons
    );
  }

  /**
   * Get alert title based on severity
   */
  private static getSeverityTitle(severity: AppError['severity']): string {
    switch (severity) {
      case 'critical':
        return '🚨 Critical Error';
      case 'high':
        return '⚠️ Error';
      case 'medium':
        return '⚠️ Warning';
      case 'low':
        return 'Notice';
      default:
        return 'Error';
    }
  }

  /**
   * Log error for analytics/monitoring
   */
  static log(error: any, context?: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${context || 'Error'}: ${error?.message || error}`;
    console.error(logMessage);
    
    // TODO: Send to analytics service (Firebase Analytics, Sentry, etc.)
    // Analytics.logEvent('app_error', {
    //   error_code: error?.code,
    //   error_message: error?.message,
    //   context,
    //   timestamp,
    // });
  }

  /**
   * Show success message
   */
  static async success(message: string, action?: { label: string; onPress: () => void }): Promise<void> {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const buttons: any[] = [];
    if (action) {
      buttons.push({
        text: action.label,
        onPress: action.onPress,
      });
    }
    buttons.push({ text: 'OK', style: 'cancel' });

    Alert.alert('✅ Success', message, buttons);
  }

  /**
   * Show info message
   */
  static info(title: string, message: string, action?: { label: string; onPress: () => void }): void {
    const buttons: any[] = [];
    if (action) {
      buttons.push({
        text: action.label,
        onPress: action.onPress,
      });
    }
    buttons.push({ text: 'OK', style: 'cancel' });

    Alert.alert(`ℹ️ ${title}`, message, buttons);
  }
}

export default ErrorHandler;
