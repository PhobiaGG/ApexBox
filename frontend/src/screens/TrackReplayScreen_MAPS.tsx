import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import * as Haptics from 'expo-haptics';
import { default as MapViewType } from 'react-native-maps';

// Conditional import for react-native-maps (not available on web)
let MapView: any = null;
let Polyline: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Polyline = Maps.Polyline;
    Marker = Maps.Marker;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  } catch (e) {
    console.log('Maps not available:', e);
  }
}

interface GPSPoint {
  lat: number;
  lon: number;
  speed: number;
  gForce: number;
  timestamp: number;
}

// Mock GPS data for demonstration (will be replaced with real session data)
const generateMockGPSData = (): GPSPoint[] => {
  const points: GPSPoint[] = [];
  const centerLat = 37.7749; // San Francisco
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
  const mapRef = useRef<MapViewType>(null);

  const [gpsData, setGpsData] = useState<GPSPoint[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 4x

  useEffect(() => {
    // Load GPS data (will be from LogService in production)
    const data = generateMockGPSData();
    setGpsData(data);

    // Center map on track
    if (data.length > 0) {
      const lats = data.map(p => p.lat);
      const lons = data.map(p => p.lon);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);

      setTimeout(() => {
        mapRef.current?.fitToCoordinates(
          data.map(p => ({ latitude: p.lat, longitude: p.lon })),
          {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          }
        );
      }, 100);
    }
  }, []);

  useEffect(() => {
    if (!isPlaying || currentIndex >= gpsData.length - 1) {
      if (currentIndex >= gpsData.length - 1) {
        setIsPlaying(false);
      }
      return;
    }

    const interval = 100 / playbackSpeed;
    const timer = setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      
      // Center map on current position
      if (gpsData[currentIndex + 1]) {
        mapRef.current?.animateCamera({
          center: {
            latitude: gpsData[currentIndex + 1].lat,
            longitude: gpsData[currentIndex + 1].lon,
          },
          zoom: 15,
        }, { duration: interval });
      }
    }, interval);

    return () => clearTimeout(timer);
  }, [isPlaying, currentIndex, gpsData, playbackSpeed]);

  const getColorForGForce = (gForce: number): string => {
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
    
    if (gpsData.length > 0) {
      mapRef.current?.fitToCoordinates(
        gpsData.map(p => ({ latitude: p.lat, longitude: p.lon })),
        {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        }
      );
    }
  };

  const handleSpeedToggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPlaybackSpeed(prev => {
      if (prev === 1) return 2;
      if (prev === 2) return 4;
      return 1;
    });
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

  // Web/unsupported platform fallback
  if (Platform.OS === 'web' || !MapView) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.lockedContainer}>
          <View style={[styles.lockIconContainer, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons name="map-marker-off" size={64} color={colors.textSecondary} />
          </View>
          <Text style={[styles.lockedTitle, { color: colors.text }]}>Device Only</Text>
          <Text style={[styles.lockedSubtitle, { color: colors.textSecondary }]}>
            Track Replay requires native maps and is only available on iOS/Android devices. 
            Please test on a physical device or emulator.
          </Text>
        </View>
      </View>
    );
  }

  const currentPoint = gpsData[currentIndex];
  const completedPath = gpsData.slice(0, currentIndex + 1).map(p => ({
    latitude: p.lat,
    longitude: p.lon,
  }));

  const remainingPath = gpsData.slice(currentIndex).map(p => ({
    latitude: p.lat,
    longitude: p.lon,
  }));

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={{
          latitude: gpsData[0]?.lat || 37.7749,
          longitude: gpsData[0]?.lon || -122.4194,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
        customMapStyle={colors.background === '#0A0A0A' ? darkMapStyle : []}
      >
        {/* Remaining path (gray/faded) */}
        {remainingPath.length > 1 && (
          <Polyline
            coordinates={remainingPath}
            strokeColor={colors.border}
            strokeWidth={4}
            lineDashPattern={[5, 5]}
          />
        )}

        {/* Completed path (accent color) */}
        {completedPath.length > 1 && (
          <Polyline
            coordinates={completedPath}
            strokeColor={accentColor}
            strokeWidth={5}
          />
        )}

        {/* Start marker */}
        {gpsData.length > 0 && (
          <Marker
            coordinate={{ latitude: gpsData[0].lat, longitude: gpsData[0].lon }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.startMarker, { backgroundColor: colors.lime }]}>
              <MaterialCommunityIcons name="flag-checkered" size={16} color={colors.text} />
            </View>
          </Marker>
        )}

        {/* Finish marker */}
        {gpsData.length > 0 && (
          <Marker
            coordinate={{
              latitude: gpsData[gpsData.length - 1].lat,
              longitude: gpsData[gpsData.length - 1].lon,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.finishMarker, { backgroundColor: colors.magenta }]}>
              <MaterialCommunityIcons name="flag" size={16} color={colors.text} />
            </View>
          </Marker>
        )}

        {/* Current position marker */}
        {currentPoint && (
          <Marker
            coordinate={{ latitude: currentPoint.lat, longitude: currentPoint.lon }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.currentMarkerOuter}>
              <View
                style={[
                  styles.currentMarker,
                  { backgroundColor: getColorForGForce(currentPoint.gForce) },
                ]}
              >
                <MaterialCommunityIcons name="car-sports" size={16} color={colors.text} />
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Back button */}
      <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.card }]} onPress={handleBack}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
      </TouchableOpacity>

      {/* Stats overlay */}
      {currentPoint && (
        <View style={[styles.statsOverlay, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statColumn}>
            <MaterialCommunityIcons name="speedometer" size={24} color={accentColor} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {currentPoint.speed.toFixed(0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>km/h</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.statColumn}>
            <MaterialCommunityIcons
              name="arrow-up-bold"
              size={24}
              color={getColorForGForce(currentPoint.gForce)}
            />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {currentPoint.gForce.toFixed(2)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>g-force</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.statColumn}>
            <MaterialCommunityIcons name="map-marker-path" size={24} color={accentColor} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {((currentIndex / gpsData.length) * 100).toFixed(0)}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>complete</Text>
          </View>
        </View>
      )}

      {/* Controls */}
      <View style={[styles.controls, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: colors.background }]}
          onPress={handleReset}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="restart" size={24} color={colors.text} />
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
              size={32}
              color={colors.text}
            />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: colors.background }]}
          onPress={handleSpeedToggle}
          activeOpacity={0.8}
        >
          <Text style={[styles.speedText, { color: colors.text }]}>{playbackSpeed}x</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: accentColor,
                width: `${(currentIndex / Math.max(gpsData.length - 1, 1)) * 100}%`,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {currentIndex + 1} / {gpsData.length} points
        </Text>
      </View>
    </View>
  );
}

// Dark map style for better visibility
const darkMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#1A1A1A' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#888888' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1A1A1A' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#333333' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0A2A3A' }],
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: SPACING.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  statsOverlay: {
    position: 'absolute',
    top: 60,
    right: SPACING.lg,
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  statColumn: {
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },
  statValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  divider: {
    width: 1,
    marginHorizontal: SPACING.xs,
  },
  controls: {
    position: 'absolute',
    bottom: 120,
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
  },
  playGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedText: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 40,
    left: SPACING.lg,
    right: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
  },
  startMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  finishMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  currentMarkerOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 8,
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
