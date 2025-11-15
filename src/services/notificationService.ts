import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getSunTimes } from '../utils';
import { loadLocationSettings, loadNotificationsEnabled } from '../storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Must use physical device for notifications');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get notification permissions');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('habit-reminders', {
      name: 'Habit Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4ade80',
    });
  }

  return true;
}

/**
 * Schedule sunrise reminder (morning)
 */
export async function scheduleSunriseReminder(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const enabled = await loadNotificationsEnabled();
    if (!enabled) return null;

    const now = new Date();
    const today = new Date(now);
    const { sunrise } = getSunTimes(today, latitude, longitude);
    
    // Add a 1 minute buffer to ensure notification is in the future
    const bufferMs = 60 * 1000; // 1 minute
    let notificationDate = sunrise;
    
    // If sunrise has already passed today (or is too close), schedule for tomorrow
    if (sunrise.getTime() < now.getTime() + bufferMs) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const { sunrise: tomorrowSunrise } = getSunTimes(tomorrow, latitude, longitude);
      notificationDate = tomorrowSunrise;
    }
    
    // Double-check that the notification date is in the future
    if (notificationDate.getTime() < now.getTime() + bufferMs) {
      // If still in the past, add one more day
      notificationDate = new Date(notificationDate);
      notificationDate.setDate(notificationDate.getDate() + 1);
    }
    
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌅 Good Morning!',
        body: 'Time to log your habits for today. Start your day right!',
        data: { screen: 'DailyLog' },
        sound: true,
      },
      trigger: {
        date: notificationDate,
        channelId: 'habit-reminders',
      },
    });
    
    console.log(`[Notifications] Scheduled sunrise reminder for ${notificationDate.toISOString()}`);
    return id;
  } catch (error) {
    console.error('Error scheduling sunrise reminder:', error);
    return null;
  }
}

/**
 * Schedule sunset reminder (evening)
 */
export async function scheduleSunsetReminder(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const enabled = await loadNotificationsEnabled();
    if (!enabled) return null;

    const now = new Date();
    const today = new Date(now);
    const { sunset } = getSunTimes(today, latitude, longitude);
    
    // Add a 1 minute buffer to ensure notification is in the future
    const bufferMs = 60 * 1000; // 1 minute
    let notificationDate = sunset;
    
    // If sunset has already passed today (or is too close), schedule for tomorrow
    if (sunset.getTime() < now.getTime() + bufferMs) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const { sunset: tomorrowSunset } = getSunTimes(tomorrow, latitude, longitude);
      notificationDate = tomorrowSunset;
    }
    
    // Double-check that the notification date is in the future
    if (notificationDate.getTime() < now.getTime() + bufferMs) {
      // If still in the past, add one more day
      notificationDate = new Date(notificationDate);
      notificationDate.setDate(notificationDate.getDate() + 1);
    }
    
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌇 Good Evening!',
        body: "Don't forget to review today's habits before bed!",
        data: { screen: 'DailyLog' },
        sound: true,
      },
      trigger: {
        date: notificationDate,
        channelId: 'habit-reminders',
      },
    });
    
    console.log(`[Notifications] Scheduled sunset reminder for ${notificationDate.toISOString()}`);
    return id;
  } catch (error) {
    console.error('Error scheduling sunset reminder:', error);
    return null;
  }
}

/**
 * Schedule both sunrise and sunset reminders
 */
export async function scheduleDailyReminders(): Promise<void> {
  try {
    const location = await loadLocationSettings();
    
    if (!location) {
      console.log('No location set, cannot schedule reminders');
      return;
    }
    
    console.log(`[Notifications] Scheduling reminders for location: ${location.latitude}, ${location.longitude}`);
    
    // Cancel existing notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[Notifications] Cancelled all existing notifications');
    
    // Schedule new ones sequentially to avoid race conditions
    const sunriseId = await scheduleSunriseReminder(location.latitude, location.longitude);
    const sunsetId = await scheduleSunsetReminder(location.latitude, location.longitude);
    
    console.log(`[Notifications] Daily reminders scheduled successfully. Sunrise ID: ${sunriseId}, Sunset ID: ${sunsetId}`);
    
    // Log all scheduled notifications for debugging
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`[Notifications] Total scheduled notifications: ${scheduled.length}`);
    scheduled.forEach((notif, index) => {
      const trigger = notif.trigger as any;
      if (trigger?.date) {
        console.log(`[Notifications] Notification ${index + 1}: ${notif.content.title} at ${new Date(trigger.date).toISOString()}`);
      }
    });
  } catch (error) {
    console.error('Error scheduling daily reminders:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All reminders cancelled');
  } catch (error) {
    console.error('Error cancelling reminders:', error);
  }
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Handle notification received while app is in foreground
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Handle notification response (when user taps notification)
 */
export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

