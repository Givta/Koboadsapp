import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { linkPhoneVerification, requestPhoneVerification } from '../../services/authService';
import { firebaseConfig } from '../../services/firebase';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { colors } from '../../theme/colors';
import { fontSize, spacing } from '../../theme/spacing';

type Props = NativeStackNavigationProp<RootStackParamList, 'VerifyPhone'>;

export default function VerifyPhoneScreen() {
  const navigation = useNavigation<Props>();
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recaptchaVerifier = useRef(null);

  const handleSendCode = async () => {
    if (!phone.trim()) {
      setError('Enter your phone number first.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const verification = await requestPhoneVerification(phone.trim(), recaptchaVerifier.current as any);
      setVerificationId(verification);
      Alert.alert('Verification code sent', 'Check your phone for the SMS code.');
    } catch (e: any) {
      setError(e?.message ?? 'Could not send SMS verification. Check your number and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationId) {
      setError('Request a verification code before continuing.');
      return;
    }
    if (!verificationCode.trim()) {
      setError('Enter the verification code you received.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await linkPhoneVerification(verificationId, verificationCode.trim());
      Alert.alert('Phone verified', 'Your number is now linked to your KoboAds account.');
      navigation.goBack();
    } catch (e: any) {
      setError(e?.message ?? 'Could not verify your phone. Please check the code and try again.');
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

          <Text style={styles.title}>Verify your phone</Text>
          <Text style={styles.subtitle}>Enter your phone number to receive a secure SMS code.</Text>

          <FirebaseRecaptchaVerifierModal
            ref={recaptchaVerifier}
            firebaseConfig={firebaseConfig}
            attemptInvisibleVerification
          />

          <View style={{ marginTop: spacing.xxl }}>
            <Input label="Phone number" value={phone} onChangeText={setPhone} placeholder="+234 800 000 0000" keyboardType="phone-pad" />
            {verificationId ? (
              <Input
                label="Verification code"
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                placeholder="123456"
                style={{ marginTop: spacing.md }}
              />
            ) : null}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button label={verificationId ? 'Verify phone' : 'Send verification code'} onPress={verificationId ? handleVerifyCode : handleSendCode} loading={submitting} style={{ marginTop: spacing.lg }} />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Need help? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Support')}> 
              <Text style={styles.link}>Contact support</Text>
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
