import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { createWaitlistEntry } from '../../services/waitlistService';
import { colors } from '../../theme/colors';
import { fontSize, radius, spacing } from '../../theme/spacing';

interface Props {
  route: {
    params?: {
      ref?: string;
    };
  };
}

const images = [
  { source: require('../../../assets/file_000000008a9c81f4b7004548dd8ea144.png'), label: 'Share this with your referral link', shareable: true },
];

export default function WaitlistScreen({ route }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ referralCode: string; joinLink: string } | null>(null);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  const selectedImageUri = useMemo(() => {
    if (selectedImage === null) return null;
    return Image.resolveAssetSource(images[selectedImage].source).uri;
  }, [selectedImage]);

  useEffect(() => {
    const ref = route.params?.ref;
    if (ref) setReferralCode(ref.toUpperCase());
  }, [route.params]);

  const inviteLink = useMemo(() => {
    if (!result) return null;
    return result.joinLink;
  }, [result]);

  const handleCopy = async () => {
    if (inviteLink) {
      await Clipboard.setStringAsync(inviteLink);
      Alert.alert('Copied', 'Your invite link is now on the clipboard.');
    }
  };

  const handleOpenPreview = (index: number) => {
    setSelectedImage(index);
  };

  const handleClosePreview = () => {
    setSelectedImage(null);
  };

  const handleDownload = async () => {
    if (!selectedImageUri) return;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const anchor = document.createElement('a');
      anchor.href = selectedImageUri;
      anchor.download = `koboads-image-${selectedImage! + 1}.png`;
      anchor.click();
      return;
    }

    try {
      await Linking.openURL(selectedImageUri);
    } catch {
      Alert.alert('Download', 'Unable to download from this device. Please save the image manually.');
    }
  };

  const handleSubmit = async () => {
    const trimmedWhatsapp = whatsappNumber.trim();
    if (!name.trim() || !email.trim() || !trimmedWhatsapp) {
      setError('Please enter your name, email, and WhatsApp number.');
      return;
    }
    if (!trimmedWhatsapp.startsWith('+234')) {
      setError('WhatsApp number must start with +234.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const created = await createWaitlistEntry({
        name: name.trim(),
        email: email.trim(),
        whatsappNumber: trimmedWhatsapp,
        referralCode: referralCode.trim() || undefined,
      });
      setResult(created);
    } catch (e: any) {
      setError(e?.message ?? 'Could not join waitlist. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Join the KoboAds waitlist</Text>
          <Text style={styles.subtitle}>KoboAds is a new advertising platform built for small businesses, shop owners, and creators who want to reach local customers without wasting money. Join the waitlist to get early access to simple ad campaigns, referral rewards, and a launch experience designed to support Nigeria-based businesses.</Text>

          <View style={styles.highlightCard}>
            <Text style={styles.highlightTitle}>Why KoboAds?</Text>
            <Text style={styles.highlightText}>• Run local ad campaigns with small budgets and transparent pricing.</Text>
            <Text style={styles.highlightText}>• Reach real customers in your area with ads optimized for mobile and web users.</Text>
            <Text style={styles.highlightText}>• Get early referral rewards and priority access when friends join using your link.</Text>
            <Text style={styles.highlightText}>• Use WhatsApp support to stay connected and receive onboarding updates directly.</Text>
            <Text style={styles.highlightText}>• We keep your waitlist spot, referral chain, and launch invites organized automatically.</Text>
          </View>

          <View style={styles.imageStrip}>
            {images.map((item, index) => (
              <TouchableOpacity key={index} style={styles.imageItem} onPress={() => handleOpenPreview(index)}>
                <Image source={item.source} style={styles.featureImage} />
                {item.shareable ? <Text style={styles.shareBadge}>Tap to preview & share</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.imageHint}>Tap the image to preview the full version. Then download it or share your referral link with it.</Text>

          <Modal visible={selectedImage !== null} animationType="fade" transparent onRequestClose={handleClosePreview}>
            <View style={styles.modalOverlay}>
              <TouchableOpacity style={styles.modalBackdrop} onPress={handleClosePreview} />
              <View style={styles.modalContent}>
                {selectedImage !== null ? (
                  <>
                    <Image source={images[selectedImage].source} style={styles.previewImage} />
                    <Text style={styles.previewLabel}>{images[selectedImage].label}</Text>
                    <View style={styles.previewActions}>
                      <TouchableOpacity style={styles.previewButton} onPress={handleDownload}>
                        <Ionicons name="download-outline" size={18} color={colors.textDark} />
                        <Text style={styles.previewButtonText}>Download image</Text>
                      </TouchableOpacity>
                      {result && images[selectedImage].shareable ? (
                        <TouchableOpacity style={styles.previewButton} onPress={handleCopy}>
                          <Ionicons name="link-outline" size={18} color={colors.textDark} />
                          <Text style={styles.previewButtonText}>Copy referral link</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <TouchableOpacity style={styles.modalClose} onPress={handleClosePreview}>
                      <Text style={styles.modalCloseText}>Close</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            </View>
          </Modal>

          <View style={styles.card}>
            <Input label="Full name" value={name} onChangeText={setName} placeholder="Your name" />
            <Input label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
            <Input label="WhatsApp number" value={whatsappNumber} onChangeText={setWhatsappNumber} keyboardType="phone-pad" placeholder="+2348123456789" />
            <Input label="Referral code (optional)" value={referralCode} onChangeText={setReferralCode} placeholder="Referral code" autoCapitalize="characters" />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button label="Join waitlist" onPress={handleSubmit} loading={submitting} style={{ marginTop: spacing.lg }} />
          </View>

          {result ? (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>You're on the waitlist!</Text>
              <Text style={styles.resultText}>Share this link so your friends can join under your referral.</Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>Your referral code</Text>
                <Text style={styles.codeText}>{result.referralCode}</Text>
              </View>
              <View style={styles.linkBox}>
                <Text style={styles.linkLabel}>Your invite link</Text>
                <Text style={styles.linkText}>{result.joinLink}</Text>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
                  <Ionicons name="copy-outline" size={18} color={colors.primary} />
                  <Text style={styles.copyText}>Copy link</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.hintCard}>
              <Text style={styles.hintTitle}>How the waitlist works</Text>
              <Text style={styles.hintText}>1. Fill in your name, email, and WhatsApp number so we can reserve your spot and keep you updated.</Text>
              <Text style={styles.hintText}>2. We create a unique referral code for you and save your spot in the KoboAds launch queue.</Text>
              <Text style={styles.hintText}>3. Share your invite link to bring friends onto KoboAds and build referral rewards.</Text>
              <Text style={styles.hintText}>4. We track referrals automatically so your waitlist position and invite credit are preserved.</Text>
              <Text style={styles.hintText}>5. You’ll get notified when KoboAds opens and when your referred friends join.</Text>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? Visit the main app on mobile or web.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  title: { fontSize: fontSize.xxxl, fontWeight: '800', color: colors.textDark },
  subtitle: { color: colors.textMuted, fontSize: fontSize.md, marginTop: spacing.sm, lineHeight: 22 },
  card: { marginTop: spacing.md, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  errorText: { color: colors.danger, marginTop: spacing.sm, fontWeight: '700' },
  resultCard: { marginTop: spacing.lg, backgroundColor: colors.bgDark, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  resultTitle: { color: '#fff', fontSize: fontSize.lg, fontWeight: '800' },
  resultText: { color: colors.textOnDarkMuted, marginTop: spacing.sm, fontSize: fontSize.sm, lineHeight: 20 },
  codeBox: { marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.card },
  codeLabel: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: '700', marginBottom: spacing.sm },
  codeText: { color: colors.textDark, fontSize: fontSize.lg, fontWeight: '800', letterSpacing: 2 },
  linkBox: { marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.card },
  linkLabel: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: '700', marginBottom: spacing.sm },
  linkText: { color: colors.textDark, fontSize: fontSize.sm, lineHeight: 20 },
  copyBtn: { marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primaryLight },
  copyText: { color: colors.primaryDark, fontWeight: '700', fontSize: fontSize.xs },
  hintCard: { marginTop: spacing.lg, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg },
  hintTitle: { fontSize: fontSize.sm, fontWeight: '800', color: colors.textDark },
  hintText: { marginTop: spacing.sm, fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },
  highlightCard: { marginTop: spacing.lg, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  highlightTitle: { fontSize: fontSize.sm, fontWeight: '800', color: colors.textDark, marginBottom: spacing.sm },
  highlightText: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20, marginTop: spacing.xs },
  imageStrip: { marginTop: spacing.md },
  imageItem: { width: '100%', marginBottom: spacing.sm, borderRadius: radius.lg, overflow: 'hidden' },
  imageHint: { marginTop: spacing.xs, color: colors.textMuted, fontSize: fontSize.xs, lineHeight: 18 },
  shareBadge: { position: 'absolute', left: 12, bottom: 12, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.md, fontSize: fontSize.xs, fontWeight: '700', color: colors.textDark },
  featureImage: { width: '100%', height: undefined, aspectRatio: 16 / 10, borderRadius: radius.lg, resizeMode: 'contain', backgroundColor: colors.bg },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: spacing.lg },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalContent: { backgroundColor: colors.card, borderRadius: radius.xl, overflow: 'hidden', padding: spacing.lg },
  previewImage: { width: '100%', aspectRatio: 16 / 10, borderRadius: radius.lg, backgroundColor: colors.bg },
  previewLabel: { marginTop: spacing.md, color: colors.textDark, fontSize: fontSize.sm, fontWeight: '700' },
  previewActions: { marginTop: spacing.md, flexDirection: 'row', flexWrap: 'wrap' },
  previewButton: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primaryLight, marginRight: spacing.sm, marginBottom: spacing.sm },
  previewButtonText: { color: colors.primaryDark, fontSize: fontSize.xs, fontWeight: '700' },
  modalClose: { marginTop: spacing.md, padding: spacing.sm, alignItems: 'center', borderRadius: radius.md, backgroundColor: colors.bg },
  modalCloseText: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: '700' },
  footer: { marginTop: spacing.lg, alignItems: 'center' },
  footerText: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center' },
});
