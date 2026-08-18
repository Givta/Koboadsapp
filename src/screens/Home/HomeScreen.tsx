import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CampaignListItem from '../../components/CampaignListItem';
import QuickAction from '../../components/QuickAction';
import StatCard from '../../components/StatCard';
import { useApp } from '../../context/AppContext';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { colors } from '../../theme/colors';
import { fontSize, radius, spacing } from '../../theme/spacing';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, walletBalance, earningsBalance, campaigns, totalAdsViewed, notifications } = useApp();
  const recent = campaigns.slice(0, 2);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greetingSmall}>Hello,</Text>
            <Text style={styles.greeting}>{user.name.split(' ')[0]} 👋</Text>
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

        <View style={styles.walletCard}>
          <View>
            <Text style={styles.walletLabel}>Wallet Balance</Text>
            <Text style={styles.walletValue}>₦{walletBalance.toLocaleString()}.00</Text>
          </View>
          <TouchableOpacity style={styles.topUpBtn} onPress={() => navigation.navigate('Wallet')}>
            <Text style={styles.topUpText}>Top Up</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <StatCard icon="cash-outline" label="Earnings" value={`₦${earningsBalance.toLocaleString()}`} />
          <StatCard icon="eye-outline" label="Ad Views" value={totalAdsViewed.toLocaleString()} iconColor={colors.info} iconBg={colors.infoBg} />
          <StatCard icon="megaphone-outline" label="Campaigns" value={String(campaigns.length)} iconColor={colors.gold} iconBg="#FDF3E3" />
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <QuickAction icon="add-circle-outline" label="Create Ad" onPress={() => navigation.navigate('CreateAd')} />
          <QuickAction
            icon="megaphone-outline"
            label="My Ads"
            color={colors.info}
            bg={colors.infoBg}
            onPress={() => navigation.navigate('Ads' as never)}
          />
          <QuickAction icon="wallet-outline" label="Top Up" color={colors.gold} bg="#FDF3E3" onPress={() => navigation.navigate('Wallet')} />
          <QuickAction
            icon="arrow-down-circle-outline"
            label="Withdraw"
            color="#8B5CF6"
            bg="#F1EBFE"
            onPress={() => navigation.navigate('WithdrawalHistory')}
          />
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Campaigns</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Ads' as never)}>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>
        {recent.map((c) => (
          <CampaignListItem key={c.id} campaign={c} onPress={() => navigation.navigate('CampaignDetail', { campaignId: c.id })} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: 120 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greetingSmall: { fontSize: fontSize.sm, color: colors.textMuted },
  greeting: { fontSize: fontSize.xl, fontWeight: '800', color: colors.textDark },
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
  walletCard: {
    backgroundColor: colors.bgDark,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginTop: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletLabel: { color: colors.textOnDarkMuted, fontSize: fontSize.sm, fontWeight: '600' },
  walletValue: { color: '#fff', fontSize: fontSize.xxl, fontWeight: '800', marginTop: 4 },
  topUpBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.md },
  topUpText: { color: '#fff', fontWeight: '700', fontSize: fontSize.sm },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textDark, marginTop: spacing.xxl, marginBottom: spacing.md },
  quickActionsRow: { flexDirection: 'row', gap: spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xxl },
  viewAll: { color: colors.primary, fontWeight: '700', fontSize: fontSize.sm },
});
