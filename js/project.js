/* =========================================================
   MAIPA portfolio — project page: project.html?id=<id>
   Built entirely from data/projects.json. The order of blocks depends on the
   category (override per project with "layout": ["play", "videos", ...]).
   ========================================================= */
import {
  bootPage, $, $$, esc, txt, tr, t, tf, icon, visible, tagsHTML, linksHTML, projectUrl, teamUrl,
  markdown, loadMarkdownFiles, openLightbox, mountModel, PROJECT_LAYOUTS, projectVideos, CATEGORY_ICONS,
  teamById, projectMembers, personLink, teamLogoHTML, hydrateVideoCovers,
} from './core.js';
const state = { project: null, gallery: [], viewer: null };
const id = new URLSearchParams(location.search).get('id');

bootPage({ page: 'project', render });
initEvents();

function render(d) {
  const cfg = d.projects;
  const p = (cfg.projects || []).find((x) => x.id === id && !x.hidden);
  // long texts can live in .md files: load them first, then render again
  if (p) {
    const team = p.team && teamById(p.team.id);
    loadMarkdownFiles([p.description, ...(p.sections || []).map((x) => x.body), team?.description]).then((loaded) => { if (loaded) render(d); });
  }
  const main = $('#main');
  state.viewer?.destroy(); state.viewer = null;
  if (!p) {
    document.title = `${t('project.notFound')} — MAIPA`;
    main.innerHTML = `
      <section class="pp-missing container">
        <div class="nf-card reveal">
          <p class="pixel-label">404</p>
          <h1 class="title">${esc(t('project.notFound'))}</h1>
          <p>${esc(t('project.notFoundText'))}</p>
          <a class="btn-pixel btn-pixel-lg pp-back" href="index.html#projects">${esc(t('project.back'))}</a>
        </div>
      </section>`;
    return;
  }
  state.project = p;
  const cat = (cfg.categories || []).find((c) => c.id === p.category);
  const title = tr(p.title);
  document.title = tf('meta.projectTitle', { title });
  document.querySelector('meta[name="description"]')?.setAttribute('content', tr(p.summary) || '');
  document.body.dataset.category = p.category;

  const layout = p.layout || PROJECT_LAYOUTS[p.category] || PROJECT_LAYOUTS.default;
  const blocks = layout.map((b) => BLOCKS[b]?.(p)).filter(Boolean).join('');
  const back = p.category === 'model' ? ['index.html#models', t('project.backModels')] : ['index.html#projects', t('project.back')];
  const iconSrc = p.icon || p.image;

  main.innerHTML = `
    <header class="pp-hero${p.banner ? ' has-banner' : ''}" ${p.banner ? `style="--banner:url('${esc(new URL(p.banner, location.href).href)}')"` : ''}>
      <div class="container pp-hero-inner">
        <a class="pp-back" href="${back[0]}">${icon('back')}<span>${esc(back[1])}</span></a>
        <div class="pp-head">
          ${iconSrc ? `<img class="pp-icon" src="${esc(iconSrc)}" alt="">` : p.banner ? '' : `<div class="pp-icon pp-icon-placeholder">${icon((cat && cat.icon) || CATEGORY_ICONS[p.category] || 'cube')}</div>`}
          <div class="pp-titles">
            <div class="pp-badges">
              ${cat ? `<span class="badge">${txt(cat.label)}</span>` : ''}
              ${p.year ? `<span class="badge badge-ghost">${txt(p.year)}</span>` : ''}
              ${teamBadge(p)}
            </div>
            <h1 class="pp-title">${esc(title)}</h1>
            ${p.summary ? `<p class="pp-summary">${txt(p.summary)}</p>` : ''}
          </div>
        </div>
        ${linksHTML(p.links, { cls: 'project-links pp-links' })}
      </div>
    </header>
    <div class="container pp-layout">
      <div class="pp-main">${blocks}</div>
      <aside class="pp-side">${sideHTML(p, cat)}</aside>
    </div>
    ${relatedHTML(p, cfg)}`;

  // mount interactive parts
  const mv = $('.pp-model-host', main);
  if (mv) state.viewer = mountModel(mv, p.model, { fallbackImage: firstImage(p), alt: title });
  hydrateVideoCovers(main);
}

function teamBadge(p) {
  const team = p.team && teamById(p.team.id);
  if (!team) return '';
  return `<a class="badge badge-ghost badge-link" href="${esc(teamUrl(team.id))}">${icon('users')}${txt(p.team.name || team.name)}</a>`;
}

/* ---------- Blocks ---------- */
const block = (key, title, body, extra = '') =>
  `<section class="pp-block pp-block--${key} reveal" ${extra}><h2 class="pp-block-title">${esc(title)}</h2>${body}</section>`;

const BLOCKS = {
  about(p) {
    const body = p.description || p.summary;
    if (!body) return '';
    return block('about', t('project.about'), `<div class="md">${markdown(tr(body))}</div>`);
  },
  sections(p) {
    return (p.sections || []).filter(visible).map((s) =>
      block('section', tr(s.title) || '', `<div class="md">${markdown(tr(s.body))}</div>`)).join('');
  },
  play(p) {
    const w = p.webBuild;
    if (!w || !w.url) return '';
    const poster = w.poster || p.banner || '';
    const aspect = w.width && w.height ? `${+w.width}/${+w.height}` : (w.aspect || '16/9');
    return block('play', t('project.play'), `
      <div class="pp-play-frame" style="--aspect:${esc(aspect)}" data-src="${esc(w.url)}" ${w.width && w.height ? `data-vw="${+w.width}" data-vh="${+w.height}"` : ''} data-keys="${w.captureKeys === false ? 0 : 1}">
        <button type="button" class="pp-play-start" ${poster ? `style="--poster:url('${esc(new URL(poster, location.href).href)}')"` : ''}>
          <span class="btn-pixel btn-pixel-lg">${icon('play')}${esc(t('project.playStart'))}</span>
          <small>${esc(t('project.playNote'))}</small>
        </button>
      </div>
      <div class="pp-play-tools">
        <button type="button" class="project-link pp-fullscreen">${icon('expand')}${esc(t('project.fullscreen'))}</button>
        <a class="project-link" href="${esc(w.url)}" target="_blank" rel="noopener">${icon('external')}${esc(t('project.newTab'))}</a>
      </div>`);
  },
  videos(p) {
    const list = projectVideos(p);
    if (!list.length) return '';
    return block('videos', t('project.videos'), `<div class="pp-videos">${list.map((v) => {
      const cover = v.cover ? new URL(v.cover, location.href).href : v.thumb;
      return `
      <figure class="pp-video">
        <button type="button" class="pp-video-start" data-embed="${esc(v.embed)}" data-title="${esc(v.title)}" ${cover ? `style="--thumb:url('${esc(cover)}')"` : v.site === 'Vimeo' ? `data-vimeo-id="${esc(v.id)}"` : ''}>
          <span class="pp-video-play">${icon('play')}</span>
          <span class="pp-video-site">${icon(v.site === 'YouTube' ? 'youtube' : 'vimeo')}${esc(v.site)}</span>
        </button>
        <figcaption>${esc(v.title)} · <a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(tf('video.open', { site: v.site }))}</a></figcaption>
      </figure>`;
    }).join('')}</div>`);
  },
  gallery(p) {
    const items = (p.gallery || []).filter((g) => visible(g) && (g.src || (g.variants || []).length));
    state.gallery = items;
    if (!items.length) return '';
    const title = tr(p.galleryTitle) || t(p.category === 'game' ? 'project.screenshots' : p.category === 'model' ? 'project.renders' : 'project.gallery');
    return block('gallery', title, `<div class="pp-gallery${items.length === 1 ? ' single' : ''}">${items.map((g, i) => {
      const vars = (g.variants || []).filter(visible);
      const src = vars[0]?.src || g.src;
      return `
      <figure class="pp-gallery-item" data-i="${i}" data-v="0">
        <button type="button" class="pp-gallery-open" aria-label="${esc(t('models.openImage'))}"><img src="${esc(src)}" alt="${txt(g.alt || g.caption)}" loading="lazy"></button>
        ${vars.length > 1 ? `<div class="variant-bar small">${vars.map((v, vi) => `<button type="button" class="variant-btn" data-v="${vi}" aria-pressed="${vi === 0}">${txt(v.label)}</button>`).join('')}</div>` : ''}
        ${g.caption ? `<figcaption>${txt(g.caption)}</figcaption>` : ''}
      </figure>`;
    }).join('')}</div>`);
  },
  model(p) {
    if (!p.model || !((p.model.variants || []).length || p.model.src)) return '';
    return block('model', t('project.model'), '<div class="pp-model-host"></div>');
  },
};

function firstImage(p) {
  const g = (p.gallery || [])[0];
  return p.banner || g?.src || g?.variants?.[0]?.src || p.icon || '';
}

/* ---------- Side column ---------- */
function sideHTML(p, cat) {
  const rows = [
    p.year ? [t('project.year'), txt(p.year)] : null,
    cat ? [t('project.category'), txt(cat.label)] : null,
  ].filter(Boolean);
  let html = `
    <div class="pp-side-card reveal">
      <h3>${esc(t('project.details'))}</h3>
      <dl>${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>
      ${(tr(p.tags) || []).length ? `<h4>${esc(t('project.tech'))}</h4>${tagsHTML(p.tags)}` : ''}
    </div>`;
  const team = p.team && teamById(p.team.id);
  const members = projectMembers(p);
  if (team || members.length) {
    html += `
    <div class="pp-side-card pp-team reveal">
      <h3>${icon('users')}${esc(t('project.team'))}</h3>
      ${team ? `<a class="pp-team-head" href="${esc(teamUrl(team.id))}">${teamLogoHTML(team, 'pp-team-logo')}<span><strong>${txt(p.team.name || team.name)}</strong><small>${esc(t('team.open'))} →</small></span></a>` : ''}
      ${members.length ? `<ul class="pp-members">${members.map(({ person, role }) => `
        <li class="${person.me ? 'me' : ''}">
          <span class="pp-member-name">${personLink(person)}${person.me ? `<span class="badge badge-featured">${esc(t('project.you'))}</span>` : ''}</span>
          ${role ? `<span class="pp-member-role">${txt(role)}</span>` : ''}
        </li>`).join('')}</ul>` : ''}
    </div>`;
  }
  const did = (p.whatIDid || p.myRole?.items || []).filter(Boolean);
  if (did.length) {
    html += `
    <div class="pp-side-card pp-role reveal">
      <h3>${esc(t('project.myRole'))}</h3>
      <ul class="pp-role-list">${did.map((it) => `<li>${markdown(tr(it)).replace(/^<p>|<\/p>$/g, '')}</li>`).join('')}</ul>
    </div>`;
  }
  return html;
}

function relatedHTML(p, cfg) {
  const rel = (p.related || []).map((rid) => (cfg.projects || []).find((x) => x.id === rid && !x.hidden)).filter(Boolean);
  if (!rel.length) return '';
  return `
  <section class="container pp-related reveal">
    <h2 class="pp-block-title">${esc(t('project.related'))}</h2>
    <div class="pp-related-grid">${rel.map((r) => `
      <a class="pp-related-card" href="${esc(projectUrl(r.id))}" data-pid="${esc(r.id)}">
        ${r.icon ? `<img src="${esc(r.icon)}" alt="">` : `<span class="pp-related-ph">${icon(CATEGORY_ICONS[r.category] || 'cube')}</span>`}
        <span><strong>${txt(r.title)}</strong>${r.summary ? `<small>${txt(r.summary)}</small>` : ''}</span>
      </a>`).join('')}</div>
  </section>`;
}

/* ---------- Events ---------- */
function initEvents() {
  const main = $('#main');
  main.addEventListener('click', (e) => {
    // web build: load only on click
    const start = e.target.closest('.pp-play-start');
    if (start) {
      startWebBuild(start.closest('.pp-play-frame'));
      return;
    }
    if (e.target.closest('.pp-fullscreen')) {
      const frame = $('.pp-play-frame', main);
      if (!frame.classList.contains('running')) $('.pp-play-start', frame)?.click();
      frame.requestFullscreen?.();
      return;
    }
    // inline videos
    const vs = e.target.closest('.pp-video-start');
    if (vs) {
      vs.outerHTML = `<iframe class="pp-video-iframe" src="${esc(vs.dataset.embed)}" title="${esc(vs.dataset.title)}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>`;
      return;
    }
    // gallery: variant switch
    const vb = e.target.closest('.pp-gallery-item .variant-btn');
    if (vb) {
      const item = vb.closest('.pp-gallery-item');
      const g = state.gallery[+item.dataset.i];
      const v = (g.variants || []).filter(visible)[+vb.dataset.v];
      item.dataset.v = vb.dataset.v;
      $('img', item).src = v.src;
      $$('.variant-btn', item).forEach((b) => b.setAttribute('aria-pressed', String(b === vb)));
      return;
    }
    // gallery: lightbox with the currently selected variants
    // gallery → lightbox. Every variant is its own slide, so ← → goes through
    // Textured → Wireframe of one render first, then on to the next render.
    const open = e.target.closest('.pp-gallery-open');
    if (open) {
      const slides = [];
      let start = 0;
      const clicked = open.closest('.pp-gallery-item');
      $$('.pp-gallery-item', main).forEach((el) => {
        const g = state.gallery[+el.dataset.i];
        const vars = (g.variants || []).filter(visible);
        const list = vars.length ? vars : [{ src: g.src }];
        list.forEach((v, vi) => {
          if (el === clicked && vi === (+el.dataset.v || 0)) start = slides.length;
          slides.push({ src: v.src, alt: tr(g.alt || g.caption) || '', caption: [tr(g.caption), vars.length ? tr(v.label) : ''].filter(Boolean).join(' — ') });
        });
      });
      openLightbox(slides, start);
    }
  });
}

/* ---------- Web builds ---------- */
// Games with a fixed pixel layout (e.g. p5.js createCanvas(windowWidth, windowHeight) + absolute positions)
// get a virtual resolution (webBuild.width/height): the iframe is rendered at that size and scaled to fit.
function startWebBuild(frame) {
  const vw = +frame.dataset.vw, vh = +frame.dataset.vh;
  frame.innerHTML = `<iframe src="${esc(frame.dataset.src)}" title="${esc(tr(state.project.title))}" allow="fullscreen; autoplay; gamepad; accelerometer; gyroscope" allowfullscreen
    ${vw && vh ? `style="width:${vw}px;height:${vh}px"` : ''}></iframe>`;
  frame.classList.add('running');
  const iframe = $('iframe', frame);
  if (vw && vh) {
    frame.classList.add('scaled');
    const fit = () => {
      const fs = document.fullscreenElement === frame;
      const s = Math.min(frame.clientWidth / vw, (fs ? frame.clientHeight : Infinity) / vh);
      iframe.style.transform = `scale(${s})`;
      iframe.style.left = `${Math.max(0, (frame.clientWidth - vw * s) / 2)}px`;
      iframe.style.top = `${Math.max(0, (frame.clientHeight - vh * s) / 2)}px`;
    };
    fit();
    new ResizeObserver(fit).observe(frame);
    document.addEventListener('fullscreenchange', fit);
  }
  // Arrow keys / space inside the game must not scroll this page.
  // Works for games on the same domain (maipa01.github.io); other domains can't be touched.
  if (frame.dataset.keys !== '0') {
    iframe.addEventListener('load', () => {
      try {
        const keys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'PageUp', 'PageDown', 'Home', 'End']);
        iframe.contentWindow.addEventListener('keydown', (e) => { if (keys.has(e.key)) e.preventDefault(); }, { capture: true });
        iframe.contentWindow.focus();
      } catch { /* cross-origin game: the browser doesn't allow it */ }
    });
  }
  iframe.focus();
}
