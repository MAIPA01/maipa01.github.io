/* =========================================================
   MAIPA portfolio — home page. Everything comes from /data/*.json.
   ========================================================= */
import {
  bootPage, $, $$, esc, txt, tr, t, icon, visible, tagsHTML, linksHTML, projectUrl,
  openLightbox, mountModel, playableCharacters, projectCardHTML, homeProjectOrder,
} from './core.js';
const home = { filter: '*', typeToken: 0, characters: [], viewers: new Map() };

bootPage({ page: 'home', render });
initDelegatedEvents();

function render(d) {
  renderProfile(d.profile);
  renderProjects(d.projects);
  renderModelTiles(d.projects);
  renderCharacters(d.characters);
  renderSocials(d.socials);
}

/* ---------- Profile / about ---------- */
function renderProfile(p) {
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
  const token = ++home.typeToken;
  el.closest('.hero-role').hidden = !roles.length;
  if (!roles.length) return;
  el.textContent = roles[0];
  if (roles.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let i = 0, pos = roles[0].length, deleting = true;
  const tick = () => {
    if (token !== home.typeToken) return;
    if (deleting) {
      pos--; el.textContent = roles[i].slice(0, pos);
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
  const projects = homeProjectOrder().grid;

  $('.projects-grid').innerHTML = projects.map((p) => projectCardHTML(p)).join('') ||
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
  if (!filters.some((f) => f.id === home.filter)) home.filter = '*';
  bar.innerHTML = filters.map((f) =>
    `<button class="filter-chip" type="button" data-filter="${esc(f.id)}" aria-pressed="${f.id === home.filter}">${esc(f.label)}<span class="count">${f.count}</span></button>`).join('');
  applyFilter();
}

function applyFilter() {
  const f = home.filter;
  $$('.filter-chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === f)));
  $$('.projects-grid .project-card').forEach((card) => {
    const show = f === '*' || card.dataset.category === f || (f === '@playstore' && card.dataset.play === '1');
    card.classList.toggle('is-hidden', !show);
  });
}

/* ---------- 3D models: project tiles ---------- */
function renderModelTiles(cfg) {
  const list = (cfg.projects || []).filter((p) => visible(p) && p.category === 'model');
  $('#models').hidden = !list.length;
  $('.band-2').hidden = !list.length;
  $('.nav-links a[href$="#models"]').hidden = !list.length;
  $('.models-grid').innerHTML = list.map((p) => {
    const img = p.banner || p.gallery?.[0]?.src || p.gallery?.[0]?.variants?.[0]?.src || p.icon || '';
    const variants = p.model?.variants?.filter((v) => !v.hidden) || [];
    const renders = (p.gallery || []).length;
    return `
    <article class="model-tile reveal" data-id="${esc(p.id)}">
      <a class="card-link" href="${esc(projectUrl(p.id))}" aria-label="${txt(p.title)}"></a>
      <div class="model-tile-media">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : `<div class="project-placeholder">${icon('cube')}</div>`}</div>
      <div class="model-tile-body">
        <h3>${txt(p.title)}</h3>
        ${p.summary ? `<p>${txt(p.summary)}</p>` : ''}
        <div class="model-tile-meta">
          ${variants.length ? `<span class="badge">${icon('cube')} 3D${variants.length > 1 ? ` × ${variants.length}` : ''}</span>` : ''}
          ${renders ? `<span class="badge">${icon('image')} ${renders}</span>` : ''}
          <span class="details-link">${esc(t('sections.models.open'))} →</span>
        </div>
      </div>
    </article>`;
  }).join('');
}

/* ---------- Characters ---------- */
function renderCharacters(cfg) {
  const list = ((cfg && cfg.characters) || []).filter((c) => visible(c) && (c.images || []).length);
  $('#characters').hidden = !list.length;
  $('.nav-links a[href$="#characters"]').hidden = !list.length;
  home.characters = list;
  home.viewers.forEach((v) => v.destroy()); home.viewers.clear();
  const playable = new Set(playableCharacters().map((c) => c.id));

  $('.characters-grid').innerHTML = list.map((c, ci) => {
    const imgs = c.images;
    const dots = imgs.length > 1
      ? `<div class="pose-dots">${imgs.map((_, i) => `<button type="button" class="pose-dot" data-pose="${i}" aria-pressed="${i === 0}" aria-label="${esc(t('characters.pose'))} ${i + 1}"></button>`).join('')}</div>`
      : '';
    const toggle3d = c.model
      ? `<button type="button" class="project-link char-3d">${icon('cube')}<span>${esc(t('characters.view3d'))}</span></button>`
      : '';
    return `
    <article class="character-card reveal" data-c="${ci}" data-pose="0" data-char="${esc(c.id || '')}">
      <div class="character-stage">
        <button type="button" class="character-img" aria-label="${esc(t('models.openImage'))}">
          <img src="${esc(imgs[0].src)}" alt="${txt(imgs[0].alt || c.name)}" loading="lazy">
        </button>
        ${dots}
        ${playable.has(c.id) ? `<span class="char-sprite" style="--sprite:url('${esc(new URL(c.game.sprite, location.href).href)}')" aria-hidden="true"></span>` : ''}
        <div class="character-3d"></div>
      </div>
      <div class="character-body">
        <h3>${txt(c.name)}</h3>
        ${c.description ? `<p>${txt(c.description)}</p>` : ''}
        ${tagsHTML(c.tags)}
        ${(c.links || []).some((l) => l.url) || toggle3d ? `<div class="project-links">${toggle3d}${linksHTML(c.links, { cls: 'inline-links', primaryFirst: !toggle3d })}</div>` : ''}
      </div>
    </article>`;
  }).join('');
  list.forEach((c) => c.images.slice(1).forEach((im) => { const i = new Image(); i.src = im.src; }));
}

function setPose(card, i) {
  const c = home.characters[+card.dataset.c];
  const im = c.images[i];
  card.dataset.pose = i;
  const img = $('.character-img img', card);
  img.src = im.src; img.alt = tr(im.alt) || tr(c.name);
  $$('.pose-dot', card).forEach((d) => d.setAttribute('aria-pressed', String(+d.dataset.pose === i)));
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
}

/* ---------- Events that survive re-rendering ---------- */
function initDelegatedEvents() {
  document.addEventListener('game:challenge', () => { home.filter = '*'; applyFilter(); });
  $('.filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-chip');
    if (!btn || document.body.classList.contains('game-challenge')) return; // all cards stay visible during a challenge
    home.filter = btn.dataset.filter;
    applyFilter();
    document.dispatchEvent(new Event('portfolio:layout'));
  });

  $('.characters-grid').addEventListener('click', (e) => {
    const card = e.target.closest('.character-card');
    if (!card) return;
    const ci = +card.dataset.c;
    const c = home.characters[ci];
    const dot = e.target.closest('.pose-dot');
    if (dot) { setPose(card, +dot.dataset.pose); return; }
    if (e.target.closest('.character-img')) {
      const items = c.images.map((im) => ({ src: im.src, alt: tr(im.alt) || tr(c.name), caption: tr(c.name) }));
      openLightbox(items, +card.dataset.pose || 0);
      return;
    }
    const tgl = e.target.closest('.char-3d');
    if (tgl) {
      const host = $('.character-3d', card);
      const on = card.classList.toggle('show-3d');
      if (on) {
        const model = typeof c.model === 'string' ? { src: c.model } : c.model;
        home.viewers.set(ci, mountModel(host, model, { fallbackImage: c.images[0].src, alt: tr(c.name) }));
      } else { home.viewers.get(ci)?.destroy(); home.viewers.delete(ci); }
      $('span', tgl).textContent = on ? t('characters.view2d') : t('characters.view3d');
    }
  });
}
