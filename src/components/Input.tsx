import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, radius, spacing } from '../theme/spacing';

interface Props extends TextInputProps {
  label?: string;
  helper?: string;
  charCount?: string;
}

export default function Input({ label, helper, charCount, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, rest.multiline && styles.multiline, style]}
        placeholderTextColor={colors.textFaint}
        {...rest}
      />
      {(helper || charCount) && (
        <View style={styles.footerRow}>
          <Text style={styles.helper}>{helper}</Text>
          {charCount ? <Text style={styles.helper}>{charCount}</Text> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    fontSize: fontSize.md,
    color: colors.textDark,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  helper: { fontSize: fontSize.xs, color: colors.textFaint },
});
