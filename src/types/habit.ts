export type HabitType = 'quantity';

// OpenWeather API main weather condition types
export type WeatherConditionType = 
  | 'Clear'
  | 'Clouds'
  | 'Rain'
  | 'Drizzle'
  | 'Thunderstorm'
  | 'Snow'
  | 'Mist'
  | 'Fog'
  | 'Haze';

export interface Habit {
  id: string;
  name: string;
  type?: HabitType; // undefined for legacy habits (defaults to simple yes/no)
  createdAt: string; // ISO date string
  archived: boolean;
  weatherDependent?: boolean; // If true, habit requires specific weather conditions
  requiredWeatherTypes?: WeatherConditionType[]; // Weather conditions needed for this habit
  backupHabitName?: string; // Name of backup habit to show when weather doesn't match (optional - if not provided, habit is skipped)
}

export interface HabitEntry {
  habitId: string;
  date: string; // YYYY-MM-DD format
  completed: boolean; // true for checkmark, false for X
  quantity?: number; // for quantity-type habits
  note?: string;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD format
  entries: HabitEntry[];
  sunrise?: string; // ISO date string
  sunset?: string; // ISO date string
  weatherCondition?: string;
  temperature?: number;
}

export interface HabitStats {
  habitId: string;
  totalDays: number;
  completedDays: number;
  completionRate: number; // percentage 0-100
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate?: string;
}

