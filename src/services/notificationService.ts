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

    const today = new Date();
    const { sunrise } = getSunTimes(today, latitude, longitude);
    
    // If sunrise has already passed today, schedule for tomorrow
    if (sunrise < new Date()) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const { sunrise: tomorrowSunrise } = getSunTimes(tomorrow, latitude, longitude);
      
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌅 Good Morning!',
          body: 'Time to log your habits for today. Start your day right!',
          data: { screen: 'DailyLog' },
          sound: true,
        },
        trigger: {
          date: tomorrowSunrise,
          channelId: 'habit-reminders',
        },
      });
      
      return id;
    }
    
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌅 Good Morning!',
        body: 'Time to log your habits for today. Start your day right!',
        data: { screen: 'DailyLog' },
        sound: true,
      },
      trigger: {
        date: sunrise,
        channelId: 'habit-reminders',
      },
    });
    
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

    const today = new Date();
    const { sunset } = getSunTimes(today, latitude, longitude);
    
    // If sunset has already passed today, schedule for tomorrow
    if (sunset < new Date()) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const { sunset: tomorrowSunset } = getSunTimes(tomorrow, latitude, longitude);
      
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌇 Good Evening!',
          body: "Don't forget to review today's habits before bed!",
          data: { screen: 'DailyLog' },
          sound: true,
        },
        trigger: {
          date: tomorrowSunset,
          channelId: 'habit-reminders',
        },
      });
      
      return id;
    }
    
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌇 Good Evening!',
        body: "Don't forget to review today's habits before bed!",
        data: { screen: 'DailyLog' },
        sound: true,
      },
      trigger: {
        date: sunset,
        channelId: 'habit-reminders',
      },
    });
    
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
    
    // Cancel existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Schedule new ones
    await scheduleSunriseReminder(location.latitude, location.longitude);
    await scheduleSunsetReminder(location.latitude, location.longitude);
    
    console.log('Daily reminders scheduled successfully');
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

