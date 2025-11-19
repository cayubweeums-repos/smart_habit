import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Switch,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, fontSize, fontWeight, commonStyles } from '../theme';
import { Habit, HabitType, HabitCategory, WeatherConditionType } from '../types';
import { loadHabits, addHabit, updateHabit, deleteHabit } from '../storage';
import { getAllWeatherTypes, getWeatherTypeDisplayName } from '../utils/weatherUtils';
import { PREBUILT_HABITS, PrebuiltHabit, CATEGORY_DISPLAY_NAMES } from '../utils/prebuiltHabits';

export default function HabitsScreen() {
  const insets = useSafeAreaInsets();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [prebuiltHabitsModalVisible, setPrebuiltHabitsModalVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [habitName, setHabitName] = useState('');
  const [habitType, setHabitType] = useState<HabitType | undefined>(undefined);
  const [habitCategory, setHabitCategory] = useState<HabitCategory | undefined>(undefined);
  const [typeDropdownVisible, setTypeDropdownVisible] = useState(false);
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);
  const [weatherDependent, setWeatherDependent] = useState(false);
  const [selectedWeatherTypes, setSelectedWeatherTypes] = useState<WeatherConditionType[]>([]);
  const [weatherTypesDropdownVisible, setWeatherTypesDropdownVisible] = useState(false);
  const [backupHabitName, setBackupHabitName] = useState<string>('');

  useFocusEffect(
    useCallback(() => {
      loadHabitsData();
    }, [])
  );

  const loadHabitsData = async () => {
    const loadedHabits = await loadHabits();
    setHabits(loadedHabits.filter(h => !h.archived));
  };

  const openAddModal = () => {
    // Show prebuilt habits modal first
    setPrebuiltHabitsModalVisible(true);
  };

  const openCustomHabitModal = () => {
    // Close prebuilt habits modal and open custom habit form
    setPrebuiltHabitsModalVisible(false);
    setEditingHabit(null);
    setHabitName('');
    setHabitType(undefined);
    setHabitCategory(undefined);
    setTypeDropdownVisible(false);
    setCategoryDropdownVisible(false);
    setWeatherDependent(false);
    setSelectedWeatherTypes([]);
    setWeatherTypesDropdownVisible(false);
    setBackupHabitName('');
    setModalVisible(true);
  };

  const handleSelectPrebuiltHabit = async (prebuiltHabit: PrebuiltHabit) => {
    try {
      const newHabit: Habit = {
        id: Date.now().toString(),
        name: prebuiltHabit.name,
        type: prebuiltHabit.type,
        automaticType: prebuiltHabit.automaticType,
        category: prebuiltHabit.category,
        createdAt: new Date().toISOString(),
        archived: false,
      };
      await addHabit(newHabit);
      setPrebuiltHabitsModalVisible(false);
      loadHabitsData();
    } catch (error) {
      Alert.alert('Error', 'Failed to add habit');
    }
  };

  const openEditModal = (habit: Habit) => {
    setEditingHabit(habit);
    setHabitName(habit.name);
    setHabitType(habit.type);
    setHabitCategory(habit.category);
    setTypeDropdownVisible(false);
    setCategoryDropdownVisible(false);
    // Ensure weatherDependent is always a boolean
    setWeatherDependent(!!habit.weatherDependent);
    setSelectedWeatherTypes(habit.requiredWeatherTypes || []);
    setWeatherTypesDropdownVisible(false);
    setBackupHabitName(habit.backupHabitName || '');
    setModalVisible(true);
  };

  const handleSaveHabit = async () => {
    if (!habitName.trim()) {
      Alert.alert('Error', 'Please enter a habit name');
      return;
    }

    if (weatherDependent && selectedWeatherTypes.length === 0) {
      Alert.alert('Error', 'Please select at least one weather type for weather-dependent habits');
      return;
    }

    try {
      if (editingHabit) {
        // Update existing habit
        await updateHabit(editingHabit.id, {
          name: habitName.trim(),
          type: habitType,
          category: habitCategory,
          weatherDependent: weatherDependent || undefined,
          requiredWeatherTypes: weatherDependent && selectedWeatherTypes.length > 0 ? selectedWeatherTypes : undefined,
          backupHabitName: weatherDependent && backupHabitName.trim() ? backupHabitName.trim() : undefined,
        });
      } else {
        // Add new habit
        const newHabit: Habit = {
          id: Date.now().toString(),
          name: habitName.trim(),
          type: habitType,
          category: habitCategory,
          createdAt: new Date().toISOString(),
          archived: false,
          weatherDependent: weatherDependent || undefined,
          requiredWeatherTypes: weatherDependent && selectedWeatherTypes.length > 0 ? selectedWeatherTypes : undefined,
          backupHabitName: weatherDependent && backupHabitName.trim() ? backupHabitName.trim() : undefined,
        };
        await addHabit(newHabit);
      }

      setModalVisible(false);
      setTypeDropdownVisible(false);
      setCategoryDropdownVisible(false);
      setWeatherTypesDropdownVisible(false);
      loadHabitsData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save habit');
    }
  };

  const toggleWeatherType = (type: WeatherConditionType) => {
    setSelectedWeatherTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const availableBackupHabits = habits.filter(h => !editingHabit || h.id !== editingHabit.id);

  // Filter out prebuilt habits that are already being tracked
  const availablePrebuiltHabits = PREBUILT_HABITS.filter(
    prebuilt => !habits.some(habit => habit.name === prebuilt.name)
  );

  const handleDeleteHabit = (habit: Habit) => {
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${habit.name}"? This will also delete all associated logs.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHabit(habit.id);
              loadHabitsData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete habit');
            }
          },
        },
      ]
    );
  };

  const renderHabit = ({ item }: { item: Habit }) => (
    <TouchableOpacity
      style={styles.habitCard}
      onPress={() => openEditModal(item)}
      onLongPress={() => handleDeleteHabit(item)}
    >
      <View style={styles.habitContent}>
        <Text style={styles.habitName}>{item.name}</Text>
      </View>
      <Text style={styles.habitArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[commonStyles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={commonStyles.title}>My Habits</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add Habit</Text>
        </TouchableOpacity>
      </View>

      {habits.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No habits yet</Text>
          <Text style={styles.emptySubtext}>
            Tap "Add Habit" to create your first habit to track
          </Text>
        </View>
      ) : (
        <FlatList
          data={habits}
          renderItem={renderHabit}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.md }]}
        />
      )}

      <Modal
        visible={!!modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          setTypeDropdownVisible(false);
          setCategoryDropdownVisible(false);
          setWeatherTypesDropdownVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <ScrollView 
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingHabit ? 'Edit Habit' : 'New Habit'}
              </Text>

              <Text style={styles.inputLabel}>Habit Name *</Text>
              <TextInput
                style={commonStyles.input}
                placeholder="e.g., Morning Exercise"
                placeholderTextColor={colors.greyMedium}
                value={habitName}
                onChangeText={setHabitName}
              />

              <View>
                <Text style={styles.inputLabel}>Type</Text>
                <TouchableOpacity
                  style={commonStyles.input}
                  onPress={() => setTypeDropdownVisible(true)}
                >
                  <Text style={styles.inputText}>
                    {habitType === 'quantity' ? 'Quantity' : 'Yes/No'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View>
                <Text style={styles.inputLabel}>Category (Optional)</Text>
                <TouchableOpacity
                  style={commonStyles.input}
                  onPress={() => setCategoryDropdownVisible(true)}
                >
                  <Text style={[
                    styles.inputText,
                    !habitCategory && { color: colors.greyMedium }
                  ]}>
                    {habitCategory ? CATEGORY_DISPLAY_NAMES[habitCategory] : 'None'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Habit Type Selection Modal */}
              <Modal
                visible={typeDropdownVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setTypeDropdownVisible(false)}
              >
                <View style={styles.selectionModalOverlay}>
                  <View style={styles.selectionModalContent}>
                    <View style={styles.selectionModalHeader}>
                      <Text style={styles.selectionModalTitle}>Select Habit Type</Text>
                      <TouchableOpacity
                        onPress={() => setTypeDropdownVisible(false)}
                        style={styles.selectionModalCloseButton}
                      >
                        <Text style={styles.selectionModalCloseText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView 
                      style={styles.selectionModalScrollView}
                      contentContainerStyle={styles.selectionModalScrollContent}
                    >
                      <TouchableOpacity
                        style={styles.selectionOption}
                        onPress={() => {
                          setHabitType(undefined);
                          setTypeDropdownVisible(false);
                        }}
                      >
                        <Text style={[
                          styles.selectionOptionText,
                          habitType === undefined && styles.selectionOptionTextSelected,
                        ]}>
                          Yes/No
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.selectionOption}
                        onPress={() => {
                          setHabitType('quantity');
                          setTypeDropdownVisible(false);
                        }}
                      >
                        <Text style={[
                          styles.selectionOptionText,
                          habitType === 'quantity' && styles.selectionOptionTextSelected,
                        ]}>
                          Quantity
                        </Text>
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                </View>
              </Modal>

              {/* Habit Category Selection Modal */}
              <Modal
                visible={categoryDropdownVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setCategoryDropdownVisible(false)}
              >
                <View style={styles.selectionModalOverlay}>
                  <View style={styles.selectionModalContent}>
                    <View style={styles.selectionModalHeader}>
                      <Text style={styles.selectionModalTitle}>Select Category</Text>
                      <TouchableOpacity
                        onPress={() => setCategoryDropdownVisible(false)}
                        style={styles.selectionModalCloseButton}
                      >
                        <Text style={styles.selectionModalCloseText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView 
                      style={styles.selectionModalScrollView}
                      contentContainerStyle={styles.selectionModalScrollContent}
                    >
                      <TouchableOpacity
                        style={styles.selectionOption}
                        onPress={() => {
                          setHabitCategory(undefined);
                          setCategoryDropdownVisible(false);
                        }}
                      >
                        <Text style={[
                          styles.selectionOptionText,
                          habitCategory === undefined && styles.selectionOptionTextSelected,
                        ]}>
                          None
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.selectionOption}
                        onPress={() => {
                          setHabitCategory('morning');
                          setCategoryDropdownVisible(false);
                        }}
                      >
                        <Text style={[
                          styles.selectionOptionText,
                          habitCategory === 'morning' && styles.selectionOptionTextSelected,
                        ]}>
                          {CATEGORY_DISPLAY_NAMES.morning}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.selectionOption}
                        onPress={() => {
                          setHabitCategory('health');
                          setCategoryDropdownVisible(false);
                        }}
                      >
                        <Text style={[
                          styles.selectionOptionText,
                          habitCategory === 'health' && styles.selectionOptionTextSelected,
                        ]}>
                          {CATEGORY_DISPLAY_NAMES.health}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.selectionOption}
                        onPress={() => {
                          setHabitCategory('bedtime');
                          setCategoryDropdownVisible(false);
                        }}
                      >
                        <Text style={[
                          styles.selectionOptionText,
                          habitCategory === 'bedtime' && styles.selectionOptionTextSelected,
                        ]}>
                          {CATEGORY_DISPLAY_NAMES.bedtime}
                        </Text>
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                </View>
              </Modal>

              <View style={styles.switchContainer}>
                <Text style={styles.inputLabel}>Weather Dependent</Text>
                <Switch
                  value={!!weatherDependent}
                  onValueChange={(value) => {
                    setWeatherDependent(value);
                    if (!value) {
                      setSelectedWeatherTypes([]);
                      setBackupHabitName('');
                    }
                  }}
                  trackColor={{ false: colors.greyLight, true: colors.green }}
                  thumbColor={colors.white}
                />
              </View>

              {weatherDependent && (
                <>
                  <View>
                    <Text style={styles.inputLabel}>Required Weather Types *</Text>
                    <TouchableOpacity
                      style={commonStyles.input}
                      onPress={() => setWeatherTypesDropdownVisible(true)}
                    >
                      <Text style={[
                        styles.inputText,
                        selectedWeatherTypes.length === 0 && { color: colors.greyMedium }
                      ]}>
                        {selectedWeatherTypes.length > 0
                          ? `${selectedWeatherTypes.length} selected: ${selectedWeatherTypes.map(t => getWeatherTypeDisplayName(t)).join(', ')}`
                          : 'Tap to select weather types'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Weather Types Selection Modal */}
                  <Modal
                    visible={weatherTypesDropdownVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setWeatherTypesDropdownVisible(false)}
                  >
                    <View style={styles.selectionModalOverlay}>
                      <View style={styles.selectionModalContent}>
                        <View style={styles.selectionModalHeader}>
                          <Text style={styles.selectionModalTitle}>Select Weather Types</Text>
                          <TouchableOpacity
                            onPress={() => setWeatherTypesDropdownVisible(false)}
                            style={styles.selectionModalCloseButton}
                          >
                            <Text style={styles.selectionModalCloseText}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <ScrollView 
                          style={styles.selectionModalScrollView}
                          contentContainerStyle={styles.selectionModalScrollContent}
                        >
                          {getAllWeatherTypes().map((type) => (
                            <TouchableOpacity
                              key={type}
                              style={styles.selectionOption}
                              onPress={() => toggleWeatherType(type)}
                            >
                              <View style={styles.checkboxRow}>
                                <View style={[
                                  styles.checkbox,
                                  selectedWeatherTypes.includes(type) && styles.checkboxChecked
                                ]}>
                                  {selectedWeatherTypes.includes(type) && (
                                    <Text style={styles.checkmark}>✓</Text>
                                  )}
                                </View>
                                <Text style={[
                                  styles.selectionOptionText,
                                  selectedWeatherTypes.includes(type) && styles.selectionOptionTextSelected,
                                ]}>
                                  {getWeatherTypeDisplayName(type)}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  </Modal>

                  {selectedWeatherTypes.length > 0 && (
                    <View>
                      <Text style={styles.inputLabel}>Backup Habit (Optional)</Text>
                      <Text style={styles.inputHint}>
                        Enter a backup habit name. If left empty, this habit will be skipped when weather doesn't match.
                      </Text>
                      <TextInput
                        style={commonStyles.input}
                        value={backupHabitName}
                        onChangeText={setBackupHabitName}
                        placeholder="e.g., Indoor workout"
                        placeholderTextColor={colors.greyMedium}
                      />
                    </View>
                  )}
                </>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[commonStyles.buttonOutline, styles.modalButton]}
                  onPress={() => {
                    setModalVisible(false);
                    setTypeDropdownVisible(false);
                    setCategoryDropdownVisible(false);
                    setWeatherTypesDropdownVisible(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[commonStyles.button, styles.modalButton]}
                  onPress={handleSaveHabit}
                >
                  <Text style={commonStyles.buttonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Prebuilt Habits Selection Modal */}
      <Modal
        visible={prebuiltHabitsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPrebuiltHabitsModalVisible(false)}
      >
        <View style={styles.prebuiltModalOverlay}>
          <View style={styles.prebuiltModalContainer}>
            <View style={styles.prebuiltModalHeader}>
              <Text style={styles.modalTitle}>Add Habit</Text>
              <TouchableOpacity
                onPress={() => setPrebuiltHabitsModalVisible(false)}
                style={styles.prebuiltModalCloseButton}
              >
                <Text style={styles.prebuiltModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.prebuiltModalScrollView}
              contentContainerStyle={styles.prebuiltModalScrollContent}
            >
              {availablePrebuiltHabits.length > 0 ? (
                <>
                  <Text style={styles.prebuiltSectionTitle}>Prebuilt Habits</Text>
                  <Text style={styles.prebuiltSectionSubtitle}>
                    Choose from our curated list of habits
                  </Text>

                  {availablePrebuiltHabits.map((prebuiltHabit, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.prebuiltHabitCard}
                      onPress={() => handleSelectPrebuiltHabit(prebuiltHabit)}
                    >
                      <View style={styles.prebuiltHabitContent}>
                        <Text style={styles.prebuiltHabitName}>{prebuiltHabit.name}</Text>
                        <Text style={styles.prebuiltHabitType}>
                          {prebuiltHabit.type === 'quantity' 
                            ? 'Quantity' 
                            : prebuiltHabit.type === 'automatic' 
                            ? 'Automatic (Garmin)' 
                            : 'Yes/No'}
                        </Text>
                      </View>
                      <Text style={styles.habitArrow}>›</Text>
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <View style={styles.noPrebuiltHabitsContainer}>
                  <Text style={styles.noPrebuiltHabitsText}>
                    You're already tracking all prebuilt habits!
                  </Text>
                  <Text style={styles.noPrebuiltHabitsSubtext}>
                    Create a custom habit below
                  </Text>
                </View>
              )}

              <View style={styles.customHabitSection}>
                <Text style={styles.prebuiltSectionTitle}>Custom Habit</Text>
                <TouchableOpacity
                  style={styles.customHabitButton}
                  onPress={openCustomHabitModal}
                >
                  <Text style={styles.customHabitButtonText}>+ Create Custom Habit</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: colors.green,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  listContent: {
    padding: spacing.md,
  },
  habitCard: {
    backgroundColor: colors.grey,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  habitContent: {
    flex: 1,
  },
  habitName: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  habitArrow: {
    color: colors.greyMedium,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.normal,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollView: {
    flex: 1,
    width: '100%',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    minHeight: '100%',
  },
  modalContent: {
    backgroundColor: colors.grey,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 500,
    minWidth: 300,
    overflow: 'visible',
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 1,
    marginBottom: spacing.md,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.greyVeryLight,
    backgroundColor: colors.greyLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.green,
    borderColor: colors.greenLight,
  },
  checkmark: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  modalTitle: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.lg,
  },
  inputLabel: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  inputHint: {
    color: colors.greyMedium,
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
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
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.greyLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.greyVeryLight,
  },
  dropdownText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  dropdownArrow: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
  },
  dropdownOptions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.grey,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.greyVeryLight,
    overflow: 'hidden',
    zIndex: 1000,
    elevation: 10, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    maxHeight: 200,
    height: 200,
  },
  dropdownScrollView: {
    maxHeight: 200,
    height: 200,
  },
  dropdownScrollContent: {
    paddingVertical: spacing.xs,
  },
  dropdownOption: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyVeryLight,
  },
  dropdownOptionText: {
    color: colors.greyVeryLight,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  dropdownOptionTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  inputText: {
    color: colors.white,
    fontSize: fontSize.md,
  },
  selectionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  selectionModalContent: {
    backgroundColor: colors.grey,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '70%',
    minHeight: '50%',
  },
  selectionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
  },
  selectionModalTitle: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  selectionModalCloseButton: {
    padding: spacing.sm,
  },
  selectionModalCloseText: {
    color: colors.greenLight,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  selectionModalScrollView: {
    flex: 1,
  },
  selectionModalScrollContent: {
    padding: spacing.md,
  },
  selectionOption: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
  },
  selectionOptionText: {
    color: colors.greyVeryLight,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  selectionOptionTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  prebuiltModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prebuiltModalContainer: {
    backgroundColor: colors.grey,
    borderRadius: borderRadius.lg,
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    minHeight: 400,
  },
  prebuiltModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
  },
  prebuiltModalCloseButton: {
    padding: spacing.sm,
  },
  prebuiltModalCloseText: {
    color: colors.greyVeryLight,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  prebuiltModalScrollView: {
    flex: 1,
    width: '100%',
  },
  prebuiltModalScrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  prebuiltSectionTitle: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  prebuiltSectionSubtitle: {
    color: colors.greyMedium,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  prebuiltHabitCard: {
    backgroundColor: colors.greyLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  prebuiltHabitContent: {
    flex: 1,
  },
  prebuiltHabitName: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  prebuiltHabitType: {
    color: colors.greyMedium,
    fontSize: fontSize.sm,
  },
  customHabitSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.greyLight,
  },
  customHabitButton: {
    backgroundColor: colors.green,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  customHabitButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  noPrebuiltHabitsContainer: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  noPrebuiltHabitsText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  noPrebuiltHabitsSubtext: {
    color: colors.greyMedium,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});

