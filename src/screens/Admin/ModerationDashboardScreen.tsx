import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import ScreenHeader from '../../components/ScreenHeader';
import { approveCampaign, approveMedia, listenPendingAbuseReports, listenPendingCampaignApprovals, listenPendingMediaModeration, rejectCampaign, rejectMedia, resolveAbuseReport } from '../../services/trustSafetyService';
import { colors } from '../../theme/colors';
import { fontSize, radius, spacing } from '../../theme/spacing';
import { AbuseReport, Campaign, MediaModerationRecord } from '../../types';

export default function ModerationDashboardScreen() {
  const [pendingCampaigns, setPendingCampaigns] = useState<Campaign[]>([]);
  const [pendingMedia, setPendingMedia] = useState<MediaModerationRecord[]>([]);
  const [pendingReports, setPendingReports] = useState<AbuseReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCampaigns = listenPendingCampaignApprovals((records) => {
      setPendingCampaigns(records);
      setLoading(false);
    });
    const unsubMedia = listenPendingMediaModeration((records) => {
      setPendingMedia(records);
      setLoading(false);
    });
    const unsubReports = listenPendingAbuseReports((reports) => {
      setPendingReports(reports);
      setLoading(false);
    });
    return () => {
      unsubCampaigns();
      unsubMedia();
      unsubReports();
    };
  }, []);

  const handleApproveCampaign = async (campaignId: string) => {
    try {
      await approveCampaign(campaignId);
      Alert.alert('Campaign approved', 'This campaign is now active and will be delivered to users.');
    } catch (error: any) {
      Alert.alert('Approval failed', error?.message ?? 'Could not approve campaign.');
    }
  };

  const handleRejectCampaign = (campaignId: string) => {
    Alert.alert('Reject campaign', 'Choose a rejection reason', [
      { text: 'Spam or fraud', onPress: () => rejectCampaign(campaignId, 'Campaign violates policies or is fraudulent.') },
      { text: 'Poor quality', onPress: () => rejectCampaign(campaignId, 'Campaign content or quality is unacceptable.') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleApproveMedia = async (mediaId: string) => {
    try {
      await approveMedia(mediaId);
      Alert.alert('Media approved', 'This media has been marked as safe and ready for campaigns.');
    } catch (error: any) {
      Alert.alert('Approval failed', error?.message ?? 'Could not approve media.');
    }
  };

  const handleRejectMedia = (mediaId: string) => {
    Alert.alert('Reject media', 'Choose a rejection reason', [
      { text: 'Inappropriate content', onPress: () => rejectMedia(mediaId, 'Inappropriate content') },
      { text: 'Poor quality', onPress: () => rejectMedia(mediaId, 'Poor quality') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleResolveReport = async (reportId: string, resolution: 'reviewed' | 'dismissed' | 'actioned') => {
    try {
      await resolveAbuseReport({ reportId, resolution, note: resolution === 'actioned' ? 'Action taken by trust and safety team.' : undefined });
      Alert.alert('Report updated', `Report status set to ${resolution}.`);
    } catch (error: any) {
      Alert.alert('Update failed', error?.message ?? 'Could not update the report.');
    }
  };

  const renderCampaignCard = (item: Campaign) => (
    <View style={styles.card} key={item.id}>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Campaign</Text>
        <Text style={styles.cardValue}>{item.title}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Advertiser</Text>
        <Text style={styles.cardValue}>{item.advertiserId}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Type</Text>
        <Text style={styles.cardValue}>{item.campaignType}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Reach</Text>
        <Text style={styles.cardValue}>{item.targetReach.toLocaleString()}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Created</Text>
        <Text style={styles.cardValue}>{item.createdAt}</Text>
      </View>
      <View style={styles.buttonRow}>
        <Button label="Approve" onPress={() => handleApproveCampaign(item.id)} />
        <Button label="Reject" variant="outline" onPress={() => handleRejectCampaign(item.id)} />
      </View>
    </View>
  );

  const renderMediaCard = (item: MediaModerationRecord) => (
    <View style={styles.card} key={item.id}>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Media ID</Text>
        <Text style={styles.cardValue}>{item.id}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Type</Text>
        <Text style={styles.cardValue}>{item.contentType}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Size</Text>
        <Text style={styles.cardValue}>{Math.round(item.sizeBytes / 1024)} KB</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Created</Text>
        <Text style={styles.cardValue}>{item.createdAt}</Text>
      </View>
      <View style={styles.buttonRow}>
        <Button label="Approve" onPress={() => handleApproveMedia(item.id)} />
        <Button label="Reject" variant="outline" onPress={() => handleRejectMedia(item.id)} />
      </View>
    </View>
  );

  const renderReportCard = (item: AbuseReport) => (
    <View style={styles.card} key={item.id}>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Report ID</Text>
        <Text style={styles.cardValue}>{item.id}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Type</Text>
        <Text style={styles.cardValue}>{item.type}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Created</Text>
        <Text style={styles.cardValue}>{item.createdAt}</Text>
      </View>
      <Text style={styles.details}>{item.details}</Text>
      <View style={styles.buttonRow}>
        <Button label="Reviewed" onPress={() => handleResolveReport(item.id, 'reviewed')} />
        <Button label="Actioned" variant="outline" onPress={() => handleResolveReport(item.id, 'actioned')} />
        <Button label="Dismiss" variant="ghost" onPress={() => handleResolveReport(item.id, 'dismissed')} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Moderation Dashboard" />
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Pending campaign approvals ({pendingCampaigns.length})</Text>
        {loading && pendingCampaigns.length === 0 ? (
          <Text style={styles.loadingText}>Loading campaign approvals...</Text>
        ) : pendingCampaigns.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={40} color={colors.primary} />
            <Text style={styles.emptyText}>No pending campaigns to review.</Text>
          </View>
        ) : (
          <FlatList
            data={pendingCampaigns}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => renderCampaignCard(item)}
            contentContainerStyle={styles.listContent}
          />
        )}

        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Pending media moderation ({pendingMedia.length})</Text>
        {loading && pendingMedia.length === 0 ? (
          <Text style={styles.loadingText}>Loading pending media...</Text>
        ) : pendingMedia.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={40} color={colors.primary} />
            <Text style={styles.emptyText}>No pending media at the moment.</Text>
          </View>
        ) : (
          <FlatList
            data={pendingMedia}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => renderMediaCard(item)}
            contentContainerStyle={styles.listContent}
          />
        )}

        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Pending abuse reports ({pendingReports.length})</Text>
        {loading && pendingReports.length === 0 ? (
          <Text style={styles.loadingText}>Loading abuse reports...</Text>
        ) : pendingReports.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={40} color={colors.primary} />
            <Text style={styles.emptyText}>No pending reports at the moment.</Text>
          </View>
        ) : (
          <FlatList
            data={pendingReports}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => renderReportCard(item)}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: spacing.xl },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  summaryTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.textDark },
  summaryCount: { fontSize: fontSize.xl, fontWeight: '800', color: colors.primary },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textDark, marginBottom: spacing.md },
  loadingText: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.md },
  listContent: { gap: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { color: colors.textMuted, fontSize: fontSize.xs },
  cardValue: { color: colors.textDark, fontSize: fontSize.sm, fontWeight: '700' },
  details: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.sm, marginBottom: spacing.sm },
  buttonRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl },
  emptyText: { marginTop: spacing.md, fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
});
