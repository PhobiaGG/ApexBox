import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Group } from '../services/GroupService';

interface GroupCardProps {
  group: Group;
  onPress: () => void;
}

export default function GroupCard({ group, onPress }: GroupCardProps) {
  const topMember = group.leaderboard[0];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={[COLORS.card, COLORS.background]}
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="account-group" size={24} color={COLORS.cyan} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name}>{group.name}</Text>
            <Text style={styles.description}>{group.description}</Text>
          </View>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <MaterialCommunityIcons name="account" size={16} color={COLORS.textSecondary} />
            <Text style={styles.statText}>{group.members.length} Members</Text>
          </View>
          {topMember && (
            <View style={styles.stat}>
              <MaterialCommunityIcons name="trophy" size={16} color={COLORS.lime} />
              <Text style={styles.statText}>
                {topMember.memberName} - {topMember.peakSpeed.toFixed(1)} km/h
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cyan,
  },
  headerText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  name: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  description: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  stats: {
    gap: SPACING.sm,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
});