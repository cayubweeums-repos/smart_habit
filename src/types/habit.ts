export interface Habit {
  id: string;
  name: string;
  description?: string;
  color: string; // hex color for visualization
  createdAt: string; // ISO date string
  archived: boolean;
}

export interface HabitEntry {
  habitId: string;
  date: string; // YYYY-MM-DD format
  completed: boolean; // true for checkmark, false for X
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

