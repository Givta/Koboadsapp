import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import CampaignListItem from '../../components/CampaignListItem';
import EmptyState from '../../components/EmptyState';
import { useApp } from '../../context/AppContext';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { colors } from '../../theme/colors';
import { fontSize, spacing } from '../../theme/spacing';
import { CampaignStatus } from '../../types';

const TABS: { key: CampaignStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending_approval', label: 'Pending' },
  { key: 'active', label: 'Active' },
  { key: 'paused', label: 'Paused' },
  { key: 'completed', label: 'Completed' },
];

export default function MyAdsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { campaigns } = useApp();
  const [tab, setTab] = useState<CampaignStatus | 'all'>('all');

  const filtered = tab === 'all' ? campaigns : campaigns.filter((c) => c.status === tab);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Ads</Text>
      </View>

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
          <EmptyState icon="megaphone-outline" title="No campaigns here yet" subtitle="Campaigns in this category will show up here." />
        }
      />

      <View style={styles.footer}>
        <Button label="Create New Ad" icon={<Ionicons name="add" size={18} color="#fff" />} onPress={() => navigation.navigate('CreateAd')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.textDark },
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
});
