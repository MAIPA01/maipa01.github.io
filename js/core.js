/* =========================================================
   MAIPA portfolio — shared code for every page (home, project, team, 404).
   Header, footer, theme, language, lightbox, video player, 3D viewer,
   markdown, play-mode bootstrap.
   ========================================================= */
import { icon } from './icons.js';
import {
  initI18n, setLanguage, onLanguageChange, currentLanguage, languages,
  t, tf, tObj, tr, applyStatic, reportMissing,
} from './i18n.js';

export { icon, t, tf, tObj, tr, onLanguageChange, currentLanguage };

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const txt = (v) => esc(tr(v) ?? '');
export const visible = (item) => item && !item.hidden;
export const isExternal = (url) => /^(https?:)?\/\//.test(url) || /^mailto:/.test(url);
export const projectUrl = (id) => `project.html?id=${encodeURIComponent(id)}`;
export const teamUrl = (id) => `team.html?id=${encodeURIComponent(id)}`;

export async function loadJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};
export { store };

/* =========================================================
   Page bootstrap
   ========================================================= */
export const site = { data: null, page: 'home', game: null, gameLoading: null, revealIO: null };

const DATA = {
  profile: 'data/profile.json',
  socials: 'data/socials.json',
  projects: 'data/projects.json',
  teams: 'data/teams.json',
  people: 'data/people.json',
  characters: 'data/characters.json',
  game: 'data/game.json',
};

/**
 * @param {object} o
 * @param {'home'|'project'|'team'|'notfound'} o.page
 * @param {(data) => void} o.render  called after data load and on every language change
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
  resumePlayIfActive();
}

function renderBindings(p) {
  $$('[data-bind]').forEach((el) => {
    const val = tr(p[el.dataset.bind]);
    if (typeof val === 'string') el.textContent = val;
  });
  $$('.year').forEach((el) => { el.textContent = new Date().getFullYear(); });
}

/* =========================================================
   Header / footer / dialogs (same markup on every page)
   ========================================================= */
function renderChrome(page) {
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
    <dialog class="lightbox">
      <button class="lightbox-close" type="button" data-i18n-attr="aria-label:models.close" aria-label="Close">×</button>
      <button class="lightbox-nav prev" type="button" aria-label="Previous">${icon('chevron-left')}</button>
      <figure><img alt=""><figcaption class="lightbox-caption"></figcaption></figure>
      <button class="lightbox-nav next" type="button" aria-label="Next">${icon('chevron-right')}</button>
    </dialog>
    <dialog class="video-modal">
      <div class="video-frame"></div>
      <div class="video-bar"><a class="video-open" target="_blank" rel="noopener"></a>
        <button class="video-close btn-pixel" type="button" data-i18n="video.close">Close</button></div>
    </dialog>
    <div class="load-error" hidden>
      Couldn't load the data files. If you opened the page straight from disk, run <code>python -m http.server</code> and open <code>http://localhost:8000</code>.<br>
      Nie udało się wczytać danych. Jeśli otworzyłeś stronę z dysku, uruchom <code>python -m http.server</code> i wejdź na <code>http://localhost:8000</code>.
    </div>`);
}

function renderFooter(cfg) {
  const list = (cfg.socials || []).filter((s) => visible(s) && s.url);
  const attrs = (s) => (s.url.startsWith('mailto:') ? '' : 'target="_blank" rel="noopener"');
  $('.footer-socials').innerHTML = list.map((s) =>
    `<a href="${esc(s.url)}" ${attrs(s)} aria-label="${txt(s.label)}" title="${txt(s.label)}">${icon(s.icon)}</a>`).join('');
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
function initTheme() {
  applyTheme(store.get(THEME_KEY) || systemTheme());
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!store.get(THEME_KEY)) applyTheme(systemTheme()); });
  $('.theme-toggle').addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    store.set(THEME_KEY, next);
    applyTheme(next);
  });
}
function updateThemeButton() {
  const b = $('.theme-toggle');
  if (!b) return;
  const dark = currentTheme() === 'dark';
  b.setAttribute('aria-pressed', String(dark));
  b.title = dark ? t('theme.day', 'Day mode') : t('theme.night', 'Night mode');
}

/* =========================================================
   Navigation + language switch
   ========================================================= */
function initNav() {
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

function initLanguageSwitch() {
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
function updateLanguageSwitch() {
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

/* =========================================================
   Shared HTML helpers
   ========================================================= */
export const LINK_ICONS = { github: 'github', itch: 'itch', playstore: 'playstore', youtube: 'youtube', vimeo: 'vimeo', web: 'web', download: 'download', docs: 'docs', vroid: 'vroid', play: 'play' };

export function tagsHTML(tags, cls = 'tags') {
  const list = tr(tags);
  if (!list || !list.length) return '';
  return `<div class="${cls}">${list.map((tag) => `<span class="tag">${txt(tag)}</span>`).join('')}</div>`;
}

/** Link buttons. YouTube / Vimeo links open in the built-in player instead of leaving the page. */
export function linksHTML(links, { cls = 'project-links', primaryFirst = true } = {}) {
  const list = (links || []).filter((l) => l && l.url && !l.hidden);
  if (!list.length) return '';
  return `<div class="${cls}">${list.map((l, i) => {
    const ext = isExternal(l.url);
    const video = parseVideo(l.url);
    const attrs = ext ? (l.url.startsWith('mailto:') ? '' : 'target="_blank" rel="noopener"') : (l.type === 'download' ? 'download' : '');
    const label = tr(l.label) || t(`links.${l.type}`, t('links.link'));
    const href = ext ? l.url : encodeURI(l.url);
    return `<a class="project-link${primaryFirst && i === 0 ? ' primary' : ''}" href="${esc(href)}" ${attrs}${video ? ` data-video="${esc(l.url)}" data-video-title="${esc(label)}"` : ''}${l.cover ? ` data-video-cover="${esc(l.cover)}"` : ''}>${icon(l.icon || LINK_ICONS[l.type] || 'link')}${esc(label)}</a>`;
  }).join('')}</div>`;
}

/* =========================================================
   Markdown (small & safe subset) for long descriptions
   ========================================================= */
const mdFiles = new Map();
/** Loads every {"file": "..."} referenced in the given values (call before rendering, then render again). */
export async function loadMarkdownFiles(values) {
  const files = new Set();
  const walk = (v) => {
    if (!v || typeof v !== 'object') return;
    if (typeof v.file === 'string' && Object.keys(v).length === 1) { if (!mdFiles.has(v.file)) files.add(v.file); return; }
    Object.values(v).forEach(walk);
  };
  values.forEach(walk);
  if (!files.size) return false;
  await Promise.all([...files].map(async (f) => {
    try { const r = await fetch(f, { cache: 'no-cache' }); mdFiles.set(f, r.ok ? await r.text() : ''); } catch { mdFiles.set(f, ''); }
  }));
  return true;
}

/**
 * Markdown → HTML. Accepts a string, an array of lines ("" = new paragraph) or {"file": "x.md"}.
 * A single line break inside a paragraph is a space (so long text can be split into short lines);
 * end a line with two spaces or a backslash for a hard line break.
 */
export function markdown(src) {
  if (src == null) return '';
  if (typeof src === 'object' && !Array.isArray(src) && typeof src.file === 'string') src = mdFiles.get(src.file) ?? '';
  if (Array.isArray(src)) src = src.join('\n');
  let s = esc(String(src)).replace(/\r\n?/g, '\n');
  const codeBlocks = [];
  s = s.replace(/```([\w+-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    codeBlocks.push(`<pre class="md-code"${lang ? ` data-lang="${lang}"` : ''}><code>${code.replace(/\n$/, '')}</code></pre>`);
    return `\u0000${codeBlocks.length - 1}\u0000`;
  });
  const inline = (line) => {
    const codes = [];
    line = line.replace(/`([^`]+)`/g, (_, c) => { codes.push(`<code>${c}</code>`); return `\u0001${codes.length - 1}\u0001`; });
    line = line.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
      const u = url.replace(/&amp;/g, '&');
      if (/^\s*javascript:/i.test(u)) return label;
      const ext = /^(https?:)?\/\//.test(u);
      return `<a href="${esc(u)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
    });
    line = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
    return line.replace(/\u0001(\d+)\u0001/g, (_, i) => codes[i]);
  };
  const out = [];
  for (const block of s.split(/\n{2,}/)) {
    const b = block.trim();
    if (!b) continue;
    if (/^\u0000\d+\u0000$/.test(b)) { out.push(b); continue; }
    const lines = b.split('\n');
    const h = b.match(/^(#{1,4})\s+(.*)$/);
    if (h && lines.length === 1) { const lvl = Math.min(h[1].length + 2, 5); out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`); continue; }
    if (lines.every((l) => /^\s*[-*]\s+/.test(l))) { out.push(`<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ''))}</li>`).join('')}</ul>`); continue; }
    if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) { out.push(`<ol>${lines.map((l) => `<li>${inline(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>`).join('')}</ol>`); continue; }
    if (lines.every((l) => /^&gt;\s?/.test(l))) { out.push(`<blockquote>${inline(lines.map((l) => l.replace(/^&gt;\s?/, '')).join(' '))}</blockquote>`); continue; }
    out.push(`<p>${lines.map((l, i) => inline(l.replace(/(\s{2,}|\\)$/, '')) + (i < lines.length - 1 ? (/(\s{2,}|\\)$/.test(l) ? '<br>' : ' ') : '')).join('')}</p>`);
  }
  return out.join('\n').replace(/\u0000(\d+)\u0000/g, (_, i) => codeBlocks[i]);
}

/* =========================================================
   Lightbox (single image or gallery with ← →)
   ========================================================= */
const lb = { list: [], i: 0 };
export function openLightbox(list, index = 0) {
  lb.list = Array.isArray(list) ? list : [list];
  lb.i = index;
  showLightboxItem();
  const box = $('.lightbox');
  box.classList.toggle('single', lb.list.length < 2);
  if (!box.open) box.showModal();
}
function showLightboxItem() {
  const box = $('.lightbox');
  const it = lb.list[lb.i];
  $('img', box).src = it.src; $('img', box).alt = it.alt || '';
  $('.lightbox-caption', box).textContent = it.caption || '';
}
function stepLightbox(d) {
  if (lb.list.length < 2) return;
  lb.i = (lb.i + d + lb.list.length) % lb.list.length;
  showLightboxItem();
}

/* =========================================================
   Video player (YouTube / Vimeo) — no leaving the page
   ========================================================= */
export function parseVideo(url) {
  if (!url) return null;
  let m = String(url).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (m) return { site: 'YouTube', id: m[1], url, embed: `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0`, thumb: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` };
  m = String(url).match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/);
  if (m) return { site: 'Vimeo', id: m[1], url, embed: `https://player.vimeo.com/video/${m[1]}?autoplay=1${m[2] ? `&h=${m[2]}` : ''}`, thumb: '' };
  return null;
}
export function openVideo(url, title = '') {
  const v = parseVideo(url);
  if (!v) { window.open(url, '_blank', 'noopener'); return; }
  const box = $('.video-modal');
  $('.video-frame', box).innerHTML = `<iframe src="${esc(v.embed)}" title="${esc(title || v.site)}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>`;
  const open = $('.video-open', box);
  open.href = v.url; open.innerHTML = `${icon(v.site === 'YouTube' ? 'youtube' : 'vimeo')}${esc(tf('video.open', { site: v.site }))}`;
  box.showModal();
}

function initDialogs() {
  const box = $('.lightbox');
  box.addEventListener('click', (e) => {
    if (e.target.closest('.lightbox-nav.prev')) return stepLightbox(-1);
    if (e.target.closest('.lightbox-nav.next')) return stepLightbox(1);
    if (e.target === box || e.target.closest('.lightbox-close')) box.close();
  });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); stepLightbox(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); stepLightbox(1); }
  });
  const vm = $('.video-modal');
  const closeVideo = () => vm.close();
  vm.addEventListener('close', () => { $('.video-frame', vm).innerHTML = ''; });
  vm.addEventListener('click', (e) => { if (e.target === vm || e.target.closest('.video-close')) closeVideo(); });
  // any element with data-video opens the built-in player
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-video]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    openVideo(a.dataset.video, a.dataset.videoTitle);
  });
}

/* =========================================================
   3D viewer: .glb/.gltf → <model-viewer>, .vrm → three-vrm.
   Supports several versions of one model (e.g. HighPoly / LowPoly / 250)
   and obfuscated files (*.obf, made with tools/obfuscate-model.py).
   ========================================================= */
let modelViewerLib = null;
export function loadModelViewer() {
  // decoders for compressed models are served from this site (no Google CDN needed)
  self.ModelViewerElement = { ...(self.ModelViewerElement || {}), dracoDecoderLocation: new URL('js/vendor/draco/', document.baseURI).href };
  modelViewerLib ??= import('./vendor/model-viewer.min.js').catch((err) => console.error('[portfolio] model-viewer failed', err));
  return modelViewerLib;
}

const OBF_MAGIC = 'MAIPAOBF1';
const objectUrls = new Map();
/** Returns a URL the viewer can load. Obfuscated files are decoded in memory. */
export async function resolveModelUrl(src) {
  if (!/\.obf$/i.test(src)) return src;
  if (objectUrls.has(src)) return objectUrls.get(src);
  const res = await fetch(src);
  if (!res.ok) throw new Error(`${src}: HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const magic = new TextDecoder().decode(buf.subarray(0, OBF_MAGIC.length));
  if (magic !== OBF_MAGIC) throw new Error(`${src}: not an obfuscated model`);
  const data = buf.slice(OBF_MAGIC.length + 16);
  const salt = buf.subarray(OBF_MAGIC.length, OBF_MAGIC.length + 16);
  let x = 0x9e3779b9;
  for (let i = 0; i < data.length; i++) {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    data[i] ^= (x ^ salt[i & 15]) & 0xff;
  }
  const url = URL.createObjectURL(new Blob([data], { type: 'model/gltf-binary' }));
  objectUrls.set(src, url);
  return url;
}
const isVrm = (src) => /\.vrm(\.obf)?$/i.test(src);

/**
 * Mounts a 3D viewer into `host`.
 * model = { variants:[{label, src, poster}], src?, cameraOrbit?, autoRotate?, environment?, exposure? }
 * opts.fallbackImage → shown when the file can't be loaded.
 */
export function mountModel(host, model, opts = {}) {
  const variants = (model.variants && model.variants.length ? model.variants : [{ label: '', src: model.src, poster: model.poster }])
    .filter((v) => v && v.src && !v.hidden);
  if (!variants.length) return null;
  host.classList.add('viewer-host');
  host.innerHTML = `
    <div class="viewer-stage"></div>
    ${variants.length > 1 ? `<div class="variant-bar" role="group" aria-label="${esc(t('project.variant'))}">${variants.map((v, i) =>
      `<button type="button" class="variant-btn" data-i="${i}" aria-pressed="${i === 0}">${txt(v.label) || i + 1}</button>`).join('')}</div>` : ''}`;
  const stage = $('.viewer-stage', host);
  let dispose = null, token = 0;

  const fail = (src) => {
    stage.innerHTML = `<div class="model-fallback">${opts.fallbackImage ? `<img src="${esc(opts.fallbackImage)}" alt="">` : ''}<p>${esc(t('project.modelMissing'))}</p></div>`;
    console.warn('[portfolio] model not available:', src);
  };

  const show = async (i) => {
    const my = ++token;
    dispose?.(); dispose = null;
    const v = variants[i];
    $$('.variant-btn', host).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.i === i)));
    stage.innerHTML = '<div class="viewer-loading"><span></span></div>';
    let url;
    try { url = await resolveModelUrl(v.src); } catch { if (my === token) fail(v.src); return; }
    if (my !== token) return;
    if (isVrm(v.src)) {
      try {
        const { mountVRM } = await import('./vrm.js');
        if (my !== token) return;
        stage.innerHTML = '';
        dispose = await mountVRM(stage, url, { autoRotate: model.autoRotate !== false });
      } catch (err) { if (my === token) fail(v.src); }
      return;
    }
    await loadModelViewer();
    if (my !== token) return;
    const poster = v.poster || model.poster;
    stage.innerHTML = `<model-viewer src="${esc(url)}" ${poster ? `poster="${esc(poster)}"` : ''} alt="${txt(opts.alt || v.label || 'model')}"
      camera-controls touch-action="pan-y" ${model.autoRotate !== false ? 'auto-rotate' : ''} auto-rotate-delay="0"
      ${model.cameraOrbit ? `camera-orbit="${esc(model.cameraOrbit)}"` : ''}
      environment-image="${esc(model.environment || 'neutral')}" shadow-intensity="${model.shadowIntensity ?? 1}"
      exposure="${model.exposure ?? 1}" interaction-prompt="auto"></model-viewer>`;
    $('model-viewer', stage).addEventListener('error', () => { if (my === token) fail(v.src); });
  };
  host.addEventListener('click', (e) => { const b = e.target.closest('.variant-btn'); if (b) show(+b.dataset.i); });
  show(0);
  return { destroy() { token++; dispose?.(); host.innerHTML = ''; } };
}

/* =========================================================
   Play mode bootstrap (lazy) — shared by every page
   ========================================================= */
const PLAY_KEY = 'maipa-play';
export function playableCharacters() {
  const chars = site.data?.characters?.characters || [];
  return chars.filter((c) => visible(c) && c.game && c.game.sprite).map((c) => ({ id: c.id || tr(c.name), name: tr(c.name), sprite: c.game.sprite, game: c.game }));
}
async function ensureGame() {
  if (site.game) return site.game;
  site.gameLoading ??= import('./game/playmode.js').then(async (m) => {
    const cfg = site.data?.game || await loadJSON(DATA.game);
    site.game = await m.createPlayMode(cfg, {
      texts: () => tObj('game'),
      characters: playableCharacters,
      pageKey: ['project', 'team'].includes(site.page) ? `${site.page}:${new URLSearchParams(location.search).get('id')}` : site.page,
      levels: () => levelList(),
      cars: () => playableCharacters().map((c) => ({ id: c.id, name: c.name, color: c.game?.carColor })),
      onActiveChange: (active) => { try { active ? sessionStorage.setItem(PLAY_KEY, '1') : sessionStorage.removeItem(PLAY_KEY); } catch { /* ignore */ } },
    });
    window.__maipaGame = site.game;
    return site.game;
  });
  return site.gameLoading;
}
export async function togglePlay() {
  document.body.classList.remove('nav-open');
  const g = await ensureGame();
  g?.toggle();
}
function initPlayButtons() {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.play-toggle');
    if (!b) return;
    b.blur(); togglePlay();
  });
  addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'p' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (document.querySelector('dialog[open]')) return;
    if (site.data?.game?.enabled === false) return;
    togglePlay();
  });
  document.addEventListener('portfolio:ready', (e) => {
    if (e.detail.game?.enabled === false) $$('.play-toggle').forEach((b) => b.remove());
  });
}
async function resumePlayIfActive() {
  let on = false;
  try { on = sessionStorage.getItem(PLAY_KEY) === '1'; } catch { /* ignore */ }
  if (!on || site.data?.game?.enabled === false) return;
  const g = await ensureGame();
  if (g && !g.active) g.start({ resumed: true });
}

/* =========================================================
   Teams & people (data/teams.json, data/people.json)
   ========================================================= */
export const personById = (id) => (site.data?.people?.people || []).find((x) => x.id === id);
export const teamById = (id) => (site.data?.teams?.teams || []).find((x) => x.id === id && !x.hidden);
/** Members of a project's team with their role in THIS project: [{ person, role }] */
export function projectMembers(p) {
  return (p.team?.members || []).map((m) => ({ person: personById(m.person) || { id: m.person, name: m.person }, role: m.role })).filter((m) => m.person);
}
export const projectsOfTeam = (teamId) => (site.data?.projects?.projects || []).filter((p) => visible(p) && p.team?.id === teamId);
export function personLink(person, cls = '') {
  const url = (person.links || []).find((l) => l.url)?.url || person.url;
  return url ? `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener">${txt(person.name)}</a>` : `<span class="${cls}">${txt(person.name)}</span>`;
}
export function teamLogoHTML(team, cls = 'team-logo') {
  if (team.logo) return `<img class="${cls}" src="${esc(team.logo)}" alt="">`;
  const initials = String(tr(team.name) || '?').replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  return `<span class="${cls} team-logo-ph" aria-hidden="true">${esc(initials)}</span>`;
}

/* =========================================================
   Project cards (home page + team pages)
   ========================================================= */
export const CATEGORY_ICONS = { game: 'gamepad', engine: 'engine', renderer: 'render', library: 'docs', app: 'app', tool: 'app', model: 'cube' };
export const categoryOf = (p) => (site.data?.projects?.categories || []).find((c) => c.id === p.category);

function cardMediaHTML(p, cat) {
  const img = p.banner && p.cardImage !== 'icon' ? p.banner : (p.icon || p.image);
  if (!img) return `<div class="project-placeholder">${icon((cat && cat.icon) || CATEGORY_ICONS[p.category] || 'cube')}</div>`;
  const contain = img === (p.icon || p.image) && (p.iconFit || p.imageFit) === 'contain';
  return `<div class="project-media-inner${contain ? ' contain' : ''}"${contain ? ` style="--img:url('${esc(new URL(img, location.href).href)}')"` : ''}>
    <img src="${esc(img)}" alt="" loading="lazy"></div>`;
}
export function projectCardHTML(p, { reveal = true } = {}) {
  const cat = categoryOf(p);
  const hasPlay = (p.links || []).some((l) => l.type === 'playstore' && l.url);
  const title = tr(p.title);
  const href = p.id ? projectUrl(p.id) : '';
  const badges = [
    p.featured ? `<span class="badge badge-featured">${esc(t('projects.featured'))}</span>` : '',
    cat ? `<span class="badge">${txt(cat.label)}</span>` : '',
    p.webBuild?.url ? `<span class="badge badge-play">${icon('play')}${esc(t('links.play'))}</span>` : '',
  ].join('');
  const summary = p.summary || p.description;
  return `
  <article class="project-card${reveal ? ' reveal' : ''}" data-id="${esc(p.id || '')}" data-category="${esc(p.category)}" data-play="${hasPlay ? 1 : 0}" data-title="${esc(title)}">
    ${href ? `<a class="card-link" href="${esc(href)}" aria-label="${esc(title)} — ${esc(t('projects.open'))}"></a>` : ''}
    <div class="project-media">${cardMediaHTML(p, cat)}<div class="project-badges">${badges}</div></div>
    <div class="project-body">
      <div class="project-meta"><h3>${esc(title)}</h3>${p.year ? `<span class="project-year">${txt(p.year)}</span>` : ''}</div>
      ${summary && typeof tr(summary) === 'string' ? `<p class="project-desc">${txt(summary)}</p>` : ''}
      ${tagsHTML(p.tags)}
      <div class="card-actions">
        ${linksHTML(p.links)}
        ${href ? `<a class="details-link" href="${esc(href)}">${esc(t('projects.open'))} →</a>` : ''}
      </div>
    </div>
  </article>`;
}

/** Order of projects on the home page (featured first, then JSON order). */
export function homeProjectOrder(data = site.data) {
  const cats = data.projects.categories || [];
  const shown = (p) => visible(p) && cats.find((c) => c.id === p.category)?.showInProjects !== false;
  const list = (data.projects.projects || []).map((p, i) => ({ p, i }));
  const grid = list.filter(({ p }) => shown(p)).sort((a, b) => (!!b.p.featured - !!a.p.featured) || a.i - b.i).map(({ p }) => p);
  const models = list.filter(({ p }) => visible(p) && p.category === 'model').map(({ p }) => p);
  return { grid, models };
}

/* =========================================================
   Video covers: custom "cover" → YouTube thumbnail → Vimeo oEmbed thumbnail
   ========================================================= */
const vimeoThumbs = new Map();
export async function hydrateVideoCovers(root = document) {
  for (const el of $$('[data-vimeo-id]:not([data-cover-done])', root)) {
    el.dataset.coverDone = '1';
    const id = el.dataset.vimeoId;
    try {
      if (!vimeoThumbs.has(id)) {
        vimeoThumbs.set(id, fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${id}`)}&width=1280`)
          .then((r) => (r.ok ? r.json() : null)).then((j) => j?.thumbnail_url || '').catch(() => ''));
      }
      const url = await vimeoThumbs.get(id);
      if (url) el.style.setProperty('--thumb', `url("${url}")`);
    } catch { /* offline: keep the placeholder */ }
  }
}

/* =========================================================
   Game levels: hub (home) → every project page, in home-page order.
   Coins per level are computed from the data (same rules as the play mode),
   so shop prices can add up to exactly what can be earned.
   ========================================================= */
export const PROJECT_LAYOUTS = {
  game:    ['play', 'videos', 'gallery', 'about', 'sections', 'model'],
  model:   ['model', 'gallery', 'about', 'sections', 'videos'],
  library: ['about', 'sections', 'videos', 'gallery', 'play'],
  engine:  ['about', 'videos', 'sections', 'gallery', 'play'],
  app:     ['about', 'videos', 'gallery', 'sections', 'play'],
  default: ['play', 'model', 'about', 'videos', 'gallery', 'sections'],
};
export function projectVideos(p) {
  const seen = new Set(), list = [];
  const add = (url, title, cover) => {
    const v = parseVideo(url);
    if (!v || seen.has(v.site + v.id)) return;
    seen.add(v.site + v.id);
    list.push({ ...v, title: title || t('video.trailer'), cover: cover || '' });
  };
  (p.videos || []).filter(visible).forEach((v) => add(v.url, tr(v.title), v.cover));
  (p.links || []).filter(visible).forEach((l) => add(l.url, tr(l.label), l.cover));
  return list;
}
export function projectBlocks(p) {
  const layout = p.layout || PROJECT_LAYOUTS[p.category] || PROJECT_LAYOUTS.default;
  const has = {
    about: !!(p.description || p.summary),
    sections: (p.sections || []).filter(visible).length,
    play: !!p.webBuild?.url,
    videos: projectVideos(p).length > 0,
    gallery: (p.gallery || []).filter((g) => visible(g) && (g.src || (g.variants || []).length)).length > 0,
    model: !!(p.model && ((p.model.variants || []).length || p.model.src)),
  };
  return layout.flatMap((b) => (b === 'sections' ? Array(has.sections).fill('sections') : has[b] ? [b] : []));
}
export function levelList(data = site.data) {
  const { grid, models } = homeProjectOrder(data);
  const chars = (data.characters?.characters || []).filter((c) => visible(c) && (c.images || []).length).length;
  const skills = (data.profile.skills || []).filter(visible).length;
  const levels = [{ key: 'home', title: t('nav.home'), url: 'index.html', coins: grid.length + models.length + chars + skills }];
  [...grid, ...models].forEach((p) => {
    const gallery = (p.gallery || []).filter((g) => visible(g) && (g.src || (g.variants || []).length)).length;
    levels.push({ key: `project:${p.id}`, id: p.id, title: tr(p.title), url: projectUrl(p.id), coins: projectBlocks(p).length + gallery });
  });
  return levels;
}
