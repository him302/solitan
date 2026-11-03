import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Local device notifications (Part 11).
 *
 * This is the `local_device` channel, and it is raised here on the device rather than by
 * the server, because only the device knows whether permission was granted. The server
 * deliberately never claims this channel — Part 11 forbids reporting a delivery that may
 * not have happened.
 *
 * Local, not push. Expo's push service and FCM are free but need project credentials and
 * an external service, so under the zero-cost policy they stay out. The honest limitation
 * that follows is documented rather than hidden: these fire while the app is running,
 * including backgrounded, for as long as the realtime socket is alive. A device that has
 * killed the app or dropped the socket will not be woken, and the update is waiting in
 * the in-app inbox when the customer next opens Solitan.
 */

/** Notifications are shown even when the app is foregrounded — a turn being called matters. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let permissionChecked = false;
let permissionGranted = false;

/**
 * Asks for notification permission once per app run.
 *
 * Never throws: a simulator without notification support, or a user who declines, must
 * degrade to in-app updates rather than break the queue screen.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (permissionChecked) return permissionGranted;
  permissionChecked = true;

  try {
    if (Platform.OS === 'android') {
      // Android requires a channel before anything can be displayed.
      await Notifications.setNotificationChannelAsync('queue', {
        name: 'Queue updates',
        importance: Notifications.AndroidImportance.HIGH,
        // Queue turns are time-critical; a silent notification would defeat the point.
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    permissionGranted =
      existing.granted || (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    permissionGranted = false;
  }

  return permissionGranted;
}

/** Presents a notification now. Silently does nothing without permission. */
export async function presentLocalNotification(title: string, body: string): Promise<void> {
  if (!(await ensureNotificationPermission())) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      // null trigger means immediately.
      trigger: null,
    });
  } catch {
    // A failed notification must never surface as an error in the queue UI.
  }
}

// Re-exported so callers have one import for "decide, then deliver". The decision lives
// in its own module because it is pure and must be testable without a device.
export { describeQueueChange } from './queueChangeCopy';
