import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { COLORS, SPACING, FONT_SIZE } from '../constants/theme';
import { CartesianChart, Line, useChartPressState } from 'victory-native';
import { Circle, useFont } from '@shopify/react-native-skia';

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
  const { state, isActive } = useChartPressState({ x: 0, y: { y: 0 } });

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
  const avgY = yValues.reduce((a, b) => a + b, 0) / yValues.length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      {/* Interactive value display */}
      {isActive && (
        <View style={styles.activeValue}>
          <Text style={[styles.activeValueText, { color }]}>
            {state.y.y.value.toFixed(2)}
          </Text>
          <Text style={styles.activeValueLabel}>{yLabel}</Text>
        </View>
      )}

      <View style={styles.chartContainer}>
        <CartesianChart
          data={data}
          xKey="x"
          yKeys={["y"]}
          domainPadding={{ left: 20, right: 20, top: 20, bottom: 20 }}
          chartPressState={state}
        >
          {({ points, chartBounds }) => (
            <>
              <Line
                points={points.y}
                color={color}
                strokeWidth={2.5}
                curveType="natural"
                animate={{ type: "timing", duration: 300 }}
              />
              {isActive && (
                <Circle
                  cx={state.x.position}
                  cy={state.y.y.position}
                  r={6}
                  color={color}
                  opacity={0.8}
                />
              )}
            </>
          )}
        </CartesianChart>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Min</Text>
          <Text style={[styles.statValue, { color }]}>{minY.toFixed(1)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Avg</Text>
          <Text style={[styles.statValue, { color }]}>{avgY.toFixed(1)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Max</Text>
          <Text style={[styles.statValue, { color }]}>{maxY.toFixed(1)}</Text>
        </View>
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
  activeValue: {
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.background,
    marginHorizontal: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  activeValueText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
  },
  activeValueLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  chartContainer: {
    height: 220,
    paddingHorizontal: SPACING.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    marginTop: 4,
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