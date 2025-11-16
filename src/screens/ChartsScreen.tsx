import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing, borderRadius, fontSize, fontWeight, commonStyles } from '../theme';
import { Habit, HabitStats } from '../types';
import { loadHabits, calculateHabitStats, getHabitEntriesInRange } from '../storage';
import { getLastNDaysRange, formatShortDate, parseDateKey } from '../utils';

const screenWidth = Dimensions.get('window').width;

export default function ChartsScreen() {
  const insets = useSafeAreaInsets();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedHabitIds, setSelectedHabitIds] = useState<string[]>([]);
  const [allStats, setAllStats] = useState<{ [habitId: string]: HabitStats }>({});
  const [chartData, setChartData] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<number>(30); // days
  const [selectionModalVisible, setSelectionModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const loadedHabits = await loadHabits();
    const activeHabits = loadedHabits.filter(h => !h.archived);
    setHabits(activeHabits);
    
    // Select all habits by default
    const allHabitIds = activeHabits.map(h => h.id);
    setSelectedHabitIds(allHabitIds);
    
    // Load stats for all habits
    const statsMap: { [habitId: string]: HabitStats } = {};
    for (const habit of activeHabits) {
      const stats = await calculateHabitStats(habit.id);
      statsMap[habit.id] = stats;
    }
    setAllStats(statsMap);
    
    // Generate chart data for all habits
    await generateChartData(activeHabits, allHabitIds, timeRange);
  };

  const generateChartData = async (
    habitsToShow: Habit[],
    habitIdsToShow: string[],
    days: number
  ) => {
    if (habitIdsToShow.length === 0) {
      setChartData(null);
      return;
    }

    const { startDate, endDate } = getLastNDaysRange(days);
    
    // Get entries for all selected habits
    const allEntriesMap: { [habitId: string]: any[] } = {};
    for (const habitId of habitIdsToShow) {
      const entries = await getHabitEntriesInRange(habitId, startDate, endDate);
      allEntriesMap[habitId] = entries;
    }
    
    // Create date labels and calculate completion percentages in a single loop
    const dates: string[] = [];
    const completionPercentages: number[] = [];
    let currentDate = parseDateKey(startDate);
    const end = parseDateKey(endDate);
    
    while (currentDate <= end) {
      const dateKey = currentDate.toISOString().split('T')[0];
      
      // Add date label
      dates.push(formatShortDate(dateKey));
      
      // Count how many habits were completed on this day
      let completedCount = 0;
      for (const habitId of habitIdsToShow) {
        const entries = allEntriesMap[habitId];
        const entry = entries.find(e => e.date === dateKey);
        if (entry?.completed) {
          completedCount++;
        }
      }
      
      // Calculate percentage (0 to 100)
      const percentage = habitIdsToShow.length > 0 
        ? (completedCount / habitIdsToShow.length) * 100
        : 0;
      completionPercentages.push(percentage);
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    setChartData({
      labels: dates.filter((_, i) => i % Math.ceil(days / 7) === 0), // Show ~7 labels
      datasets: [{
        data: completionPercentages,
        color: (opacity = 1) => colors.greenLight,
        strokeWidth: 2,
      }],
    });
  };

  const changeTimeRange = (days: number) => {
    setTimeRange(days);
    generateChartData(habits, selectedHabitIds, days);
  };

  const toggleHabitSelection = (habitId: string) => {
    setSelectedHabitIds(prev => {
      const newSelection = prev.includes(habitId)
        ? prev.filter(id => id !== habitId)
        : [...prev, habitId];
      
      // Update chart immediately
      generateChartData(habits, newSelection, timeRange);
      return newSelection;
    });
  };

  const selectAllHabits = () => {
    const allIds = habits.map(h => h.id);
    setSelectedHabitIds(allIds);
    generateChartData(habits, allIds, timeRange);
  };

  const deselectAllHabits = () => {
    setSelectedHabitIds([]);
    generateChartData(habits, [], timeRange);
  };

  return (
    <View style={[commonStyles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.md }}
      >
        <View style={styles.header}>
          <Text style={commonStyles.title}>Progress</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setSelectionModalVisible(true)}
          >
            <Text style={styles.selectButtonText}>Select Habits</Text>
          </TouchableOpacity>
        </View>

        {habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No data yet</Text>
            <Text style={styles.emptySubtext}>
              Start tracking habits to see your progress
            </Text>
          </View>
        ) : (
          <>
            {/* Time Range Selector */}
            <View style={styles.timeRangeSelector}>
              {[7, 30, 90].map(days => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.timeRangeButton,
                    timeRange === days && styles.timeRangeButtonSelected,
                  ]}
                  onPress={() => changeTimeRange(days)}
                >
                  <Text
                    style={[
                      styles.timeRangeText,
                      timeRange === days && styles.timeRangeTextSelected,
                    ]}
                  >
                    {days}D
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Chart */}
            {chartData && chartData.datasets && chartData.datasets[0] && chartData.datasets[0].data.length > 0 && (
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Completion Trend</Text>
                <LineChart
                  data={chartData}
                  width={screenWidth - spacing.lg * 2}
                  height={220}
                  chartConfig={{
                    backgroundColor: colors.grey,
                    backgroundGradientFrom: colors.grey,
                    backgroundGradientTo: colors.grey,
                    decimalPlaces: 0,
                    color: (opacity = 1) => colors.greenLight,
                    labelColor: (opacity = 1) => colors.greyVeryLight,
                    style: {
                      borderRadius: borderRadius.lg,
                    },
                    propsForDots: {
                      r: '3',
                      strokeWidth: '2',
                    },
                    formatYLabel: (value) => {
                      // Format y-axis labels as percentages
                      // Data is already in percentage format (0-100), just add the % sign
                      const numValue = typeof value === 'string' ? parseFloat(value) : value;
                      if (isNaN(numValue) || numValue < 0) return '0%';
                      // Round to nearest integer for cleaner labels
                      return `${Math.round(numValue)}%`;
                    },
                  }}
                  bezier
                  style={styles.chart}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                  segments={4}
                  yAxisLabel=""
                  yAxisSuffix=""
                  fromZero={true}
                />
              </View>
            )}

            {/* Individual Habit Stats */}
            {selectedHabitIds.length > 0 && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Habit Statistics</Text>
                {habits
                  .filter(h => selectedHabitIds.includes(h.id))
                  .map(habit => {
                    const stats = allStats[habit.id];
                    if (!stats) return null;
                    
                    return (
                      <View key={habit.id} style={styles.habitStatSection}>
                        <View style={styles.habitStatHeader}>
                          <Text style={styles.habitStatName}>{habit.name}</Text>
                        </View>
                        <View style={styles.habitStatGrid}>
                          <View style={styles.habitStatItem}>
                            <Text style={styles.habitStatValue}>
                              {stats.currentStreak}
                            </Text>
                            <Text style={styles.habitStatLabel}>Current Streak</Text>
                          </View>
                          <View style={styles.habitStatItem}>
                            <Text style={styles.habitStatValue}>
                              {stats.longestStreak}
                            </Text>
                            <Text style={styles.habitStatLabel}>Longest Streak</Text>
                          </View>
                          <View style={styles.habitStatItem}>
                            <Text style={styles.habitStatValue}>
                              {stats.completionRate.toFixed(0)}%
                            </Text>
                            <Text style={styles.habitStatLabel}>Completion</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Selection Modal */}
      <Modal
        visible={!!selectionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Habits</Text>
              <TouchableOpacity onPress={() => setSelectionModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.selectAllRow}>
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={selectAllHabits}
              >
                <Text style={styles.selectAllText}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={deselectAllHabits}
              >
                <Text style={styles.selectAllText}>Deselect All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.habitCheckboxList}>
              {habits.map(habit => (
                <TouchableOpacity
                  key={habit.id}
                  style={styles.checkboxRow}
                  onPress={() => toggleHabitSelection(habit.id)}
                >
                  <View style={styles.checkbox}>
                    {selectedHabitIds.includes(habit.id) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.habitCheckboxName}>{habit.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  selectButton: {
    backgroundColor: colors.purpleLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  selectButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  timeRangeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.grey,
  },
  timeRangeButtonSelected: {
    backgroundColor: colors.purpleLight,
  },
  timeRangeText: {
    color: colors.greyVeryLight,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  timeRangeTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  // Removed statsContainer - using habitStatSection instead
  chartContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  chartTitle: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  chart: {
    borderRadius: borderRadius.lg,
  },
  summaryCard: {
    backgroundColor: colors.grey,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    margin: spacing.lg,
  },
  summaryTitle: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
  },
  summaryLabel: {
    color: colors.greyVeryLight,
    fontSize: fontSize.md,
  },
  summaryValue: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
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
  // Habit stat styles
  habitStatSection: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
  },
  habitStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  habitStatName: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  habitStatGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  habitStatItem: {
    alignItems: 'center',
  },
  habitStatValue: {
    color: colors.greenLight,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  habitStatLabel: {
    color: colors.greyVeryLight,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.grey,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  closeButton: {
    color: colors.white,
    fontSize: fontSize.xxl,
    padding: spacing.sm,
  },
  selectAllRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  selectAllButton: {
    flex: 1,
    backgroundColor: colors.greyLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  selectAllText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  habitCheckboxList: {
    maxHeight: 400,
    marginBottom: spacing.lg,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.greyVeryLight,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: colors.greenLight,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  habitCheckboxName: {
    flex: 1,
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
});

