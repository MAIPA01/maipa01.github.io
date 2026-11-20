/* =========================================================
   Project page layouts + game levels (hub → project pages) + progress helpers.
   ========================================================= */
import { t, tr } from './i18n.js';
import { visible, projectUrl } from './dom.js';
import { store } from './storage.js';
import { site } from './site.js';
import { parseVideo } from './media.js';
import { homeProjectOrder } from './content.js';

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


/* ---------- Progress of the play mode (localStorage "maipa-progress") ---------- */
export const PROGRESS_KEY = 'maipa-progress';
export const readProgress = () => ({ done: {}, wallet: 0, owned: [], equip: {}, ...(store.get(PROGRESS_KEY, {}) || {}) });

/** true when the challenge of every level (hub + all project pages) is done. */
export function isPortfolioComplete(data = site.data) {
  if (!data) return false;
  const done = readProgress().done;
  const levels = levelList(data);
  return levels.length > 0 && levels.every((l) => done[l.key]);
}

/**
 * Helpers for testing in the browser console (F12):
 *   maipa.completeAll()   – mark every level as done (+ the coins) → finale page unlocked
 *   maipa.resetProgress() – forget levels, coins and purchases
 */
export function installDevTools() {
  window.maipa = {
    completeAll() {
      const p = readProgress();
      levelList().forEach((l) => { if (!p.done[l.key]) { p.done[l.key] = true; p.wallet += l.coins || 0; } });
      store.set(PROGRESS_KEY, p);
      return 'All levels completed — open finale.html';
    },
    resetProgress() { store.remove(PROGRESS_KEY); return 'Progress cleared'; },
    progress: readProgress,
  };
}
