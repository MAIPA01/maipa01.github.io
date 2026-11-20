/* =========================================================
   Lightbox (images, galleries) and video player (YouTube / Vimeo) + video covers.
   ========================================================= */
import { icon } from './icons.js';
import { tf } from './i18n.js';
import { $, $$, esc } from './dom.js';

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

/** Adds the lightbox + video dialogs to the page and wires their events. Called once by bootPage(). */
export function initDialogs() {
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
    </dialog>`);
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

