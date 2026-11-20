/* =========================================================
   Project page: project.html?id=<id>  — built entirely from data/projects.json.

   pages/project/
     blocks.js     content blocks (about, sections, play, videos, gallery, model)
     side.js       right column (details, team, what I did) + related projects
     events.js     clicks (web build, videos, gallery variants, lightbox)
     web-build.js  games in an iframe (virtual resolution, keyboard focus)
   ========================================================= */
import {
  bootPage, $, esc, txt, tr, t, tf, icon, linksHTML, teamUrl, loadMarkdownFiles, mountModel,
  PROJECT_LAYOUTS, CATEGORY_ICONS, teamById, hydrateVideoCovers,
} from '../core/index.js';
import { BLOCKS, firstImage } from './project/blocks.js';
import { sideHTML, relatedHTML } from './project/side.js';
import { initEvents } from './project/events.js';

const state = { project: null, viewer: null };
const id = new URLSearchParams(location.search).get('id');

bootPage({ page: 'project', render });
initEvents(() => state.project);

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
