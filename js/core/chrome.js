/* =========================================================
   Page "chrome": header with navigation, theme switch (day/night),
   language switch, footer, scroll-reveal animation.
   ========================================================= */
import { icon } from './icons.js';
import { t, languages, currentLanguage, setLanguage } from './i18n.js';
import { $, $$, esc, txt, visible } from './dom.js';
import { store } from './storage.js';
import { site } from './site.js';
import { isPortfolioComplete } from './levels.js';

/* ---------- Header & footer (same markup on every page) ---------- */
export function renderChrome(page) {
  const home = page === 'home' ? '' : 'index.html';
  const header = document.createElement('header');
  header.className = 'site-nav';
  header.innerHTML = `
    <a href="${home}#home" class="logo" data-bind="brand">MAIPA</a>
    <button class="nav-toggle" type="button" aria-expanded="false" data-i18n-attr="aria-label:nav.menu" aria-label="Menu"><span></span></button>
    <nav class="nav-links" aria-label="Main">
      <a href="${home}#about" data-i18n="nav.about">About</a>
      <a href="${home}#projects" data-i18n="nav.projects">Projects</a>
      <a href="${home}#models" data-i18n="nav.models">3D</a>
      <a href="${home}#characters" data-i18n="nav.characters">Characters</a>
      <a href="${home}#contact" data-i18n="nav.contact">Contact</a>
      <div class="nav-tools">
        <button class="theme-toggle" type="button" data-i18n-attr="aria-label:nav.theme; title:nav.theme" aria-label="Theme">
          <span class="theme-icon theme-icon-sun">${icon('sun')}</span><span class="theme-icon theme-icon-moon">${icon('moon')}</span>
        </button>
        <div class="lang-switch" hidden>
          <button class="lang-current" type="button" aria-haspopup="true" aria-expanded="false" data-i18n-attr="aria-label:nav.language; title:nav.language"></button>
          <ul class="lang-menu" hidden></ul>
        </div>
        <button class="btn-pixel play-toggle" type="button" data-i18n-attr="title:nav.playTitle" title="Play this page (P)">
          <span class="mini-sprite" aria-hidden="true"></span><span class="play-label" data-i18n="nav.play">Play</span>
        </button>
      </div>
    </nav>`;
  document.body.prepend(header);
  const skip = document.createElement('a');
  skip.className = 'skip-link'; skip.href = '#main'; skip.dataset.i18n = 'nav.skip'; skip.textContent = 'Skip to content';
  document.body.prepend(skip);

  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="footer-socials"></div>
    <p class="footer-note" data-i18n="footer.note"></p>
    <p class="footer-copy">&copy; <span class="year"></span> <span data-i18n="footer.madeBy">Made by</span> <span data-bind="name">Patryk Antosik</span></p>`;
  document.body.append(footer);

  document.body.insertAdjacentHTML('beforeend', `
    <div class="load-error" hidden>
      Couldn't load the data files. If you opened the page straight from disk, run <code>python -m http.server</code> and open <code>http://localhost:8000</code>.<br>
      Nie udało się wczytać danych. Jeśli otworzyłeś stronę z dysku, uruchom <code>python -m http.server</code> i wejdź na <code>http://localhost:8000</code>.
    </div>`);
}

export function renderFooter(cfg) {
  const list = (cfg.socials || []).filter((s) => visible(s) && s.url);
  const attrs = (s) => (s.url.startsWith('mailto:') ? '' : 'target="_blank" rel="noopener"');
  $('.footer-socials').innerHTML = list.map((s) =>
    `<a href="${esc(s.url)}" ${attrs(s)} aria-label="${txt(s.label)}" title="${txt(s.label)}">${icon(s.icon)}</a>`).join('');
  // after finishing every level of the play mode, the finale page stays reachable from the footer
  const note = $('.footer-note');
  $('.footer-finale')?.remove();
  if (isPortfolioComplete()) note.insertAdjacentHTML('afterend', `<p class="footer-finale"><a class="btn-pixel" href="finale.html">${icon('trophy')}${esc(t('finale.link'))}</a></p>`);
}

/* =========================================================
   Theme (day / night)
   ========================================================= */
const THEME_KEY = 'maipa-theme';
function systemTheme() { return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
export function currentTheme() { return document.documentElement.dataset.theme || 'light'; }
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme === 'dark' ? 'dark' : 'light');
  updateThemeButton();
  document.dispatchEvent(new CustomEvent('portfolio:theme', { detail: theme }));
}
export function initTheme() {
  applyTheme(store.get(THEME_KEY) || systemTheme());
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!store.get(THEME_KEY)) applyTheme(systemTheme()); });
  $('.theme-toggle').addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    store.set(THEME_KEY, next);
    applyTheme(next);
  });
}
export function updateThemeButton() {
  const b = $('.theme-toggle');
  if (!b) return;
  const dark = currentTheme() === 'dark';
  b.setAttribute('aria-pressed', String(dark));
  b.title = dark ? t('theme.day', 'Day mode') : t('theme.night', 'Night mode');
}

/* =========================================================
   Navigation + language switch
   ========================================================= */
export function initNav() {
  const nav = $('.site-nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40 || site.page !== 'home');
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const toggle = $('.nav-toggle');
  const setOpen = (open) => {
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(!document.body.classList.contains('nav-open')));
  $$('.nav-links a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  addEventListener('resize', () => { if (innerWidth > 800) setOpen(false); });

  if (site.page !== 'home') return;
  const links = $$('.nav-links a[href^="#"]');
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${e.target.id}`));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['about', 'projects', 'models', 'characters', 'contact'].forEach((id) => { const s = document.getElementById(id); if (s) io.observe(s); });
}

export function initLanguageSwitch() {
  const langs = languages();
  const wrap = $('.lang-switch');
  if (langs.length < 2) { wrap.hidden = true; return; }
  wrap.hidden = false;
  const btn = $('.lang-current', wrap);
  const menu = $('.lang-menu', wrap);
  menu.innerHTML = langs.map((l) =>
    `<li><button type="button" data-lang="${esc(l.code)}" lang="${esc(l.code)}"><span class="lang-code">${esc(l.short || l.code.toUpperCase())}</span>${esc(l.label)}</button></li>`).join('');
  const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = menu.hidden;
    menu.hidden = !open; btn.setAttribute('aria-expanded', String(open));
  });
  menu.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-lang]');
    if (!b) return;
    close();
    document.body.classList.remove('nav-open');
    await setLanguage(b.dataset.lang);
  });
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}
export function updateLanguageSwitch() {
  const cur = languages().find((l) => l.code === currentLanguage());
  const btn = $('.lang-current');
  if (cur && btn) btn.textContent = cur.short || cur.code.toUpperCase();
  $$('.lang-menu [data-lang]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.lang === currentLanguage())));
}

export function initReveal() {
  const els = $$('.reveal:not(.visible)');
  if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('visible')); return; }
  site.revealIO ??= new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('visible'); site.revealIO.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach((e) => site.revealIO.observe(e));
}

