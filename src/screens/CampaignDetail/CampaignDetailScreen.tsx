import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, View, Image } from 'react-native';
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
  const { campaigns, pauseCampaign, resumeCampaign } = useApp();
  const campaign = campaigns.find((c) => c.id === route.params.campaignId);

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

        {(campaign.status === 'active' || campaign.status === 'paused') && (
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
});
