# Smart Habit Tracker

A cross-platform React Native habit tracking app with weather and health data integrations. Built with Expo, TypeScript, and modern UI/UX principles.

[![Latest Release](https://img.shields.io/github/v/release/cayub/smart_habit)](https://github.com/cayub/smart_habit/releases/latest)
[![License](https://img.shields.io/github/license/cayub/smart_habit)](LICENSE)

## 📥 Installation

### Download Pre-built Apps

**Android Users:**
1. Go to [Releases](https://github.com/cayub/smart_habit/releases/latest)
2. Download the latest `smart-habit-X.X.X.apk` file
3. Open the APK on your Android device
4. Allow installation from unknown sources if prompted
5. Install and enjoy!

**iOS Users:**
1. Go to [Releases](https://github.com/cayub/smart_habit/releases/latest)
2. Download the latest `smart-habit-X.X.X.ipa` file
3. Sideload using tools like:
   - [AltStore](https://altstore.io/)
   - [Sideloadly](https://sideloadly.io/)
   - Apple Developer account with Xcode

> **Note**: iOS requires sideloading as the app is not on the App Store yet.

## Features

### Core Functionality
- **Habit Management**: Create, edit, and delete habits with customizable colors and descriptions
- **Daily Logging**: Simple checkmark (✓) or X (✗) interface for quick habit tracking
- **Progress Visualization**: Beautiful charts showing habit completion trends over time
- **Local Data Storage**: All habit data saved locally on your device using AsyncStorage

### Smart Integrations
- **Weather Integration**: Set your location to view current weather conditions
- **Sunrise/Sunset Notifications**: Automatic reminders at sunrise and sunset based on your location
- **Garmin Health Data**: Connect to Garmin to view your daily step count (mock implementation for testing)

### UI/UX
- **Dark Theme**: Elegant grey and black color scheme with green and purple accents
- **Intuitive Interface**: Simple, clean design with large touch targets
- **Smooth Animations**: Responsive interactions for habit logging
- **Progress Tracking**: Real-time completion percentage and streak tracking

## Tech Stack

- **React Native** with **Expo** (SDK 54)
- **TypeScript** for type safety
- **React Navigation** for screen navigation
- **AsyncStorage** for local data persistence
- **Expo Notifications** for sunrise/sunset reminders
- **Expo Location** for location services
- **React Native Chart Kit** for data visualization
- **Axios** for API calls

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator (or Expo Go app on your phone)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd smart_habit
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on your preferred platform:
```bash
npm run android  # For Android
npm run ios      # For iOS (macOS only)
npm run web      # For web browser
```

## Configuration

### Weather API
To use the weather integration:
1. Get a free API key from [OpenWeatherMap](https://openweathermap.org/api)
2. Open `src/services/weatherService.ts`
3. Replace `YOUR_API_KEY_HERE` with your actual API key

### Garmin Connect API
The Garmin integration currently uses mock data for testing. To implement real Garmin authentication:
1. Register your app at [Garmin Developer Portal](https://developer.garmin.com/)
2. Get your Consumer Key and Consumer Secret
3. Implement OAuth 1.0a flow in `src/services/garminService.ts`
4. See comments in the file for detailed instructions

## Project Structure

```
smart_habit/
├── src/
│   ├── components/       # Reusable UI components
│   ├── navigation/       # Navigation configuration
│   ├── screens/          # Main app screens
│   │   ├── HabitsScreen.tsx       # Habit management
│   │   ├── DailyLogScreen.tsx     # Daily habit logging
│   │   ├── ChartsScreen.tsx       # Progress visualization
│   │   └── SettingsScreen.tsx     # Settings & integrations
│   ├── services/         # API integrations
│   │   ├── weatherService.ts      # Weather API
│   │   ├── garminService.ts       # Garmin Connect API
│   │   └── notificationService.ts # Push notifications
│   ├── storage/          # Local storage utilities
│   │   ├── habitStorage.ts        # Habit data management
│   │   └── settingsStorage.ts     # App settings
│   ├── types/            # TypeScript interfaces
│   ├── utils/            # Helper functions
│   │   ├── sunCalc.ts             # Sunrise/sunset calculations
│   │   └── dateUtils.ts           # Date formatting utilities
│   └── theme/            # Color scheme and styling
├── App.tsx               # App entry point
└── package.json
```

## Key Features Explained

### Habit Tracking
- Add new habits with names, descriptions, and custom colors
- Long-press to delete habits
- Archive habits instead of permanent deletion
- Quick edit by tapping on any habit

### Daily Logging
- View all habits for the current day
- Simple two-button interface: ✓ for completed, ✗ for not completed
- Real-time progress indicator
- Celebration message when all habits are completed

### Progress Charts
- Line charts showing completion trends over 7, 30, or 90 days
- Current streak and longest streak tracking
- Completion percentage calculation
- Per-habit statistics and summaries

### Notifications
- Automatic sunrise and sunset time calculation based on location
- Daily reminders at sunrise (morning) and sunset (evening)
- Deep linking to daily log screen when notification is tapped
- Easy enable/disable in settings

## Color Scheme

- **Primary**: Blacks (#000000, #0d0d0d) and Greys (#1a1a1a, #2d2d2d, #404040)
- **Accent Green**: #4ade80 (light), #22c55e (primary)
- **Accent Purple**: #a855f7 (light), #9333ea (primary)
- **Success**: #22c55e
- **Error**: #ef4444

## Data Storage

All data is stored locally on the device:
- **Habits**: Stored in AsyncStorage under `@habits` key
- **Daily Logs**: Stored in AsyncStorage under `@daily_logs` key
- **Location Settings**: Stored in AsyncStorage under `@location_settings` key
- **Garmin Tokens**: Stored securely in Expo SecureStore

## Future Enhancements

- [ ] Real Garmin Connect API integration
- [ ] Export habit data to CSV/JSON
- [ ] Cloud sync across devices
- [ ] Custom notification times
- [ ] Habit categories and tags
- [ ] Weekly/monthly reports
- [ ] Social features (share progress)
- [ ] Habit templates and suggestions
- [ ] Dark/light theme toggle
- [ ] Widget support

## Troubleshooting

### Notifications not working
- Ensure location permissions are granted
- Check that notifications are enabled in Settings
- Make sure you're testing on a physical device (notifications don't work on iOS simulator)

### Weather not loading
- Verify you have a valid API key in `weatherService.ts`
- Check internet connection
- Ensure location permissions are granted

### Charts not displaying
- Make sure you have logged habits for at least a few days
- Try switching between different time ranges (7D, 30D, 90D)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Acknowledgments

- Weather data provided by [OpenWeatherMap](https://openweathermap.org/)
- Health data integration inspired by Garmin Connect API
- Sunrise/sunset calculations based on astronomical algorithms

