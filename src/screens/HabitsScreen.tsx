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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, borderRadius, fontSize, fontWeight, commonStyles } from '../theme';
import { Habit } from '../types';
import { loadHabits, addHabit, updateHabit, deleteHabit } from '../storage';

export default function HabitsScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [habitName, setHabitName] = useState('');
  const [habitDescription, setHabitDescription] = useState('');
  const [habitColor, setHabitColor] = useState(colors.greenLight);

  const availableColors = [
    colors.greenLight,
    colors.green,
    colors.purpleLight,
    colors.purple,
    colors.info,
  ];

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
    setEditingHabit(null);
    setHabitName('');
    setHabitDescription('');
    setHabitColor(colors.greenLight);
    setModalVisible(true);
  };

  const openEditModal = (habit: Habit) => {
    setEditingHabit(habit);
    setHabitName(habit.name);
    setHabitDescription(habit.description || '');
    setHabitColor(habit.color);
    setModalVisible(true);
  };

  const handleSaveHabit = async () => {
    if (!habitName.trim()) {
      Alert.alert('Error', 'Please enter a habit name');
      return;
    }

    try {
      if (editingHabit) {
        // Update existing habit
        await updateHabit(editingHabit.id, {
          name: habitName.trim(),
          description: habitDescription.trim(),
          color: habitColor,
        });
      } else {
        // Add new habit
        const newHabit: Habit = {
          id: Date.now().toString(),
          name: habitName.trim(),
          description: habitDescription.trim(),
          color: habitColor,
          createdAt: new Date().toISOString(),
          archived: false,
        };
        await addHabit(newHabit);
      }

      setModalVisible(false);
      loadHabitsData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save habit');
    }
  };

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
      <View style={[styles.habitColorIndicator, { backgroundColor: item.color }]} />
      <View style={styles.habitContent}>
        <Text style={styles.habitName}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.habitDescription}>{item.description}</Text>
        ) : null}
      </View>
      <Text style={styles.habitArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={commonStyles.container}>
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
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
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

            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[commonStyles.input, styles.textArea]}
              placeholder="Add details about this habit..."
              placeholderTextColor={colors.greyMedium}
              value={habitDescription}
              onChangeText={setHabitDescription}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Color</Text>
            <View style={styles.colorPicker}>
              {availableColors.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    habitColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setHabitColor(color)}
                />
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[commonStyles.buttonOutline, styles.modalButton]}
                onPress={() => setModalVisible(false)}
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
  habitColorIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  habitContent: {
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
    marginBottom: spacing.lg,
  },
  inputLabel: {
    color: colors.greyVeryLight,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  colorPicker: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: colors.white,
    borderWidth: 3,
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
});

