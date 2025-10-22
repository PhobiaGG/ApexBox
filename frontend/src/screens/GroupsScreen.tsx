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
import LeaderboardService from '../services/LeaderboardService';
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
  const { profile, user, createCrew, joinCrew, leaveCrew } = useAuth();
  const { colors, getCurrentAccent } = useTheme();
  const accentColor = getCurrentAccent();

  const [activeTab, setActiveTab] = useState<'crews' | 'global'>('crews');
  const [globalCategory, setGlobalCategory] = useState<'topSpeed' | 'topGForce'>('topSpeed');
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [userCrews, setUserCrews] = useState<Crew[]>([]);
  const [globalLeaderboard, setGlobalLeaderboard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Load user's crews from Firebase (inline implementation)
      const crews: Crew[] = [];
      
      if (profile?.crewIds && profile.crewIds.length > 0) {
        console.log('[GroupsScreen] Loading crews for user:', profile.crewIds);
        
        // Import Firebase functions
        const { getDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../config/firebase');
        
        for (const crewId of profile.crewIds) {
          try {
            const crewDoc = await getDoc(doc(db, 'crews', crewId));
            if (crewDoc.exists()) {
              crews.push({
                id: crewDoc.id,
                ...crewDoc.data(),
              } as Crew);
              console.log('[GroupsScreen] Loaded crew:', crewDoc.data().name);
            }
          } catch (error) {
            console.error('[GroupsScreen] Error loading crew:', crewId, error);
          }
        }
      }
      
      setUserCrews(crews);
      
      console.log('[GroupsScreen] Loaded', crews.length, 'crews');
      
      // Load global leaderboard with real data
      await loadGlobalLeaderboard();
    } catch (error) {
      console.error('[GroupsScreen] Error loading data:', error);
      setUserCrews([]);
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

  const loadGlobalLeaderboard = async () => {
    try {
      console.log('[GroupsScreen] Loading global leaderboard...');
      
      let topSpeedData;
      let topGForceData;
      
      if (selectedState === 'ALL') {
        // Load all states
        topSpeedData = await LeaderboardService.getTopSpeedLeaderboard(50);
        topGForceData = await LeaderboardService.getMaxGForceLeaderboard(50);
      } else {
        // Load filtered by state
        topSpeedData = await LeaderboardService.getTopSpeedLeaderboardByState(selectedState, 50);
        topGForceData = await LeaderboardService.getMaxGForceLeaderboardByState(selectedState, 50);
      }
      
      setGlobalLeaderboard({
        topSpeed: topSpeedData.map(entry => ({
          uid: entry.uid,
          displayName: entry.displayName,
          avatarURI: entry.avatarURI,
          topSpeed: entry.topSpeed,
          topGForce: entry.maxGForce,
          totalSessions: entry.totalSessions,
        })),
        topGForce: topGForceData.map(entry => ({
          uid: entry.uid,
          displayName: entry.displayName,
          avatarURI: entry.avatarURI,
          topSpeed: entry.topSpeed,
          topGForce: entry.maxGForce,
          totalSessions: entry.totalSessions,
        })),
      });
      
      console.log('[GroupsScreen] ✅ Global leaderboard loaded');
    } catch (error) {
      console.error('[GroupsScreen] Error loading global leaderboard:', error);
      setGlobalLeaderboard({ topSpeed: [], topGForce: [] });
    }
  };

  // Reload leaderboard when state filter changes
  useEffect(() => {
    if (activeTab === 'global') {
      loadGlobalLeaderboard();
    }
  }, [selectedState, activeTab]);

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

          {/* Crew List */}
          {userCrews.length > 0 && userCrews.map((crew) => (
            <TouchableOpacity
              key={crew.id}
              style={[styles.crewCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({
                  pathname: '/group-detail',
                  params: { crewId: crew.id },
                });
              }}
              activeOpacity={0.8}
            >
              <View style={styles.crewCardLeft}>
                <MaterialCommunityIcons name="shield-account" size={32} color={accentColor} />
                <View style={styles.crewCardInfo}>
                  <Text style={[styles.crewCardName, { color: colors.text }]}>
                    {crew.name}
                  </Text>
                  {crew.description ? (
                    <Text style={[styles.crewCardDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                      {crew.description}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.crewCardRight}>
                <View style={[styles.memberBadge, { backgroundColor: accentColor }]}>
                  <MaterialCommunityIcons name="account-group" size={12} color={colors.text} />
                  <Text style={[styles.memberBadgeText, { color: colors.text }]}>
                    {crew.memberIds?.length || 0}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}

          {/* Empty State */}
          {userCrews.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-group-outline" size={80} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Crews Yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Create a crew or join one with a code
              </Text>
            </View>
          ) : null}
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

          {/* State Filter */}
          <TouchableOpacity
            style={[styles.stateFilter, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              setShowStatePicker(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="map-marker" size={20} color={accentColor} />
            <Text style={[styles.stateFilterText, { color: colors.text }]}>
              {selectedState === 'ALL' ? 'All States' : LeaderboardService.getUSStates().find(s => s.code === selectedState)?.name || selectedState}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

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
                      <Text style={[styles.memberSessions, { color: colors.textSecondary }]}>
                        {member.totalSessions || 0} sessions
                      </Text>
                    </View>

                    <View style={styles.speedContainer}>
                      {globalCategory === 'topSpeed' ? (
                        <>
                          <Text style={[styles.speedValue, { color: accentColor }]}>{member.topSpeed || 0}</Text>
                          <Text style={[styles.speedUnit, { color: colors.textSecondary }]}>km/h</Text>
                        </>
                      ) : (
                        <>
                          <Text style={[styles.speedValue, { color: accentColor }]}>{member.topGForce?.toFixed(2) || '0.00'}</Text>
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

      {/* State Picker Modal */}
      <Modal
        visible={showStatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStatePicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={[styles.pickerModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Filter by State</Text>
              <TouchableOpacity onPress={() => setShowStatePicker(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={LeaderboardService.getUSStates()}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSelectedState(item.code);
                    setShowStatePicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text style={[styles.pickerItemTitle, { color: colors.text }]}>{item.name}</Text>
                  </View>
                  {selectedState === item.code && (
                    <MaterialCommunityIcons name="check" size={24} color={accentColor} />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={true}
            />
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
  stateFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  stateFilterText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    flex: 1,
    marginLeft: SPACING.sm,
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
  crewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  crewCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  crewCardInfo: {
    flex: 1,
  },
  crewCardName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  crewCardDesc: {
    fontSize: FONT_SIZE.sm,
  },
  crewCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
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
