/**
 * Public runtime config. Only EXPO_PUBLIC_* values are allowed in the app bundle.
 * Each variable must be read with a static `process.env.EXPO_PUBLIC_X` expression so Metro inlines it.
 */
export const env = {
  appwriteEndpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ?? '',
  appwriteProjectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? '',
  appwriteDatabaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID ?? 'main',
  /** Optional: the Appwrite Messaging FCM provider id (when the project has more than one). */
  appwriteFcmProviderId: process.env.EXPO_PUBLIC_APPWRITE_FCM_PROVIDER_ID ?? '',
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL ?? '',
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? '',
  accountDeletionUrl: process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL ?? '',
} as const;

export const isBackendConfigured = Boolean(env.appwriteEndpoint && env.appwriteProjectId);
