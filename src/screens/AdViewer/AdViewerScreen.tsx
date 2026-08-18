import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import { useApp } from '../../context/AppContext';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { colors } from '../../theme/colors';
import { fontSize, radius, spacing } from '../../theme/spacing';

type Props = NativeStackScreenProps<RootStackParamList, 'AdViewer'>;

export default function AdViewerScreen({ route, navigation }: Props) {
  const { ad } = route.params;
  const { watchAd, availableAds } = useApp();

  // The ad might get marked opened by another tab/device while this screen is
  // open — reflect that instead of trusting the params snapshot forever.
  const live = availableAds.find((a) => a.deliveryId === ad.deliveryId);
  const alreadyClaimed = !live;

  const [secondsLeft, setSecondsLeft] = useState(Math.min(ad.duration || 15, 15));
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const canClaim = secondsLeft <= 0 && !alreadyClaimed && !claimed;

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await watchAd(ad.deliveryId);
      setClaimed(true);
    } catch (e: any) {
      Alert.alert('Could not claim reward', e?.message ?? 'Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  const handleCta = () => {
    if (ad.websiteLink) {
      Linking.openURL(ad.websiteLink.startsWith('http') ? ad.websiteLink : `https://${ad.websiteLink}`).catch(() => {
        Alert.alert("Couldn't open link", ad.websiteLink);
      });
    } else if (ad.contact) {
      Alert.alert('Contact', ad.contact);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sponsored</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {ad.mediaUrl && ad.mediaType !== 'video' ? (
          <Image source={{ uri: ad.mediaUrl }} style={styles.media} resizeMode="cover" />
        ) : (
          <View style={[styles.media, styles.mediaFallback, { backgroundColor: ad.imageColor }]}>
            <Ionicons name={ad.mediaType === 'video' ? 'play-circle' : 'megaphone'} size={48} color="#fff" />
          </View>
        )}

        <View style={styles.body}>
          <Text style={styles.advertiser}>{ad.advertiser}</Text>
          <Text style={styles.title}>{ad.title}</Text>
          <Text style={styles.subtitle}>{ad.subtitle}</Text>

          {(ad.websiteLink || ad.contact) && (
            <Button
              label={ad.callToAction || 'Learn more'}
              variant="outline"
              onPress={handleCta}
              style={{ marginTop: spacing.lg }}
            />
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {alreadyClaimed || claimed ? (
          <View style={styles.claimedRow}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.claimedText}>Reward claimed — thanks for watching!</Text>
          </View>
        ) : (
          <Button
            label={canClaim ? `Claim ₦${ad.reward} reward` : `Claim in ${secondsLeft}s`}
            onPress={handleClaim}
            disabled={!canClaim}
            loading={claiming}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textMuted },
  content: { paddingBottom: spacing.xxxl },
  media: { width: '100%', height: 280 },
  mediaFallback: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.xl },
  advertiser: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.textDark, marginTop: spacing.sm },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 20 },
  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  claimedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  claimedText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.success },
});
