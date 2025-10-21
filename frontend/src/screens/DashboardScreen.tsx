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
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBle } from '../contexts/BleContext';
import { useLogs } from '../contexts/LogsContext';
import { useSettings } from '../contexts/SettingsContext';
import Gauge from '../components/Gauge';
import MetricCard from '../components/MetricCard';
import ChartView from '../components/ChartView';
import { formatTemp, formatAltitude, formatHumidity } from '../utils/format';
import { calculateStats } from '../utils/csv';

export default function DashboardScreen() {
  const { status, scan, connect, disconnect, devices, sendCommand, telemetry } = useBle();
  const { latestSession, isLoading, rescan } = useLogs();
  const { settings } = useSettings();
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentGForce, setCurrentGForce] = useState(0);
  const [currentTemp, setCurrentTemp] = useState(65);
  const [currentAltitude, setCurrentAltitude] = useState(350);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Update gauges with live telemetry when connected
  useEffect(() => {
    if (telemetry && status.isConnected) {
      setCurrentSpeed(telemetry.speed);
      setCurrentGForce(telemetry.g_force);
      setCurrentTemp(telemetry.temperature);
      setCurrentAltitude(telemetry.altitude);
    } else if (latestSession?.samples && latestSession.samples.length > 0) {
      // Fallback to latest session data when disconnected
      const lastSample = latestSession.samples[latestSession.samples.length - 1];
      setCurrentSpeed(lastSample.speed);
      setCurrentGForce(lastSample.g_force);
      setCurrentTemp(lastSample.temperature);
      setCurrentAltitude(lastSample.altitude);
    }
  }, [telemetry, latestSession, status.isConnected]);

  const handleStartAnalysis = async () => {
    if (!status.isConnected) {
      Alert.alert('Not Connected', 'Please connect to an ApexBox device first');
      return;
    }

    try {
      setIsAnalyzing(true);
      await sendCommand('START_ANALYSIS');
      Alert.alert('Analysis Started', 'ApexBox is now collecting telemetry data');
    } catch (error) {
      Alert.alert('Error', 'Failed to start analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSyncLogs = async () => {
    if (!status.isConnected) {
      Alert.alert('Not Connected', 'Please connect to an ApexBox device first');
      return;
    }

    try {
      await sendCommand('SYNC_LOGS');
      await rescan();
      Alert.alert('Sync Complete', 'Latest logs have been synchronized');
    } catch (error) {
      Alert.alert('Error', 'Failed to sync logs');
    }
  };

  const handleBlePress = async () => {
    if (status.isConnected) {
      await disconnect();
    } else {
      const foundDevices = await scan();
      if (foundDevices.length > 0) {
        await connect(foundDevices[0]);
      }
    }
  };

  const stats = latestSession?.samples ? calculateStats(latestSession.samples) : null;

  const chartData = latestSession?.samples
    ? latestSession.samples
        .filter((_, i) => i % 2 === 0)
        .slice(0, 15)
        .map(s => ({ x: s.timestamp_ms / 1000, y: s.speed }))
    : [];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#0F0F0F']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ApexBox</Text>
          <Text style={styles.subtitle}>COMPANION</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Connection Status */}
          <View style={styles.statusBar}>
            <TouchableOpacity
              style={styles.statusItem}
              onPress={handleBlePress}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="bluetooth"
                size={20}
                color={status.isConnected ? COLORS.cyan : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: status.isConnected ? COLORS.cyan : COLORS.textSecondary },
                ]}
              >
                {status.isConnected ? status.connectedDevice?.name : 'Not Connected'}
              </Text>
            </TouchableOpacity>

            <View style={styles.statusItem}>
              <MaterialCommunityIcons
                name="sd"
                size={20}
                color={latestSession ? COLORS.lime : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: latestSession ? COLORS.lime : COLORS.textSecondary },
                ]}
              >
                {latestSession ? 'Logs Found' : 'No Logs'}
              </Text>
            </View>
          </View>

          {/* Gauges */}
          <View style={styles.gaugesContainer}>
            <Gauge
              value={currentSpeed}
              maxValue={200}
              label="Speed"
              unit="km/h"
              color={COLORS.cyan}
              size={140}
            />
            <Gauge
              value={currentGForce}
              maxValue={5}
              label="G-Force"
              unit="g"
              color={COLORS.magenta}
              size={140}
            />
          </View>

          {/* Metrics */}
          {stats && (
            <View style={styles.metricsContainer}>
              <MetricCard
                icon="thermometer"
                label="Temperature"
                value={formatTemp(stats.maxTemp, settings.units.tempCelsius)}
                color={COLORS.lime}
              />
              <MetricCard
                icon="altimeter"
                label="Altitude"
                value={formatAltitude(stats.maxAltitude, settings.units.altitudeMetric)}
                color={COLORS.cyan}
              />
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, !status.isConnected && styles.actionButtonDisabled]}
              onPress={handleStartAnalysis}
              disabled={!status.isConnected || isAnalyzing}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={status.isConnected ? [COLORS.cyan, '#0088AA'] : [COLORS.border, COLORS.border]}
                style={styles.buttonGradient}
              >
                {isAnalyzing ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="play-circle" size={24} color={COLORS.text} />
                    <Text style={styles.actionButtonText}>Start Analysis</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, !status.isConnected && styles.actionButtonDisabled]}
              onPress={handleSyncLogs}
              disabled={!status.isConnected}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={status.isConnected ? [COLORS.magenta, '#AA0088'] : [COLORS.border, COLORS.border]}
                style={styles.buttonGradient}
              >
                <MaterialCommunityIcons name="sync" size={24} color={COLORS.text} />
                <Text style={styles.actionButtonText}>Sync Logs</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Preview Chart */}
          {chartData.length > 0 && (
            <View style={styles.chartContainer}>
              <ChartView
                data={chartData}
                title="Latest Session Preview"
                color={COLORS.cyan}
                yLabel="Speed (km/h)"
              />
            </View>
          )}

          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.cyan} />
              <Text style={styles.loadingText}>Loading telemetry...</Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: COLORS.cyan,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    letterSpacing: 4,
    marginTop: 4,
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
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.text,
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
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
});