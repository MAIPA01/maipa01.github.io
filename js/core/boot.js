/* =========================================================
   bootPage(): the one function every page calls.
   Builds header/footer, loads data + translations, renders, re-renders on language change.
   ========================================================= */
import { initI18n, onLanguageChange, applyStatic, reportMissing, tr } from './i18n.js';
import { $, $$ } from './dom.js';
import { installDevTools } from './levels.js';
import { site, DATA, loadJSON } from './site.js';
import { renderChrome, renderFooter, initTheme, initNav, initLanguageSwitch, updateLanguageSwitch, updateThemeButton, initReveal } from './chrome.js';
import { initDialogs } from './media.js';
import { initPlayButtons, resumePlayIfActive } from './play.js';

/**
 * @param {object} o
 * @param {'home'|'project'|'team'|'notfound'|'finale'} o.page
 * @param {(data) => void} o.render  called after the data is loaded and again on every language change
 */
export async function bootPage({ page, render }) {
  site.page = page;
  renderChrome(page);
  initTheme();
  initNav();
  initDialogs();
  initPlayButtons();

  try {
    const [, ...entries] = await Promise.all([
      initI18n(),
      ...Object.entries(DATA).map(async ([k, url]) => [k, await loadJSON(url)]),
    ]);
    site.data = Object.fromEntries(entries);
  } catch (err) {
    console.error('[portfolio] data load failed', err);
    const box = $('.load-error'); if (box) box.hidden = false;
    return;
  }
  window.__portfolio = site.data;
  initLanguageSwitch();

  const renderAll = () => {
    applyStatic();
    renderBindings(site.data.profile);
    renderFooter(site.data.socials);
    render(site.data);
    updateLanguageSwitch();
    updateThemeButton();
    initReveal();
    if (site.game) { site.game.invalidate(); }
    document.dispatchEvent(new Event('portfolio:layout'));
    const { game, ...content } = site.data;
    reportMissing(content);
  };
  renderAll();
  onLanguageChange(renderAll);
  document.dispatchEvent(new CustomEvent('portfolio:ready', { detail: site.data }));
  installDevTools();
  resumePlayIfActive();
}

function renderBindings(p) {
  $$('[data-bind]').forEach((el) => {
    const val = tr(p[el.dataset.bind]);
    if (typeof val === 'string') el.textContent = val;
  });
  $$('.year').forEach((el) => { el.textContent = new Date().getFullYear(); });
}

