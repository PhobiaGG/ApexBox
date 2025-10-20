import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { COLORS, SPACING, FONT_SIZE } from '../constants/theme';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryTheme } from 'victory-native';

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <VictoryChart
        width={screenWidth - 40}
        height={220}
        theme={VictoryTheme.material}
        padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
      >
        <VictoryAxis
          style={{
            axis: { stroke: COLORS.border },
            tickLabels: { fill: COLORS.textSecondary, fontSize: 10 },
            grid: { stroke: COLORS.border, strokeDasharray: '4' },
          }}
          label="Time (s)"
          style={{
            axisLabel: { fill: COLORS.textSecondary, fontSize: 12, padding: 30 },
          }}
        />
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: COLORS.border },
            tickLabels: { fill: COLORS.textSecondary, fontSize: 10 },
            grid: { stroke: COLORS.border, strokeDasharray: '4' },
          }}
          label={yLabel}
          style={{
            axisLabel: { fill: COLORS.textSecondary, fontSize: 12, padding: 35 },
          }}
        />
        <VictoryLine
          data={data}
          style={{
            data: {
              stroke: color,
              strokeWidth: 3,
            },
          }}
          interpolation="monotoneX"
        />
      </VictoryChart>
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