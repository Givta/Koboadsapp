import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { fontSize, radius, spacing } from '../../../theme/spacing';
import { NewAdDraft } from '../../../types';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function ReviewStep({
  draft,
  costPerReachNaira,
  walletBalance,
  onEditStep,
}: {
  draft: NewAdDraft;
  costPerReachNaira: number;
  walletBalance?: number;
  onEditStep?: (step: number) => void;
}) {
  const estimatedCost = draft.campaignType === 'paid' ? Math.round(draft.reach * costPerReachNaira) : 0;
  const editOptions = [
    { label: 'Ad details', step: 0, hint: 'Title, description, media and contact info' },
    { label: 'Targeting', step: 1, hint: 'Audience, location and category' },
    { label: 'Budget', step: 2, hint: 'Reach, campaign type and spend' },
  ];

  return (
    <View>
      <Text style={styles.sectionTitle}>Review</Text>

      <View style={styles.editSection}>
        <Text style={styles.editSectionTitle}>Need to tweak something?</Text>
        {editOptions.map((option) => (
          <TouchableOpacity
            key={option.step}
            style={styles.editCard}
            onPress={() => onEditStep?.(option.step)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.editTitle}>{option.label}</Text>
              <Text style={styles.editHint}>{option.hint}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.previewCard}>
        <View style={[styles.previewThumb, { backgroundColor: draft.imageColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.previewTitle} numberOfLines={1}>
            {draft.title || 'Untitled ad'}
          </Text>
          <Text style={styles.previewDesc} numberOfLines={2}>
            {draft.description || 'No description yet'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Row label="Target audience" value={`${draft.location || 'Any'} · ${draft.category || 'Any'}`} />
        <Row label="Estimated cost" value={draft.campaignType === 'paid' ? `₦${estimatedCost.toLocaleString()}` : 'Free (exchange)'} />
        <Row label="Distribution type" value={draft.campaignType === 'paid' ? 'Paid campaign' : 'Exchange campaign'} />
        <Row label="Expected reach" value={`${draft.reach.toLocaleString()} people`} />
        <Row label="Campaign duration" value="Until reach target is met" />
      </View>
      {draft.campaignType === 'paid' && walletBalance !== undefined && walletBalance < estimatedCost ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Your wallet balance is insufficient for this campaign. Top up before launching to avoid failure.
          </Text>
        </View>
      ) : null}

      <View style={styles.termsRow}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
        <Text style={styles.termsText}>
          By launching, you agree to KoboAds' advertising terms and distribution policy.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textDark, marginBottom: spacing.lg },
  editSection: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  editSectionTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textDark, marginBottom: spacing.sm },
  editCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textDark },
  editHint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  previewCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  previewThumb: { width: 56, height: 56, borderRadius: radius.md },
  previewTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textDark },
  previewDesc: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4 },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  rowLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  rowValue: { fontSize: fontSize.sm, color: colors.textDark, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  termsRow: { flexDirection: 'row', gap: 8, marginTop: spacing.lg, paddingHorizontal: spacing.xs },
  termsText: { flex: 1, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },
  warningBox: { marginTop: spacing.lg, backgroundColor: colors.warningBg, padding: spacing.md, borderRadius: radius.md },
  warningText: { color: colors.warning, fontSize: fontSize.xs, lineHeight: 18 },
});
