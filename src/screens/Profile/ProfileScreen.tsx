import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { colors } from '../../theme/colors';
import { fontSize, radius, spacing } from '../../theme/spacing';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  trailing?: string;
}

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, walletBalance, adCredits, earningsBalance, totalAdsViewed, logout } = useApp();

  const menuItems: MenuItem[] = [
    { icon: 'person-outline', label: 'Personal Information', onPress: () => navigation.navigate('PersonalInfo') },
    { icon: 'wallet-outline', label: 'Wallet & Transactions', onPress: () => navigation.navigate('Wallet') },
    { icon: 'time-outline', label: 'Withdrawal History', onPress: () => navigation.navigate('WithdrawalHistory') },
    { icon: 'people-outline', label: 'Referral Program', onPress: () => navigation.navigate('Referral'), trailing: 'Earn More' },
    { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => navigation.navigate('Support') },
    { icon: 'settings-outline', label: 'Settings', onPress: () => navigation.navigate('Settings') },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={18} color="#fff" />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.avatarInitials}</Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          {user.isPremium && (
            <View style={styles.premiumPill}>
              <Ionicons name="star" size={11} color={colors.gold} />
              <Text style={styles.premiumText}>Premium Member</Text>
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>₦{walletBalance.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Balance</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>₦{adCredits.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Kobo Credits</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>₦{earningsBalance.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Earned</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalAdsViewed.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Ads Viewed</Text>
            </View>
          </View>
        </View>

        <View style={styles.menu}>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={item.label} style={[styles.menuRow, i === menuItems.length - 1 && { borderBottomWidth: 0 }]} onPress={item.onPress}>
              <View style={styles.menuIconWrap}>
                <Ionicons name={item.icon} size={18} color={colors.text} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.trailing ? <Text style={styles.menuTrailing}>{item.trailing}</Text> : null}
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutRow}
          onPress={() => Alert.alert('Log out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log out', style: 'destructive', onPress: logout },
          ])}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing.xxxl },
  headerCard: {
    backgroundColor: colors.primary,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  settingsBtn: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  avatarText: { fontSize: fontSize.xxl, fontWeight: '800', color: '#fff' },
  name: { fontSize: fontSize.xl, fontWeight: '800', color: '#fff', marginTop: spacing.md },
  premiumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
  },
  premiumText: { color: '#fff', fontSize: fontSize.xs, fontWeight: '700' },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, width: '100%' },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.3)' },
  statValue: { color: '#fff', fontSize: fontSize.md, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: fontSize.xs, marginTop: 2 },
  menu: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: colors.textDark },
  menuTrailing: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '700', marginRight: 4 },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.xxl,
    paddingVertical: spacing.md,
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: fontSize.sm },
});
