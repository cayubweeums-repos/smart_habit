// Legacy interface - kept for backwards compatibility
export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  date: string;
}

export interface LocationSettings {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type PrecipitationUnit = 'mm' | 'inches';
export type DistanceUnit = 'kilometers' | 'miles';
export type WeightUnit = 'kg' | 'lbs';

export interface WeatherUnits {
  temperature: TemperatureUnit;
  precipitation: PrecipitationUnit;
  distance: DistanceUnit;
  weight: WeightUnit;
}

// One Call API 3.0 Types

export interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface CurrentWeather {
  dt: number; // Unix timestamp
  sunrise: number; // Unix timestamp
  sunset: number; // Unix timestamp
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  dew_point: number;
  uvi: number;
  clouds: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  wind_gust?: number;
  weather: WeatherCondition[];
  rain?: {
    '1h': number;
  };
  snow?: {
    '1h': number;
  };
}

export interface MinutelyForecast {
  dt: number; // Unix timestamp
  precipitation: number; // mm/h
}

export interface HourlyForecast {
  dt: number; // Unix timestamp
  temp: number;
  feels_like: number;
  pressure: number;
  humidity: number;
  dew_point: number;
  uvi: number;
  clouds: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  wind_gust?: number;
  weather: WeatherCondition[];
  pop: number; // Probability of precipitation (0-1)
  rain?: {
    '1h': number;
  };
  snow?: {
    '1h': number;
  };
}

export interface DailyTemp {
  day: number;
  min: number;
  max: number;
  night: number;
  eve: number;
  morn: number;
}

export interface DailyFeelsLike {
  day: number;
  night: number;
  eve: number;
  morn: number;
}

export interface DailyForecast {
  dt: number; // Unix timestamp
  sunrise: number; // Unix timestamp
  sunset: number; // Unix timestamp
  moonrise: number; // Unix timestamp
  moonset: number; // Unix timestamp
  moon_phase: number; // 0-1
  summary?: string; // Human-readable summary
  temp: DailyTemp;
  feels_like: DailyFeelsLike;
  pressure: number;
  humidity: number;
  dew_point: number;
  wind_speed: number;
  wind_deg: number;
  wind_gust?: number;
  weather: WeatherCondition[];
  clouds: number;
  pop: number; // Probability of precipitation (0-1)
  rain?: number; // mm
  snow?: number; // mm
  uvi: number;
}

export interface WeatherAlert {
  sender_name: string;
  event: string;
  start: number; // Unix timestamp
  end: number; // Unix timestamp
  description: string;
  tags?: string[];
}

export interface OneCallWeatherData {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  current: CurrentWeather;
  minutely?: MinutelyForecast[]; // 60 entries
  hourly?: HourlyForecast[]; // 48 entries
  daily?: DailyForecast[]; // 8 entries
  alerts?: WeatherAlert[];
}

