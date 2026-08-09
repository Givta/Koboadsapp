import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useApp } from '../../context/AppContext';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { colors } from '../../theme/colors';
import { fontSize, radius, spacing } from '../../theme/spacing';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

function friendlyRegisterError(code?: string) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with that email already exists — try logging in instead.';
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/weak-password':
      return 'Please choose a stronger password (at least 6 characters).';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return undefined;
  }
}

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [wantsToReceiveAds, setWantsToReceiveAds] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      setError('Please fill in every field to continue.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register({ name: name.trim(), email: email.trim(), phone: phone.trim(), password, wantsToReceiveAds, referralCode: referralCode.trim() || undefined });
    } catch (e: any) {
      setError(friendlyRegisterError(e?.code) ?? e?.message ?? 'Could not create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const ref = (navigation as any).route?.params?.ref as string | undefined;
    if (ref) setReferralCode(ref.toUpperCase());
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={colors.textDark} />
          </TouchableOpacity>

          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Start advertising to real people in minutes.</Text>

          <View style={{ marginTop: spacing.xxl }}>
            <Input label="Full name" value={name} onChangeText={setName} placeholder="e.g. Daniel Okafor" />
            <Input label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
            <Input label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+234 800 000 0000" />
            <View style={{ position: 'relative' }}>
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="At least 6 characters"
                style={{ paddingRight: 44 }}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Input label="Referral code (optional)" value={referralCode} onChangeText={setReferralCode} placeholder="Enter referral code" autoCapitalize="characters" style={{ marginTop: spacing.md }} />
            <Text style={styles.label}>How would you like to advertise?</Text>
            <TouchableOpacity
              style={[styles.optionCard, wantsToReceiveAds && styles.optionCardActive]}
              onPress={() => setWantsToReceiveAds(true)}
            >
              <View style={styles.optionIconWrap}>
                <Ionicons name="swap-horizontal" size={18} color={wantsToReceiveAds ? colors.primary : colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Exchange advertising</Text>
                <Text style={styles.optionSubtitle}>Advertise for free — agree to receive up to 2 ads a day.</Text>
              </View>
              <Ionicons
                name={wantsToReceiveAds ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={wantsToReceiveAds ? colors.primary : colors.textFaint}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionCard, !wantsToReceiveAds && styles.optionCardActive]}
              onPress={() => setWantsToReceiveAds(false)}
            >
              <View style={styles.optionIconWrap}>
                <Ionicons name="card" size={18} color={!wantsToReceiveAds ? colors.primary : colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Paid advertising</Text>
                <Text style={styles.optionSubtitle}>Pay for your campaigns — no ads sent to you.</Text>
              </View>
              <Ionicons
                name={!wantsToReceiveAds ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={!wantsToReceiveAds ? colors.primary : colors.textFaint}
              />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button label="Create Account" onPress={handleRegister} loading={submitting} style={{ marginTop: spacing.lg }} />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>Log in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  title: { fontSize: fontSize.xxxl, fontWeight: '800', color: colors.textDark },
  subtitle: { fontSize: fontSize.md, color: colors.textMuted, marginTop: 6 },
  label: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  optionCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  optionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textDark },
  optionSubtitle: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: colors.textMuted, fontSize: fontSize.sm },
  link: { color: colors.primary, fontWeight: '700', fontSize: fontSize.sm },
  eyeBtn: { position: 'absolute', right: spacing.lg, top: 38 },
  errorText: { color: colors.danger, fontSize: fontSize.sm, marginBottom: spacing.md, fontWeight: '600' },
});
