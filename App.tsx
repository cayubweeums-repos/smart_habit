import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MainNavigator } from './src/navigation';
import { colors } from './src/theme';
import { isGarminAuthenticated, syncGarminHealthData, signInWithGarmin } from './src/services/garminService';
import { loadGarminCredentials } from './src/storage/settingsStorage';
import { checkAutomaticHabits } from './src/services/automaticHabitService';
import { loadHabits } from './src/storage';

export default function App() {
  useEffect(() => {

    // Auto-login and sync Garmin data on app launch
    (async () => {
      try {
        let authenticated = await isGarminAuthenticated();
        
        // If not authenticated but credentials are saved, try to auto-login
        if (!authenticated) {
          const savedCredentials = await loadGarminCredentials();
          if (savedCredentials && savedCredentials.password) {
            try {
              console.log('[App] Attempting auto-login with saved credentials...');
              await signInWithGarmin({
                email: savedCredentials.email,
                password: savedCredentials.password,
              });
              authenticated = true;
              console.log('[App] Auto-login successful');
            } catch (error: any) {
              // Auto-login failed - could be rate limiting, invalid credentials, or network issue
              const isRateLimited = error?.message?.includes('429') || error?.message?.includes('rate limit') || error?.message?.includes('already in progress');
              if (isRateLimited) {
                console.log('[App] Auto-login skipped due to rate limiting or concurrent attempt');
              } else {
                console.log('[App] Auto-login failed:', error?.message);
              }
              // Don't show error - user can manually reconnect if needed
            }
          }
        }
        
        if (authenticated) {
          console.log('[App] Garmin authenticated, syncing health data on app launch');
          try {
            await syncGarminHealthData();
            
            // After syncing Garmin data, check automatic habits for today
            const today = new Date().toISOString().split('T')[0];
            const habits = await loadHabits();
            const activeHabits = habits.filter(h => !h.archived);
            
            await checkAutomaticHabits(today, activeHabits);
            console.log('[App] Automatic habits checked for today');
          } catch (err) {
            console.error('[App] Error syncing Garmin health data or checking automatic habits:', err);
          }
        }
      } catch (err) {
        console.error('[App] Error checking Garmin authentication:', err);
      }
    })();
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
