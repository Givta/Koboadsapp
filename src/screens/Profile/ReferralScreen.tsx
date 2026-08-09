import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Share, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import Button from '../../components/Button';
import ScreenHeader from '../../components/ScreenHeader';
import { useApp } from '../../context/AppContext';
import { colors } from '../../theme/colors';
import { fontSize, radius, spacing } from '../../theme/spacing';
import { WEB_HOST, DEEP_LINK_SCHEME } from '../../data/constants';

export default function ReferralScreen() {
  const { referrals, user } = useApp();
  const activeCount = referrals.filter((r) => r.status === 'active').length;
  const totalEarned = referrals.reduce((sum, r) => sum + r.reward, 0);

  const handleCopy = async () => {
    const link = Platform.OS === 'web' ? `${WEB_HOST}/signup?ref=${user.referralCode}` : `${DEEP_LINK_SCHEME}signup?ref=${user.referralCode}`;
    await Clipboard.setStringAsync(link);
    Alert.alert('Copied', 'Referral link copied to clipboard.');
  };

  const handleShare = async () => {
    try {
      const link = Platform.OS === 'web' ? `${WEB_HOST}/signup?ref=${user.referralCode}` : `${DEEP_LINK_SCHEME}signup?ref=${user.referralCode}`;
      await Share.share({
        message: `Join me on KoboAds and advertise to real people without a huge budget. Use my referral link ${link} when you sign up!`,
      });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Referral Program" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Ionicons name="gift-outline" size={26} color="#fff" />
          <Text style={styles.heroTitle}>Invite business owners, earn together</Text>
          <Text style={styles.heroSubtitle}>
            Invite a business owner. When they view a few ads (or create a campaign), you both earn Kobo Credits.
          </Text>
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Your referral code</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeText}>{user.referralCode}</Text>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={handleCopy}
            >
              <Ionicons name="copy-outline" size={16} color={colors.primary} />
              <Text style={styles.copyText}>Copy</Text>
            </TouchableOpacity>
          </View>
            <Button label="Share Invite Link" style={{ marginTop: spacing.lg }} onPress={handleShare} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{referrals.length}</Text>
            <Text style={styles.statLabel}>Total Invited</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₦{totalEarned.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Your Referrals</Text>
        {referrals.map((r) => (
          <View key={r.id} style={styles.refRow}>
            <View style={styles.refAvatar}>
              <Text style={styles.refAvatarText}>{r.name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.refName}>{r.name}</Text>
              <Text style={styles.refDate}>Joined {r.joinedDate}</Text>
              {r.status === 'active' && r.activatedAt ? (
                <Text style={[styles.refDate, { color: colors.success }]}>Activated {r.activatedAt}</Text>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.refStatus, r.status === 'active' ? styles.refStatusActive : styles.refStatusPending]}>
                {r.status === 'active' ? 'Active' : 'Pending'}
              </Text>
              {r.reward > 0 && <Text style={styles.refReward}>+₦{r.reward}</Text>}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  heroCard: { backgroundColor: colors.bgDark, borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.lg },
  heroTitle: { color: '#fff', fontSize: fontSize.lg, fontWeight: '800', marginTop: spacing.md },
  heroSubtitle: { color: colors.textOnDarkMuted, fontSize: fontSize.sm, marginTop: spacing.sm, lineHeight: 20 },
  codeCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  codeLabel: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '600' },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  codeText: { fontSize: fontSize.xl, fontWeight: '800', color: colors.textDark, letterSpacing: 2 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryLight, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.md },
  copyText: { color: colors.primaryDark, fontWeight: '700', fontSize: fontSize.xs },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  statCard: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  statValue: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textDark },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textDark, marginBottom: spacing.md },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  refAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  refAvatarText: { color: colors.primaryDark, fontWeight: '800' },
  refName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textDark },
  refDate: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  refStatus: { fontSize: fontSize.xs, fontWeight: '700' },
  refStatusActive: { color: colors.success },
  refStatusPending: { color: colors.warning },
  refReward: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
});
