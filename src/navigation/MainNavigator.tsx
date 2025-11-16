import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { colors, fontSize, spacing } from '../theme';
import { HabitsScreen, DailyLogScreen, ChartsScreen, SettingsScreen } from '../screens';

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
  const insets = useSafeAreaInsets();
  
  // Calculate tab bar height: base height for icon + text + padding, plus safe area
  const baseHeight = 70; // Increased to accommodate icon (24px) + text (~16px) + padding
  const totalHeight = baseHeight + insets.bottom;
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.grey,
          borderTopColor: colors.greyLight,
          borderTopWidth: 1,
          paddingTop: spacing.sm,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
          height: totalHeight,
        },
        tabBarActiveTintColor: colors.greenLight,
        tabBarInactiveTintColor: colors.greyMedium,
        tabBarLabelStyle: {
          fontSize: fontSize.sm,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 0,
        },
        tabBarItemStyle: {
          paddingVertical: spacing.xs,
        },
        headerStyle: {
          backgroundColor: colors.greyDark,
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="Log"
        component={DailyLogScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Habits"
        component={HabitsScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-circle-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Charts"
        component={ChartsScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size || 24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

