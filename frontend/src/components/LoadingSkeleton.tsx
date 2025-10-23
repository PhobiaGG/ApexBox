import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function LoadingSkeleton({ 
  width = '100%', 
  height = 20, 
  borderRadius = BORDER_RADIUS.sm,
  style 
}: LoadingSkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function LogCardSkeleton() {
  return (
    <View style={styles.logCard}>
      <View style={styles.logCardHeader}>
        <LoadingSkeleton width={100} height={16} />
        <LoadingSkeleton width={60} height={14} />
      </View>
      <LoadingSkeleton width="100%" height={40} style={{ marginVertical: SPACING.sm }} />
      <View style={styles.logCardFooter}>
        <LoadingSkeleton width={80} height={12} />
        <LoadingSkeleton width={20} height={12} />
      </View>
    </View>
  );
}

export function LeaderboardCardSkeleton() {
  return (
    <View style={styles.leaderboardCard}>
      <LoadingSkeleton width={40} height={40} borderRadius={20} />
      <View style={styles.leaderboardInfo}>
        <LoadingSkeleton width={120} height={16} />
        <LoadingSkeleton width={80} height={14} style={{ marginTop: 4 }} />
      </View>
      <LoadingSkeleton width={60} height={24} />
    </View>
  );
}

export function CrewCardSkeleton() {
  return (
    <View style={styles.crewCard}>
      <View style={styles.crewCardHeader}>
        <LoadingSkeleton width={40} height={40} borderRadius={20} />
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <LoadingSkeleton width="70%" height={18} />
          <LoadingSkeleton width="50%" height={14} style={{ marginTop: 4 }} />
        </View>
      </View>
      <LoadingSkeleton width="100%" height={60} style={{ marginTop: SPACING.md }} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: COLORS.border,
  },
  logCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  crewCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  crewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
