import * as Device from 'expo-device';
import { getCalendars, getLocales } from 'expo-localization';

import { COMMON_LANGUAGES } from './constants';

export function deviceTimeZone(): string {
  return getCalendars()[0]?.timeZone ?? 'UTC';
}

/** Android major version (e.g. "14" → 14) or null on iOS/web/unknown. */
export function androidMajorVersion(): number | null {
  if (Device.osName !== 'Android' || !Device.osVersion) return null;
  const major = parseInt(Device.osVersion.split('.')[0] ?? '', 10);
  return Number.isFinite(major) ? major : null;
}

export function deviceModelName(): string {
  const parts = [Device.manufacturer, Device.modelName].filter(Boolean) as string[];
  // Avoid "Google Google Pixel 8".
  if (parts.length === 2 && parts[1]!.toLowerCase().startsWith(parts[0]!.toLowerCase())) return parts[1]!;
  return parts.join(' ') || 'Android phone';
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  es: 'Spanish',
  pt: 'Portuguese',
  fr: 'French',
  de: 'German',
  id: 'Indonesian',
  ar: 'Arabic',
  bn: 'Bengali',
  ru: 'Russian',
  ja: 'Japanese',
  tr: 'Turkish',
};

export function deviceLanguages(): string[] {
  const names = getLocales()
    .map((l) => LANGUAGE_NAMES[l.languageCode ?? ''])
    .filter((n): n is (typeof COMMON_LANGUAGES)[number] => !!n);
  return names.length ? [...new Set(names)] : ['English'];
}

export function deviceRegion(): string {
  return getLocales()[0]?.regionCode ?? '';
}

export function deviceInfoString(): string {
  const v = androidMajorVersion();
  return `${deviceModelName()}${v ? ` · Android ${v}` : ` · ${Device.osName ?? ''} ${Device.osVersion ?? ''}`}`.trim();
}
