import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GroupService, { Group } from '../services/GroupService';
import GroupCard from '../components/GroupCard';

export default function GroupsScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      const loaded = await GroupService.getGroups();
      setGroups(loaded);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    try {
      await GroupService.createGroup(newGroupName, newGroupDescription);
      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDescription('');
      await loadGroups();
      Alert.alert('Success', 'Group created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create group');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#0F0F0F']} style={styles.gradient}>
        <View style={styles.header}>
          <Text style={styles.title}>Groups</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <MaterialCommunityIcons name="plus-circle" size={28} color={COLORS.lime} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.cyan} />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {groups.map(group => (
              <GroupCard
                key={group.id}
                group={group}
                onPress={() => setSelectedGroup(group)}
              />
            ))}
          </ScrollView>
        )}

        {/* Group Detail Modal */}
        <Modal
          visible={selectedGroup !== null}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedGroup(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {selectedGroup && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{selectedGroup.name}</Text>
                    <TouchableOpacity onPress={() => setSelectedGroup(null)}>
                      <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalDescription}>{selectedGroup.description}</Text>

                  <Text style={styles.sectionTitle}>Leaderboard</Text>
                  <ScrollView style={styles.leaderboardScroll}>
                    {selectedGroup.leaderboard.map((entry, index) => (
                      <View key={entry.memberId} style={styles.leaderboardItem}>
                        <View style={styles.leaderboardRank}>
                          <MaterialCommunityIcons
                            name={index === 0 ? 'trophy' : 'account'}
                            size={24}
                            color={index === 0 ? COLORS.lime : COLORS.cyan}
                          />
                          <Text style={styles.leaderboardPosition}>{index + 1}</Text>
                        </View>
                        <View style={styles.leaderboardInfo}>
                          <Text style={styles.leaderboardName}>{entry.memberName}</Text>
                          <View style={styles.leaderboardStats}>
                            <Text style={styles.leaderboardStat}>
                              Peak: {entry.peakSpeed.toFixed(1)} km/h
                            </Text>
                            <Text style={styles.leaderboardStat}>
                              Avg G: {entry.avgGForce.toFixed(2)}g
                            </Text>
                            <Text style={styles.leaderboardStat}>
                              Sessions: {entry.sessionCount}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </ScrollView>

                  <TouchableOpacity
                    style={styles.joinButton}
                    onPress={() => {
                      Alert.alert('Joined', `You've joined ${selectedGroup.name}`);
                      setSelectedGroup(null);
                    }}
                  >
                    <LinearGradient colors={[COLORS.lime, '#88CC00']} style={styles.joinGradient}>
                      <MaterialCommunityIcons name="account-plus" size={20} color={COLORS.background} />
                      <Text style={styles.joinButtonText}>Join Group</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Create Group Modal */}
        <Modal
          visible={showCreateModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Group</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Group Name"
                placeholderTextColor={COLORS.textTertiary}
                value={newGroupName}
                onChangeText={setNewGroupName}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                placeholderTextColor={COLORS.textTertiary}
                value={newGroupDescription}
                onChangeText={setNewGroupDescription}
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity style={styles.createConfirmButton} onPress={handleCreateGroup}>
                <LinearGradient colors={[COLORS.cyan, '#0088AA']} style={styles.createGradient}>
                  <MaterialCommunityIcons name="check" size={20} color={COLORS.text} />
                  <Text style={styles.createButtonText}>Create Group</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  createButton: {
    padding: SPACING.sm,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  modalDescription: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  leaderboardScroll: {
    maxHeight: 300,
    marginBottom: SPACING.lg,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  leaderboardRank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginRight: SPACING.md,
  },
  leaderboardPosition: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  leaderboardStats: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  leaderboardStat: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  joinButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  joinGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  joinButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.background,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.md,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  createConfirmButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  createGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  createButtonText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    fontWeight: 'bold',
  },
});