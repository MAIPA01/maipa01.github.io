/* =========================================================
   Project page — clicks: start web build, fullscreen, inline videos, gallery variants, lightbox.
   ========================================================= */
import { $, $$, esc, tr, visible, openLightbox } from '../../core/index.js';
import { galleryState } from './blocks.js';
import { startWebBuild } from './web-build.js';

export function initEvents(getProject) {
  const main = $('#main');
  main.addEventListener('click', (e) => {
    // web build: load only on click
    const start = e.target.closest('.pp-play-start');
    if (start) {
      startWebBuild(start.closest('.pp-play-frame'), tr(getProject()?.title));
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
      const g = galleryState.items[+item.dataset.i];
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
        const g = galleryState.items[+el.dataset.i];
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
