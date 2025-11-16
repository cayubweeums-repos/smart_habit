import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { checkWeatherDependentHabits } from './notificationService';

const BACKGROUND_WEATHER_TASK = 'background-weather-check';

/**
 * Background task that checks weather for weather-dependent habits
 * This runs even when the app is closed
 */
try {
  TaskManager.defineTask(BACKGROUND_WEATHER_TASK, async () => {
    try {
      console.log('[BackgroundTask] Running background weather check...');
      await checkWeatherDependentHabits(false);
      console.log('[BackgroundTask] Background weather check completed');
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      console.error('[BackgroundTask] Error in background weather check:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
  console.log('[BackgroundTask] Task defined successfully:', BACKGROUND_WEATHER_TASK);
} catch (error) {
  console.error('[BackgroundTask] Error defining task (this may be expected in Expo Go):', error);
}

/**
 * Register background fetch task
 * This will run periodically even when the app is closed
 */
export async function registerBackgroundWeatherTask(): Promise<boolean> {
  try {
    // Check current status to see if background fetch is available
    let status: BackgroundFetch.BackgroundFetchStatus | null = null;
    try {
      status = await BackgroundFetch.getStatusAsync();
      console.log('[BackgroundTask] Background fetch status:', status);
    } catch (error) {
      console.warn('[BackgroundTask] Could not get background fetch status:', error);
      // If we can't get status, try to register anyway - it will fail gracefully if not available
    }

    if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) {
      console.warn('[BackgroundTask] Background fetch is restricted');
      return false;
    }

    if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      console.warn('[BackgroundTask] Background fetch is denied');
      return false;
    }

    // Register the task
    // Note: The task must be defined before this is called (via TaskManager.defineTask above)
    // The task definition happens when this module is imported, which should be before
    // registerBackgroundWeatherTask is called
    await BackgroundFetch.registerTaskAsync(BACKGROUND_WEATHER_TASK, {
      minimumInterval: 2 * 60 * 60, // 2 hours in seconds
      stopOnTerminate: false, // Continue running even if app is terminated
      startOnBoot: true, // Start when device boots
    });

    console.log('[BackgroundTask] Background weather task registered successfully');
    return true;
  } catch (error: any) {
    // Check if the error is about the task not being defined
    if (error?.message?.includes('not defined') || error?.message?.includes('defineTask')) {
      console.warn('[BackgroundTask] Task not defined - this may happen in Expo Go. Falling back to scheduled notifications.');
      return false;
    }
    console.error('[BackgroundTask] Error registering background task:', error);
    // If registration fails, return false so the app can fall back to scheduled notifications
    return false;
  }
}

/**
 * Unregister background fetch task
 */
export async function unregisterBackgroundWeatherTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_WEATHER_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_WEATHER_TASK);
      console.log('[BackgroundTask] Background weather task unregistered');
    }
  } catch (error) {
    console.error('[BackgroundTask] Error unregistering background task:', error);
  }
}

/**
 * Check if background task is registered
 */
export async function isBackgroundWeatherTaskRegistered(): Promise<boolean> {
  try {
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_WEATHER_TASK);
  } catch (error) {
    console.error('[BackgroundTask] Error checking task registration:', error);
    return false;
  }
}

