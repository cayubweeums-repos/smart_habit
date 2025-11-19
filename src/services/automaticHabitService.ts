import { Habit, AutomaticHabitType } from '../types';
import { fetchGarminHealthData } from './garminService';
import { updateHabitEntry } from '../storage';

/**
 * Check and update automatic habits for a specific date
 * This should be called at midnight or when the app is opened
 */
export async function checkAutomaticHabits(date: string, habits: Habit[]): Promise<void> {
  const automaticHabits = habits.filter(h => h.type === 'automatic' && h.automaticType);
  
  if (automaticHabits.length === 0) {
    return;
  }

  console.log(`[Automatic Habits] Checking ${automaticHabits.length} automatic habits for ${date}`);

  for (const habit of automaticHabits) {
    try {
      const completed = await evaluateAutomaticHabit(habit, date);
      
      if (completed !== null) {
        await updateHabitEntry(date, habit.id, completed);
        console.log(`[Automatic Habits] ${habit.name} marked as ${completed ? 'complete' : 'incomplete'} for ${date}`);
      }
    } catch (error) {
      console.error(`[Automatic Habits] Error evaluating ${habit.name}:`, error);
    }
  }
}

/**
 * Evaluate a single automatic habit
 * Returns true if completed, false if not completed, null if cannot be determined
 */
async function evaluateAutomaticHabit(habit: Habit, date: string): Promise<boolean | null> {
  if (!habit.automaticType) {
    return null;
  }

  switch (habit.automaticType) {
    case 'stepTarget':
      return await checkStepTarget(date);
    
    default:
      console.warn(`[Automatic Habits] Unknown automatic habit type: ${habit.automaticType}`);
      return null;
  }
}

/**
 * Check if step target was hit for the given date
 */
async function checkStepTarget(date: string): Promise<boolean | null> {
  try {
    const healthData = await fetchGarminHealthData(date);
    
    if (!healthData || healthData.steps === undefined) {
      console.log(`[Automatic Habits] No Garmin data available for ${date}`);
      return null;
    }

    // For now, use a default step goal of 10,000
    // In the future, we could fetch the user's actual Garmin step goal
    const stepGoal = 10000;
    const completed = healthData.steps >= stepGoal;
    
    console.log(`[Automatic Habits] Steps: ${healthData.steps}/${stepGoal} = ${completed ? 'Complete' : 'Incomplete'}`);
    
    return completed;
  } catch (error) {
    console.error('[Automatic Habits] Error checking step target:', error);
    return null;
  }
}

/**
 * Check if an automatic habit can be manually toggled
 * Automatic habits should not be manually togglable
 */
export function isAutomaticHabit(habit: Habit): boolean {
  return habit.type === 'automatic';
}

