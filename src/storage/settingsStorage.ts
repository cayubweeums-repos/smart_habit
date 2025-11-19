import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { LocationSettings, GarminAuthTokens, WeatherUnits } from '../types';

const LOCATION_KEY = '@location_settings';
const NOTIFICATIONS_ENABLED_KEY = '@notifications_enabled';
const WEATHER_UNITS_KEY = '@weather_units';
const NOTIFICATION_TIMES_KEY = '@notification_times';

// Location Settings
export const saveLocationSettings = async (location: LocationSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(location));
  } catch (error) {
    console.error('Error saving location settings:', error);
    throw error;
  }
};

export const loadLocationSettings = async (): Promise<LocationSettings | null> => {
  try {
    const locationJson = await AsyncStorage.getItem(LOCATION_KEY);
    return locationJson ? JSON.parse(locationJson) : null;
  } catch (error) {
    console.error('Error loading location settings:', error);
    return null;
  }
};

// Notification Settings
export const saveNotificationsEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, JSON.stringify(enabled));
  } catch (error) {
    console.error('Error saving notifications enabled:', error);
    throw error;
  }
};

export const loadNotificationsEnabled = async (): Promise<boolean> => {
  try {
    const enabledJson = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    if (!enabledJson) {
      return true; // default to enabled
    }
    const enabled = JSON.parse(enabledJson);
    // Normalize boolean - handle cases where it might be stored as a string
    return enabled === true || enabled === 'true';
  } catch (error) {
    console.error('Error loading notifications enabled:', error);
    return true;
  }
};

// Garmin Auth Tokens (using SecureStore for sensitive data)
// Split tokens to avoid SecureStore 2048 byte limit
export const saveGarminTokens = async (tokens: GarminAuthTokens): Promise<void> => {
  try {
    // Store sensitive OAuth tokens in SecureStore (smaller chunks)
    const sensitiveData = {
      oauthToken: tokens.oauthToken,
      oauthTokenSecret: tokens.oauthTokenSecret,
      oauth2AccessToken: tokens.oauth2AccessToken,
      oauth2RefreshToken: tokens.oauth2RefreshToken,
    };
    await SecureStore.setItemAsync('garmin_tokens_sensitive', JSON.stringify(sensitiveData));
    
    // Store non-sensitive metadata in AsyncStorage
    const metadata = {
      oauth2TokenType: tokens.oauth2TokenType,
      oauth2Scope: tokens.oauth2Scope,
      oauth2ExpiresAt: tokens.oauth2ExpiresAt,
      oauth2RefreshExpiresAt: tokens.oauth2RefreshExpiresAt,
      mfaToken: tokens.mfaToken,
      displayName: tokens.displayName,
    };
    await AsyncStorage.setItem('@garmin_tokens_metadata', JSON.stringify(metadata));
  } catch (error) {
    console.error('Error saving Garmin tokens:', error);
    throw error;
  }
};

export const loadGarminTokens = async (): Promise<GarminAuthTokens | null> => {
  try {
    // Try new split format first
    const sensitiveJson = await SecureStore.getItemAsync('garmin_tokens_sensitive');
    const metadataJson = await AsyncStorage.getItem('@garmin_tokens_metadata');
    
    if (sensitiveJson && metadataJson) {
      const sensitive = JSON.parse(sensitiveJson);
      const metadata = JSON.parse(metadataJson);
      
      return {
        ...sensitive,
        ...metadata,
      } as GarminAuthTokens;
    }
    
    // Fallback to old format (for backwards compatibility)
    const oldTokensJson = await SecureStore.getItemAsync('garmin_tokens');
    if (oldTokensJson) {
      const oldTokens = JSON.parse(oldTokensJson);
      // Migrate to new format
      await saveGarminTokens(oldTokens);
      // Clear old format
      await SecureStore.deleteItemAsync('garmin_tokens');
      return oldTokens;
    }
    
    return null;
  } catch (error) {
    console.error('Error loading Garmin tokens:', error);
    return null;
  }
};

export const clearGarminTokens = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync('garmin_tokens_sensitive');
    await AsyncStorage.removeItem('@garmin_tokens_metadata');
    // Also clear old format if it exists
    try {
      await SecureStore.deleteItemAsync('garmin_tokens');
    } catch {
      // Ignore if old format doesn't exist
    }
  } catch (error) {
    console.error('Error clearing Garmin tokens:', error);
    throw error;
  }
};

// Garmin Credentials (email/password stored securely)
export interface GarminCredentials {
  email: string;
  password: string;
}

export const saveGarminCredentials = async (credentials: GarminCredentials): Promise<void> => {
  try {
    await SecureStore.setItemAsync('garmin_credentials', JSON.stringify(credentials));
  } catch (error) {
    console.error('Error saving Garmin credentials:', error);
    throw error;
  }
};

export const loadGarminCredentials = async (): Promise<GarminCredentials | null> => {
  try {
    const credentialsJson = await SecureStore.getItemAsync('garmin_credentials');
    return credentialsJson ? JSON.parse(credentialsJson) : null;
  } catch (error) {
    console.error('Error loading Garmin credentials:', error);
    return null;
  }
};

export const clearGarminCredentials = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync('garmin_credentials');
  } catch (error) {
    console.error('Error clearing Garmin credentials:', error);
    throw error;
  }
};

// Notification Times
export interface NotificationTimes {
  sunriseHour: number;
  sunriseMinute: number;
  sunsetHour: number;
  sunsetMinute: number;
}

export const saveNotificationTimes = async (times: NotificationTimes): Promise<void> => {
  try {
    await AsyncStorage.setItem(NOTIFICATION_TIMES_KEY, JSON.stringify(times));
  } catch (error) {
    console.error('Error saving notification times:', error);
    throw error;
  }
};

export const loadNotificationTimes = async (): Promise<NotificationTimes | null> => {
  try {
    const timesJson = await AsyncStorage.getItem(NOTIFICATION_TIMES_KEY);
    return timesJson ? JSON.parse(timesJson) : null;
  } catch (error) {
    console.error('Error loading notification times:', error);
    return null;
  }
};

// Weather Units
export const saveWeatherUnits = async (units: WeatherUnits): Promise<void> => {
  try {
    await AsyncStorage.setItem(WEATHER_UNITS_KEY, JSON.stringify(units));
  } catch (error) {
    console.error('Error saving weather units:', error);
    throw error;
  }
};

export const loadWeatherUnits = async (): Promise<WeatherUnits> => {
  try {
    const unitsJson = await AsyncStorage.getItem(WEATHER_UNITS_KEY);
    if (unitsJson) {
      const units = JSON.parse(unitsJson);
      // Ensure all units are set (for backwards compatibility)
      if (!units.distance) {
        units.distance = 'miles';
      }
      if (!units.weight) {
        units.weight = 'lbs';
      }
      return units;
    }
    // Default to imperial
    return {
      temperature: 'fahrenheit',
      precipitation: 'inches',
      distance: 'miles',
      weight: 'lbs',
    };
  } catch (error) {
    console.error('Error loading weather units:', error);
    // Default to imperial on error
    return {
      temperature: 'fahrenheit',
      precipitation: 'inches',
      distance: 'miles',
      weight: 'lbs',
    };
  }
};

