/* =========================================================
   E = interact with the element you stand on.
   What happens is configured in data/game.json → "interact":
   CSS selector → action (open-project, open-team, back, click,
   select-character). The hidden car spot (car.secretAt) starts the
   car game. A small bubble above the player shows what E will do.
   ========================================================= */
import { fill, store, session } from './util.js';

export function installInteract(G) {
  const { player } = G;

  const inSecretSpot = () => {
    if (!G.carReady() || G.mode !== 'free') return false;
    const spot = G.CAR.secretAt && document.querySelector(G.CAR.secretAt);
    const r = spot && G.rectOf(spot);
    const p = player;
    return !!r && p.x + p.w > r.x && p.x < r.x + r.w && p.y + p.h > r.y && p.y < r.y + r.h;
  };

  G.interactTarget = () => {
    const g = player.ground;
    if (g && g.closest) {
      for (const [sel, action] of G.interactMap) {
        const target = g.closest(sel);
        if (!target) continue;
        if (action === 'select-character' && !G.characters().some((c) => c.id === target.dataset.char)) continue;
        return { el: target, action };
      }
    }
    if (inSecretSpot()) return { action: 'car' };
    return null;
  };

  const bubbleText = (it) => {
    const tx = G.T();
    switch (it.action) {
      case 'open-project': {
        const key = `project:${it.el.dataset.id}`;
        return G.isLevel(key) && !G.isUnlocked(key) ? tx.lockedShort : tx.openProject;
      }
      case 'open-team': return tx.openProject;
      case 'back': return tx.back;
      case 'select-character': return fill(tx.pickHere, { name: G.characters().find((c) => c.id === it.el.dataset.char)?.name || '' });
      case 'car': return store.get('maipa-secrets', {}).car ? tx.carHint : '';   // stays secret until found
      default: return tx.open;
    }
  };

  /** every frame: highlight + bubble for the current target */
  G.updateInteractHint = () => {
    const it = G.interactTarget();
    document.querySelectorAll('.game-hover').forEach((n) => { if (!it || n !== it.el) n.classList.remove('game-hover'); });
    const label = it ? bubbleText(it) : '';
    if (it && label) it.el?.classList.add('game-hover');
    G.setBubble(label);
  };

  G.interact = () => {
    const it = G.interactTarget();
    if (!it) return;
    G.blip(660, 0.06);
    switch (it.action) {
      case 'car': G.startCarGame(); return;
      case 'open-project':
      case 'open-team': {
        const a = it.el.querySelector('a.card-link') || it.el.closest('a');
        const href = a?.href;
        if (!href || G.navigationBlocked(G.projectKeyFromHref(href))) return;
        // come back above the same card later
        if (it.el.dataset.id) session.set('maipa-spawn', { page: G.pageKey, sel: `[data-id="${CSS.escape(it.el.dataset.id)}"]` });
        location.href = href;
        return;
      }
      case 'back': {
        if (G.navigationBlocked(null)) return;
        const id = G.pageKey.startsWith('project:') ? G.pageKey.slice(8) : '';
        if (id) session.set('maipa-spawn', { page: 'home', sel: `[data-id="${CSS.escape(id)}"]` });
        it.el.click();
        return;
      }
      case 'select-character': G.setCharacter(it.el.dataset.char, { announce: true }); return;
      default: it.el.click();
    }
  };
}
