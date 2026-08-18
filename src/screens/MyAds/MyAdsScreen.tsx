import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import CampaignListItem from '../../components/CampaignListItem';
import EmptyState from '../../components/EmptyState';
import { useApp } from '../../context/AppContext';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { colors } from '../../theme/colors';
import { fontSize, radius, spacing } from '../../theme/spacing';
import { AvailableAd, CampaignStatus } from '../../types';

const TABS: { key: CampaignStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending_approval', label: 'Pending' },
  { key: 'active', label: 'Active' },
  { key: 'paused', label: 'Paused' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
];

const RECEIVED_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  delivered: { label: 'New', color: colors.warning, bg: colors.warningBg },
  opened: { label: 'Opened', color: colors.info, bg: colors.infoBg },
  clicked: { label: 'Clicked', color: colors.success, bg: colors.successBg },
};

function ReceivedAdRow({ ad, onPress }: { ad: AvailableAd; onPress: () => void }) {
  const meta = RECEIVED_STATUS_META[ad.status ?? 'delivered'];
  return (
    <TouchableOpacity style={styles.receivedRow} activeOpacity={0.8} onPress={onPress}>
      {ad.mediaUrl && ad.mediaType !== 'video' ? (
        <Image source={{ uri: ad.mediaUrl }} style={styles.receivedThumb} />
      ) : (
        <View style={[styles.receivedThumb, { backgroundColor: ad.imageColor }]} />
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.receivedTitle} numberOfLines={1}>{ad.title}</Text>
        <Text style={styles.receivedAdvertiser} numberOfLines={1}>{ad.advertiser} · {ad.deliveredAt}</Text>
      </View>
      <View style={[styles.receivedBadge, { backgroundColor: meta.bg }]}>
        <Text style={[styles.receivedBadgeText, { color: meta.color }]}>{meta.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function MyAdsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const { campaigns, receivedAds } = useApp();
  const [section, setSection] = useState<'mine' | 'received'>(route.params?.initialSection ?? 'mine');
  const [tab, setTab] = useState<CampaignStatus | 'all'>('all');

  // If the tab is already mounted and a new notification-tap re-navigates
  // here with a different initialSection, follow it instead of staying put.
  React.useEffect(() => {
    if (route.params?.initialSection) setSection(route.params.initialSection);
  }, [route.params?.initialSection]);

  const filtered = tab === 'all' ? campaigns : campaigns.filter((c) => c.status === tab);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Ads</Text>
      </View>

      <View style={styles.sectionSwitch}>
        <TouchableOpacity
          style={[styles.sectionBtn, section === 'received' && styles.sectionBtnActive]}
          onPress={() => setSection('received')}
        >
          <Text style={[styles.sectionBtnText, section === 'received' && styles.sectionBtnTextActive]}>
            Received{receivedAds.length ? ` (${receivedAds.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sectionBtn, section === 'mine' && styles.sectionBtnActive]}
          onPress={() => setSection('mine')}
        >
          <Text style={[styles.sectionBtnText, section === 'mine' && styles.sectionBtnTextActive]}>My Campaigns</Text>
        </TouchableOpacity>
      </View>

      {section === 'mine' ? (
        <>
          <View style={styles.tabsRow}>
            {TABS.map((t) => (
              <TouchableOpacity key={t.key} style={styles.tabBtn} onPress={() => setTab(t.key)}>
                <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
                {tab === t.key && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <CampaignListItem campaign={item} onPress={() => navigation.navigate('CampaignDetail', { campaignId: item.id })} />
            )}
            ListEmptyComponent={
              <EmptyState icon="megaphone-outline" title="No campaigns here yet" subtitle="Campaigns you create — pushed or still pending — show up here." />
            }
          />

          <View style={styles.footer}>
            <Button label="Create New Ad" icon={<Ionicons name="add" size={18} color="#fff" />} onPress={() => navigation.navigate('CreateAd')} />
          </View>
        </>
      ) : (
        <FlatList
          data={receivedAds}
          keyExtractor={(item) => item.deliveryId}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ReceivedAdRow ad={item} onPress={() => navigation.navigate('AdViewer', { ad: item })} />
          )}
          ListEmptyComponent={
            <EmptyState icon="notifications-outline" title="No ads received yet" subtitle="Ads pushed to you by other advertisers will show up here." />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.textDark },
  sectionSwitch: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: spacing.md,
  },
  sectionBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  sectionBtnActive: { backgroundColor: colors.primaryLight },
  sectionBtnText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textMuted },
  sectionBtnTextActive: { color: colors.primaryDark },
  tabsRow: { flexDirection: 'row', paddingHorizontal: spacing.xl, gap: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBtn: { paddingBottom: spacing.sm },
  tabText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.textDark, fontWeight: '800' },
  tabUnderline: { height: 2, backgroundColor: colors.primary, marginTop: 8, borderRadius: 2 },
  listContent: { padding: spacing.xl, paddingBottom: 140 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.xl,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  receivedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  receivedThumb: { width: 48, height: 48, borderRadius: radius.sm },
  receivedTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textDark },
  receivedAdvertiser: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  receivedBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  receivedBadgeText: { fontSize: fontSize.xs, fontWeight: '700' },
});
