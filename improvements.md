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