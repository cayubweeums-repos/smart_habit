# Quick Start Guide

Get the Smart Habit Tracker running in 3 minutes!

## 🚀 Fast Setup

```bash
# 1. Install dependencies
npm install

# 2. Start the app
npm start
```

That's it! The app is now running.

## 📱 Run on Your Device

### Option 1: Physical Device (Easiest)
1. Install **Expo Go** app from your app store
2. Scan the QR code shown in terminal
3. App loads instantly on your device

### Option 2: Emulator
```bash
npm run android  # For Android
npm run ios      # For iOS (Mac only)
```

## ✅ First Steps

1. **Tap "Habits" tab** → Create your first habit
2. **Tap "Log" tab** → Mark it complete (✓) or incomplete (✗)
3. **Tap "Charts" tab** → See your progress
4. **Tap "Settings" tab** → Set location for weather & notifications

## 🔧 Optional Configuration

### Add Weather (Optional)
1. Get free API key from [OpenWeatherMap](https://openweathermap.org/api)
2. Edit `src/services/weatherService.ts`
3. Replace `YOUR_API_KEY_HERE` with your key

### Enable Notifications (Optional)
- Go to Settings tab
- Enable "Daily Reminders"
- Set your location
- Get reminded at sunrise and sunset

## 🎨 What You Get

- ✓ **4 Beautiful Screens**: Daily Log, Habits, Charts, Settings
- ✓ **Dark Theme**: Grey/black with green/purple accents
- ✓ **Local Storage**: All data saved on device
- ✓ **Smart Notifications**: Sunrise/sunset reminders
- ✓ **Weather Integration**: Current conditions & sun times
- ✓ **Health Data**: Garmin mock integration (for testing)
- ✓ **Progress Charts**: Visual tracking over time

## 🐛 Issues?

**App won't start?**
```bash
npx expo start --clear
```

**Metro bundler stuck?**
```bash
rm -rf node_modules && npm install
```

**Need more help?** See [SETUP.md](./SETUP.md) for detailed instructions.

---

**Ready to track habits like a pro! 🎯**

