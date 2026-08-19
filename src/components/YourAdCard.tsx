import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, radius, spacing } from '../theme/spacing';
import { Campaign } from '../types';
import Badge from './Badge';
import ProgressBar from './ProgressBar';

function daysAgoLabel(createdAt: string): string {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return '';
  const diffDays = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

export default function YourAdCard({ campaign, onPress }: { campaign: Campaign; onPress?: () => void }) {
  const progress = campaign.targetReach > 0 ? campaign.delivered / campaign.targetReach : 0;
  const progressPct = Math.round(Math.max(0, Math.min(1, progress)) * 100);

  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.imageWrap}>
        {campaign.mediaUrl && campaign.mediaType !== 'video' ? (
          <Image source={{ uri: campaign.mediaUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, { backgroundColor: campaign.imageColor }]} />
        )}
        <View style={styles.badgeWrap}>
          <Badge status={campaign.status} />
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{campaign.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {campaign.category || 'General'} · {daysAgoLabel(campaign.createdAt)}
        </Text>

        <View style={styles.progressWrap}>
          <ProgressBar progress={progress} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={12} color={colors.textMuted} />
            <Text style={styles.statText}>{campaign.delivered.toLocaleString()}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={12} color={colors.textMuted} />
            <Text style={styles.statText}>{campaign.opened.toLocaleString()}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="trending-up-outline" size={12} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.primary, fontWeight: '800' }]}>{progressPct}%</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  imageWrap: { width: '100%', height: 96, position: 'relative' },
  image: { width: '100%', height: '100%' },
  badgeWrap: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  body: { padding: spacing.md },
  title: { fontSize: fontSize.sm, fontWeight: '800', color: colors.textDark },
  meta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  progressWrap: { marginTop: spacing.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { fontSize: 10, color: colors.textMuted, fontWeight: '700' },
});
