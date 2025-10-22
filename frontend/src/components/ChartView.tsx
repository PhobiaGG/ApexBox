import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText } from 'react-native-svg';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';

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

export default function ChartView({ data, title, color, yLabel }: ChartViewProps) {
  // Filter out any NaN or invalid values
  const validData = data.filter(d => 
    d && 
    typeof d.x === 'number' && 
    typeof d.y === 'number' && 
    !isNaN(d.x) && 
    !isNaN(d.y) &&
    isFinite(d.x) &&
    isFinite(d.y)
  );

  if (!validData || validData.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      </View>
    );
  }

  const width = Dimensions.get('window').width - SPACING.lg * 4;
  const chartHeight = 180;
  const padding = 30;

  // Get min and max values
  const yValues = validData.map(d => d.y);
  const minValue = Math.min(...yValues);
  const maxValue = Math.max(...yValues);
  const valueRange = maxValue - minValue || 1;

  // Create points for polyline
  const points = validData.map((point, index) => {
    const x = padding + (index / (validData.length - 1)) * (width - padding * 2);
    const y = chartHeight - padding - ((point.y - minValue) / valueRange) * (chartHeight - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartContainer}>
        <Svg width={width} height={chartHeight}>
          {/* Grid line at bottom */}
          <Line
            x1={padding}
            y1={chartHeight - padding}
            x2={width - padding}
            y2={chartHeight - padding}
            stroke={COLORS.border}
            strokeWidth="1"
          />
          
          {/* Data line */}
          <Polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
          />
          
          {/* Y-axis labels */}
          <SvgText
            x={padding - 25}
            y={padding + 5}
            fill={COLORS.textSecondary}
            fontSize="11"
            fontWeight="600"
          >
            {(isNaN(maxValue) || !isFinite(maxValue) ? 0 : maxValue).toFixed(0)}
          </SvgText>
          <SvgText
            x={padding - 25}
            y={chartHeight - padding + 5}
            fill={COLORS.textSecondary}
            fontSize="11"
            fontWeight="600"
          >
            {(isNaN(minValue) || !isFinite(minValue) ? 0 : minValue).toFixed(0)}
          </SvgText>
          
          {/* Y-axis label */}
          <SvgText
            x={5}
            y={chartHeight / 2}
            fill={COLORS.textSecondary}
            fontSize="10"
          >
            {yLabel}
          </SvgText>
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    fontWeight: 'bold',
  },
  chartContainer: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
  },
  emptyContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
  },
});
