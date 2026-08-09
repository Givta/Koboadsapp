import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ScreenHeader from '../../components/ScreenHeader';
import { useApp } from '../../context/AppContext';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { colors } from '../../theme/colors';
import { fontSize, radius, spacing } from '../../theme/spacing';
import { Transaction } from '../../types';

const TOPUP_AMOUNTS = [1000, 5000, 10000, 25000];

const TX_ICON: Record<Transaction['type'], { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  topup: { icon: 'arrow-down-circle-outline', color: colors.success, bg: colors.successBg },
  spend: { icon: 'megaphone-outline', color: colors.danger, bg: colors.dangerBg },
  spend_adcredits: { icon: 'pricetag-outline', color: colors.primary, bg: colors.primaryLight },
  earn: { icon: 'cash-outline', color: colors.success, bg: colors.successBg },
  withdraw: { icon: 'arrow-up-circle-outline', color: colors.warning, bg: colors.warningBg },
  referral: { icon: 'people-outline', color: colors.info, bg: colors.infoBg },
};

export default function WalletScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { walletBalance, adCredits, transactions, topUpWallet } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleTopUp = async (amount: number) => {
    if (!amount) return;
    setSubmitting(true);
    try {
      await topUpWallet(amount);
      setModalVisible(false);
      setCustomAmount('');
      Alert.alert('Wallet funded', `₦${amount.toLocaleString()} has been added to your wallet.`);
    } catch (e: any) {
      Alert.alert('Top up failed', e?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Wallet & Transactions" />
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Wallet Balance</Text>
              <Text style={styles.balanceValue}>₦{walletBalance.toLocaleString()}.00</Text>
              <Text style={styles.creditLabel}>Kobo Credits</Text>
              <Text style={styles.creditValue}>₦{adCredits.toLocaleString()}.00</Text>
              <View style={styles.balanceActions}>
                <Button label="Top Up" style={{ flex: 1 }} onPress={() => setModalVisible(true)} />
                <Button label="Withdraw" variant="outlineLight" style={{ flex: 1 }} onPress={() => navigation.navigate('WithdrawalHistory')} />
              </View>
            </View>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
          </>
        }
        renderItem={({ item }) => {
          const meta = TX_ICON[item.type];
          const isPositive = item.amount > 0;
          return (
            <View style={styles.txRow}>
              <View style={[styles.txIconWrap, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon} size={16} color={meta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.txDate}>{item.date}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.txAmount, { color: isPositive ? colors.success : colors.textDark }]}>
                  {isPositive ? '+' : ''}₦{Math.abs(item.amount).toLocaleString()}
                </Text>
                {item.status === 'pending' && <Text style={styles.txPending}>Pending</Text>}
              </View>
            </View>
          );
        }}
      />

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Top Up Wallet</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textDark} />
              </TouchableOpacity>
            </View>
            <View style={styles.amountGrid}>
              {TOPUP_AMOUNTS.map((amt) => (
                <TouchableOpacity key={amt} style={styles.amountChip} onPress={() => handleTopUp(amt)}>
                  <Text style={styles.amountChipText}>₦{amt.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input
              label="Or enter a custom amount"
              placeholder="₦0.00"
              keyboardType="number-pad"
              value={customAmount}
              onChangeText={setCustomAmount}
            />
            <Button
              label="Continue"
              disabled={!customAmount || submitting}
              loading={submitting}
              onPress={() => handleTopUp(Number(customAmount) || 0)}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  balanceCard: { backgroundColor: colors.bgDark, borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.xl },
  balanceLabel: { color: colors.textOnDarkMuted, fontSize: fontSize.sm, fontWeight: '600' },
  balanceValue: { color: '#fff', fontSize: fontSize.xxxl, fontWeight: '800', marginTop: 4, marginBottom: spacing.lg },
  balanceActions: { flexDirection: 'row', gap: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textDark, marginBottom: spacing.md },
  txRow: {
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
  txIconWrap: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  txTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textDark },
  txDate: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  txAmount: { fontSize: fontSize.sm, fontWeight: '800' },
  txPending: { fontSize: fontSize.xs, color: colors.warning, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textDark },
  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  amountChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  amountChipText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textDark },
  creditLabel: { color: colors.textOnDarkMuted, fontSize: fontSize.sm, fontWeight: '600', marginTop: spacing.md },
  creditValue: { color: '#fff', fontSize: fontSize.xxl, fontWeight: '800', marginTop: 4, marginBottom: spacing.lg },
});
