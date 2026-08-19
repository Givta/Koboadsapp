import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, radius, spacing } from '../theme/spacing';
import { AvailableAd } from '../types';

export default function DiscoverAdCard({ ad, onPress }: { ad: AvailableAd; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.imageWrap}>
        {ad.mediaUrl && ad.mediaType !== 'video' ? (
          <Image source={{ uri: ad.mediaUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, { backgroundColor: ad.imageColor }]} />
        )}
        <View style={styles.overlay} />
        <Text style={styles.rewardBadge}>Earn ₦{ad.reward.toLocaleString()}</Text>
        <Text style={styles.title} numberOfLines={2}>{ad.title}</Text>
      </View>
      <View style={styles.footer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{ad.advertiser?.charAt(0)?.toUpperCase() || '?'}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.advertiser} numberOfLines={1}>{ad.advertiser}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{ad.subtitle}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const CARD_WIDTH = 150;

const styles = StyleSheet.create({
  wrap: {
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  imageWrap: { width: '100%', height: 110, justifyContent: 'space-between', padding: spacing.sm },
  image: { ...StyleSheet.absoluteFill },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.15)' },
  rewardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  title: { color: '#fff', fontSize: fontSize.sm, fontWeight: '800' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 11, fontWeight: '800', color: colors.primaryDark },
  advertiser: { fontSize: 11, fontWeight: '700', color: colors.textDark },
  subtitle: { fontSize: 10, color: colors.textMuted },
});
