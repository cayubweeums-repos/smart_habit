import React, { useState, useCallback } from 'react';
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
} from '../types';
import {
  loadLocationSettings,
  saveLocationSettings,
  loadNotificationsEnabled,
  saveNotificationsEnabled,
  loadWeatherUnits,
  saveWeatherUnits,
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
  mockGarminLogin,
  logoutGarmin,
  fetchGarminHealthData,
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
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    const savedLocation = await loadLocationSettings();
    setLocation(savedLocation);

    const notifEnabled = await loadNotificationsEnabled();
    // Ensure it's always a boolean
    setNotificationsEnabled(notifEnabled === true || notifEnabled === 'true');

    const units = await loadWeatherUnits();
    setWeatherUnits(units);

    const garminAuth = await isGarminAuthenticated();
    setGarminAuthenticated(garminAuth);

    if (savedLocation) {
      loadWeatherData(savedLocation, units);
    }

    if (garminAuth) {
      loadGarminData();
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
    const data = await fetchGarminHealthData(getTodayKey());
    setGarminData(data);
  };

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
          `Could not find "${cityInput}". Please try:\n\n• Adding the state/country (e.g., "Rogers, Arkansas")\n• Using a major city nearby\n• Checking spelling`
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
        Alert.alert('Enabled', 'Notifications enabled for sunrise and sunset');
      }
    } else {
      await cancelAllReminders();
      Alert.alert('Disabled', 'All notifications have been cancelled');
    }
  };

  const handleGarminLogin = async () => {
    try {
      // Using mock login for testing
      const success = await mockGarminLogin();
      if (success) {
        setGarminAuthenticated(true);
        loadGarminData();
        Alert.alert('Success', 'Connected to Garmin (Mock)');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to Garmin');
    }
  };

  const handleGarminLogout = async () => {
    Alert.alert('Disconnect Garmin', 'Are you sure you want to disconnect?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          await logoutGarmin();
          setGarminAuthenticated(false);
          setGarminData(null);
        },
      },
    ]);
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

        {/* Weather Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weather</Text>
          
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
          </View>
          
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
                <Text style={styles.cardLabel}>Status</Text>
                <Text style={styles.cardValue}>✓ Connected (Mock)</Text>
                
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
                        <Text style={styles.healthDataValue}>
                          🔥 {garminData.calories} cal
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
              <TouchableOpacity
                style={[commonStyles.buttonOutline, styles.dangerButton]}
                onPress={handleGarminLogout}
              >
                <Text style={styles.dangerButtonText}>Disconnect</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.cardText}>Not connected</Text>
                <Text style={styles.cardSubtext}>
                  Connect to view your health stats (Mock login for testing)
                </Text>
              </View>
              <TouchableOpacity
                style={commonStyles.button}
                onPress={handleGarminLogin}
              >
                <Text style={commonStyles.buttonText}>Connect Garmin (Mock)</Text>
              </TouchableOpacity>
            </>
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
                  Get notified at sunrise and sunset
                </Text>
              </View>
              <Switch
                value={!!notificationsEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: colors.greyLight, true: colors.green }}
                thumbColor={colors.white}
              />
            </View>
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
                  Tip: For best results, include state/country (e.g., "Rogers, Arkansas" or "Portland, Oregon")
                </Text>
              </View>
            </View>
            <TextInput
              style={commonStyles.input}
              placeholder="e.g., Rogers, Arkansas"
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
});

