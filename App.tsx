import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import RootNavigator from './src/navigation/RootNavigator';
import { DEEP_LINK_SCHEME, WEB_HOST } from './src/data/constants';
import * as notificationService from './src/services/notificationService';
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

SplashScreen.preventAutoHideAsync().catch(() => {});

function Root() {
  const { authLoading } = useApp();

  // Deep linking prefixes
  const prefixes = [DEEP_LINK_SCHEME, WEB_HOST];
  const linking = {
    prefixes,
    config: {
      screens: {
        Register: 'signup',
      },
    },
  };

  useEffect(() => {
    if (!authLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [authLoading]);

  useEffect(() => {
    // Web PWA: register service worker and manifest link
    if (Platform.OS === 'web') {
      try {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = '/manifest.json';
        document.head.appendChild(link);
      } catch (e) {
        // ignore
      }

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').catch(() => {});
      }
    }

    // Service worker and PWA manifest are handled here; push token registration is bound to authenticated users in AppContext.
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
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}
