/* =========================================================
   HUD bar at the top: wallet + level state (free), coins + timer
   (challenge) or score (car). full = rebuild the HTML, otherwise only
   the numbers that change every frame are updated.
   ========================================================= */
import { escapeHTML, fmtTime, store } from './util.js';

export function installHud(G) {
  const { hud } = G.ui;
  let hudMode = '';
  const carIcon = '<canvas class="hud-car" width="32" height="16"></canvas>';
  /** draws the equipped car (body + wheels) into the HUD icon */
  const paintCarIcon = () => hud.querySelectorAll('canvas.hud-car').forEach((cv) => {
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    G.drawCar(c, 0, 0, { ...G.carEquip(), scale: 1 });
  });
  G.updateHud = (full = false) => {
    const tx = G.T();
    if (G.mode !== hudMode) { full = true; hudMode = G.mode; }
    if (G.mode === 'challenge') {
      if (full) {
        const total = G.coins.filter((c) => c.alive || c.taken).length, got = G.coins.filter((c) => c.taken).length;
        const best = store.get(`maipa-best:${G.pageKey}`);
        hud.innerHTML = `<span class="coin-icon"></span><span class="hud-count">${got}/${total}</span><span class="hud-sep"></span>
          <span class="hud-time"></span>${best ? `<span class="hud-best">${escapeHTML(tx.best)} ${fmtTime(best)}</span>` : ''}`;
      }
      const time = hud.querySelector('.hud-time');
      if (time) time.textContent = `${tx.time} ${fmtTime(G.run.time)}`;
    } else if (G.mode === 'car') {
      if (full) hud.innerHTML = `${carIcon}<span class="hud-score"></span><span class="hud-sep"></span><span class="hud-best">${escapeHTML(tx.best)} ${store.get('maipa-car-best', 0)}</span>`;
      const sc = hud.querySelector('.hud-score');
      if (sc) sc.textContent = `${tx.score} ${G.carScore()}`;
    } else if (full) {
      const p = G.progress();
      const level = G.isLevel() ? (p.done[G.pageKey] ? tx.levelDone : G.isUnlocked(G.pageKey) ? tx.levelOpen : tx.levelLocked) : '';
      hud.innerHTML = `<span class="hud-wallet"><span class="coin-icon"></span>${p.wallet}</span>
        ${level ? `<span class="hud-sep"></span><span>${escapeHTML(level)}</span>` : ''}
        <span class="hud-sep"></span><span class="hud-hint">${escapeHTML(G.isLevel() ? tx.hintFree : tx.hintFreeNoLevel)}</span>
        ${store.get('maipa-secrets', {}).car && G.carReady() ? carIcon : ''}`;
    }
    if (full) paintCarIcon();
  };
}
