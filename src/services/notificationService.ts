import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { db } from './firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

/**
 * Request permission and return an Expo push token. Also store token in
 * Firestore under users/{uid}/pushTokens (array) when `uid` is provided.
 */
export async function registerForPushNotificationsAsync(uid?: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web' && !('serviceWorker' in navigator)) return null;
    if (Constants.appOwnership === 'expo') {
      // expo-notifications remote push requires a development build or standalone app.
      return null;
    }

    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return null;

      const tokenResponse = await Notifications.getExpoPushTokenAsync();
      token = tokenResponse.data;
    } else {
      // Simulator or web: cannot get a device token.
      return null;
    }

    if (uid && token) {
      const ref = doc(db, 'users', uid);
      await updateDoc(ref, { pushTokens: arrayUnion(token) });
    }

    return token || null;
  } catch (e) {
    // ignore errors; calling code can log if needed
    return null;
  }
}

export async function unregisterForPushNotificationsAsync(uid?: string): Promise<boolean> {
  try {
    if (!uid) return false;
    if (Platform.OS === 'web' && !('serviceWorker' in navigator)) return false;
    if (Constants.appOwnership === 'expo') return false;

    if (!Device.isDevice) return false;

    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    const token = tokenResponse?.data;
    if (!token) return false;

    const ref = doc(db, 'users', uid);
    await updateDoc(ref, { pushTokens: arrayRemove(token) });
    return true;
  } catch (e) {
    return false;
  }
}

export default { registerForPushNotificationsAsync, unregisterForPushNotificationsAsync };
