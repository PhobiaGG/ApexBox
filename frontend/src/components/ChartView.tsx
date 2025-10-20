import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { COLORS, SPACING, FONT_SIZE } from '../constants/theme';

interface ChartData {
  x: number;
  y: number;
}

interface ChartViewProps {
  data: ChartData[];
  title: string;
  color: string;
  yLabel: string;
}

const screenWidth = Dimensions.get('window').width;

export default function ChartView({ data, title, color, yLabel }: ChartViewProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      </View>
    );
  }

  // Calculate min and max for display
  const yValues = data.map(d => d.y);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartPlaceholder}>
        <Text style={[styles.chartLabel, { color }]}>{yLabel}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Min</Text>
            <Text style={[styles.statValue, { color }]}>{minY.toFixed(1)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Max</Text>
            <Text style={[styles.statValue, { color }]}>{maxY.toFixed(1)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Samples</Text>
            <Text style={[styles.statValue, { color }]}>{data.length}</Text>
          </View>
        </View>
        <Text style={styles.chartNote}>Charts will render in native Expo Go app</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  title: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    fontWeight: 'bold',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  chartPlaceholder: {
    height: 200,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartLabel: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginTop: SPACING.md,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    marginTop: 4,
  },
  chartNote: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textTertiary,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  emptyContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
});