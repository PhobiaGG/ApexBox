import React from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { COLORS, SPACING, FONT_SIZE } from '../constants/theme';

// Only import Victory-native on native platforms
let CartesianChart: any, Line: any, useChartPressState: any, Circle: any;

if (Platform.OS !== 'web') {
  try {
    const victory = require('victory-native');
    const skia = require('@shopify/react-native-skia');
    CartesianChart = victory.CartesianChart;
    Line = victory.Line;
    useChartPressState = victory.useChartPressState;
    Circle = skia.Circle;
  } catch (e) {
    console.log('[ChartView] Victory-native not available');
  }
}

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

// Simple SVG-like chart fallback for web
function WebChart({ data, color }: { data: ChartData[]; color: string }) {
  if (data.length === 0) return null;

  const yValues = data.map(d => d.y);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const rangeY = maxY - minY || 1;

  const chartWidth = screenWidth - SPACING.lg * 4;
  const chartHeight = 180;

  // Create simple line path
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * chartWidth;
    const y = chartHeight - ((d.y - minY) / rangeY) * chartHeight;
    return { x, y };
  });

  return (
    <View style={[styles.webChartContainer, { height: chartHeight }]}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
        <View
          key={i}
          style={[
            styles.gridLine,
            { top: pct * chartHeight, opacity: pct === 0 || pct === 1 ? 0.3 : 0.1 },
          ]}
        />
      ))}

      {/* Data line */}
      <View style={styles.lineContainer}>
        {points.map((point, i) => {
          if (i === 0) return null;
          const prev = points[i - 1];
          const length = Math.sqrt(Math.pow(point.x - prev.x, 2) + Math.pow(point.y - prev.y, 2));
          const angle = Math.atan2(point.y - prev.y, point.x - prev.x) * (180 / Math.PI);

          return (
            <View
              key={i}
              style={[
                styles.lineSegment,
                {
                  left: prev.x,
                  top: prev.y,
                  width: length,
                  backgroundColor: color,
                  transform: [{ rotate: `${angle}deg` }],
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function ChartView({ data, title, color, yLabel }: ChartViewProps) {
  // Use native chart press state only on native
  const nativeState = Platform.OS !== 'web' && useChartPressState ? useChartPressState({ x: 0, y: { y: 0 } }) : null;
  const state = nativeState?.state;
  const isActive = nativeState?.isActive || false;

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
      
      {/* Interactive value display (native only) */}
      {isActive && state && (
        <View style={styles.activeValue}>
          <Text style={[styles.activeValueText, { color }]}>
            {state.y.y.value.toFixed(2)}
          </Text>
          <Text style={styles.activeValueLabel}>{yLabel}</Text>
        </View>
      )}

      <View style={styles.chartContainer}>
        {Platform.OS === 'web' ? (
          <WebChart data={data} color={color} />
        ) : CartesianChart ? (
          <CartesianChart
            data={data}
            xKey="x"
            yKeys={["y"]}
            domainPadding={{ left: 20, right: 20, top: 20, bottom: 20 }}
            chartPressState={state}
          >
            {({ points, chartBounds }: any) => (
              <>
                <Line
                  points={points.y}
                  color={color}
                  strokeWidth={2.5}
                  curveType="natural"
                  animate={{ type: "timing", duration: 300 }}
                />
                {isActive && state && Circle && (
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
        ) : (
          <WebChart data={data} color={color} />
        )}
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
  webChartContainer: {
    position: 'relative',
    width: '100%',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.border,
  },
  lineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lineSegment: {
    position: 'absolute',
    height: 2.5,
    transformOrigin: 'left center',
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