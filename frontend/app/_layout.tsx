import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { BleProvider } from '../src/contexts/BleContext';
import { SettingsProvider } from '../src/contexts/SettingsContext';
import { LogsProvider } from '../src/contexts/LogsContext';
import OnboardingModal from '../src/components/OnboardingModal';
import { COLORS, FONT_SIZE } from '../src/constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth();
  const { colors, getCurrentAccent } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (initializing || isNavigating) return;

    const inAuthGroup = segments[0] === '(auth)' || 
                        segments[0] === 'login' || 
                        segments[0] === 'signup' || 
                        segments[0] === 'forgot-password';

    if (!user && !inAuthGroup) {
      // Not logged in, redirect to login
      setIsNavigating(true);
      router.replace('/login');
      setTimeout(() => setIsNavigating(false), 100);
    } else if (user && inAuthGroup) {
      // Logged in, redirect to dashboard
      setIsNavigating(true);
      router.replace('/(tabs)');
      setTimeout(() => setIsNavigating(false), 100);
    }
  }, [user, initializing, segments, isNavigating]);

  if (initializing) {
    const accentColor = getCurrentAccent();
    return (
      <View style={[styles.splashContainer, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="car-sports" size={80} color={accentColor} />
        <Text style={[styles.splashTitle, { color: colors.text }]}>ApexBox</Text>
        <Text style={[styles.splashSubtitle, { color: colors.textSecondary }]}>COMPANION</Text>
        <ActivityIndicator size="large" color={accentColor} style={styles.loader} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <BleProvider>
            <LogsProvider>
              <AuthWrapper>
                <OnboardingModal />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="login" options={{ headerShown: false }} />
                  <Stack.Screen name="signup" options={{ headerShown: false }} />
                  <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
                  <Stack.Screen name="premium" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="logs/[date]/[file]" options={{ headerShown: false }} />
                </Stack>
              </AuthWrapper>
            </LogsProvider>
          </BleProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    marginTop: 20,
    letterSpacing: 4,
  },
  splashSubtitle: {
    fontSize: FONT_SIZE.sm,
    letterSpacing: 6,
    marginTop: 8,
  },
  loader: {
    marginTop: 40,
  },
});