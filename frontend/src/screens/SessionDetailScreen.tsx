import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LogService from '../services/LogService';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { TelemetrySample, calculateStats, SessionStats } from '../utils/csv';
import { formatSpeed, formatGForce, formatTemp, formatAltitude, formatDuration } from '../utils/format';
import ChartView from '../components/ChartView';
import SessionShareCard from '../components/SessionShareCard';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { captureRef } from 'react-native-view-shot';

export default function SessionDetailScreen() {
  const { date, fileName } = useLocalSearchParams<{ date: string; fileName: string }>();
  const router = useRouter();
  const { settings } = useSettings();
  const { colors, getCurrentAccent } = useTheme();
  const { profile } = useAuth();
  const [samples, setSamples] = useState<TelemetrySample[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [hasGPS, setHasGPS] = useState(false);
  const shareCardRef = useRef<View>(null);
  const hasLoadedGPS = useRef(false);

  const accentColor = getCurrentAccent();

  useEffect(() => {
    loadSession();
  }, [date, fileName]);

  const loadSession = async () => {
    if (!date || !fileName) return;
    
    try {
      setIsLoading(true);
      const sessionMeta = {
        date: date as string,
        fileName: fileName as string,
        time: (fileName as string).replace('.csv', ''),
        filePath: `${date}/${fileName}`,
      };

      const data = await LogService.getSessionData(sessionMeta);
      setSamples(data);
      
      const calculatedStats = calculateStats(data);
      setStats(calculatedStats);

      // Check if GPS data exists for this session (only once)
      if (!hasLoadedGPS.current) {
        try {
          const gpsData = await LogService.getSessionGPS(sessionMeta);
          setHasGPS(gpsData.length > 0);
          hasLoadedGPS.current = true;
        } catch (error) {
          console.log('[SessionDetail] No GPS data available');
          setHasGPS(false);
          hasLoadedGPS.current = true;
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
      Alert.alert('Error', 'Failed to load session data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowShareModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to prepare share card');
    }
  };

  const handleShareSession = async () => {
    try {
      setIsGeneratingShare(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Wait a bit for the modal to render
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capture the share card as an image
      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1,
      });

      // Share the image
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowShareModal(false);
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share session');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const handleTrackReplay = () => {
    if (!profile?.premium) {
      Alert.alert(
        'Premium Feature',
        'Track Replay is available with ApexBox Pro Pack.',
        [
          { text: 'Maybe Later', style: 'cancel' },
          {
            text: 'Upgrade',
            onPress: () => router.push('/premium'),
          },
        ]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/track-replay',
      params: { date, fileName },
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={accentColor} style={styles.loader} />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>No data available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Session Details</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {date} • {fileName.replace('.csv', '')}
          </Text>
        </View>
        <TouchableOpacity onPress={handleExport} style={styles.exportButton}>
          <MaterialCommunityIcons name="share-variant" size={24} color={accentColor} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: accentColor }]}>
            <MaterialCommunityIcons name="speedometer" size={24} color={accentColor} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatSpeed(stats.peakSpeed, settings.units)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Top Speed</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="car-brake-alert" size={24} color={accentColor} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatGForce(stats.peakG)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Max G-Force</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="thermometer" size={24} color={accentColor} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatTemp(stats.maxTemp, settings.units)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Max Temp</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="clock-outline" size={24} color={accentColor} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatDuration(stats.duration)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Duration</Text>
          </View>
        </View>

        {/* Charts */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Speed Over Time</Text>
          <ChartView
            data={samples
              .filter(s => !isNaN(s.speed) && !isNaN(s.timestamp_ms))
              .map((s) => ({
                x: s.timestamp_ms,
                y: settings.units === 'imperial' ? s.speed * 0.621371 : s.speed,
              }))}
            color={accentColor}
            yAxisLabel={settings.units === 'imperial' ? 'mph' : 'km/h'}
          />
        </View>

        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>G-Force Over Time</Text>
          <ChartView
            data={samples
              .filter(s => !isNaN(s.g_force) && !isNaN(s.timestamp_ms))
              .map((s) => ({ x: s.timestamp_ms, y: s.g_force }))}
            color={colors.magenta}
            yAxisLabel="g"
          />
        </View>

          {/* Track Replay Button */}
          {hasGPS ? (
            <TouchableOpacity
              style={[styles.trackReplayButton, { borderColor: accentColor }]}
              onPress={handleTrackReplay}
            >
              <LinearGradient
                colors={[accentColor + '20', accentColor + '10']}
                style={styles.trackReplayGradient}
              >
                <View style={styles.trackReplayContent}>
                  <MaterialCommunityIcons name="map-marker-path" size={32} color={accentColor} />
                  <View style={styles.trackReplayText}>
                    <Text style={[styles.trackReplayTitle, { color: colors.text }]}>
                      View Track Replay
                    </Text>
                    <Text style={[styles.trackReplaySubtitle, { color: colors.textSecondary }]}>
                      GPS data available
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={accentColor} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ) : null}
      </ScrollView>

      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View ref={shareCardRef} collapsable={false}>
              <SessionShareCard
                date={date}
                time={fileName.replace('.csv', '')}
                stats={stats}
                settings={settings}
                profile={profile}
                accentColor={accentColor}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary, { borderColor: colors.border }]}
                onPress={() => setShowShareModal(false)}
                disabled={isGeneratingShare}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: accentColor }]}
                onPress={handleShareSession}
                disabled={isGeneratingShare}
              >
                {isGeneratingShare ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="share-variant" size={20} color={colors.text} />
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Share</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    marginTop: 4,
  },
  exportButton: {
    padding: SPACING.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: SPACING.sm,
  },
  statLabel: {
    fontSize: FONT_SIZE.sm,
    marginTop: 4,
  },
  chartCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  chartTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  trackReplayButton: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  trackReplayGradient: {
    padding: SPACING.lg,
  },
  trackReplayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  trackReplayText: {
    flex: 1,
  },
  trackReplayTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
  trackReplaySubtitle: {
    fontSize: FONT_SIZE.sm,
    marginTop: 2,
  },
  loader: {
    marginTop: 40,
  },
  errorText: {
    fontSize: FONT_SIZE.lg,
    textAlign: 'center',
    marginTop: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  modalButtonPrimary: {
    // backgroundColor set dynamically
  },
  modalButtonSecondary: {
    borderWidth: 1,
  },
  modalButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
});
