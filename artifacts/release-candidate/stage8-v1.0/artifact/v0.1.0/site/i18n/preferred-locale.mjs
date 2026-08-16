const STORAGE_KEY = 'mathchakchak.locale';

export function readPreferredLocale() {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function writePreferredLocale(locale) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, locale);
  } catch {
    // A blocked storage context should not prevent the learner from continuing.
  }
}
