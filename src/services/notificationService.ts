import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { db } from './firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

/**
 * Expo Go (SDK 53+) removed remote push support entirely — and on Android,
 * merely IMPORTING `expo-notifications` inside Expo Go throws/warns as soon
 * as the module evaluates (it auto-registers a native push-token listener as
 * a side effect of import, before any of our own guard code gets to run):
 *
 *   "expo-notifications: Android Push notifications (remote notifications)
 *   functionality provided by expo-notifications was removed from Expo Go
 *   with the release of SDK 53. Use a development build instead of Expo Go."
 *
 * The fix is to never let a top-level `import ... from 'expo-notifications'`
 * happen while running inside Expo Go — so every use of the module in this
 * file goes through a dynamic `await import(...)` gated behind isExpoGo(),
 * instead of a static import at the top of the file. A previous version of
 * this file had the `Constants.appOwnership === 'expo'` guard *inside* the
 * function, but that's too late: the static import above it already ran
 * (and already crashed) the moment this module was first loaded, regardless
 * of what the guard says.
 *
 * `Constants.executionEnvironment === ExecutionEnvironment.StoreClient` is
 * the current, documented way to detect Expo Go (more reliable across SDK
 * versions than the older/deprecated `Constants.appOwnership === 'expo'`).
 */
function isExpoGo() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

let handlerInitialized = false;
// Remembers the token this device last registered, so unregister can remove
// exactly this device's token (not every token on the account — the same
// user may be signed in on more than one device). Falling back to re-fetching
// via getExpoPushTokenAsync() at unregister time — which the previous
// implementation did — isn't reliable: nothing guarantees it returns the
// same token that was originally stored.
let lastRegisteredToken: string | null = null;

/**
 * Sets up foreground notification presentation (banner/sound) and the
 * Android notification channel. Safe to call multiple times, and safe to
 * call in Expo Go or on web (it just no-ops there). Call this once at app
 * startup.
 */
export async function initNotifications() {
  if (handlerInitialized) return;
  if (Platform.OS === 'web' || isExpoGo()) return;

  try {
    const Notifications = await import('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    handlerInitialized = true;
  } catch {
    // Notifications aren't available in this environment — fail silently,
    // nothing else in the app depends on this having succeeded.
  }
}

/**
 * Request permission and return an Expo push token. Also stores the token in
 * Firestore under users/{uid}.pushTokens (array) when `uid` is provided.
 *
 * Returns null (never throws) in Expo Go, on web, on simulators, or if the
 * user declines the permission prompt — remote push simply isn't available
 * in those cases. To actually receive a push notification, build and install
 * a development build (`eas build --profile development`) instead of using
 * Expo Go — see https://docs.expo.dev/develop/development-builds/introduction/.
 */
export async function registerForPushNotificationsAsync(uid?: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;
    if (isExpoGo()) return null;

    const [Notifications, Device] = await Promise.all([import('expo-notifications'), import('expo-device')]);

    if (!Device.isDevice) return null; // simulators/emulators can't get a real push token

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const token = tokenResponse.data;

    if (uid && token) {
      await updateDoc(doc(db, 'users', uid), { pushTokens: arrayUnion(token) });
    }

    lastRegisteredToken = token ?? null;
    return token ?? null;
  } catch {
    // ignore errors; calling code can log if needed
    return null;
  }
}

/**
 * Removes this device's push token from users/{uid}.pushTokens. Call this
 * before signing out so a logged-out device stops receiving push
 * notifications meant for the account. Best-effort: never throws, and
 * no-ops if we never successfully registered a token this session (Expo Go,
 * web, simulator, or the user declined the permission prompt).
 */
export async function unregisterForPushNotificationsAsync(uid?: string): Promise<boolean> {
  if (!uid || !lastRegisteredToken) return false;
  try {
    await updateDoc(doc(db, 'users', uid), { pushTokens: arrayRemove(lastRegisteredToken) });
    return true;
  } catch {
    return false;
  } finally {
    lastRegisteredToken = null;
  }
}

export default { initNotifications, registerForPushNotificationsAsync, unregisterForPushNotificationsAsync, attachNotificationTapHandler };

/**
 * Calls `onTap(data)` whenever the person taps a push notification — whether
 * the app was already open, backgrounded, or was launched cold by the tap.
 * `data` is whatever object was set on the notification's `data` field when
 * it was sent (see functions/src/index.ts). Safe to call in Expo Go or on
 * web (it just no-ops there, matching every other function in this file).
 */
export function attachNotificationTapHandler(onTap: (data: Record<string, any>) => void) {
  if (Platform.OS === 'web' || isExpoGo()) return;

  import('expo-notifications').then((Notifications) => {
    // App was cold-started by tapping a notification.
    Notifications.getLastNotificationResponseAsync().then((response: any) => {
      const data = response?.notification.request.content.data;
      if (data) onTap(data);
    });

    // App was already running (foreground or backgrounded) when tapped.
    Notifications.addNotificationResponseReceivedListener((response: any) => {
      onTap(response.notification.request.content.data);
    });
  });
}
