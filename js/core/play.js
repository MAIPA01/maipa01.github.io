/* =========================================================
   Play mode bootstrap: loads js/game/ only when someone presses P / PLAY,
   and keeps the mode on while navigating between pages (sessionStorage).
   ========================================================= */
import { tObj, tr } from './i18n.js';
import { $$, visible } from './dom.js';
import { session } from './storage.js';
import { site, DATA, loadJSON } from './site.js';
import { levelList } from './levels.js';

const PLAY_KEY = 'maipa-play';

/** Characters from data/characters.json that have a game sprite. */
export function playableCharacters() {
  const chars = site.data?.characters?.characters || [];
  return chars.filter((c) => visible(c) && c.game && c.game.sprite)
    .map((c) => ({ id: c.id || tr(c.name), name: tr(c.name), sprite: c.game.sprite, game: c.game }));
}

/** Key of the current page for records / levels: "home", "project:<id>", "team:<id>", "notfound", "finale". */
export function currentPageKey() {
  const id = new URLSearchParams(location.search).get('id');
  return ['project', 'team'].includes(site.page) ? `${site.page}:${id}` : site.page;
}

async function ensureGame() {
  if (site.game) return site.game;
  site.gameLoading ??= import('../game/index.js').then(async (m) => {
    const cfg = site.data?.game || await loadJSON(DATA.game);
    site.game = await m.createPlayMode(cfg, {
      texts: () => tObj('game'),
      tr,
      characters: playableCharacters,
      pageKey: currentPageKey(),
      levels: () => levelList(),
      onActiveChange: (active) => (active ? session.set(PLAY_KEY, 1) : session.remove(PLAY_KEY)),
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

/** PLAY buttons + the P key. Ignored while typing or while a game in an iframe has the focus. */
export function initPlayButtons() {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.play-toggle');
    if (!b) return;
    b.blur(); togglePlay();
  });
  addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'p' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (document.querySelector('dialog[open], .pp-play-frame.focused')) return;
    if (site.data?.game?.enabled === false) return;
    togglePlay();
  });
  document.addEventListener('portfolio:ready', (e) => {
    if (e.detail.game?.enabled === false) $$('.play-toggle').forEach((b) => b.remove());
  });
}

/** Turns the play mode back on after navigating, if it was on before. */
export async function resumePlayIfActive() {
  if (!session.get(PLAY_KEY) || site.data?.game?.enabled === false) return;
  const g = await ensureGame();
  if (g && !g.active) g.start({ resumed: true });
}
