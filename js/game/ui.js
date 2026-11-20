/* =========================================================
   Game UI on top of the page: canvas, HUD bar, toast messages,
   speech bubble above the player and the touch buttons.

   Toasts: showToast(text, seconds) — hides itself after the given time.
   seconds = Infinity keeps it until hideToast() (used for "game over").
   Every mode change hides the previous message.
   ========================================================= */
import { el } from './util.js';

export function installUI(G) {
  const ui = G.ui = {};
  ui.canvas = el('canvas', 'game-canvas');
  ui.canvas.setAttribute('aria-hidden', 'true');
  ui.ctx = ui.canvas.getContext('2d');
  ui.hud = el('div', 'game-hud');
  ui.toast = el('div', 'game-toast hide');
  ui.bubble = el('div', 'game-bubble');
  ui.touch = el('div', 'game-touch', `
    <div class="pad pad-left"><button class="small" data-k="pick">C</button><button class="small" data-k="restart">R</button>
      <button class="small" data-k="challenge">T</button><button class="small" data-k="garage">G</button>
      <button data-k="left" aria-label="Left">◀</button><button data-k="right" aria-label="Right">▶</button></div>
    <div class="pad pad-right"><button class="small" data-k="act">E</button><button class="small" data-k="wave">F</button><span></span>
      <button data-k="down" aria-label="Down">▼</button><button data-k="up" aria-label="Up">▲</button><button class="jump" data-k="jump" aria-label="Jump">A</button></div>
    <button data-k="quit" class="quit" aria-label="Quit">X</button>`);
  ui.picker = el('div', 'game-picker');
  ui.garage = el('div', 'game-garage');
  ui.isTouch = matchMedia('(pointer: coarse)').matches;
  if (ui.isTouch) { ui.touch.classList.add('enabled'); ui.toast.classList.add('touch'); }
  ui.playNodes = [ui.canvas, ui.hud, ui.toast, ui.bubble, ui.touch];
  [...ui.playNodes, ui.picker, ui.garage].forEach((n) => { n.hidden = true; document.body.appendChild(n); });

  let toastLeft = 0;
  G.showToast = (msg, secs = 3) => {
    if (!msg) return;
    ui.toast.textContent = msg;
    ui.toast.classList.remove('hide');
    toastLeft = secs;
  };
  G.hideToast = () => { ui.toast.classList.add('hide'); toastLeft = 0; };
  /** called every frame by the main loop (also while menus are open) */
  G.tickToast = (dt) => { if (toastLeft > 0 && toastLeft !== Infinity && (toastLeft -= dt) <= 0) G.hideToast(); };

  G.setBubble = (text) => {
    ui.bubble.hidden = !text;
    if (text) ui.bubble.textContent = text;
  };
  G.positionBubble = (x, y) => {
    if (ui.bubble.hidden) return;
    ui.bubble.style.left = `${Math.round(x)}px`;
    ui.bubble.style.top = `${Math.round(y)}px`;
  };

  G.resizeCanvas = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    ui.canvas.width = Math.round(innerWidth * dpr); ui.canvas.height = Math.round(innerHeight * dpr);
    ui.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ui.ctx.imageSmoothingEnabled = false;
  };

  G.burst = (x, y, n, color) => {
    for (let i = 0; i < n; i++) {
      G.particles.push({ x, y, vx: (Math.random() - 0.5) * 320, vy: -Math.random() * 320 - 60, life: 0.35 + Math.random() * 0.35, s: G.S + (Math.random() < 0.3 ? G.S : 0), c: color });
    }
  };
  G.updateParticles = (dt) => {
    G.particles = G.particles.filter((q) => (q.life -= dt) > 0);
    G.particles.forEach((q) => { q.vy += (q.g ?? 900) * dt; q.x += q.vx * dt; q.y += q.vy * dt; });
  };
}
