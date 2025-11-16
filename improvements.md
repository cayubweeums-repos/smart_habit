# General


# Habit
- [ ] Add 'preset' habits
    - Morning Caffeine
    - Evening Caffeine
    - In bed on time
    - Awoke on time
    - Light Exercise
    - Moderate Exercise
    - Vigorous Exercise
    - Healthy Meals
    - Heavy Meals
    - Intermittent Fasting
    - Shared Bed
    - Animals in Bed
    - Sleep Sounds
    - Alcohol
    - Late Meals
    - Cold Shower/Bath
    - Journaling
    - Sauna/Steam Room
    - Stretching
    - Sunlight
    - Acupuncture
    - Chiropractor
    - Compression Therapy
    - Cupping
    - Light Therapy
    - Massage Therapy
    - Physical Therapy
    - CPAP Machine
    - Ear Plugs/Headphones (bed time)
    - Light Exercise Before Bed
    - Moderate Exercise Before Bed
    - Vigorous Exercise Before Bed
    - Humidifier Use
    - nasal strips (bed time)
    - Screens before bed
    - allergy symptoms
    - caregiving
    - high altitude
    - illness
    - infant at home
    - injured
    - migraines
    - traveling
- [ ] Add habit categories
    - [ ] Morning time
    - [ ] Health related
    - [ ] Bed time

# Fixes/Bugs

- Setting locations causes both morning and evening notifications to come at once

- Create IPA Package
```bash
Run mkdir -p ./artifacts
  mkdir -p ./artifacts
  cd ./ios
  # First try to find app in archive Products/Applications (proper archive)
  ARCHIVE_PATH=$(find ./build -name "*.xcarchive" -maxdepth 1 | head -1)
  APP_PATH=""
  if [ -n "$ARCHIVE_PATH" ]; then
    ARCHIVE_PATH=$(realpath "$ARCHIVE_PATH" || echo "$ARCHIVE_PATH")
    echo "Found archive: $ARCHIVE_PATH"
    echo "Checking archive Products/Applications..."
    if [ -d "$ARCHIVE_PATH/Products/Applications" ]; then
      APP_PATH=$(find "$ARCHIVE_PATH/Products/Applications" -name "*.app" -type d | head -1)
    fi
  fi
  # Fallback: Check DerivedData build output (if archive didn't work)
  if [ -z "$APP_PATH" ]; then
    echo "Not in archive, checking DerivedData build output..."
    APP_PATH=$(find ./build/DerivedData -name "*.app" -type d -path "*/Build/Products/Release-iphoneos/*" 2>/dev/null | head -1)
  fi
  # Last resort: search anywhere in build directory
  if [ -z "$APP_PATH" ]; then
    echo "Searching all build directories..."
    APP_PATH=$(find ./build -name "*.app" -type d | grep -v ".xcarchive" | head -1)
  fi
  if [ -z "$APP_PATH" ]; then
    echo "Error: No .app bundle found"
    echo "Archive structure:"
    [ -n "$ARCHIVE_PATH" ] && find "$ARCHIVE_PATH" -type d -maxdepth 3 || echo "No archive found"
    echo "DerivedData structure:"
    find ./build/DerivedData -type d -maxdepth 4 2>/dev/null | head -20 || true
    exit 1
  fi
  APP_NAME=$(basename "$APP_PATH")
  echo "Found app: $APP_NAME at $APP_PATH"
  cd ../artifacts
  mkdir -p Payload
  cp -r "$APP_PATH" Payload/
  zip -r smart-habit-1.0.6.ipa Payload
  echo "IPA created successfully"
  shell: /bin/bash -e {0}
Found archive: /Users/runner/work/smart_habit/smart_habit/ios/build/EXApplication.xcarchive
Checking archive Products/Applications...
Not in archive, checking DerivedData build output...
Searching all build directories...
Error: No .app bundle found
Archive structure:
/Users/runner/work/smart_habit/smart_habit/ios/build/EXApplication.xcarchive
/Users/runner/work/smart_habit/smart_habit/ios/build/EXApplication.xcarchive/Products
/Users/runner/work/smart_habit/smart_habit/ios/build/EXApplication.xcarchive/Products/Applications
/Users/runner/work/smart_habit/smart_habit/ios/build/EXApplication.xcarchive/Products/Applications/React-cxxreact_privacy.bundle
/Users/runner/work/smart_habit/smart_habit/ios/build/EXApplication.xcarchive/Products/Applications/ExpoApplication_privacy.bundle
/Users/runner/work/smart_habit/smart_habit/ios/build/EXApplication.xcarchive/Products/Applications/React-Core_privacy.bundle
/Users/runner/work/smart_habit/smart_habit/ios/build/EXApplication.xcarchive/dSYMs
DerivedData structure:
./build/DerivedData
./build/DerivedData/SDKStatCaches.noindex
./build/DerivedData/Logs
./build/DerivedData/Logs/Test
./build/DerivedData/Logs/Launch
./build/DerivedData/Logs/Build
./build/DerivedData/Logs/Package
./build/DerivedData/Logs/Localization
./build/DerivedData/ModuleCache.noindex
./build/DerivedData/ModuleCache.noindex/2N5XDOHDDG21Q
./build/DerivedData/ModuleCache.noindex/23NAUDOK920NI
./build/DerivedData/ModuleCache.noindex/JDL9YWXMW0N0
./build/DerivedData/ModuleCache.noindex/2A3OXW20BOVWG
./build/DerivedData/ModuleCache.noindex/336YZZINPCVLM
./build/DerivedData/ModuleCache.noindex/2RE3JYYOEYM4E
./build/DerivedData/ModuleCache.noindex/UON4H4I5DIDP
./build/DerivedData/ModuleCache.noindex/1AVVCA7VG9TFT
./build/DerivedData/ModuleCache.noindex/2YYIRLO7AZ0G9
./build/DerivedData/ModuleCache.noindex/17KVXH23RKL7M
./build/DerivedData/ModuleCache.noindex/GHR3D8X0VO2J
Error: Process completed with exit code 1.
```

- Build Android APK

```bash
29m 6s
Run # Use all available CPU cores (remove max-workers restriction)
Downloading https://services.gradle.org/distributions/gradle-8.14.3-bin.zip
.............10%.............20%.............30%.............40%.............50%.............60%.............70%.............80%.............90%..............100%
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin/build.gradle.kts:25:3: 'kotlinOptions(KotlinJvmOptionsDeprecated /* = KotlinJvmOptions */.() -> Unit): Unit' is deprecated. Please migrate to the compilerOptions DSL. More details are here: https://kotl.in/u1r8ln
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-settings-plugin/build.gradle.kts:30:3: 'kotlinOptions(KotlinJvmOptionsDeprecated /* = KotlinJvmOptions */.() -> Unit): Unit' is deprecated. Please migrate to the compilerOptions DSL. More details are here: https://kotl.in/u1r8ln
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo-modules-core/expo-module-gradle-plugin/build.gradle.kts:58:3: 'kotlinOptions(KotlinJvmOptionsDeprecated /* = KotlinJvmOptions */.() -> Unit): Unit' is deprecated. Please migrate to the compilerOptions DSL. More details are here: https://kotl.in/u1r8ln
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo-modules-core/expo-module-gradle-plugin/src/main/kotlin/expo/modules/plugin/android/AndroidLibraryExtension.kt:9:24 'var targetSdk: Int?' is deprecated. Will be removed from library DSL in v9.0. Use testOptions.targetSdk or/and lint.targetSdk instead.
[ExpoRootProject] Using the following versions:
  - buildTools:  36.0.0
  - minSdk:      24
  - compileSdk:  36
  - targetSdk:   36
  - ndk:         27.1.12297006
  - kotlin:      2.1.20
  - ksp:         2.1.20-2.0.1
Checking the license for package NDK (Side by side) 27.1.12297006 in /usr/local/lib/android/sdk/licenses
License for package NDK (Side by side) 27.1.12297006 accepted.
Preparing "Install NDK (Side by side) 27.1.12297006 v.27.1.12297006".
"Install NDK (Side by side) 27.1.12297006 v.27.1.12297006" ready.
Installing NDK (Side by side) 27.1.12297006 in /usr/local/lib/android/sdk/ndk/27.1.12297006
"Install NDK (Side by side) 27.1.12297006 v.27.1.12297006" complete.
"Install NDK (Side by side) 27.1.12297006 v.27.1.12297006" finished.

Using expo modules
  - expo-constants (18.0.10)
  - expo-modules-core (3.0.25)
  - [📦] expo-application (7.0.7)
  - [📦] expo-asset (12.0.9)
  - [📦] expo-device (8.0.9)
  - [📦] expo-file-system (19.0.17)
  - [📦] expo-font (14.0.9)
  - [📦] expo-keep-awake (15.0.7)
  - [📦] expo-location (19.0.7)
  - [📦] expo-notifications (0.32.12)
  - [📦] expo-secure-store (15.0.7)

react-native-skia: node_modules/ found at: /home/runner/work/smart_habit/smart_habit/node_modules
react-native-skia: RN Version: 81 / 0.81.5
react-native-skia: isSourceBuild: false
react-native-skia: PrebuiltDir: /home/runner/work/smart_habit/smart_habit/node_modules/@shopify/react-native-skia/android/build/react-native-0*/jni
react-native-skia: buildType: release
react-native-skia: buildDir: /home/runner/work/smart_habit/smart_habit/node_modules/@shopify/react-native-skia/android/build
react-native-skia: node_modules: /home/runner/work/smart_habit/smart_habit/node_modules
react-native-skia: Enable Prefab: true
react-native-skia: aar state post 70, do nothing
The NODE_ENV environment variable is required but was not specified. Ensure the project is bundled with Expo CLI or NODE_ENV is set. Using only .env.local and .env
Checking the license for package CMake 3.22.1 in /usr/local/lib/android/sdk/licenses
License for package CMake 3.22.1 accepted.
Preparing "Install CMake 3.22.1 v.3.22.1".
"Install CMake 3.22.1 v.3.22.1" ready.
Installing CMake 3.22.1 in /usr/local/lib/android/sdk/cmake/3.22.1
"Install CMake 3.22.1 v.3.22.1" complete.
"Install CMake 3.22.1 v.3.22.1" finished.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-safe-area-context/android/src/main/java/com/th3rdwave/safeareacontext/SafeAreaView.kt:59:23 'val uiImplementation: UIImplementation!' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/RNScreensPackage.kt:56:9 The corresponding parameter in the supertype 'BaseReactPackage' is named 'name'. This may cause problems when calling this function with named arguments.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/RNScreensPackage.kt:57:9 The corresponding parameter in the supertype 'BaseReactPackage' is named 'reactContext'. This may cause problems when calling this function with named arguments.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/RNScreensPackage.kt:70:17 'constructor(name: String, className: String, canOverrideExistingModule: Boolean, needsEagerInit: Boolean, hasConstants: Boolean, isCxxModule: Boolean, isTurboModule: Boolean): ReactModuleInfo' is deprecated. This constructor is deprecated and will be removed in the future. Use ReactModuleInfo(String, String, boolean, boolean, boolean, boolean)].
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:48:77 Unchecked cast of '(CoordinatorLayout.Behavior<View!>?..CoordinatorLayout.Behavior<*>?)' to 'BottomSheetBehavior<Screen>'.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:383:36 'fun setTranslucent(screen: Screen, activity: Activity?, context: ReactContext?): Unit' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:402:36 'fun setColor(screen: Screen, activity: Activity?, context: ReactContext?): Unit' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:420:36 'fun setNavigationBarColor(screen: Screen, activity: Activity?): Unit' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/Screen.kt:437:36 'fun setNavigationBarTranslucent(screen: Screen, activity: Activity?): Unit' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:217:31 'var targetElevation: Float' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:220:13 'fun setHasOptionsMenu(p0: Boolean): Unit' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:397:18 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:404:22 'fun onPrepareOptionsMenu(p0: Menu): Unit' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:407:18 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackFragment.kt:412:22 'fun onCreateOptionsMenu(p0: Menu, p1: MenuInflater): Unit' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenStackHeaderConfig.kt:435:18 'val reactNativeHost: ReactNativeHost' is deprecated. You should not use ReactNativeHost directly in the New Architecture. Use ReactHost instead.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:203:14 'var statusBarColor: Int?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:220:14 'var isStatusBarTranslucent: Boolean?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:237:14 'var navigationBarColor: Int?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenViewManager.kt:246:14 'var isNavigationBarTranslucent: Boolean?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:55:42 'fun replaceSystemWindowInsets(p0: Int, p1: Int, p2: Int, p3: Int): WindowInsetsCompat' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:56:39 'val systemWindowInsetLeft: Int' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:58:39 'val systemWindowInsetRight: Int' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:59:39 'val systemWindowInsetBottom: Int' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:102:53 'var statusBarColor: Int' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:106:37 'var statusBarColor: Int?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:113:48 'var statusBarColor: Int' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:116:32 'var statusBarColor: Int' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:162:49 'var isStatusBarTranslucent: Boolean?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:218:43 'var navigationBarColor: Int?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:218:72 'var navigationBarColor: Int' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:224:16 'var navigationBarColor: Int' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:241:55 'var isNavigationBarTranslucent: Boolean?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:283:13 'fun setColor(screen: Screen, activity: Activity?, context: ReactContext?): Unit' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:285:13 'fun setTranslucent(screen: Screen, activity: Activity?, context: ReactContext?): Unit' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:289:13 'fun setNavigationBarColor(screen: Screen, activity: Activity?): Unit' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:290:13 'fun setNavigationBarTranslucent(screen: Screen, activity: Activity?): Unit' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:354:42 'var statusBarColor: Int?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:356:48 'var isStatusBarTranslucent: Boolean?' is deprecated. For apps targeting SDK 35 or above this prop has no effect because edge-to-edge is enabled by default and the status bar is always translucent.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:359:57 'var navigationBarColor: Int?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreenWindowTraits.kt:360:63 'var isNavigationBarTranslucent: Boolean?' is deprecated. For all apps targeting Android SDK 35 or above edge-to-edge is enabled by default.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:7:8 'object ReactFeatureFlags : Any' is deprecated. Use com.facebook.react.internal.featureflags.ReactNativeFeatureFlags instead.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:25:13 'object ReactFeatureFlags : Any' is deprecated. Use com.facebook.react.internal.featureflags.ReactNativeFeatureFlags instead.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:32:9 The corresponding parameter in the supertype 'ReactViewGroup' is named 'left'. This may cause problems when calling this function with named arguments.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:33:9 The corresponding parameter in the supertype 'ReactViewGroup' is named 'top'. This may cause problems when calling this function with named arguments.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:34:9 The corresponding parameter in the supertype 'ReactViewGroup' is named 'right'. This may cause problems when calling this function with named arguments.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:35:9 The corresponding parameter in the supertype 'ReactViewGroup' is named 'bottom'. This may cause problems when calling this function with named arguments.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:71:9 The corresponding parameter in the supertype 'RootView' is named 'childView'. This may cause problems when calling this function with named arguments.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:72:9 The corresponding parameter in the supertype 'RootView' is named 'ev'. This may cause problems when calling this function with named arguments.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:79:46 The corresponding parameter in the supertype 'RootView' is named 'ev'. This may cause problems when calling this function with named arguments.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:83:9 The corresponding parameter in the supertype 'RootView' is named 'childView'. This may cause problems when calling this function with named arguments.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:84:9 The corresponding parameter in the supertype 'RootView' is named 'ev'. This may cause problems when calling this function with named arguments.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/BottomSheetDialogRootView.kt:95:34 The corresponding parameter in the supertype 'RootView' is named 't'. This may cause problems when calling this function with named arguments.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/DimmingView.kt:63:9 The corresponding parameter in the supertype 'ReactCompoundView' is named 'touchX'. This may cause problems when calling this function with named arguments.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/DimmingView.kt:64:9 The corresponding parameter in the supertype 'ReactCompoundView' is named 'touchY'. This may cause problems when calling this function with named arguments.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/DimmingView.kt:68:9 The corresponding parameter in the supertype 'ReactCompoundViewGroup' is named 'touchX'. This may cause problems when calling this function with named arguments.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/bottomsheet/DimmingView.kt:69:9 The corresponding parameter in the supertype 'ReactCompoundViewGroup' is named 'touchY'. This may cause problems when calling this function with named arguments.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/gamma/tabs/TabsHostViewManager.kt:37:9 The corresponding parameter in the supertype 'TabsHostViewManager' is named 'view'. This may cause problems when calling this function with named arguments.
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
Note: Some input files use unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
Note: /home/runner/work/smart_habit/smart_habit/node_modules/@react-native-async-storage/async-storage/android/src/javaPackage/java/com/reactnativecommunity/asyncstorage/AsyncStoragePackage.java uses unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
Starting Metro Bundler
Android ./index.ts ░░░░░░░░░░░░░░░░  0.0% (0/1)
Android ./index.ts ░░░░░░░░░░░░░░░░  4.0% (2/9)
Android ./index.ts ▓▓░░░░░░░░░░░░░░ 14.1% ( 33/149)
Android ./index.ts ▓▓░░░░░░░░░░░░░░ 14.1% ( 67/204)
Android ./index.ts ▓▓▓▓░░░░░░░░░░░░ 25.7% (137/270)
Android ./index.ts ▓▓▓▓▓▓░░░░░░░░░░ 39.2% (243/399)
Android ./index.ts ▓▓▓▓▓▓▓░░░░░░░░░ 45.1% (350/531)
Android ./index.ts ▓▓▓▓▓▓▓▓▓░░░░░░░ 62.4% (484/638)
Android ./index.ts ▓▓▓▓▓▓▓▓▓▓▓░░░░░ 74.8% (581/672)
Android ./index.ts ▓▓▓▓▓▓▓▓▓▓▓▓░░░░ 79.4% (610/686)
Android ./index.ts ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░ 87.2% (695/775)
Android ./index.ts ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░ 90.7% (801/864)
Android ./index.ts ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░ 90.7% (889/936)
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo-modules-core/android/src/main/java/expo/modules/adapters/react/apploader/RNHeadlessAppLoader.kt:48:87 'val reactNativeHost: ReactNativeHost' is deprecated. You should not use ReactNativeHost directly in the New Architecture. Use ReactHost instead.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo-modules-core/android/src/main/java/expo/modules/adapters/react/apploader/RNHeadlessAppLoader.kt:91:85 'val reactNativeHost: ReactNativeHost' is deprecated. You should not use ReactNativeHost directly in the New Architecture. Use ReactHost instead.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo-modules-core/android/src/main/java/expo/modules/adapters/react/apploader/RNHeadlessAppLoader.kt:120:83 'val reactNativeHost: ReactNativeHost' is deprecated. You should not use ReactNativeHost directly in the New Architecture. Use ReactHost instead.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo-modules-core/android/src/main/java/expo/modules/apploader/AppLoaderProvider.kt:34:52 Unchecked cast of 'Class<*>!' to 'Class<out HeadlessAppLoader>'.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/AppContext.kt:30:8 'typealias ErrorManagerModule = JSLoggerModule' is deprecated. Use JSLoggerModule instead.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/AppContext.kt:253:21 'typealias ErrorManagerModule = JSLoggerModule' is deprecated. Use JSLoggerModule instead.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/AppContext.kt:343:21 'val DEFAULT: Int' is deprecated. UIManagerType.DEFAULT will be deleted in the next release of React Native. Use [LEGACY] instead.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/defaultmodules/NativeModulesProxyModule.kt:16:5 'fun Constants(legacyConstantsProvider: () -> Map<String, Any?>): Unit' is deprecated. Use `Constant` or `Property` instead.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/jni/PromiseImpl.kt:65:51 'val errorManager: JSLoggerModule?' is deprecated. Use AppContext.jsLogger instead.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/jni/PromiseImpl.kt:69:22 'fun reportExceptionToLogBox(codedException: CodedException): Unit' is deprecated. Use appContext.jsLogger.error(...) instead.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/views/ViewDefinitionBuilder.kt:464:16 'val errorManager: JSLoggerModule?' is deprecated. Use AppContext.jsLogger instead.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/views/ViewDefinitionBuilder.kt:464:30 'fun reportExceptionToLogBox(codedException: CodedException): Unit' is deprecated. Use appContext.jsLogger.error(...) instead.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/views/ViewManagerDefinition.kt:41:16 'val errorManager: JSLoggerModule?' is deprecated. Use AppContext.jsLogger instead.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/views/ViewManagerDefinition.kt:41:30 'fun reportExceptionToLogBox(codedException: CodedException): Unit' is deprecated. Use appContext.jsLogger.error(...) instead.
Android ./index.ts ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░ 90.7% ( 988/1101)
Note: /home/runner/work/smart_habit/smart_habit/node_modules/react-native-worklets/android/src/main/java/com/swmansion/worklets/WorkletsPackage.java uses unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
Android ./index.ts ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░ 99.5% (1125/1128)
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
Android ./index.ts ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░ 99.9% (1128/1128)
Android Bundled 53124ms index.ts (1128 modules)
Writing bundle output to: /home/runner/work/smart_habit/smart_habit/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle
Writing sourcemap output to: /home/runner/work/smart_habit/smart_habit/android/app/build/intermediates/sourcemaps/react/release/index.android.bundle.packager.map
Copying 19 asset files
Done writing bundle output
Done writing sourcemap output
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo-constants/android/src/main/java/expo/modules/constants/ConstantsModule.kt:12:5 'fun Constants(legacyConstantsProvider: () -> Map<String, Any?>): Unit' is deprecated. Use `Constant` or `Property` instead.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/ExpoModulesPackage.kt:34:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/ExpoReactHostFactory.kt:8:8 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/ExpoReactHostFactory.kt:80:22 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/ReactActivityDelegateWrapper.kt:24:8 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/ReactActivityDelegateWrapper.kt:58:33 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/ReactActivityDelegateWrapper.kt:105:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/ReactActivityDelegateWrapper.kt:105:38 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/ReactActivityDelegateWrapper.kt:113:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/ReactActivityDelegateWrapper.kt:114:21 'val reactInstanceManager: ReactInstanceManager' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/ReactActivityDelegateWrapper.kt:168:36 'constructor(activity: Activity, reactNativeHost: ReactNativeHost?, appKey: String?, launchOptions: Bundle?, fabricEnabled: Boolean): ReactDelegate' is deprecated. Deprecated since 0.81.0, use one of the other constructors instead.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/ReactActivityDelegateWrapper.kt:279:77 'val reactInstanceManager: ReactInstanceManager' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/ReactActivityDelegateWrapper.kt:282:22 'val reactInstanceManager: ReactInstanceManager' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/ReactActivityDelegateWrapper.kt:286:54 'val reactInstanceManager: ReactInstanceManager' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/ReactNativeHostWrapper.kt:6:8 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/ReactNativeHostWrapper.kt:15:9 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/ReactNativeHostWrapper.kt:47:60 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/ReactNativeHostWrapperBase.kt:7:8 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/ReactNativeHostWrapperBase.kt:16:23 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/ReactNativeHostWrapperBase.kt:89:16 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/ReactNativeHostWrapperBase.kt:101:38 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/fetch/ExpoFetchModule.kt:30:39 'constructor(reactContext: ReactContext): ForwardingCookieHandler' is deprecated. Use the default constructor.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/fetch/NativeResponse.kt:42:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/expo/android/src/main/java/expo/modules/fetch/NativeResponse.kt:44:11 'fun deallocate(): Unit' is deprecated. Use sharedObjectDidRelease() instead.
/home/runner/work/smart_habit/smart_habit/node_modules/expo-modules-core/android/src/main/AndroidManifest.xml:8:9-11:45 Warning:
	meta-data#com.facebook.soloader.enabled@android:value was tagged at AndroidManifest.xml:8 to replace other declarations but no other declaration present
package="com.reactnativecommunity.asyncstorage" found in source AndroidManifest.xml: /home/runner/work/smart_habit/smart_habit/node_modules/@react-native-async-storage/async-storage/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.reactnativecommunity.asyncstorage" from the source AndroidManifest.xml: /home/runner/work/smart_habit/smart_habit/node_modules/@react-native-async-storage/async-storage/android/src/main/AndroidManifest.xml.
package="com.th3rdwave.safeareacontext" found in source AndroidManifest.xml: /home/runner/work/smart_habit/smart_habit/node_modules/react-native-safe-area-context/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.th3rdwave.safeareacontext" from the source AndroidManifest.xml: /home/runner/work/smart_habit/smart_habit/node_modules/react-native-safe-area-context/android/src/main/AndroidManifest.xml.
The Daemon will expire after the build after running out of JVM Metaspace.
The project memory settings are likely not configured or are configured to an insufficient value.
The daemon will restart for the next build, which may increase subsequent build times.
These settings can be adjusted by setting 'org.gradle.jvmargs' in 'gradle.properties'.
The currently configured max heap space is '2 GiB' and the configured max metaspace is '512 MiB'.
For more information on how to set these values, please refer to https://docs.gradle.org/8.14.3/userguide/build_environment.html#sec:configuring_jvm_memory in the Gradle documentation.
To disable this warning, set 'org.gradle.daemon.performance.disable-logging=true'.
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
Note: Some input files use unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
package="com.shopify.reactnative.skia" found in source AndroidManifest.xml: /home/runner/work/smart_habit/smart_habit/node_modules/@shopify/react-native-skia/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.shopify.reactnative.skia" from the source AndroidManifest.xml: /home/runner/work/smart_habit/smart_habit/node_modules/@shopify/react-native-skia/android/src/main/AndroidManifest.xml.
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
Note: Some input files use unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
w: file:///home/runner/work/smart_habit/smart_habit/node_modules/react-native-gesture-handler/android/src/main/java/com/swmansion/gesturehandler/react/RNGestureHandlerRootView.kt:41:43 The corresponding parameter in the supertype 'ReactViewGroup' is named 'ev'. This may cause problems when calling this function with named arguments.
/home/runner/work/smart_habit/smart_habit/android/app/src/main/AndroidManifest.xml Warning:
	provider#expo.modules.filesystem.FileSystemFileProvider@android:authorities was tagged at AndroidManifest.xml:0 to replace other declarations but no other declaration present
w: file:///home/runner/work/smart_habit/smart_habit/android/app/src/main/java/com/smarthabit/tracker/MainApplication.kt:9:8 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.
w: file:///home/runner/work/smart_habit/smart_habit/android/app/src/main/java/com/smarthabit/tracker/MainApplication.kt:21:16 This declaration overrides a deprecated member but is not marked as deprecated itself. Add the '@Deprecated' annotation or suppress the diagnostic.
w: file:///home/runner/work/smart_habit/smart_habit/android/app/src/main/java/com/smarthabit/tracker/MainApplication.kt:21:33 'class ReactNativeHost : Any' is deprecated. Deprecated in Java.


[Incubating] Problems report is available at: file:///home/runner/work/smart_habit/smart_habit/android/build/reports/problems/problems-report.html
FAILURE: Build failed with an exception.

Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.

You can use '--warning-mode all' to show the individual deprecation warnings and determine if they come from your own scripts or plugins.

For more on this, please refer to https://docs.gradle.org/8.14.3/userguide/command_line_interface.html#sec:command_line_warnings in the Gradle documentation.

* Where:
Build file '/home/runner/work/smart_habit/smart_habit/android/app/build.gradle' line: 12

* What went wrong:
Configuration cache problems found in this build.

5 problems were found storing the configuration cache.
- Build file 'app/build.gradle': line 12: external process started 'node -e require('expo/scripts/resolveAppEntry') /home/runner/work/smart_habit/smart_habit android absolute'
  See https://docs.gradle.org/8.14.3/userguide/configuration_cache.html#config_cache:requirements:external_processes
- Build file 'app/build.gradle': line 13: external process started 'node --print require.resolve('react-native/package.json')'
  See https://docs.gradle.org/8.14.3/userguide/configuration_cache.html#config_cache:requirements:external_processes
- Build file 'app/build.gradle': line 14: external process started 'node --print require.resolve('react-native/package.json')'
  See https://docs.gradle.org/8.14.3/userguide/configuration_cache.html#config_cache:requirements:external_processes
- Build file 'app/build.gradle': line 15: external process started 'node --print require.resolve('@react-native/codegen/package.json', { paths: [require.resolve('react-native/package.json')] })'
  See https://docs.gradle.org/8.14.3/userguide/configuration_cache.html#config_cache:requirements:external_processes
- Build file 'app/build.gradle': line 20: external process started 'node --print require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })'
  See https://docs.gradle.org/8.14.3/userguide/configuration_cache.html#config_cache:requirements:external_processes

See the complete report at file:///home/runner/work/smart_habit/smart_habit/android/build/reports/configuration-cache/7bqd5w9qzn5221sitr3jlsd1z/51evvxhw8130jxn7x8y6g3g3n/configuration-cache-report.html
> Starting an external process 'node -e require('expo/scripts/resolveAppEntry') /home/runner/work/smart_habit/smart_habit android absolute' during configuration time is unsupported.
> Starting an external process 'node --print require.resolve('react-native/package.json')' during configuration time is unsupported.
> Starting an external process 'node --print require.resolve('react-native/package.json')' during configuration time is unsupported.
> Starting an external process 'node --print require.resolve('@react-native/codegen/package.json', { paths: [require.resolve('react-native/package.json')] })' during configuration time is unsupported.
> Starting an external process 'node --print require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })' during configuration time is unsupported.

* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.

BUILD FAILED in 29m 5s
Configuration cache entry discarded with 5 problems.
Error: Process completed with exit code 1.


```