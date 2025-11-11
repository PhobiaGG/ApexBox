import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBle } from '../contexts/BleContext';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import ChartView from '../components/ChartView';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface DataPoint {
  x: number;
  y: number;
}

const MAX_POINTS = 30; // Show last 30 seconds of data

// ✅ Helper to ensure valid numbers
const safeNumber = (value: any, fallback: number = 0): number => {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return isNaN(num) || !isFinite(num) ? fallback : num;
};

export default function TelemetryGraphScreen() {
  const router = useRouter();
  const { telemetry, status } = useBle();
  const { profile } = useAuth(); // ✅ Add this
  const { colors, getCurrentAccent } = useTheme();
  const accentColor = getCurrentAccent();

  // ✅ Initialize with safe default data points
  const [speedData, setSpeedData] = useState<DataPoint[]>([{ x: 0, y: 0 }]);
  const [rpmData, setRpmData] = useState<DataPoint[]>([{ x: 0, y: 0 }]);
  const [gForceData, setGForceData] = useState<DataPoint[]>([{ x: 0, y: 0 }]);
  const [tempData, setTempData] = useState<DataPoint[]>([{ x: 0, y: 70 }]);

  const [selectedMetric, setSelectedMetric] = useState<'speed' | 'rpm' | 'gforce' | 'temp'>('speed');
  const [startTime] = useState<number>(Date.now());

  // Update data when telemetry arrives
  useEffect(() => {
    if (!telemetry || !status.isConnected) return;

    const elapsedSeconds = (Date.now() - startTime) / 1000;

    setSpeedData(prev => {
      const updated = [...prev, { 
        x: elapsedSeconds, 
        y: safeNumber(telemetry.speed, 0) 
      }];
      return updated.slice(-MAX_POINTS);
    });

    setRpmData(prev => {
      const updated = [...prev, { 
        x: elapsedSeconds, 
        y: safeNumber(telemetry.rpm, 0) 
      }];
      return updated.slice(-MAX_POINTS);
    });

    setGForceData(prev => {
      const updated = [...prev, { 
        x: elapsedSeconds, 
        y: safeNumber(telemetry.gForce, 0) 
      }];
      return updated.slice(-MAX_POINTS);
    });

    setTempData(prev => {
      const updated = [...prev, { 
        x: elapsedSeconds, 
        y: safeNumber(telemetry.temperature, 70) 
      }];
      return updated.slice(-MAX_POINTS);
    });
  }, [telemetry, status.isConnected, startTime]);

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleReset = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSpeedData([{ x: 0, y: 0 }]);
    setRpmData([{ x: 0, y: 0 }]);
    setGForceData([{ x: 0, y: 0 }]);
    setTempData([{ x: 0, y: 70 }]);
  };

  const getCurrentData = (): DataPoint[] => {
    switch (selectedMetric) {
      case 'speed': return speedData;
      case 'rpm': return rpmData;
      case 'gforce': return gForceData;
      case 'temp': return tempData;
    }
  };

  const getMetricInfo = () => {
    switch (selectedMetric) {
      case 'speed':
        return { label: 'Speed', unit: 'MPH', color: accentColor, icon: 'speedometer' };
      case 'rpm':
        return { label: 'RPM', unit: 'RPM', color: colors.magenta, icon: 'engine' };
      case 'gforce':
        return { label: 'G-Force', unit: 'g', color: colors.lime, icon: 'arrow-up-bold' };
      case 'temp':
        return { label: 'Temperature', unit: '°F', color: colors.orange, icon: 'thermometer' };
    }
  };

  // ✅ Premium check
  if (!profile?.premium) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.lockedContainer}>
          <View style={[styles.lockIconContainer, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons name="lock" size={64} color={colors.textSecondary} />
          </View>
          <Text style={[styles.lockedTitle, { color: colors.text }]}>Premium Feature</Text>
          <Text style={[styles.lockedSubtitle, { color: colors.textSecondary }]}>
            Live Telemetry Graphs are available with ApexBox Pro Pack
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/premium');
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[accentColor, colors.background]}
              style={styles.upgradeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialCommunityIcons name="crown" size={20} color={colors.text} />
              <Text style={[styles.upgradeText, { color: colors.text }]}>Upgrade to Pro</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ✅ Connection check
  if (!status.isConnected) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Live Telemetry</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            🔴 Not Connected
          </Text>
        </View>

        <View style={[styles.noDataCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: SPACING.xl, marginHorizontal: SPACING.lg }]}>
          <MaterialCommunityIcons name="bluetooth-off" size={64} color={colors.textTertiary} />
          <Text style={[styles.noDataText, { color: colors.textSecondary, marginTop: SPACING.md }]}>
            Connect to ApexBox to start streaming telemetry
          </Text>
        </View>
      </View>
    );
  }

  const metricInfo = getMetricInfo();
  const currentData = getCurrentData();
  
  // ✅ Safe value calculations with validation
  const currentValue = currentData.length > 0 
    ? safeNumber(currentData[currentData.length - 1]?.y, 0)
    : 0;

  const validValues = currentData.map(d => safeNumber(d.y, 0)).filter(v => isFinite(v));
  
  const maxValue = validValues.length > 0 
    ? Math.max(...validValues)
    : 0;

  const minValue = validValues.length > 0 
    ? Math.min(...validValues)
    : 0;

  const avgValue = validValues.length > 0
    ? validValues.reduce((sum, v) => sum + v, 0) / validValues.length
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <MaterialCommunityIcons name="arrow-left" size={28} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Live Telemetry</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {status.isConnected ? '🟢 Streaming' : '🔴 Offline'}
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Value Display */}
        <View style={[styles.currentValueCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons 
            name={metricInfo.icon as any} 
            size={48} 
            color={metricInfo.color} 
          />
          <Text style={[styles.currentValue, { color: colors.text }]}>
            {selectedMetric === 'gforce' ? currentValue.toFixed(2) : currentValue.toFixed(0)}
          </Text>
          <Text style={[styles.currentUnit, { color: colors.textSecondary }]}>
            {metricInfo.unit}
          </Text>
          <Text style={[styles.currentLabel, { color: colors.textSecondary }]}>
            {metricInfo.label}
          </Text>
        </View>

        {/* Metric Selector */}
        <View style={styles.metricSelector}>
          <TouchableOpacity
            style={[
              styles.metricButton,
              { backgroundColor: colors.card, borderColor: colors.border },
              selectedMetric === 'speed' && { borderColor: accentColor, backgroundColor: accentColor + '15' }
            ]}
            onPress={() => {
              setSelectedMetric('speed');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name="speedometer" 
              size={24} 
              color={selectedMetric === 'speed' ? accentColor : colors.textSecondary} 
            />
            <Text style={[
              styles.metricButtonText, 
              { color: selectedMetric === 'speed' ? accentColor : colors.textSecondary }
            ]}>Speed</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.metricButton,
              { backgroundColor: colors.card, borderColor: colors.border },
              selectedMetric === 'rpm' && { borderColor: colors.magenta, backgroundColor: colors.magenta + '15' }
            ]}
            onPress={() => {
              setSelectedMetric('rpm');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name="engine" 
              size={24} 
              color={selectedMetric === 'rpm' ? colors.magenta : colors.textSecondary} 
            />
            <Text style={[
              styles.metricButtonText, 
              { color: selectedMetric === 'rpm' ? colors.magenta : colors.textSecondary }
            ]}>RPM</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.metricButton,
              { backgroundColor: colors.card, borderColor: colors.border },
              selectedMetric === 'gforce' && { borderColor: colors.lime, backgroundColor: colors.lime + '15' }
            ]}
            onPress={() => {
              setSelectedMetric('gforce');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name="arrow-up-bold" 
              size={24} 
              color={selectedMetric === 'gforce' ? colors.lime : colors.textSecondary} 
            />
            <Text style={[
              styles.metricButtonText, 
              { color: selectedMetric === 'gforce' ? colors.lime : colors.textSecondary }
            ]}>G-Force</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.metricButton,
              { backgroundColor: colors.card, borderColor: colors.border },
              selectedMetric === 'temp' && { borderColor: colors.orange, backgroundColor: colors.orange + '15' }
            ]}
            onPress={() => {
              setSelectedMetric('temp');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name="thermometer" 
              size={24} 
              color={selectedMetric === 'temp' ? colors.orange : colors.textSecondary} 
            />
            <Text style={[
              styles.metricButtonText, 
              { color: selectedMetric === 'temp' ? colors.orange : colors.textSecondary }
            ]}>Temp</Text>
          </TouchableOpacity>
        </View>

        {/* Chart */}
        {currentData.length > 1 && validValues.length > 0 && (
          <ChartView
            data={currentData}
            title={`${metricInfo.label} Over Time`}
            color={metricInfo.color}
            yLabel={metricInfo.unit}
            showDots={true}
          />
        )}

        {/* Show message when no data yet */}
        {currentData.length <= 1 && (
          <View style={[styles.noDataCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="chart-line" size={48} color={colors.textTertiary} />
            <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
              Collecting telemetry data...
            </Text>
          </View>
        )}

        {/* Stats Summary */}
        {currentData.length > 1 && validValues.length > 0 && (
          <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statsHeader}>
              <Text style={[styles.statsTitle, { color: colors.text }]}>Statistics</Text>
              <TouchableOpacity
                style={[styles.resetButton, { borderColor: colors.border }]}
                onPress={handleReset}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="restart" size={16} color={colors.textSecondary} />
                <Text style={[styles.resetButtonText, { color: colors.textSecondary }]}>Reset</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Current</Text>
                <Text style={[styles.statValue, { color: metricInfo.color }]}>
                  {selectedMetric === 'gforce' ? currentValue.toFixed(2) : currentValue.toFixed(0)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Max</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {selectedMetric === 'gforce' ? maxValue.toFixed(2) : maxValue.toFixed(0)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Min</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {selectedMetric === 'gforce' ? minValue.toFixed(2) : minValue.toFixed(0)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {selectedMetric === 'gforce' ? avgValue.toFixed(2) : avgValue.toFixed(0)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: SPACING.lg,
    zIndex: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 80,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  currentValueCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    marginBottom: SPACING.lg,
  },
  currentValue: {
    fontSize: 64,
    fontWeight: 'bold',
    marginTop: SPACING.md,
  },
  currentUnit: {
    fontSize: FONT_SIZE.lg,
    marginTop: SPACING.xs,
  },
  currentLabel: {
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  metricSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  metricButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    gap: SPACING.xs,
  },
  metricButtonText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  statsCard: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statsTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    gap: 4,
  },
  resetButtonText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
  },
  noDataCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginTop: SPACING.lg,
  },
  noDataText: {
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  // ✅ ADD THESE NEW STYLES BELOW:
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  lockIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  lockedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  lockedSubtitle: {
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  upgradeButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  upgradeText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
});