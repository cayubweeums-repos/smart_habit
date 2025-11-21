import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert, Linking } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowAnnouncements: false,
      },
    });
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    if (Platform.OS === 'android') {
      Alert.alert(
        'Notification Permission Required',
        'Please grant notification permission in app settings.',
        [
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
          { text: 'Cancel' },
        ]
      );
    }
    return false;
  }

  // Set up notification channel for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('habit-reminders', {
      name: 'Habit Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4ade80',
      sound: 'default',
      enableVibrate: true,
      showBadge: false,
    });
  }

  return true;
}

/**
 * Schedule a daily recurring notification
 */
export async function scheduleDailyNotification(
  identifier: string,
  title: string,
  body: string,
  hour: number,
  minute: number
): Promise<string | null> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    // Cancel any existing notification with the same identifier
    await Notifications.cancelScheduledNotificationAsync(identifier);

    // Schedule daily recurring notification using DailyTriggerInput
    // According to Expo docs, DailyTriggerInput automatically repeats daily
    const trigger: any = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    };
    
    // Add channelId to trigger for Android 8+
    if (Platform.OS === 'android') {
      trigger.channelId = 'habit-reminders';
    }
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        sound: true,
        data: { screen: 'DailyLog' },
      },
      trigger,
    });

    console.log(`[Notifications] Scheduled ${identifier} for ${hour}:${minute.toString().padStart(2, '0')} (daily recurring)`);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling daily notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.error('Error cancelling notification:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
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
 * Schedule daily reminders (morning and evening)
 */
export async function scheduleDailyReminders(
  morningHour: number,
  morningMinute: number,
  eveningHour: number,
  eveningMinute: number
): Promise<void> {
  try {
    // Cancel existing reminders
    await cancelNotification('morning-reminder');
    await cancelNotification('evening-reminder');

    // Schedule morning reminder
    await scheduleDailyNotification(
      'morning-reminder',
      'Good Morning',
      'Log your habits from the day before to keep track of how you did',
      morningHour,
      morningMinute
    );

    // Schedule evening reminder
    await scheduleDailyNotification(
      'evening-reminder',
      'Good Evening',
      'Log your habits for how you did today',
      eveningHour,
      eveningMinute
    );
  } catch (error) {
    console.error('Error scheduling daily reminders:', error);
  }
}

