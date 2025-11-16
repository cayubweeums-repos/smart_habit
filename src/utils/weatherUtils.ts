import { WeatherConditionType } from '../types/habit';
import { WeatherData } from '../types/weather';

/**
 * Check if current weather matches any of the required weather types
 */
export function weatherMatches(
  currentWeather: WeatherData | null,
  requiredWeatherTypes: WeatherConditionType[]
): boolean {
  if (!currentWeather || !requiredWeatherTypes || requiredWeatherTypes.length === 0) {
    return false;
  }

  // Check if current weather condition matches any required type
  return requiredWeatherTypes.includes(currentWeather.condition as WeatherConditionType);
}

/**
 * Get display name for weather condition type
 */
export function getWeatherTypeDisplayName(type: WeatherConditionType): string {
  const displayNames: Record<WeatherConditionType, string> = {
    Clear: 'Clear',
    Clouds: 'Cloudy',
    Rain: 'Rain',
    Drizzle: 'Drizzle',
    Thunderstorm: 'Thunderstorm',
    Snow: 'Snow',
    Mist: 'Mist',
    Fog: 'Fog',
    Haze: 'Haze',
  };
  return displayNames[type] || type;
}

/**
 * Get all available weather condition types
 */
export function getAllWeatherTypes(): WeatherConditionType[] {
  return [
    'Clear',
    'Clouds',
    'Rain',
    'Drizzle',
    'Thunderstorm',
    'Snow',
    'Mist',
    'Fog',
    'Haze',
  ];
}

