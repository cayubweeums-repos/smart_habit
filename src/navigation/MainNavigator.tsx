import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, fontSize } from '../theme';
import { HabitsScreen, DailyLogScreen, ChartsScreen, SettingsScreen } from '../screens';

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.grey,
          borderTopColor: colors.greyLight,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarActiveTintColor: colors.greenLight,
        tabBarInactiveTintColor: colors.greyMedium,
        tabBarLabelStyle: {
          fontSize: fontSize.sm,
          fontWeight: '600',
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
            <TabIcon icon="📝" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Habits"
        component={HabitsScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="✓" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Charts"
        component={ChartsScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="📊" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="⚙️" color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Simple icon component using emoji
function TabIcon({ icon, color }: { icon: string; color: string }) {
  return (
    <Text style={{ fontSize: 24, opacity: color === colors.greyMedium ? 0.5 : 1 }}>
      {icon}
    </Text>
  );
}

