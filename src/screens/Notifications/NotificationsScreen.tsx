import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../../components/EmptyState';
import ScreenHeader from '../../components/ScreenHeader';
import { useApp } from '../../context/AppContext';
import { routeNotificationTap } from '../../navigation/navigationRef';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { colors } from '../../theme/colors';
import { fontSize, radius, spacing } from '../../theme/spacing';
import { AppNotification } from '../../types';

const TYPE_ICON: Record<AppNotification['type'], keyof typeof Ionicons.glyphMap> = {
  ad_delivered: 'megaphone',
  campaign_approved: 'checkmark-circle',
  campaign_rejected: 'close-circle',
  campaign_boosted: 'rocket',
  referral_reward: 'gift',
};

const TYPE_COLOR: Record<AppNotification['type'], string> = {
  ad_delivered: colors.info,
  campaign_approved: colors.success,
  campaign_rejected: colors.danger,
  campaign_boosted: colors.primary,
  referral_reward: colors.warning,
};

function NotificationRow({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const iconColor = TYPE_COLOR[item.type] ?? colors.textMuted;
  return (
    <TouchableOpacity style={[styles.row, !item.read && styles.rowUnread]} activeOpacity={0.8} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: `${iconColor}1A` }]}>
        <Ionicons name={TYPE_ICON[item.type] ?? 'notifications'} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.date}>{item.createdAt}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { notifications, markNotificationRead } = useApp();

  const handlePress = (item: AppNotification) => {
    if (!item.read) markNotificationRead(item.id).catch(() => {});
    // Route via the exact same logic a push-tap uses, so in-app taps and OS
    // notification taps always land in the same place for a given type.
    routeNotificationTap(item.data);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Notifications" />
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => <NotificationRow item={item} onPress={() => handlePress(item)} />}
        ListEmptyComponent={
          <EmptyState icon="notifications-outline" title="Nothing yet" subtitle="Campaign updates, new ads, and referral rewards will show up here." />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  rowUnread: { borderColor: colors.primary },
  iconWrap: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textDark },
  body: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  date: { fontSize: fontSize.xs, color: colors.textFaint, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
});
