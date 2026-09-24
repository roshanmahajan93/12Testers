/** Brand + static app constants. Tunable business numbers live in the server `config` row. */
export const APP_NAME = '12Testers';
export const PUBLISHER = 'Astralites';
export const SUPPORT_EMAIL = 'support@astralites.app';
export const APP_SCHEME = 'twelvetesters';

/** RevenueCat entitlement that unlocks Pro for developers. */
export const PRO_ENTITLEMENT = 'pro';

export const ANDROID_VERSIONS = Array.from({ length: 11 }, (_, i) => 16 - i); // 16..6

export const COMMON_LANGUAGES = [
  'English',
  'Hindi',
  'Spanish',
  'Portuguese',
  'French',
  'German',
  'Indonesian',
  'Arabic',
  'Bengali',
  'Russian',
  'Japanese',
  'Turkish',
] as const;
