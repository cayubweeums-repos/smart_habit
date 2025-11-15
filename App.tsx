import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { MainNavigator } from './src/navigation';
import { colors } from './src/theme';
import { requestNotificationPermissions } from './src/services/notificationService';

export default function App() {
  useEffect(() => {
    // Request notification permissions on app start
    requestNotificationPermissions();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor={colors.greyDark} />
      <MainNavigator />
    </NavigationContainer>
  );
}
