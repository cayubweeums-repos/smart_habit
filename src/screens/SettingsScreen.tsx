import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import { colors, spacing, borderRadius, fontSize, fontWeight, commonStyles } from '../theme';
import { 
  WeatherData, 
  GarminHealthData, 
  LocationSettings,
  OneCallWeatherData,
  WeatherAlert,
  DailyForecast,
  WeatherUnits,
  TemperatureUnit,
  PrecipitationUnit,
  DistanceUnit,
  WeightUnit,
} from '../types';
import {
  loadLocationSettings,
  saveLocationSettings,
  loadNotificationsEnabled,
  saveNotificationsEnabled,
  loadWeatherUnits,
  saveWeatherUnits,
  saveGarminCredentials,
  loadGarminCredentials,
  clearGarminCredentials,
  saveNotificationTimes,
  loadNotificationTimes,
  type GarminCredentials,
  type NotificationTimes,
} from '../storage/settingsStorage';
import {
  fetchWeatherByCoordinates,
  fetchOneCallWeather,
  getWeatherIcon,
  formatTime,
  formatDate,
  getAlertSeverityIcon,
  formatTemperature,
  geocodeCityName,
  formatDistance,
} from '../services/weatherService';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import {
  isGarminAuthenticated,
  signInWithGarmin,
  logoutGarmin,
  fetchGarminHealthData,
  syncGarminHealthData,
} from '../services/garminService';
import {
  requestNotificationPermissions,
  scheduleDailyReminders,
  cancelAllReminders,
} from '../services/notificationService';
import { getTodayKey } from '../utils';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState<LocationSettings | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [oneCallWeather, setOneCallWeather] = useState<OneCallWeatherData | null>(null);
  const [garminAuthenticated, setGarminAuthenticated] = useState(false);
  const [garminData, setGarminData] = useState<GarminHealthData | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [forecastModalVisible, setForecastModalVisible] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [sunTimes, setSunTimes] = useState<{ sunrise: string; sunset: string } | null>(null);
  const [weatherUnits, setWeatherUnits] = useState<WeatherUnits>({
    temperature: 'fahrenheit',
    precipitation: 'inches',
    distance: 'miles',
    weight: 'lbs',
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [garminEmail, setGarminEmail] = useState('');
  const [garminPassword, setGarminPassword] = useState('');
  const [garminMfaCode, setGarminMfaCode] = useState('');
  const [garminError, setGarminError] = useState<string | null>(null);
  const [isGarminConnecting, setIsGarminConnecting] = useState(false);
  const [isGarminSyncing, setIsGarminSyncing] = useState(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [notificationTimes, setNotificationTimes] = useState<NotificationTimes>({
    sunriseHour: 6,
    sunriseMinute: 0,
    sunsetHour: 18,
    sunsetMinute: 0,
  });

  // Load settings on mount and when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSettings();
      
      return () => {
        // Clean up interval when screen loses focus
        stopPeriodicSync();
      };
    }, [])
  );

  // Set up periodic sync when authenticated status changes
  useEffect(() => {
    if (garminAuthenticated) {
      // Sync immediately on authentication
      syncGarminData();
      // Start periodic sync
      startPeriodicSync();
    } else {
      // Stop periodic sync if not authenticated
      stopPeriodicSync();
    }
    
    return () => {
      // Clean up on unmount
      stopPeriodicSync();
    };
  }, [garminAuthenticated, syncGarminData, startPeriodicSync, stopPeriodicSync]);

  const stopPeriodicSync = useCallback(() => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  }, []);

  const startPeriodicSync = useCallback(() => {
    stopPeriodicSync(); // Clear any existing interval
    
    // Sync every 1 minute (60000 ms)
    syncIntervalRef.current = setInterval(() => {
      syncGarminData();
    }, 60000);
  }, [syncGarminData, stopPeriodicSync]);

  const loadSettings = async () => {
    const savedLocation = await loadLocationSettings();
    setLocation(savedLocation);

    const notifEnabled = await loadNotificationsEnabled();
    // Ensure it's always a boolean
    setNotificationsEnabled(notifEnabled === true || notifEnabled === 'true');

    const units = await loadWeatherUnits();
    setWeatherUnits(units);

    const savedNotificationTimes = await loadNotificationTimes();
    if (savedNotificationTimes) {
      setNotificationTimes(savedNotificationTimes);
    }

    // Load saved Garmin credentials
    const savedCredentials = await loadGarminCredentials();
    if (savedCredentials) {
      setGarminEmail(savedCredentials.email);
      // Don't auto-fill password for security, but keep email
    }

    setGarminError(null);
    let garminAuth = await isGarminAuthenticated();
    
    // Only attempt auto-login if not already authenticated and credentials are saved
    // Skip auto-login if we just authenticated (to avoid duplicate attempts)
    if (!garminAuth && savedCredentials && savedCredentials.password) {
      try {
        console.log('[SettingsScreen] Attempting auto-login with saved credentials...');
        await signInWithGarmin({
          email: savedCredentials.email,
          password: savedCredentials.password,
        });
        // Ensure credentials are saved (in case they weren't before)
        await saveGarminCredentials(savedCredentials);
        garminAuth = true;
        console.log('[SettingsScreen] Auto-login successful');
      } catch (error: any) {
        // Auto-login failed - could be rate limiting, invalid credentials, or network issue
        const isRateLimited = error?.message?.includes('429') || error?.message?.includes('rate limit') || error?.message?.includes('already in progress');
        if (isRateLimited) {
          console.log('[SettingsScreen] Auto-login skipped due to rate limiting or concurrent attempt');
        } else {
          console.log('[SettingsScreen] Auto-login failed:', error?.message);
        }
        // Don't show error to user - they can manually reconnect if needed
        // Keep credentials saved in case it was a temporary network issue
      }
    }
    
    setGarminAuthenticated(garminAuth);

    if (savedLocation) {
      loadWeatherData(savedLocation, units);
    }

    if (garminAuth) {
      // Load from cache immediately, then sync in background
      loadGarminData();
      // Sync will happen in useEffect when garminAuthenticated changes
    }
  };

  const loadWeatherData = async (loc: LocationSettings, units?: WeatherUnits) => {
    const currentUnits = units || weatherUnits;
    
    // Fetch comprehensive weather data using One Call API 3.0
    const oneCallData = await fetchOneCallWeather(
      loc.latitude, 
      loc.longitude, 
      currentUnits.temperature
    );
    setOneCallWeather(oneCallData);
    
    // Also set legacy weather data for compatibility
    if (oneCallData) {
      const current = oneCallData.current;
      setWeather({
        location: loc.city || 'Current Location',
        temperature: Math.round(current.temp),
        condition: current.weather[0].main,
        description: current.weather[0].description,
        humidity: current.humidity,
        windSpeed: current.wind_speed,
        icon: current.weather[0].icon,
        date: new Date(current.dt * 1000).toISOString(),
      });
      
      // Set sunrise/sunset from API instead of calculating
      setSunTimes({
        sunrise: formatTime(current.sunrise),
        sunset: formatTime(current.sunset),
      });
    }
  };

  const loadGarminData = async () => {
    // Load from cache first (fast, works offline)
    const data = await fetchGarminHealthData(getTodayKey(), false);
    setGarminData(data);
  };

  const syncGarminData = useCallback(async () => {
    // Sync from API (force refresh)
    setIsGarminSyncing(true);
    try {
      const data = await syncGarminHealthData();
      setGarminData(data);
    } catch (error: any) {
      console.error('[SettingsScreen] Error syncing Garmin data:', {
        message: error?.message,
        stack: error?.stack,
        error: error,
      });
      // On error, still try to load from cache
      const cached = await fetchGarminHealthData(getTodayKey(), false);
      setGarminData(cached);
    } finally {
      setIsGarminSyncing(false);
    }
  }, []);

  const handleTemperatureUnitChange = async (unit: TemperatureUnit) => {
    const newUnits = { ...weatherUnits, temperature: unit };
    setWeatherUnits(newUnits);
    await saveWeatherUnits(newUnits);
    
    // Reload weather data with new units
    if (location) {
      loadWeatherData(location, newUnits);
    }
  };

  const handlePrecipitationUnitChange = async (unit: PrecipitationUnit) => {
    const newUnits = { ...weatherUnits, precipitation: unit };
    setWeatherUnits(newUnits);
    await saveWeatherUnits(newUnits);
  };

  const handleDistanceUnitChange = async (unit: DistanceUnit) => {
    const newUnits = { ...weatherUnits, distance: unit };
    setWeatherUnits(newUnits);
    await saveWeatherUnits(newUnits);
  };

  const handleWeightUnitChange = async (unit: WeightUnit) => {
    const newUnits = { ...weatherUnits, weight: unit };
    setWeatherUnits(newUnits);
    await saveWeatherUnits(newUnits);
  };

  const handleGetCurrentLocation = async () => {
    setIsLoadingLocation(true);
    console.log('[Location] Starting location fetch...');
    console.log('[Location] Device info:', { isDevice: Device.isDevice });
    
    try {
      // Step 1: Check if location services are enabled
      console.log('[Location] Checking if location services are enabled...');
      const isEnabled = await Location.hasServicesEnabledAsync();
      console.log('[Location] Location services enabled:', isEnabled);
      
      if (!isEnabled) {
        console.error('[Location] Location services are disabled');
        Alert.alert(
          'Location Services Disabled',
          'Please enable Location Services in your device settings:\n\n' +
          '1. Open Settings\n' +
          '2. Go to Location\n' +
          '3. Turn on "Use location"\n\n' +
          'Then try again, or use manual city entry instead.',
          [
            { text: 'Use Manual Entry', onPress: () => {} },
            { text: 'OK' }
          ]
        );
        setIsLoadingLocation(false);
        return;
      }
      
      // Step 2: Request permissions
      console.log('[Location] Requesting foreground permissions...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('[Location] Permission status:', status);
      
      if (status !== 'granted') {
        console.error('[Location] Permission denied');
        Alert.alert(
          'Permission Denied',
          'Location permission is required. Please grant location access in app settings.',
          [
            { text: 'Use Manual Entry', onPress: () => {} },
            { text: 'OK' }
          ]
        );
        setIsLoadingLocation(false);
        return;
      }

      // Step 2: Get current position with proper options
      console.log('[Location] Fetching current position...');
      
      let currentLocation;
      try {
        // Try high accuracy first (best for GPS)
        console.log('[Location] Attempting with Balanced accuracy...');
        currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        console.log('[Location] Got coordinates (Balanced):', currentLocation.coords);
      } catch (balancedError: any) {
        console.warn('[Location] Balanced accuracy failed, trying Low accuracy...', balancedError?.message);
        
        // Fallback to low accuracy (uses network/wifi location)
        try {
          currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
          });
          console.log('[Location] Got coordinates (Low accuracy):', currentLocation.coords);
        } catch (lowError: any) {
          console.error('[Location] Low accuracy also failed:', lowError?.message);
          
          // Last resort: try to get last known location
          console.log('[Location] Attempting to get last known location...');
          const lastKnown = await Location.getLastKnownPositionAsync({
            maxAge: 600000, // Up to 10 minutes old
            requiredAccuracy: 1000, // Within 1km
          });
          
          if (lastKnown) {
            console.log('[Location] Using last known location:', lastKnown.coords);
            currentLocation = lastKnown;
          } else {
            throw new Error('Could not get location. Please make sure Location Services are enabled in your device settings, and try again in an area with better GPS signal.');
          }
        }
      }
      
      const { latitude, longitude } = currentLocation.coords;

      // Step 3: Reverse geocode to get city name
      console.log('[Location] Reverse geocoding...');
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      console.log('[Location] Geocode results:', addresses);
      
      const address = addresses[0];

      const locationSettings: LocationSettings = {
        latitude,
        longitude,
        city: address?.city || address?.region || address?.district || 'Unknown',
        country: address?.country || '',
      };
      console.log('[Location] Location settings:', locationSettings);

      // Step 4: Save and update
      console.log('[Location] Saving location settings...');
      await saveLocationSettings(locationSettings);
      setLocation(locationSettings);
      
      console.log('[Location] Loading weather data...');
      loadWeatherData(locationSettings);
      
      setLocationModalVisible(false);

      // Reschedule notifications with new location
      if (notificationsEnabled) {
        console.log('[Location] Rescheduling notifications...');
        await scheduleDailyReminders();
      }

      console.log('[Location] Success!');
      Alert.alert(
        'Success', 
        `Location set to ${locationSettings.city}\n\nWeather data and sunrise/sunset times will be calculated for this location.`
      );
    } catch (error: any) {
      console.error('[Location] Error occurred:', error);
      console.error('[Location] Error message:', error?.message);
      console.error('[Location] Error code:', error?.code);
      console.error('[Location] Error stack:', error?.stack);
      
      let errorMessage = 'Failed to get current location';
      let errorTitle = 'Error';
      
      if (error?.code === 'E_LOCATION_TIMEOUT') {
        errorTitle = 'Location Timeout';
        errorMessage = 'Location request timed out. Please make sure:\n\n• GPS is enabled\n• You are not in airplane mode\n• You have a clear view of the sky\n• Try waiting a few seconds and try again';
      } else if (error?.code === 'ERR_CURRENT_LOCATION_IS_UNAVAILABLE') {
        errorTitle = 'Location Unavailable';
        errorMessage = 'Cannot get your current location.\n\n';
        
        // Check if running on simulator/emulator
        errorMessage += 'If using an emulator/simulator:\n';
        errorMessage += '• Android: Use extended controls to set mock location\n';
        errorMessage += '• iOS: Simulator → Features → Location\n\n';
        
        errorMessage += 'If using a real device:\n';
        errorMessage += '• Enable Location Services in system settings\n';
        errorMessage += '• Make sure you\'re not indoors (GPS needs clear sky)\n';
        errorMessage += '• Try using "Enter city manually" instead';
      } else if (error?.message) {
        errorMessage += `\n\nDetails: ${error.message}`;
      }
      
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsLoadingLocation(false);
      console.log('[Location] Finished (loading state cleared)');
    }
  };

  const handleManualLocation = async () => {
    if (!cityInput.trim()) {
      Alert.alert('Error', 'Please enter a city name');
      return;
    }

    setIsLoadingLocation(true);
    console.log('[Location] Starting manual location geocoding for:', cityInput);

    try {
      console.log('[Location] Geocoding city name using OpenWeatherMap API...');
      const geocodeResult = await geocodeCityName(cityInput);
      console.log('[Location] Geocode results:', geocodeResult);
      
      if (!geocodeResult) {
        console.error('[Location] City not found');
        Alert.alert(
          'City Not Found', 
          `Could not find "${cityInput}". Please try:\n\n• Adding the state/country (e.g., "New York, New York")\n• Using a major city nearby\n• Checking spelling`
        );
        setIsLoadingLocation(false);
        return;
      }

      const { latitude, longitude, displayName, state, country } = geocodeResult;
      
      // Build a nice display name
      let cityDisplay = displayName;
      if (state) {
        cityDisplay += `, ${state}`;
      } else if (country) {
        cityDisplay += `, ${country}`;
      }
      
      const locationSettings: LocationSettings = {
        latitude,
        longitude,
        city: cityDisplay,
        country: country,
      };
      console.log('[Location] Manual location settings:', locationSettings);

      console.log('[Location] Saving location...');
      await saveLocationSettings(locationSettings);
      setLocation(locationSettings);
      
      console.log('[Location] Loading weather data...');
      loadWeatherData(locationSettings);
      
      setLocationModalVisible(false);
      setCityInput('');

      if (notificationsEnabled) {
        console.log('[Location] Rescheduling notifications...');
        await scheduleDailyReminders();
      }

      console.log('[Location] Manual location set successfully');
      Alert.alert('Success', `Location set to ${cityDisplay}`);
    } catch (error: any) {
      console.error('[Location] Manual location error:', error);
      console.error('[Location] Error message:', error?.message);
      
      let errorMessage = 'Failed to set location';
      if (error?.message) {
        errorMessage += `\n\nDetails: ${error.message}`;
      }
      
      if (error?.message?.includes('Network')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoadingLocation(false);
      console.log('[Location] Manual location finished');
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    setNotificationsEnabled(value);
    await saveNotificationsEnabled(value);

    if (value) {
      const granted = await requestNotificationPermissions();
      if (granted && location) {
        await scheduleDailyReminders();
        Alert.alert('Enabled', 'Notifications enabled for your chosen times');
      }
    } else {
      await cancelAllReminders();
      Alert.alert('Disabled', 'All notifications have been cancelled');
    }
  };

  const handleGarminLogin = async () => {
    if (!garminEmail.trim()) {
      Alert.alert('Missing Info', 'Please enter your Garmin email.');
      return;
    }

    // If password is empty, try to use saved credentials
    let passwordToUse = garminPassword;
    if (!passwordToUse) {
      const savedCredentials = await loadGarminCredentials();
      if (savedCredentials && savedCredentials.email === garminEmail.trim()) {
        passwordToUse = savedCredentials.password;
      } else {
        Alert.alert('Missing Info', 'Please enter your Garmin password.');
        return;
      }
    }

    setGarminError(null);
    setIsGarminConnecting(true);

    try {
      await signInWithGarmin({
        email: garminEmail.trim(),
        password: passwordToUse,
        mfaCode: garminMfaCode.trim() || undefined,
      });
      setGarminAuthenticated(true);
      
      // Save credentials securely (always save, even if we used saved ones)
      await saveGarminCredentials({
        email: garminEmail.trim(),
        password: passwordToUse,
      });
      
      // Clear password field for security (but keep email)
      setGarminPassword('');
      setGarminMfaCode('');
      // Sync data after successful login
      await syncGarminData();
      Alert.alert('Success', 'Connected to Garmin');
    } catch (error: any) {
      const message =
        error?.message ?? 'Failed to connect to Garmin. Please try again.';
      console.error('[SettingsScreen] Garmin login error:', {
        message: error?.message,
        stack: error?.stack,
        error: error,
      });
      setGarminError(message);
      Alert.alert('Error', message);
    } finally {
      setIsGarminConnecting(false);
    }
  };

  const handleGarminLogout = async () => {
    Alert.alert('Disconnect Garmin', 'Are you sure you want to disconnect? Your credentials will remain saved for easy reconnection.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          await logoutGarmin();
          // Note: We keep credentials saved so user can easily reconnect
          // Only clear tokens, not credentials
          setGarminAuthenticated(false);
          setGarminData(null);
          setGarminPassword('');
          setGarminMfaCode('');
          setGarminError(null);
        },
      },
    ]);
  };

  const handleDeleteGarminAccount = async () => {
    Alert.alert(
      'Delete Garmin Account',
      'This will permanently delete your saved Garmin credentials and disconnect your account. You will need to re-enter your credentials to reconnect.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await logoutGarmin();
            await clearGarminCredentials();
            setGarminAuthenticated(false);
            setGarminData(null);
            setGarminEmail('');
            setGarminPassword('');
            setGarminMfaCode('');
            setGarminError(null);
            Alert.alert('Deleted', 'Garmin account credentials have been deleted.');
          },
        },
      ]
    );
  };

  const handleNotificationTimeChange = async (
    type: 'sunrise' | 'sunset',
    hour: number,
    minute: number
  ) => {
    const newTimes = {
      ...notificationTimes,
      [`${type}Hour`]: hour,
      [`${type}Minute`]: minute,
    } as NotificationTimes;
    setNotificationTimes(newTimes);
    await saveNotificationTimes(newTimes);
    
    // Reschedule notifications if enabled
    if (notificationsEnabled && location) {
      await scheduleDailyReminders();
    }
  };

  return (
    <View style={[commonStyles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.md }}
      >
        <View style={styles.header}>
          <Text style={commonStyles.title}>Settings</Text>
        </View>

        {/* Units Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Units</Text>
          
          {/* Units Configuration */}
          <View style={styles.unitsContainer}>
            <View style={styles.unitRow}>
              <Text style={styles.unitLabel}>Temperature:</Text>
              <View style={styles.unitToggleGroup}>
                <TouchableOpacity
                  style={[
                    styles.unitToggle,
                    weatherUnits.temperature === 'celsius' && styles.unitToggleActive,
                  ]}
                  onPress={() => handleTemperatureUnitChange('celsius')}
                >
                  <Text style={[
                    styles.unitToggleText,
                    weatherUnits.temperature === 'celsius' && styles.unitToggleTextActive,
                  ]}>
                    °C
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.unitToggle,
                    weatherUnits.temperature === 'fahrenheit' && styles.unitToggleActive,
                  ]}
                  onPress={() => handleTemperatureUnitChange('fahrenheit')}
                >
                  <Text style={[
                    styles.unitToggleText,
                    weatherUnits.temperature === 'fahrenheit' && styles.unitToggleTextActive,
                  ]}>
                    °F
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.unitRow}>
              <Text style={styles.unitLabel}>Precipitation:</Text>
              <View style={styles.unitToggleGroup}>
                <TouchableOpacity
                  style={[
                    styles.unitToggle,
                    weatherUnits.precipitation === 'mm' && styles.unitToggleActive,
                  ]}
                  onPress={() => handlePrecipitationUnitChange('mm')}
                >
                  <Text style={[
                    styles.unitToggleText,
                    weatherUnits.precipitation === 'mm' && styles.unitToggleTextActive,
                  ]}>
                    mm
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.unitToggle,
                    weatherUnits.precipitation === 'inches' && styles.unitToggleActive,
                  ]}
                  onPress={() => handlePrecipitationUnitChange('inches')}
                >
                  <Text style={[
                    styles.unitToggleText,
                    weatherUnits.precipitation === 'inches' && styles.unitToggleTextActive,
                  ]}>
                    inches
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.unitRow}>
              <Text style={styles.unitLabel}>Distance:</Text>
              <View style={styles.unitToggleGroup}>
                <TouchableOpacity
                  style={[
                    styles.unitToggle,
                    weatherUnits.distance === 'kilometers' && styles.unitToggleActive,
                  ]}
                  onPress={() => handleDistanceUnitChange('kilometers')}
                >
                  <Text style={[
                    styles.unitToggleText,
                    weatherUnits.distance === 'kilometers' && styles.unitToggleTextActive,
                  ]}>
                    km
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.unitToggle,
                    weatherUnits.distance === 'miles' && styles.unitToggleActive,
                  ]}
                  onPress={() => handleDistanceUnitChange('miles')}
                >
                  <Text style={[
                    styles.unitToggleText,
                    weatherUnits.distance === 'miles' && styles.unitToggleTextActive,
                  ]}>
                    mi
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.unitRow}>
              <Text style={styles.unitLabel}>Weight:</Text>
              <View style={styles.unitToggleGroup}>
                <TouchableOpacity
                  style={[
                    styles.unitToggle,
                    weatherUnits.weight === 'kg' && styles.unitToggleActive,
                  ]}
                  onPress={() => handleWeightUnitChange('kg')}
                >
                  <Text style={[
                    styles.unitToggleText,
                    weatherUnits.weight === 'kg' && styles.unitToggleTextActive,
                  ]}>
                    kg
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.unitToggle,
                    weatherUnits.weight === 'lbs' && styles.unitToggleActive,
                  ]}
                  onPress={() => handleWeightUnitChange('lbs')}
                >
                  <Text style={[
                    styles.unitToggleText,
                    weatherUnits.weight === 'lbs' && styles.unitToggleTextActive,
                  ]}>
                    lbs
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          {/* Weather Alerts */}
          {oneCallWeather?.alerts && oneCallWeather.alerts.length > 0 && (
            <View style={styles.alertCard}>
              {oneCallWeather.alerts.slice(0, 2).map((alert, index) => {
                const alertIcon = getAlertSeverityIcon(alert.event);
                const IconComponent = alertIcon.library === 'Ionicons' ? Ionicons : alertIcon.library === 'MaterialIcons' ? MaterialIcons : FontAwesome5;
                return (
                <View key={index} style={styles.alertItem}>
                  <View style={styles.alertHeader}>
                    <IconComponent name={alertIcon.name as any} size={24} color={colors.warning} />
                    <Text style={styles.alertTitle}>{alert.event}</Text>
                  </View>
                  <Text style={styles.alertSource}>{alert.sender_name}</Text>
                  <Text style={styles.alertTime}>
                    {formatDate(alert.start)} - {formatDate(alert.end)}
                  </Text>
                  <Text style={styles.alertDescription} numberOfLines={3}>
                    {alert.description}
                  </Text>
                </View>
                );
              })}
              {oneCallWeather.alerts.length > 2 && (
                <Text style={styles.moreAlertsText}>
                  +{oneCallWeather.alerts.length - 2} more alert(s)
                </Text>
              )}
            </View>
          )}
          
          {weather ? (
            <>
              <View style={styles.card}>
                <View style={styles.weatherHeader}>
                  {(() => {
                    const weatherIcon = getWeatherIcon(weather.condition);
                    const IconComponent = weatherIcon.library === 'Ionicons' ? Ionicons : weatherIcon.library === 'MaterialIcons' ? MaterialIcons : FontAwesome5;
                    return <IconComponent name={weatherIcon.name as any} size={48} color={colors.greenLight} />;
                  })()}
                  <View style={styles.weatherInfo}>
                    <Text style={styles.weatherTemp}>
                      {formatTemperature(weather.temperature, weatherUnits.temperature)}
                    </Text>
                    <Text style={styles.weatherCondition}>{weather.condition}</Text>
                  </View>
                </View>
                <Text style={styles.weatherLocation}>
                  {location?.city || weather.location}
                </Text>
                
                {/* Today's Forecast */}
                {oneCallWeather?.daily && oneCallWeather.daily[0] && (
                  <View style={styles.forecastContainer}>
                    <Text style={styles.forecastLabel}>Today's Forecast</Text>
                    <View style={styles.forecastRow}>
                      <View style={styles.forecastItem}>
                        <Text style={styles.forecastValue}>
                          {Math.round(oneCallWeather.daily[0].temp.max)}°
                        </Text>
                        <Text style={styles.forecastSubLabel}>High</Text>
                      </View>
                      <View style={styles.forecastItem}>
                        <Text style={styles.forecastValue}>
                          {Math.round(oneCallWeather.daily[0].temp.min)}°
                        </Text>
                        <Text style={styles.forecastSubLabel}>Low</Text>
                      </View>
                      <View style={styles.forecastItem}>
                        <Text style={styles.forecastValue}>
                          {Math.round(oneCallWeather.daily[0].pop * 100)}%
                        </Text>
                        <Text style={styles.forecastSubLabel}>Rain</Text>
                      </View>
                    </View>
                  </View>
                )}
                
                {sunTimes && (
                  <View style={styles.sunTimesContainer}>
                    <View style={styles.sunTime}>
                      <View style={styles.sunTimeLabelContainer}>
                        <Ionicons name="sunny" size={20} color={colors.greenLight} />
                        <Text style={styles.sunTimeLabel}>Sunrise</Text>
                      </View>
                      <Text style={styles.sunTimeValue}>{sunTimes.sunrise}</Text>
                    </View>
                    <View style={styles.sunTime}>
                      <View style={styles.sunTimeLabelContainer}>
                        <Ionicons name="moon" size={20} color={colors.greenLight} />
                        <Text style={styles.sunTimeLabel}>Sunset</Text>
                      </View>
                      <Text style={styles.sunTimeValue}>{sunTimes.sunset}</Text>
                    </View>
                  </View>
                )}
              </View>
              
              {/* View Detailed Forecast Button */}
              {oneCallWeather?.daily && oneCallWeather.daily.length > 1 && (
                <TouchableOpacity
                  style={[commonStyles.buttonOutline, { marginBottom: spacing.md }]}
                  onPress={() => setForecastModalVisible(true)}
                >
                  <Text style={styles.cancelButtonText}>View 8-Day Forecast</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardText}>No location set</Text>
            </View>
          )}

          <TouchableOpacity
            style={commonStyles.button}
            onPress={() => setLocationModalVisible(true)}
          >
            <Text style={commonStyles.buttonText}>
              {location ? 'Change Location' : 'Set Location'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Garmin Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Garmin Health Data</Text>
          
          {garminAuthenticated ? (
            <>
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View>
                    <Text style={styles.cardLabel}>Status</Text>
                    <Text style={styles.cardValue}>
                      ✓ Connected
                      {isGarminSyncing && ' (Syncing...)'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={syncGarminData}
                    disabled={isGarminSyncing}
                  >
                    {isGarminSyncing ? (
                      <ActivityIndicator size="small" color={colors.greenLight} />
                    ) : (
                      <Ionicons name="refresh" size={20} color={colors.greenLight} />
                    )}
                  </TouchableOpacity>
                </View>
                
                {garminData && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.healthDataRow}>
                      <Text style={styles.healthDataLabel}>Steps Today</Text>
                      <View style={styles.healthDataValueContainer}>
                        <Ionicons name="footsteps" size={16} color={colors.greenLight} style={styles.healthDataIcon} />
                        <Text style={styles.healthDataValue}>
                          {garminData.steps.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    {garminData.distance && (
                      <View style={styles.healthDataRow}>
                        <Text style={styles.healthDataLabel}>Distance</Text>
                        <View style={styles.healthDataValueContainer}>
                          <Ionicons name="location" size={16} color={colors.greenLight} style={styles.healthDataIcon} />
                          <Text style={styles.healthDataValue}>
                            {formatDistance(garminData.distance / 1000, weatherUnits.distance)}
                          </Text>
                        </View>
                      </View>
                    )}
                    {garminData.calories && (
                      <View style={styles.healthDataRow}>
                        <Text style={styles.healthDataLabel}>Calories</Text>
                        <View style={styles.healthDataValueContainer}>
                          <Ionicons name="flame" size={16} color={colors.greenLight} style={styles.healthDataIcon} />
                          <Text style={styles.healthDataValue}>
                            {garminData.calories} cal
                          </Text>
                        </View>
                      </View>
                    )}
                    {garminData.heartRate && (
                      <View style={styles.healthDataRow}>
                        <Text style={styles.healthDataLabel}>Resting HR</Text>
                        <View style={styles.healthDataValueContainer}>
                          <Ionicons name="heart" size={16} color={colors.greenLight} style={styles.healthDataIcon} />
                          <Text style={styles.healthDataValue}>
                            {garminData.heartRate} bpm
                          </Text>
                        </View>
                      </View>
                    )}
                    {garminData.sleep && garminData.sleep.duration && (
                      <View style={styles.healthDataRow}>
                        <Text style={styles.healthDataLabel}>Sleep</Text>
                        <View style={styles.healthDataValueContainer}>
                          <Ionicons name="moon" size={16} color={colors.greenLight} style={styles.healthDataIcon} />
                          <Text style={styles.healthDataValue}>
                            {Math.floor(garminData.sleep.duration / 60)}h {garminData.sleep.duration % 60}m
                          </Text>
                        </View>
                      </View>
                    )}
                    {garminData.weight && (
                      <View style={styles.healthDataRow}>
                        <Text style={styles.healthDataLabel}>
                          Weight{garminData.weightDate && garminData.weightDate !== garminData.date ? ' (Last logged)' : ''}
                        </Text>
                        <View style={styles.healthDataValueContainer}>
                          <Ionicons 
                            name="barbell" 
                            size={16} 
                            color={garminData.weightDate && garminData.weightDate !== garminData.date ? colors.greyMedium : colors.greenLight} 
                            style={styles.healthDataIcon} 
                          />
                          <Text 
                            style={[
                              styles.healthDataValue,
                              garminData.weightDate && garminData.weightDate !== garminData.date && styles.healthDataValueGreyed
                            ]}
                          >
                            {weatherUnits.weight === 'lbs' 
                              ? `${(garminData.weight * 2.20462).toFixed(1)} lbs`
                              : `${garminData.weight.toFixed(1)} kg`}
                          </Text>
                        </View>
                      </View>
                    )}
                  </>
                )}
              </View>
              <View style={styles.garminActions}>
                <TouchableOpacity
                  style={[commonStyles.buttonOutline, styles.dangerButton]}
                  onPress={handleGarminLogout}
                >
                  <Text style={styles.dangerButtonText}>Disconnect</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[commonStyles.buttonOutline, styles.dangerButton, { marginTop: spacing.sm }]}
                  onPress={handleDeleteGarminAccount}
                >
                  <Text style={styles.dangerButtonText}>Delete Account</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardText}>Connect your Garmin account</Text>
              <Text style={styles.cardSubtext}>
                Enter your Garmin credentials to sync today&apos;s activity.
              </Text>
              <TextInput
                style={commonStyles.input}
                placeholder="Garmin email"
                placeholderTextColor={colors.greyMedium}
                autoCapitalize="none"
                keyboardType="email-address"
                value={garminEmail}
                onChangeText={setGarminEmail}
              />
              <TextInput
                style={commonStyles.input}
                placeholder="Garmin password"
                placeholderTextColor={colors.greyMedium}
                secureTextEntry
                value={garminPassword}
                onChangeText={setGarminPassword}
              />
              <TextInput
                style={commonStyles.input}
                placeholder="MFA code (optional)"
                placeholderTextColor={colors.greyMedium}
                keyboardType="number-pad"
                value={garminMfaCode}
                onChangeText={setGarminMfaCode}
              />
              {garminError && (
                <Text style={styles.errorText}>{garminError}</Text>
              )}
              <TouchableOpacity
                style={[
                  commonStyles.button,
                  isGarminConnecting && styles.buttonDisabled,
                ]}
                onPress={handleGarminLogin}
                disabled={isGarminConnecting}
              >
                {isGarminConnecting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={commonStyles.buttonText}>Connect Garmin</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Daily Reminders</Text>
                <Text style={styles.settingDescription}>
                  Get notified at your chosen times
                </Text>
              </View>
              <Switch
                value={!!notificationsEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: colors.greyLight, true: colors.green }}
                thumbColor={colors.white}
              />
            </View>
            
            {notificationsEnabled && (
              <>
                <View style={styles.divider} />
                
                {/* Sunrise Time Picker */}
                <View style={styles.timePickerContainer}>
                  <Text style={styles.timePickerLabel}>Sunrise Notification</Text>
                  <View style={styles.timePickerRow}>
                    <View style={styles.timePickerGroup}>
                      <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => {
                          const newHour = (notificationTimes.sunriseHour + 1) % 24;
                          handleNotificationTimeChange('sunrise', newHour, notificationTimes.sunriseMinute);
                        }}
                      >
                        <Ionicons name="chevron-up" size={20} color={colors.greenLight} />
                      </TouchableOpacity>
                      <Text style={styles.timePickerValue}>
                        {notificationTimes.sunriseHour.toString().padStart(2, '0')}
                      </Text>
                      <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => {
                          const newHour = (notificationTimes.sunriseHour - 1 + 24) % 24;
                          handleNotificationTimeChange('sunrise', newHour, notificationTimes.sunriseMinute);
                        }}
                      >
                        <Ionicons name="chevron-down" size={20} color={colors.greenLight} />
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.timePickerSeparator}>:</Text>
                    
                    <View style={styles.timePickerGroup}>
                      <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => {
                          const newMinute = (notificationTimes.sunriseMinute + 15) % 60;
                          handleNotificationTimeChange('sunrise', notificationTimes.sunriseHour, newMinute);
                        }}
                      >
                        <Ionicons name="chevron-up" size={20} color={colors.greenLight} />
                      </TouchableOpacity>
                      <Text style={styles.timePickerValue}>
                        {notificationTimes.sunriseMinute.toString().padStart(2, '0')}
                      </Text>
                      <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => {
                          const newMinute = (notificationTimes.sunriseMinute - 15 + 60) % 60;
                          handleNotificationTimeChange('sunrise', notificationTimes.sunriseHour, newMinute);
                        }}
                      >
                        <Ionicons name="chevron-down" size={20} color={colors.greenLight} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                
                <View style={styles.divider} />
                
                {/* Sunset Time Picker */}
                <View style={styles.timePickerContainer}>
                  <Text style={styles.timePickerLabel}>Sunset Notification</Text>
                  <View style={styles.timePickerRow}>
                    <View style={styles.timePickerGroup}>
                      <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => {
                          const newHour = (notificationTimes.sunsetHour + 1) % 24;
                          handleNotificationTimeChange('sunset', newHour, notificationTimes.sunsetMinute);
                        }}
                      >
                        <Ionicons name="chevron-up" size={20} color={colors.greenLight} />
                      </TouchableOpacity>
                      <Text style={styles.timePickerValue}>
                        {notificationTimes.sunsetHour.toString().padStart(2, '0')}
                      </Text>
                      <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => {
                          const newHour = (notificationTimes.sunsetHour - 1 + 24) % 24;
                          handleNotificationTimeChange('sunset', newHour, notificationTimes.sunsetMinute);
                        }}
                      >
                        <Ionicons name="chevron-down" size={20} color={colors.greenLight} />
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.timePickerSeparator}>:</Text>
                    
                    <View style={styles.timePickerGroup}>
                      <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => {
                          const newMinute = (notificationTimes.sunsetMinute + 15) % 60;
                          handleNotificationTimeChange('sunset', notificationTimes.sunsetHour, newMinute);
                        }}
                      >
                        <Ionicons name="chevron-up" size={20} color={colors.greenLight} />
                      </TouchableOpacity>
                      <Text style={styles.timePickerValue}>
                        {notificationTimes.sunsetMinute.toString().padStart(2, '0')}
                      </Text>
                      <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => {
                          const newMinute = (notificationTimes.sunsetMinute - 15 + 60) % 60;
                          handleNotificationTimeChange('sunset', notificationTimes.sunsetHour, newMinute);
                        }}
                      >
                        <Ionicons name="chevron-down" size={20} color={colors.greenLight} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Location Modal */}
      <Modal
        visible={!!locationModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Location</Text>

            <TouchableOpacity
              style={[commonStyles.button, isLoadingLocation && styles.buttonDisabled]}
              onPress={handleGetCurrentLocation}
              disabled={isLoadingLocation}
            >
              {isLoadingLocation ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={colors.white} size="small" />
                  <Text style={[commonStyles.buttonText, styles.loadingText]}>
                    Getting location...
                  </Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="location" size={20} color={colors.white} style={styles.buttonIcon} />
                  <Text style={commonStyles.buttonText}>Use Current Location</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            <Text style={styles.inputLabel}>Or enter city manually:</Text>
            <View style={styles.tipCard}>
              <View style={styles.tipContent}>
                <Ionicons name="information-circle" size={16} color={colors.greenLight} style={styles.tipIcon} />
                <Text style={styles.tipText}>
                  Tip: For best results, include state/country (e.g., "New York, New York" or "Portland, Oregon")
                </Text>
              </View>
            </View>
            <TextInput
              style={commonStyles.input}
              placeholder="e.g., New York, New York"
              placeholderTextColor={colors.greyMedium}
              value={cityInput}
              onChangeText={setCityInput}
              editable={!isLoadingLocation}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[commonStyles.buttonOutline, styles.modalButton]}
                onPress={() => {
                  setLocationModalVisible(false);
                  setCityInput('');
                }}
                disabled={isLoadingLocation}
              >
                <Text style={[styles.cancelButtonText, isLoadingLocation && styles.textDisabled]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  commonStyles.button, 
                  styles.modalButton,
                  isLoadingLocation && styles.buttonDisabled
                ]}
                onPress={handleManualLocation}
                disabled={isLoadingLocation}
              >
                {isLoadingLocation ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={commonStyles.buttonText}>Set</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Forecast Modal */}
      <Modal
        visible={!!forecastModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setForecastModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>8-Day Forecast</Text>
              <TouchableOpacity onPress={() => setForecastModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {oneCallWeather?.daily?.map((day, index) => (
                <View key={index} style={styles.forecastDayCard}>
                  <View style={styles.forecastDayHeader}>
                    <Text style={styles.forecastDayName}>
                      {index === 0 ? 'Today' : formatDate(day.dt)}
                    </Text>
                    {(() => {
                      const weatherIcon = getWeatherIcon(day.weather[0].main);
                      const IconComponent = weatherIcon.library === 'Ionicons' ? Ionicons : weatherIcon.library === 'MaterialIcons' ? MaterialIcons : FontAwesome5;
                      return <IconComponent name={weatherIcon.name as any} size={32} color={colors.greenLight} />;
                    })()}
                  </View>
                  <Text style={styles.forecastDayCondition}>
                    {day.weather[0].description}
                  </Text>
                  <View style={styles.forecastDayDetails}>
                    <View style={styles.forecastDetailItem}>
                      <Text style={styles.forecastDetailLabel}>High</Text>
                      <Text style={styles.forecastDetailValue}>
                        {formatTemperature(day.temp.max, weatherUnits.temperature)}
                      </Text>
                    </View>
                    <View style={styles.forecastDetailItem}>
                      <Text style={styles.forecastDetailLabel}>Low</Text>
                      <Text style={styles.forecastDetailValue}>
                        {formatTemperature(day.temp.min, weatherUnits.temperature)}
                      </Text>
                    </View>
                    <View style={styles.forecastDetailItem}>
                      <Text style={styles.forecastDetailLabel}>Rain</Text>
                      <Text style={styles.forecastDetailValue}>
                        {Math.round(day.pop * 100)}%
                      </Text>
                    </View>
                    <View style={styles.forecastDetailItem}>
                      <Text style={styles.forecastDetailLabel}>Humidity</Text>
                      <Text style={styles.forecastDetailValue}>
                        {day.humidity}%
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    color: colors.greyVeryLight,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  unitsContainer: {
    backgroundColor: colors.grey,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  unitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitLabel: {
    color: colors.greyVeryLight,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  unitToggleGroup: {
    flexDirection: 'row',
    backgroundColor: colors.greyDark,
    borderRadius: borderRadius.md,
    padding: 2,
    gap: 4,
  },
  unitToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    minWidth: 60,
    alignItems: 'center',
  },
  unitToggleActive: {
    backgroundColor: colors.purpleLight,
  },
  unitToggleText: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  unitToggleTextActive: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  card: {
    backgroundColor: colors.grey,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardText: {
    color: colors.white,
    fontSize: fontSize.md,
    marginBottom: spacing.xs,
  },
  cardSubtext: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  cardLabel: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  cardValue: {
    color: colors.greenLight,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  refreshButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.greyLight,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  weatherIcon: {
    marginRight: spacing.md,
  },
  weatherInfo: {
    flex: 1,
  },
  weatherTemp: {
    color: colors.white,
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  weatherCondition: {
    color: colors.greyVeryLight,
    fontSize: fontSize.md,
  },
  weatherLocation: {
    color: colors.greyVeryLight,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
  },
  sunTimesContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sunTime: {
    flex: 1,
    backgroundColor: colors.greyLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  sunTimeLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  sunTimeLabel: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
  },
  sunTimeValue: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  healthDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  healthDataLabel: {
    color: colors.greyVeryLight,
    fontSize: fontSize.md,
  },
  healthDataValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  healthDataIcon: {
    marginRight: spacing.xs,
  },
  healthDataValue: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  healthDataValueGreyed: {
    color: colors.greyMedium,
  },
  divider: {
    height: 1,
    backgroundColor: colors.greyLight,
    marginVertical: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  settingDescription: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
  },
  dangerButton: {
    borderColor: colors.error,
  },
  dangerButtonText: {
    color: colors.error,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.grey,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.lg,
  },
  inputLabel: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  tipCard: {
    backgroundColor: colors.greyLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.purpleLight,
  },
  tipContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  tipIcon: {
    marginTop: 2,
  },
  tipText: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
    lineHeight: 20,
    flex: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  buttonIcon: {
    marginRight: spacing.xs,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
  },
  cancelButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  textDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    marginLeft: spacing.sm,
  },
  // Alert styles
  alertCard: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  alertItem: {
    marginBottom: spacing.md,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  alertIcon: {
    marginRight: spacing.sm,
  },
  alertTitle: {
    flex: 1,
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  alertSource: {
    color: colors.white,
    fontSize: fontSize.sm,
    opacity: 0.9,
    marginBottom: spacing.xs,
  },
  alertTime: {
    color: colors.white,
    fontSize: fontSize.sm,
    opacity: 0.8,
    marginBottom: spacing.sm,
  },
  alertDescription: {
    color: colors.white,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  moreAlertsText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  // Forecast styles
  forecastContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.greyLight,
  },
  forecastLabel: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  forecastItem: {
    alignItems: 'center',
  },
  forecastValue: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  forecastSubLabel: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
  },
  // Forecast modal styles
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  closeButton: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.normal,
    padding: spacing.sm,
  },
  forecastDayCard: {
    backgroundColor: colors.greyLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  forecastDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  forecastDayName: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  forecastDayIcon: {
    // Icon size is set inline
  },
  forecastDayCondition: {
    color: colors.greyVeryLight,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
    textTransform: 'capitalize',
  },
  forecastDayDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.grey,
  },
  forecastDetailItem: {
    alignItems: 'center',
  },
  forecastDetailLabel: {
    color: colors.greyVeryLight,
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  forecastDetailValue: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  garminActions: {
    marginTop: spacing.md,
  },
  timePickerContainer: {
    marginVertical: spacing.md,
  },
  timePickerLabel: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  timePickerGroup: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  timePickerButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.greyLight,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickerValue: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    minWidth: 50,
    textAlign: 'center',
  },
  timePickerSeparator: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
});

