import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
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
  const [selectedCrew, setSelectedCrew] = useState<Crew | null>(null);
  const [globalLeaderboard, setGlobalLeaderboard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCrewPicker, setShowCrewPicker] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [leaderboardLimit, setLeaderboardLimit] = useState(10);

  useEffect(() => {
    loadData();
  }, []);

  // Reload data when screen comes into focus (e.g., after leaving a crew)
  useFocusEffect(
    useCallback(() => {
      console.log('[GroupsScreen] Screen focused, reloading data...');
      loadData();
    }, [])
  );

  // Reload data when profile.crewIds changes (after join/leave/create)
  useEffect(() => {
    if (profile?.crewIds) {
      console.log('[GroupsScreen] Profile crewIds changed, reloading...');
      loadData();
    }
  }, [profile?.crewIds]);

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
      
      if (crews.length > 0 && !selectedCrew) {
        setSelectedCrew(crews[0]);
      }
      
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
        console.log('[GroupsScreen] Loading ALL states leaderboard');
        topSpeedData = await LeaderboardService.getTopSpeedLeaderboard(50);
        topGForceData = await LeaderboardService.getMaxGForceLeaderboard(50);
      } else {
        console.log('[GroupsScreen] Loading state-filtered leaderboard for:', selectedState);
        topSpeedData = await LeaderboardService.getTopSpeedLeaderboardByState(selectedState, 50);
        topGForceData = await LeaderboardService.getMaxGForceLeaderboardByState(selectedState, 50);
        console.log('[GroupsScreen] State-filtered results:', topSpeedData.length, 'speed entries,', topGForceData.length, 'g-force entries');
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
      
      // Reload data after crew creation
      await loadData();
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      
      // Reload data after joining crew
      await loadData();
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success!', 'You have joined the crew!');
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

          {/* Crew Selector Dropdown */}
          {userCrews.length > 0 ? (
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
                  <Text style={[styles.crewSelectorLabel, { color: colors.textSecondary }]}>MY CREW</Text>
                  <Text style={[styles.crewDropdownText, { color: colors.text }]}>
                    {selectedCrew?.name || 'Select Crew'}
                  </Text>
                </View>
              </View>
              <View style={styles.crewSelectorRight}>
                <View style={[styles.memberBadge, { backgroundColor: accentColor }]}>
                  <MaterialCommunityIcons name="account-group" size={12} color={colors.text} />
                  <Text style={[styles.memberBadgeText, { color: colors.text }]}>
                    {selectedCrew?.memberIds?.length || 0}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={24} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Crew Leaderboard */}
          {selectedCrew && userCrews.length > 0 ? (
            <ScrollView
              style={styles.crewLeaderboardScroll}
              contentContainerStyle={styles.crewLeaderboardContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {selectedCrew.name} Leaderboard
              </Text>
              
              {selectedCrew.members && selectedCrew.members.length > 0 ? (
                selectedCrew.members
                  .sort((a, b) => (b.topSpeed || 0) - (a.topSpeed || 0))
                  .slice(0, 10)
                  .map((member, index) => (
                    <View
                      key={member.uid}
                      style={[
                        styles.leaderboardCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: index === 0 ? accentColor : colors.border,
                          borderWidth: index === 0 ? 2 : 1,
                        },
                      ]}
                    >
                      <View style={styles.leaderboardLeft}>
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
                        <UserAvatar name={member.displayName} size={40} uri={member.avatarURI} />
                        <View style={styles.memberInfo}>
                          <Text style={[styles.memberName, { color: colors.text }]}>
                            {member.displayName}
                            {member.uid === user?.uid ? ' (You)' : ''}
                          </Text>
                          <Text style={[styles.memberSessions, { color: colors.textSecondary }]}>
                            {member.totalSessions || 0} sessions
                          </Text>
                        </View>
                      </View>
                      <View style={styles.leaderboardRight}>
                        <Text style={[styles.speedValueBig, { color: accentColor }]}>
                          {(member.topSpeed || 0).toFixed(1)}
                        </Text>
                        <Text style={[styles.speedUnit, { color: colors.textSecondary }]}>km/h</Text>
                      </View>
                    </View>
                  ))
              ) : (
                <View style={styles.emptyLeaderboard}>
                  <MaterialCommunityIcons name="trophy-outline" size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No data yet
                  </Text>
                  <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
                    Complete sessions to appear on the leaderboard
                  </Text>
                </View>
              )}

              {/* View Details Button */}
              <TouchableOpacity
                style={[styles.viewDetailsButton, { borderColor: accentColor }]}
                onPress={() => {
                  if (selectedCrew) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push({
                      pathname: '/group-detail',
                      params: { crewId: selectedCrew.id },
                    });
                  }
                }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="shield-account" size={20} color={accentColor} />
                <Text style={[styles.viewDetailsButtonText, { color: accentColor }]}>
                  View Full Details
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={accentColor} />
              </TouchableOpacity>
            </ScrollView>
          ) : null}

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
                {globalLeaderboard[globalCategory].slice(0, leaderboardLimit).map((member: any, index: number) => (
                  <View
                    key={member.uid}
                    style={[
                      styles.leaderboardCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: index === 0 ? accentColor : colors.border,
                        borderWidth: index === 0 ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={styles.leaderboardLeft}>
                      {index < 3 ? (
                        <View style={[styles.crownContainer, { backgroundColor: accentColor + '20' }]}>
                          <Text style={styles.crownText}>{index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'}</Text>
                        </View>
                      ) : (
                        <Text style={[styles.rankNumber, { color: colors.textSecondary }]}>#{index + 1}</Text>
                      )}

                      <UserAvatar name={member.displayName} size={44} uri={member.avatarURI} />

                      <View style={styles.memberInfo}>
                        <Text style={[styles.memberName, { color: colors.text }]}>
                          {member.displayName}
                          {member.uid === user?.uid ? ' (You)' : ''}
                        </Text>
                        <Text style={[styles.memberSessions, { color: colors.textSecondary }]}>
                          {member.totalSessions || 0} sessions
                        </Text>
                      </View>
                    </View>

                    <View style={styles.leaderboardRight}>
                      {globalCategory === 'topSpeed' ? (
                        <>
                          <Text style={[styles.speedValueBig, { color: accentColor }]}>
                            {(member.topSpeed || 0).toFixed(2)}
                          </Text>
                          <Text style={[styles.speedUnit, { color: colors.textSecondary }]}>km/h</Text>
                        </>
                      ) : (
                        <>
                          <Text style={[styles.speedValueBig, { color: accentColor }]}>
                            {(member.topGForce || 0).toFixed(2)}
                          </Text>
                          <Text style={[styles.speedUnit, { color: colors.textSecondary }]}>g</Text>
                        </>
                      )}
                    </View>
                  </View>
                ))}

                {/* Load More Button */}
                {globalLeaderboard[globalCategory].length > leaderboardLimit && leaderboardLimit < 50 ? (
                  <TouchableOpacity
                    style={[styles.loadMoreButton, { borderColor: accentColor }]}
                    onPress={() => {
                      setLeaderboardLimit(prev => Math.min(prev + 10, 50));
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="chevron-down" size={20} color={accentColor} />
                    <Text style={[styles.loadMoreText, { color: accentColor }]}>
                      Load More ({Math.min(globalLeaderboard[globalCategory].length - leaderboardLimit, 10)} more)
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </ScrollView>
        </>
      )}

      {/* Crew Picker Modal */}
      <Modal
        visible={showCrewPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCrewPicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={[styles.pickerModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Crew</Text>
              <TouchableOpacity onPress={() => setShowCrewPicker(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={userCrews}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSelectedCrew(item);
                    setShowCrewPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text style={[styles.pickerItemTitle, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.pickerItemSub, { color: colors.textSecondary }]}>
                      {item.memberIds?.length || 0} members
                    </Text>
                  </View>
                  {selectedCrew?.id === item.id ? (
                    <MaterialCommunityIcons name="check-circle" size={24} color={accentColor} />
                  ) : null}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={true}
            />
          </View>
        </View>
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
  crewSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
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
  crewDropdownText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
  crewSelectorRight: {
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
  // Global Leaderboard Styles
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
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
  },
  pickerItemTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
  },
  pickerItemSub: {
    fontSize: FONT_SIZE.sm,
    marginTop: 2,
  },
  crewLeaderboardScroll: {
    flex: 1,
  },
  crewLeaderboardContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: SPACING.lg,
  },
  leaderboardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  leaderboardRight: {
    alignItems: 'flex-end',
  },
  speedValueBig: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  crownContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownText: {
    fontSize: 18,
  },
  rankNumber: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    width: 32,
    textAlign: 'center',
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
  emptyText: {
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.md,
  },
  emptyHint: {
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  viewDetailsButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  loadMoreText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
});
