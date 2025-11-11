import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ScrollView, // ✅ ADD THIS
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GeocodingService from '../services/GeocodingService';

const safeFormat = (value: any, decimals: number = 0, fallback: string = '--'): string => {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return fallback;
  return num.toFixed(decimals);
};

const { width, height } = Dimensions.get('window');

interface GPSPoint {
  lat: number;
  lon: number;
  speed: number;
  gForce: number;
  timestamp: number;
}

// Downsample GPS points for display
const downsamplePoints = (points: GPSPoint[], maxPoints: number = 200): GPSPoint[] => {
  if (points.length <= maxPoints) return points;
  
  const step = Math.floor(points.length / maxPoints);
  const downsampled: GPSPoint[] = [];
  
  for (let i = 0; i < points.length; i += step) {
    downsampled.push(points[i]);
  }
  
  if (downsampled[downsampled.length - 1] !== points[points.length - 1]) {
    downsampled.push(points[points.length - 1]);
  }
  
  return downsampled;
};

// Mock GPS data for demonstration
const generateMockGPSData = (): GPSPoint[] => {
  const points: GPSPoint[] = [];
  const centerLat = 37.7749;
  const centerLon = -122.4194;
  const numPoints = 100;

  for (let i = 0; i < numPoints; i++) {
    const t = (i / numPoints) * Math.PI * 4;
    const radius = 0.008;
    
    const lat = centerLat + radius * Math.sin(t);
    const lon = centerLon + radius * Math.sin(t) * Math.cos(t);
    
    const curvature = Math.abs(Math.cos(t * 2));
    const speed = 40 + curvature * 80;
    const gForce = 0.3 + curvature * 2.5;
    
    points.push({
      lat,
      lon,
      speed,
      gForce,
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
  const [loading, setLoading] = useState(true);
  const [currentRoadName, setCurrentRoadName] = useState<string>('');
  const hasLoadedData = useRef(false);

  useEffect(() => {
    if (!hasLoadedData.current) {
      loadGPSData();
      hasLoadedData.current = true;
    }
  }, []);

  // Update road name when position changes
  useEffect(() => {
    const updateRoadName = async () => {
      if (gpsData.length > 0 && currentIndex < gpsData.length) {
        const point = gpsData[currentIndex];
        const roadName = await GeocodingService.getRoadName(point.lat, point.lon);
        setCurrentRoadName(roadName || '');
      }
    };

    updateRoadName();
  }, [currentIndex, gpsData]);

  const loadGPSData = async () => {
    try {
      setLoading(true);
      
      const date = params.date as string;
      const fileName = params.fileName as string;
      let data: GPSPoint[] = [];
      
      if (date && fileName) {
        const sessionKey = `${date}/${fileName}`;
        console.log('[TrackReplay] Loading GPS data for session:', sessionKey);
        const gpsDataStr = await AsyncStorage.getItem(`gps_${sessionKey}`);
        
        if (gpsDataStr) {
          const gpsCoords = JSON.parse(gpsDataStr);
          data = gpsCoords.map((coord: any, index: number) => ({
            lat: coord.latitude,
            lon: coord.longitude,
            speed: coord.speed || 0,
            gForce: 0,
            timestamp: coord.timestamp,
          }));
          
          console.log('[TrackReplay] Loaded', data.length, 'GPS points from session');
        }
      }
      
      if (data.length === 0) {
        console.log('[TrackReplay] Using mock GPS data');
        data = generateMockGPSData();
      }
      
      const displayData = downsamplePoints(data, 200);
      setGpsData(displayData);

      if (displayData.length > 0) {
        const lats = displayData.map(p => p.lat);
        const lons = displayData.map(p => p.lon);
        const padding = 0.0005;
        
        setMapBounds({
          minLat: Math.min(...lats) - padding,
          maxLat: Math.max(...lats) + padding,
          minLon: Math.min(...lons) - padding,
          maxLon: Math.max(...lons) + padding,
        });
      }
    } catch (error) {
      console.error('[TrackReplay] Error loading GPS data:', error);
      const data = generateMockGPSData();
      setGpsData(data);
      
      const lats = data.map(p => p.lat);
      const lons = data.map(p => p.lon);
      setMapBounds({
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLon: Math.min(...lons),
        maxLon: Math.max(...lons),
      });
    } finally {
      setLoading(false);
    }
  };

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
    const canvasWidth = width - 80;
    const canvasHeight = 400;

    const x = ((lon - mapBounds.minLon) / (mapBounds.maxLon - mapBounds.minLon)) * canvasWidth;
    const y = ((mapBounds.maxLat - lat) / (mapBounds.maxLat - mapBounds.minLat)) * canvasHeight;

    return { x, y };
  };

  const getColorForGForce = (gForce: number): string => {
    if (gForce < 0.5) return '#0080FF';
    if (gForce < 1.0) return '#00D4FF';
    if (gForce < 1.5) return '#00FF88';
    if (gForce < 2.0) return '#FFAA00';
    return '#FF0055';
  };

  const pathData = useMemo(() => {
    if (gpsData.length === 0) return '';
    
    const points = gpsData.map((point) => {
      const { x, y } = convertToCanvasCoords(point.lat, point.lon);
      return { x, y };
    });

    return points
      .map((point, i) => (i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
      .join(' ');
  }, [gpsData, mapBounds]);

  const currentPathData = useMemo(() => {
    if (gpsData.length === 0 || currentIndex === 0) return '';
    
    const points = gpsData.slice(0, currentIndex + 1).map((point) => {
      const { x, y } = convertToCanvasCoords(point.lat, point.lon);
      return { x, y };
    });

    return points
      .map((point, i) => (i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
      .join(' ');
  }, [gpsData, currentIndex, mapBounds]);

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

  // ✅ Main render (after premium check passes)
  const currentPoint = gpsData[currentIndex];
  const currentCoords = currentPoint ? convertToCanvasCoords(currentPoint.lat, currentPoint.lon) : { x: 0, y: 0 };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <MaterialCommunityIcons name="arrow-left" size={28} color={colors.text} />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Track Replay</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>GPS Path Visualization</Text>
        </View>

        {/* Road Name Display */}
        {currentRoadName && currentRoadName.length > 0 && (
          <View style={[styles.roadNameBanner, { backgroundColor: accentColor + '15', borderColor: accentColor }]}>
            <MaterialCommunityIcons name="map-marker-path" size={20} color={accentColor} />
            <Text style={[styles.roadNameText, { color: accentColor }]}>{currentRoadName}</Text>
          </View>
        )}

        <View style={[styles.canvasContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {loading ? (
            <View style={styles.placeholderContainer}>
              <MaterialCommunityIcons name="loading" size={48} color={accentColor} />
              <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                Loading GPS data...
              </Text>
            </View>
          ) : gpsData.length === 0 ? (
            <View style={styles.placeholderContainer}>
              <MaterialCommunityIcons name="map-marker-off" size={64} color={colors.textSecondary} />
              <Text style={[styles.placeholderTitle, { color: colors.text }]}>No GPS Data</Text>
              <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                This session doesn't have GPS tracking data
              </Text>
            </View>
          ) : (
            <Svg
              width={width - 80}
              height={400}
              viewBox={`0 0 ${width - 80} 400`}
              style={styles.svg}
            >
              {/* Full track path (dimmed) */}
              <Path
                d={pathData}
                stroke={colors.textTertiary}
                strokeWidth={3}
                strokeOpacity={0.2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Current path with G-force coloring */}
              {currentIndex > 0 && (
                <>
                  {gpsData.slice(0, currentIndex).map((point, i) => {
                    if (i === 0) return null;
                    
                    const prevPoint = gpsData[i - 1];
                    const start = convertToCanvasCoords(prevPoint.lat, prevPoint.lon);
                    const end = convertToCanvasCoords(point.lat, point.lon);
                    const color = getColorForGForce(point.gForce);
                    
                    return (
                      <Path
                        key={`segment-${i}`}
                        d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`}
                        stroke={color}
                        strokeWidth={4}
                        fill="none"
                        strokeLinecap="round"
                      />
                    );
                  })}
                </>
              )}

              {/* Current position marker */}
              {currentPoint && (
                <G>
                  <Circle
                    cx={currentCoords.x}
                    cy={currentCoords.y}
                    r={12}
                    fill={accentColor}
                    opacity={0.3}
                  />
                  <Circle
                    cx={currentCoords.x}
                    cy={currentCoords.y}
                    r={6}
                    fill={accentColor}
                  />
                </G>
              )}

              {/* Start marker */}
              {gpsData.length > 0 && (
                <Circle
                  cx={convertToCanvasCoords(gpsData[0].lat, gpsData[0].lon).x}
                  cy={convertToCanvasCoords(gpsData[0].lat, gpsData[0].lon).y}
                  r={8}
                  fill="#00FF88"
                  stroke={colors.card}
                  strokeWidth={2}
                />
              )}

              {/* End marker */}
              {gpsData.length > 0 && (
                <Circle
                  cx={convertToCanvasCoords(gpsData[gpsData.length - 1].lat, gpsData[gpsData.length - 1].lon).x}
                  cy={convertToCanvasCoords(gpsData[gpsData.length - 1].lat, gpsData[gpsData.length - 1].lon).y}
                  r={8}
                  fill="#FF0055"
                  stroke={colors.card}
                  strokeWidth={2}
                />
              )}
            </Svg>
          )}
        </View>

        {currentPoint && (
          <View style={[styles.statsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="speedometer" size={24} color={accentColor} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {safeFormat(currentPoint.speed, 0)} km/h
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Speed</Text>
            </View>

            <View style={styles.statItem}>
              <MaterialCommunityIcons name="arrow-up-bold" size={24} color={getColorForGForce(currentPoint.gForce)} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {safeFormat(currentPoint.gForce, 2)}g
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
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
  roadNameBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    gap: SPACING.sm,
  },
  roadNameText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    flex: 1,
  },
  canvasContainer: {
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
    height: 480,
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    marginVertical: 40,
  },
  placeholderContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: SPACING.lg,
  },
  placeholderText: {
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    marginTop: SPACING.sm,
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