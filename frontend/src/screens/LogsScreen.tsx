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
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Sparkline from '../components/Sparkline';

type SortMode = 'date' | 'peakSpeed' | 'duration';

export default function LogsScreen() {
  const { sessionsByDate, isLoading, rescan } = useLogs();
  const router = useRouter();
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('date');

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

          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="folder-open" size={80} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>No Logs Found</Text>
            <Text style={styles.emptyText}>Connect your ApexBox and sync logs to get started</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={handleRescan}>
              <LinearGradient colors={[COLORS.cyan, '#0088AA']} style={styles.refreshGradient}>
                <MaterialCommunityIcons name="refresh" size={20} color={COLORS.text} />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
                      // Generate sparkline data (simplified for now - use actual session data when available)
                      const sparklineData = session.stats
                        ? [
                            session.stats.avgSpeed * 0.7,
                            session.stats.peakSpeed * 0.85,
                            session.stats.peakSpeed,
                            session.stats.peakSpeed * 0.9,
                            session.stats.avgSpeed * 0.8,
                          ]
                        : [];

                      return (
                        <TouchableOpacity
                          key={session.fileName}
                          style={styles.sessionItem}
                          onPress={() => handleSessionPress(date, session.fileName)}
                          activeOpacity={0.7}
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
                                      {session.stats.peakSpeed.toFixed(0)}
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
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sessionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
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