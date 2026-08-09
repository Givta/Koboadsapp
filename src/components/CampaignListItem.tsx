import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, radius, spacing } from '../theme/spacing';
import { Campaign } from '../types';
import Badge from './Badge';
import ProgressBar from './ProgressBar';

export default function CampaignListItem({ campaign, onPress }: { campaign: Campaign; onPress?: () => void }) {
  const progress = campaign.targetReach > 0 ? campaign.delivered / campaign.targetReach : 0;
  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.row}>
        {campaign.mediaUrl && campaign.mediaType !== 'video' ? (
          <Image source={{ uri: campaign.mediaUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, { backgroundColor: campaign.imageColor }]} />
        )}
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {campaign.title}
            </Text>
            <Badge status={campaign.status} />
          </View>
          <View style={{ marginTop: 8 }}>
            <ProgressBar progress={progress} />
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>
              {campaign.delivered.toLocaleString()} / {campaign.targetReach.toLocaleString()} views
            </Text>
            <Text style={styles.meta}>₦{campaign.spent.toLocaleString()} spent</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  thumb: { width: 52, height: 52, borderRadius: radius.md },
  info: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.textDark },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  meta: { fontSize: fontSize.xs, color: colors.textMuted },
});
