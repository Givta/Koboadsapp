import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, spacing } from '../theme/spacing';

interface Props {
  steps: string[];
  activeIndex: number;
}

export default function StepIndicator({ steps, activeIndex }: Props) {
  return (
    <View style={styles.wrap}>
      {steps.map((step, i) => {
        const isDone = i < activeIndex;
        const isActive = i === activeIndex;
        return (
          <React.Fragment key={step}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.circle,
                  isActive && styles.circleActive,
                  isDone && styles.circleDone,
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text style={[styles.circleText, isActive && styles.circleTextActive]}>{i + 1}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, (isActive || isDone) && styles.stepLabelActive]} numberOfLines={1}>
                {step}
              </Text>
            </View>
            {i < steps.length - 1 && <View style={[styles.connector, isDone && styles.connectorDone]} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  stepItem: { alignItems: 'center', width: 64, gap: 4 },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: { backgroundColor: colors.primaryLight, borderWidth: 2, borderColor: colors.primary },
  circleDone: { backgroundColor: colors.primary },
  circleText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textMuted },
  circleTextActive: { color: colors.primaryDark },
  stepLabel: { fontSize: 10, color: colors.textFaint, textAlign: 'center' },
  stepLabelActive: { color: colors.textDark, fontWeight: '700' },
  connector: { flex: 0.4, height: 2, backgroundColor: colors.border, marginTop: 13 },
  connectorDone: { backgroundColor: colors.primary },
});
