# Contributing to Smart Habit Tracker

Thank you for considering contributing to the Smart Habit Tracker! This document provides guidelines and information for contributors.

## 🎯 How Can You Contribute?

### Reporting Bugs
- Use GitHub Issues to report bugs
- Include detailed steps to reproduce
- Provide device/platform information
- Include screenshots if applicable

### Suggesting Features
- Open an issue with the "feature request" label
- Describe the feature and its benefits
- Explain use cases

### Code Contributions
- Fork the repository
- Create a feature branch
- Follow the coding standards below
- Submit a pull request

## 🏗 Project Structure

### Directory Organization
```
src/
├── components/    # Reusable UI components
├── navigation/    # Navigation setup
├── screens/       # Main app screens
├── services/      # External API integrations
├── storage/       # Data persistence layer
├── theme/         # Colors and styles
├── types/         # TypeScript interfaces
└── utils/         # Helper functions
```

### Key Principles
- **Modularity**: Each file has a single responsibility
- **Type Safety**: Use TypeScript for all code
- **Consistency**: Follow existing patterns
- **Documentation**: Comment complex logic

## 💻 Development Setup

### Prerequisites
```bash
node >= 16
npm >= 8
expo-cli
```

### Local Setup
```bash
# Clone the repo
git clone <repo-url>
cd smart_habit

# Install dependencies
npm install

# Start development server
npm start
```

## 📝 Coding Standards

### TypeScript
- Use explicit types for function parameters and returns
- Avoid `any` type
- Use interfaces for object shapes
- Export types from `src/types/`

### React Components
```typescript
// Functional components with TypeScript
import React from 'react';
import { View, Text } from 'react-native';

interface MyComponentProps {
  title: string;
  onPress: () => void;
}

export default function MyComponent({ title, onPress }: MyComponentProps) {
  return (
    <View>
      <Text>{title}</Text>
    </View>
  );
}
```

### Styling
- Use the theme from `src/theme/`
- Create reusable styles in `commonStyles`
- Component-specific styles at bottom of file
- Use StyleSheet.create() for performance

```typescript
import { colors, spacing, borderRadius, fontSize } from '../theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.grey,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
});
```

### Naming Conventions
- **Files**: PascalCase for components, camelCase for utilities
  - `HabitsScreen.tsx`, `dateUtils.ts`
- **Components**: PascalCase
  - `function HabitCard() {}`
- **Variables/Functions**: camelCase
  - `const habitList = []`
  - `function loadHabits() {}`
- **Constants**: UPPER_SNAKE_CASE
  - `const API_KEY = 'xxx'`
- **Types/Interfaces**: PascalCase
  - `interface HabitEntry {}`

### File Organization
```typescript
// 1. Imports (React, libraries, local)
import React, { useState } from 'react';
import { View } from 'react-native';
import { colors } from '../theme';

// 2. Types/Interfaces
interface MyScreenProps {}

// 3. Component
export default function MyScreen() {
  // 4. Hooks
  const [state, setState] = useState();
  
  // 5. Functions
  const handlePress = () => {};
  
  // 6. Render
  return <View />;
}

// 7. Styles
const styles = StyleSheet.create({});
```

## 🧪 Testing

### Manual Testing
- Test on both iOS and Android
- Test on physical devices
- Verify all user flows
- Check empty states
- Test error scenarios

### Before Submitting PR
```bash
# Check TypeScript
npx tsc --noEmit

# Start app and verify no errors
npm start

# Test on device
npm run android  # or ios
```

## 🎨 Design Guidelines

### Color Usage
- Primary backgrounds: `colors.greyDark`, `colors.grey`
- Text: `colors.white`, `colors.greyVeryLight`
- Success/Complete: `colors.green`, `colors.greenLight`
- Accents: `colors.purple`, `colors.purpleLight`
- Errors: `colors.error`

### Spacing
- Use theme spacing constants
- Consistent padding/margins
- `spacing.md` for most content
- `spacing.lg` for screen padding

### Typography
- Titles: `fontSize.xxl`, `fontWeight.bold`
- Headers: `fontSize.lg`, `fontWeight.semibold`
- Body: `fontSize.md`, `fontWeight.normal`
- Small: `fontSize.sm`

## 🚀 Adding New Features

### New Screen
1. Create screen file in `src/screens/`
2. Export from `src/screens/index.ts`
3. Add to navigation in `src/navigation/MainNavigator.tsx`
4. Update types if needed

### New API Integration
1. Create service file in `src/services/`
2. Define types in `src/types/`
3. Add to service index
4. Implement error handling
5. Document in README

### New Data Model
1. Define interface in `src/types/`
2. Add storage functions in `src/storage/`
3. Export from respective index files
4. Update screens to use new model

## 📚 Documentation

### Code Comments
- Explain "why" not "what"
- Document complex algorithms
- Add JSDoc for public functions

```typescript
/**
 * Calculate sunrise and sunset times for a given location
 * @param date - The date to calculate for
 * @param latitude - Latitude in degrees
 * @param longitude - Longitude in degrees
 * @returns Object with sunrise and sunset Date objects
 */
export function getSunTimes(date: Date, latitude: number, longitude: number) {
  // Implementation
}
```

### README Updates
- Update feature list for new features
- Add setup steps if needed
- Document new environment variables
- Update screenshots if UI changes

## 🔄 Pull Request Process

### Before Creating PR
1. Ensure code follows style guide
2. Test on physical devices
3. Update documentation
4. Check for TypeScript errors
5. Verify no console warnings

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested on iOS
- [ ] Tested on Android
- [ ] Tested edge cases

## Screenshots (if applicable)
Add screenshots here
```

## 🐛 Bug Fix Guidelines

### Investigation
1. Reproduce the bug consistently
2. Identify root cause
3. Check if it affects other areas
4. Consider side effects of fix

### Implementation
1. Make minimal changes
2. Add defensive checks
3. Test thoroughly
4. Document the fix

## 🎯 Feature Development Guidelines

### Planning
1. Discuss feature in issue first
2. Consider impact on existing features
3. Plan data model changes
4. Design UI mockups if applicable

### Implementation
1. Start with types/interfaces
2. Implement storage layer
3. Create service functions
4. Build UI components
5. Wire up with navigation
6. Test end-to-end

## ⚡ Performance Considerations

### Best Practices
- Use `useMemo` for expensive calculations
- Use `useCallback` for event handlers
- Implement `FlatList` for long lists
- Avoid inline styles in renders
- Optimize images and assets

### Memory Management
- Clean up listeners in `useEffect`
- Avoid memory leaks
- Clear intervals/timeouts
- Cancel pending requests on unmount

## 🔒 Security Guidelines

### Data Handling
- Use SecureStore for sensitive data
- Don't log sensitive information
- Validate user input
- Sanitize API responses

### API Keys
- Never commit API keys
- Use environment variables
- Document in .env.example
- Rotate keys if exposed

## 🤝 Community Guidelines

### Be Respectful
- Be kind and courteous
- Accept constructive criticism
- Focus on code, not people
- Help newcomers

### Communication
- Use clear, concise language
- Provide context in issues/PRs
- Respond to feedback promptly
- Ask questions when unsure

## 📞 Getting Help

### Resources
- Check existing issues
- Review documentation
- Search Expo docs
- Ask in discussions

### Contact
- Open an issue for bugs
- Start a discussion for questions
- Tag maintainers if urgent

---

Thank you for contributing to Smart Habit Tracker! 🎉

