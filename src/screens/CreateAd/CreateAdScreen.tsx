import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import StepIndicator from '../../components/StepIndicator';
import { useApp } from '../../context/AppContext';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { colors } from '../../theme/colors';
import { fontSize, spacing } from '../../theme/spacing';
import { NewAdDraft } from '../../types';
import AdDetailsStep from './steps/AdDetailsStep';
import BudgetStep from './steps/BudgetStep';
import ReviewStep from './steps/ReviewStep';
import TargetingStep from './steps/TargetingStep';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateAd'>;

const STEPS = ['Ad Details', 'Targeting', 'Budget', 'Review'];

const INITIAL_DRAFT: NewAdDraft = {
  title: '',
  description: '',
  businessName: '',
  websiteLink: '',
  contact: '',
  callToAction: '',
  imageColor: '#F59E0B',
  location: '',
  ageRange: '',
  gender: 'All',
  category: '',
  reach: 1000,
  campaignType: 'exchange',
};

export default function CreateAdScreen({ navigation }: Props) {
  const { createCampaign, appConfig, walletBalance, campaigns } = useApp();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<NewAdDraft>(INITIAL_DRAFT);
  const [launching, setLaunching] = useState(false);

  const patchDraft = (patch: Partial<NewAdDraft>) => setDraft((prev) => ({ ...prev, ...patch }));

  const canGoNext = () => {
    if (step === 0) return draft.title.trim().length > 0 && draft.description.trim().length > 0;
    return true;
  };

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }

    const estimatedCost = draft.campaignType === 'paid' ? Math.round(draft.reach * appConfig.costPerReachNaira) : 0;
    if (draft.campaignType === 'paid' && estimatedCost > walletBalance) {
      Alert.alert(
        'Insufficient balance',
        'Your wallet balance is too low for this paid campaign. Please top up your wallet before launching.'
      );
      return;
    }

    setLaunching(true);
    try {
      await createCampaign(draft);
      Alert.alert('Campaign launched', 'Your ad is now being distributed to eligible users.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Could not launch campaign', e?.message ?? 'Please try again.');
    } finally {
      setLaunching(false);
    }
  };

  const handleBack = () => {
    if (step === 0) navigation.goBack();
    else setStep((s) => s - 1);
  };

  const handleEditStep = (targetStep: number) => setStep(targetStep);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Ad</Text>
        <View style={{ width: 36 }} />
      </View>

      <StepIndicator steps={STEPS} activeIndex={step} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 0 && <AdDetailsStep draft={draft} onChange={patchDraft} />}
          {step === 1 && (
            <TargetingStep
              draft={draft}
              onChange={patchDraft}
              locations={appConfig.locations}
              categories={appConfig.categories}
              ageRanges={appConfig.ageRanges}
            />
          )}
          {step === 2 && (
            <BudgetStep
              draft={draft}
              onChange={patchDraft}
              reachLevels={appConfig.reachLevels}
              exchangeReachLevels={appConfig.exchangeReachLevels}
              freeCampaignMaxReach={appConfig.freeCampaignMaxReach}
              dailyFreeCampaignLimit={appConfig.dailyFreeCampaignLimit}
              freeCampaignsUsedToday={
                campaigns.filter((c) => c.campaignType === 'exchange' && c.createdAt === new Date().toISOString().slice(0, 10)).length
              }
              costPerReachNaira={appConfig.costPerReachNaira}
            />
          )}
          {step === 3 && (
            <ReviewStep
              draft={draft}
              costPerReachNaira={appConfig.costPerReachNaira}
              walletBalance={walletBalance}
              onEditStep={handleEditStep}
            />
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={step === STEPS.length - 1 ? 'Launch Campaign' : `Next: ${STEPS[step + 1]}`}
            onPress={handleNext}
            disabled={!canGoNext() || launching}
            loading={launching}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: fontSize.lg, fontWeight: '700', color: colors.textDark },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
