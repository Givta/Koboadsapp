import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, radius } from '../theme/spacing';
import { CampaignStatus } from '../types';

const STATUS_MAP: Record<CampaignStatus, { bg: string; fg: string; label: string }> = {
  active: { bg: colors.successBg, fg: colors.success, label: 'Active' },
  paused: { bg: colors.warningBg, fg: colors.warning, label: 'Paused' },
  completed: { bg: colors.infoBg, fg: colors.info, label: 'Completed' },
  draft: { bg: colors.border, fg: colors.textMuted, label: 'Draft' },
  pending_approval: { bg: colors.warningBg, fg: colors.warning, label: 'Pending Approval' },
  rejected: { bg: colors.dangerBg, fg: colors.danger, label: 'Rejected' },
};

export default function Badge({ status }: { status: CampaignStatus }) {
  const s = STATUS_MAP[status];
  return (
    <View style={[styles.wrap, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  text: { fontSize: fontSize.xs, fontWeight: '700' },
});
