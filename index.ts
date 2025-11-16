import { registerRootComponent } from 'expo';
import 'expo-task-manager';

// Import background task module to ensure task is defined before app starts
// This must be imported before App to ensure TaskManager.defineTask executes
import './src/services/backgroundWeatherTask';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
