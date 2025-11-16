import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getSunTimes, weatherMatches } from '../utils';
import { loadLocationSettings, loadNotificationsEnabled } from '../storage';
import { loadHabits } from '../storage/habitStorage';
import { fetchWeatherByCoordinates } from './weatherService';

// Track when notifications were scheduled to prevent immediate firing
let lastScheduledTime = 0;
const SCHEDULING_COOLDOWN_MS = 5000; // 5 seconds - ignore notifications that fire within 5 seconds of scheduling

// Forward declaration for weather check function
let checkWeatherDependentHabitsRef: (forceNotify?: boolean) => Promise<void>;

// Configure notification behavior
// Only handle notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const now = Date.now();
    const timeSinceScheduling = now - lastScheduledTime;
    
    // Handle weather check trigger notifications silently
    if (notification.request.content.data?.type === 'weather-check') {
      // Trigger weather check in background
      if (checkWeatherDependentHabitsRef) {
        checkWeatherDependentHabitsRef(false).catch(error => {
          console.error('[Notifications] Error in background weather check:', error);
        });
      }
      
      // Don't show this notification to user
      return {
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      };
    }
    
    // If notification fires within 5 seconds of scheduling, it's likely an immediate fire bug
    // Suppress it to prevent user confusion
    if (timeSinceScheduling < SCHEDULING_COOLDOWN_MS) {
      console.warn(`[Notifications] BLOCKED immediate notification: ${notification.request.content.title}`);
      console.warn(`[Notifications] Time since scheduling: ${timeSinceScheduling}ms (cooldown: ${SCHEDULING_COOLDOWN_MS}ms)`);
      return {
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      };
    }
    
    return {
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
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

    // Verify permissions before scheduling
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.error('[Notifications] ERROR: Notification permissions not granted!');
      return null;
    }

    const now = new Date();
    
    // CRITICAL FIX: Calculate tomorrow's sunrise explicitly to avoid Android interpreting it as today
    // Android may fire notifications immediately if it thinks the time has passed today
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Start of tomorrow
    
    const { sunrise: tomorrowSunrise } = getSunTimes(tomorrow, latitude, longitude);
    let notificationDate = new Date(tomorrowSunrise);
    
    // Ensure the notification is at least 24 hours in the future
    // This prevents Android from thinking it's "today's time" and firing immediately
    const minFutureTime = now.getTime() + (24 * 60 * 60 * 1000); // 24 hours from now
    
    if (notificationDate.getTime() <= minFutureTime) {
      // If tomorrow's sunrise is less than 24 hours away, schedule for day after tomorrow
      const dayAfterTomorrow = new Date(now);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      dayAfterTomorrow.setHours(0, 0, 0, 0);
      const { sunrise: dayAfterSunrise } = getSunTimes(dayAfterTomorrow, latitude, longitude);
      notificationDate = new Date(dayAfterSunrise);
    }
    
    // Final safety check: ensure notification is definitely more than 24 hours away
    if (notificationDate.getTime() <= minFutureTime) {
      // Fallback: schedule for exactly 25 hours from now at the same time tomorrow
      notificationDate = new Date(minFutureTime + (60 * 60 * 1000)); // 25 hours from now
      console.log('[Notifications] Sunrise date was too close, scheduling for 25 hours from now');
    }
    
    // Log time information in both UTC and local time for debugging
    const localTimeStr = now.toLocaleString();
    const localNotificationTimeStr = notificationDate.toLocaleString();
    
    console.log(`[Notifications] About to schedule sunrise reminder:`);
    console.log(`  - Current time (UTC): ${now.toISOString()}`);
    console.log(`  - Current time (Local): ${localTimeStr}`);
    console.log(`  - Current time timestamp: ${now.getTime()}`);
    console.log(`  - Sunrise time (UTC): ${notificationDate.toISOString()}`);
    console.log(`  - Sunrise time (Local): ${localNotificationTimeStr}`);
    console.log(`  - Sunrise time timestamp: ${notificationDate.getTime()}`);
    console.log(`  - Time difference (ms): ${notificationDate.getTime() - now.getTime()}`);
    console.log(`  - Time difference (hours): ${(notificationDate.getTime() - now.getTime()) / (60 * 60 * 1000)}`);
    
    // For dailyTrigger with repeats, use a simple static identifier
    // Android may have issues with timestamp-based identifiers for repeating notifications
    const uniqueId = 'sunrise-reminder-daily';
    
    // Calculate seconds until notification for logging
    const secondsUntil = Math.max(1, Math.floor((notificationDate.getTime() - now.getTime()) / 1000));
    
    console.log(`[Notifications] Scheduling with ${secondsUntil} seconds (${Math.floor(secondsUntil / 3600)}h ${Math.floor((secondsUntil % 3600) / 60)}m) until notification`);
    
    // Ensure notification channel exists on Android before scheduling
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('habit-reminders', {
          name: 'Habit Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4ade80',
        });
        console.log('[Notifications] Notification channel verified/created');
      } catch (channelError) {
        console.error('[Notifications] Error setting notification channel:', channelError);
      }
    }
    
    let id: string | null = null;
    try {
      // CRITICAL FIX: Calculate seconds until notification
      const secondsUntil = Math.max(1, Math.floor((notificationDate.getTime() - now.getTime()) / 1000));
      
      // Validate that the notification is definitely in the future
      if (secondsUntil <= 0) {
        console.error(`[Notifications] ERROR: Calculated seconds until notification is ${secondsUntil} - notification would fire immediately!`);
        console.error(`[Notifications] Current time: ${now.toISOString()}`);
        console.error(`[Notifications] Target time: ${notificationDate.toISOString()}`);
        return null;
      }
      
      // Android may have issues with very large timeInterval values
      // Cap at 7 days (604800 seconds) to be safe
      const MAX_SECONDS = 7 * 24 * 60 * 60; // 7 days
      const safeSeconds = Math.min(secondsUntil, MAX_SECONDS);
      
      if (safeSeconds < secondsUntil) {
        console.warn(`[Notifications] WARNING: Seconds until notification (${secondsUntil}) exceeds max (${MAX_SECONDS}), capping to ${safeSeconds}`);
      }
      
      console.log(`[Notifications] Scheduling notification:`);
      console.log(`[Notifications]   - Target date: ${notificationDate.toISOString()}`);
      console.log(`[Notifications]   - Current time: ${now.toISOString()}`);
      console.log(`[Notifications]   - Seconds until: ${safeSeconds} (${Math.floor(safeSeconds / 3600)}h ${Math.floor((safeSeconds % 3600) / 60)}m)`);
      console.log(`[Notifications]   - Using timeInterval trigger with ${safeSeconds} seconds`);
      
      // Use timeInterval trigger (seconds) - more reliable on Android
      id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Good Morning!',
          body: 'Time to log your habits for today. Start your day right!',
          data: { screen: 'DailyLog' },
          sound: true,
        },
        trigger: {
          seconds: safeSeconds,
        },
      });
      
      console.log(`[Notifications] scheduleNotificationAsync returned ID: ${id}`);
      
      if (!id) {
        console.error('[Notifications] CRITICAL: scheduleNotificationAsync returned null/undefined ID!');
        return null;
      }
    } catch (error: any) {
      console.error('[Notifications] ERROR scheduling notification:', error);
      console.error('[Notifications] Error details:', JSON.stringify(error, null, 2));
      return null;
    }
    
    // Wait longer for Android to process the scheduling - it may take time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if notification was scheduled
    const immediatelyAfter = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`[Notifications] After 500ms delay, total scheduled: ${immediatelyAfter.length}`);
    
    if (immediatelyAfter.length > 0) {
      console.log(`[Notifications] All scheduled notifications:`);
      immediatelyAfter.forEach((n, idx) => {
        const trigger = n.trigger as any;
        console.log(`  ${idx + 1}. ID: ${n.identifier}, Title: ${n.content.title}`);
        console.log(`     Trigger type: ${trigger?.type || 'unknown'}`);
        if (trigger?.date) {
          const triggerDate = new Date(trigger.date);
          const timeDiff = triggerDate.getTime() - now.getTime();
          console.log(`     Trigger date: ${triggerDate.toISOString()}`);
          console.log(`     Time until: ${Math.floor(timeDiff / (60 * 60 * 1000))}h ${Math.floor((timeDiff % (60 * 60 * 1000)) / (60 * 1000))}m`);
        } else if (trigger?.hour !== undefined) {
          console.log(`     Trigger: daily at ${trigger.hour}:${trigger.minute?.toString().padStart(2, '0') || '00'}, repeats: ${trigger.repeats}`);
        } else if (trigger?.seconds !== undefined) {
          console.log(`     Trigger seconds: ${trigger.seconds}`);
        }
      });
    }
    
    // Search for the notification by various criteria
    const thisNotification = immediatelyAfter.find(n => 
      n.content.title === 'Good Morning!' || 
      n.identifier === uniqueId || 
      n.identifier?.includes('sunrise') ||
      (n.trigger as any)?.date === notificationDate.getTime() ||
      (n.trigger as any)?.date === notificationDate.toISOString()
    );
    if (thisNotification) {
      const trigger = thisNotification.trigger as any;
      console.log(`[Notifications] ✓ Found sunrise notification in scheduled list:`);
      console.log(`  - Identifier: ${thisNotification.identifier}`);
      console.log(`  - Trigger type: ${trigger?.type || 'unknown'}`);
      if (trigger?.date) {
        console.log(`  - Trigger date: ${new Date(trigger.date).toISOString()}`);
      } else if (trigger?.hour !== undefined) {
        console.log(`  - Trigger: daily at ${trigger.hour}:${trigger.minute?.toString().padStart(2, '0') || '00'}, repeats: ${trigger.repeats}`);
      } else if (trigger?.seconds !== undefined) {
        const triggerTime = new Date(now.getTime() + trigger.seconds * 1000);
        console.log(`  - Trigger seconds: ${trigger.seconds} (${Math.floor(trigger.seconds / 3600)}h ${Math.floor((trigger.seconds % 3600) / 60)}m)`);
        console.log(`  - Trigger time: ${triggerTime.toISOString()}`);
      }
    } else {
      // This is expected on Android - getAllScheduledNotificationsAsync often doesn't show timeInterval triggers
      // The notification was likely scheduled successfully (we got an ID), but Android's API doesn't reflect it
      console.log(`[Notifications] Note: Sunrise notification not visible in scheduled list (expected on Android)`);
      console.log(`[Notifications] Notification ID: ${id} - This is normal for timeInterval triggers on Android`);
    }
    
    // Verify the notification was actually scheduled
    const timeUntilNotification = notificationDate.getTime() - now.getTime();
    const hoursUntil = Math.floor(timeUntilNotification / (60 * 60 * 1000));
    const minutesUntil = Math.floor((timeUntilNotification % (60 * 60 * 1000)) / (60 * 1000));
    
    console.log(`[Notifications] Scheduled sunrise reminder for ${notificationDate.toISOString()} (${notificationDate.getHours()}:${notificationDate.getMinutes().toString().padStart(2, '0')}) - Current time: ${now.toISOString()} - In ${hoursUntil}h ${minutesUntil}m`);
    
    if (!id) {
      console.error('[Notifications] Failed to schedule sunrise reminder - no ID returned');
      return null;
    }
    
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

    // Verify permissions before scheduling
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.error('[Notifications] ERROR: Notification permissions not granted!');
      return null;
    }

    const now = new Date();
    
    // CRITICAL FIX: Calculate tomorrow's sunset explicitly to avoid Android interpreting it as today
    // Android may fire notifications immediately if it thinks the time has passed today
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Start of tomorrow
    
    const { sunset: tomorrowSunset } = getSunTimes(tomorrow, latitude, longitude);
    let notificationDate = new Date(tomorrowSunset);
    
    // Ensure the notification is at least 24 hours in the future
    // This prevents Android from thinking it's "today's time" and firing immediately
    const minFutureTime = now.getTime() + (24 * 60 * 60 * 1000); // 24 hours from now
    
    if (notificationDate.getTime() <= minFutureTime) {
      // If tomorrow's sunset is less than 24 hours away, schedule for day after tomorrow
      const dayAfterTomorrow = new Date(now);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      dayAfterTomorrow.setHours(0, 0, 0, 0);
      const { sunset: dayAfterSunset } = getSunTimes(dayAfterTomorrow, latitude, longitude);
      notificationDate = new Date(dayAfterSunset);
    }
    
    // Final safety check: ensure notification is definitely more than 24 hours away
    if (notificationDate.getTime() <= minFutureTime) {
      // Fallback: schedule for exactly 25 hours from now at the same time tomorrow
      notificationDate = new Date(minFutureTime + (60 * 60 * 1000)); // 25 hours from now
      console.log('[Notifications] Sunset date was too close, scheduling for 25 hours from now');
    }
    
    // Log time information in both UTC and local time for debugging
    const localTimeStr = now.toLocaleString();
    const localNotificationTimeStr = notificationDate.toLocaleString();
    
    console.log(`[Notifications] About to schedule sunset reminder:`);
    console.log(`  - Current time (UTC): ${now.toISOString()}`);
    console.log(`  - Current time (Local): ${localTimeStr}`);
    console.log(`  - Current time timestamp: ${now.getTime()}`);
    console.log(`  - Sunset time (UTC): ${notificationDate.toISOString()}`);
    console.log(`  - Sunset time (Local): ${localNotificationTimeStr}`);
    console.log(`  - Sunset time timestamp: ${notificationDate.getTime()}`);
    console.log(`  - Time difference (ms): ${notificationDate.getTime() - now.getTime()}`);
    console.log(`  - Time difference (hours): ${(notificationDate.getTime() - now.getTime()) / (60 * 60 * 1000)}`);
    
    // For dailyTrigger with repeats, use a simple static identifier
    // Android may have issues with timestamp-based identifiers for repeating notifications
    const uniqueId = 'sunset-reminder-daily';
    
    // Calculate seconds until notification for logging
    const secondsUntil = Math.max(1, Math.floor((notificationDate.getTime() - now.getTime()) / 1000));
    
    console.log(`[Notifications] Scheduling with ${secondsUntil} seconds (${Math.floor(secondsUntil / 3600)}h ${Math.floor((secondsUntil % 3600) / 60)}m) until notification`);
    
    // Ensure notification channel exists on Android before scheduling
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('habit-reminders', {
          name: 'Habit Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4ade80',
        });
        console.log('[Notifications] Notification channel verified/created');
      } catch (channelError) {
        console.error('[Notifications] Error setting notification channel:', channelError);
      }
    }
    
    let id: string | null = null;
    try {
      // CRITICAL FIX: Calculate seconds until notification
      const secondsUntil = Math.max(1, Math.floor((notificationDate.getTime() - now.getTime()) / 1000));
      
      // Validate that the notification is definitely in the future
      if (secondsUntil <= 0) {
        console.error(`[Notifications] ERROR: Calculated seconds until notification is ${secondsUntil} - notification would fire immediately!`);
        console.error(`[Notifications] Current time: ${now.toISOString()}`);
        console.error(`[Notifications] Target time: ${notificationDate.toISOString()}`);
        return null;
      }
      
      // Android may have issues with very large timeInterval values
      // Cap at 7 days (604800 seconds) to be safe
      const MAX_SECONDS = 7 * 24 * 60 * 60; // 7 days
      const safeSeconds = Math.min(secondsUntil, MAX_SECONDS);
      
      if (safeSeconds < secondsUntil) {
        console.warn(`[Notifications] WARNING: Seconds until notification (${secondsUntil}) exceeds max (${MAX_SECONDS}), capping to ${safeSeconds}`);
      }
      
      console.log(`[Notifications] Scheduling notification:`);
      console.log(`[Notifications]   - Target date: ${notificationDate.toISOString()}`);
      console.log(`[Notifications]   - Current time: ${now.toISOString()}`);
      console.log(`[Notifications]   - Seconds until: ${safeSeconds} (${Math.floor(safeSeconds / 3600)}h ${Math.floor((safeSeconds % 3600) / 60)}m)`);
      console.log(`[Notifications]   - Using timeInterval trigger with ${safeSeconds} seconds`);
      
      // Use timeInterval trigger (seconds) - more reliable on Android
      id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Good Evening!',
          body: "Don't forget to review today's habits before bed!",
          data: { screen: 'DailyLog' },
          sound: true,
        },
        trigger: {
          seconds: safeSeconds,
        },
      });
      
      console.log(`[Notifications] scheduleNotificationAsync returned ID: ${id}`);
      
      if (!id) {
        console.error('[Notifications] CRITICAL: scheduleNotificationAsync returned null/undefined ID!');
        return null;
      }
    } catch (error: any) {
      console.error('[Notifications] ERROR scheduling notification:', error);
      console.error('[Notifications] Error details:', JSON.stringify(error, null, 2));
      return null;
    }
    
    // Wait longer for Android to process the scheduling - it may take time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if notification was scheduled
    const immediatelyAfter = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`[Notifications] After 500ms delay, total scheduled: ${immediatelyAfter.length}`);
    
    if (immediatelyAfter.length > 0) {
      console.log(`[Notifications] All scheduled notifications:`);
      immediatelyAfter.forEach((n, idx) => {
        const trigger = n.trigger as any;
        console.log(`  ${idx + 1}. ID: ${n.identifier}, Title: ${n.content.title}`);
        console.log(`     Trigger type: ${trigger?.type || 'unknown'}`);
        if (trigger?.date) {
          const triggerDate = new Date(trigger.date);
          const timeDiff = triggerDate.getTime() - now.getTime();
          console.log(`     Trigger date: ${triggerDate.toISOString()}`);
          console.log(`     Time until: ${Math.floor(timeDiff / (60 * 60 * 1000))}h ${Math.floor((timeDiff % (60 * 60 * 1000)) / (60 * 1000))}m`);
        } else if (trigger?.hour !== undefined) {
          console.log(`     Trigger: daily at ${trigger.hour}:${trigger.minute?.toString().padStart(2, '0') || '00'}, repeats: ${trigger.repeats}`);
        } else if (trigger?.seconds !== undefined) {
          console.log(`     Trigger seconds: ${trigger.seconds}`);
        }
      });
    }
    
    // Search for the notification by various criteria
    const thisNotification = immediatelyAfter.find(n => 
      n.content.title === 'Good Evening!' || 
      n.identifier === uniqueId || 
      n.identifier?.includes('sunset') ||
      (n.trigger as any)?.date === notificationDate.getTime() ||
      (n.trigger as any)?.date === notificationDate.toISOString()
    );
    if (thisNotification) {
      const trigger = thisNotification.trigger as any;
      console.log(`[Notifications] ✓ Found sunset notification in scheduled list:`);
      console.log(`  - Identifier: ${thisNotification.identifier}`);
      console.log(`  - Trigger type: ${trigger?.type || 'unknown'}`);
      if (trigger?.date) {
        console.log(`  - Trigger date: ${new Date(trigger.date).toISOString()}`);
      } else if (trigger?.hour !== undefined) {
        console.log(`  - Trigger: daily at ${trigger.hour}:${trigger.minute?.toString().padStart(2, '0') || '00'}, repeats: ${trigger.repeats}`);
      } else if (trigger?.seconds !== undefined) {
        const triggerTime = new Date(now.getTime() + trigger.seconds * 1000);
        console.log(`  - Trigger seconds: ${trigger.seconds} (${Math.floor(trigger.seconds / 3600)}h ${Math.floor((trigger.seconds % 3600) / 60)}m)`);
        console.log(`  - Trigger time: ${triggerTime.toISOString()}`);
      }
    } else {
      // This is expected on Android - getAllScheduledNotificationsAsync often doesn't show timeInterval triggers
      // The notification was likely scheduled successfully (we got an ID), but Android's API doesn't reflect it
      console.log(`[Notifications] Note: Sunset notification not visible in scheduled list (expected on Android)`);
      console.log(`[Notifications] Notification ID: ${id} - This is normal for timeInterval triggers on Android`);
    }
    
    // Verify the notification was actually scheduled
    const timeUntilNotification = notificationDate.getTime() - now.getTime();
    const hoursUntil = Math.floor(timeUntilNotification / (60 * 60 * 1000));
    const minutesUntil = Math.floor((timeUntilNotification % (60 * 60 * 1000)) / (60 * 1000));
    
    console.log(`[Notifications] Scheduled sunset reminder for ${notificationDate.toISOString()} (${notificationDate.getHours()}:${notificationDate.getMinutes().toString().padStart(2, '0')}) - Current time: ${now.toISOString()} - In ${hoursUntil}h ${minutesUntil}m`);
    
    if (!id) {
      console.error('[Notifications] Failed to schedule sunset reminder - no ID returned');
      return null;
    }
    
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
    
    // Check if we're in Expo Go (which has notification limitations)
    try {
      const isExpoGo = Constants.executionEnvironment === Constants.ExecutionEnvironment.StoreClient;
      if (isExpoGo) {
        console.warn('[Notifications] WARNING: Running in Expo Go - scheduled notifications may not work properly!');
        console.warn('[Notifications] Please use a development build for full notification support.');
        console.warn('[Notifications] Date-based triggers are not fully supported in Expo Go.');
      } else {
        console.log('[Notifications] Running in development build or standalone - full notification support available');
      }
    } catch (error) {
      console.log('[Notifications] Could not determine execution environment');
    }
    
    // Cancel existing notifications first (except periodic weather checks - we'll reschedule those)
    const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of existingNotifications) {
      if (!notif.identifier?.startsWith('weather-check-periodic-')) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
    console.log('[Notifications] Cancelled existing reminders (keeping periodic weather checks)');
    
    // Wait longer to ensure cancellation is fully processed and system is ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Track scheduling time to prevent immediate notifications
    lastScheduledTime = Date.now();
    
    // Schedule new ones sequentially to avoid race conditions
    const sunriseId = await scheduleSunriseReminder(location.latitude, location.longitude);
    
    // Longer delay between scheduling to avoid conflicts
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Update scheduling time for second notification
    lastScheduledTime = Date.now();
    
    const sunsetId = await scheduleSunsetReminder(location.latitude, location.longitude);
    
    // Schedule periodic weather checks
    await schedulePeriodicWeatherChecks();
    
    // Reset cooldown after a delay to allow legitimate notifications
    setTimeout(() => {
      lastScheduledTime = 0;
      console.log('[Notifications] Scheduling cooldown reset - notifications will now be shown normally');
    }, SCHEDULING_COOLDOWN_MS + 1000);
    
    console.log(`[Notifications] Daily reminders scheduled successfully. Sunrise ID: ${sunriseId}, Sunset ID: ${sunsetId}`);
    
    // Wait longer before checking to ensure notifications are fully processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Log all scheduled notifications for debugging
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`[Notifications] ===== FINAL CHECK AFTER 1000ms DELAY =====`);
    console.log(`[Notifications] Total scheduled notifications: ${scheduled.length}`);
    
    if (scheduled.length === 0) {
      // This is expected on Android - getAllScheduledNotificationsAsync doesn't show timeInterval triggers
      // The notifications were likely scheduled (we got IDs), but Android's API doesn't reflect them
      console.log(`[Notifications] Note: No notifications visible in scheduled list (expected on Android)`);
      console.log(`[Notifications] This is normal - Android doesn't show timeInterval triggers in getAllScheduledNotificationsAsync`);
      console.log(`[Notifications] Notifications should still fire at the scheduled time (25 hours from now)`);
    } else {
      scheduled.forEach((notif, index) => {
        const trigger = notif.trigger as any;
        const now = new Date();
        console.log(`[Notifications] Notification ${index + 1}:`);
        console.log(`  - Identifier: ${notif.identifier}`);
        console.log(`  - Title: ${notif.content.title}`);
        console.log(`  - Trigger type: ${trigger?.type || 'unknown'}`);
        if (trigger?.date) {
          const triggerDate = new Date(trigger.date);
          const timeDiff = triggerDate.getTime() - now.getTime();
          console.log(`  - Trigger date: ${triggerDate.toISOString()}`);
          console.log(`  - Time until trigger: ${Math.floor(timeDiff / (60 * 60 * 1000))}h ${Math.floor((timeDiff % (60 * 60 * 1000)) / (60 * 1000))}m`);
          console.log(`  - Is in future: ${timeDiff > 0 ? 'YES' : 'NO'}`);
        } else if (trigger?.seconds !== undefined) {
          const triggerTime = new Date(now.getTime() + trigger.seconds * 1000);
          const timeDiff = trigger.seconds * 1000;
          console.log(`  - Trigger seconds: ${trigger.seconds} (${Math.floor(trigger.seconds / 3600)}h ${Math.floor((trigger.seconds % 3600) / 60)}m)`);
          console.log(`  - Trigger time: ${triggerTime.toISOString()}`);
          console.log(`  - Is in future: ${timeDiff > 0 ? 'YES' : 'NO'}`);
        } else if (trigger?.hour !== undefined) {
          console.log(`  - Trigger hour: ${trigger.hour}, minute: ${trigger.minute}, repeats: ${trigger.repeats}`);
        } else {
          console.log(`  - Trigger: ${JSON.stringify(trigger)}`);
        }
      });
    }
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

// Store last weather state per habit to detect changes
const WEATHER_STATE_KEY = '@weather_state';

interface WeatherState {
  [habitId: string]: {
    lastCondition: string;
    lastChecked: string; // ISO date string
  };
}

async function loadWeatherState(): Promise<WeatherState> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const stateJson = await AsyncStorage.getItem(WEATHER_STATE_KEY);
    return stateJson ? JSON.parse(stateJson) : {};
  } catch (error) {
    console.error('[WeatherCheck] Error loading weather state:', error);
    return {};
  }
}

async function saveWeatherState(state: WeatherState): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(WEATHER_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('[WeatherCheck] Error saving weather state:', error);
  }
}

/**
 * Check weather for weather-dependent habits and send notifications if needed
 * @param forceNotify - If true, send notification even if weather state hasn't changed
 */
export async function checkWeatherDependentHabits(forceNotify: boolean = false): Promise<void> {
  // Set the reference for the notification handler
  checkWeatherDependentHabitsRef = checkWeatherDependentHabits;
  try {
    const enabled = await loadNotificationsEnabled();
    if (!enabled) return;

    // Verify permissions
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('[WeatherCheck] Notification permissions not granted');
      return;
    }

    const location = await loadLocationSettings();
    if (!location) {
      console.log('[WeatherCheck] No location set');
      return;
    }

    // Fetch current weather
    const weather = await fetchWeatherByCoordinates(location.latitude, location.longitude);
    if (!weather) {
      console.log('[WeatherCheck] Could not fetch weather');
      return;
    }

    // Load all active habits
    const habits = await loadHabits();
    // Only notify for habits that have a backup habit name (habits without backup are just skipped)
    const activeHabits = habits.filter(h => !h.archived && h.weatherDependent && h.requiredWeatherTypes && h.requiredWeatherTypes.length > 0 && h.backupHabitName && h.backupHabitName.trim());

    if (activeHabits.length === 0) {
      return; // No weather-dependent habits
    }

    // Load previous weather state
    const previousState = await loadWeatherState();
    const newState: WeatherState = {};

    // Check each weather-dependent habit
    for (const habit of activeHabits) {
      const weatherMatchesRequired = weatherMatches(weather, habit.requiredWeatherTypes!);
      const previousCondition = previousState[habit.id]?.lastCondition;
      const weatherChanged = previousCondition !== weather.condition;
      
      // Store current state
      newState[habit.id] = {
        lastCondition: weather.condition,
        lastChecked: new Date().toISOString(),
      };
      
      // Send notification if weather doesn't match AND (weather changed OR force notify)
      if (!weatherMatchesRequired && (weatherChanged || forceNotify || !previousCondition)) {
        // Use the backup habit name directly (no need to look up by ID)
        if (habit.backupHabitName && habit.backupHabitName.trim()) {
          // Send notification about backup habit
          const notificationId = `weather-backup-${habit.id}`;
          
          // Cancel any existing notification for this habit
          await Notifications.cancelScheduledNotificationAsync(notificationId);
          
          // Schedule immediate notification
          await Notifications.scheduleNotificationAsync({
            identifier: notificationId,
            content: {
              title: 'Weather Alert',
              body: `Weather doesn't match for "${habit.name}". Do "${habit.backupHabitName}" instead.`,
              data: { screen: 'DailyLog', habitId: habit.id },
              sound: true,
            },
            trigger: null, // Immediate notification
          });
          
          console.log(`[WeatherCheck] Sent notification for habit "${habit.name}" - weather doesn't match (condition: ${weather.condition})`);
        }
      } else if (weatherMatchesRequired && weatherChanged && previousCondition) {
        // Weather now matches - could send a positive notification if desired
        console.log(`[WeatherCheck] Weather now matches for habit "${habit.name}" (condition: ${weather.condition})`);
      }
    }

    // Save updated state
    await saveWeatherState(newState);
  } catch (error) {
    console.error('[WeatherCheck] Error checking weather-dependent habits:', error);
  }
}

/**
 * Schedule periodic weather checks throughout the day
 * Checks every 2 hours from 6 AM to 10 PM
 * Note: This is a backup method. If background fetch is available, it will handle checks automatically.
 */
export async function schedulePeriodicWeatherChecks(): Promise<void> {
  try {
    const enabled = await loadNotificationsEnabled();
    if (!enabled) return;

    const location = await loadLocationSettings();
    if (!location) {
      console.log('[WeatherCheck] No location set, cannot schedule periodic checks');
      return;
    }

    // Check if background fetch is registered - if so, we don't need scheduled notifications
    try {
      const TaskManager = require('expo-task-manager').default;
      const isRegistered = await TaskManager.isTaskRegisteredAsync('background-weather-check');
      if (isRegistered) {
        console.log('[WeatherCheck] Background fetch is active, skipping scheduled notification checks');
        return; // Background fetch will handle it
      }
    } catch (error) {
      // Background fetch not available, continue with scheduled notifications
      console.log('[WeatherCheck] Background fetch not registered, using scheduled notifications');
    }

    // Cancel existing periodic checks
    const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of existingNotifications) {
      if (notif.identifier?.startsWith('weather-check-periodic-')) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Schedule checks every 2 hours from 6 AM to 10 PM
    const checkTimes = [6, 8, 10, 12, 14, 16, 18, 20, 22]; // Hours in 24-hour format
    
    for (const hour of checkTimes) {
      const checkTime = new Date(today);
      checkTime.setHours(hour, 0, 0, 0);
      
      // If time has passed today, schedule for tomorrow
      if (checkTime <= now) {
        checkTime.setDate(checkTime.getDate() + 1);
      }
      
      const secondsUntil = Math.floor((checkTime.getTime() - now.getTime()) / 1000);
      
      if (secondsUntil > 0 && secondsUntil < 7 * 24 * 60 * 60) { // Within 7 days
        const notificationId = `weather-check-periodic-${hour}`;
        
        // Schedule notification that will trigger weather check
        await Notifications.scheduleNotificationAsync({
          identifier: notificationId,
          content: {
            title: 'Checking Weather',
            body: 'Checking weather for your habits...',
            data: { type: 'weather-check' },
            sound: false, // Silent - this is just a trigger
          },
          trigger: {
            seconds: secondsUntil,
            repeats: true, // Repeat daily
          },
        });
        
        console.log(`[WeatherCheck] Scheduled periodic check for ${hour}:00 (in ${Math.floor(secondsUntil / 3600)}h ${Math.floor((secondsUntil % 3600) / 60)}m)`);
      }
    }
  } catch (error) {
    console.error('[WeatherCheck] Error scheduling periodic weather checks:', error);
  }
}

