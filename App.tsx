import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MainNavigator } from './src/navigation';
import { colors } from './src/theme';
import { requestNotificationPermissions, checkWeatherDependentHabits, schedulePeriodicWeatherChecks } from './src/services/notificationService';
import { registerBackgroundWeatherTask } from './src/services/backgroundWeatherTask';

export default function App() {
  useEffect(() => {
    // Request notification permissions on app start
    requestNotificationPermissions()
      .then(() => {
        // Check weather-dependent habits on app start
        checkWeatherDependentHabits(true).catch(err => {
          console.error('[App] Error checking weather-dependent habits:', err);
        });
        
        // Schedule periodic weather checks (as backup)
        schedulePeriodicWeatherChecks().catch(err => {
          console.error('[App] Error scheduling periodic weather checks:', err);
        });
        
        // Register background fetch task for reliable background execution
        registerBackgroundWeatherTask()
          .then(registered => {
            if (registered) {
              console.log('[App] Background weather monitoring registered successfully');
            } else {
              console.warn('[App] Background weather monitoring not available, using scheduled notifications');
            }
          })
          .catch(err => {
            console.error('[App] Error registering background weather task:', err);
            // Continue with scheduled notifications as fallback
            console.warn('[App] Falling back to scheduled notifications');
          });
      })
      .catch(err => {
        console.error('[App] Error requesting notification permissions:', err);
        // Continue anyway - app should still work without notifications
      });
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor={colors.greyDark} />
        <MainNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
