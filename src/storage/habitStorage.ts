import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit, DailyLog, HabitEntry, HabitStats } from '../types';

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
    return habitsJson ? JSON.parse(habitsJson) : [];
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
    return logsJson ? JSON.parse(logsJson) : [];
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
  note?: string
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
    
    const totalDays = entries.length;
    const completedDays = entries.filter(e => e.completed).length;
    const completionRate = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
    
    // Calculate current streak
    let currentStreak = 0;
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].completed) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    for (const entry of entries) {
      if (entry.completed) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    
    const lastCompletedEntry = entries
      .reverse()
      .find(e => e.completed);
    
    return {
      habitId,
      totalDays,
      completedDays,
      completionRate,
      currentStreak,
      longestStreak,
      lastCompletedDate: lastCompletedEntry?.date,
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

