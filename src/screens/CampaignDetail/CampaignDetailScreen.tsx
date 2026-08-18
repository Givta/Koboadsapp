import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import ProgressBar from '../../components/ProgressBar';
import ScreenHeader from '../../components/ScreenHeader';
import { useApp } from '../../context/AppContext';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { colors } from '../../theme/colors';
import { fontSize, radius, spacing } from '../../theme/spacing';

type Props = NativeStackScreenProps<RootStackParamList, 'CampaignDetail'>;

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function CampaignDetailScreen({ route, navigation }: Props) {
  const { campaigns, pauseCampaign, resumeCampaign, boostCampaign, appConfig, walletBalance } = useApp();
  const campaign = campaigns.find((c) => c.id === route.params.campaignId);

  const [boostVisible, setBoostVisible] = useState(false);
  const [selectedBoost, setSelectedBoost] = useState<number | null>(null);
  const [boosting, setBoosting] = useState(false);

  if (!campaign) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Campaign" />
        <View style={styles.center}>
          <Text>Campaign not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const remaining = Math.max(0, campaign.targetReach - campaign.delivered);
  const progress = campaign.targetReach > 0 ? campaign.delivered / campaign.targetReach : 0;
  const canBoost = campaign.status === 'active' || campaign.status === 'paused';
  const boostCost = selectedBoost ? Math.round(selectedBoost * appConfig.costPerReachNaira) : 0;

  const openBoost = () => {
    setSelectedBoost(appConfig.boostReachSteps[0] ?? 200);
    setBoostVisible(true);
  };

  const handleConfirmBoost = async () => {
    if (!selectedBoost) return;
    if (boostCost > walletBalance) {
      Alert.alert('Insufficient balance', `This boost costs ₦${boostCost.toLocaleString()}. Top up your wallet first.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Top Up', onPress: () => navigation.navigate('Wallet') },
      ]);
      return;
    }
    setBoosting(true);
    try {
      await boostCampaign(campaign.id, selectedBoost);
      setBoostVisible(false);
      Alert.alert('Campaign boosted', `You've added ${selectedBoost.toLocaleString()} more people to this campaign's reach.`);
    } catch (e: any) {
      Alert.alert('Could not boost campaign', e?.message ?? 'Please try again.');
    } finally {
      setBoosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Campaign Details" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.topRow}>
            {campaign.mediaUrl && campaign.mediaType !== 'video' ? (
              <Image source={{ uri: campaign.mediaUrl }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, { backgroundColor: campaign.imageColor }]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{campaign.title}</Text>
              <Text style={styles.desc} numberOfLines={2}>
                {campaign.description}
              </Text>
            </View>
          </View>
          <View style={styles.badgeRow}>
            <Badge status={campaign.status} />
            <Text style={styles.dateText}>Started {campaign.createdAt}</Text>
          </View>
          {campaign.status === 'rejected' && campaign.rejectionReason && (
            <View style={styles.rejectionBox}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.rejectionText}>{campaign.rejectionReason}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Target reach</Text>
            <Text style={styles.progressValue}>{campaign.targetReach.toLocaleString()}</Text>
          </View>
          <ProgressBar progress={progress} height={8} />
          <View style={styles.statsGrid}>
            <StatBlock label="Delivered" value={campaign.delivered.toLocaleString()} />
            <StatBlock label="Opened" value={campaign.opened.toLocaleString()} />
            <StatBlock label="Clicks" value={campaign.clicked.toLocaleString()} />
            <StatBlock label="Remaining" value={remaining.toLocaleString()} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Campaign info</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={colors.textMuted} />
            <Text style={styles.infoText}>{campaign.location}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="pricetag-outline" size={16} color={colors.textMuted} />
            <Text style={styles.infoText}>{campaign.category}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={16} color={colors.textMuted} />
            <Text style={styles.infoText}>
              {campaign.campaignType === 'paid' ? `Paid — ₦${campaign.spent.toLocaleString()} spent` : 'Exchange advertising'}
            </Text>
          </View>
        </View>

        {canBoost && (
          <View style={styles.boostCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.boostTitle}>Want more reach?</Text>
              <Text style={styles.boostDesc}>
                {campaign.campaignType === 'exchange'
                  ? 'Boost this free campaign beyond its 1,000-person cap with a paid top-up.'
                  : 'Pay to extend this campaign to reach even more people.'}
              </Text>
            </View>
            <Button label="Boost" onPress={openBoost} fullWidth={false} style={{ paddingHorizontal: spacing.lg }} />
          </View>
        )}

        {canBoost && (
          <Button
            label={campaign.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
            variant={campaign.status === 'active' ? 'outline' : 'primary'}
            onPress={() => (campaign.status === 'active' ? pauseCampaign(campaign.id) : resumeCampaign(campaign.id))}
            style={{ marginTop: spacing.md }}
          />
        )}
        <Button
          label="Report abuse"
          variant="outline"
          onPress={() => navigation.navigate('ReportAbuse', { reportedCampaignId: campaign.id })}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>

      <Modal visible={boostVisible} animationType="slide" transparent onRequestClose={() => setBoostVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Boost this campaign</Text>
              <TouchableOpacity onPress={() => setBoostVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textDark} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>How many more people should see this ad?</Text>
            <View style={styles.boostGrid}>
              {appConfig.boostReachSteps.map((step) => (
                <TouchableOpacity
                  key={step}
                  style={[styles.boostOption, selectedBoost === step && styles.boostOptionActive]}
                  onPress={() => setSelectedBoost(step)}
                >
                  <Text style={[styles.boostOptionText, selectedBoost === step && styles.boostOptionTextActive]}>
                    +{step.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.costCard}>
              <Text style={styles.costLabel}>Cost</Text>
              <Text style={styles.costValue}>₦{boostCost.toLocaleString()}</Text>
            </View>
            <Button label="Confirm Boost" onPress={handleConfirmBoost} loading={boosting} disabled={!selectedBoost} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  topRow: { flexDirection: 'row', gap: spacing.md },
  thumb: { width: 56, height: 56, borderRadius: radius.md },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textDark },
  desc: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  rejectionText: { flex: 1, minWidth: 0, fontSize: fontSize.sm, color: colors.danger, lineHeight: 18 },
  dateText: { fontSize: fontSize.xs, color: colors.textFaint },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  progressLabel: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '600' },
  progressValue: { fontSize: fontSize.sm, color: colors.textDark, fontWeight: '800' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.lg, gap: spacing.md },
  statBlock: { width: '45%' },
  statValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.textDark },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  cardTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.textDark, marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  infoText: { fontSize: fontSize.sm, color: colors.text },
  boostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  boostTitle: { fontSize: fontSize.sm, fontWeight: '800', color: colors.primaryDark },
  boostDesc: { fontSize: fontSize.xs, color: colors.primaryDark, marginTop: 2, lineHeight: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textDark },
  modalSub: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.lg },
  boostGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  boostOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  boostOptionActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  boostOptionText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textDark },
  boostOptionTextActive: { color: colors.primaryDark },
  costCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgDark,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  costLabel: { color: colors.textOnDarkMuted, fontWeight: '600' },
  costValue: { color: '#fff', fontWeight: '800', fontSize: fontSize.lg },
});
