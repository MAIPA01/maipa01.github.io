/* =========================================================
   Progress saved in localStorage ("maipa-progress"):
     done:   { "<levelKey>": true }   completed challenges
     wallet: coins to spend in the garage
     owned:  ["body:midnight", "wheels:sport", "upgrade:shield", …]
     equip:  { body: "classic", wheels: "standard" }

   Levels: home page = hub, then every project page in the order of the
   cards. A level is unlocked when the previous one is done. Locks only
   exist while the play mode is on — normal visitors can browse everything.
   ========================================================= */
import { store, fill } from './util.js';
import { PROGRESS_KEY, isPortfolioComplete } from '../core/levels.js';

export function installProgress(G) {
  G.progress = () => {
    const p = { done: {}, wallet: 0, owned: [], equip: {}, ...(store.get(PROGRESS_KEY, {}) || {}) };
    // saves from older versions had car colours ("color:…") — they no longer exist
    p.owned = (p.owned || []).filter((id) => !id.startsWith('color:'));
    p.equip = { ...(p.equip || {}) };
    delete p.equip.color;
    return p;
  };
  G.saveProgress = (p) => store.set(PROGRESS_KEY, p);
  G.owns = (id) => G.progress().owned.includes(id);
  G.isPortfolioComplete = () => isPortfolioComplete();

  G.levels = () => (G.opts.levels ? G.opts.levels() : [{ key: 'home', coins: 0 }]);
  G.levelIndex = (key) => G.levels().findIndex((l) => l.key === key);
  G.isLevel = (key = G.pageKey) => G.levelIndex(key) >= 0;
  G.isUnlocked = (key) => {
    const i = G.levelIndex(key);
    return i <= 0 || !!G.progress().done[G.levels()[i - 1].key];
  };
  G.previousLevel = (key) => G.levels()[G.levelIndex(key) - 1];
  G.totalCoins = () => G.levels().reduce((a, l) => a + (l.coins || 0), 0);

  /* ---------- locks on cards / links ---------- */
  G.projectKeyFromHref = (href) => {
    try {
      const u = new URL(href, location.href);
      if (!/project\.html$/.test(u.pathname)) return null;
      const id = u.searchParams.get('id');
      return id ? `project:${id}` : null;
    } catch { return null; }
  };
  G.clearLocks = () => document.querySelectorAll('.game-locked, .game-done').forEach((n) => n.classList.remove('game-locked', 'game-done'));
  G.applyLocks = () => {
    G.clearLocks();
    if (!G.active) return;
    const { done } = G.progress();
    document.querySelectorAll('.project-card[data-id], .model-tile[data-id], .pp-related-card[data-pid]').forEach((n) => {
      const key = `project:${n.dataset.id || n.dataset.pid}`;
      if (!G.isLevel(key)) return;
      n.classList.toggle('game-locked', !G.isUnlocked(key));
      n.classList.toggle('game-done', !!done[key]);
    });
  };

  /** true (and a message) when leaving the page is not allowed right now */
  G.navigationBlocked = (key) => {
    const tx = G.T();
    if (G.mode === 'challenge') { G.showToast(tx.challengeBlock, 3); G.errorSound(); return true; }
    if (key && G.isLevel(key) && !G.isUnlocked(key)) {
      G.showToast(fill(tx.locked, { level: G.previousLevel(key)?.title || '' }), 3.5); G.errorSound();
      return true;
    }
    return false;
  };

  // mouse clicks on links follow the same rules as E while the play mode is on
  document.addEventListener('click', (e) => {
    if (!G.active) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download') || a.dataset.video) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search)) return;
    if (G.navigationBlocked(G.projectKeyFromHref(a.href))) { e.preventDefault(); e.stopPropagation(); }
  }, true);
}
