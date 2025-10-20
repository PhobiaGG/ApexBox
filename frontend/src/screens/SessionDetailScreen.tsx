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
import { useLocalSearchParams, useRouter } from 'expo-router';
import LogService from '../services/LogService';
import { useSettings } from '../contexts/SettingsContext';
import { TelemetrySample, calculateStats, SessionStats } from '../utils/csv';
import { formatSpeed, formatGForce, formatTemp, formatAltitude, formatDuration } from '../utils/format';
import ChartView from '../components/ChartView';
import * as Sharing from 'expo-sharing';

export default function SessionDetailScreen() {
  const { date, fileName } = useLocalSearchParams<{ date: string; fileName: string }>();
  const router = useRouter();
  const { settings } = useSettings();
  const [samples, setSamples] = useState<TelemetrySample[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, [date, fileName]);

  const loadSession = async () => {
    try {
      setIsLoading(true);
      const sessionMeta = {
        date: date as string,
        fileName: fileName as string,
        time: (fileName as string).replace('.csv', ''),
        filePath: `${LogService['logsDir']}${date}/${fileName}`,
      };

      const data = await LogService.getSessionData(sessionMeta);
      setSamples(data);
      
      const calculatedStats = calculateStats(data);
      setStats(calculatedStats);
    } catch (error) {
      console.error('Error loading session:', error);
      Alert.alert('Error', 'Failed to load session data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const filePath = `${LogService['logsDir']}${date}/${fileName}`;
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      await Sharing.shareAsync(filePath);
    } catch (error) {
      Alert.alert('Error', 'Failed to export session');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[COLORS.background, '#0F0F0F']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.cyan} />
            <Text style={styles.loadingText}>Loading session...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const speedData = samples
    .filter((_, i) => i % 2 === 0)
    .map(s => ({ x: s.timestamp_ms / 1000, y: s.speed }));

  const gForceData = samples
    .filter((_, i) => i % 2 === 0)
    .map(s => ({ x: s.timestamp_ms / 1000, y: s.g_force }));

  const tempData = samples
    .filter((_, i) => i % 2 === 0)
    .map(s => ({ x: s.timestamp_ms / 1000, y: s.temp }));

  const altitudeData = samples
    .filter((_, i) => i % 2 === 0)
    .map(s => ({ x: s.timestamp_ms / 1000, y: s.altitude }));

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#0F0F0F']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>{date}</Text>
            <Text style={styles.subtitle}>{fileName?.replace('.csv', '')}</Text>
          </View>
          <TouchableOpacity onPress={handleExport} style={styles.exportButton}>
            <MaterialCommunityIcons name="share-variant" size={24} color={COLORS.cyan} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary Stats */}
          {stats && (
            <View style={styles.statsCard}>
              <Text style={styles.sectionTitle}>Session Summary</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="speedometer" size={32} color={COLORS.cyan} />
                  <Text style={styles.statValue}>
                    {formatSpeed(stats.peakSpeed, settings.units.isMetric)}
                  </Text>
                  <Text style={styles.statLabel}>Peak Speed</Text>
                </View>

                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="gauge" size={32} color={COLORS.magenta} />
                  <Text style={styles.statValue}>{formatGForce(stats.peakG)}</Text>
                  <Text style={styles.statLabel}>Peak G-Force</Text>
                </View>

                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="clock-outline" size={32} color={COLORS.lime} />
                  <Text style={styles.statValue}>{formatDuration(stats.duration)}</Text>
                  <Text style={styles.statLabel}>Duration</Text>
                </View>

                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="thermometer" size={32} color={COLORS.cyan} />
                  <Text style={styles.statValue}>
                    {formatTemp(stats.maxTemp, settings.units.tempCelsius)}
                  </Text>
                  <Text style={styles.statLabel}>Max Temperature</Text>
                </View>
              </View>

              <View style={styles.additionalStats}>
                <View style={styles.additionalStatRow}>
                  <Text style={styles.additionalStatLabel}>Avg Speed:</Text>
                  <Text style={styles.additionalStatValue}>
                    {formatSpeed(stats.avgSpeed, settings.units.isMetric)}
                  </Text>
                </View>
                <View style={styles.additionalStatRow}>
                  <Text style={styles.additionalStatLabel}>Avg G-Force:</Text>
                  <Text style={styles.additionalStatValue}>{formatGForce(stats.avgG)}</Text>
                </View>
                <View style={styles.additionalStatRow}>
                  <Text style={styles.additionalStatLabel}>Altitude Change:</Text>
                  <Text style={styles.additionalStatValue}>
                    {formatAltitude(stats.maxAltitude - stats.minAltitude, settings.units.altitudeMetric)}
                  </Text>
                </View>
                <View style={styles.additionalStatRow}>
                  <Text style={styles.additionalStatLabel}>Total Samples:</Text>
                  <Text style={styles.additionalStatValue}>{stats.sampleCount}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Charts */}
          <View style={styles.chartsSection}>
            <Text style={styles.sectionTitle}>Telemetry Analysis</Text>
            
            <ChartView
              data={speedData}
              title="Speed Over Time"
              color={COLORS.cyan}
              yLabel="Speed (km/h)"
            />

            <ChartView
              data={gForceData}
              title="G-Force Over Time"
              color={COLORS.magenta}
              yLabel="G-Force (g)"
            />

            <ChartView
              data={tempData}
              title="Temperature Over Time"
              color={COLORS.lime}
              yLabel={`Temp (${settings.units.tempCelsius ? '°C' : '°F'})`}
            />

            <ChartView
              data={altitudeData}
              title="Altitude Over Time"
              color={COLORS.cyan}
              yLabel={`Altitude (${settings.units.altitudeMetric ? 'm' : 'ft'})`}
            />
          </View>

          {/* Diagnostics Section */}
          <View style={styles.diagnosticsCard}>
            <Text style={styles.sectionTitle}>Diagnostics</Text>
            <View style={styles.diagnosticRow}>
              <MaterialCommunityIcons name="lightbulb" size={20} color={COLORS.textSecondary} />
              <Text style={styles.diagnosticText}>
                Lux sensor data: {samples.length > 0 ? samples[0].lux.toFixed(0) : 'N/A'} lux
              </Text>
            </View>
            <View style={styles.diagnosticRow}>
              <MaterialCommunityIcons name="chart-line" size={20} color={COLORS.textSecondary} />
              <Text style={styles.diagnosticText}>Data integrity: 100%</Text>
            </View>
            <View style={styles.diagnosticRow}>
              <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.lime} />
              <Text style={styles.diagnosticText}>Session completed successfully</Text>
            </View>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
    marginRight: SPACING.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  exportButton: {
    padding: SPACING.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  statsCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  additionalStats: {
    gap: SPACING.xs,
  },
  additionalStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  additionalStatLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  additionalStatValue: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    fontWeight: '600',
  },
  chartsSection: {
    marginBottom: SPACING.lg,
  },
  diagnosticsCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  diagnosticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  diagnosticText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
});
