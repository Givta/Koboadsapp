import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import ScreenHeader from '../../components/ScreenHeader';
import { colors } from '../../theme/colors';
import { fontSize, spacing } from '../../theme/spacing';
import { getDashboardMetrics } from '../../services/analyticsService';

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getDashboardMetrics()
      .then((m) => {
        if (!mounted) return;
        setMetrics(m);
        setLoading(false);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message ?? 'Failed to load metrics');
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScreenHeader title="Analytics" />
      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : error ? (
          <Text style={{ color: colors.danger }}>{error}</Text>
        ) : (
          <View>
            <View style={styles.row}>
              <Text style={styles.label}>Total users</Text>
              <Text style={styles.value}>{metrics.totalUsers}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Total campaigns</Text>
              <Text style={styles.value}>{metrics.totalCampaigns}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Paid campaigns</Text>
              <Text style={styles.value}>{metrics.totalPaidCampaigns}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Ad deliveries</Text>
              <Text style={styles.value}>{metrics.totalDeliveries}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Transactions</Text>
              <Text style={styles.value}>{metrics.transactionsCount}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Withdrawals</Text>
              <Text style={styles.value}>{metrics.withdrawalsCount}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Total payouts</Text>
              <Text style={styles.value}>₦{metrics.totalPayouts.toLocaleString()}</Text>
            </View>

            <Text style={{ marginTop: spacing.lg, fontWeight: '700' }}>Recent Errors</Text>
            {Array.isArray(metrics.recentErrors) && metrics.recentErrors.length ? (
              metrics.recentErrors.map((e: any) => (
                <View key={e.id} style={{ marginTop: spacing.sm, padding: spacing.sm, backgroundColor: '#fff', borderRadius: 8 }}>
                  <Text style={{ fontWeight: '700' }}>{e.error}</Text>
                  <Text style={{ color: colors.textMuted, marginTop: 6 }}>{e.stack}</Text>
                </View>
              ))
            ) : (
              <Text style={{ color: colors.textMuted }}>No recent errors</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#eee' },
  label: { fontSize: fontSize.md, color: colors.textMuted },
  value: { fontSize: fontSize.md, fontWeight: '800', color: colors.textDark },
});
