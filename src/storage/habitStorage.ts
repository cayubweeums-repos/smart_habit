import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit, DailyLog, HabitEntry, HabitStats } from '../types';
import { parseDateKey } from '../utils';

const HABITS_KEY = '@habits';
const DAILY_LOGS_KEY = '@daily_logs';

// Habit Management
export const saveHabits = async (habits: Habit[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  } catch (error) {
    console.error('Error saving habits:', error);
    throw error;
  }
};

export const loadHabits = async (): Promise<Habit[]> => {
  try {
    const habitsJson = await AsyncStorage.getItem(HABITS_KEY);
    if (!habitsJson) {
      return [];
    }
    
    const habits = JSON.parse(habitsJson);
    
    // Normalize boolean values - ensure weatherDependent and archived are always booleans
    // This handles cases where they might have been stored as strings
    return habits.map((habit: any) => ({
      ...habit,
      archived: habit.archived === true || habit.archived === 'true',
      weatherDependent: habit.weatherDependent === true || habit.weatherDependent === 'true' ? true : undefined,
    }));
  } catch (error) {
    console.error('Error loading habits:', error);
    return [];
  }
};

export const addHabit = async (habit: Habit): Promise<void> => {
  try {
    const habits = await loadHabits();
    habits.push(habit);
    await saveHabits(habits);
  } catch (error) {
    console.error('Error adding habit:', error);
    throw error;
  }
};

export const updateHabit = async (habitId: string, updates: Partial<Habit>): Promise<void> => {
  try {
    const habits = await loadHabits();
    const index = habits.findIndex(h => h.id === habitId);
    if (index !== -1) {
      habits[index] = { ...habits[index], ...updates };
      await saveHabits(habits);
    }
  } catch (error) {
    console.error('Error updating habit:', error);
    throw error;
  }
};

export const deleteHabit = async (habitId: string): Promise<void> => {
  try {
    const habits = await loadHabits();
    const filteredHabits = habits.filter(h => h.id !== habitId);
    await saveHabits(filteredHabits);
  } catch (error) {
    console.error('Error deleting habit:', error);
    throw error;
  }
};

// Daily Log Management
export const saveDailyLogs = async (logs: DailyLog[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(DAILY_LOGS_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('Error saving daily logs:', error);
    throw error;
  }
};

export const loadDailyLogs = async (): Promise<DailyLog[]> => {
  try {
    const logsJson = await AsyncStorage.getItem(DAILY_LOGS_KEY);
    if (!logsJson) {
      return [];
    }
    
    const logs = JSON.parse(logsJson);
    
    // Normalize boolean values in entries - ensure completed is always a boolean
    // This handles cases where it might have been stored as a string
    return logs.map((log: any) => ({
      ...log,
      entries: log.entries?.map((entry: any) => {
        let completed = entry.completed;
        // Normalize to boolean: handle string 'true'/'false' or actual boolean
        if (completed === true || completed === 'true') {
          completed = true;
        } else if (completed === false || completed === 'false') {
          completed = false;
        } else {
          // For null, undefined, or other values, default to false
          completed = false;
        }
        return {
          ...entry,
          completed,
        };
      }) || [],
    }));
  } catch (error) {
    console.error('Error loading daily logs:', error);
    return [];
  }
};

export const getDailyLog = async (date: string): Promise<DailyLog | null> => {
  try {
    const logs = await loadDailyLogs();
    return logs.find(log => log.date === date) || null;
  } catch (error) {
    console.error('Error getting daily log:', error);
    return null;
  }
};

export const saveDailyLog = async (log: DailyLog): Promise<void> => {
  try {
    const logs = await loadDailyLogs();
    const existingIndex = logs.findIndex(l => l.date === log.date);
    
    if (existingIndex !== -1) {
      logs[existingIndex] = log;
    } else {
      logs.push(log);
    }
    
    await saveDailyLogs(logs);
  } catch (error) {
    console.error('Error saving daily log:', error);
    throw error;
  }
};

export const updateHabitEntry = async (
  date: string,
  habitId: string,
  completed: boolean,
  note?: string,
  quantity?: number
): Promise<void> => {
  try {
    const logs = await loadDailyLogs();
    let log = logs.find(l => l.date === date);
    
    if (!log) {
      log = {
        date,
        entries: [],
      };
      logs.push(log);
    }
    
    const entryIndex = log.entries.findIndex(e => e.habitId === habitId);
    const entry: HabitEntry = {
      habitId,
      date,
      completed,
      note,
      quantity,
    };
    
    if (entryIndex !== -1) {
      log.entries[entryIndex] = entry;
    } else {
      log.entries.push(entry);
    }
    
    await saveDailyLogs(logs);
  } catch (error) {
    console.error('Error updating habit entry:', error);
    throw error;
  }
};

// Statistics
export const calculateHabitStats = async (habitId: string): Promise<HabitStats> => {
  try {
    const logs = await loadDailyLogs();
    const entries = logs
      .flatMap(log => log.entries)
      .filter(entry => entry.habitId === habitId)
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // totalDays now represents days with any log entry (not just completed)
    const totalDays = entries.length;
    
    // Keep completedDays and completionRate for backward compatibility but they're not used
    const completedDays = entries.filter(e => e.completed).length;
    const completionRate = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
    
    // Calculate current streak - based on any entry (logged anything), not just completed
    // Streak counts consecutive days with any log entry, counting backwards from most recent entry
    let currentStreak = 0;
    
    // Get unique dates that have entries (sorted)
    const entryDates = Array.from(new Set(entries.map(e => e.date))).sort();
    
    if (entryDates.length > 0) {
      // Start from the most recent entry date and count backwards
      let checkDate = parseDateKey(entryDates[entryDates.length - 1]);
      const entryDatesSet = new Set(entryDates);
      
      // Count consecutive days backwards from most recent entry
      while (entryDatesSet.has(checkDate.toISOString().split('T')[0])) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }
    
    // Calculate longest streak - based on any entry (logged anything)
    // Find the longest sequence of consecutive days with entries
    let longestStreak = 0;
    
    if (entryDates.length > 0) {
      let tempStreak = 1;
      longestStreak = 1;
      
      for (let i = 1; i < entryDates.length; i++) {
        const prevDate = parseDateKey(entryDates[i - 1]);
        const currentDate = parseDateKey(entryDates[i]);
        const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          // Consecutive day
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          // Gap in logging, reset streak
          tempStreak = 1;
        }
      }
    }
    
    const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;
    
    return {
      habitId,
      totalDays,
      completedDays,
      completionRate,
      currentStreak,
      longestStreak,
      lastCompletedDate: lastEntry?.date,
    };
  } catch (error) {
    console.error('Error calculating habit stats:', error);
    return {
      habitId,
      totalDays: 0,
      completedDays: 0,
      completionRate: 0,
      currentStreak: 0,
      longestStreak: 0,
    };
  }
};

export const getHabitEntriesInRange = async (
  habitId: string,
  startDate: string,
  endDate: string
): Promise<HabitEntry[]> => {
  try {
    const logs = await loadDailyLogs();
    return logs
      .filter(log => log.date >= startDate && log.date <= endDate)
      .flatMap(log => log.entries)
      .filter(entry => entry.habitId === habitId)
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error getting habit entries in range:', error);
    return [];
  }
};

