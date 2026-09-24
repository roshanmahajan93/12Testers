import fs from 'node:fs';
import path from 'node:path';

import type { ConfigContext, ExpoConfig } from 'expo/config';

// Keep in sync with APP_NAME in src/lib/constants.ts.
const APP_NAME = '12Testers';
const BUNDLE_ID = 'com.twelvetesters';

// FCM credentials are required for Expo push on Android. The file is optional during
// local JS development so prebuild does not fail before Firebase is configured.
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON ?? './google-services.json';
const hasGoogleServices = fs.existsSync(path.resolve(__dirname, googleServicesFile));

// Appwrite's OAuth token flow redirects to `appwrite-callback-<projectId>://` — register that scheme.
const appwriteProjectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const schemes = appwriteProjectId ? ['twelvetesters', `appwrite-callback-${appwriteProjectId}`] : ['twelvetesters'];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: 'twelvetesters',
  owner: process.env.EAS_OWNER,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: schemes,
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: BUNDLE_ID,
    supportsTablet: false,
    infoPlist: {
      NSCameraUsageDescription: 'Take a screenshot proof of today’s test task.',
      NSPhotoLibraryUsageDescription: 'Attach screenshots to your daily test tasks and feedback.',
    },
  },
  android: {
    package: BUNDLE_ID,
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#0B0B14',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    ...(hasGoogleServices ? { googleServicesFile } : {}),
    // Never request QUERY_ALL_PACKAGES — Play restricts it and we do not need it. We also don't
    // record audio or draw over other apps.
    blockedPermissions: [
      'android.permission.QUERY_ALL_PACKAGES',
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-dev-client',
    'expo-localization',
    'expo-font',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0B0B14',
        image: './assets/images/splash-icon.png',
        imageWidth: 96,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/images/notification-icon.png',
        color: '#7C5CFF',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Attach screenshots to your daily test tasks and feedback.',
        cameraPermission: 'Take a screenshot proof of today’s test task.',
        microphonePermission: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
});
