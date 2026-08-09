import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/spacing';

interface Props {
  progress: number; // 0-1
  color?: string;
  trackColor?: string;
  height?: number;
}

export default function ProgressBar({ progress, color = colors.primary, trackColor = colors.border, height = 6 }: Props) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.track, { backgroundColor: trackColor, height }]}>
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color, height }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', borderRadius: radius.pill, overflow: 'hidden' },
  fill: { borderRadius: radius.pill },
});
