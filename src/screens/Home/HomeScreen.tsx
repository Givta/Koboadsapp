import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DiscoverAdCard from '../../components/DiscoverAdCard';
import ModalSheet from '../../components/ModalSheet';
import ReachGauge from '../../components/ReachGauge';
import YourAdCard from '../../components/YourAdCard';
import { useApp } from '../../context/AppContext';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { colors } from '../../theme/colors';
import { fontSize, radius, spacing } from '../../theme/spacing';

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, campaigns, availableAds, notifications, appConfig } = useApp();
  const [howItWorksVisible, setHowItWorksVisible] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const locationLabel = [user.location, user.state].filter(Boolean).join(', ');

  // --- Real "advertising power" math, driven by the same config the
  // create-campaign flow enforces (src/data/constants.ts / configService) ---
  const todayStr = new Date().toISOString().slice(0, 10);
  const freeCampaignsToday = campaigns.filter(
    (c) => c.campaignType === 'exchange' && c.createdAt === todayStr
  ).length;
  const adsAvailableToday = Math.max(0, appConfig.dailyFreeCampaignLimit - freeCampaignsToday);
  const reachPerAd = appConfig.freeCampaignMaxReach;
  const totalReachToday = appConfig.dailyFreeCampaignLimit * reachPerAd;
  const reachRemainingToday = adsAvailableToday * reachPerAd;
  const reachAvailablePct = totalReachToday > 0 ? (reachRemainingToday / totalReachToday) * 100 : 0;

  const yourAds = campaigns.slice(0, 2);
  const discoverAds = availableAds.slice(0, 8);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greetingSmall}>
              {timeGreeting()}, {user.name.split(' ')[0] || 'there'} 👋
            </Text>
            <Text style={styles.greeting}>Grow your business. Get more customers.</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={20} color={colors.textDark} />
            {unreadCount > 0 && (
              <View style={styles.bellDot}>
                <Text style={styles.bellDotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {locationLabel ? (
          <TouchableOpacity style={styles.locationPill} activeOpacity={0.8} onPress={() => navigation.navigate('PersonalInfo')}>
            <Ionicons name="location-outline" size={14} color={colors.primary} />
            <Text style={styles.locationText}>{locationLabel}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.powerCard}>
          <View style={styles.powerCardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.powerLabel}>Your Advertising Power</Text>
              <View style={styles.trRow}>
                <Text style={styles.trValue}>{reachRemainingToday.toLocaleString()}</Text>
                <Text style={styles.trValueMuted}> / {totalReachToday.toLocaleString()} TR</Text>
              </View>
              <Text style={styles.trHint}>Total Reach available today</Text>

              <View style={styles.powerStatsRow}>
                <View style={styles.powerStatItem}>
                  <Ionicons name="megaphone-outline" size={14} color="#fff" />
                  <Text style={styles.powerStatText}>{adsAvailableToday} Ads Available</Text>
                </View>
                <View style={styles.powerStatItem}>
                  <Ionicons name="people-outline" size={14} color="#fff" />
                  <Text style={styles.powerStatText}>{reachPerAd.toLocaleString()} TR Per Ad</Text>
                </View>
              </View>
            </View>

            <ReachGauge percent={reachAvailablePct} />
          </View>

          <View style={styles.powerCardBottom}>
            <TouchableOpacity
              style={[styles.createAdBtn, adsAvailableToday === 0 && styles.createAdBtnDisabled]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CreateAd')}
            >
              <Ionicons name="megaphone" size={16} color={colors.textDark} />
              <Text style={styles.createAdText}>Create New Ad</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setHowItWorksVisible(true)}
            >
              <Text style={styles.howItWorks}>How it works →</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Your Ads</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Ads' as never)}>
            <Text style={styles.viewAll}>View all →</Text>
          </TouchableOpacity>
        </View>
        {yourAds.length > 0 ? (
          <View style={styles.yourAdsRow}>
            {yourAds.map((c) => (
              <YourAdCard key={c.id} campaign={c} onPress={() => navigation.navigate('CampaignDetail', { campaignId: c.id })} />
            ))}
          </View>
        ) : (
          <TouchableOpacity style={styles.emptyAdsCard} activeOpacity={0.85} onPress={() => navigation.navigate('CreateAd')}>
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            <Text style={styles.emptyAdsText}>You haven't created an ad yet — tap to create one</Text>
          </TouchableOpacity>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Discover Ads</Text>
          <TouchableOpacity onPress={() => (navigation as any).navigate('Ads', { initialSection: 'received' })}>
            <Text style={styles.viewAll}>See more →</Text>
          </TouchableOpacity>
        </View>
        {discoverAds.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.discoverRow}>
            {discoverAds.map((ad) => (
              <DiscoverAdCard key={ad.id} ad={ad} onPress={() => navigation.navigate('AdViewer', { ad })} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyAdsCard}>
            <Ionicons name="sparkles-outline" size={22} color={colors.textFaint} />
            <Text style={styles.emptyAdsText}>No ads to discover right now — check back soon</Text>
          </View>
        )}

        <TouchableOpacity style={styles.inviteBanner} activeOpacity={0.85} onPress={() => navigation.navigate('Referral')}>
          <View style={styles.inviteIconWrap}>
            <Ionicons name="people-circle-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inviteTitle}>Invite other businesses</Text>
            <Text style={styles.inviteSubtitle}>The more you share, the more they see you.</Text>
          </View>
          <View style={styles.inviteBtn}>
            <Text style={styles.inviteBtnText}>Invite & Earn</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </View>
        </TouchableOpacity>
      </ScrollView>
      <ModalSheet visible={howItWorksVisible} title="How it works" onClose={() => setHowItWorksVisible(false)}>
        <Text style={styles.modalDescription}>
          Every day you get {appConfig.dailyFreeCampaignLimit} free ads, each reaching up to {reachPerAd.toLocaleString()}{' '}
          people. Create an ad to send it to other businesses on KoboAds. Need more reach? Boost any campaign with extra
          paid reach at any time.
        </Text>
        <TouchableOpacity style={styles.modalAction} onPress={() => setHowItWorksVisible(false)}>
          <Text style={styles.modalActionText}>Got it</Text>
        </TouchableOpacity>
      </ModalSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: 120 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greetingSmall: { fontSize: fontSize.md, fontWeight: '800', color: colors.textDark },
  greeting: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 3, maxWidth: 220 },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellDotText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginTop: spacing.md,
  },
  locationText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textDark },
  powerCard: {
    backgroundColor: '#07472a',
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
  powerCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  powerLabel: { color: 'rgba(255,255,255,0.7)', fontSize: fontSize.xs, fontWeight: '700' },
  trRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
  trValue: { color: '#fff', fontSize: fontSize.xxl, fontWeight: '800' },
  trValueMuted: { color: 'rgba(255,255,255,0.55)', fontSize: fontSize.md, fontWeight: '700' },
  trHint: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 },
  powerStatsRow: { marginTop: spacing.md, gap: 8 },
  powerStatItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  powerStatText: { color: '#fff', fontSize: fontSize.xs, fontWeight: '600' },
  powerCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  createAdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  createAdBtnDisabled: { opacity: 0.5 },
  createAdText: { color: colors.textDark, fontWeight: '800', fontSize: fontSize.sm },
  howItWorks: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.xs, fontWeight: '700' },
  modalDescription: { fontSize: fontSize.md, color: colors.text, lineHeight: 23, marginBottom: spacing.lg },
  modalAction: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
  },
  modalActionText: { color: '#fff', fontSize: fontSize.md, fontWeight: '800' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xxl },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textDark },
  viewAll: { color: colors.primary, fontWeight: '700', fontSize: fontSize.sm },
  yourAdsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  discoverRow: { gap: spacing.md, marginTop: spacing.md, paddingRight: spacing.md },
  emptyAdsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  emptyAdsText: { flex: 1, fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '600' },
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xxl,
  },
  inviteIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteTitle: { fontSize: fontSize.sm, fontWeight: '800', color: colors.textDark },
  inviteSubtitle: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  inviteBtnText: { color: '#fff', fontWeight: '700', fontSize: 11 },
});
