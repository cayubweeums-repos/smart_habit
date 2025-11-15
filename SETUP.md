# Setup Guide

This guide will help you get the Smart Habit Tracker app up and running on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **Expo CLI** - Will be installed via npx

For mobile development:
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)
- Or **Expo Go** app on your physical device

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React Native and Expo
- React Navigation
- AsyncStorage
- Notification and Location services
- Chart libraries

### 2. Configure API Keys

#### Weather API (Required for weather features)

1. Visit [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Navigate to API Keys section
4. Copy your API key
5. Open `src/services/weatherService.ts`
6. Replace `YOUR_API_KEY_HERE` with your actual API key:

```typescript
const OPENWEATHER_API_KEY = 'your_actual_api_key';
```

#### Garmin Connect API (Optional - currently uses mock data)

The app currently uses mock data for Garmin integration. To implement real Garmin authentication:

1. Register at [Garmin Developer Portal](https://developer.garmin.com/)
2. Create a new application
3. Get your Consumer Key and Consumer Secret
4. Follow the implementation guide in `src/services/garminService.ts`

### 3. Running the App

Start the development server:

```bash
npm start
```

This will start Expo and show you a QR code. You can then:

#### Option A: Run on Physical Device (Recommended)
1. Install **Expo Go** from App Store (iOS) or Play Store (Android)
2. Scan the QR code with your camera (iOS) or Expo Go app (Android)
3. The app will load on your device

#### Option B: Run on Emulator/Simulator

**For Android:**
```bash
npm run android
```
- Requires Android Studio with Android SDK installed
- Emulator should be running before executing command

**For iOS (macOS only):**
```bash
npm run ios
```
- Requires Xcode installed
- iOS Simulator will launch automatically

**For Web:**
```bash
npm run web
```
- Opens in your default browser
- Note: Some features (notifications, location) may not work on web

## Testing the App

### Initial Setup Flow

1. **Open the app** - You'll see the Daily Log screen (empty at first)
2. **Navigate to Habits tab** - Tap "Add Habit" to create your first habit
3. **Create a habit** - Enter name, description, and pick a color
4. **Return to Log tab** - Your habit now appears for today
5. **Log your habit** - Tap ✓ for completed or ✗ for not completed
6. **View Progress** - Go to Charts tab to see your statistics

### Testing Weather Integration

1. Navigate to **Settings** tab
2. Tap **Set Location**
3. Choose "Use Current Location" or enter a city manually
4. View current weather and sunrise/sunset times
5. Enable notifications to get reminders at sunrise/sunset

### Testing Garmin Integration (Mock)

1. Navigate to **Settings** tab
2. Scroll to **Garmin Health Data** section
3. Tap **Connect Garmin (Mock)**
4. View mock step count and health data
5. This demonstrates how real Garmin data would appear

## Troubleshooting

### "Unable to resolve module" errors
```bash
npm install
npx expo start --clear
```

### Metro bundler issues
```bash
rm -rf node_modules
npm install
npx expo start --clear
```

### iOS build fails
```bash
cd ios
pod install
cd ..
npm run ios
```

### Android build fails
- Check Android Studio is properly installed
- Ensure Android SDK is configured
- Start Android Emulator before running `npm run android`

### Notifications not working
- Notifications only work on physical devices (not iOS simulator)
- Ensure you've granted notification permissions
- Check that location is set (required for sunrise/sunset times)

### Location permission denied
- Go to device Settings → Apps → Smart Habit Tracker → Permissions
- Enable Location permission
- Restart the app

## Development Tips

### Hot Reload
- Shake your device to open developer menu
- Enable "Fast Refresh" for automatic reloading on code changes

### Debugging
- Use React Native Debugger
- Or open Chrome DevTools via developer menu

### Viewing Logs
- Logs appear in the terminal running `npm start`
- Or use `npx expo logs` for more detailed logs

### Testing on Multiple Devices
- The Expo Dev Tools show a QR code
- Multiple devices can scan the same QR code
- All devices will receive updates when code changes

## Building for Production

### Android APK
```bash
npm install -g eas-cli
eas build -p android
```

### iOS App
```bash
eas build -p ios
```

For detailed build instructions, see [Expo EAS Build documentation](https://docs.expo.dev/build/introduction/).

## Next Steps

After getting the app running:

1. **Explore the Code** - Check out the well-organized `src/` directory
2. **Customize Theme** - Modify colors in `src/theme/colors.ts`
3. **Add Features** - The modular structure makes it easy to extend
4. **Contribute** - Submit pull requests with improvements

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [React Navigation Docs](https://reactnavigation.org/docs/getting-started)
- [AsyncStorage Guide](https://react-native-async-storage.github.io/async-storage/)

## Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review the [README.md](./README.md) for feature documentation
3. Check Expo documentation for platform-specific issues
4. Search existing GitHub issues
5. Create a new issue with detailed error messages

---

Happy habit tracking! 🎯

