import React from 'react';
import { ActivityIndicator, GestureResponderEvent, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, radius, spacing } from '../theme/spacing';

type Variant = 'primary' | 'outline' | 'outlineLight' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  style,
  fullWidth = true,
}: Props) {
  const variantStyle = styles[variant];
  const textVariantStyle = textStyles[variant];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        variantStyle,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : colors.primary} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.textBase, textVariantStyle]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { width: '100%' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  disabled: { opacity: 0.5 },
  textBase: { fontSize: fontSize.md, fontWeight: '700' },
  primary: { backgroundColor: colors.primary },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
  outlineLight: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' },
  ghost: { backgroundColor: colors.primaryLight },
  danger: { backgroundColor: colors.danger },
});

const textStyles = StyleSheet.create({
  primary: { color: '#fff' },
  outline: { color: colors.primary },
  outlineLight: { color: '#fff' },
  ghost: { color: colors.primaryDark },
  danger: { color: '#fff' },
});
