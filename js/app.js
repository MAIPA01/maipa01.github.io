/* =========================================================
   MAIPA portfolio — renders the page from the JSON files in /data.
   Edit the JSON, refresh the page, done. No build step.
   ========================================================= */
import { icon } from './icons.js';
import {
  initI18n, setLanguage, onLanguageChange, currentLanguage, languages,
  t, tObj, tr, applyStatic, reportMissing,
} from './i18n.js';

const DATA = {
  profile: 'data/profile.json',
  socials: 'data/socials.json',
  projects: 'data/projects.json',
  models: 'data/models.json',
  characters: 'data/characters.json',
  game: 'data/game.json',
};

const LINK_ICONS = { github: 'github', itch: 'itch', playstore: 'playstore', youtube: 'youtube', web: 'web', download: 'download', docs: 'docs', vroid: 'vroid' };
const CATEGORY_ICONS = { game: 'gamepad', engine: 'engine', renderer: 'render', library: 'docs', tool: 'engine', model: 'cube' };

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isExternal = (url) => /^(https?:)?\/\//.test(url) || /^mailto:/.test(url);
const visible = (item) => item && !item.hidden;
const txt = (v) => esc(tr(v) ?? '');

const app = { data: null, filter: '*', renders: [], game: null, gameLoading: null, typeToken: 0, revealIO: null };

async function loadJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

async function main() {
  initNav();
  initPlayButtons();
  initDelegatedEvents();

  try {
    const [, ...entries] = await Promise.all([
      initI18n(),
      ...Object.entries(DATA).map(async ([k, url]) => [k, await loadJSON(url)]),
    ]);
    app.data = Object.fromEntries(entries);
  } catch (err) {
    console.error('[portfolio] data load failed', err);
    $('.load-error').hidden = false;
    return;
  }
  window.__portfolio = app.data;

  initLanguageSwitch();
  renderAll();
  onLanguageChange(() => renderAll());
  document.dispatchEvent(new CustomEvent('portfolio:ready', { detail: app.data }));
}

function renderAll() {
  const d = app.data;
  applyStatic();
  renderProfile(d.profile);
  renderProjects(d.projects);
  renderModels(d.models);
  renderCharacters(d.characters);
  renderSocials(d.socials);
  updateLanguageSwitch();
  initReveal();
  if (app.game) { app.game.stop(); app.game.invalidate(); }
  document.dispatchEvent(new Event('portfolio:layout'));
  const { game, ...content } = d;
  reportMissing(content);
}

/* ---------- Shared bits ---------- */
function tagsHTML(tags) {
  const list = tr(tags);
  if (!list || !list.length) return '';
  return `<div class="tags">${list.map((tag) => `<span class="tag">${txt(tag)}</span>`).join('')}</div>`;
}

function linksHTML(links, cls = 'project-links') {
  const list = (links || []).filter((l) => l && l.url);
  if (!list.length) return '';
  return `<div class="${cls}">${list.map((l, i) => {
    const ext = isExternal(l.url);
    const attrs = ext ? (l.url.startsWith('mailto:') ? '' : 'target="_blank" rel="noopener"') : (l.type === 'download' ? 'download' : '');
    const label = tr(l.label) || t(`links.${l.type}`, t('links.link'));
    const href = ext ? l.url : encodeURI(l.url);
    return `<a class="project-link${i === 0 ? ' primary' : ''}" href="${esc(href)}" ${attrs}>${icon(l.icon || LINK_ICONS[l.type] || 'link')}${esc(label)}</a>`;
  }).join('')}</div>`;
}

/* ---------- Profile / about ---------- */
function renderProfile(p) {
  $$('[data-bind]').forEach((el) => {
    const val = tr(p[el.dataset.bind]);
    if (typeof val === 'string') el.textContent = val;
  });
  $('.year').textContent = new Date().getFullYear();

  const about = p.about || {};
  $('.about-paragraphs').innerHTML = (about.paragraphs || []).map((para) => `<p>${txt(para)}</p>`).join('');
  const fig = $('.about-avatar');
  fig.hidden = !about.avatar;
  if (about.avatar) {
    const img = $('img', fig);
    if (img.getAttribute('src') !== about.avatar) img.src = about.avatar;
    img.alt = tr(about.avatarAlt) || '';
    $('figcaption', fig).textContent = tr(about.avatarCaption) || '';
  }

  $('.stats').innerHTML = (p.stats || []).filter(visible).map((s) =>
    `<div class="stat reveal"><div class="stat-value">${txt(s.value)}</div><div class="stat-label">${txt(s.label)}</div></div>`).join('');

  $('.skills').innerHTML = (p.skills || []).filter(visible).map((s) => `
    <article class="skill-card reveal">
      ${icon(s.icon || 'cube')}
      <h3>${txt(s.title)}</h3>
      <p>${txt(s.text)}</p>
      ${tagsHTML(s.tags)}
    </article>`).join('');

  typeRoles(tr(p.roles) || []);
}

function typeRoles(roles) {
  const el = $('.role-text');
  const token = ++app.typeToken;
  el.parentElement.hidden = !roles.length;
  if (!roles.length) return;
  el.textContent = roles[0];
  if (roles.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let i = 0, pos = roles[0].length, deleting = true;
  const tick = () => {
    if (token !== app.typeToken) return; // language changed → old loop stops
    const word = roles[i];
    if (deleting) {
      pos--; el.textContent = word.slice(0, pos);
      if (pos <= 0) { deleting = false; i = (i + 1) % roles.length; }
      setTimeout(tick, 40);
    } else {
      pos++; el.textContent = roles[i].slice(0, pos);
      if (pos >= roles[i].length) { deleting = true; setTimeout(tick, 2200); return; }
      setTimeout(tick, 75);
    }
  };
  setTimeout(tick, 2600);
}

/* ---------- Projects ---------- */
function renderProjects(cfg) {
  const cats = cfg.categories || [];
  const catById = Object.fromEntries(cats.map((c) => [c.id, c]));
  const projects = (cfg.projects || []).filter(visible)
    .map((p, i) => ({ ...p, _i: i }))
    .sort((a, b) => (!!b.featured - !!a.featured) || a._i - b._i);

  const grid = $('.projects-grid');
  grid.innerHTML = projects.map((p) => projectCard(p, catById[p.category])).join('') ||
    `<p class="empty-note">${esc(t('projects.empty'))}</p>`;

  const filters = [{ id: '*', label: t('projects.all'), count: projects.length }];
  cats.forEach((c) => {
    const count = projects.filter((p) => p.category === c.id).length;
    if (count) filters.push({ id: c.id, label: tr(c.label), count });
  });
  const playCount = projects.filter((p) => (p.links || []).some((l) => l.type === 'playstore')).length;
  if (playCount) filters.push({ id: '@playstore', label: t('projects.googlePlay'), count: playCount });

  const bar = $('.filters');
  bar.hidden = filters.length <= 2;
  if (!filters.some((f) => f.id === app.filter)) app.filter = '*';
  bar.innerHTML = filters.map((f) =>
    `<button class="filter-chip" type="button" data-filter="${esc(f.id)}" aria-pressed="${f.id === app.filter}">${esc(f.label)}<span class="count">${f.count}</span></button>`).join('');
  applyFilter();
}

function applyFilter() {
  const f = app.filter;
  $$('.filter-chip').forEach((b) => b.setAttribute('aria-pressed', b.dataset.filter === f));
  $$('.projects-grid .project-card').forEach((card) => {
    const show = f === '*' || card.dataset.category === f || (f === '@playstore' && card.dataset.play === '1');
    card.classList.toggle('is-hidden', !show);
  });
}

function projectCard(p, cat) {
  const hasPlay = (p.links || []).some((l) => l.type === 'playstore' && l.url);
  const title = tr(p.title);
  const contain = p.image && p.imageFit === 'contain';
  const media = p.image
    ? `<img src="${esc(p.image)}" alt="${esc(tr(p.imageAlt) || title)}" loading="lazy">`
    : `<div class="project-placeholder">${icon((cat && cat.icon) || CATEGORY_ICONS[p.category] || 'cube')}</div>`;
  const badges = [
    p.featured ? `<span class="badge badge-featured">${esc(t('projects.featured'))}</span>` : '',
    cat ? `<span class="badge">${txt(cat.label)}</span>` : '',
  ].join('');

  return `
  <article class="project-card reveal" data-category="${esc(p.category)}" data-play="${hasPlay ? 1 : 0}" data-title="${esc(title)}">
    <div class="project-media${contain ? ' contain' : ''}"${contain ? ` style="--bg:url('${esc(new URL(p.image, location.href).href)}')"` : ''}>${media}<div class="project-badges">${badges}</div></div>
    <div class="project-body">
      <div class="project-meta"><h3>${esc(title)}</h3>${p.year ? `<span class="project-year">${txt(p.year)}</span>` : ''}</div>
      ${p.description ? `<p class="project-desc">${txt(p.description)}</p>` : ''}
      ${tagsHTML(p.tags)}
      ${linksHTML(p.links)}
    </div>
  </article>`;
}

/* ---------- 3D models & renders ---------- */
let modelViewerRequested = false;
function loadModelViewer() {
  if (modelViewerRequested) return;
  modelViewerRequested = true;
  import('./vendor/model-viewer.min.js').catch((err) => console.error('[portfolio] model-viewer failed', err));
}
function modelViewerHTML(m) {
  return `<model-viewer src="${esc(m.src)}" ${m.poster ? `poster="${esc(m.poster)}"` : ''} alt="${txt(m.alt || m.title || m.name)}"
    camera-controls touch-action="pan-y" ${m.autoRotate !== false ? 'auto-rotate' : ''} auto-rotate-delay="0"
    ${m.cameraOrbit ? `camera-orbit="${esc(m.cameraOrbit)}"` : ''}
    environment-image="${esc(m.environment || 'neutral')}" ${m.skybox ? `skybox-image="${esc(m.skybox)}"` : ''}
    shadow-intensity="${m.shadowIntensity ?? 1}" exposure="${m.exposure ?? 1}" loading="lazy" reveal="auto"
    interaction-prompt="auto"></model-viewer>`;
}
function watchModelErrors(root) {
  $$('model-viewer', root).forEach((mv) => mv.addEventListener('error', () => {
    const div = document.createElement('div');
    div.className = 'model-fallback';
    div.textContent = `${t('models.loadError')}: ${mv.getAttribute('src')}`;
    mv.replaceWith(div);
  }));
}

function renderModels(cfg) {
  const models = (cfg.models || []).filter((m) => visible(m) && m.src);
  app.renders = (cfg.renders || []).filter((r) => visible(r) && r.src);
  const mGrid = $('.models-grid');
  const rGrid = $('.renders-grid');

  $('.models-block').hidden = !models.length;
  mGrid.innerHTML = models.map((m) => `
    <article class="model-card reveal">
      ${modelViewerHTML(m)}
      <div class="model-body"><h4>${txt(m.title)}</h4>${m.description ? `<p>${txt(m.description)}</p>` : ''}${tagsHTML(m.tags)}</div>
    </article>`).join('');
  watchModelErrors(mGrid);
  if (models.length) {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect(); loadModelViewer();
    }, { rootMargin: '600px' });
    io.observe(mGrid);
  }

  $('.renders-block').hidden = !app.renders.length;
  rGrid.innerHTML = app.renders.map((r, i) => `
    <figure class="render-tile reveal" tabindex="0" role="button" data-i="${i}" aria-label="${txt(r.title) || esc(t('models.openImage'))}">
      <img src="${esc(r.src)}" alt="${txt(r.alt || r.title)}" loading="lazy">
      ${r.title ? `<figcaption>${txt(r.title)}</figcaption>` : ''}
    </figure>`).join('');
}

function openLightbox(src, alt, caption) {
  const box = $('.lightbox');
  $('img', box).src = src; $('img', box).alt = alt || '';
  $('.lightbox-caption', box).textContent = caption || '';
  box.showModal();
}

/* ---------- Characters ---------- */
function renderCharacters(cfg) {
  const list = ((cfg && cfg.characters) || []).filter((c) => visible(c) && (c.images || []).length);
  const section = $('#characters');
  section.hidden = !list.length;
  $(`.nav-links a[href="#characters"]`).hidden = !list.length;
  app.characters = list;

  $('.characters-grid').innerHTML = list.map((c, ci) => {
    const imgs = c.images;
    const dots = imgs.length > 1
      ? `<div class="pose-dots">${imgs.map((_, i) => `<button type="button" class="pose-dot" data-pose="${i}" aria-pressed="${i === 0}" aria-label="${esc(t('characters.pose'))} ${i + 1}"></button>`).join('')}</div>`
      : '';
    const toggle3d = c.model
      ? `<button type="button" class="project-link char-3d" data-label3d="${esc(t('characters.view3d'))}" data-label2d="${esc(t('characters.view2d'))}">${icon('cube')}<span>${esc(t('characters.view3d'))}</span></button>`
      : '';
    return `
    <article class="character-card reveal" data-c="${ci}" data-pose="0">
      <div class="character-stage">
        <button type="button" class="character-img" aria-label="${esc(t('models.openImage'))}">
          <img src="${esc(imgs[0].src)}" alt="${txt(imgs[0].alt || c.name)}" loading="lazy">
        </button>
        ${dots}
      </div>
      <div class="character-body">
        <h3>${txt(c.name)}</h3>
        ${c.description ? `<p>${txt(c.description)}</p>` : ''}
        ${tagsHTML(c.tags)}
        ${(c.links || []).some((l) => l.url) || toggle3d ? `<div class="project-links">${toggle3d}${linksHTML(c.links, 'inline-links')}</div>` : ''}
      </div>
    </article>`;
  }).join('');
  // preload other poses so switching is instant
  list.forEach((c) => c.images.slice(1).forEach((im) => { const i = new Image(); i.src = im.src; }));
}

function setPose(card, i) {
  const c = app.characters[+card.dataset.c];
  const im = c.images[i];
  card.dataset.pose = i;
  const img = $('.character-img img', card);
  if (!img) return;
  img.src = im.src; img.alt = tr(im.alt) || tr(c.name);
  $$('.pose-dot', card).forEach((d) => d.setAttribute('aria-pressed', +d.dataset.pose === i));
}

/* ---------- Socials ---------- */
function renderSocials(cfg) {
  const list = (cfg.socials || []).filter((s) => visible(s) && s.url);
  const attrs = (s) => (s.url.startsWith('mailto:') ? '' : 'target="_blank" rel="noopener"');
  $('.socials').innerHTML = list.map((s) => `
    <a class="social-link reveal" href="${esc(s.url)}" ${attrs(s)}>
      ${icon(s.icon)}
      <span><span class="social-label">${txt(s.label)}</span>${s.handle ? `<span class="social-handle">${txt(s.handle)}</span>` : ''}</span>
    </a>`).join('');
  $('.footer-socials').innerHTML = list.map((s) =>
    `<a href="${esc(s.url)}" ${attrs(s)} aria-label="${txt(s.label)}" title="${txt(s.label)}">${icon(s.icon)}</a>`).join('');
}

/* ---------- Events that survive re-rendering ---------- */
function initDelegatedEvents() {
  $('.filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-chip');
    if (!btn) return;
    app.filter = btn.dataset.filter;
    applyFilter();
    document.dispatchEvent(new Event('portfolio:layout'));
  });

  const rGrid = $('.renders-grid');
  const openRender = (i) => { const r = app.renders[i]; if (r) openLightbox(r.src, tr(r.alt || r.title), tr(r.title)); };
  rGrid.addEventListener('click', (e) => { const tile = e.target.closest('.render-tile'); if (tile) openRender(+tile.dataset.i); });
  rGrid.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.render-tile')) { e.preventDefault(); openRender(+e.target.dataset.i); }
  });

  $('.characters-grid').addEventListener('click', (e) => {
    const card = e.target.closest('.character-card');
    if (!card) return;
    const c = app.characters[+card.dataset.c];
    const dot = e.target.closest('.pose-dot');
    if (dot) { setPose(card, +dot.dataset.pose); return; }
    if (e.target.closest('.character-img')) {
      const im = c.images[+card.dataset.pose || 0];
      openLightbox(im.src, tr(im.alt) || tr(c.name), tr(c.name));
      return;
    }
    const tgl = e.target.closest('.char-3d');
    if (tgl) {
      const stage = $('.character-stage', card);
      const showing3d = card.classList.toggle('show-3d');
      if (showing3d) {
        loadModelViewer();
        stage.insertAdjacentHTML('beforeend', modelViewerHTML({ ...c, src: c.model, title: c.name }));
        watchModelErrors(stage);
      } else $('model-viewer, .model-fallback', stage)?.remove();
      $('span', tgl).textContent = showing3d ? tgl.dataset.label2d : tgl.dataset.label3d;
      return;
    }
  });

  const box = $('.lightbox');
  box.addEventListener('click', (e) => { if (e.target === box || e.target.closest('.lightbox-close')) box.close(); });
}

/* ---------- Language switch ---------- */
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
  $$('.lang-menu [data-lang]').forEach((b) => b.setAttribute('aria-current', b.dataset.lang === currentLanguage()));
}

/* ---------- Navigation ---------- */
function initNav() {
  const nav = $('.site-nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  $('.nav-toggle').addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    $('.nav-toggle').setAttribute('aria-expanded', open);
  });
  $$('.nav-links a').forEach((a) => a.addEventListener('click', () => document.body.classList.remove('nav-open')));

  const links = $$('.nav-links a[href^="#"]');
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${e.target.id}`));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['about', 'projects', 'models', 'characters', 'contact'].forEach((id) => { const s = document.getElementById(id); if (s) io.observe(s); });
}

function initReveal() {
  const els = $$('.reveal:not(.visible)');
  if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('visible')); return; }
  app.revealIO ??= new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('visible'); app.revealIO.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach((e) => app.revealIO.observe(e));
}

/* ---------- Play mode (lazy loaded) ---------- */
function initPlayButtons() {
  const toggle = async () => {
    document.body.classList.remove('nav-open');
    if (!app.game) {
      app.gameLoading ??= import('./game/playmode.js').then(async (m) => {
        const cfg = app.data?.game || await loadJSON(DATA.game);
        app.game = await m.createPlayMode(cfg, { texts: () => tObj('game') });
      });
      await app.gameLoading;
    }
    app.game?.toggle();
  };
  $$('.play-toggle').forEach((b) => b.addEventListener('click', (e) => { e.currentTarget.blur(); toggle(); }));
  addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'p' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (app.data?.game?.enabled === false) return;
    toggle();
  });
  document.addEventListener('portfolio:ready', (e) => {
    if (e.detail.game?.enabled === false) $$('.play-toggle').forEach((b) => b.remove());
  });
}

main();
