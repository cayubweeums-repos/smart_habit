import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, fontWeight, commonStyles } from '../theme';
import { Habit, HabitEntry, WeatherData } from '../types';
import { loadHabits, getDailyLog, updateHabitEntry, loadDailyLogs } from '../storage';
import { getTodayKey, formatDisplayDate, getDayOfWeek, parseDateKey, formatDateKey, isToday, weatherMatches } from '../utils';
import { fetchWeatherByCoordinates } from '../services/weatherService';
import { loadLocationSettings } from '../storage/settingsStorage';
import { checkWeatherDependentHabits } from '../services/notificationService';

export default function DailyLogScreen() {
  const insets = useSafeAreaInsets();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<{ [habitId: string]: boolean | null }>({});
  const [quantities, setQuantities] = useState<{ [habitId: string]: number | undefined }>({});
  const [selectedDateKey, setSelectedDateKey] = useState<string>(getTodayKey());
  const [quantityModalVisible, setQuantityModalVisible] = useState(false);
  const [quantityHabitId, setQuantityHabitId] = useState<string | null>(null);
  const [quantityValue, setQuantityValue] = useState<number>(0);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [tempSelectedDate, setTempSelectedDate] = useState<Date>(new Date());
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [calendarMonthData, setCalendarMonthData] = useState<{ [dateKey: string]: 'green' | 'red' | 'grey' }>({});

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedDateKey])
  );

  const loadData = async () => {
    const loadedHabits = await loadHabits();
    const activeHabits = loadedHabits.filter(h => !h.archived);
    setHabits(activeHabits);

    // Load weather if viewing today's date
    if (isToday(selectedDateKey)) {
      const location = await loadLocationSettings();
      if (location) {
        const weather = await fetchWeatherByCoordinates(location.latitude, location.longitude);
        setCurrentWeather(weather);
        // Check weather-dependent habits and send notifications if needed
        checkWeatherDependentHabits();
      }
    } else {
      setCurrentWeather(null);
    }

    const dateLog = await getDailyLog(selectedDateKey);
    const entriesMap: { [habitId: string]: boolean | null } = {};
    const quantitiesMap: { [habitId: string]: number | undefined } = {};
    
    activeHabits.forEach(habit => {
      const entry = dateLog?.entries.find(e => e.habitId === habit.id);
      // Normalize completed to ensure it's always a boolean or null
      if (entry) {
        const completed: any = entry.completed;
        // Normalize: handle both boolean and string values from storage
        if (completed === true || completed === 'true') {
          entriesMap[habit.id] = true;
        } else if (completed === false || completed === 'false') {
          entriesMap[habit.id] = false;
        } else {
          entriesMap[habit.id] = null;
        }
      } else {
        entriesMap[habit.id] = null;
      }
      quantitiesMap[habit.id] = entry?.quantity;
    });
    
    setEntries(entriesMap);
    setQuantities(quantitiesMap);
  };

  const openDatePicker = async () => {
    setTempSelectedDate(parseDateKey(selectedDateKey));
    setDatePickerVisible(true);
    await loadCalendarMonthData(parseDateKey(selectedDateKey));
  };

  const loadCalendarMonthData = async (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Get first and last day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDateKey = formatDateKey(firstDay);
    const endDateKey = formatDateKey(lastDay);
    
    // Load all habits to get the earliest creation date
    const allHabits = await loadHabits();
    const earliestHabit = allHabits.reduce((earliest, habit) => {
      if (!earliest || habit.createdAt < earliest.createdAt) {
        return habit;
      }
      return earliest;
    }, null as Habit | null);
    
    const earliestDateKey = earliestHabit ? formatDateKey(new Date(earliestHabit.createdAt)) : getTodayKey();
    
    // Load all daily logs for the month
    const allLogs = await loadDailyLogs();
    const monthLogs = allLogs.filter(log => log.date >= startDateKey && log.date <= endDateKey);
    
    // Get active habits count
    const activeHabits = allHabits.filter(h => !h.archived);
    const totalHabits = activeHabits.length;
    
    // Calculate status for each day
    const statusMap: { [dateKey: string]: 'green' | 'red' | 'grey' } = {};
    
    // Get all days in the month
    const currentDate = new Date(firstDay);
    while (currentDate <= lastDay) {
      const dateKey = formatDateKey(currentDate);
      
      // Grey if before earliest habit
      if (dateKey < earliestDateKey) {
        statusMap[dateKey] = 'grey';
      } else {
        const dayLog = monthLogs.find(log => log.date === dateKey);
        if (!dayLog || totalHabits === 0) {
          statusMap[dateKey] = 'red';
        } else {
          // Count how many habits were logged (completed is not null)
          const loggedCount = activeHabits.filter(habit => {
            const entry = dayLog.entries.find(e => e.habitId === habit.id);
            return entry && entry.completed !== null;
          }).length;
          
          statusMap[dateKey] = loggedCount === totalHabits ? 'green' : 'red';
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    setCalendarMonthData(statusMap);
  };

  const handleDatePickerConfirm = () => {
    setSelectedDateKey(formatDateKey(tempSelectedDate));
    setDatePickerVisible(false);
  };

  const goToToday = () => {
    setSelectedDateKey(getTodayKey());
    setDatePickerVisible(false);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const changeMonth = async (delta: number) => {
    const newDate = new Date(tempSelectedDate);
    newDate.setMonth(newDate.getMonth() + delta);
    // Adjust day if it's invalid for the new month
    const daysInMonth = getDaysInMonth(newDate.getFullYear(), newDate.getMonth());
    if (newDate.getDate() > daysInMonth) {
      newDate.setDate(daysInMonth);
    }
    setTempSelectedDate(newDate);
    await loadCalendarMonthData(newDate);
  };

  const selectDate = (day: number) => {
    const newDate = new Date(tempSelectedDate);
    newDate.setDate(day);
    setTempSelectedDate(newDate);
  };

  const handleHabitToggle = async (habitId: string, completed: boolean) => {
    const habit = habits.find(h => h.id === habitId);
    
    // If it's a quantity-type habit and user is marking it as completed, prompt for quantity
    if (habit?.type === 'quantity' && completed) {
      setQuantityHabitId(habitId);
      const existingQuantity = quantities[habitId];
      setQuantityValue(existingQuantity || 0);
      setQuantityModalVisible(true);
      return;
    }
    
    // For non-quantity habits or marking as incomplete, save directly
    // Note: When a backup habit is shown, we use the original habit's ID for tracking,
    // so logging the backup habit already logs it for the original habit
    try {
      await updateHabitEntry(selectedDateKey, habitId, completed);
      setEntries(prev => ({ ...prev, [habitId]: completed }));
      if (!completed) {
        setQuantities(prev => ({ ...prev, [habitId]: undefined }));
      }
    } catch (error) {
      console.error('Error updating habit entry:', error);
    }
  };

  const handleQuantityChange = (delta: number) => {
    setQuantityValue(prev => Math.max(0, prev + delta));
  };

  const handleQuantityInputChange = (text: string) => {
    const num = parseInt(text, 10);
    if (!isNaN(num) && num >= 0) {
      setQuantityValue(num);
    } else if (text === '') {
      setQuantityValue(0);
    }
  };

  const handleQuantitySubmit = async () => {
    if (!quantityHabitId) return;
    
    if (quantityValue < 0) {
      Alert.alert('Error', 'Please enter a valid quantity (0 or greater)');
      return;
    }

    try {
      // Note: When a backup habit is shown, we use the original habit's ID for tracking,
      // so logging the backup habit already logs it for the original habit
      await updateHabitEntry(selectedDateKey, quantityHabitId, true, undefined, quantityValue);
      setEntries(prev => ({ ...prev, [quantityHabitId]: true }));
      setQuantities(prev => ({ ...prev, [quantityHabitId]: quantityValue }));
      
      setQuantityModalVisible(false);
      setQuantityHabitId(null);
      setQuantityValue(0);
    } catch (error) {
      console.error('Error updating habit entry:', error);
      Alert.alert('Error', 'Failed to save habit entry');
    }
  };

  const renderHabit = ({ item }: { item: Habit }) => {
    // Check if this is a weather-dependent habit and weather doesn't match
    const isWeatherDependent = item.weatherDependent && item.requiredWeatherTypes && item.requiredWeatherTypes.length > 0;
    const weatherMatchesRequired = isWeatherDependent && currentWeather && item.requiredWeatherTypes
      ? weatherMatches(currentWeather, item.requiredWeatherTypes)
      : true;
    
    // If weather doesn't match:
    // - If backup habit name exists, show backup habit (using original habit's ID for tracking)
    // - If no backup habit name, skip this habit entirely (return null)
    if (isWeatherDependent && !weatherMatchesRequired) {
      if (item.backupHabitName && item.backupHabitName.trim()) {
        // Show backup habit with indication it's a backup
        // Use the original habit's ID for tracking, but show the backup habit name
        const status = entries[item.id]; // Track using original habit ID
        const quantity = quantities[item.id];
        
        return (
          <View style={styles.habitRow}>
            <View style={styles.habitInfo}>
              <View style={styles.habitNameRow}>
                <Text style={styles.habitName}>{item.backupHabitName}</Text>
                <View style={styles.backupBadge}>
                  <Text style={styles.backupBadgeText}>Backup</Text>
                </View>
              </View>
              <Text style={styles.backupNote}>
                Weather doesn't match for "{item.name}"
              </Text>
              {item.type === 'quantity' && status === true && quantity !== undefined && (
                <Text style={styles.quantityText}>Quantity: {quantity}</Text>
              )}
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
      } else {
        // No backup habit name - skip this habit entirely
        return null;
      }
    }
    
    // Normal habit rendering
    const status = entries[item.id];
    const quantity = quantities[item.id];
    const isQuantityType = item.type === 'quantity';
    
    return (
      <View style={styles.habitRow}>
        <View style={styles.habitInfo}>
          <Text style={styles.habitName}>{item.name}</Text>
          {isQuantityType && status === true && quantity !== undefined && (
            <Text style={styles.quantityText}>Quantity: {quantity}</Text>
          )}
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

  // Filter out habits that should be skipped (weather-dependent without backup when weather doesn't match)
  const visibleHabits = habits.filter(habit => {
    const isWeatherDependent = habit.weatherDependent && habit.requiredWeatherTypes && habit.requiredWeatherTypes.length > 0;
    if (isWeatherDependent && currentWeather && habit.requiredWeatherTypes) {
      const weatherMatchesRequired = weatherMatches(currentWeather, habit.requiredWeatherTypes);
      // Skip if weather doesn't match AND no backup habit name
      if (!weatherMatchesRequired && (!habit.backupHabitName || !habit.backupHabitName.trim())) {
        return false; // Skip this habit
      }
    }
    return true; // Include this habit
  });

  const loggedCount = visibleHabits.filter(habit => entries[habit.id] !== null).length;
  const totalCount = visibleHabits.length;
  const loggedPercentage = totalCount > 0 ? Math.round((loggedCount / totalCount) * 100) : 0;

  return (
    <View style={[commonStyles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.md }}
      >
        <View style={styles.header}>
          <View style={styles.dateSection}>
            <TouchableOpacity
              style={styles.dateInfo}
              onPress={openDatePicker}
            >
              <Text style={styles.dateText}>{formatDisplayDate(selectedDateKey)}</Text>
              <Text style={styles.dayText}>{getDayOfWeek(selectedDateKey)}</Text>
            </TouchableOpacity>
            {!isToday(selectedDateKey) && (
              <TouchableOpacity
                style={styles.todayButton}
                onPress={goToToday}
              >
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{loggedCount}/{totalCount}</Text>
            <Text style={styles.progressLabel}>Logged</Text>
          </View>
        </View>

        {totalCount > 0 && (
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${loggedPercentage}%`,
                  backgroundColor: loggedPercentage === 100 ? colors.green : colors.purpleLight,
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
            <Text style={styles.sectionTitle}>
              {isToday(selectedDateKey) ? "Today's Habits" : "Habits"}
            </Text>
            <FlatList
              data={visibleHabits}
              renderItem={renderHabit}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {loggedPercentage === 100 && totalCount > 0 && (
          <View style={styles.celebrationCard}>
            <Ionicons name="trophy" size={48} color={colors.greenLight} />
            <Text style={styles.celebrationText}>
              Great job! You've logged all habits{isToday(selectedDateKey) ? ' for today' : ''}!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Quantity Input Modal */}
      <Modal
        visible={!!quantityModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setQuantityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Quantity</Text>
            {quantityHabitId && (
              <Text style={styles.modalSubtitle}>
                {habits.find(h => h.id === quantityHabitId)?.name}
              </Text>
            )}
            
            <Text style={styles.inputLabel}>Quantity *</Text>
            <View style={styles.quantityInputContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(-1)}
              >
                <Text style={styles.quantityButtonText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.quantityInput}
                value={quantityValue.toString()}
                onChangeText={handleQuantityInputChange}
                keyboardType="numeric"
                textAlign="center"
                autoFocus
              />
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleQuantityChange(1)}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[commonStyles.buttonOutline, styles.modalButton]}
                onPress={() => {
                  setQuantityModalVisible(false);
                  setQuantityHabitId(null);
                  setQuantityValue(0);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[commonStyles.button, styles.modalButton]}
                onPress={handleQuantitySubmit}
              >
                <Text style={commonStyles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={!!datePickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setDatePickerVisible(false)}>
                <Ionicons name="close" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerContainer}>
              {/* Month/Year Header */}
              <View style={styles.calendarHeader}>
                <TouchableOpacity
                  style={styles.calendarNavButton}
                  onPress={() => changeMonth(-1)}
                >
                  <Ionicons name="chevron-back" size={24} color={colors.white} />
                </TouchableOpacity>
                <Text style={styles.calendarMonthYear}>
                  {tempSelectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity
                  style={styles.calendarNavButton}
                  onPress={() => changeMonth(1)}
                >
                  <Ionicons name="chevron-forward" size={24} color={colors.white} />
                </TouchableOpacity>
              </View>

              {/* Day Labels */}
              <View style={styles.calendarWeekDays}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <Text key={day} style={styles.calendarWeekDay}>{day}</Text>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {(() => {
                  const year = tempSelectedDate.getFullYear();
                  const month = tempSelectedDate.getMonth();
                  const firstDay = new Date(year, month, 1);
                  const lastDay = new Date(year, month + 1, 0);
                  const daysInMonth = lastDay.getDate();
                  const startDayOfWeek = firstDay.getDay();
                  
                  const days: (number | null)[] = [];
                  
                  // Add empty cells for days before the first day of the month
                  for (let i = 0; i < startDayOfWeek; i++) {
                    days.push(null);
                  }
                  
                  // Add all days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    days.push(day);
                  }
                  
                  return days.map((day, index) => {
                    if (day === null) {
                      return <View key={index} style={styles.calendarDay} />;
                    }
                    
                    const dayDate = new Date(year, month, day);
                    const dateKey = formatDateKey(dayDate);
                    const status = calendarMonthData[dateKey] || 'grey';
                    const isSelected = tempSelectedDate.getDate() === day && 
                                      tempSelectedDate.getMonth() === month &&
                                      tempSelectedDate.getFullYear() === year;
                    const isToday = dateKey === getTodayKey();
                    
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.calendarDay,
                          isSelected && styles.calendarDaySelected,
                          isToday && styles.calendarDayToday,
                        ]}
                        onPress={() => selectDate(day)}
                      >
                        <Text style={[
                          styles.calendarDayNumber,
                          isSelected && styles.calendarDayNumberSelected,
                          isToday && !isSelected && styles.calendarDayNumberToday,
                        ]}>
                          {day}
                        </Text>
                        <View style={[
                          styles.calendarDayDot,
                          status === 'green' && styles.calendarDayDotGreen,
                          status === 'red' && styles.calendarDayDotRed,
                          status === 'grey' && styles.calendarDayDotGrey,
                        ]} />
                      </TouchableOpacity>
                    );
                  });
                })()}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[commonStyles.buttonOutline, styles.modalButton]}
                onPress={() => setDatePickerVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[commonStyles.button, styles.modalButton]}
                onPress={handleDatePickerConfirm}
              >
                <Text style={commonStyles.buttonText}>Select</Text>
              </TouchableOpacity>
            </View>
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
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateSection: {
    flex: 1,
    alignItems: 'center',
  },
  dateInfo: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
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
  todayButton: {
    marginTop: spacing.sm,
    alignSelf: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.purpleLight,
  },
  todayButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
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
  habitInfo: {
    flex: 1,
  },
  habitNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  habitName: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  backupBadge: {
    backgroundColor: colors.purpleLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  backupBadgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  backupNote: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  quantityText: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
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
  celebrationText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
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
  },
  modalTitle: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    color: colors.greyVeryLight,
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
  },
  inputLabel: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
  },
  cancelButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  quantityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  quantityButton: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    backgroundColor: colors.greyLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.greyVeryLight,
  },
  quantityButtonText: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    lineHeight: fontSize.xxl,
  },
  quantityInput: {
    flex: 1,
    height: 50,
    backgroundColor: colors.greyLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.greyVeryLight,
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  datePickerContainer: {
    marginVertical: spacing.lg,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  calendarNavButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.greyLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarMonthYear: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  calendarWeekDay: {
    flex: 1,
    color: colors.greyVeryLight,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  calendarDaySelected: {
    backgroundColor: colors.purpleLight,
    borderRadius: borderRadius.md,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: colors.greenLight,
    borderRadius: borderRadius.md,
  },
  calendarDayNumber: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  calendarDayNumberSelected: {
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
  calendarDayNumberToday: {
    color: colors.greenLight,
  },
  calendarDayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  calendarDayDotGreen: {
    backgroundColor: colors.green,
  },
  calendarDayDotRed: {
    backgroundColor: colors.error,
  },
  calendarDayDotGrey: {
    backgroundColor: colors.greyMedium,
  },
});

