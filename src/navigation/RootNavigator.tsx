import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useApp } from '../context/AppContext';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import CampaignDetailScreen from '../screens/CampaignDetail/CampaignDetailScreen';
import CreateAdScreen from '../screens/CreateAd/CreateAdScreen';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import PersonalInfoScreen from '../screens/Profile/PersonalInfoScreen';
import ReferralScreen from '../screens/Profile/ReferralScreen';
import ReportAbuseScreen from '../screens/Profile/ReportAbuseScreen';
import AccountRecoveryScreen from '../screens/Auth/AccountRecoveryScreen';
import VerifyPhoneScreen from '../screens/Profile/VerifyPhoneScreen';
import SettingsScreen from '../screens/Profile/SettingsScreen';
import SupportScreen from '../screens/Profile/SupportScreen';
import WalletScreen from '../screens/Profile/WalletScreen';
import WithdrawalHistoryScreen from '../screens/Profile/WithdrawalHistoryScreen';
import ModerationDashboardScreen from '../screens/Admin/ModerationDashboardScreen';
import AnalyticsDashboard from '../screens/Admin/AnalyticsDashboard';
import MainTabs from './MainTabs';

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: { ref?: string } | undefined;
  MainTabs: undefined;
  CreateAd: undefined;
  CampaignDetail: { campaignId: string };
  PersonalInfo: undefined;
  Wallet: undefined;
  WithdrawalHistory: undefined;
  Referral: undefined;
  ReportAbuse: { reportedCampaignId?: string; reportedUserId?: string } | undefined;
  AccountRecovery: undefined;
  VerifyPhone: undefined;
  Settings: undefined;
  Support: undefined;
  ModerationDashboard: undefined;
  AnalyticsDashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated } = useApp();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Group>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="AccountRecovery" component={AccountRecoveryScreen} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="CreateAd" component={CreateAdScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="CampaignDetail" component={CampaignDetailScreen} />
          <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
          <Stack.Screen name="Wallet" component={WalletScreen} />
          <Stack.Screen name="WithdrawalHistory" component={WithdrawalHistoryScreen} />
          <Stack.Screen name="Referral" component={ReferralScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="VerifyPhone" component={VerifyPhoneScreen} />
          <Stack.Screen name="Support" component={SupportScreen} />
          <Stack.Screen name="ReportAbuse" component={ReportAbuseScreen} />
          <Stack.Screen name="ModerationDashboard" component={ModerationDashboardScreen} />
          <Stack.Screen name="AnalyticsDashboard" component={AnalyticsDashboard} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
