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
  select.value = applied;

  if (persist) {
    localStorage.setItem('mathchakchak.locale', applied);
    const url = new URL(location.href);
    url.searchParams.set('locale', applied);
    history.replaceState({}, '', url);
  }
}

select.addEventListener('change', () => applyLocale(select.value, true));
document.querySelector('.start-panel button').addEventListener('click', () => {
  notice.textContent = select.value === 'ko' ? '제품 mock에서는 진단 화면 연결을 준비 중입니다.' : 'The diagnostic flow will be connected during feature development.';
  notice.hidden = false;
});

applyLocale(resolveLocale());
