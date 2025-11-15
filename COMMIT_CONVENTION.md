# Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automatic versioning and changelog generation.

## Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

## Types

- **feat**: A new feature (triggers MINOR version bump)
- **fix**: A bug fix (triggers PATCH version bump)
- **perf**: Performance improvement (triggers PATCH version bump)
- **refactor**: Code refactoring (triggers PATCH version bump)
- **docs**: Documentation changes only (no version bump)
- **style**: Code style changes (no version bump)
- **test**: Adding or updating tests (no version bump)
- **chore**: Maintenance tasks (no version bump)
- **BREAKING CHANGE**: Breaking changes (triggers MAJOR version bump)

## Examples

### Feature (Minor Version Bump: 1.0.0 → 1.1.0)
```bash
git commit -m "feat: add distance unit preferences (km/miles)"
git commit -m "feat(settings): add manual location entry"
```

### Bug Fix (Patch Version Bump: 1.0.0 → 1.0.1)
```bash
git commit -m "fix: resolve location services detection on Android"
git commit -m "fix(charts): correct habit selection modal behavior"
```

### Breaking Change (Major Version Bump: 1.0.0 → 2.0.0)
```bash
git commit -m "feat!: redesign habit tracking interface

BREAKING CHANGE: Habit data structure has changed. Users will need to re-enter habits."
```

### Documentation (No Version Bump)
```bash
git commit -m "docs: update README with setup instructions"
```

### Chore (No Version Bump)
```bash
git commit -m "chore: update dependencies"
```

## Scopes (Optional)

Use scopes to specify which part of the app changed:
- `habits` - Habit management
- `daily-log` - Daily logging screen
- `charts` - Charts and statistics
- `settings` - Settings and integrations
- `weather` - Weather service
- `garmin` - Garmin integration
- `notifications` - Notifications system

## Multi-line Commits

For detailed descriptions:

```bash
git commit -m "feat(weather): add OpenWeather One Call API 3.0 support

- Updated weather service to use One Call API
- Added forecast and alerts display
- Implemented configurable temperature and precipitation units
- Added distance unit preferences

Closes #123"
```

## Tips

1. **Use present tense**: "add feature" not "added feature"
2. **Be concise**: Keep subject line under 72 characters
3. **Reference issues**: Use "Closes #123" or "Fixes #456" in the body
4. **Group related changes**: Make atomic commits

## Automation

When you push to `main`:
1. Semantic Release analyzes commit messages
2. Determines next version number
3. Generates CHANGELOG.md
4. Creates Git tag
5. Triggers APK/IPA builds
6. Creates GitHub Release with binaries

