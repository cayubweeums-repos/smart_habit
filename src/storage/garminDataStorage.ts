import AsyncStorage from '@react-native-async-storage/async-storage';
import { GarminHealthData } from '../types';

const GARMIN_DATA_PREFIX = '@garmin_data_';
const GARMIN_SYNC_TIMESTAMP_KEY = '@garmin_last_sync';

/**
 * Save Garmin health data for a specific date
 */
export const saveGarminHealthData = async (
  date: string,
  data: GarminHealthData
): Promise<void> => {
  try {
    const key = `${GARMIN_DATA_PREFIX}${date}`;
    await AsyncStorage.setItem(key, JSON.stringify(data));
    // Update last sync timestamp
    await AsyncStorage.setItem(GARMIN_SYNC_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error saving Garmin health data:', error);
    throw error;
  }
};

/**
 * Load Garmin health data for a specific date
 */
export const loadGarminHealthData = async (
  date: string
): Promise<GarminHealthData | null> => {
  try {
    const key = `${GARMIN_DATA_PREFIX}${date}`;
    const dataJson = await AsyncStorage.getItem(key);
    return dataJson ? JSON.parse(dataJson) : null;
  } catch (error) {
    console.error('Error loading Garmin health data:', error);
    return null;
  }
};

/**
 * Get the last sync timestamp
 */
export const getLastSyncTimestamp = async (): Promise<number | null> => {
  try {
    const timestamp = await AsyncStorage.getItem(GARMIN_SYNC_TIMESTAMP_KEY);
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (error) {
    console.error('Error loading last sync timestamp:', error);
    return null;
  }
};

/**
 * Clear all cached Garmin health data
 */
export const clearGarminHealthData = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const garminKeys = keys.filter((key) => key.startsWith(GARMIN_DATA_PREFIX));
    if (garminKeys.length > 0) {
      await AsyncStorage.multiRemove(garminKeys);
    }
    await AsyncStorage.removeItem(GARMIN_SYNC_TIMESTAMP_KEY);
  } catch (error) {
    console.error('Error clearing Garmin health data:', error);
    throw error;
  }
};

/**
 * Get all cached dates
 */
export const getCachedDates = async (): Promise<string[]> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const garminKeys = keys.filter((key) => key.startsWith(GARMIN_DATA_PREFIX));
    return garminKeys.map((key) => key.replace(GARMIN_DATA_PREFIX, ''));
  } catch (error) {
    console.error('Error getting cached dates:', error);
    return [];
  }
};

/**
 * Load Garmin health data for a date range
 */
export const getGarminHealthDataInRange = async (
  startDate: string,
  endDate: string
): Promise<GarminHealthData[]> => {
  try {
    const dates: string[] = [];
    const current = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    
    while (current <= end) {
      const dateKey = current.toISOString().split('T')[0];
      dates.push(dateKey);
      current.setDate(current.getDate() + 1);
    }
    
    const dataPromises = dates.map(date => loadGarminHealthData(date));
    const results = await Promise.all(dataPromises);
    
    return results.filter((data): data is GarminHealthData => data !== null);
  } catch (error) {
    console.error('Error loading Garmin health data in range:', error);
    return [];
  }
};

