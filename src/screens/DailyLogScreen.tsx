import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, borderRadius, fontSize, fontWeight, commonStyles } from '../theme';
import { Habit, HabitEntry } from '../types';
import { loadHabits, getDailyLog, updateHabitEntry } from '../storage';
import { getTodayKey, formatDisplayDate, getDayOfWeek } from '../utils';

export default function DailyLogScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<{ [habitId: string]: boolean | null }>({});
  const [todayKey] = useState(getTodayKey());

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const loadedHabits = await loadHabits();
    const activeHabits = loadedHabits.filter(h => !h.archived);
    setHabits(activeHabits);

    const todayLog = await getDailyLog(todayKey);
    const entriesMap: { [habitId: string]: boolean | null } = {};
    
    activeHabits.forEach(habit => {
      const entry = todayLog?.entries.find(e => e.habitId === habit.id);
      entriesMap[habit.id] = entry ? entry.completed : null;
    });
    
    setEntries(entriesMap);
  };

  const handleHabitToggle = async (habitId: string, completed: boolean) => {
    try {
      await updateHabitEntry(todayKey, habitId, completed);
      setEntries(prev => ({ ...prev, [habitId]: completed }));
    } catch (error) {
      console.error('Error updating habit entry:', error);
    }
  };

  const renderHabit = ({ item }: { item: Habit }) => {
    const status = entries[item.id];
    
    return (
      <View style={styles.habitRow}>
        <View style={[styles.habitColorBar, { backgroundColor: item.color }]} />
        <View style={styles.habitInfo}>
          <Text style={styles.habitName}>{item.name}</Text>
          {item.description ? (
            <Text style={styles.habitDescription}>{item.description}</Text>
          ) : null}
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.statusButton,
              status === true && styles.statusButtonCompleted,
            ]}
            onPress={() => handleHabitToggle(item.id, true)}
          >
            <Text
              style={[
                styles.statusButtonText,
                status === true && styles.statusButtonTextActive,
              ]}
            >
              ✓
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.statusButton,
              status === false && styles.statusButtonIncomplete,
            ]}
            onPress={() => handleHabitToggle(item.id, false)}
          >
            <Text
              style={[
                styles.statusButtonText,
                status === false && styles.statusButtonTextActive,
              ]}
            >
              ✗
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const completedCount = Object.values(entries).filter(e => e === true).length;
  const totalCount = habits.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <View style={commonStyles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View>
            <Text style={styles.dateText}>{formatDisplayDate(todayKey)}</Text>
            <Text style={styles.dayText}>{getDayOfWeek(todayKey)}</Text>
          </View>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{completedCount}/{totalCount}</Text>
            <Text style={styles.progressLabel}>Completed</Text>
          </View>
        </View>

        {totalCount > 0 && (
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${completionPercentage}%`,
                  backgroundColor: completionPercentage === 100 ? colors.green : colors.purpleLight,
                },
              ]}
            />
          </View>
        )}

        {habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No habits to log</Text>
            <Text style={styles.emptySubtext}>
              Go to the Habits tab to add your first habit
            </Text>
          </View>
        ) : (
          <View style={styles.habitsList}>
            <Text style={styles.sectionTitle}>Today's Habits</Text>
            <FlatList
              data={habits}
              renderItem={renderHabit}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {completionPercentage === 100 && totalCount > 0 && (
          <View style={styles.celebrationCard}>
            <Text style={styles.celebrationEmoji}>🎉</Text>
            <Text style={styles.celebrationText}>
              Great job! You've completed all habits for today!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  dayText: {
    color: colors.greyVeryLight,
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
  progressContainer: {
    alignItems: 'flex-end',
  },
  progressText: {
    color: colors.greenLight,
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  progressLabel: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.greyLight,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  habitsList: {
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
  habitRow: {
    backgroundColor: colors.grey,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  habitColorBar: {
    width: 4,
    height: 50,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  habitDescription: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusButton: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    backgroundColor: colors.greyLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statusButtonCompleted: {
    backgroundColor: colors.green,
    borderColor: colors.greenLight,
  },
  statusButtonIncomplete: {
    backgroundColor: colors.error,
    borderColor: '#f87171',
  },
  statusButtonText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.greyMedium,
  },
  statusButtonTextActive: {
    color: colors.white,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xxl,
  },
  emptyText: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    color: colors.greyVeryLight,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  celebrationCard: {
    backgroundColor: colors.green,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    margin: spacing.lg,
    alignItems: 'center',
  },
  celebrationEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  celebrationText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
});

