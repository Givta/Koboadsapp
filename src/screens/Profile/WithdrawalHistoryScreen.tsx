import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import Input from '../../components/Input';
import ScreenHeader from '../../components/ScreenHeader';
import { useApp } from '../../context/AppContext';
import { colors } from '../../theme/colors';
import { fontSize, radius, spacing } from '../../theme/spacing';
import { WithdrawalRequest } from '../../types';

const STATUS_META: Record<WithdrawalRequest['status'], { color: string; bg: string; label: string }> = {
  success: { color: colors.success, bg: colors.successBg, label: 'Successful' },
  pending: { color: colors.warning, bg: colors.warningBg, label: 'Pending' },
  failed: { color: colors.danger, bg: colors.dangerBg, label: 'Failed' },
};

export default function WithdrawalHistoryScreen() {
  const { withdrawals, earningsBalance, withdrawFunds } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleWithdraw = async () => {
    const amt = Number(amount) || 0;
    if (amt <= 0) {
      Alert.alert('Enter an amount', 'Please enter how much you want to withdraw.');
      return;
    }
    if (amt > earningsBalance) {
      Alert.alert('Insufficient balance', "You can't withdraw more than your available earnings.");
      return;
    }
    if (!method.trim()) {
      Alert.alert('Add a payout method', 'Enter a bank or account to withdraw to, e.g. "GTBank •••• 4821".');
      return;
    }
    setSubmitting(true);
    try {
      await withdrawFunds(amt, method.trim());
      setModalVisible(false);
      setAmount('');
      setMethod('');
      Alert.alert('Withdrawal requested', `₦${amt.toLocaleString()} is being processed to ${method.trim()}.`);
    } catch (e: any) {
      Alert.alert('Could not withdraw', e?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Withdrawal History" />
      <FlatList
        data={withdrawals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.summaryCard}>
              <Ionicons name="wallet-outline" size={20} color={colors.primary} />
              <View style={{ marginLeft: spacing.md, flex: 1 }}>
                <Text style={styles.summaryLabel}>Available for withdrawal</Text>
                <Text style={styles.summaryValue}>₦{earningsBalance.toLocaleString()}.00</Text>
              </View>
            </View>
            <Button label="Request Withdrawal" onPress={() => setModalVisible(true)} style={{ marginBottom: spacing.xl }} />
          </>
        }
        renderItem={({ item }) => {
          const meta = STATUS_META[item.status];
          return (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.amount}>₦{item.amount.toLocaleString()}.00</Text>
                <Text style={styles.method}>{item.method}</Text>
                <Text style={styles.date}>{item.date}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState icon="time-outline" title="No withdrawals yet" subtitle="Your withdrawal history will appear here." />}
      />

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Withdrawal</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textDark} />
              </TouchableOpacity>
            </View>
            <Input label="Amount" placeholder="₦0.00" keyboardType="number-pad" value={amount} onChangeText={setAmount} />
            <Input label="Payout method" placeholder="e.g. GTBank •••• 4821" value={method} onChangeText={setMethod} />
            <Button label="Submit Request" loading={submitting} onPress={handleWithdraw} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryLabel: { fontSize: fontSize.xs, color: colors.primaryDark, fontWeight: '600' },
  summaryValue: { fontSize: fontSize.lg, color: colors.textDark, fontWeight: '800', marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  amount: { fontSize: fontSize.md, fontWeight: '800', color: colors.textDark },
  method: { fontSize: fontSize.sm, color: colors.text, marginTop: 2 },
  date: { fontSize: fontSize.xs, color: colors.textFaint, marginTop: 2 },
  statusPill: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  statusText: { fontSize: fontSize.xs, fontWeight: '700' },
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
});
