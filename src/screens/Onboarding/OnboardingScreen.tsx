import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import { spacing } from '../../theme/spacing';
import { RootStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  return (
    <ImageBackground
      source={require('../../../assets/splashscreen.png')}
      resizeMode="cover"
      style={styles.bg}
    >
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.footer}>
          <Button label="Get Started" onPress={() => navigation.navigate('Register')} />
          <Button
            label="Login"
            variant="outlineLight"
            style={{ marginTop: spacing.md }}
            onPress={() => navigation.navigate('Login')}
          />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, width: '100%', height: '100%' },
  safe: { flex: 1, justifyContent: 'flex-end' },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
});
