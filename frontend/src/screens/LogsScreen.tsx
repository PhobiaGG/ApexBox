import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLogs } from '../contexts/LogsContext';
import { useBle } from '../contexts/BleContext';
import { useSettings } from '../contexts/SettingsContext';
import { useRouter } from 'expo-router';
import { convertSpeed, getSpeedUnit } from '../utils/format';
import * as Haptics from 'expo-haptics';
import Sparkline from '../components/Sparkline';
import LogService, { SessionMetadata } from '../services/LogService';
import { LogCardSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import ErrorHandler from '../utils/errorHandler';

type SortMode = 'date' | 'peakSpeed' | 'duration';

export default function LogsScreen() {
  const { sessionsByDate, isLoading, rescan } = useLogs();
  const { status, sendCommand } = useBle();
  const { settings } = useSettings();
  const router = useRouter();
  const isMetric = settings.units === 'metric';
  
  console.log('[LogsScreen] Settings units:', settings.units, 'isMetric:', isMetric);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [deletingSession, setDeletingSession] = useState<string | null>(null);

  const dates = Object.keys(sessionsByDate).sort().reverse();

  const toggleDate = async (date: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const handleSessionPress = async (date: string, fileName: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/session-detail',
      params: { date, fileName },
    });
  };

  const handleRescan = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await rescan();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Rescan Complete', 'Logs directory has been rescanned');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await rescan();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRefreshing(false);
  };

  const handleDeleteSession = (session: SessionMetadata) => {
    const isConnected = status === 'connected';
    
    const message = isConnected
      ? `Delete this session?\n\nThis will remove:\n• Local app data\n• Files from ApexBox SD card\n\nThis action cannot be undone.`
      : `Delete this session?\n\n⚠️ ApexBox is not connected.\n\nThis will only remove the local app data. The file will remain on the ApexBox SD card until you connect and delete it manually.\n\nContinue?`;

    Alert.alert(
      'Delete Session',
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await performDelete(session, isConnected);
          },
        },
      ]
    );
  };

  const performDelete = async (session: SessionMetadata, isConnected: boolean) => {
    try {
      setDeletingSession(session.fileName);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Delete from local storage
      await LogService.deleteSession(session);

      // If connected to ApexBox, also delete from SD card
      if (isConnected) {
        try {
          await LogService.deleteFromApexBox(session, sendCommand);
        } catch (error) {
          console.error('[LogsScreen] Error deleting from ApexBox:', error);
          // Continue even if ApexBox deletion fails
        }
      }

      // Refresh the logs list
      await rescan();

      const successMessage = isConnected
        ? 'Session deleted from app and ApexBox'
        : 'Session deleted from app (ApexBox not connected)';
      
      await ErrorHandler.success(successMessage);
    } catch (error) {
      console.error('[LogsScreen] Error deleting session:', error);
      ErrorHandler.handle(error, {
        label: 'Try Again',
        onPress: () => performDelete(session, isConnected)
      });
    } finally {
      setDeletingSession(null);
    }
  };

  // Show loading skeletons while loading
  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[COLORS.background, '#0F0F0F']} style={styles.gradient}>
          <View style={styles.header}>
            <Text style={styles.title}>Session Logs</Text>
            <TouchableOpacity onPress={handleRescan} style={styles.headerButton}>
              <MaterialCommunityIcons name="refresh" size={24} color={COLORS.cyan} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <LogCardSkeleton />
            <LogCardSkeleton />
            <LogCardSkeleton />
            <LogCardSkeleton />
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  // Show empty state if no sessions
  if (dates.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[COLORS.background, '#0F0F0F']} style={styles.gradient}>
          <View style={styles.header}>
            <Text style={styles.title}>Session Logs</Text>
            <TouchableOpacity onPress={handleRescan} style={styles.headerButton}>
              <MaterialCommunityIcons name="refresh" size={24} color={COLORS.cyan} />
            </TouchableOpacity>
          </View>
          <EmptyState
            icon="file-document-outline"
            title="No Sessions Yet"
            message="Start recording by connecting your ApexBox and tapping 'Start Analysis' on the Dashboard"
            actionLabel="Refresh"
            onAction={handleRescan}
            accentColor={COLORS.cyan}
          />
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#0F0F0F']} style={styles.gradient}>
        <View style={styles.header}>
          <Text style={styles.title}>Session Logs</Text>
          <TouchableOpacity onPress={handleRescan} style={styles.headerButton}>
            <MaterialCommunityIcons name="refresh" size={24} color={COLORS.cyan} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.cyan}
              colors={[COLORS.cyan, COLORS.magenta, COLORS.lime]}
            />
          }
        >
          {dates.map(date => {
            const isExpanded = expandedDates.has(date);
            const sessions = sessionsByDate[date];

            return (
              <View key={date} style={styles.dateSection}>
                <TouchableOpacity
                  style={styles.dateHeader}
                  onPress={() => toggleDate(date)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dateLeft}>
                    <MaterialCommunityIcons name="calendar" size={20} color={COLORS.cyan} />
                    <Text style={styles.dateText}>{date}</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{sessions.length}</Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.sessionsList}>
                    {sessions.map(session => {
                      // Generate sparkline data with unit conversion
                      const sparklineData = session.stats
                        ? [
                            convertSpeed(session.stats.avgSpeed * 0.7, isMetric),
                            convertSpeed(session.stats.peakSpeed * 0.85, isMetric),
                            convertSpeed(session.stats.peakSpeed, isMetric),
                            convertSpeed(session.stats.peakSpeed * 0.9, isMetric),
                            convertSpeed(session.stats.avgSpeed * 0.8, isMetric),
                          ]
                        : [];

                      const isDeleting = deletingSession === session.fileName;

                      return (
                        <View key={session.fileName} style={styles.sessionItem}>
                          <TouchableOpacity
                            style={styles.sessionCard}
                            onPress={() => handleSessionPress(date, session.fileName)}
                            activeOpacity={0.7}
                            disabled={isDeleting}
                          >
                            <LinearGradient
                              colors={[COLORS.card, COLORS.background]}
                              style={styles.sessionGradient}
                            >
                              <View style={styles.sessionHeader}>
                                <View style={styles.sessionLeft}>
                                  <MaterialCommunityIcons
                                    name="timer-outline"
                                    size={18}
                                    color={COLORS.textSecondary}
                                  />
                                  <Text style={styles.sessionTime}>{session.time}</Text>
                                </View>

                                {session.stats && (
                                  <View style={styles.sessionStats}>
                                    <View style={styles.statChip}>
                                      <MaterialCommunityIcons
                                        name="speedometer"
                                        size={14}
                                        color={COLORS.cyan}
                                      />
                                      <Text style={[styles.statChipText, { color: COLORS.cyan }]}>
                                        {convertSpeed(session.stats.peakSpeed, isMetric).toFixed(0)}
                                      </Text>
                                    </View>
                                    <View style={styles.statChip}>
                                      <MaterialCommunityIcons
                                        name="clock-outline"
                                        size={14}
                                        color={COLORS.magenta}
                                      />
                                      <Text style={[styles.statChipText, { color: COLORS.magenta }]}>
                                        {Math.floor(session.stats.duration)}s
                                      </Text>
                                    </View>
                                  </View>
                                )}
                              </View>

                              {sparklineData.length > 0 && (
                                <View style={styles.sparklineContainer}>
                                  <Sparkline
                                    data={sparklineData}
                                    width={280}
                                    height={40}
                                    color={COLORS.lime}
                                    lineWidth={2}
                                  />
                                </View>
                              )}

                              <View style={styles.sessionFooter}>
                                <Text style={styles.sessionHint}>Tap to view details</Text>
                                <MaterialCommunityIcons
                                  name="chevron-right"
                                  size={18}
                                  color={COLORS.textTertiary}
                                />
                              </View>
                            </LinearGradient>
                          </TouchableOpacity>

                          {/* Delete Button */}
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteSession(session)}
                            disabled={isDeleting}
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons
                              name={isDeleting ? "loading" : "trash-can-outline"}
                              size={20}
                              color={isDeleting ? COLORS.textSecondary : COLORS.danger}
                            />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
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
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerButton: {
    padding: SPACING.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  dateSection: {
    marginBottom: SPACING.md,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dateText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: COLORS.cyan,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.background,
    fontWeight: 'bold',
  },
  sessionsList: {
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sessionCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sessionGradient: {
    flexDirection: 'column',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sessionStats: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  statChipText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  sparklineContainer: {
    marginVertical: SPACING.xs,
    borderRadius: 8,
    overflow: 'hidden',
  },
  sessionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
  },
  sessionTime: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.text,
    fontWeight: 'bold',
    marginTop: SPACING.lg,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  refreshButton: {
    marginTop: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  refreshGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  refreshButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    fontWeight: 'bold',
  },
});