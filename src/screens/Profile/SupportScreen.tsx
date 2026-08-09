import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import ScreenHeader from '../../components/ScreenHeader';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { colors } from '../../theme/colors';
import { fontSize, radius, spacing } from '../../theme/spacing';

const FAQS = [
  {
    q: 'How does Exchange Advertising work?',
    a: 'You create a campaign and let KoboAds distribute it to eligible users for free. In return, you agree to receive up to 2 ads per day from other participants.',
  },
  {
    q: 'How is my daily ad limit calculated?',
    a: 'Every participating user can receive a maximum of 2 advertisements per day. The count resets the following day.',
  },
  {
    q: 'How do I withdraw my earnings?',
    a: 'Go to Profile > Wallet & Transactions and tap Withdraw. Funds are sent to your linked bank account or mobile wallet.',
  },
  {
    q: 'Can I switch from Exchange to Paid advertising?',
    a: 'Yes. Go to Settings and turn off "Receive ads" to switch to paid-only advertising at any time.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity style={styles.faqItem} onPress={() => setOpen((v) => !v)} activeOpacity={0.8}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{q}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </View>
      {open && <Text style={styles.faqAnswer}>{a}</Text>}
    </TouchableOpacity>
  );
}

export default function SupportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAdmin } = useApp();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Help & Support" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactCard} onPress={() => Linking.openURL('mailto:support@koboads.com')}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <Text style={styles.contactLabel}>Email us</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactCard}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
            <Text style={styles.contactLabel}>Live chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactCard}>
            <Ionicons name="call-outline" size={20} color={colors.primary} />
            <Text style={styles.contactLabel}>Call us</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactCard} onPress={() => navigation.navigate('ReportAbuse')}>
            <Ionicons name="flag-outline" size={20} color={colors.primary} />
            <Text style={styles.contactLabel}>Report abuse</Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity style={styles.contactCard} onPress={() => navigation.navigate('ModerationDashboard')}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              <Text style={styles.contactLabel}>Moderation dashboard</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {FAQS.map((f) => (
          <FaqItem key={f.q} q={f.q} a={f.a} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  contactRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  contactCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
  },
  contactLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textDark },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textDark, marginBottom: spacing.md },
  faqItem: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  faqQuestion: { flex: 1, fontSize: fontSize.sm, fontWeight: '700', color: colors.textDark },
  faqAnswer: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 20 },
});
