import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface GPSPoint {
  lat: number;
  lon: number;
  speed: number;
  gForce: number;
  timestamp: number;
}

// Mock GPS data for demonstration
const generateMockGPSData = (): GPSPoint[] => {
  const points: GPSPoint[] = [];
  const centerLat = 37.7749;
  const centerLon = -122.4194;
  const numPoints = 50;

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const radius = 0.01 * (1 + Math.sin(angle * 3) * 0.3);
    
    points.push({
      lat: centerLat + Math.cos(angle) * radius,
      lon: centerLon + Math.sin(angle) * radius,
      speed: 50 + Math.random() * 100,
      gForce: 0.5 + Math.random() * 1.5,
      timestamp: Date.now() + i * 1000,
    });
  }

  return points;
};

export default function TrackReplayScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { colors, getCurrentAccent } = useTheme();
  const accentColor = getCurrentAccent();
  const params = useLocalSearchParams();

  const [gpsData, setGpsData] = useState<GPSPoint[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mapBounds, setMapBounds] = useState({ minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 });

  useEffect(() => {
    // Load GPS data (mock for now)
    const data = generateMockGPSData();
    setGpsData(data);

    // Calculate bounds
    if (data.length > 0) {
      const lats = data.map(p => p.lat);
      const lons = data.map(p => p.lon);
      setMapBounds({
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLon: Math.min(...lons),
        maxLon: Math.max(...lons),
      });
    }
  }, []);

  useEffect(() => {
    if (!isPlaying || currentIndex >= gpsData.length - 1) {
      if (currentIndex >= gpsData.length - 1) {
        setIsPlaying(false);
        setCurrentIndex(0);
      }
      return;
    }

    const timer = setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 100);

    return () => clearTimeout(timer);
  }, [isPlaying, currentIndex, gpsData.length]);

  const convertToCanvasCoords = (lat: number, lon: number) => {
    const padding = 40;
    const canvasWidth = width - padding * 2;
    const canvasHeight = 400;

    const x = padding + ((lon - mapBounds.minLon) / (mapBounds.maxLon - mapBounds.minLon)) * canvasWidth;
    const y = padding + ((mapBounds.maxLat - lat) / (mapBounds.maxLat - mapBounds.minLat)) * canvasHeight;

    return { x, y };
  };

  const getColorForGForce = (gForce: number): string => {
    // Blue (low) → Cyan → Green → Yellow → Red (high)
    if (gForce < 0.5) return '#0080FF';
    if (gForce < 1.0) return '#00D4FF';
    if (gForce < 1.5) return '#00FF88';
    if (gForce < 2.0) return '#FFAA00';
    return '#FF0055';
  };

  const handlePlayPause = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (currentIndex >= gpsData.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // Premium gate
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
            Track Replay is available with ApexBox Pro Pack
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

  const pathString = gpsData
    .slice(0, currentIndex + 1)
    .map((point, i) => {
      const { x, y } = convertToCanvasCoords(point.lat, point.lon);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');

  const currentPoint = gpsData[currentIndex];
  const currentCoords = currentPoint ? convertToCanvasCoords(currentPoint.lat, currentPoint.lon) : { x: 0, y: 0 };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <MaterialCommunityIcons name="arrow-left" size={28} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Track Replay</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>GPS Path Visualization</Text>
      </View>

      <View style={[styles.canvasContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Canvas style={styles.canvas}>
          {pathString && (
            <Path
              path={pathString}
              style="stroke"
              strokeWidth={3}
              color={accentColor}
            />
          )}

          {currentPoint && (
            <>
              <SkiaCircle
                cx={currentCoords.x}
                cy={currentCoords.y}
                r={8}
                color={getColorForGForce(currentPoint.gForce)}
              />
              <SkiaCircle
                cx={currentCoords.x}
                cy={currentCoords.y}
                r={12}
                style="stroke"
                strokeWidth={2}
                color={colors.text}
              />
            </>
          )}
        </Canvas>
      </View>

      {currentPoint && (
        <View style={[styles.statsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="speedometer" size={24} color={accentColor} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {currentPoint.speed.toFixed(0)} km/h
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Speed</Text>
          </View>

          <View style={styles.statItem}>
            <MaterialCommunityIcons name="arrow-up-bold" size={24} color={getColorForGForce(currentPoint.gForce)} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {currentPoint.gForce.toFixed(2)}g
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>G-Force</Text>
          </View>

          <View style={styles.statItem}>
            <MaterialCommunityIcons name="map-marker" size={24} color={accentColor} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {currentIndex + 1}/{gpsData.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Position</Text>
          </View>
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleReset}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="restart" size={28} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[accentColor, colors.background]}
            style={styles.playGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <MaterialCommunityIcons
              name={isPlaying ? 'pause' : 'play'}
              size={36}
              color={colors.text}
            />
          </LinearGradient>
        </TouchableOpacity>

        <View style={[styles.controlButton, { backgroundColor: 'transparent', borderColor: 'transparent' }]} />
      </View>

      <View style={styles.legendContainer}>
        <Text style={[styles.legendTitle, { color: colors.textSecondary }]}>G-Force Scale</Text>
        <View style={styles.legendItems}>
          {[
            { label: '< 0.5g', color: '#0080FF' },
            { label: '< 1.0g', color: '#00D4FF' },
            { label: '< 1.5g', color: '#00FF88' },
            { label: '< 2.0g', color: '#FFAA00' },
            { label: '> 2.0g', color: '#FF0055' },
          ].map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: item.color }]} />
              <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
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
  canvasContainer: {
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    height: 480,
  },
  canvas: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  playGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendContainer: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  legendTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendLabel: {
    fontSize: FONT_SIZE.xs,
  },
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
