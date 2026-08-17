export const SUPPORTED_LOCALES = Object.freeze(['ko', 'zh-CN', 'ja', 'en', 'es', 'fr', 'it', 'ru']);
export const DEFAULT_LOCALE = 'en';

export function normalizeLocale(value) {
  if (!value || typeof value !== 'string') return null;
  const exact = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === value.toLowerCase());
  if (exact) return exact;
  const language = value.split('-')[0].toLowerCase();
  return SUPPORTED_LOCALES.find((locale) => locale.split('-')[0].toLowerCase() === language) ?? null;
}

export function resolveLocale({urlLocale, userLocale, cookieLocale, acceptLanguage} = {}) {
  const candidates = [
    ['url', urlLocale],
    ['authenticated_user', userLocale],
    ['locale_cookie', cookieLocale],
    ['accept_language', acceptLanguage?.split(',')[0]?.split(';')[0]]
  ];
  for (const [source, value] of candidates) {
    const locale = normalizeLocale(value);
    if (locale) return {locale, source, fallbackUsed: false};
  }
  return {locale: DEFAULT_LOCALE, source: 'default_locale', fallbackUsed: true};
}
