import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { fontSize, radius, spacing } from '../../../theme/spacing';
import { AccountType, NewAdDraft } from '../../../types';

export default function BudgetStep({
  draft,
  onChange,
  reachLevels,
  exchangeReachLevels,
  freeCampaignMaxReach,
  freeCampaignsUsedToday,
  dailyFreeCampaignLimit,
  costPerReachNaira,
}: {
  draft: NewAdDraft;
  onChange: (patch: Partial<NewAdDraft>) => void;
  reachLevels: number[];
  exchangeReachLevels: number[];
  freeCampaignMaxReach: number;
  freeCampaignsUsedToday: number;
  dailyFreeCampaignLimit: number;
  costPerReachNaira: number;
}) {
  const isExchange = draft.campaignType === 'exchange';
  const activeReachLevels = isExchange ? exchangeReachLevels : reachLevels;
  const estimatedCost = draft.campaignType === 'paid' ? draft.reach * costPerReachNaira : 0;
  const freeCampaignsRemaining = Math.max(0, dailyFreeCampaignLimit - freeCampaignsUsedToday);
  const outOfFreeCampaigns = freeCampaignsRemaining <= 0;

  const selectCampaignType = (type: AccountType) => {
    // Free campaigns cap out at freeCampaignMaxReach — if the person picked a
    // bigger reach while on Paid and switches back to Exchange, bring the
    // selection down to something the free tier actually allows instead of
    // leaving an invalid amount silently selected.
    const clampedReach = type === 'exchange' && draft.reach > freeCampaignMaxReach ? freeCampaignMaxReach : draft.reach;
    onChange({ campaignType: type, reach: clampedReach });
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>Distribution</Text>

      <Text style={styles.label}>How many people do you want to reach?</Text>
      <View style={styles.reachGrid}>
        {activeReachLevels.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.reachOption, draft.reach === r && styles.reachOptionActive]}
            onPress={() => onChange({ reach: r })}
          >
            <Text style={[styles.reachText, draft.reach === r && styles.reachTextActive]}>{r.toLocaleString()}</Text>
            <Text style={[styles.reachSub, draft.reach === r && styles.reachSubActive]}>people</Text>
          </TouchableOpacity>
        ))}
      </View>
      {isExchange && (
        <Text style={styles.hint}>
          Free campaigns reach up to {freeCampaignMaxReach.toLocaleString()} people. Need more? You can boost this
          campaign with a paid top-up once it's live.
        </Text>
      )}

      <Text style={[styles.label, { marginTop: spacing.xxl }]}>Campaign Type</Text>
      {(
        [
          {
            type: 'exchange' as AccountType,
            icon: 'swap-horizontal' as const,
            title: 'Exchange Advertising',
            desc: `Free — advertise in exchange for receiving up to 2 ads a day. ${freeCampaignsRemaining}/${dailyFreeCampaignLimit} free campaigns left today.`,
            disabled: outOfFreeCampaigns,
          },
          {
            type: 'paid' as AccountType,
            icon: 'card' as const,
            title: 'Paid Advertising',
            desc: "Pay for guaranteed reach — you won't receive ads from others.",
            disabled: false,
          },
        ] as const
      ).map((opt) => (
        <TouchableOpacity
          key={opt.type}
          style={[
            styles.typeCard,
            draft.campaignType === opt.type && styles.typeCardActive,
            opt.disabled && styles.typeCardDisabled,
          ]}
          onPress={() => selectCampaignType(opt.type)}
        >
          <View style={styles.typeIconWrap}>
            <Ionicons name={opt.icon} size={18} color={draft.campaignType === opt.type ? colors.primary : colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.typeTitle}>{opt.title}</Text>
            <Text style={styles.typeDesc}>{opt.desc}</Text>
          </View>
          <Ionicons
            name={draft.campaignType === opt.type ? 'radio-button-on' : 'radio-button-off'}
            size={20}
            color={draft.campaignType === opt.type ? colors.primary : colors.textFaint}
          />
        </TouchableOpacity>
      ))}
      {outOfFreeCampaigns && isExchange && (
        <Text style={styles.warning}>
          You've used today's free campaigns — switch to Paid Advertising to send another one now, or come back
          tomorrow.
        </Text>
      )}

      {draft.campaignType === 'paid' && (
        <View style={styles.costCard}>
          <Text style={styles.costLabel}>Estimated cost</Text>
          <Text style={styles.costValue}>₦{estimatedCost.toLocaleString()}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textDark, marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  hint: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 16 },
  warning: { fontSize: fontSize.xs, color: colors.danger, marginTop: spacing.sm, lineHeight: 16 },
  reachGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reachOption: {
    width: '31%',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  reachOptionActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  reachText: { fontSize: fontSize.md, fontWeight: '800', color: colors.textDark },
  reachTextActive: { color: colors.primaryDark },
  reachSub: { fontSize: fontSize.xs, color: colors.textMuted },
  reachSubActive: { color: colors.primaryDark },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  typeCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  typeCardDisabled: { opacity: 0.55 },
  typeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textDark },
  typeDesc: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  costCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgDark,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  costLabel: { color: colors.textOnDarkMuted, fontWeight: '600' },
  costValue: { color: '#fff', fontWeight: '800', fontSize: fontSize.lg },
});
