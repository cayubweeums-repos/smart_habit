// Load environment variables from .env file for local development
// This is optional - environment variables can also be set in the shell or CI/CD
try {
  require('dotenv').config();
} catch (e) {
  // dotenv is optional - if not installed, environment variables must be set another way
}

module.exports = {
  expo: {
    name: "Smart Habit Tracker",
    slug: "smart-habit-tracker",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#1a1a1a"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.smarthabit.tracker",
      infoPlist: {
        UIBackgroundModes: ["location", "processing"],
        NSLocationWhenInUseUsageDescription: "This app needs your location to calculate sunrise and sunset times for habit reminders.",
        NSLocationAlwaysUsageDescription: "This app needs your location to calculate sunrise and sunset times for habit reminders."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#1a1a1a"
      },
      package: "com.smarthabit.tracker",
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "RECEIVE_BOOT_COMPLETED",
        "SCHEDULE_EXACT_ALARM",
        "USE_EXACT_ALARM",
        "POST_NOTIFICATIONS",
        "FOREGROUND_SERVICE"
      ],
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-secure-store",
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#4ade80",
          sounds: []
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "This app needs your location to calculate sunrise and sunset times for habit reminders."
        }
      ],
      "expo-background-task"
    ],
    extra: {
      eas: {
        projectId: "your-project-id"
      },
      // Read OpenWeatherMap API key from environment variable
      // Falls back to empty string if not set (will cause API calls to fail gracefully)
      openWeatherApiKey: process.env.OPENWEATHER_API_KEY || ""
    }
  }
};

