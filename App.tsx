import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import RootNavigator from './src/navigation/RootNavigator';
import { DEEP_LINK_SCHEME, WEB_HOST } from './src/data/constants';
import * as notificationService from './src/services/notificationService';
import { navigationRef, routeNotificationTap } from './src/navigation/navigationRef';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';

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
    if (Platform.OS === 'web') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').catch(() => {});
      }

      // Expo's generated web index.html has no manifest link, theme-color,
      // or apple-touch-icon tag — inject them at runtime so the site is
      // actually recognized as an installable PWA (Chrome's install prompt
      // and iOS's "Add to Home Screen" both require these).
      if (!document.querySelector('link[rel="manifest"]')) {
        const manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        manifestLink.href = '/manifest.json';
        document.head.appendChild(manifestLink);
      }
      if (!document.querySelector('meta[name="theme-color"]')) {
        const themeColor = document.createElement('meta');
        themeColor.name = 'theme-color';
        themeColor.content = '#0B1B14';
        document.head.appendChild(themeColor);
      }
      if (!document.querySelector('link[rel="apple-touch-icon"]')) {
        const appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        appleIcon.href = '/icons/icon-192.png';
        document.head.appendChild(appleIcon);
      }
    } else {
      notificationService.initNotifications();
      notificationService.attachNotificationTapHandler(routeNotificationTap);
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
  return (
    <SafeAreaProvider>
      <AppProvider>
        <MobileRoot />
      </AppProvider>
    </SafeAreaProvider>
  );
}
