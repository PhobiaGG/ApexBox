import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBle } from '../contexts/BleContext';
import { useLogs } from '../contexts/LogsContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Gauge from '../components/Gauge';
import MetricCard from '../components/MetricCard';
import ChartView from '../components/ChartView';
import BleConnectionModal from '../components/BleConnectionModal';
import GpsService from '../services/GpsService';
import LogService from '../services/LogService';
import { formatTemp, formatAltitude } from '../utils/format';
import { calculateStats } from '../utils/csv';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OfflineBanner from '../components/OfflineBanner';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const router = useRouter();
  const { status, connect, disconnect, devices, sendCommand, telemetry } = useBle();
  const { latestSession, isLoading, rescan } = useLogs();
  const { settings } = useSettings();
  const { colors, getCurrentAccent } = useTheme();
  const { getActiveCar, profile, user } = useAuth();
  const { isConnected } = useNetworkStatus();
  const accentColor = getCurrentAccent();
  const activeCar = getActiveCar();
  
  const [currentSpeed, setCurrentSpeed] = useState(40);        // ✅ Default to 40 instead of 0
  const [currentGForce, setCurrentGForce] = useState(0.5);     // ✅ Default to 0.5 instead of 0
  const [currentTemp, setCurrentTemp] = useState(70);          // ✅ Default to 70 instead of 65
  const [currentAltitude, setCurrentAltitude] = useState(500); // ✅ Default to 500 instead of 350
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showBleModal, setShowBleModal] = useState(false);
  const [isTrackingGPS, setIsTrackingGPS] = useState(false);
  const [gpsCoordinateCount, setGpsCoordinateCount] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // Update GPS coordinate count in real-time
  useEffect(() => {
    if (isTrackingGPS) {
      const unsubscribe = GpsService.onCoordinateUpdate(() => {
        const coords = GpsService.getCoordinates();
        setGpsCoordinateCount(coords.length);
      });
      return unsubscribe;
    }
  }, [isTrackingGPS]);

  // Handle Start Analysis with GPS tracking
  const handleStartAnalysis = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      console.log('[Dashboard] Checking location permissions...');
      
      // Check permission status first
      const { status: permissionStatus, canAskAgain } = await Location.getForegroundPermissionsAsync();
      
      console.log(`[Dashboard] Permission status: ${permissionStatus}, canAskAgain: ${canAskAgain}`);
      
      // Check if we've already shown the explanation
      const hasSeenExplanation = await AsyncStorage.getItem('location_permission_explained');
      
      // If permission not granted
      if (permissionStatus !== 'granted') {
        // Only show explanation dialog if it's the first time (undetermined status)
        // or if user hasn't seen the explanation yet
        if (permissionStatus === 'undetermined' && !hasSeenExplanation) {
          console.log('[Dashboard] First time requesting permission, showing explanation');
          Alert.alert(
            '📍 Location Permission Required',
            'ApexBox needs your location to create GPS track replays and analyze your driving routes.\n\nThis data is only used during active sessions and can be disabled in settings.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => console.log('[Dashboard] User cancelled permission request'),
              },
              {
                text: 'Allow Location',
                onPress: async () => {
                  // Mark that we've shown the explanation
                  await AsyncStorage.setItem('location_permission_explained', 'true');
                  await requestLocationAndStart();
                },
              },
            ]
          );
          return;
        }
        
        // For "Ask Every Time" or subsequent requests, just request directly
        console.log('[Dashboard] Requesting permission directly (Ask Every Time or subsequent request)');
        await requestLocationAndStart();
        return;
      }
      
      // Permission already granted, start tracking
      console.log('[Dashboard] Permission already granted, starting session');
      await startTrackingSession();
      
    } catch (error) {
      console.error('[Dashboard] Start analysis error:', error);
      Alert.alert('Error', 'Failed to start analysis');
    }
  };

  // Request location permission and start session
  const requestLocationAndStart = async () => {
    try {
      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (permissionStatus === 'granted') {
        console.log('[Dashboard] Location permission granted');
        await startTrackingSession();
      } else {
        console.log('[Dashboard] Location permission denied');
        Alert.alert(
          '⚠️ Location Permission Denied',
          'You can still record sessions without GPS tracking, but you won\'t have track replay available.\n\nYou can enable location later in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue Without GPS',
              onPress: async () => {
                await startTrackingSession(false);
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('[Dashboard] Permission request error:', error);
      Alert.alert('Error', 'Failed to request location permission');
    }
  };

  // Start the tracking session
  const startTrackingSession = async (enableGPS: boolean = true) => {
    try {
      setIsAnalyzing(true);
      setSessionStartTime(Date.now());
      
      if (enableGPS) {
        console.log('[Dashboard] Starting GPS tracking...');
        const gpsStarted = await GpsService.startTracking();
        
        if (gpsStarted) {
          setIsTrackingGPS(true);
          setGpsCoordinateCount(0);
          console.log('[Dashboard] ✅ GPS tracking started successfully');
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          console.warn('[Dashboard] ⚠️ GPS tracking failed to start');
          // Continue without GPS
          setIsTrackingGPS(false);
        }
      } else {
        console.log('[Dashboard] Starting session without GPS');
        setIsTrackingGPS(false);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('[Dashboard] Start tracking error:', error);
      setIsAnalyzing(false);
      setSessionStartTime(null);
      Alert.alert('Error', 'Failed to start session tracking');
    }
  };

    const handleStopAnalysis = async () => {
    try {
      console.log('[Dashboard] Stopping analysis...');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      // Stop GPS tracking and get coordinates
      const coordinates = GpsService.stopTracking();
      const duration = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
      
      setIsTrackingGPS(false);
      setIsAnalyzing(false);
      setGpsCoordinateCount(0);
      setSessionStartTime(null);
      
      console.log(`[Dashboard] Session ended. Duration: ${duration}s, Captured ${coordinates.length} GPS points`);
      
      // Save session with telemetry data
      try {
        const logService = LogService;
        
        // ✅ Helper to ensure valid numbers
        const safeValue = (value: number, fallback: number): number => {
          const num = Number(value);
          return isNaN(num) || !isFinite(num) ? fallback : num;
        };
        
        // ✅ Get safe base values
        const baseSpeed = safeValue(currentSpeed, 40);
        const baseGForce = safeValue(currentGForce, 0.5);
        const baseTemp = safeValue(currentTemp, 70);
        const baseAltitude = safeValue(currentAltitude, 500);
        
        // Create telemetry samples based on duration
        const samples: any[] = [];
        const sampleInterval = 1; // 1 second between samples
        
        for (let i = 0; i < duration; i += sampleInterval) {
          samples.push({
            timestamp_ms: i * 1000,
            speed: baseSpeed + (Math.random() * 10 - 5),
            g_force: baseGForce + (Math.random() * 0.5 - 0.25),
            temp: baseTemp + (Math.random() * 2 - 1),
            humidity: 45 + (Math.random() * 10 - 5),
            lux: 800 + (Math.random() * 200 - 100),
            altitude: baseAltitude + (Math.random() * 50 - 25),
          });
        }
        
        console.log('[Dashboard] Created', samples.length, 'telemetry samples');
        
        // Save session with GPS coordinates
        const sessionKey = await logService.saveSession(samples, coordinates, duration);
        console.log('[Dashboard] Session saved:', sessionKey);
        
        // Update leaderboard with session stats (optional - only if LeaderboardService exists)
        if (user && profile) {
          try {
            // Dynamic import to avoid crash if service doesn't exist
            const { default: LeaderboardService } = await import('../services/LeaderboardService');
            
            // Calculate top speed and max G-force from session
            const topSpeed = Math.max(...samples.map(s => s.speed || 0));
            const maxGForce = Math.max(...samples.map(s => s.g_force || 0));
            
            console.log('[Dashboard] Updating leaderboard - Top Speed:', topSpeed, 'Max G-Force:', maxGForce);
            
            await LeaderboardService.updateUserStats(
              user.uid,
              topSpeed,
              maxGForce,
              profile.state
            );
            
            console.log('[Dashboard] ✅ Leaderboard updated successfully');
          } catch (leaderboardError) {
            console.error('[Dashboard] Error updating leaderboard:', leaderboardError);
            // Don't fail the session save if leaderboard update fails
          }
        }
        
        // Rescan to update logs list
        await rescan();
        
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        Alert.alert(
          '✅ Session Complete',
          `Duration: ${Math.floor(duration / 60)}m ${duration % 60}s\nGPS Points: ${coordinates.length}\n\n${
            coordinates.length > 0 
              ? 'Session saved with location data!' 
              : 'Session saved (no GPS data).'
          }`,
          [
            { text: 'OK' },
            { 
              text: 'View Logs', 
              onPress: () => {
                // Navigate to logs tab
                router.push('/(tabs)/logs');
              }
            }
          ]
        );
      } catch (saveError) {
        console.error('[Dashboard] Error saving session:', saveError);
        Alert.alert('Error', 'Failed to save session data');
      }
      
    } catch (error) {
      console.error('[Dashboard] Stop analysis error:', error);
      setIsAnalyzing(false);
      setIsTrackingGPS(false);
      setGpsCoordinateCount(0);
      setSessionStartTime(null);
      Alert.alert('Error', 'Failed to stop analysis');
    }
  };

  // Update gauges with live telemetry when connected
  useEffect(() => {
    if (telemetry && status.isConnected) {
      setCurrentSpeed(telemetry.speed);
      setCurrentGForce(telemetry.gForce);
      setCurrentTemp(telemetry.temperature);
      setCurrentAltitude(telemetry.altitude);
    } else if (latestSession?.samples && latestSession.samples.length > 0) {
      // Fallback to latest session data when disconnected
      const lastSample = latestSession.samples[latestSession.samples.length - 1];
      setCurrentSpeed(lastSample.speed);
      setCurrentGForce(lastSample.g_force);
      setCurrentTemp(lastSample.temp);
      setCurrentAltitude(lastSample.altitude);
    }
  }, [telemetry, latestSession, status.isConnected]);

  const handleSyncLogs = async () => {
    if (!status.isConnected) {
      Alert.alert('Not Connected', 'Please connect to an ApexBox device first');
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await sendCommand('SYNC_LOGS');
      await rescan();
      Alert.alert('Sync Complete', 'Latest logs have been synchronized');
    } catch (error) {
      Alert.alert('Error', 'Failed to sync logs');
    }
  };

  const handleBlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowBleModal(true);
  };

  const stats = latestSession?.samples ? calculateStats(latestSession.samples) : null;

  const chartData = latestSession?.samples
    ? latestSession.samples
        .filter((s: any, i: number) => i % 2 === 0 && !isNaN(s.speed) && !isNaN(s.timestamp_ms))
        .slice(0, 15)
        .map((s: any) => ({ x: s.timestamp_ms / 1000, y: s.speed }))
    : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!isConnected && <OfflineBanner />}
      <LinearGradient colors={[colors.background, colors.background]} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>ApexBox</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>COMPANION</Text>
          {profile?.premium && (
            <View style={[styles.proBadge, { backgroundColor: accentColor }]}>
              <MaterialCommunityIcons name="crown" size={16} color={colors.background} />
              <Text style={[styles.proBadgeText, { color: colors.background }]}>PRO</Text>
            </View>
          )}
        </View>

        {/* Active Car Display */}
        {activeCar && (
          <View style={[styles.activeCarContainer, { backgroundColor: colors.card, borderColor: accentColor }]}>
            <MaterialCommunityIcons name="car-sports" size={24} color={accentColor} />
            <View style={styles.activeCarInfo}>
              <Text style={[styles.activeCarLabel, { color: colors.textSecondary }]}>
                Current Vehicle
              </Text>
              <Text style={[styles.activeCarName, { color: colors.text }]}>
                {activeCar.year} {activeCar.make} {activeCar.model}
              </Text>
            </View>
          </View>
        )}

        {/* BLE Status Banner */}
        <TouchableOpacity
          style={[
            styles.bleStatusBanner,
            { 
              backgroundColor: status.isConnected ? accentColor + '15' : colors.card + '80',
              borderColor: status.isConnected ? accentColor : colors.border,
            },
          ]}
          onPress={handleBlePress}
          activeOpacity={0.8}
        >
          <View style={styles.bleStatusLeft}>
            <MaterialCommunityIcons
              name={status.isConnected ? 'bluetooth-connect' : 'bluetooth-off'}
              size={20}
              color={status.isConnected ? accentColor : colors.textSecondary}
            />
            <View style={styles.bleStatusTextContainer}>
              <Text style={[styles.bleStatusText, { color: status.isConnected ? accentColor : colors.textSecondary }]}>
                {status.isConnected 
                  ? `🟢 Connected to ${status.connectedDevice?.name}` 
                  : '🟠 Simulation Mode (Offline)'}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons name="cog" size={20} color={status.isConnected ? accentColor : colors.textSecondary} />
        </TouchableOpacity>

        {/* Recording Indicator */}
        {isAnalyzing && (
          <View style={[styles.recordingBanner, { backgroundColor: colors.magenta + '15', borderColor: colors.magenta }]}>
            <View style={styles.recordingLeft}>
              <View style={styles.recordingDot} />
              <Text style={[styles.recordingText, { color: colors.magenta }]}>
                🔴 RECORDING SESSION
              </Text>
            </View>
            <View style={styles.recordingStats}>
              {isTrackingGPS && (
                <View style={styles.recordingStat}>
                  <MaterialCommunityIcons name="map-marker" size={16} color={colors.lime} />
                  <Text style={[styles.recordingStatText, { color: colors.lime }]}>
                    {gpsCoordinateCount} pts
                  </Text>
                </View>
              )}
              {sessionStartTime && (
                <View style={styles.recordingStat}>
                  <MaterialCommunityIcons name="timer" size={16} color={colors.cyan} />
                  <Text style={[styles.recordingStatText, { color: colors.cyan }]}>
                    {Math.floor((Date.now() - sessionStartTime) / 1000)}s
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Connection Status */}
          <View style={[styles.statusBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.statusItem}
              onPress={handleBlePress}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="bluetooth"
                size={20}
                color={status.isConnected ? accentColor : colors.textSecondary}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: status.isConnected ? accentColor : colors.textSecondary },
                ]}
              >
                {status.isConnected ? status.connectedDevice?.name : 'Not Connected'}
              </Text>
            </TouchableOpacity>

            <View style={styles.statusItem}>
              <MaterialCommunityIcons
                name={status.isConnected && telemetry ? "radio-tower" : "sd"}
                size={20}
                color={status.isConnected && telemetry ? accentColor : latestSession ? colors.lime : colors.textSecondary}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: status.isConnected && telemetry ? accentColor : latestSession ? colors.lime : colors.textSecondary },
                ]}
              >
                {status.isConnected && telemetry ? 'Live Stream' : latestSession ? 'Logs Found' : 'No Data'}
              </Text>
            </View>
          </View>

          {/* Gauges */}
          <View style={styles.gaugesContainer}>
            <Gauge
              value={currentSpeed}
              maxValue={200}
              label="Speed"
              unit={settings.units.isMetric ? 'km/h' : 'mph'}
              color={accentColor}
              size={140}
            />
            <Gauge
              value={currentGForce}
              maxValue={5}
              label="G-Force"
              unit="g"
              color={colors.magenta}
              size={140}
            />
          </View>

          {/* Metrics */}
          <View style={styles.metricsContainer}>
            <MetricCard
              icon="thermometer"
              label="Temperature"
              value={formatTemp(currentTemp, settings.units.tempCelsius)}
              color={colors.lime}
            />
            <MetricCard
              icon="altimeter"
              label="Altitude"
              value={formatAltitude(currentAltitude, settings.units.altitudeMetric)}
              color={colors.cyan}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Start/Stop Analysis Button */}
            <TouchableOpacity
              style={[styles.actionButton, !status.isConnected && !isAnalyzing && styles.actionButtonDisabled]}
              onPress={isAnalyzing ? handleStopAnalysis : handleStartAnalysis}
              disabled={!status.isConnected && !isAnalyzing}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  isAnalyzing
                    ? [colors.magenta, colors.background]
                    : status.isConnected
                    ? [accentColor, colors.background]
                    : [colors.border, colors.border]
                }
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialCommunityIcons
                  name={isAnalyzing ? 'stop-circle' : 'play-circle'}
                  size={24}
                  color={colors.text}
                />
                <Text style={[styles.actionButtonText, { color: colors.text }]}>
                  {isAnalyzing ? 'Stop Analysis' : 'Start Analysis'}
                </Text>
                {isTrackingGPS && (
                  <MaterialCommunityIcons name="map-marker" size={16} color={colors.lime} />
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Sync Logs Button */}
            <TouchableOpacity
              style={[styles.actionButton, !status.isConnected && styles.actionButtonDisabled]}
              onPress={handleSyncLogs}
              disabled={!status.isConnected}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={status.isConnected ? [colors.magenta, colors.background] : [colors.border, colors.border]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialCommunityIcons name="sync" size={24} color={colors.text} />
                <Text style={[styles.actionButtonText, { color: colors.text }]}>Sync Logs</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Live Telemetry Button */}
            <TouchableOpacity
              style={[styles.actionButton, !status.isConnected && styles.actionButtonDisabled]}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/telemetry-graph');
              }}
              disabled={!status.isConnected}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={status.isConnected ? [colors.cyan, colors.background] : [colors.border, colors.border]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialCommunityIcons name="chart-line" size={24} color={colors.text} />
                <Text style={[styles.actionButtonText, { color: colors.text }]}>Live Telemetry</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Preview Chart */}
          {chartData.length > 0 && (
            <View style={styles.chartContainer}>
              <ChartView
                data={chartData}
                title="Latest Session Preview"
                color={accentColor}
                yLabel="Speed"
                showDots={true}
              />
            </View>
          )}

          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={accentColor} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading telemetry...</Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>

      {/* BLE Connection Modal */}
      <BleConnectionModal
        visible={showBleModal}
        onClose={() => setShowBleModal(false)}
        accentColor={accentColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    letterSpacing: 4,
    marginTop: 4,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    marginTop: SPACING.sm,
  },
  proBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  activeCarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    gap: SPACING.sm,
  },
  activeCarInfo: {
    flex: 1,
  },
  activeCarLabel: {
    fontSize: FONT_SIZE.xs,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 1,
  },
  activeCarName: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    marginTop: 2,
  },
  bleStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  bleStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  bleStatusTextContainer: {
    flex: 1,
  },
  bleStatusText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  recordingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
  },
  recordingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0055',
  },
  recordingText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  recordingStats: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  recordingStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recordingStatText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statusText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  gaugesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  actionsContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  actionButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  actionButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
  chartContainer: {
    marginBottom: SPACING.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.sm,
  },
});