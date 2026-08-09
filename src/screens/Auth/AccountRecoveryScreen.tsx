import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { requestPasswordReset } from '../../services/authService';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { colors } from '../../theme/colors';
import { fontSize, spacing } from '../../theme/spacing';

type AccountRecoveryNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AccountRecovery'>;

export default function AccountRecoveryScreen() {
  const navigation = useNavigation<AccountRecoveryNavigationProp>();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRecovery = async () => {
    if (!email.trim()) {
      setError('Enter the email address for your account.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      Alert.alert('Password reset sent', `A password reset link was sent to ${email.trim()}. Check your inbox.`);
      navigation.goBack();
    } catch (e: any) {
      setError(e?.message ?? 'Unable to send password reset email. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={colors.textDark} />
          </TouchableOpacity>

          <Text style={styles.title}>Recover your account</Text>
          <Text style={styles.subtitle}>Enter the email associated with your KoboAds account to receive a password reset link.</Text>

          <View style={{ marginTop: spacing.xxl }}>
            <Input
              label="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="you@example.com"
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button label="Send recovery email" onPress={handleRecovery} loading={submitting} style={{ marginTop: spacing.lg }} />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>Sign in</Text>
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
  errorText: { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.md, fontWeight: '600' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: colors.textMuted, fontSize: fontSize.sm },
  link: { color: colors.primary, fontWeight: '700', fontSize: fontSize.sm },
});
