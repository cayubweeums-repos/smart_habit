import { HabitType, HabitCategory, AutomaticHabitType } from '../types';

export interface PrebuiltHabit {
  name: string;
  type?: HabitType; // undefined = yes/no, 'quantity' = quantity type, 'automatic' = automatic
  automaticType?: AutomaticHabitType; // For automatic habits
  category: HabitCategory;
}

export const PREBUILT_HABITS: PrebuiltHabit[] = [
  // Morning Time
  { name: 'Morning Caffeine', type: 'quantity', category: 'morning' },
  { name: 'Awoke on time', type: undefined, category: 'morning' },
  
  // Health Related
  { name: 'Light Exercise', type: undefined, category: 'health' },
  { name: 'Moderate Exercise', type: undefined, category: 'health' },
  { name: 'Vigorous Exercise', type: undefined, category: 'health' },
  { name: 'Healthy Meals', type: 'quantity', category: 'health' },
  { name: 'Heavy Meals', type: 'quantity', category: 'health' },
  { name: 'Intermittent Fasting', type: undefined, category: 'health' },
  { name: 'Alcohol', type: undefined, category: 'health' },
  { name: 'Late Meals', type: 'quantity', category: 'health' },
  { name: 'Intimate Release', type: undefined, category: 'health' },
  { name: 'Step Target Hit', type: 'automatic', automaticType: 'stepTarget', category: 'health' },
  
  // Bed Time
  { name: 'In bed on time', type: undefined, category: 'bedtime' },
  { name: 'Shared Bed', type: undefined, category: 'bedtime' },
  { name: 'Animals in Bed', type: undefined, category: 'bedtime' },
  { name: 'Sleep Sounds', type: undefined, category: 'bedtime' },
  { name: 'Evening Caffeine', type: 'quantity', category: 'bedtime' },
];

export const CATEGORY_DISPLAY_NAMES: Record<HabitCategory, string> = {
  morning: 'Morning Time',
  health: 'Health Related',
  bedtime: 'Bed Time',
};

export const CATEGORY_ORDER: HabitCategory[] = ['morning', 'health', 'bedtime'];

