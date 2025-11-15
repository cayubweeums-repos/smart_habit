# CI/CD Setup Guide

This guide explains how to set up the automated build and release pipeline for Smart Habit Tracker.

## Prerequisites

1. GitHub repository created
2. Expo account (free tier works)
3. GitHub account with repository access

## Setup Steps

### 1. Create Expo Account

1. Go to [expo.dev](https://expo.dev/)
2. Sign up for a free account
3. Note your username

### 2. Install EAS CLI

```bash
npm install -g eas-cli
```

### 3. Login to EAS

```bash
eas login
```

Enter your Expo credentials.

### 4. Configure EAS Project

```bash
cd /home/cayub/code/personal/smart_habit
eas build:configure
```

This will update `app.json` with your project ID.

### 5. Create Expo Access Token

1. Go to [https://expo.dev/accounts/[your-username]/settings/access-tokens](https://expo.dev/settings/access-tokens)
2. Click "Create Token"
3. Name it "GitHub Actions"
4. Select scopes:
   - `read:projects`
   - `write:projects`
   - `read:builds`
   - `write:builds`
5. Copy the token (you won't see it again!)

### 6. Add GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click "New repository secret"
4. Add the following secrets:

#### EXPO_TOKEN
- Name: `EXPO_TOKEN`
- Value: Paste the access token from step 5

#### GITHUB_TOKEN (Automatic)
- GitHub automatically provides this secret
- No manual setup needed
- Used for creating releases and pushing code

### 7. Update app.json

Make sure your `app.json` has the correct EAS project ID:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-actual-project-id-from-eas-configure"
      }
    }
  }
}
```

### 8. Test the Workflow

#### First, make sure you're on the main branch:

```bash
git checkout main
```

#### Make a commit using conventional commit format:

```bash
git add .
git commit -m "feat: add automated CI/CD pipeline

- Set up EAS Build for APK and IPA generation
- Configure semantic versioning with conventional commits
- Add automated changelog generation
- Create GitHub Actions workflow for releases"
```

#### Push to main:

```bash
git push origin main
```

### 9. Monitor the Build

1. Go to your GitHub repository
2. Click the **Actions** tab
3. You should see the "Build and Release" workflow running
4. It will:
   - Analyze commits for version bump
   - Generate changelog
   - Update version in app.json
   - Trigger builds on Expo
   - Wait for builds to complete
   - Download APK and IPA
   - Create GitHub Release with assets

### 10. Check Expo Dashboard

1. Go to [expo.dev](https://expo.dev/)
2. Click on your project
3. Go to **Builds**
4. You should see Android and iOS builds in progress

## How It Works

### Commit Message Convention

The version bump is determined by commit message types:

- `feat:` → Minor version bump (1.0.0 → 1.1.0)
- `fix:` → Patch version bump (1.0.0 → 1.0.1)
- `BREAKING CHANGE:` → Major version bump (1.0.0 → 2.0.0)
- `docs:`, `chore:`, `style:` → No version bump

### Workflow Triggers

The workflow runs on:
- **Every push to `main`** branch
- **Manual trigger** via GitHub Actions UI

### Build Process

1. **Version Generation**
   - Analyzes commits since last release
   - Determines next version number
   - Generates CHANGELOG.md
   - Creates git tag

2. **Build Apps**
   - Builds Android APK
   - Builds iOS IPA
   - Runs in parallel on Expo's servers

3. **Create Release**
   - Waits for builds to complete
   - Downloads APK and IPA
   - Creates GitHub Release
   - Attaches binaries

### Release Output

After successful workflow:
1. New version tag (e.g., `v1.2.0`)
2. Updated `CHANGELOG.md` in repository
3. GitHub Release with:
   - Release notes (generated from commits)
   - `smart-habit-X.X.X.apk` (Android)
   - `smart-habit-X.X.X.ipa` (iOS)

## Troubleshooting

### Build Fails: "EXPO_TOKEN not found"

- Make sure you added `EXPO_TOKEN` to GitHub Secrets
- Check the token has correct permissions
- Try regenerating the token

### Build Fails: "Project not found"

- Run `eas build:configure` to update project ID
- Commit and push the updated `app.json`

### No Release Created

- Check that commits follow conventional commit format
- Only `feat:`, `fix:`, `perf:`, and `BREAKING CHANGE` trigger releases
- Check GitHub Actions logs for errors

### Builds Take Too Long

- Expo builds typically take 10-20 minutes
- Adjust the wait time in `.github/workflows/release.yml` if needed
- You can check build status on expo.dev

### iOS Build Fails

- iOS builds may require Apple Developer account
- Free Expo tier includes limited iOS builds per month
- Consider building iOS locally with `eas build --platform ios --local`

## Manual Release

If you need to manually create a release:

```bash
# Build locally
eas build --platform android --profile production
eas build --platform ios --profile production

# Download builds
eas build:download --latest

# Create release manually on GitHub
# Upload the APK and IPA files
```

## Cost Considerations

### Expo EAS Build

- **Free tier**: 30 builds/month (Android + iOS combined)
- **Production tier**: $29/month for unlimited builds
- This setup uses ~2 builds per release (1 Android + 1 iOS)

### GitHub Actions

- **Free for public repositories**: Unlimited minutes
- **Private repositories**: 2,000 minutes/month free

## Next Steps

1. ✅ Set up Expo account and EAS CLI
2. ✅ Configure project with `eas build:configure`
3. ✅ Add EXPO_TOKEN to GitHub Secrets
4. ✅ Make a conventional commit and push
5. ✅ Monitor workflow in GitHub Actions
6. ✅ Download app from GitHub Releases!

## Support

For issues:
- Check [Expo documentation](https://docs.expo.dev/build/introduction/)
- Review [semantic-release docs](https://semantic-release.gitbook.io/)
- Open an issue in the repository

