import axios from 'axios';
import Constants from 'expo-constants';
import { WeatherData, OneCallWeatherData, TemperatureUnit } from '../types';

// Note: One Call API 3.0 requires paid subscription
// Get API key from Expo Constants (set via environment variable)
const OPENWEATHER_API_KEY = Constants.expoConfig?.extra?.openWeatherApiKey || '';
const ONECALL_BASE_URL = 'https://api.openweathermap.org/data/3.0/onecall';

if (!OPENWEATHER_API_KEY) {
  console.warn('[WeatherService] OPENWEATHER_API_KEY is not set. Weather features will not work.');
}

/**
 * Fetch comprehensive weather data using One Call API 3.0
 * Includes current weather, forecasts (minutely, hourly, daily), and alerts
 */
export async function fetchOneCallWeather(
  latitude: number,
  longitude: number,
  temperatureUnit: TemperatureUnit = 'celsius',
  exclude?: string[] // Optional: exclude parts like 'minutely', 'hourly', 'daily', 'alerts'
): Promise<OneCallWeatherData | null> {
  try {
    const params: any = {
      lat: latitude,
      lon: longitude,
      appid: OPENWEATHER_API_KEY,
      units: temperatureUnit === 'fahrenheit' ? 'imperial' : 'metric',
    };

    // Add exclude parameter if provided
    if (exclude && exclude.length > 0) {
      params.exclude = exclude.join(',');
    }

    const response = await axios.get(ONECALL_BASE_URL, { params });
    
    return response.data as OneCallWeatherData;
  } catch (error) {
    console.error('Error fetching One Call weather:', error);
    return null;
  }
}

/**
 * Fetch current weather data for given coordinates
 * Legacy function - now uses One Call API 3.0 but returns simplified data
 */
export async function fetchWeatherByCoordinates(
  latitude: number,
  longitude: number
): Promise<WeatherData | null> {
  try {
    // Use One Call API excluding minutely, hourly, daily to reduce data transfer
    const oneCallData = await fetchOneCallWeather(latitude, longitude, 'celsius', ['minutely', 'hourly', 'daily']);
    
    if (!oneCallData) {
      return null;
    }

    const current = oneCallData.current;
    
    return {
      location: 'Current Location', // One Call API doesn't return location name
      temperature: Math.round(current.temp),
      condition: current.weather[0].main,
      description: current.weather[0].description,
      humidity: current.humidity,
      windSpeed: current.wind_speed,
      icon: current.weather[0].icon,
      date: new Date(current.dt * 1000).toISOString(),
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
}

/**
 * Fetch weather data by city name
 * Note: One Call API 3.0 requires lat/lon, so we use geocoding
 */
export async function fetchWeatherByCity(cityName: string): Promise<WeatherData | null> {
  try {
    // First geocode the city name to get coordinates
    const geoResponse = await axios.get('http://api.openweathermap.org/geo/1.0/direct', {
      params: {
        q: cityName,
        limit: 1,
        appid: OPENWEATHER_API_KEY,
      },
    });

    if (!geoResponse.data || geoResponse.data.length === 0) {
      console.error('City not found');
      return null;
    }

    const { lat, lon, name } = geoResponse.data[0];
    
    // Now fetch weather data
    const weatherData = await fetchWeatherByCoordinates(lat, lon);
    
    if (weatherData) {
      weatherData.location = name;
    }
    
    return weatherData;
  } catch (error) {
    console.error('Error fetching weather by city:', error);
    return null;
  }
}

/**
 * Get weather icon URL
 */
export function getWeatherIconUrl(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

/**
 * Get weather icon name based on condition
 * Returns an object with library and icon name for @expo/vector-icons
 */
export function getWeatherIcon(condition: string): { library: 'Ionicons' | 'MaterialIcons' | 'FontAwesome5'; name: string } {
  const iconMap: { [key: string]: { library: 'Ionicons' | 'MaterialIcons' | 'FontAwesome5'; name: string } } = {
    Clear: { library: 'Ionicons', name: 'sunny' },
    Clouds: { library: 'Ionicons', name: 'cloud' },
    Rain: { library: 'Ionicons', name: 'rainy' },
    Drizzle: { library: 'Ionicons', name: 'rainy-outline' },
    Thunderstorm: { library: 'Ionicons', name: 'thunderstorm' },
    Snow: { library: 'Ionicons', name: 'snow' },
    Mist: { library: 'MaterialIcons', name: 'foggy' },
    Fog: { library: 'MaterialIcons', name: 'foggy' },
    Haze: { library: 'MaterialIcons', name: 'foggy' },
  };
  
  return iconMap[condition] || { library: 'Ionicons', name: 'partly-sunny' };
}

/**
 * @deprecated Use getWeatherIcon instead
 * Kept for backward compatibility
 */
export function getWeatherEmoji(condition: string): string {
  // Return empty string since we're replacing with icons
  return '';
}

/**
 * Format Unix timestamp to time string (HH:MM)
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format Unix timestamp to date string
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get alert severity icon based on event type
 * Returns an object with library and icon name for @expo/vector-icons
 */
export function getAlertSeverityIcon(event: string): { library: 'Ionicons' | 'MaterialIcons' | 'FontAwesome5'; name: string } {
  const lowerEvent = event.toLowerCase();
  
  if (lowerEvent.includes('tornado') || lowerEvent.includes('hurricane')) {
    return { library: 'Ionicons', name: 'tornado' };
  }
  if (lowerEvent.includes('flood')) {
    return { library: 'Ionicons', name: 'water' };
  }
  if (lowerEvent.includes('fire')) {
    return { library: 'Ionicons', name: 'flame' };
  }
  if (lowerEvent.includes('heat')) {
    return { library: 'Ionicons', name: 'thermometer' };
  }
  if (lowerEvent.includes('cold') || lowerEvent.includes('freeze')) {
    return { library: 'Ionicons', name: 'snow' };
  }
  if (lowerEvent.includes('wind')) {
    return { library: 'Ionicons', name: 'wind' };
  }
  if (lowerEvent.includes('snow') || lowerEvent.includes('blizzard')) {
    return { library: 'Ionicons', name: 'snow' };
  }
  if (lowerEvent.includes('thunderstorm')) {
    return { library: 'Ionicons', name: 'thunderstorm' };
  }
  if (lowerEvent.includes('fog')) {
    return { library: 'MaterialIcons', name: 'foggy' };
  }
  
  return { library: 'Ionicons', name: 'warning' };
}

/**
 * @deprecated Use getAlertSeverityIcon instead
 * Kept for backward compatibility
 */
export function getAlertSeverityEmoji(event: string): string {
  // Return empty string since we're replacing with icons
  return '';
}

/**
 * Format temperature with appropriate unit symbol
 */
export function formatTemperature(temp: number, unit: TemperatureUnit): string {
  const symbol = unit === 'fahrenheit' ? '°F' : '°C';
  return `${Math.round(temp)}${symbol}`;
}

/**
 * Convert precipitation from mm to inches
 */
export function convertPrecipitation(mm: number, targetUnit: 'mm' | 'inches'): number {
  if (targetUnit === 'inches') {
    return mm / 25.4; // 1 inch = 25.4 mm
  }
  return mm;
}

/**
 * Format precipitation with appropriate unit
 */
export function formatPrecipitation(mm: number, unit: 'mm' | 'inches'): string {
  const value = convertPrecipitation(mm, unit);
  const formatted = unit === 'inches' 
    ? value.toFixed(2) 
    : Math.round(value).toString();
  return `${formatted} ${unit}`;
}

/**
 * Convert distance from kilometers to miles
 */
export function convertDistance(km: number, targetUnit: 'kilometers' | 'miles'): number {
  if (targetUnit === 'miles') {
    return km * 0.621371; // 1 km = 0.621371 miles
  }
  return km;
}

/**
 * Format distance with appropriate unit
 */
export function formatDistance(km: number, unit: 'kilometers' | 'miles'): string {
  const value = convertDistance(km, unit);
  const formatted = value.toFixed(2);
  const unitLabel = unit === 'miles' ? 'mi' : 'km';
  return `${formatted} ${unitLabel}`;
}

/**
 * Geocode a city name to coordinates using OpenWeatherMap Geocoding API
 * This works in Expo Go (unlike expo-location's geocodeAsync)
 */
export async function geocodeCityName(cityName: string): Promise<{
  latitude: number;
  longitude: number;
  displayName: string;
  state?: string;
  country?: string;
} | null> {
  try {
    console.log('[WeatherService] Geocoding city:', cityName);
    
    const response = await axios.get('http://api.openweathermap.org/geo/1.0/direct', {
      params: {
        q: cityName,
        limit: 1,
        appid: OPENWEATHER_API_KEY,
      },
    });

    console.log('[WeatherService] Geocode response:', response.data);

    if (!response.data || response.data.length === 0) {
      console.error('[WeatherService] City not found');
      return null;
    }

    const location = response.data[0];
    
    return {
      latitude: location.lat,
      longitude: location.lon,
      displayName: location.name,
      state: location.state,
      country: location.country,
    };
  } catch (error) {
    console.error('[WeatherService] Geocoding error:', error);
    return null;
  }
}

