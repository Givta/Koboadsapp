import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/colors';
import { fontSize } from '../theme/spacing';

interface Props {
  /** 0-100 */
  percent: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  progressColor?: string;
  label?: string;
}

/**
 * Circular "reach available" ring used on the Advertising Power card.
 * Pure react-native-svg (no extra native deps beyond that lib), so the
 * percentage arc is real geometry rather than an image.
 */
export default function ReachGauge({
  percent,
  size = 108,
  strokeWidth = 10,
  trackColor = 'rgba(255,255,255,0.18)',
  progressColor = colors.gold,
  label = 'Reach Available',
}: Props) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.centerWrap}>
          <Text style={styles.percentText}>{Math.round(clamped)}%</Text>
          <Text style={styles.labelText}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  percentText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '800' },
  labelText: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '600', textAlign: 'center', marginTop: 1 },
});
