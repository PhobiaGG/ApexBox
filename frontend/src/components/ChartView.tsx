import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText, Circle } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';

interface ChartData {
  x: number;
  y: number;
}

interface ChartViewProps {
  data: ChartData[];
  title: string;
  color: string;
  yLabel: string;
  showDots?: boolean;
}

export default function ChartView({ data, title, color, yLabel, showDots = false }: ChartViewProps) {
  const { colors } = useTheme();
  
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
      <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No data available</Text>
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

  // Get individual point coordinates for dots
  const dotPoints = validData.map((point, index) => {
    const x = padding + (index / (validData.length - 1)) * (width - padding * 2);
    const y = chartHeight - padding - ((point.y - minValue) / valueRange) * (chartHeight - padding * 2);
    return { x, y };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.yLabel, { color: colors.textSecondary }]}>{yLabel}</Text>
      </View>
      <View style={styles.chartContainer}>
        <Svg width={width} height={chartHeight}>
          {/* Grid lines */}
          <Line
            x1={padding}
            y1={chartHeight - padding}
            x2={width - padding}
            y2={chartHeight - padding}
            stroke={colors.border}
            strokeWidth="1"
          />
          <Line
            x1={padding}
            y1={padding}
            x2={width - padding}
            y2={padding}
            stroke={colors.border}
            strokeWidth="1"
            strokeDasharray="4,4"
          />
          
          {/* Data line */}
          <Polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          
          {/* Optional dots */}
          {showDots && dotPoints.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill={color}
              stroke={colors.card}
              strokeWidth="2"
            />
          ))}
          
          {/* Y-axis labels */}
          <SvgText
            x={padding - 25}
            y={padding + 5}
            fill={colors.textSecondary}
            fontSize="11"
            fontWeight="600"
          >
            {(isNaN(maxValue) || !isFinite(maxValue) ? 0 : maxValue).toFixed(0)}
          </SvgText>
          <SvgText
            x={padding - 25}
            y={chartHeight - padding + 5}
            fill={colors.textSecondary}
            fontSize="11"
            fontWeight="600"
          >
            {(isNaN(minValue) || !isFinite(minValue) ? 0 : minValue).toFixed(0)}
          </SvgText>
          
          {/* Y-axis label */}
          <SvgText
            x={5}
            y={chartHeight / 2}
            fill={colors.textSecondary}
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
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
  yLabel: {
    fontSize: FONT_SIZE.xs,
  },
  chartContainer: {
    borderRadius: BORDER_RADIUS.md,
  },
  emptyContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
  },
});