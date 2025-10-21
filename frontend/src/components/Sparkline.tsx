import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

interface SparklineProps {
  data: number[];
  width: number;
  height: number;
  color: string;
  lineWidth?: number;
}

export default function Sparkline({ data, width, height, color, lineWidth = 2 }: SparklineProps) {
  if (!data || data.length < 2) {
    return <View style={[styles.container, { width, height }]} />;
  }

  const values = data.filter(v => !isNaN(v));
  if (values.length < 2) {
    return <View style={[styles.container, { width, height }]} />;
  }

  const minY = Math.min(...values);
  const maxY = Math.max(...values);
  const rangeY = maxY - minY || 1;

  // Create points for the line
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - minY) / rangeY) * height;
    return { x, y };
  });

  return (
    <View style={[styles.container, { width, height }]}>
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
                  height: lineWidth,
                  backgroundColor: color,
                  transform: [{ rotate: `${angle}deg` }],
                },
              ]}
            />
          );
        })}
      </View>

      {/* Add glow effect */}
      <View style={[styles.glow, { backgroundColor: color, opacity: 0.15 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
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
    transformOrigin: 'left center',
  },
  glow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
});
