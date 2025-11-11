import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLogs } from '../contexts/LogsContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SessionListItem {
  date: string;
  fileName: string;
  duration: number;
  maxSpeed: number;
  maxGForce: number;
  hasGPS: boolean;
}

export default function LogsScreen() {
  const router = useRouter();
  const { sessions, isLoading, rescan, deleteSession } = useLogs();
  const { colors, getCurrentAccent } = useTheme();
  const { profile } = useAuth();
  const accentColor = getCurrentAccent();

  const [refreshing, setRefreshing] = useState(false);
  const [sessionsList, setSessionsList] = useState<SessionListItem[]>([]);

  useEffect(() => {
    // ✅ Only load if sessions exists and is an array
    if (sessions && Array.isArray(sessions)) {
      loadSessionsList();
    } else {
      setSessionsList([]);
    }
  }, [sessions]);

  const loadSessionsList = async () => {
    try {
      const list: SessionListItem[] = [];

      // ✅ Double-check sessions is valid before iterating
      if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
        console.log('[LogsScreen] No sessions to load');
        setSessionsList([]);
        return;
      }

      console.log('[LogsScreen] Loading metadata for', sessions.length, 'sessions');

      for (const session of sessions) {
        try {
          const sessionKey = `${session.date}/${session.fileName}`;
          
          // Load session metadata
          const metadataStr = await AsyncStorage.getItem(`session_${sessionKey}`);
          if (metadataStr) {
            const metadata = JSON.parse(metadataStr);
            
            // Check if GPS data exists
            const gpsDataStr = await AsyncStorage.getItem(`gps_${sessionKey}`);
            const hasGPS = gpsDataStr !== null && gpsDataStr !== 'null' && JSON.parse(gpsDataStr).length > 0;
            
            list.push({
              date: session.date,
              fileName: session.fileName,
              duration: metadata.duration || 0,
              maxSpeed: metadata.maxSpeed || 0,
              maxGForce: metadata.maxGForce || 0,
              hasGPS,
            });
          }
        } catch (sessionError) {
          console.warn('[LogsScreen] Error loading session:', session.fileName, sessionError);
          // Continue with next session
        }
      }

      console.log('[LogsScreen] Loaded', list.length, 'sessions with metadata');
      setSessionsList(list);
    } catch (error) {
      console.error('[LogsScreen] Error loading sessions list:', error);
      // ✅ Set empty list on error to prevent cascading failures
      setSessionsList([]);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await rescan();
    await loadSessionsList();
    setRefreshing(false);
  };

  const handleDeleteSession = async (session: SessionListItem) => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await deleteSession(session.date, session.fileName);
            await loadSessionsList();
          },
        },
      ]
    );
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Session Logs</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {sessionsList.length} {sessionsList.length === 1 ? 'session' : 'sessions'}
        </Text>
        {profile?.premium && (
          <View style={[styles.proBadge, { backgroundColor: accentColor }]}>
            <MaterialCommunityIcons name="crown" size={14} color={colors.background} />
            <Text style={[styles.proBadgeText, { color: colors.background }]}>PRO</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={accentColor}
            colors={[accentColor]}
          />
        }
      >
        {isLoading ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="loading" size={48} color={accentColor} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Loading sessions...
            </Text>
          </View>
        ) : sessionsList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="file-document-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Sessions Yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Start recording your first driving session from the Dashboard
            </Text>
          </View>
        ) : (
          sessionsList.map((session, index) => (
            <TouchableOpacity
              key={`${session.date}-${session.fileName}-${index}`}
              style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: '/session-details',
                  params: {
                    date: session.date,
                    fileName: session.fileName,
                  },
                });
              }}
              activeOpacity={0.7}
            >
              {/* Session Header */}
              <View style={styles.sessionHeader}>
                <View style={styles.sessionHeaderLeft}>
                  <MaterialCommunityIcons name="calendar" size={16} color={accentColor} />
                  <Text style={[styles.sessionDate, { color: colors.text }]}>
                    {formatDate(session.date)}
                  </Text>
                </View>
                <Text style={[styles.sessionTime, { color: colors.textSecondary }]}>
                  {formatTime(session.date)}
                </Text>
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="timer" size={18} color={colors.cyan} />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {formatDuration(session.duration)}
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="speedometer" size={18} color={colors.magenta} />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {session.maxSpeed.toFixed(0)} MPH
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="arrow-up-bold" size={18} color={colors.lime} />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {session.maxGForce.toFixed(2)}g
                  </Text>
                </View>
              </View>

              {/* GPS Badge */}
              {session.hasGPS && (
                <View style={styles.badgeContainer}>
                  <View style={[styles.gpsBadge, { backgroundColor: colors.lime + '15' }]}>
                    <MaterialCommunityIcons name="map-marker" size={14} color={colors.lime} />
                    <Text style={[styles.gpsBadgeText, { color: colors.lime }]}>GPS Tracked</Text>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: colors.border }]}
                  onPress={async (e) => {
                    e.stopPropagation();
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push({
                      pathname: '/session-details',
                      params: {
                        date: session.date,
                        fileName: session.fileName,
                      },
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="eye" size={16} color={accentColor} />
                  <Text style={[styles.actionButtonText, { color: accentColor }]}>View</Text>
                </TouchableOpacity>

                {session.hasGPS && profile?.premium && (
                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: colors.border }]}
                    onPress={async (e) => {
                      e.stopPropagation();
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      router.push({
                        pathname: '/track-replay',
                        params: {
                          date: session.date,
                          fileName: session.fileName,
                        },
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="play" size={16} color={colors.cyan} />
                    <Text style={[styles.actionButtonText, { color: colors.cyan }]}>Replay</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: colors.border }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteSession(session);
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="delete" size={16} color={colors.magenta} />
                  <Text style={[styles.actionButtonText, { color: colors.magenta }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
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
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    marginTop: SPACING.sm,
  },
  proBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 3,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    marginTop: SPACING.lg,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  sessionCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sessionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  sessionDate: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  sessionTime: {
    fontSize: FONT_SIZE.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statValue: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  badgeContainer: {
    marginBottom: SPACING.sm,
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
  },
  gpsBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  actionButtonText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
});