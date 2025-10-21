import React from 'react';
import { Stack } from 'expo-router';
import { BleProvider } from '../src/contexts/BleContext';
import { SettingsProvider } from '../src/contexts/SettingsContext';
import { LogsProvider } from '../src/contexts/LogsContext';
import OnboardingModal from '../src/components/OnboardingModal';

export default function RootLayout() {
  return (
    <SettingsProvider>
      <BleProvider>
        <LogsProvider>
          <OnboardingModal />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="session-detail" options={{ headerShown: false }} />
          </Stack>
        </LogsProvider>
      </BleProvider>
    </SettingsProvider>
  );
}