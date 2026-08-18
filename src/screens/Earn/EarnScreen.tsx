import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../../components/EmptyState';
import ProgressBar from '../../components/ProgressBar';
import { useApp } from '../../context/AppContext';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { colors } from '../../theme/colors';
import { fontSize, radius, spacing } from '../../theme/spacing';
import { AvailableAd } from '../../types';

export default function EarnScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { earningsBalance, availableAds, adsViewedToday, adsViewLimit } = useApp();
  const limitReached = adsViewedToday >= adsViewLimit;

  const handleWatch = (ad: AvailableAd) => {
    if (limitReached) {
      Alert.alert('Daily limit reached', "You've viewed your 10 ads for today. Come back tomorrow.");
      return;
    }
    navigation.navigate('AdViewer', { ad });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Earn by Watching Ads</Text>
      </View>

      <FlatList
        data={availableAds}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.earnCard}>
              <View style={styles.earnCardTop}>
                <View>
                  <Text style={styles.earnLabel}>Available to Earn</Text>
                  <Text style={styles.earnValue}>₦{earningsBalance.toLocaleString()}.00</Text>
                </View>
                <TouchableOpacity style={styles.payoutBtn} onPress={() => navigation.navigate('WithdrawalHistory')}>
                  <Text style={styles.payoutText}>Payout</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.earnHint}>Watch ads daily and earn rewards</Text>
            </View>

            <View style={styles.limitCard}>
              <View style={styles.limitHeader}>
                <Text style={styles.limitTitle}>Daily Limit</Text>
                <Text style={styles.limitValue}>
                  {adsViewedToday} / {adsViewLimit} ads viewed
                </Text>
              </View>
              <ProgressBar progress={adsViewedToday / adsViewLimit} />
              <Text style={styles.limitHint}>You can view {adsViewLimit} ads per day</Text>
            </View>

            <Text style={styles.sectionTitle}>Available Ads</Text>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.adRow} activeOpacity={0.8} onPress={() => handleWatch(item)} disabled={limitReached}>
            {item.mediaUrl && item.mediaType !== 'video' ? (
              <Image source={{ uri: item.mediaUrl }} style={styles.adThumb} />
            ) : (
              <View style={[styles.adThumb, { backgroundColor: item.imageColor }]}>
                <Ionicons name="play" size={16} color="#fff" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.adTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.adSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            </View>
            <View style={styles.adRight}>
              <Text style={styles.adReward}>₦{item.reward}</Text>
              <Text style={styles.adDuration}>{item.duration}s</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState icon="checkmark-done-outline" title="You're all caught up" subtitle="New ads will appear here throughout the day." />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.textDark },
  listContent: { padding: spacing.xl, paddingTop: 0, paddingBottom: spacing.xxxl },
  earnCard: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.xl, marginBottom: spacing.lg },
  earnCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  earnLabel: { color: 'rgba(255,255,255,0.85)', fontSize: fontSize.sm, fontWeight: '600' },
  earnValue: { color: '#fff', fontSize: fontSize.xxl, fontWeight: '800', marginTop: 4 },
  payoutBtn: { backgroundColor: '#fff', paddingHorizontal: spacing.lg, paddingVertical: 9, borderRadius: radius.md },
  payoutText: { color: colors.primaryDark, fontWeight: '800', fontSize: fontSize.sm },
  earnHint: { color: 'rgba(255,255,255,0.85)', fontSize: fontSize.xs, marginTop: spacing.md },
  limitCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  limitHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  limitTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textDark },
  limitValue: { fontSize: fontSize.sm, color: colors.textMuted },
  limitHint: { fontSize: fontSize.xs, color: colors.textFaint, marginTop: spacing.sm },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textDark, marginBottom: spacing.md },
  adRow: {
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
  adThumb: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  adTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textDark },
  adSubtitle: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  adRight: { alignItems: 'flex-end' },
  adReward: { fontSize: fontSize.sm, fontWeight: '800', color: colors.primary },
  adDuration: { fontSize: fontSize.xs, color: colors.textFaint },
});
