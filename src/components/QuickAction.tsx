import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, radius, spacing } from '../theme/spacing';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  bg?: string;
  onPress?: () => void;
}

export default function QuickAction({ icon, label, color = colors.primary, bg = colors.primaryLight, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.8} onPress={onPress}>
      <TouchableOpacity disabled style={[styles.iconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={color} />
      </TouchableOpacity>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', gap: 6 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: fontSize.xs, color: colors.text, fontWeight: '600' },
});
