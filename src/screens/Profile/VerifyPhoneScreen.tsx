import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { colors } from '../../theme/colors';
import { fontSize, radius, spacing } from '../../theme/spacing';

type Props = NativeStackNavigationProp<RootStackParamList, 'VerifyPhone'>;

/**
 * SMS phone verification is not wired up yet. It previously used
 * expo-firebase-recaptcha's FirebaseRecaptchaVerifierModal, which crashes on
 * mount ("No Firebase App '[DEFAULT]' has been created") because it depends
 * on the legacy firebase-compat SDK being globally initialized via
 * firebase.initializeApp() — this project only uses the modular v9+ SDK
 * (initializeApp from 'firebase/app'), which the compat namespace never
 * touches. That library is effectively unmaintained for this setup.
 *
 * Real options going forward:
 *  - @react-native-firebase/auth, which has native phone-auth support but
 *    requires a custom EAS development build (won't run in Expo Go).
 *  - A hand-rolled WebView-based reCAPTCHA challenge bridging back into
 *    Firebase's modular signInWithPhoneNumber() (which itself is already
 *    correctly wired in src/services/authService.ts and doesn't need to
 *    change — only the verifier UI does).
 *
 * Showing an honest "not available yet" screen instead of crashing until
 * one of those is built.
 */
export default function VerifyPhoneScreen() {
  const navigation = useNavigation<Props>();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>

        <View style={styles.iconWrap}>
          <Ionicons name="phone-portrait-outline" size={28} color={colors.primary} />
        </View>

        <Text style={styles.title}>Phone verification isn't ready yet</Text>
        <Text style={styles.subtitle}>
          SMS verification is still being built. You can keep using KoboAds without it — we'll let you know here as
          soon as it's available.
        </Text>

        <TouchableOpacity style={styles.supportBtn} onPress={() => navigation.navigate('Support')}>
          <Text style={styles.supportText}>Contact support</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxxl },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.textDark },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 20 },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.xxl,
  },
  supportText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textDark },
});
