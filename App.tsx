import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import RootNavigator from './src/navigation/RootNavigator';
import WaitlistScreen from './src/screens/Waitlist/WaitlistScreen';
import { DEEP_LINK_SCHEME, WEB_HOST } from './src/data/constants';
import * as notificationService from './src/services/notificationService';
import { createNavigationContainerRef } from '@react-navigation/native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

SplashScreen.preventAutoHideAsync().catch(() => {});

function MobileRoot() {
  const { authLoading } = useApp();

  // Deep linking prefixes
  const prefixes = [DEEP_LINK_SCHEME, WEB_HOST];
  const linking = {
    prefixes,
    config: {
      screens: {
        Register: 'signup',
        Waitlist: 'waitlist',
      },
    },
  };

  useEffect(() => {
    if (!authLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [authLoading]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    }
  }, []);

  if (authLoading) return null;

  return (
    <NavigationContainer ref={navigationRef} linking={linking} theme={DefaultTheme}>
      <StatusBar style="dark" />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  if (Platform.OS === 'web') {
    let refCode = '';
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      refCode = params.get('ref')?.toUpperCase() ?? '';
    }

    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <WaitlistScreen route={{ params: { ref: refCode } }} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <MobileRoot />
      </AppProvider>
    </SafeAreaProvider>
  );
}
