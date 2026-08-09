import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import ScreenHeader from '../../components/ScreenHeader';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { reportAbuse } from '../../services/trustSafetyService';
import { colors } from '../../theme/colors';
import { fontSize, radius, spacing } from '../../theme/spacing';

const REPORT_TYPES = [
  { key: 'spam', label: 'Spam or scam' },
  { key: 'fraud', label: 'Fraudulent activity' },
  { key: 'abusive', label: 'Abusive content' },
  { key: 'other', label: 'Other concern' },
] as const;

type ReportType = typeof REPORT_TYPES[number]['key'];

export default function ReportAbuseScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ReportAbuse'>>();
  const reportedCampaignId = route.params?.reportedCampaignId;
  const [selectedType, setSelectedType] = useState<ReportType>('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!details.trim()) {
      Alert.alert('Tell us more', 'Please describe the issue so our review team can help.');
      return;
    }

    setSubmitting(true);
    try {
      await reportAbuse({
        type: selectedType,
        details: details.trim(),
        reportedCampaignId,
      });
      Alert.alert('Report submitted', 'Our trust and safety team will review this report shortly.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Could not submit report', error?.message ?? 'Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Report Abuse" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>Help us keep KoboAds safe. Tell us what happened and we&apos;ll review it.</Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report type</Text>
          {REPORT_TYPES.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.option, selectedType === item.key && styles.optionSelected]}
              onPress={() => setSelectedType(item.key as ReportType)}
            >
              <View style={styles.optionLabelRow}>
                <Ionicons
                  name={selectedType === item.key ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={selectedType === item.key ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.optionLabel, selectedType === item.key && styles.optionLabelSelected]}>{item.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What happened?</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={details}
            onChangeText={setDetails}
            placeholder="Describe the issue in as much detail as possible"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <Button label="Submit Report" onPress={handleSubmit} loading={submitting} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.lg },
  intro: { color: colors.textMuted, fontSize: fontSize.sm, marginBottom: spacing.md, lineHeight: 20 },
  section: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textDark },
  option: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  optionSelected: { borderColor: colors.primary, backgroundColor: '#F0F8FF' },
  optionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  optionLabel: { fontSize: fontSize.sm, color: colors.textDark },
  optionLabelSelected: { color: colors.primary, fontWeight: '700' },
  textArea: { minHeight: 140, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, color: colors.text, textAlignVertical: 'top', backgroundColor: colors.bg },
});
