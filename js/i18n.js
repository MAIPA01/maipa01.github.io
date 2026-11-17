/* =========================================================
   Translations.
   - Interface texts: data/i18n/<code>.json, used by data-i18n="key" in index.html (and t('key') in JS).
   - Content texts in data/*.json: a string OR {"en": "...", "pl": "..."} → tr(value).
   - Missing translations fall back to the default language and are listed in the console.
   ========================================================= */

const LANG_FILE = 'data/i18n/languages.json';
const STORAGE_KEY = 'maipa-lang';

const state = { def: 'en', lang: 'en', languages: [], codes: [], strings: {}, listeners: [] };

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

async function loadJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

async function loadStrings(code) {
  if (!state.strings[code]) {
    try { state.strings[code] = await loadJSON(`data/i18n/${code}.json`); }
    catch (err) { console.warn(`[i18n] missing data/i18n/${code}.json`, err); state.strings[code] = {}; }
  }
  return state.strings[code];
}

function pickLanguage() {
  const ok = (c) => c && state.codes.includes(c);
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (ok(fromUrl)) return fromUrl;
  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* storage blocked */ }
  if (ok(saved)) return saved;
  for (const l of navigator.languages || [navigator.language]) {
    const c = String(l).toLowerCase().split('-')[0];
    if (ok(c)) return c;
  }
  return state.def;
}

export async function initI18n() {
  let cfg;
  try { cfg = await loadJSON(LANG_FILE); } catch { cfg = { default: 'en', languages: [{ code: 'en', label: 'English', short: 'EN' }] }; }
  state.languages = cfg.languages || [];
  state.codes = state.languages.map((l) => l.code);
  state.def = cfg.default || state.codes[0] || 'en';
  state.lang = pickLanguage();
  await Promise.all([loadStrings(state.def), loadStrings(state.lang)]);
  document.documentElement.lang = state.lang;
}

export async function setLanguage(code) {
  if (!state.codes.includes(code) || code === state.lang) return;
  await loadStrings(code);
  state.lang = code;
  document.documentElement.lang = code;
  try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  const url = new URL(location.href);
  if (url.searchParams.has('lang')) { url.searchParams.set('lang', code); history.replaceState(null, '', url); }
  state.listeners.forEach((fn) => fn(code));
}

export const onLanguageChange = (fn) => state.listeners.push(fn);
export const currentLanguage = () => state.lang;
export const defaultLanguage = () => state.def;
export const languages = () => state.languages;

/** Interface string from data/i18n/<lang>.json */
export function t(key, fallback) {
  const v = get(state.strings[state.lang], key) ?? get(state.strings[state.def], key);
  return v ?? fallback ?? key;
}
/** Interface object (e.g. all "game" texts) merged over the default language */
export function tObj(key) {
  return { ...(get(state.strings[state.def], key) || {}), ...(get(state.strings[state.lang], key) || {}) };
}

/** Is this a {"en": ..., "pl": ...} object? */
export function isLangObject(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const keys = Object.keys(v);
  return keys.length > 0 && keys.every((k) => state.codes.includes(k));
}
/** Content value → text in the current language */
export function tr(v) {
  if (isLangObject(v)) return v[state.lang] ?? v[state.def] ?? Object.values(v)[0];
  return v;
}

/** Fill every [data-i18n] / [data-i18n-attr] element */
export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    if (el.dataset.i18nDefault === undefined) el.dataset.i18nDefault = el.textContent;
    el.textContent = t(el.dataset.i18n, el.dataset.i18nDefault);
  });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(';').forEach((pair) => {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key, el.getAttribute(attr) || ''));
    });
  });
  document.title = t('meta.title', document.title);
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description', ''));
}

/** Console report of what is not translated yet — handy when adding a language */
export function reportMissing(contentData) {
  if (state.lang === state.def) return;
  const missing = [];
  const walkKeys = (ref, cur, prefix) => {
    for (const [k, v] of Object.entries(ref || {})) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) walkKeys(v, cur?.[k], path);
      else if (cur?.[k] === undefined) missing.push(`i18n/${state.lang}.json → ${path}`);
    }
  };
  walkKeys(state.strings[state.def], state.strings[state.lang], '');
  const walkData = (node, path) => {
    if (isLangObject(node)) { if (node[state.lang] === undefined) missing.push(`${path}`); return; }
    if (Array.isArray(node)) node.forEach((n, i) => walkData(n, `${path}[${i}]`));
    else if (node && typeof node === 'object') Object.entries(node).forEach(([k, v]) => !k.startsWith('_') && walkData(v, `${path}.${k}`));
  };
  Object.entries(contentData || {}).forEach(([file, data]) => walkData(data, `data/${file}.json`));
  if (missing.length) console.info(`[i18n] "${state.lang}": ${missing.length} text(s) not translated (using "${state.def}"):\n  ${missing.join('\n  ')}`);
}
