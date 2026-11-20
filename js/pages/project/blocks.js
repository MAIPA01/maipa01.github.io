/* =========================================================
   Project page — content blocks (about, sections, play, videos, gallery, model).
   Which blocks appear and in what order: PROJECT_LAYOUTS in js/core/levels.js
   (per category) or "layout" in the project's JSON.
   ========================================================= */
import { $, esc, txt, tr, t, tf, icon, visible, markdown, projectVideos } from '../../core/index.js';

/** Gallery items of the rendered project (used by the lightbox in events.js). */
export const galleryState = { items: [] };

export const block = (key, title, body, extra = '') =>
  `<section class="pp-block pp-block--${key} reveal" ${extra}><h2 class="pp-block-title">${esc(title)}</h2>${body}</section>`;

export const BLOCKS = {
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
    galleryState.items = items;
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

export function firstImage(p) {
  const g = (p.gallery || [])[0];
  return p.banner || g?.src || g?.variants?.[0]?.src || p.icon || '';
}
