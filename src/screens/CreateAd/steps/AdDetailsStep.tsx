import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Input from '../../../components/Input';
import { useApp } from '../../../context/AppContext';
import { isMediaUploadConfigured, uploadMediaToFirebase } from '../../../services/mediaUploadService';
import { colors } from '../../../theme/colors';
import { fontSize, radius, spacing } from '../../../theme/spacing';
import { NewAdDraft } from '../../../types';

const IMAGE_COLORS = ['#F59E0B', '#EC4899', '#2563EB', '#1FAE5C', '#8B5CF6', '#0F172A'];

export default function AdDetailsStep({
  draft,
  onChange,
}: {
  draft: NewAdDraft;
  onChange: (patch: Partial<NewAdDraft>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { user } = useApp();

  const handlePickMedia = async () => {
    if (!isMediaUploadConfigured) {
      Alert.alert(
        'Media upload not set up',
        'Add your Firebase Storage configuration to .env and enable Firebase Storage for this project.'
      );
      return;
    }

    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in before uploading media.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to attach an image or video.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
      videoMaxDuration: 30,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const isVideo = asset.type === 'video';

    setUploading(true);
    setUploadProgress(0);
    try {
      const uploaded = await uploadMediaToFirebase(asset.uri, user.id, (progress) => {
        setUploadProgress(Math.round(progress));
      });
      onChange({
        mediaUrl: uploaded.url,
        mediaType: isVideo ? 'video' : 'image',
        mediaStoragePath: uploaded.storagePath,
      });
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveMedia = () => onChange({ mediaUrl: undefined, mediaType: undefined });

  return (
    <View>
      <Text style={styles.sectionTitle}>Ad Details</Text>

      <Input
        label="Ad Title"
        placeholder="Enter ad title"
        value={draft.title}
        onChangeText={(t) => onChange({ title: t })}
      />
      <Input
        label="Ad Description"
        placeholder="Describe your product or service"
        value={draft.description}
        onChangeText={(t) => onChange({ description: t.slice(0, 200) })}
        multiline
        charCount={`${draft.description.length}/200`}
      />

      <Text style={styles.label}>Ad Image / Video</Text>

      {draft.mediaUrl ? (
        <View style={styles.previewWrap}>
          {draft.mediaType === 'video' ? (
            <View style={[styles.previewImage, styles.videoPlaceholder]}>
              <Ionicons name="play-circle" size={40} color="#fff" />
              <Text style={styles.videoPlaceholderText}>Video attached</Text>
            </View>
          ) : (
            <Image source={{ uri: draft.mediaUrl }} style={styles.previewImage} resizeMode="cover" />
          )}
          <TouchableOpacity style={styles.removeBtn} onPress={handleRemoveMedia}>
            <Ionicons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.uploadBox} onPress={handlePickMedia} disabled={uploading} activeOpacity={0.8}>
          {uploading ? (
            <>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.uploadTitle}>Uploading…</Text>
              <Text style={styles.uploadHint}>{uploadProgress > 0 ? `${uploadProgress}% completed` : 'Preparing upload...'}</Text>
            </>
          ) : (
            <>
              <Ionicons name="image-outline" size={26} color={colors.primary} />
              <Text style={styles.uploadTitle}>Upload Image or Video</Text>
              <Text style={styles.uploadHint}>PNG, JPG, MP4 (Max 30MB)</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <Text style={styles.label}>Accent Color</Text>
      <View style={styles.colorRow}>
        {IMAGE_COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => onChange({ imageColor: c })}
            style={[styles.colorSwatch, { backgroundColor: c }, draft.imageColor === c && styles.colorSwatchActive]}
          />
        ))}
      </View>

      <Input
        label="Business Name"
        placeholder="Your business name"
        value={draft.businessName}
        onChangeText={(t) => onChange({ businessName: t })}
      />
      <Input
        label="Website / Social Link (Optional)"
        placeholder="https://yourwebsite.com"
        value={draft.websiteLink}
        onChangeText={(t) => onChange({ websiteLink: t })}
        autoCapitalize="none"
      />
      <Input
        label="Contact Information"
        placeholder="Phone number or email"
        value={draft.contact}
        onChangeText={(t) => onChange({ contact: t })}
      />
      <Input
        label="Call To Action"
        placeholder="e.g. Shop Now, Call Us, Visit Store"
        value={draft.callToAction}
        onChangeText={(t) => onChange({ callToAction: t })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textDark, marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    backgroundColor: colors.card,
    gap: 4,
  },
  uploadTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textDark, marginTop: 4 },
  uploadHint: { fontSize: fontSize.xs, color: colors.textFaint },
  previewWrap: { position: 'relative', marginBottom: spacing.md },
  previewImage: { width: '100%', height: 160, borderRadius: radius.md, backgroundColor: colors.bgDark },
  videoPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  videoPlaceholderText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '700' },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.lg },
  colorSwatch: { width: 28, height: 28, borderRadius: 14 },
  colorSwatchActive: { borderWidth: 3, borderColor: colors.textDark },
});
