/* =========================================================
   Keyboard + touch buttons → actions.
   press(action) is the single entry point; menus (picker, garage)
   and the car game get the keys first when they are open.
   ========================================================= */
const KEY = {
  ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
  ' ': 'jump', z: 'jump', Z: 'jump', k: 'jump', K: 'jump',
  e: 'act', E: 'act', Enter: 'act', f: 'wave', F: 'wave', c: 'pick', C: 'pick',
  r: 'restart', R: 'restart', t: 'challenge', T: 'challenge', g: 'garage', G: 'garage', Escape: 'quit',
};

export function installInput(G) {
  const { input, player, ui } = G;

  G.press = (k) => {
    // menus first: ESC closes the menu instead of quitting the game
    if (G.menu === 'picker') { G.pickerKey(k); return; }
    if (G.menu === 'garage') { G.garageKey(k); return; }
    if (k === 'quit') { G.stop(); return; }
    if (k in input) { input[k] = true; if (k !== 'down') G.markRun(); }
    if (G.mode === 'car') { G.carPress(k); return; }

    switch (k) {
      case 'up': if (!player.wall) G.jumpBuffer = 0.12; break;    // ↑ jumps too, on a wall it climbs
      case 'jump': G.jumpBuffer = 0.12; G.markRun(); break;
      case 'down': G.dropDown(); break;
      case 'act': G.interact(); break;
      case 'wave': player.emote = 1.6; G.blip(880, 0.05); break;
      case 'pick': G.openPicker(); break;
      case 'restart':
        if (G.mode === 'challenge') G.startChallenge(true);
        else { G.spawn({ top: true }); G.showToast(G.T().toTop, 1.5); }
        break;
      case 'challenge': G.startChallenge(G.mode === 'challenge'); break;
      case 'garage': G.openGarage(); break;
      default:
    }
  };
  G.release = (k) => { if (k in input) input[k] = false; };

  addEventListener('keydown', (e) => {
    if (!G.active || document.querySelector('dialog[open]')) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    const k = KEY[e.key];
    if (!k) return;
    e.preventDefault();
    if (!e.repeat) G.press(k);
  });
  addEventListener('keyup', (e) => { const k = KEY[e.key]; if (G.active && k) G.release(k); });
  addEventListener('wheel', (e) => { if (G.active) e.preventDefault(); }, { passive: false });
  addEventListener('blur', G.releaseAll);
  addEventListener('resize', () => { if (G.active) { G.resizeCanvas(); G.scanPlatforms(); } });
  document.addEventListener('portfolio:layout', () => { if (G.active) requestAnimationFrame(() => { G.scanPlatforms(); G.applyLocks(); }); });

  ui.touch.querySelectorAll('button').forEach((b) => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('down'); G.press(k); });
    const up = () => { b.classList.remove('down'); G.release(k); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  });
}
