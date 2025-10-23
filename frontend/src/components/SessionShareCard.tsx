import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';

interface SessionShareCardProps {
  date: string;
  time: string;
  stats: any;
  settings: any;
  profile: any;
  accentColor: string;
}

export default function SessionShareCard({
  date,
  time,
  stats,
  settings,
  profile,
  accentColor,
}: SessionShareCardProps) {
  const { colors } = useTheme();
  
  // Safe value extraction with defaults
  const peakSpeed = stats?.peakSpeed || 0;
  const avgSpeed = stats?.avgSpeed || 0;
  const peakGForce = stats?.peakG || 0;
  const duration = stats?.duration ? (stats.duration / 60).toFixed(1) : '0';
  const carModel = profile?.currentCar?.model || 'My Vehicle';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[accentColor + '40', colors.background, colors.background]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="car-sports" size={40} color={accentColor} />
          <Text style={[styles.title, { color: colors.text }]}>ApexBox Session</Text>
        </View>

        {/* Car & Date */}
        <View style={styles.carInfo}>
          <Text style={[styles.carModel, { color: colors.text }]}>{carModel}</Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>{date}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: accentColor }]}>
            <MaterialCommunityIcons name="speedometer" size={32} color={accentColor} />
            <Text style={[styles.statValue, { color: colors.text }]}>{peakSpeed}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Peak Speed</Text>
            <Text style={[styles.statUnit, { color: colors.textSecondary }]}>km/h</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: accentColor }]}>
            <MaterialCommunityIcons name="arrow-up-bold" size={32} color={accentColor} />
            <Text style={[styles.statValue, { color: colors.text }]}>{peakGForce.toFixed(2)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Peak G-Force</Text>
            <Text style={[styles.statUnit, { color: colors.textSecondary }]}>g</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: accentColor }]}>
            <MaterialCommunityIcons name="clock-outline" size={32} color={accentColor} />
            <Text style={[styles.statValue, { color: colors.text }]}>{duration}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Duration</Text>
            <Text style={[styles.statUnit, { color: colors.textSecondary }]}>min</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: accentColor }]}>
            <MaterialCommunityIcons name="chart-line" size={32} color={accentColor} />
            <Text style={[styles.statValue, { color: colors.text }]}>{avgSpeed}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Speed</Text>
            <Text style={[styles.statUnit, { color: colors.textSecondary }]}>km/h</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.watermark, { color: colors.textTertiary }]}>
            APEXBOX COMPANION
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 400,
    height: 600,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    padding: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  carInfo: {
    marginBottom: SPACING.xl,
  },
  carModel: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  date: {
    fontSize: FONT_SIZE.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    flex: 1,
  },
  statCard: {
    width: '47%',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: SPACING.sm,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  statUnit: {
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: SPACING.xl * 2,
    paddingTop: SPACING.xl,
  },
  watermark: {
    fontSize: FONT_SIZE.xs,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
});
