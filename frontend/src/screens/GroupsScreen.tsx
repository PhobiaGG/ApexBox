import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useRouter } from 'expo-router';
import UserAvatar from '../components/UserAvatar';
import CreateCrewModal from '../components/CreateCrewModal';
import JoinCrewModal from '../components/JoinCrewModal';
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
  members: CrewMember[];
  createdAt: number;
}

// Mock data generator
const generateMockCrews = (): Crew[] => [];

const generateMockGlobalLeaderboard = () => ({
  topSpeed: [],
  topGForce: [],
});

export default function GroupsScreen() {
  const router = useRouter();
  const { profile, user, createCrew, joinCrew, leaveCrew, getUserCrews } = useAuth();
  const { colors, getCurrentAccent } = useTheme();
  const accentColor = getCurrentAccent();

  const [activeTab, setActiveTab] = useState<'crews' | 'global'>('crews');
  const [globalCategory, setGlobalCategory] = useState<'topSpeed' | 'topGForce'>('topSpeed');
  const [userCrews, setUserCrews] = useState<Crew[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<Crew | null>(null);
  const [globalLeaderboard, setGlobalLeaderboard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCrewPicker, setShowCrewPicker] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Load user's crews from Firebase
      const crews = await getUserCrews();
      setUserCrews(crews);
      
      if (crews.length > 0) {
        setSelectedCrew(crews[0]);
      }
      
      // Load global leaderboard
      setGlobalLeaderboard(generateMockGlobalLeaderboard());
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await loadData();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateCrew = async (name: string, description: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const crewCode = await createCrew(name, description);
      
      // Wait for profile to update, then reload
      await new Promise(resolve => setTimeout(resolve, 1000));
      await loadData();
      
      Alert.alert(
        'Crew Created!',
        `Your crew "${name}" has been created!\n\nShare this code with friends to invite them:\n\n${crewCode}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw error;
    }
  };

  const handleJoinCrew = async (code: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await joinCrew(code);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success!', 'You have joined the crew!');
      await loadData();
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      throw error;
    }
  };

  const handleLeaveCrew = async (crewId: string) => {
    Alert.alert(
      'Leave Crew',
      'Are you sure you want to leave this crew?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              // In production: await leaveCrew(crewId);
              Alert.alert('Left Crew', 'You have left the crew');
              await loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to leave crew');
            }
          },
        },
      ]
    );
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

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Leaderboards</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Leaderboards</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'crews' && { backgroundColor: accentColor },
          ]}
          onPress={() => {
            setActiveTab('crews');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="shield-account"
            size={20}
            color={activeTab === 'crews' ? colors.text : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'crews' ? colors.text : colors.textSecondary,
                fontWeight: activeTab === 'crews' ? 'bold' : '600',
              },
            ]}
          >
            My Crews
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'global' && { backgroundColor: accentColor },
          ]}
          onPress={() => {
            setActiveTab('global');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="earth"
            size={20}
            color={activeTab === 'global' ? colors.text : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'global' ? colors.text : colors.textSecondary,
                fontWeight: activeTab === 'global' ? 'bold' : '600',
              },
            ]}
          >
            Global
          </Text>
        </TouchableOpacity>
      </View>

      {/* Crews Tab */}
      {activeTab === 'crews' && (
        <>
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.card, borderColor: accentColor }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowCreateModal(true);
              }}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="plus-circle" size={24} color={accentColor} />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>Create Crew</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.card, borderColor: accentColor }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowJoinModal(true);
              }}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="account-multiple-plus" size={24} color={accentColor} />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>Join Crew</Text>
            </TouchableOpacity>
          </View>

          {/* Crew Selector */}
          {userCrews.length > 0 && (
            <TouchableOpacity
              style={[styles.crewSelector, { backgroundColor: colors.card, borderColor: accentColor }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowCrewPicker(true);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.crewSelectorLeft}>
                <MaterialCommunityIcons name="shield-account" size={24} color={accentColor} />
                <View>
                  <Text style={[styles.crewSelectorLabel, { color: colors.textSecondary }]}>CREW</Text>
                  <Text style={[styles.crewDropdownText, { color: colors.text }]}>
                    {selectedCrew?.name || 'Select Crew'}
                  </Text>
                </View>
              </View>
              <View style={styles.crewSelectorRight}>
                <View style={[styles.memberBadge, { backgroundColor: accentColor }]}>
                  <MaterialCommunityIcons name="account-group" size={12} color={colors.text} />
                  <Text style={[styles.memberBadgeText, { color: colors.text }]}>
                    {selectedCrew?.members.length || 0}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={24} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          )}

          {/* Empty State */}
          {userCrews.length === 0 && (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-group-outline" size={80} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Crews Yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Create a crew or join one with a code
              </Text>
            </View>
          )}

          {/* Leaderboard */}
          {selectedCrew && (
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
                  <Text style={[styles.crewInfoName, { color: colors.text }]}>{selectedCrew.name}</Text>
                  {selectedCrew.adminId === user?.uid && (
                    <View style={[styles.adminBadge, { backgroundColor: accentColor }]}>
                      <MaterialCommunityIcons name="shield-crown" size={12} color={colors.text} />
                      <Text style={[styles.adminBadgeText, { color: colors.text }]}>ADMIN</Text>
                    </View>
                  )}
                </View>
                {selectedCrew.description && (
                  <Text style={[styles.crewInfoDesc, { color: colors.textSecondary }]}>
                    {selectedCrew.description}
                  </Text>
                )}
                <View style={[styles.crewCodeContainer, { backgroundColor: colors.background, borderColor: accentColor }]}>
                  <Text style={[styles.crewCodeLabel, { color: colors.textSecondary }]}>Crew Code:</Text>
                  <Text style={[styles.crewCode, { color: accentColor }]}>{selectedCrew.code}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.leaveButton, { borderColor: colors.magenta }]}
                  onPress={() => handleLeaveCrew(selectedCrew.id)}
                >
                  <Text style={[styles.leaveButtonText, { color: colors.magenta }]}>Leave Crew</Text>
                </TouchableOpacity>
              </View>

              {/* Members List */}
              {selectedCrew.members.sort((a, b) => b.topSpeed - a.topSpeed).map((member, index) => (
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
                    {index < 3 && (
                      <View style={[styles.crownContainer, { backgroundColor: accentColor + '20' }]}>
                        <Text style={styles.crownText}>{index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'}</Text>
                      </View>
                    )}
                    {index >= 3 && (
                      <Text style={[styles.rankNumber, { color: colors.textSecondary }]}>#{index + 1}</Text>
                    )}
                  </View>

                  <UserAvatar name={member.displayName} size={48} uri={member.avatarURI} />

                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.text }]}>{member.displayName}</Text>
                    <Text style={[styles.memberSessions, { color: colors.textSecondary }]}>
                      {member.totalSessions} sessions
                    </Text>
                  </View>

                  <View style={styles.speedContainer}>
                    <Text style={[styles.speedValue, { color: accentColor }]}>{member.topSpeed}</Text>
                    <Text style={[styles.speedUnit, { color: colors.textSecondary }]}>km/h</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </>
      )}

      {/* Global Tab */}
      {activeTab === 'global' && (
        <>
          {/* Category Tabs */}
          <View style={[styles.categoryTabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.categoryTab,
                globalCategory === 'topSpeed' && { backgroundColor: accentColor },
              ]}
              onPress={() => {
                setGlobalCategory('topSpeed');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="speedometer"
                size={18}
                color={globalCategory === 'topSpeed' ? colors.text : colors.textSecondary}
              />
              <Text
                style={[
                  styles.categoryTabText,
                  {
                    color: globalCategory === 'topSpeed' ? colors.text : colors.textSecondary,
                    fontWeight: globalCategory === 'topSpeed' ? 'bold' : '600',
                  },
                ]}
              >
                Top Speed
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.categoryTab,
                globalCategory === 'topGForce' && { backgroundColor: accentColor },
              ]}
              onPress={() => {
                setGlobalCategory('topGForce');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="arrow-up-bold"
                size={18}
                color={globalCategory === 'topGForce' ? colors.text : colors.textSecondary}
              />
              <Text
                style={[
                  styles.categoryTabText,
                  {
                    color: globalCategory === 'topGForce' ? colors.text : colors.textSecondary,
                    fontWeight: globalCategory === 'topGForce' ? 'bold' : '600',
                  },
                ]}
              >
                Top G-Force
              </Text>
            </TouchableOpacity>
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
            {!globalLeaderboard || (globalLeaderboard[globalCategory] && globalLeaderboard[globalCategory].length === 0) ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="trophy-outline" size={80} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Leaderboard Data Yet!</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Complete more sessions to see rankings
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {globalCategory === 'topSpeed' ? 'Fastest Racers' : 'Highest G-Force'}
                </Text>
                {globalLeaderboard[globalCategory].map((member: any, index: number) => (
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
                      {index < 3 && (
                        <View style={[styles.crownContainer, { backgroundColor: accentColor + '20' }]}>
                          <Text style={styles.crownText}>{index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'}</Text>
                        </View>
                      )}
                      {index >= 3 && (
                        <Text style={[styles.rankNumber, { color: colors.textSecondary }]}>#{index + 1}</Text>
                      )}
                    </View>

                    <UserAvatar name={member.displayName} size={48} uri={member.avatarURI} />

                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, { color: colors.text }]}>{member.displayName}</Text>
                      <Text style={[styles.memberSessions, { color: colors.textSecondary}]}>
                        {member.totalSessions} sessions
                      </Text>
                    </View>

                    <View style={styles.speedContainer}>
                      {globalCategory === 'topSpeed' ? (
                        <>
                          <Text style={[styles.speedValue, { color: accentColor }]}>{member.topSpeed}</Text>
                          <Text style={[styles.speedUnit, { color: colors.textSecondary }]}>km/h</Text>
                        </>
                      ) : (
                        <>
                          <Text style={[styles.speedValue, { color: accentColor }]}>{member.topGForce?.toFixed(2)}</Text>
                          <Text style={[styles.speedUnit, { color: colors.textSecondary }]}>g</Text>
                        </>
                      )}
                    </View>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </>
      )}

      {/* Crew Picker Modal */}
      <Modal
        visible={showCrewPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCrewPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCrewPicker(false)}
        >
          <View style={[styles.pickerContainer, { backgroundColor: colors.card, borderColor: accentColor }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Crew</Text>
            {userCrews.map((crew) => (
              <TouchableOpacity
                key={crew.id}
                style={[
                  styles.pickerItem,
                  selectedCrew?.id === crew.id && { backgroundColor: accentColor + '20', borderColor: accentColor },
                ]}
                onPress={() => {
                  setSelectedCrew(crew);
                  setShowCrewPicker(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View>
                  <Text style={[styles.pickerItemTitle, { color: colors.text }]}>{crew.name}</Text>
                  <Text style={[styles.pickerItemSub, { color: colors.textSecondary }]}>
                    {crew.members.length} members
                  </Text>
                </View>
                {selectedCrew?.id === crew.id && (
                  <MaterialCommunityIcons name="check-circle" size={24} color={accentColor} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create Crew Modal */}
      <CreateCrewModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateCrew}
        accentColor={accentColor}
        colors={colors}
      />

      {/* Join Crew Modal */}
      <JoinCrewModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={handleJoinCrew}
        accentColor={accentColor}
        colors={colors}
      />
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
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    padding: 4,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  tabText: {
    fontSize: FONT_SIZE.md,
  },
  categoryTabs: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    padding: 4,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  categoryTabText: {
    fontSize: FONT_SIZE.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    gap: SPACING.sm,
  },
  actionButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
  crewSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  crewSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  crewSelectorLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  crewSelectorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  crewDropdownText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  memberBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: SPACING.lg,
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  crewInfoCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    marginBottom: SPACING.lg,
  },
  crewInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  crewInfoName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  adminBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
  },
  crewInfoDesc: {
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.md,
  },
  crewCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
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
  leaveButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  leaveButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  pickerContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 2,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  pickerItemTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
  pickerItemSub: {
    fontSize: FONT_SIZE.sm,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZE.md,
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
