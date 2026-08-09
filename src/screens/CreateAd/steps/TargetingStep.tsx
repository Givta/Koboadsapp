import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { fontSize, radius, spacing } from '../../../theme/spacing';
import { NewAdDraft } from '../../../types';

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function TargetingStep({
  draft,
  onChange,
  locations,
  categories,
  ageRanges,
}: {
  draft: NewAdDraft;
  onChange: (patch: Partial<NewAdDraft>) => void;
  locations: string[];
  categories: string[];
  ageRanges: string[];
}) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Audience</Text>

      <Text style={styles.label}>Location</Text>
      <View style={styles.chipsWrap}>
        {locations.map((loc) => (
          <Chip key={loc} label={loc} active={draft.location === loc} onPress={() => onChange({ location: loc })} />
        ))}
      </View>

      <Text style={styles.label}>Category</Text>
      <View style={styles.chipsWrap}>
        {categories.map((cat) => (
          <Chip key={cat} label={cat} active={draft.category === cat} onPress={() => onChange({ category: cat })} />
        ))}
      </View>

      <Text style={styles.label}>Age Range</Text>
      <View style={styles.chipsWrap}>
        {ageRanges.map((age) => (
          <Chip key={age} label={age} active={draft.ageRange === age} onPress={() => onChange({ ageRange: age })} />
        ))}
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Targeting summary</Text>
        <Text style={styles.summaryText}>
          {draft.location || 'Any location'} · {draft.category || 'Any category'} · {draft.ageRange || 'All ages'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textDark, marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  chipTextActive: { color: colors.primaryDark, fontWeight: '700' },
  summaryCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.xxl,
  },
  summaryTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primaryDark },
  summaryText: { fontSize: fontSize.sm, color: colors.text, marginTop: 4 },
});
