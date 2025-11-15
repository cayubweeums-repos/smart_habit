import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { LocationSettings, GarminAuthTokens, WeatherUnits } from '../types';

const LOCATION_KEY = '@location_settings';
const NOTIFICATIONS_ENABLED_KEY = '@notifications_enabled';
const WEATHER_UNITS_KEY = '@weather_units';

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
    return enabledJson ? JSON.parse(enabledJson) : true; // default to enabled
  } catch (error) {
    console.error('Error loading notifications enabled:', error);
    return true;
  }
};

// Garmin Auth Tokens (using SecureStore for sensitive data)
export const saveGarminTokens = async (tokens: GarminAuthTokens): Promise<void> => {
  try {
    await SecureStore.setItemAsync('garmin_tokens', JSON.stringify(tokens));
  } catch (error) {
    console.error('Error saving Garmin tokens:', error);
    throw error;
  }
};

export const loadGarminTokens = async (): Promise<GarminAuthTokens | null> => {
  try {
    const tokensJson = await SecureStore.getItemAsync('garmin_tokens');
    return tokensJson ? JSON.parse(tokensJson) : null;
  } catch (error) {
    console.error('Error loading Garmin tokens:', error);
    return null;
  }
};

export const clearGarminTokens = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync('garmin_tokens');
  } catch (error) {
    console.error('Error clearing Garmin tokens:', error);
    throw error;
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
      // Ensure distance is set (for backwards compatibility)
      if (!units.distance) {
        units.distance = 'miles';
      }
      return units;
    }
    // Default to imperial
    return {
      temperature: 'fahrenheit',
      precipitation: 'inches',
      distance: 'miles',
    };
  } catch (error) {
    console.error('Error loading weather units:', error);
    // Default to imperial on error
    return {
      temperature: 'fahrenheit',
      precipitation: 'inches',
      distance: 'miles',
    };
  }
};

