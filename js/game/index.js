/* =========================================================
   PLAY MODE — a pixel-art platformer that uses the page itself as the level.
   Entry point: createPlayMode(config, options) → { start, stop, toggle, invalidate, active }.

   Modes
   - FREE (after pressing P): walk, jump, climb the page edges, open projects with E.
     R = back to the top of the page.
   - CHALLENGE (T): coins above cards/blocks, timer, level completion (challenge.js).
   - CAR (secret): E inside the band with the car render → endless runner (car/runner.js).
   ESC leaves the play mode (or closes an open menu).

   Modules (each adds functions to the shared context G, see context.js):
     context.js      config + shared state        ui.js        canvas, HUD, toasts, bubble, particles
     audio.js        8-bit sounds                  progress.js  saved progress, levels, locks
     level.js        platforms & coins from DOM    physics.js   landing / falling / walls
     characters.js   characters + picker (C)       player.js    movement, climbing, camera
     interact.js     E actions + hint bubble       challenge.js T challenge + rewards
     hud.js          top bar                       input.js     keyboard + touch buttons
     render.js       drawing                       car/         parts, runner, garage
   ========================================================= */
import { createContext } from './context.js';
import { loadImageOrNull, store, session } from './util.js';
import { installAudio } from './audio.js';
import { installUI } from './ui.js';
import { installProgress } from './progress.js';
import { installLevel } from './level.js';
import { installPhysics } from './physics.js';
import { installCharacters } from './characters.js';
import { installPlayer } from './player.js';
import { installInteract } from './interact.js';
import { installChallenge } from './challenge.js';
import { installHud } from './hud.js';
import { installInput } from './input.js';
import { installRender } from './render.js';
import { installCarParts } from './car/parts.js';
import { installCarRunner } from './car/runner.js';
import { installGarage } from './car/garage.js';

export async function createPlayMode(cfg = {}, opts = {}) {
  const G = createContext(cfg, opts);
  installAudio(G);
  installUI(G);
  installProgress(G);
  installLevel(G);
  installPhysics(G);
  installCharacters(G);
  installPlayer(G);
  installInteract(G);
  installChallenge(G);
  installHud(G);
  installRender(G);
  installInput(G);
  installCarRunner(G);
  installGarage(G);
  const [coinImg] = await Promise.all([loadImageOrNull(G.C.sprite), installCarParts(G)]);
  G.coinImg = coinImg;

  /* ---------- lifecycle ---------- */
  let raf = 0, last = 0, hudTick = 0;

  async function start({ resumed = false } = {}) {
    if (G.active) return;
    G.active = true;
    G.mode = 'free';
    opts.onActiveChange?.(true);
    document.body.classList.add('play-mode');
    G.ui.playNodes.forEach((n) => { n.hidden = false; });
    G.resizeCanvas(); G.scanPlatforms();
    if (!G.look) await G.setCharacter(G.charId, { save: false });
    G.spawn({ top: resumed && !session.get('maipa-spawn') });
    G.applyLocks();
    G.updateHud(true);
    G.showToast(G.ui.isTouch ? G.T().startTouch : G.T().start, 8);
    G.blip(440, 0.1, 'square', 2);
    last = performance.now();
    raf = requestAnimationFrame(loop);
    if (!resumed && !store.get('maipa-char') && G.characters().length > 1) G.openPicker();
  }

  function stop() {
    if (!G.active) return;
    G.active = false;
    cancelAnimationFrame(raf);
    opts.onActiveChange?.(false);
    G.closePicker(); G.closeGarage(); G.hideToast(); G.setBubble('');
    G.mode = 'free'; G.coins = []; G.particles = []; G.run.start = null; G.run.done = false;
    document.body.classList.remove('play-mode', 'game-challenge', 'game-car');
    G.ui.playNodes.forEach((n) => { n.hidden = true; });
    document.querySelectorAll('.game-hover').forEach((n) => n.classList.remove('game-hover'));
    G.clearLocks();
    G.releaseAll();
  }
  G.stop = stop;

  /** the page was re-rendered (e.g. language change): elements are new */
  function invalidate() {
    if (!G.active) return;
    requestAnimationFrame(() => {
      G.abortChallenge();
      G.scanPlatforms(); G.applyLocks(); G.updateHud(true);
    });
  }

  /* ---------- main loop ---------- */
  function loop(now) {
    if (!G.active) return;
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now; G.t += dt; G.frame++;
    if (G.frame % 20 === 0) G.scanPlatforms();
    G.tickToast(dt);                       // messages disappear even while a menu is open
    if (G.menu === 'picker') G.drawPicker(dt);
    else if (!G.menu) update(dt);
    if (G.mode === 'car') G.carCamera(dt); else G.camera(dt);
    G.draw();
    raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    G.jumpBuffer -= dt; G.coyote -= dt; G.dropTimer -= dt;
    if (G.dropTimer <= 0) G.dropEl = null;
    if (G.mode === 'car') G.updateCarGame(dt);
    else {
      G.updatePlayer(dt);
      G.updateInteractHint();
      // wave when landing on a contact link
      const social = G.player.ground?.closest?.('.social-link');
      if (social && !waved.has(social)) { waved.add(social); G.player.emote = 1.4; }
      if (G.mode === 'challenge') G.updateChallenge();
    }
    if (++hudTick % 4 === 0) G.updateHud();
    G.updateParticles(dt);
  }
  const waved = new Set();

  await G.setCharacter(G.charId, { save: false });
  return {
    start, stop, invalidate,
    toggle: () => (G.active ? stop() : start()),
    get active() { return G.active; },
    /** read-only snapshot for debugging: __maipaGame.debug */
    get debug() {
      return {
        mode: G.mode, menu: G.menu, player: G.player, car: G.car, run: G.run,
        coins: G.coins.length, taken: G.coins.filter((c) => c.taken).length, walls: G.walls.length, platforms: G.platforms.length,
        charId: G.charId, progress: G.progress(), prices: G.shopItems().map((i) => [i.id, i.price]), total: G.totalCoins(),
        toast: G.ui.toast.classList.contains('hide') ? '' : G.ui.toast.textContent,
      };
    },
    /** for automated tests */
    _G: G,
  };
}
