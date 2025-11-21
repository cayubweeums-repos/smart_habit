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
import { LineChart, BarChart } from 'react-native-chart-kit';
import { colors, spacing, borderRadius, fontSize, fontWeight, commonStyles } from '../theme';
import { Habit, HabitStats } from '../types';
import { loadHabits, calculateHabitStats, getHabitEntriesInRange, getGarminHealthDataInRange, loadDailyLogs } from '../storage';
import { getLastNDaysRange, formatShortDate, parseDateKey } from '../utils';

const screenWidth = Dimensions.get('window').width;

type ComparisonItemType = 'habit' | 'garmin';
type GarminMetric = 'steps' | 'sleep' | 'heartRate' | 'calories' | 'activeMinutes' | 'weight';

interface ComparisonItem {
  id: string;
  type: ComparisonItemType;
  name: string;
  habitId?: string; // For habit items
  garminMetric?: GarminMetric; // For Garmin items
  color: string;
}

const COMPARISON_COLORS = [
  colors.greenLight,
  colors.purpleLight,
  '#FFA500', // Orange
  '#00CED1', // Dark Turquoise
];

const GARMIN_METRIC_NAMES: { [key in GarminMetric]: string } = {
  steps: 'Steps',
  sleep: 'Sleep Duration',
  heartRate: 'Heart Rate',
  calories: 'Calories',
  activeMinutes: 'Active Minutes',
  weight: 'Weight',
};

export default function ChartsScreen() {
  const insets = useSafeAreaInsets();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedHabitIds, setSelectedHabitIds] = useState<string[]>([]);
  const [allStats, setAllStats] = useState<{ [habitId: string]: HabitStats }>({});
  const [chartData, setChartData] = useState<any>(null);
  const [weeklyActivityData, setWeeklyActivityData] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<number>(7); // days - changed from 30 to 7
  const [selectionModalVisible, setSelectionModalVisible] = useState(false);
  const [comparisonItems, setComparisonItems] = useState<ComparisonItem[]>([]);
  const [comparisonChartData, setComparisonChartData] = useState<any>(null);
  const [comparisonChartMetadata, setComparisonChartMetadata] = useState<Array<{
    item: ComparisonItem;
    min: number;
    max: number;
    unit?: string;
  }>>([]);
  const [comparisonModalVisible, setComparisonModalVisible] = useState(false);

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
    
    // Generate weekly activity chart
    await generateWeeklyActivityChart();
  };

  const generateWeeklyActivityChart = async () => {
    try {
      const logs = await loadDailyLogs();
      
      // Get all unique dates that have any log entry
      const loggedDates = new Set<string>();
      logs.forEach(log => {
        if (log.entries && log.entries.length > 0) {
          loggedDates.add(log.date);
        }
      });
      
      if (loggedDates.size === 0) {
        setWeeklyActivityData(null);
        return;
      }
      
      // Group dates by week (starting from Monday)
      const weeksMap: { [weekKey: string]: number } = {};
      
      loggedDates.forEach(dateStr => {
        const date = parseDateKey(dateStr);
        // Get Monday of the week (ISO week starts on Monday)
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
        const monday = new Date(date);
        monday.setDate(diff);
        monday.setHours(0, 0, 0, 0);
        
        const weekKey = monday.toISOString().split('T')[0];
        
        if (!weeksMap[weekKey]) {
          weeksMap[weekKey] = 0;
        }
        weeksMap[weekKey]++;
      });
      
      // Sort weeks chronologically
      const sortedWeeks = Object.keys(weeksMap).sort();
      
      // Get last 12 weeks (or all if less than 12)
      const recentWeeks = sortedWeeks.slice(-12);
      
      // Format week labels (e.g., "Jan 1" for the Monday of that week)
      const labels = recentWeeks.map(weekKey => {
        const weekStart = parseDateKey(weekKey);
        return formatShortDate(weekStart);
      });
      
      // Get days logged per week
      const data = recentWeeks.map(weekKey => weeksMap[weekKey]);
      
      setWeeklyActivityData({
        labels: labels.length > 0 ? labels : ['No data'],
        datasets: [{
          data: data.length > 0 ? data : [0],
        }],
      });
    } catch (error) {
      console.error('Error generating weekly activity chart:', error);
      setWeeklyActivityData(null);
    }
  };

  const generateChartData = async (
    habitsToShow: Habit[],
    habitIdsToShow: string[],
    days: number
  ) => {
    // Chart data generation removed - we no longer track completion trends
    setChartData(null);
  };

  const changeTimeRange = (days: number) => {
    setTimeRange(days);
    generateChartData(habits, selectedHabitIds, days);
    if (comparisonItems.length > 0) {
      generateComparisonChartData(comparisonItems, days);
    }
    // Weekly activity chart is independent of time range
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

  const generateComparisonChartData = async (
    items: ComparisonItem[],
    days: number
  ) => {
    if (items.length === 0) {
      setComparisonChartData(null);
      setComparisonChartMetadata([]);
      return;
    }

    const { startDate, endDate } = getLastNDaysRange(days);
    
    // Get all date keys in range
    const dates: string[] = [];
    let currentDate = parseDateKey(startDate);
    const end = parseDateKey(endDate);
    
    while (currentDate <= end) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dates.push(dateKey);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Load habit entries for habit items
    const habitEntriesMap: { [habitId: string]: { [date: string]: any } } = {};
    for (const item of items) {
      if (item.type === 'habit' && item.habitId) {
        const entries = await getHabitEntriesInRange(item.habitId, startDate, endDate);
        const entriesByDate: { [date: string]: any } = {};
        for (const entry of entries) {
          entriesByDate[entry.date] = entry;
        }
        habitEntriesMap[item.habitId] = entriesByDate;
      }
    }

    // Load Garmin data
    const garminDataList = await getGarminHealthDataInRange(startDate, endDate);
    const garminDataMap: { [date: string]: any } = {};
    for (const data of garminDataList) {
      garminDataMap[data.date] = data;
    }

    // Build raw data for each item and calculate min/max
    const rawDataMap: { [itemId: string]: number[] } = {};
    const metadata: Array<{
      item: ComparisonItem;
      min: number;
      max: number;
      unit?: string;
    }> = [];

    for (const item of items) {
      const rawData: number[] = [];
      
      for (const dateKey of dates) {
        let value: number | null = null;

        if (item.type === 'habit' && item.habitId) {
          const entry = habitEntriesMap[item.habitId]?.[dateKey];
          if (entry) {
            const habit = habits.find(h => h.id === item.habitId);
            if (habit?.type === 'quantity' && entry.quantity !== undefined) {
              // Quantity habit - use the quantity value
              value = entry.quantity;
            } else {
              // Yes/No habit - use 1 for completed, 0 for not completed
              value = entry.completed ? 1 : 0;
            }
          } else {
            // No entry means not completed
            value = 0;
          }
        } else if (item.type === 'garmin' && item.garminMetric) {
          const garminData = garminDataMap[dateKey];
          if (garminData) {
            if (item.garminMetric === 'sleep') {
              value = garminData.sleep?.duration ?? null;
            } else if (item.garminMetric === 'steps') {
              value = garminData.steps ?? null;
            } else if (item.garminMetric === 'heartRate') {
              value = garminData.heartRate ?? null;
            } else if (item.garminMetric === 'calories') {
              value = garminData.calories ?? null;
            } else if (item.garminMetric === 'activeMinutes') {
              value = garminData.activeMinutes ?? null;
            } else if (item.garminMetric === 'weight') {
              value = garminData.weight ?? null;
            }
          }
        }

        // Only push non-null values for min/max calculation
        if (value !== null) {
          rawData.push(value);
        } else {
          rawData.push(0); // Use 0 for missing data points
        }
      }

      rawDataMap[item.id] = rawData;

      // Calculate min/max (excluding null/0 values that represent missing data)
      const validValues = rawData.filter(v => v !== null && v !== undefined && !isNaN(v));
      let min = 0;
      let max = 100;
      let unit: string | undefined;

      if (validValues.length > 0) {
        min = Math.min(...validValues);
        max = Math.max(...validValues);
        
        // For yes/no habits, keep 0-1 range
        if (item.type === 'habit' && item.habitId) {
          const habit = habits.find(h => h.id === item.habitId);
          if (habit?.type !== 'quantity') {
            min = 0;
            max = 1;
          }
        }

        // Set units for Garmin metrics
        if (item.type === 'garmin') {
          if (item.garminMetric === 'sleep') {
            unit = 'min';
          } else if (item.garminMetric === 'steps') {
            unit = 'steps';
          } else if (item.garminMetric === 'heartRate') {
            unit = 'bpm';
          } else if (item.garminMetric === 'calories') {
            unit = 'cal';
          } else if (item.garminMetric === 'activeMinutes') {
            unit = 'min';
          } else if (item.garminMetric === 'weight') {
            unit = 'kg';
          }
        } else if (item.type === 'habit' && item.habitId) {
          const habit = habits.find(h => h.id === item.habitId);
          if (habit?.type === 'quantity') {
            unit = 'units';
          }
        }
      }

      // If min === max, add some padding to avoid division by zero
      if (min === max) {
        if (max === 0) {
          max = 1; // Default range for all zeros
        } else {
          min = Math.max(0, max - 1);
          max = max + 1;
        }
      }

      metadata.push({
        item,
        min,
        max,
        unit,
      });
    }

    // Normalize each dataset to 0-100 scale independently
    // Add slight visual offset for overlapping points (max 2% offset per dataset)
    const datasets = items.map((item, datasetIndex) => {
      const rawData = rawDataMap[item.id];
      const meta = metadata.find(m => m.item.id === item.id);
      
      if (!meta) {
        return {
          data: rawData.map(() => 0),
          color: (opacity = 1) => item.color,
          strokeWidth: 2,
          withDots: true,
        };
      }

      const { min, max } = meta;
      const range = max - min;

      // Calculate a small visual offset for this dataset to help distinguish overlapping points
      // Offset ranges from -2 to +2, distributed across datasets
      const maxOffset = 2;
      const offsetStep = items.length > 1 ? (maxOffset * 2) / (items.length - 1) : 0;
      const visualOffset = items.length > 1 
        ? -maxOffset + (datasetIndex * offsetStep)
        : 0;

      // Normalize to 0-100 scale
      const normalizedData = rawData.map((value) => {
        if (value === null || value === undefined || isNaN(value)) {
          return 0;
        }
        // For yes/no habits, keep as 0 or 100 (not normalized)
        if (item.type === 'habit' && item.habitId) {
          const habit = habits.find(h => h.id === item.habitId);
          if (habit?.type !== 'quantity') {
            const baseValue = value === 1 ? 100 : 0;
            // Add small offset only if there are multiple datasets
            return items.length > 1 ? Math.max(0, Math.min(100, baseValue + visualOffset)) : baseValue;
          }
        }
        
        if (range === 0) {
          const baseValue = 50; // Middle value if no range
          return items.length > 1 ? Math.max(0, Math.min(100, baseValue + visualOffset)) : baseValue;
        }
        
        // Normalize: (value - min) / range * 100
        const normalized = ((value - min) / range) * 100;
        const clamped = Math.max(0, Math.min(100, normalized));
        
        // Add small visual offset to help distinguish overlapping points
        // Only apply offset if there are multiple datasets
        if (items.length > 1) {
          return Math.max(0, Math.min(100, clamped + visualOffset));
        }
        return clamped;
      });

      return {
        data: normalizedData,
        color: (opacity = 1) => item.color,
        strokeWidth: 2,
        withDots: true,
      };
    });

    // Create labels (show ~7 labels)
    const labelStep = Math.ceil(days / 7);
    const labels = dates
      .map((dateKey, index) => (index % labelStep === 0 ? formatShortDate(dateKey) : ''))
      .filter(label => label !== '');

    setComparisonChartData({
      labels,
      datasets,
    });
    setComparisonChartMetadata(metadata);
  };

  const addComparisonItem = (item: ComparisonItem) => {
    if (comparisonItems.length >= 4) {
      return; // Max 4 items
    }
    const newItems = [...comparisonItems, item];
    setComparisonItems(newItems);
    generateComparisonChartData(newItems, timeRange);
  };

  const removeComparisonItem = (itemId: string) => {
    const newItems = comparisonItems.filter(item => item.id !== itemId);
    setComparisonItems(newItems);
    generateComparisonChartData(newItems, timeRange);
  };

  const clearComparisonItems = () => {
    setComparisonItems([]);
    setComparisonChartData(null);
    setComparisonChartMetadata([]);
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
            {/* Weekly Activity Chart */}
            {weeklyActivityData && weeklyActivityData.datasets && weeklyActivityData.datasets[0] && weeklyActivityData.datasets[0].data.length > 0 && (
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Weekly Activity</Text>
                <Text style={styles.chartSubtitle}>Days you logged something each week</Text>
                <BarChart
                  data={weeklyActivityData}
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
                    barPercentage: 0.7,
                    formatYLabel: (value) => {
                      const numValue = typeof value === 'string' ? parseFloat(value) : value;
                      if (isNaN(numValue)) return '0';
                      return Math.round(numValue).toString();
                    },
                  }}
                  style={styles.chart}
                  withVerticalLabels={true}
                  withHorizontalLabels={true}
                  segments={4}
                  yAxisLabel=""
                  yAxisSuffix=""
                  fromZero={true}
                  showValuesOnTopOfBars={true}
                />
              </View>
            )}

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

            {/* Comparison Chart */}
            <View style={styles.chartContainer}>
              <View style={styles.comparisonHeader}>
                <Text style={styles.chartTitle}>Compare Items</Text>
                <TouchableOpacity
                  style={styles.addComparisonButton}
                  onPress={() => setComparisonModalVisible(true)}
                >
                  <Text style={styles.addComparisonButtonText}>
                    {comparisonItems.length === 0 ? 'Add Items' : 'Edit'}
                  </Text>
                </TouchableOpacity>
              </View>

              {comparisonItems.length > 0 && (
                <>
                  {/* Legend */}
                  <View style={styles.legendContainer}>
                    {comparisonChartMetadata.map((meta) => {
                      const formatRange = (): string => {
                        if (meta.item.type === 'habit' && meta.item.habitId) {
                          const habit = habits.find(h => h.id === meta.item.habitId);
                          if (habit?.type !== 'quantity') {
                            // Yes/No habit
                            return 'Yes/No';
                          }
                        }
                        
                        // Format range based on values
                        const isInteger = meta.min % 1 === 0 && meta.max % 1 === 0;
                        
                        if (meta.min === meta.max) {
                          // Single value
                          if (isInteger) {
                            return `${Math.round(meta.min)}`;
                          } else if (meta.max < 1) {
                            return `${meta.max.toFixed(2)}`;
                          } else if (meta.max < 10) {
                            return `${meta.max.toFixed(1)}`;
                          } else {
                            return `${Math.round(meta.max)}`;
                          }
                        }
                        
                        // Range
                        if (isInteger) {
                          return `${Math.round(meta.min)}-${Math.round(meta.max)}`;
                        } else if (meta.max < 1) {
                          return `${meta.min.toFixed(2)}-${meta.max.toFixed(2)}`;
                        } else if (meta.max < 10) {
                          return `${meta.min.toFixed(1)}-${meta.max.toFixed(1)}`;
                        } else {
                          return `${Math.round(meta.min)}-${Math.round(meta.max)}`;
                        }
                      };

                      const rangeText = formatRange();
                      const unitText = meta.unit ? ` ${meta.unit}` : '';

                      return (
                        <View key={meta.item.id} style={styles.legendItem}>
                          <View style={styles.legendRow}>
                            <View style={[styles.legendColorIndicator, { backgroundColor: meta.item.color }]} />
                            <View style={styles.legendTextContainer}>
                              <Text style={styles.legendName}>{meta.item.name}</Text>
                              <Text style={styles.legendRange}>
                                {rangeText}{unitText}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => removeComparisonItem(meta.item.id)}
                              style={styles.legendRemoveButton}
                            >
                              <Text style={styles.legendRemoveText}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                    {comparisonItems.length < 4 && (
                      <TouchableOpacity
                        style={styles.legendAddButton}
                        onPress={() => setComparisonModalVisible(true)}
                      >
                        <Text style={styles.legendAddText}>+ Add Item</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Comparison Chart */}
                  {comparisonChartData && comparisonChartData.datasets && comparisonChartData.datasets.length > 0 && (
                    <LineChart
                      data={comparisonChartData}
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
                          // Y-axis shows normalized 0-100 scale
                          const numValue = typeof value === 'string' ? parseFloat(value) : value;
                          if (isNaN(numValue)) return '0';
                          return Math.round(numValue).toString();
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
                      withDots={true}
                      withShadow={false}
                    />
                  )}

                  {/* Chart Note */}
                  <Text style={styles.chartNote}>
                    Values normalized to 0-100 scale for comparison. See legend for actual ranges.
                  </Text>
                </>
              )}

              {comparisonItems.length === 0 && (
                <View style={styles.emptyComparisonState}>
                  <Text style={styles.emptyComparisonText}>
                    Compare up to 4 items to see relationships
                  </Text>
                  <Text style={styles.emptyComparisonSubtext}>
                    Select habits and Garmin metrics to analyze correlations
                  </Text>
                </View>
              )}
            </View>

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
                              {stats.totalDays}
                            </Text>
                            <Text style={styles.habitStatLabel}>Times Logged</Text>
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

      {/* Comparison Items Selection Modal */}
      <Modal
        visible={comparisonModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setComparisonModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Comparison Items</Text>
              <TouchableOpacity onPress={() => setComparisonModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Select up to 4 items to compare ({comparisonItems.length}/4 selected)
            </Text>

            <ScrollView style={styles.comparisonItemList}>
              {/* Habits Section */}
              <Text style={styles.sectionTitle}>Habits</Text>
              {habits.map(habit => {
                const isSelected = comparisonItems.some(item => item.id === `habit-${habit.id}`);
                const canAdd = !isSelected && comparisonItems.length < 4;
                
                return (
                  <TouchableOpacity
                    key={`habit-${habit.id}`}
                    style={[styles.comparisonItemRow, !canAdd && styles.comparisonItemRowDisabled]}
                    onPress={() => {
                      if (isSelected) {
                        removeComparisonItem(`habit-${habit.id}`);
                      } else if (canAdd) {
                        addComparisonItem({
                          id: `habit-${habit.id}`,
                          type: 'habit',
                          name: habit.name,
                          habitId: habit.id,
                          color: COMPARISON_COLORS[comparisonItems.length],
                        });
                      }
                    }}
                    disabled={!canAdd && !isSelected}
                  >
                    <View style={styles.comparisonCheckbox}>
                      {isSelected && (
                        <Text style={styles.comparisonCheckmark}>✓</Text>
                      )}
                    </View>
                    <Text style={styles.comparisonItemName}>{habit.name}</Text>
                    <Text style={styles.comparisonItemType}>
                      {habit.type === 'quantity' ? 'Quantity' : 'Yes/No'}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Garmin Metrics Section */}
              <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Garmin Metrics</Text>
              {(['steps', 'sleep', 'heartRate', 'calories', 'activeMinutes', 'weight'] as GarminMetric[]).map(metric => {
                const isSelected = comparisonItems.some(item => item.id === `garmin-${metric}`);
                const canAdd = !isSelected && comparisonItems.length < 4;
                
                return (
                  <TouchableOpacity
                    key={`garmin-${metric}`}
                    style={[styles.comparisonItemRow, !canAdd && styles.comparisonItemRowDisabled]}
                    onPress={() => {
                      if (isSelected) {
                        removeComparisonItem(`garmin-${metric}`);
                      } else if (canAdd) {
                        addComparisonItem({
                          id: `garmin-${metric}`,
                          type: 'garmin',
                          name: GARMIN_METRIC_NAMES[metric],
                          garminMetric: metric,
                          color: COMPARISON_COLORS[comparisonItems.length],
                        });
                      }
                    }}
                    disabled={!canAdd && !isSelected}
                  >
                    <View style={styles.comparisonCheckbox}>
                      {isSelected && (
                        <Text style={styles.comparisonCheckmark}>✓</Text>
                      )}
                    </View>
                    <Text style={styles.comparisonItemName}>{GARMIN_METRIC_NAMES[metric]}</Text>
                    <Text style={styles.comparisonItemType}>Garmin</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {comparisonItems.length > 0 && (
              <TouchableOpacity
                style={styles.clearComparisonButton}
                onPress={() => {
                  clearComparisonItems();
                  setComparisonModalVisible(false);
                }}
              >
                <Text style={styles.clearComparisonText}>Clear All</Text>
              </TouchableOpacity>
            )}
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
    marginBottom: spacing.xs,
  },
  chartSubtitle: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
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
  // Comparison chart styles
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addComparisonButton: {
    backgroundColor: colors.purpleLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  addComparisonButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  legendContainer: {
    backgroundColor: colors.greyLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  legendItem: {
    marginBottom: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: spacing.sm,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendName: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs / 2,
  },
  legendRange: {
    color: colors.greyVeryLight,
    fontSize: fontSize.xs,
  },
  legendRemoveButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  legendRemoveText: {
    color: colors.greyVeryLight,
    fontSize: fontSize.md,
  },
  legendAddButton: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.greyVeryLight,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  legendAddText: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  chartNote: {
    color: colors.greyVeryLight,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  emptyComparisonState: {
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.greyLight,
    borderRadius: borderRadius.md,
  },
  emptyComparisonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyComparisonSubtext: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  // Comparison modal styles
  modalSubtitle: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  comparisonItemList: {
    maxHeight: 500,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  comparisonItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
  },
  comparisonItemRowDisabled: {
    opacity: 0.5,
  },
  comparisonCheckbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.greyVeryLight,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparisonCheckmark: {
    color: colors.greenLight,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  comparisonItemName: {
    flex: 1,
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  comparisonItemType: {
    color: colors.greyVeryLight,
    fontSize: fontSize.xs,
    marginLeft: spacing.sm,
  },
  clearComparisonButton: {
    backgroundColor: colors.greyLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  clearComparisonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});

