import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import { useApp } from '../../context/AppContext';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { sendVerificationEmail, requestPasswordReset } from '../../services/authService';
import * as notificationService from '../../services/notificationService';
import { colors } from '../../theme/colors';
import { fontSize, radius, spacing } from '../../theme/spacing';

function SettingRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIconWrap}>
        <Ionicons name={icon} size={18} color={colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description ? <Text style={styles.rowDesc}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, toggleReceiveAds, updateNotificationPrefs, deleteAccount } = useApp();
  const [pushBusy, setPushBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSendVerificationEmail = async () => {
    try {
      await sendVerificationEmail();
      Alert.alert('Verification sent', 'Check your email for a verification link.');
    } catch (error: any) {
      Alert.alert('Could not send verification email', error?.message ?? 'Please try again later.');
    }
  };

  const handleSendPasswordReset = async () => {
    try {
      await requestPasswordReset(user.email);
      Alert.alert('Password reset sent', `A reset link was sent to ${user.email}.`);
    } catch (error: any) {
      Alert.alert('Could not send reset email', error?.message ?? 'Please try again later.');
    }
  };

  const handlePushToggle = async (value: boolean) => {
    setPushBusy(true);
    try {
      if (value) {
        const token = await notificationService.registerForPushNotificationsAsync(user.id);
        if (!token && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
          Alert.alert(
            'Could not enable push',
            'Allow notification permission for KoboAds in your device settings, then try again.'
          );
          return;
        }
      } else {
        await notificationService.unregisterForPushNotificationsAsync(user.id);
      }
      await updateNotificationPrefs({ push: value });
    } catch (e: any) {
      Alert.alert('Could not update setting', e?.message ?? 'Please try again.');
    } finally {
      setPushBusy(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your account and sign-in — this action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
            } catch (e: any) {
              Alert.alert('Could not delete account', e?.message ?? 'Please try again or contact support.');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Advertising</Text>
        <View style={styles.card}>
          <SettingRow
            icon="swap-horizontal-outline"
            label="Receive ads (Exchange advertising)"
            description="Turn off to switch to paid-only advertising"
            value={user.receivesAds}
            onValueChange={toggleReceiveAds}
          />
        </View>

        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <SettingRow
            icon="notifications-outline"
            label="Push notifications"
            description={
              Constants.executionEnvironment === ExecutionEnvironment.StoreClient
                ? 'Remote push requires a dev or standalone build; Expo Go does not support it.'
                : 'Allow push notifications for campaign alerts and offers.'
            }
            value={user.notificationPrefs.push}
            onValueChange={handlePushToggle}
            disabled={pushBusy}
          />
          <SettingRow
            icon="mail-outline"
            label="Email updates"
            value={user.notificationPrefs.email}
            onValueChange={(v) => updateNotificationPrefs({ email: v })}
          />
          <SettingRow
            icon="bulb-outline"
            label="Marketing tips"
            value={user.notificationPrefs.marketing}
            onValueChange={(v) => updateNotificationPrefs({ marketing: v })}
          />
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          {!user.emailVerified ? (
            <TouchableOpacity style={styles.linkRow} onPress={handleSendVerificationEmail}>
              <Text style={styles.linkText}>Verify your email</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.linkRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}> 
              <Text style={[styles.linkText, { color: colors.success }]}>Email verified</Text>
            </View>
          )}
          {!user.phoneVerified ? (
            <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('VerifyPhone')}>
              <Text style={styles.linkText}>Verify phone number</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.linkRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}> 
              <Text style={[styles.linkText, { color: colors.success }]}>Phone verified</Text>
            </View>
          )}
          <TouchableOpacity style={styles.linkRow} onPress={handleSendPasswordReset}>
            <Text style={styles.linkText}>Reset password</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.linkRow, { borderBottomWidth: 0 }]}
            disabled={deleting}
            onPress={handleDeleteAccount}
          >
            <Text style={[styles.linkText, { color: colors.danger }]}>{deleting ? 'Deleting…' : 'Delete account'}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIconWrap: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textDark },
  rowDesc: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  linkText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textDark },
});
