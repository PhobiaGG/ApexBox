import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import UserAvatar from '../components/UserAvatar';
import * as Haptics from 'expo-haptics';

interface CrewMember {
  uid: string;
  displayName: string;
  avatarURI?: string;
  topSpeed: number;
  totalSessions: number;
}

interface Crew {
  id: string;
  name: string;
  description: string;
  code: string;
  adminId: string;
  memberIds: string[];
  members: CrewMember[];
  createdAt: number;
}

export default function GroupDetailScreen() {
  const router = useRouter();
  const { crewId } = useLocalSearchParams<{ crewId: string }>();
  const { profile, user, leaveCrew } = useAuth();
  const { colors, getCurrentAccent } = useTheme();
  const accentColor = getCurrentAccent();

  const [crew, setCrew] = useState<Crew | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCrewDetails();
  }, [crewId]);

  const loadCrewDetails = async () => {
    try {
      setIsLoading(true);
      
      // Import Firebase functions
      const { getDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      const crewDoc = await getDoc(doc(db, 'crews', crewId));
      
      if (crewDoc.exists()) {
        const crewData = {
          id: crewDoc.id,
          ...crewDoc.data(),
        } as Crew;
        
        setCrew(crewData);
        console.log('[GroupDetail] Loaded crew:', crewData.name);
      } else {
        Alert.alert('Error', 'Crew not found');
        router.back();
      }
    } catch (error) {
      console.error('[GroupDetail] Error loading crew:', error);
      Alert.alert('Error', 'Failed to load crew details');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await loadCrewDetails();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLeaveCrew = async () => {
    if (!crew) return;
    
    Alert.alert(
      'Leave Crew',
      `Are you sure you want to leave "${crew.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await leaveCrew(crew.id);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'You have left the crew');
              router.back();
            } catch (error: any) {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', error.message || 'Failed to leave crew');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading crew...
          </Text>
        </View>
      </View>
    );
  }

  if (!crew) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.text }]}>Crew not found</Text>
        </View>
      </View>
    );
  }

  const isAdmin = crew.adminId === user?.uid;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>{crew.name}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
            colors={[accentColor]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Crew Info Card */}
        <View style={[styles.crewInfoCard, { backgroundColor: colors.card, borderColor: accentColor }]}>
          <View style={styles.crewInfoHeader}>
            <MaterialCommunityIcons name="shield-account" size={40} color={accentColor} />
            {isAdmin && (
              <View style={[styles.adminBadge, { backgroundColor: accentColor }]}>
                <MaterialCommunityIcons name="shield-crown" size={14} color={colors.text} />
                <Text style={[styles.adminBadgeText, { color: colors.text }]}>ADMIN</Text>
              </View>
            )}
          </View>
          
          {crew.description ? (
            <Text style={[styles.crewDescription, { color: colors.textSecondary }]}>
              {crew.description}
            </Text>
          ) : null}

          <View style={[styles.statsRow, { borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="account-group" size={24} color={accentColor} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {crew.memberIds?.length || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Members</Text>
            </View>
            
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="trophy" size={24} color={accentColor} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {crew.members?.length || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
            </View>
          </View>

          <View style={[styles.crewCodeContainer, { backgroundColor: colors.background, borderColor: accentColor }]}>
            <Text style={[styles.crewCodeLabel, { color: colors.textSecondary }]}>Crew Code:</Text>
            <Text style={[styles.crewCode, { color: accentColor }]}>{crew.code}</Text>
          </View>
        </View>

        {/* Leaderboard Section */}
        <View style={styles.leaderboardSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Crew Leaderboard</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Top performers this month
          </Text>

          {crew.members && crew.members.length > 0 ? (
            crew.members
              .sort((a, b) => (b.topSpeed || 0) - (a.topSpeed || 0))
              .map((member, index) => (
                <View
                  key={member.uid}
                  style={[
                    styles.memberCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: index === 0 ? accentColor : colors.border,
                      borderWidth: index === 0 ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.rankContainer}>
                    {index < 3 ? (
                      <View style={[styles.crownContainer, { backgroundColor: accentColor + '20' }]}>
                        <Text style={styles.crownText}>
                          {index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.rankNumber, { color: colors.textSecondary }]}>
                        #{index + 1}
                      </Text>
                    )}
                  </View>

                  <UserAvatar name={member.displayName} size={48} uri={member.avatarURI ?? null} />

                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.text }]}>
                      {member.displayName}
                      {member.uid === user?.uid ? ' (You)' : ''}
                    </Text>
                    <Text style={[styles.memberSessions, { color: colors.textSecondary }]}>
                      {member.totalSessions || 0} sessions
                    </Text>
                  </View>

                  <View style={styles.speedContainer}>
                    <Text style={[styles.speedValue, { color: accentColor }]}>
                      {member.topSpeed || 0}
                    </Text>
                    <Text style={[styles.speedUnit, { color: colors.textSecondary }]}>km/h</Text>
                  </View>
                </View>
              ))
          ) : (
            <View style={styles.emptyLeaderboard}>
              <MaterialCommunityIcons name="trophy-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No leaderboard data yet
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
                Complete sessions to appear on the leaderboard
              </Text>
            </View>
          )}
        </View>

        {/* Leave Crew Button */}
        <TouchableOpacity
          style={[styles.leaveButton, { borderColor: colors.magenta, backgroundColor: colors.card }]}
          onPress={handleLeaveCrew}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="exit-to-app" size={20} color={colors.magenta} />
          <Text style={[styles.leaveButtonText, { color: colors.magenta }]}>Leave Crew</Text>
        </TouchableOpacity>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: SPACING.md,
  },
  crewInfoCard: {
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    marginBottom: SPACING.lg,
  },
  crewInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  adminBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
  },
  crewDescription: {
    fontSize: FONT_SIZE.md,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: SPACING.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    marginTop: 4,
  },
  crewCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  crewCodeLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  crewCode: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  leaderboardSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.lg,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  crownContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownText: {
    fontSize: 20,
  },
  rankNumber: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
  memberSessions: {
    fontSize: FONT_SIZE.sm,
    marginTop: 2,
  },
  speedContainer: {
    alignItems: 'flex-end',
  },
  speedValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  speedUnit: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  emptyLeaderboard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyHint: {
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  leaveButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
});
