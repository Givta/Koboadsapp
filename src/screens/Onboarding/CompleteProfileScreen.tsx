import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useApp } from '../../context/AppContext';
import { AGE_RANGES, CATEGORIES, GENDERS, NIGERIA_STATES } from '../../data/constants';
import { colors } from '../../theme/colors';
import { fontSize, radius, spacing } from '../../theme/spacing';

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.chip, value === opt && styles.chipActive]}
          onPress={() => onChange(opt)}
        >
          <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function CompleteProfileScreen() {
  const { user, completeProfile, logout } = useApp();
  const [ageRange, setAgeRange] = useState('');
  const [gender, setGender] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState(user.location || '');
  const [businessCategory, setBusinessCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stateSearch, setStateSearch] = useState('');

  const filteredStates = stateSearch
    ? NIGERIA_STATES.filter((s) => s.toLowerCase().includes(stateSearch.toLowerCase()))
    : NIGERIA_STATES;

  const canSubmit = Boolean(ageRange && gender && state && city.trim() && businessCategory);

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('Almost there', 'Fill in every field so we can show you the right ads.');
      return;
    }
    setSubmitting(true);
    try {
      await completeProfile({ ageRange, gender, state, location: city.trim(), businessCategory });
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.iconWrap}>
          <Ionicons name="person-add" size={26} color={colors.primary} />
        </View>
        <Text style={styles.title}>A few quick things</Text>
        <Text style={styles.subtitle}>
          This helps KoboAds show you (and the businesses you advertise to) more relevant ads. Takes 30 seconds.
        </Text>

        <Text style={styles.label}>Your age range</Text>
        <ChipGroup options={AGE_RANGES} value={ageRange} onChange={setAgeRange} />

        <Text style={styles.label}>Gender</Text>
        <ChipGroup options={GENDERS.filter((g) => g !== 'All')} value={gender} onChange={setGender} />

        <Text style={styles.label}>State</Text>
        <Input placeholder="Search states…" value={stateSearch} onChangeText={setStateSearch} />
        <ChipGroup options={filteredStates} value={state} onChange={setState} />

        <Text style={styles.label}>City / Town</Text>
        <Input placeholder="e.g. Ibadan" value={city} onChangeText={setCity} />

        <Text style={styles.label}>What category is your business in?</Text>
        <Text style={styles.hint}>Pick the closest match, even if you're not advertising yet.</Text>
        <ChipGroup options={CATEGORIES} value={businessCategory} onChange={setBusinessCategory} />

        <Button label="Continue" onPress={handleSubmit} loading={submitting} disabled={!canSubmit} style={{ marginTop: spacing.xl }} />

        <TouchableOpacity onPress={() => logout()} style={{ marginTop: spacing.lg, alignItems: 'center' }}>
          <Text style={styles.logoutLink}>Log out instead</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.textDark },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 20 },
  label: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  hint: { fontSize: fontSize.xs, color: colors.textFaint, marginBottom: spacing.sm, marginTop: -4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textMuted },
  chipTextActive: { color: colors.primaryDark },
  logoutLink: { fontSize: fontSize.xs, color: colors.textFaint, fontWeight: '600' },
});
