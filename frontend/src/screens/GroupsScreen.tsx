import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import UserAvatar from '../components/UserAvatar';
import * as Haptics from 'expo-haptics';

interface LeaderboardEntry {
  uid: string;
  displayName: string;
  avatarURI?: string;
  fastestSpeed: number;
  avgGForce: number;
  totalSessions: number;
}

interface Crew {
  id: string;
  name: string;
  members: string[];
  leaderboard: LeaderboardEntry[];
  createdAt: number;
}

// Animated Crown Component
function AnimatedCrown({ color, size = 14 }: { color: string; size?: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Pulsing animation
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <MaterialCommunityIcons name="crown" size={size} color={color} />
    </Animated.View>
  );
}

// Mock crew data for demonstration
const generateMockCrews = (): Crew[] => [
  {
    id: 'crew1',
    name: 'Speed Demons',
    members: ['user1', 'user2', 'user3', 'user4'],
    leaderboard: [
      {
        uid: 'user1',
        displayName: 'RacerX',
        fastestSpeed: 245,
        avgGForce: 2.1,
        totalSessions: 42,
      },
      {
        uid: 'user2',
        displayName: 'TurboTim',
        fastestSpeed: 238,
        avgGForce: 1.9,
        totalSessions: 38,
      },
      {
        uid: 'user3',
        displayName: 'NitroNina',
        fastestSpeed: 232,
        avgGForce: 1.8,
        totalSessions: 35,
      },
      {
        uid: 'user4',
        displayName: 'ApexAce',
        fastestSpeed: 228,
        avgGForce: 1.7,
        totalSessions: 30,
      },
    ],
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'crew2',
    name: 'Track Warriors',
    members: ['user5', 'user6', 'user7'],
    leaderboard: [
      {
        uid: 'user5',
        displayName: 'DriftKing',
        fastestSpeed: 215,
        avgGForce: 2.3,
        totalSessions: 28,
      },
      {
        uid: 'user6',
        displayName: 'CornerCarver',
        fastestSpeed: 210,
        avgGForce: 2.2,
        totalSessions: 25,
      },
      {
        uid: 'user7',
        displayName: 'SpeedSeeker',
        fastestSpeed: 205,
        avgGForce: 2.0,
        totalSessions: 22,
      },
    ],
    createdAt: Date.now() - 86400000 * 15,
  },
];

export default function GroupsScreen() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const { colors, getCurrentAccent } = useTheme();
  const accentColor = getCurrentAccent();

  const [crews, setCrews] = useState<Crew[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<Crew | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friendUID, setFriendUID] = useState('');

  useEffect(() => {
    loadCrews();
  }, []);

  const loadCrews = async () => {
    try {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setCrews(generateMockCrews());
      if (generateMockCrews().length > 0) {
        setSelectedCrew(generateMockCrews()[0]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await loadCrews();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddFriend = async () => {
    if (!friendUID.trim()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Please enter a friend ID');
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Success', 'Friend added to crew!');
    setShowAddFriendModal(false);
    setFriendUID('');
  };

  // Premium gate
  if (!profile?.premium) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Crew Leaderboards</Text>
        </View>

        <View style={styles.lockedContainer}>
          <View style={[styles.lockIconContainer, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons name="lock" size={64} color={colors.textSecondary} />
          </View>
          <Text style={[styles.lockedTitle, { color: colors.text }]}>Premium Feature</Text>
          <Text style={[styles.lockedSubtitle, { color: colors.textSecondary }]}>
            Crew Leaderboards are available with ApexBox Pro Pack
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Crew Leaderboards</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Crew Leaderboards</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.card, borderColor: accentColor }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAddFriendModal(true);
          }}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="account-plus" size={24} color={accentColor} />
        </TouchableOpacity>
      </View>

      {/* Crew Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.crewTabs}
        contentContainerStyle={styles.crewTabsContent}
      >
        {crews.map(crew => (
          <TouchableOpacity
            key={crew.id}
            style={[
              styles.crewTab,
              { backgroundColor: colors.card, borderColor: colors.border },
              selectedCrew?.id === crew.id && { borderColor: accentColor, borderWidth: 2 },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedCrew(crew);
            }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="shield-account"
              size={24}
              color={selectedCrew?.id === crew.id ? accentColor : colors.textSecondary}
            />
            <Text
              style={[
                styles.crewTabText,
                { color: selectedCrew?.id === crew.id ? colors.text : colors.textSecondary },
              ]}
            >
              {crew.name}
            </Text>
            <View style={[styles.memberBadge, { backgroundColor: accentColor }]}>
              <Text style={[styles.memberBadgeText, { color: colors.background }]}>
                {crew.members.length}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Leaderboard */}
      {selectedCrew && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.statsHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.statColumn}>
              <MaterialCommunityIcons name="speedometer" size={20} color={accentColor} />
              <Text style={[styles.statHeaderText, { color: colors.textSecondary }]}>Fastest</Text>
            </View>
            <View style={styles.statColumn}>
              <MaterialCommunityIcons name="arrow-up-bold" size={20} color={accentColor} />
              <Text style={[styles.statHeaderText, { color: colors.textSecondary }]}>Avg G</Text>
            </View>
            <View style={styles.statColumn}>
              <MaterialCommunityIcons name="chart-line" size={20} color={accentColor} />
              <Text style={[styles.statHeaderText, { color: colors.textSecondary }]}>Sessions</Text>
            </View>
          </View>

          {selectedCrew.leaderboard.map((entry, index) => (
            <View
              key={entry.uid}
              style={[
                styles.leaderboardEntry,
                { backgroundColor: colors.card, borderColor: colors.border },
                index === 0 && { borderColor: accentColor, borderWidth: 2 },
              ]}
            >
              <View style={styles.entryLeft}>
                <View style={[styles.rankBadge, index === 0 && { backgroundColor: accentColor }]}>
                  <Text
                    style={[
                      styles.rankText,
                      { color: index === 0 ? colors.background : colors.textSecondary },
                    ]}
                  >
                    #{index + 1}
                  </Text>
                </View>
                <UserAvatar
                  uri={entry.avatarURI || null}
                  name={entry.displayName || 'Driver'}
                  size={48}
                  borderColor={accentColor}
                />
                <View style={styles.entryInfo}>
                  <Text style={[styles.entryName, { color: colors.text }]}>{entry.displayName}</Text>
                  {index === 0 && (
                    <View style={styles.crownBadge}>
                      <MaterialCommunityIcons name="crown" size={14} color={accentColor} />
                      <Text style={[styles.crownText, { color: accentColor }]}>Leader</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.entryStats}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {entry.fastestSpeed}
                </Text>
                <Text style={[styles.statUnit, { color: colors.textSecondary }]}>km/h</Text>
              </View>

              <View style={styles.entryStats}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {entry.avgGForce.toFixed(1)}
                </Text>
                <Text style={[styles.statUnit, { color: colors.textSecondary }]}>g</Text>
              </View>

              <View style={styles.entryStats}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {entry.totalSessions}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add Friend Modal */}
      <Modal
        visible={showAddFriendModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddFriendModal(false)}
      >
        <BlurView intensity={80} style={styles.blurContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <View style={[styles.modalContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <MaterialCommunityIcons name="account-plus" size={40} color={accentColor} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Friend to Crew</Text>
              </View>

              <View style={styles.modalContent}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>FRIEND ID (UID)</Text>
                <View style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <MaterialCommunityIcons name="identifier" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter friend's ApexBox ID"
                    placeholderTextColor={colors.textSecondary}
                    value={friendUID}
                    onChangeText={setFriendUID}
                    autoCapitalize="none"
                    autoFocus
                  />
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { borderColor: colors.border }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowAddFriendModal(false);
                    setFriendUID('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalButtonPrimary}
                  onPress={handleAddFriend}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[accentColor, colors.background]}
                    style={styles.modalButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.text }]}>Add</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </BlurView>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crewTabs: {
    marginBottom: SPACING.md,
  },
  crewTabsContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  crewTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  crewTabText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  memberBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: SPACING.xs,
  },
  memberBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  statColumn: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statHeaderText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
  crownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  crownText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  entryStats: {
    alignItems: 'center',
    width: 60,
  },
  statValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
  statUnit: {
    fontSize: FONT_SIZE.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.xl,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    marginTop: SPACING.sm,
  },
  modalContent: {
    marginBottom: SPACING.lg,
  },
  modalLabel: {
    fontSize: FONT_SIZE.xs,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 1,
  },
  modalInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    marginLeft: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
});
