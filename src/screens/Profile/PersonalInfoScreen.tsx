import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ScreenHeader from '../../components/ScreenHeader';
import { useApp } from '../../context/AppContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export default function PersonalInfoScreen() {
  const { user, updateProfile } = useApp();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [location, setLocation] = useState(user.location);
  const [businessName, setBusinessName] = useState(user.businessName ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim(), location: location.trim(), businessName: businessName.trim() });
      Alert.alert('Saved', 'Your personal information has been updated.');
    } catch (e: any) {
      Alert.alert('Could not save changes', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Personal Information" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Input label="Full name" value={name} onChangeText={setName} />
          <Input label="Email address" value={user.email} editable={false} style={{ opacity: 0.6 }} />
          <Input label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Input label="Location" value={location} onChangeText={setLocation} />
          <Input label="Business name" value={businessName} onChangeText={setBusinessName} />
          <Button label="Save Changes" onPress={handleSave} loading={saving} style={{ marginTop: spacing.md }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl },
});
