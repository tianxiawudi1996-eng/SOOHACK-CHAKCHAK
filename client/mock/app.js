import {accessibilityMessage} from '../i18n/accessibility.mjs?v=0.1.0-phase21';
import {installSkipLinkFocus} from '../accessibility/interaction.mjs?v=0.1.0-phase22';

const supported = ['ko', 'zh-CN', 'ja', 'en', 'es', 'fr', 'it', 'ru'];
const fallback = 'en';
const select = document.querySelector('#localeSelect');
const notice = document.querySelector('#notice');

const normalize = (value = '') => {
  const exact = supported.find((locale) => locale.toLowerCase() === value.toLowerCase());
  if (exact) return exact;
  const language = value.split('-')[0].toLowerCase();
  return supported.find((locale) => locale.split('-')[0].toLowerCase() === language) || null;
};

const resolveLocale = () => {
  const query = new URLSearchParams(location.search).get('locale');
  const persisted = localStorage.getItem('mathchakchak.locale');
  return normalize(query) || normalize(persisted) || normalize(navigator.language) || fallback;
};

async function loadMessages(locale) {
  const response = await fetch(`../i18n/messages/${locale}.json`);
  if (!response.ok) throw new Error(`locale ${locale} unavailable`);
  return response.json();
}

async function applyLocale(locale, persist = false) {
  let messages;
  let applied = locale;
  try {
    messages = await loadMessages(locale);
  } catch {
    applied = fallback;
    messages = await loadMessages(fallback);
    notice.textContent = `Translation unavailable. Showing ${fallback}.`;
    notice.hidden = false;
  }

  document.documentElement.lang = applied;
  document.title = messages['meta.title'];
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const translated = messages[element.dataset.i18n];
    if (translated) element.textContent = translated;
  });
  document.querySelectorAll('[data-a11y-text]').forEach((element) => { element.textContent=accessibilityMessage(applied,element.dataset.a11yText); });
  document.querySelectorAll('[data-a11y-aria]').forEach((element) => { element.setAttribute('aria-label',accessibilityMessage(applied,element.dataset.a11yAria)); });
  document.querySelectorAll('[data-a11y-alt]').forEach((element) => { element.setAttribute('alt',accessibilityMessage(applied,element.dataset.a11yAlt)); });
  select.value = applied;

  if (persist) {
    localStorage.setItem('mathchakchak.locale', applied);
    const url = new URL(location.href);
    url.searchParams.set('locale', applied);
    history.replaceState({}, '', url);
  }
}

installSkipLinkFocus();
select.addEventListener('change', () => applyLocale(select.value, true));

applyLocale(resolveLocale());
