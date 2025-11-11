import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GeocodingService from '../services/GeocodingService';

// Helper to safely format numbers
const safeFormat = (value: any, decimals: number = 0, fallback: string = '--'): string => {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return fallback;
  return num.toFixed(decimals);
};

const { width } = Dimensions.get('window');

interface SessionData {
  duration: number;
  maxSpeed: number;
  maxGForce: number;
  avgSpeed?: number;
  distance?: number;
  timestamp: string;
}

interface GPSCoordinate {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: number;
}

export default function SessionDetailsScreen() {
  const router = useRouter();
  const { colors, getCurrentAccent } = useTheme();
  const { profile } = useAuth();
  const accentColor = getCurrentAccent();
  const params = useLocalSearchParams();

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [gpsCoordinates, setGpsCoordinates] = useState<GPSCoordinate[]>([]);
  const [roadName, setRoadName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessionData();
  }, []);

  const loadSessionData = async () => {
    try {
      setLoading(true);
      const date = params.date as string;
      const fileName = params.fileName as string;
      
      if (!date || !fileName) {
        Alert.alert('Error', 'Invalid session data');
        router.back();
        return;
      }

      const sessionKey = `${date}/${fileName}`;
      
      // Load session metadata
      const metadataStr = await AsyncStorage.getItem(`session_${sessionKey}`);
      if (metadataStr) {
        const metadata = JSON.parse(metadataStr);
        
        // Calculate average speed from samples if not present
        let avgSpeed = metadata.avgSpeed || 0;
        if (!avgSpeed && metadata.samples && metadata.samples.length > 0) {
          const speeds = metadata.samples.map((s: any) => s.speed || 0);
          avgSpeed = speeds.reduce((a: number, b: number) => a + b, 0) / speeds.length;
        }
        
        setSessionData({
          duration: metadata.duration || 0,
          maxSpeed: metadata.maxSpeed || 0,
          maxGForce: metadata.maxGForce || 0,
          avgSpeed: avgSpeed,
          distance: metadata.distance || 0,
          timestamp: metadata.timestamp || new Date().toISOString(),
        });
      }

      // Load GPS coordinates
      const gpsDataStr = await AsyncStorage.getItem(`gps_${sessionKey}`);
      if (gpsDataStr) {
        const coords: GPSCoordinate[] = JSON.parse(gpsDataStr);
        setGpsCoordinates(coords);

        // Get road name from first coordinate
        if (coords.length > 0) {
          const name = await GeocodingService.getRoadName(
            coords[0].latitude,
            coords[0].longitude
          );
          setRoadName(name || '');
        }
      }
    } catch (error) {
      console.error('[SessionDetails] Error loading data:', error);
      Alert.alert('Error', 'Failed to load session data');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleViewTrackReplay = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/track-replay',
      params: {
        date: params.date,
        fileName: params.fileName,
      },
    });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const mapRegion = gpsCoordinates.length > 0 ? {
    latitude: gpsCoordinates[0].latitude,
    longitude: gpsCoordinates[0].longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  } : undefined;

  // Show loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={accentColor} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading session...</Text>
      </View>
    );
  }

  // Show error if no data
  if (!sessionData) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="alert-circle" size={64} color={colors.textTertiary} />
        <Text style={[styles.errorText, { color: colors.text }]}>Session not found</Text>
        <TouchableOpacity
          style={[styles.errorButton, { backgroundColor: accentColor }]}
          onPress={handleBack}
        >
          <Text style={[styles.errorButtonText, { color: colors.background }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <MaterialCommunityIcons name="arrow-left" size={28} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Session Details</Text>
        {roadName && roadName.length > 0 && (
          <View style={[styles.roadBadge, { backgroundColor: accentColor + '15' }]}>
            <MaterialCommunityIcons name="map-marker" size={16} color={accentColor} />
            <Text style={[styles.roadText, { color: accentColor }]}>{roadName}</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Map Preview */}
        {gpsCoordinates.length > 0 && mapRegion && (
          <View style={[styles.mapContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MapView
              style={styles.map}
              initialRegion={mapRegion}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Polyline
                coordinates={gpsCoordinates.map(c => ({
                  latitude: c.latitude,
                  longitude: c.longitude,
                }))}
                strokeColor={accentColor}
                strokeWidth={4}
              />
              <Marker
                coordinate={{
                  latitude: gpsCoordinates[0].latitude,
                  longitude: gpsCoordinates[0].longitude,
                }}
                pinColor="green"
              />
              <Marker
                coordinate={{
                  latitude: gpsCoordinates[gpsCoordinates.length - 1].latitude,
                  longitude: gpsCoordinates[gpsCoordinates.length - 1].longitude,
                }}
                pinColor="red"
              />
            </MapView>

            {profile?.premium && (
              <TouchableOpacity
                style={styles.trackReplayButton}
                onPress={handleViewTrackReplay}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[accentColor, colors.background]}
                  style={styles.trackReplayGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialCommunityIcons name="play" size={20} color={colors.text} />
                  <Text style={[styles.trackReplayText, { color: colors.text }]}>
                    View Track Replay
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="timer" size={32} color={accentColor} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatDuration(sessionData.duration)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Duration</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="speedometer" size={32} color={colors.magenta} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {safeFormat(sessionData.maxSpeed, 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Top Speed (MPH)</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="arrow-up-bold" size={32} color={colors.lime} />
            <View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {`${safeFormat(sessionData.maxGForce, 2)}g`}
              </Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Max G-Force</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="chart-line" size={32} color={colors.cyan} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {safeFormat(sessionData.avgSpeed, 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Speed (MPH)</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="map-marker" size={32} color={accentColor} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {gpsCoordinates.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>GPS Points</Text>
          </View>
        </View>

        {/* Session Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Session Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date & Time</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {sessionData.timestamp 
                ? new Date(sessionData.timestamp).toLocaleString() 
                : 'Unknown'}
            </Text>
          </View>

          {roadName && roadName.length > 0 && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Location</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {roadName}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>GPS Tracking</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {gpsCoordinates.length > 0 ? '✅ Enabled' : '❌ Disabled'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.md,
  },
  errorText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  errorButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
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
  roadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  roadText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  mapContainer: {
    height: 250,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  map: {
    flex: 1,
  },
  trackReplayButton: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  trackReplayGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  trackReplayText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCard: {
    width: (width - SPACING.lg * 2 - SPACING.md) / 2,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
  },
  infoCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  infoTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.1)',
  },
  infoLabel: {
    fontSize: FONT_SIZE.sm,
  },
  infoValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
});