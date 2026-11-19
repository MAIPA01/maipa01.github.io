/* =========================================================
   PLAY MODE — a pixel-art platformer that uses the page itself as the level.

   Modes
   - FREE (default after pressing P): walk, jump, climb the page edges, open projects with E.
     R = back to the top of the page.
   - CHALLENGE (T): teleports to the top, coins appear above cards/blocks, the timer starts on the
     first move. Collect all = level completed (record, coins for the garage, next level unlocked).
     R = restart the challenge. You can't leave the page or use the car while it runs.
   - CAR (secret): press E inside the band with the side render of the car → endless runner
     (obstacles come from the right; SPACE/↑ jump, ↓ slams down). R = restart, E = get out.
   ESC always leaves the play mode.

   Levels: the home page is the hub; project pages are levels unlocked one after another
   (home first, then in the order of the cards). Locks only exist while the play mode is on —
   normal visitors can always browse everything.
   ========================================================= */

const loadImage = (src) => new Promise((resolve, reject) => {
  if (!src) return reject(new Error('no src'));
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`;
const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(v), String(s));
const ls = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};
const ss = {
  get(k) { try { const v = sessionStorage.getItem(k); return v === null ? null : JSON.parse(v); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  del(k) { try { sessionStorage.removeItem(k); } catch { /* ignore */ } },
};
const hexToRgb = (h) => { const n = parseInt(String(h).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

const DEFAULT_CAR_COLORS = {
  'maipa-chan': { body: '#1e1e22', shade: '#0d0d10' },
  remi: { body: '#a8652a', shade: '#6e3f16' },
  'maipa-senpai': { body: '#7d1214', shade: '#470a0b' },
};
const DEFAULT_SHOP = {
  colorWeight: 1,
  upgrades: [
    { id: 'springs', weight: 2 },
    { id: 'doubleJump', weight: 3 },
    { id: 'shield', weight: 3 },
  ],
};

export async function createPlayMode(cfg = {}, opts = {}) {
  const S = cfg.pixelScale || 4;
  const PL = cfg.player || {};
  const C = cfg.collectible || {};
  const CAR = {
    enabled: true, sprite: 'assets/game/car.png', frameWidth: 32, frameHeight: 16, frames: [0, 1],
    hitbox: { x: 1, y: 3, w: 30, h: 13 }, secretAt: '.band-1',
    speed: 430, speedUp: 14, maxSpeed: 1150, jumpVelocity: 900, slamSpeed: 1700, gravity: 2600, ...(cfg.car || {}),
  };
  const phys = {
    gravity: 2200, moveSpeed: 340, jumpVelocity: 820, doubleJump: true, maxFallSpeed: 1100,
    wallSlideSpeed: 140, climbSpeed: 170, climbStamina: 4, wallJumpPush: 360, elementWalls: false, ...(cfg.physics || {}),
  };
  const SHOP = { ...DEFAULT_SHOP, ...(cfg.shop || {}) };
  const T = () => ({
    start: 'PLAY MODE', startTouch: 'PLAY MODE', open: 'E', collected: 'coins', won: 'GG! {time}', time: 'time', best: 'best',
    newRecord: 'NEW RECORD!', pick: 'CHOOSE YOUR CHARACTER', pickHint: '← → / ENTER', openProject: 'E', back: 'E', pickHere: 'E: {name}',
    ...(opts.texts ? opts.texts() : {}),
  });
  const pageKey = opts.pageKey || location.pathname;
  const platformSel = (cfg.platforms || ['.project-card']).join(',');
  const coinSel = (cfg.coinsOn || []).join(',');
  const interactMap = Object.entries(cfg.interact || {});

  const coinImg = await loadImage(C.sprite).catch(() => null);
  const carImg = CAR.enabled && CAR.sprite ? await loadImage(CAR.sprite).catch(() => null) : null;
  const cw = C.frameWidth || 8, ch = C.frameHeight || 8;
  const coinFrames = C.frames || [0];

  /* ---------- Progress (localStorage) ---------- */
  const PROGRESS_KEY = 'maipa-progress';
  const progress = () => ({ done: {}, wallet: 0, owned: ['color:classic'], equip: { color: 'classic' }, ...(ls.get(PROGRESS_KEY, {}) || {}) });
  const saveProgress = (p) => ls.set(PROGRESS_KEY, p);
  const levels = () => (opts.levels ? opts.levels() : [{ key: 'home', coins: 0 }]);
  const levelIndex = (key) => levels().findIndex((l) => l.key === key);
  const isLevel = (key = pageKey) => levelIndex(key) >= 0;
  const isUnlocked = (key) => {
    const i = levelIndex(key);
    if (i <= 0) return true;
    return !!progress().done[levels()[i - 1].key];
  };
  const previousLevel = (key) => levels()[levelIndex(key) - 1];
  const totalCoins = () => levels().reduce((a, l) => a + (l.coins || 0), 0);

  /* ---------- Characters ---------- */
  const characters = () => (opts.characters ? opts.characters() : []);
  const spriteCache = new Map();
  const spriteFor = (c) => {
    if (!c) return Promise.resolve(null);
    if (!spriteCache.has(c.sprite)) spriteCache.set(c.sprite, loadImage(c.sprite).catch(() => null));
    return spriteCache.get(c.sprite);
  };
  let look = null; // { img, fw, fh, hb, anims }
  let charId = ls.get('maipa-char');
  async function setCharacter(id, { announce = false, save = true } = {}) {
    const list = characters();
    const c = list.find((x) => x.id === id) || list.find((x) => x.id === cfg.defaultCharacter) || list[0];
    const g = c?.game || {};
    const img = await spriteFor(c);
    const fw = g.frameWidth || PL.frameWidth || 16, fh = g.frameHeight || PL.frameHeight || 16;
    look = {
      img, fw, fh,
      hb: { x: 0, y: 0, w: fw, h: fh, ...(PL.hitbox || {}), ...(g.hitbox || {}) },
      anims: { ...(PL.animations || { idle: { frames: [0], fps: 1 } }), ...(g.animations || {}) },
    };
    const oldBottom = player.y + player.h;
    player.w = look.hb.w * S; player.h = look.hb.h * S;
    player.y = oldBottom - player.h;
    if (c) {
      charId = c.id; if (save) ls.set('maipa-char', c.id);
      document.querySelectorAll('.mini-sprite').forEach((n) => { n.style.backgroundImage = `url("${c.sprite}")`; });
      if (announce) { showToast(c.name, 2); burst(player.x + player.w / 2, player.y + player.h / 2, 12); blip(660, 0.08, 'square', 1.5); }
    }
  }

  /* ---------- DOM ---------- */
  const canvas = el('canvas', 'game-canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  const hud = el('div', 'game-hud');
  const toast = el('div', 'game-toast hide');
  const bubble = el('div', 'game-bubble');
  const touch = el('div', 'game-touch', `
    <div class="pad pad-left"><button class="small" data-k="pick">C</button><button class="small" data-k="restart">R</button>
      <button class="small" data-k="challenge">T</button><button class="small" data-k="garage">G</button>
      <button data-k="left" aria-label="Left">◀</button><button data-k="right" aria-label="Right">▶</button></div>
    <div class="pad pad-right"><button class="small" data-k="act">E</button><button class="small" data-k="wave">F</button><span></span>
      <button data-k="down" aria-label="Down">▼</button><button data-k="up" aria-label="Up">▲</button><button class="jump" data-k="jump" aria-label="Jump">A</button></div>
    <button data-k="quit" class="quit" aria-label="Quit">X</button>`);
  const padLeft = touch.querySelector('.pad-left');
  padLeft.style.gridTemplateColumns = 'repeat(2, 54px)'; padLeft.style.gridAutoFlow = 'row';
  const isTouch = matchMedia('(pointer: coarse)').matches;
  if (isTouch) { touch.classList.add('enabled'); toast.classList.add('touch'); }
  const picker = el('div', 'game-picker');
  const garage = el('div', 'game-garage');
  const uiNodes = [canvas, hud, toast, bubble, touch];
  [...uiNodes, picker, garage].forEach((n) => { n.hidden = true; document.body.appendChild(n); });

  /* ---------- State ---------- */
  const input = { left: false, right: false, up: false, down: false };
  let active = false, raf = 0, last = 0, frame = 0, t = 0;
  let mode = 'free'; // free | challenge | car
  let platforms = [], walls = [], coins = [], particles = [];
  let jumpBuffer = 0, coyote = 0, dropTimer = 0, dropEl = null, toastTimer = 0;
  const player = { x: 0, y: 0, vx: 0, vy: 0, w: 11 * S, h: 16 * S, facing: 1, ground: null, jumps: 0, anim: 'idle', animT: 0,
    wall: null, climbing: false, stamina: phys.climbStamina, lockT: 0, emote: 0 };
  const run = { start: null, time: 0, done: false };
  const waved = new Set();
  let pickerOpen = false, pickIndex = 0, pickTimer = 0, hudTick = 0;
  let garageOpen = false, garageIndex = 0;
  let audio = null;

  /* ---------- Level from the DOM ---------- */
  function rectOf(node) {
    const r = node.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
  }
  function scanPlatforms() {
    platforms = []; walls = [];
    document.querySelectorAll(platformSel).forEach((node) => {
      if (node.closest('[hidden]')) return;
      const r = rectOf(node);
      if (!r) return;
      platforms.push({ x: r.x, y: Math.round(r.y), w: r.w, h: r.h, el: node });
      if (phys.elementWalls && r.h >= 28) {
        walls.push({ x: r.x, side: 1, top: r.y, bottom: r.y + r.h, el: node });
        walls.push({ x: r.x + r.w, side: -1, top: r.y, bottom: r.y + r.h, el: node });
      }
    });
    platforms.push({ x: -1e5, y: document.documentElement.scrollHeight, w: 2e5, h: 0, el: document.documentElement });
    coins.forEach((c) => {
      const r = rectOf(c.el);
      c.alive = !!r && !c.el.closest('[hidden], .is-hidden');
      if (r) { c.x = r.x + r.w / 2 - (cw * S) / 2; c.y = r.y - ch * S - 18; }
    });
    if (mode === 'car') layoutCarGame();
  }
  function buildCoins() {
    coins = [];
    if (!coinSel) return;
    document.querySelectorAll(coinSel).forEach((node) => coins.push({ el: node, x: 0, y: 0, taken: false, alive: true, phase: Math.random() * 6 }));
  }
  const platformOf = (key) => platforms.find((q) => q.el === key);

  /* ---------- Locks on cards / links (only while playing) ---------- */
  const projectKeyFromHref = (href) => {
    try {
      const u = new URL(href, location.href);
      if (!/project\.html$/.test(u.pathname)) return null;
      const id = u.searchParams.get('id');
      return id ? `project:${id}` : null;
    } catch { return null; }
  };
  function applyLocks() {
    clearLocks();
    if (!active) return;
    const done = progress().done;
    document.querySelectorAll('.project-card[data-id], .model-tile[data-id], .pp-related-card[data-pid]').forEach((n) => {
      const key = `project:${n.dataset.id || n.dataset.pid}`;
      if (!isLevel(key)) return;
      n.classList.toggle('game-locked', !isUnlocked(key));
      n.classList.toggle('game-done', !!done[key]);
    });
  }
  function clearLocks() { document.querySelectorAll('.game-locked, .game-done').forEach((n) => n.classList.remove('game-locked', 'game-done')); }
  function navigationBlocked(key) {
    const tx = T();
    if (mode === 'challenge') { showToast(tx.challengeBlock, 3); blip(150, 0.15, 'square'); return true; }
    if (key && isLevel(key) && !isUnlocked(key)) {
      showToast(fill(tx.locked, { level: previousLevel(key)?.title || '' }), 3.5); blip(150, 0.15, 'square');
      return true;
    }
    return false;
  }
  // mouse clicks on links follow the same rules as E while the play mode is on
  document.addEventListener('click', (e) => {
    if (!active) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download') || a.dataset.video) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search)) return;
    if (navigationBlocked(projectKeyFromHref(a.href))) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  /* ---------- Physics helpers ---------- */
  function landCheck(b, prevBottom, ignoreEl) {
    const bottom = b.y + b.h;
    let hit = null;
    for (const q of platforms) {
      if (q.el === ignoreEl) continue;
      if (b.x + b.w <= q.x + 2 || b.x >= q.x + q.w - 2) continue;
      if (prevBottom <= q.y + 1 && bottom >= q.y && (!hit || q.y < hit.y)) hit = q;
    }
    if (hit) { b.y = hit.y - b.h; b.vy = 0; b.ground = hit.el; }
    return hit;
  }
  function fall(b, dt, ignoreEl) {
    const prevBottom = b.y + b.h;
    b.vy = Math.min(b.vy + phys.gravity * dt, phys.maxFallSpeed);
    b.y += b.vy * dt;
    let hit = null;
    if (b.vy >= 0) hit = landCheck(b, prevBottom, ignoreEl);
    if (b.y < 0) { b.y = 0; b.vy = Math.max(0, b.vy); }
    return hit;
  }
  function stick(b) {
    const q = platformOf(b.ground);
    if (!q || b.x + b.w < q.x + 2 || b.x > q.x + q.w - 2) { b.ground = null; return false; }
    b.y = q.y - b.h; b.vy = 0;
    return true;
  }
  function crossWall(b, prevX) {
    let best = null;
    const movingRight = b.x > prevX, movingLeft = b.x < prevX;
    if (!movingRight && !movingLeft) return null;
    for (const w of walls) {
      if (b.y + b.h <= w.top + 6 || b.y >= w.bottom - 6) continue;
      if (movingRight && w.side === 1 && prevX + b.w <= w.x + 0.5 && b.x + b.w > w.x) { if (!best || w.x < best.x) best = w; }
      if (movingLeft && w.side === -1 && prevX >= w.x - 0.5 && b.x < w.x) { if (!best || w.x > best.x) best = w; }
    }
    return best;
  }
  const docWidth = () => document.documentElement.clientWidth;

  /* ---------- Controls ---------- */
  const KEY = {
    ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
    ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
    ' ': 'jump', z: 'jump', Z: 'jump', k: 'jump', K: 'jump',
    e: 'act', E: 'act', Enter: 'act', f: 'wave', F: 'wave', c: 'pick', C: 'pick',
    r: 'restart', R: 'restart', t: 'challenge', T: 'challenge', g: 'garage', G: 'garage', Escape: 'quit',
  };
  const markRun = () => { if (mode === 'challenge' && !run.start && !run.done) run.start = performance.now(); };
  function press(k) {
    if (k === 'quit') { stop(); return; }
    if (pickerOpen) { pickerKey(k); return; }
    if (garageOpen) { garageKey(k); return; }
    if (k in input) { input[k] = true; if (k !== 'down') markRun(); }
    if (mode === 'car') { carPress(k); return; }
    // ↑ / W: jump and double jump like SPACE — but on a wall it climbs
    if (k === 'up' && !player.wall) jumpBuffer = 0.12;
    if (k === 'jump') { jumpBuffer = 0.12; markRun(); }
    if (k === 'down' && player.ground && player.ground !== document.documentElement) {
      dropEl = player.ground; dropTimer = 0.25; player.ground = null; player.vy = 60;
    }
    if (k === 'act') interact();
    if (k === 'wave') { player.emote = 1.6; blip(880, 0.05); }
    if (k === 'pick') openPicker();
    if (k === 'restart') { if (mode === 'challenge') startChallenge(true); else { spawn({ top: true }); showToast(T().toTop, 1.5); } }
    if (k === 'challenge') { if (mode === 'challenge') startChallenge(true); else startChallenge(); }
    if (k === 'garage') openGarage();
  }
  function release(k) { if (k in input) input[k] = false; }
  function onKeyDown(e) {
    if (!active || document.querySelector('dialog[open]')) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    const k = KEY[e.key];
    if (!k) return;
    e.preventDefault();
    if (e.repeat) return;
    press(k);
  }
  function onKeyUp(e) { const k = KEY[e.key]; if (active && k) release(k); }
  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', onKeyUp);
  addEventListener('wheel', (e) => { if (active) e.preventDefault(); }, { passive: false });
  addEventListener('blur', () => { Object.keys(input).forEach((k) => { input[k] = false; }); });
  addEventListener('resize', () => { if (active) { resize(); scanPlatforms(); } });
  document.addEventListener('portfolio:layout', () => { if (active) requestAnimationFrame(() => { scanPlatforms(); applyLocks(); }); });
  touch.querySelectorAll('button').forEach((b) => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('down'); press(k); });
    const up = () => { b.classList.remove('down'); release(k); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  });

  /* ---------- Interaction (E) ---------- */
  function inSecretSpot() {
    if (!carImg || mode !== 'free') return false;
    const spot = CAR.secretAt && document.querySelector(CAR.secretAt);
    const r = spot && rectOf(spot);
    if (!r) return false;
    const p = player;
    return p.x + p.w > r.x && p.x < r.x + r.w && p.y + p.h > r.y && p.y < r.y + r.h;
  }
  function interactTarget() {
    const g = player.ground;
    if (g && g.closest) {
      for (const [sel, action] of interactMap) {
        const target = g.closest(sel);
        if (!target) continue;
        if (action === 'select-character' && !characters().some((c) => c.id === target.dataset.char)) continue;
        return { el: target, action };
      }
    }
    if (inSecretSpot()) return { action: 'car', secret: true };
    return null;
  }
  function bubbleText(it) {
    const tx = T();
    switch (it.action) {
      case 'open-project': {
        const key = `project:${it.el.dataset.id}`;
        if (isLevel(key) && !isUnlocked(key)) return tx.lockedShort;
        return tx.openProject;
      }
      case 'open-team': return tx.openProject;
      case 'back': return tx.back;
      case 'select-character': return fill(tx.pickHere, { name: characters().find((c) => c.id === it.el.dataset.char)?.name || '' });
      case 'car': return ls.get('maipa-secrets', {}).car ? tx.carHint : '';
      default: return tx.open;
    }
  }
  function interact() {
    const it = interactTarget();
    if (!it) return;
    blip(660, 0.06);
    if (it.action === 'car') { startCarGame(); return; }
    if (it.action === 'open-project' || it.action === 'open-team') {
      const a = it.el.querySelector('a.card-link') || it.el.closest('a');
      const href = a?.href;
      if (!href || navigationBlocked(projectKeyFromHref(href))) return;
      if (it.el.dataset.id) ss.set('maipa-spawn', { page: pageKey, sel: `[data-id="${CSS.escape(it.el.dataset.id)}"]` });
      location.href = href;
      return;
    }
    if (it.action === 'back') {
      if (navigationBlocked(null)) return;
      const id = pageKey.startsWith('project:') ? pageKey.slice(8) : '';
      if (id) ss.set('maipa-spawn', { page: 'home', sel: `[data-id="${CSS.escape(id)}"]` });
      it.el.click();
      return;
    }
    if (it.action === 'select-character') { setCharacter(it.el.dataset.char, { announce: true }); return; }
    it.el.click();
  }

  /* ---------- Audio ---------- */
  function blip(freq, dur = 0.08, type = 'square', slide = 0) {
    if (cfg.sound === false) return;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = type; o.frequency.value = freq;
      if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, audio.currentTime + dur);
      g.gain.setValueAtTime(0.05, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
      o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + dur);
    } catch { /* no audio */ }
  }

  /* ---------- Lifecycle ---------- */
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  function spawn({ top = false } = {}) {
    const navH = document.querySelector('.site-nav')?.offsetHeight || 0;
    const sp = ss.get('maipa-spawn');
    let target = null;
    if (!top && sp && sp.page === pageKey) { target = document.querySelector(sp.sel); ss.del('maipa-spawn'); }
    if (target) {
      const r = rectOf(target);
      if (r) {
        window.scrollTo({ top: Math.max(0, r.y - innerHeight * 0.45), behavior: 'instant' });
        player.x = clamp(r.x + r.w / 2 - player.w / 2, 0, docWidth() - player.w);
        player.y = r.y - player.h - 120;
      }
    } else {
      if (top) window.scrollTo({ top: 0, behavior: 'instant' });
      player.x = clamp(innerWidth * 0.5 - player.w / 2, 10, innerWidth - player.w - 10);
      player.y = (top ? 0 : scrollY) + navH + 30;
    }
    Object.assign(player, { vx: 0, vy: 0, ground: null, jumps: 0, wall: null, stamina: phys.climbStamina, emote: 0 });
    burst(player.x + player.w / 2, player.y + player.h / 2, 14);
  }
  async function start({ resumed = false } = {}) {
    if (active) return;
    active = true;
    mode = 'free';
    opts.onActiveChange?.(true);
    document.body.classList.add('play-mode');
    uiNodes.forEach((n) => { n.hidden = false; });
    resize(); scanPlatforms();
    if (!look) await setCharacter(charId, { save: false });
    spawn({ top: resumed && !ss.get('maipa-spawn') });
    applyLocks();
    updateHud(true);
    showToast(isTouch ? T().startTouch : T().start, 8);
    blip(440, 0.1, 'square', 2);
    last = performance.now();
    raf = requestAnimationFrame(loop);
    if (!resumed && !ls.get('maipa-char') && characters().length > 1) openPicker();
  }
  function stop() {
    if (!active) return;
    active = false;
    cancelAnimationFrame(raf);
    opts.onActiveChange?.(false);
    closePicker(); closeGarage();
    mode = 'free'; coins = []; run.start = null; run.done = false;
    document.body.classList.remove('play-mode', 'game-challenge', 'game-car');
    uiNodes.forEach((n) => { n.hidden = true; });
    document.querySelectorAll('.game-hover').forEach((n) => n.classList.remove('game-hover'));
    clearLocks();
    Object.keys(input).forEach((k) => { input[k] = false; });
  }
  function invalidate() {
    // the page was re-rendered (e.g. language change): elements are new
    if (!active) return;
    requestAnimationFrame(() => {
      if (mode === 'challenge') { mode = 'free'; coins = []; document.body.classList.remove('game-challenge'); showToast(T().challengeAborted, 2.5); }
      scanPlatforms(); applyLocks(); updateHud(true);
    });
  }

  /* ---------- Challenge ---------- */
  function startChallenge(restart = false) {
    const tx = T();
    if (mode === 'car') return;
    if (!isLevel()) { showToast(tx.noChallenge, 3); return; }
    if (!isUnlocked(pageKey)) { showToast(fill(tx.locked, { level: previousLevel(pageKey)?.title || '' }), 3.5); return; }
    mode = 'challenge';
    document.body.classList.add('game-challenge');
    document.dispatchEvent(new Event('game:challenge'));
    requestAnimationFrame(() => {
      buildCoins(); scanPlatforms();
      run.start = null; run.time = 0; run.done = false;
      spawn({ top: true });
      updateHud(true);
      showToast(restart ? tx.challengeRestart : tx.challengeStart, 4);
      blip(520, 0.1, 'square', 2);
    });
  }
  function completeChallenge() {
    const tx = T();
    run.done = true;
    const key = `maipa-best:${pageKey}`;
    const best = ls.get(key);
    const record = !best || run.time < best;
    if (record) ls.set(key, run.time);
    const p = progress();
    let reward = 0;
    if (!p.done[pageKey]) {
      reward = levels()[levelIndex(pageKey)]?.coins || 0;
      p.wallet += reward;
      p.done[pageKey] = true;
      saveProgress(p);
    }
    const next = levels()[levelIndex(pageKey) + 1];
    const parts = [fill(tx.won, { time: fmtTime(run.time) })];
    if (record) parts.push(tx.newRecord);
    if (reward) parts.push(fill(tx.reward, { coins: reward }));
    if (next && reward) parts.push(fill(tx.unlocked, { level: next.title }));
    showToast(parts.join('  '), 10);
    player.emote = 3;
    for (let i = 0; i < 6; i++) setTimeout(() => { burst(scrollX + Math.random() * innerWidth, scrollY + innerHeight * 0.3, 18); blip(523 * (1 + i / 6), 0.1); }, i * 140);
    setTimeout(() => { if (mode === 'challenge' && run.done) { mode = 'free'; coins = []; document.body.classList.remove('game-challenge'); applyLocks(); updateHud(true); } }, 3500);
    applyLocks();
    updateHud(true);
  }

  /* ---------- Loop ---------- */
  function loop(now) {
    if (!active) return;
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now; t += dt; frame++;
    if (frame % 20 === 0) scanPlatforms();
    if (pickerOpen) drawPicker(dt);
    else if (!garageOpen) update(dt);
    if (mode === 'car') carCamera(dt); else camera(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    jumpBuffer -= dt; coyote -= dt; dropTimer -= dt;
    if (dropTimer <= 0) dropEl = null;
    if (mode === 'car') { updateCarGame(dt); }
    else {
      updatePlayer(dt);
      const it = interactTarget();
      document.querySelectorAll('.game-hover').forEach((n) => { if (!it || n !== it.el) n.classList.remove('game-hover'); });
      const label = it ? bubbleText(it) : '';
      if (it && label) { it.el?.classList.add('game-hover'); bubble.hidden = false; bubble.textContent = label; } else bubble.hidden = true;
      const social = player.ground?.closest?.('.social-link');
      if (social && !waved.has(social)) { waved.add(social); player.emote = 1.4; }
      if (mode === 'challenge') {
        for (const c of coins) {
          if (c.taken || !c.alive) continue;
          const cx = c.x, cy = c.y + Math.sin(t * 3 + c.phase) * 4;
          if (player.x < cx + cw * S && player.x + player.w > cx && player.y < cy + ch * S && player.y + player.h > cy) {
            c.taken = true; markRun();
            blip(988, 0.06); setTimeout(() => blip(1319, 0.12), 60);
            burst(cx + (cw * S) / 2, cy + (ch * S) / 2, 10);
            updateHud(true);
          }
        }
        if (run.start && !run.done) run.time = (performance.now() - run.start) / 1000;
        const total = coins.filter((c) => c.alive || c.taken).length, got = coins.filter((c) => c.taken).length;
        if (total && got === total && !run.done) completeChallenge();
      }
    }
    if (++hudTick % 4 === 0) updateHud();
    particles = particles.filter((q) => (q.life -= dt) > 0);
    particles.forEach((q) => { q.vy += (q.g ?? 900) * dt; q.x += q.vx * dt; q.y += q.vy * dt; });
    if (toastTimer > 0 && (toastTimer -= dt) <= 0) toast.classList.add('hide');
  }

  function updatePlayer(dt) {
    const p = player;
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    p.lockT -= dt;
    if (p.emote > 0) p.emote = (dir || !p.ground || jumpBuffer > 0) ? 0 : p.emote - dt;
    if (p.ground) p.stamina = phys.climbStamina;

    if (p.wall && updateWall(dt, dir)) { animate(dt); return; }

    const effDir = p.lockT > 0 ? Math.sign(p.vx) : dir;
    const accel = p.lockT > 0 ? 3 : p.ground ? 18 : 9;
    p.vx += (effDir * phys.moveSpeed - p.vx) * Math.min(1, accel * dt);
    if (dir && p.lockT <= 0) p.facing = dir;
    const prevX = p.x;
    p.x += p.vx * dt;
    const hit = crossWall(p, prevX);
    if (hit) {
      p.x = hit.side > 0 ? hit.x - p.w : hit.x; p.vx = 0;
      if (!p.ground && dir === hit.side) grabWall(hit);
    }
    const W = docWidth();
    if (p.x <= 0) { p.x = 0; if (!p.ground && dir < 0 && !p.wall) grabWall({ x: 0, side: -1, top: -1e9, bottom: 1e9, el: null }); }
    if (p.x + p.w >= W) { p.x = W - p.w; if (!p.ground && dir > 0 && !p.wall) grabWall({ x: W, side: 1, top: -1e9, bottom: 1e9, el: null }); }
    if (p.wall) { animate(dt); return; }

    if (p.ground && !stick(p)) coyote = 0.1;

    if (jumpBuffer > 0) {
      if (p.ground || coyote > 0) {
        p.vy = -phys.jumpVelocity; p.ground = null; coyote = 0; jumpBuffer = 0; p.jumps = 1;
        blip(520, 0.09, 'square', 1.6); burst(p.x + p.w / 2, p.y + p.h, 5);
      } else if (phys.doubleJump && p.jumps < 2) {
        p.vy = -phys.jumpVelocity * 0.85; jumpBuffer = 0; p.jumps = 2;
        blip(700, 0.08, 'square', 1.5); burst(p.x + p.w / 2, p.y + p.h, 8);
      }
    }
    if (!p.ground) {
      const vyBefore = p.vy;
      const landed = fall(p, dt, dropEl);
      if (landed) { p.jumps = 0; if (vyBefore > 500) burst(p.x + p.w / 2, landed.y, 4); }
    }
    animate(dt);
  }

  function grabWall(w) {
    const p = player;
    p.wall = w; p.jumps = 1; p.ground = null;
    p.vy = p.vy < 0 ? p.vy * 0.4 : p.vy * 0.2;
  }
  function updateWall(dt, dir) {
    const p = player, w = p.wall;
    if (w.el) {
      const q = platforms.find((x) => x.el === w.el);
      if (!q) { p.wall = null; return false; }
      w.x = w.side > 0 ? q.x : q.x + q.w; w.top = q.y; w.bottom = q.y + q.h;
    } else {
      w.x = w.side > 0 ? docWidth() : 0;
    }
    if (jumpBuffer > 0) {
      p.vy = -phys.jumpVelocity * 0.92; p.vx = -w.side * phys.wallJumpPush; p.facing = -w.side;
      p.lockT = 0.16; p.wall = null; p.jumps = 1; jumpBuffer = 0;
      blip(600, 0.08, 'square', 1.4); burst(p.x + (w.side > 0 ? p.w : 0), p.y + p.h / 2, 6);
      return false;
    }
    if (dir !== w.side && !input.up && !input.down) { p.wall = null; return false; }
    p.climbing = input.up && p.stamina > 0;
    if (p.climbing) { p.vy = -phys.climbSpeed; p.stamina -= dt; }
    else if (input.down) p.vy = phys.wallSlideSpeed * 2.5;
    else { p.vy = p.stamina > 0 ? phys.wallSlideSpeed : phys.wallSlideSpeed * 2; p.stamina -= dt * 0.15; }
    const prevBottom = p.y + p.h;
    p.y += p.vy * dt;
    p.x = w.side > 0 ? w.x - p.w : w.x; p.vx = 0; p.facing = w.side;
    if (w.el && p.y + p.h * 0.55 < w.top) {
      p.y = w.top - p.h; p.x = clamp(p.x + w.side * p.w * 0.7, 0, docWidth() - p.w);
      p.ground = w.el; p.wall = null; p.vy = 0; p.jumps = 0;
      burst(p.x + p.w / 2, w.top, 5); blip(500, 0.06);
      return true;
    }
    if (w.el && p.y + p.h * 0.3 > w.bottom) { p.wall = null; return false; }
    if (p.vy > 0 && landCheck(p, prevBottom, null)) { p.wall = null; p.jumps = 0; return true; }
    if (p.y < 0) p.y = 0;
    if (frame % 6 === 0 && p.vy > 0) particles.push({ x: p.x + (w.side > 0 ? p.w : 0), y: p.y + p.h * 0.7, vx: 0, vy: -20, life: 0.25, s: S, g: 0, c: '#bbbbbb' });
    return true;
  }

  function animate(dt) {
    const p = player;
    let next;
    if (p.wall) next = p.climbing ? 'climb' : 'wallslide';
    else if (!p.ground) next = p.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(p.vx) > 30) next = 'run';
    else if (p.emote > 0) next = 'wave';
    else next = 'idle';
    if (!look?.anims[next]) next = p.wall ? 'fall' : 'idle';
    if (next !== p.anim) { p.anim = next; p.animT = 0; } else p.animT += dt;
  }
  function camera(dt) {
    const want = clamp(player.y + player.h / 2 - innerHeight * 0.5, 0, document.documentElement.scrollHeight - innerHeight);
    const diff = want - scrollY;
    if (Math.abs(diff) > 1) window.scrollTo({ top: scrollY + diff * Math.min(1, dt * 7), behavior: 'instant' });
  }

  /* =========================================================
     SECRET CAR GAME — endless runner inside the band with the car render
     ========================================================= */
  const cg = { x: 0, y: 0, w: CAR.hitbox.w * S, h: CAR.hitbox.h * S, vy: 0, ground: true, jumps: 0, road: 0, left: 0, right: 0, top: 0, bottom: 0,
    speed: 0, dist: 0, obstacles: [], nextIn: 0, over: false, shield: false, inv: 0, wheel: 0, scroll: 0 };
  const owned = (id) => progress().owned.includes(id);
  function layoutCarGame() {
    const spot = document.querySelector(CAR.secretAt);
    const r = spot && rectOf(spot);
    if (!r) return;
    cg.left = r.x; cg.right = r.x + r.w; cg.top = r.y; cg.bottom = r.y + r.h;
    cg.road = r.y + r.h - 34;
    cg.x = r.x + Math.max(40, r.w * 0.14);
    if (cg.ground) cg.y = cg.road - cg.h;
  }
  function startCarGame() {
    if (mode !== 'free') return;
    mode = 'car';
    document.body.classList.add('game-car');
    bubble.hidden = true;
    const secrets = ls.get('maipa-secrets', {});
    const first = !secrets.car;
    if (first) { secrets.car = true; ls.set('maipa-secrets', secrets); }
    resetCarGame();
    showToast(first ? T().carFound : T().carStart, first ? 7 : 4);
    blip(220, 0.15, 'sawtooth', 2);
  }
  function resetCarGame() {
    if (cg.over) toast.classList.add('hide');
    layoutCarGame();
    Object.assign(cg, { vy: 0, ground: true, jumps: 0, speed: CAR.speed, dist: 0, obstacles: [], nextIn: 1.2, over: false, inv: 0, shield: owned('upgrade:shield') });
    cg.y = cg.road - cg.h;
    updateHud(true);
  }
  function exitCarGame() {
    mode = 'free';
    document.body.classList.remove('game-car');
    player.x = clamp(cg.x, 0, docWidth() - player.w); player.y = cg.y - player.h; player.vy = -380; player.ground = null; player.wall = null;
    updateHud(true);
  }
  function carPress(k) {
    if (k === 'act') { exitCarGame(); return; }
    if (k === 'restart') { resetCarGame(); return; }
    if ((k === 'jump' || k === 'up') && cg.over) { resetCarGame(); return; }
    if (k === 'jump' || k === 'up') {
      const jv = CAR.jumpVelocity * (owned('upgrade:springs') ? 1.22 : 1);
      if (cg.ground) { cg.vy = -jv; cg.ground = false; cg.jumps = 1; blip(330, 0.1, 'square', 1.6); }
      else if (owned('upgrade:doubleJump') && cg.jumps < 2) { cg.vy = -jv * 0.85; cg.jumps = 2; blip(440, 0.08, 'square', 1.5); burst(cg.x + cg.w / 2, cg.y + cg.h, 6, '#aaaaaa'); }
    }
    if (k === 'wave') { blip(330, 0.18, 'square'); setTimeout(() => blip(415, 0.22, 'square'), 120); }
  }
  const OBSTACLES = [
    { id: 'cone', w: 8, h: 10 },
    { id: 'barrier', w: 18, h: 9 },
    { id: 'tires', w: 10, h: 14 },
    { id: 'cones', w: 20, h: 10 },
  ];
  function updateCarGame(dt) {
    if (cg.over) return;
    cg.speed = Math.min(CAR.maxSpeed, cg.speed + CAR.speedUp * dt);
    cg.dist += cg.speed * dt;
    cg.scroll = (cg.scroll + cg.speed * dt) % 64;
    cg.wheel += cg.speed * dt;
    cg.inv -= dt;
    // vertical
    if (!cg.ground) {
      const slam = input.down && cg.vy < CAR.slamSpeed;
      cg.vy = slam ? CAR.slamSpeed : cg.vy + CAR.gravity * dt;
      cg.y += cg.vy * dt;
      if (cg.y + cg.h >= cg.road) {
        cg.y = cg.road - cg.h; cg.vy = 0; cg.ground = true; cg.jumps = 0;
        burst(cg.x + cg.w / 2, cg.road, slam ? 10 : 4, '#9a9a9a');
      }
    }
    // obstacles
    cg.nextIn -= dt;
    if (cg.nextIn <= 0) {
      const o = OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)];
      cg.obstacles.push({ ...o, x: cg.right + 10, pw: o.w * S, ph: o.h * S });
      const gap = 0.75 + Math.random() * 0.9;
      cg.nextIn = gap * (CAR.speed / cg.speed) + 0.25;
    }
    cg.obstacles.forEach((o) => { o.x -= cg.speed * dt; });
    cg.obstacles = cg.obstacles.filter((o) => o.x + o.pw > cg.left - 20);
    if (frame % 3 === 0) particles.push({ x: cg.x, y: cg.road - 8, vx: -cg.speed * 0.3, vy: -20, life: 0.4, s: S * 2, g: -40, c: 'rgba(160,160,160,.55)' });
    // collision
    const pad = 6;
    for (const o of cg.obstacles) {
      const oy = cg.road - o.ph;
      if (cg.x + pad < o.x + o.pw - pad && cg.x + cg.w - pad > o.x + pad && cg.y + pad < oy + o.ph && cg.y + cg.h - pad > oy + pad) {
        if (cg.inv > 0) continue;
        if (cg.shield) { cg.shield = false; cg.inv = 1.2; o.x = -9999; burst(cg.x + cg.w, cg.y + cg.h / 2, 16, '#6fc3ff'); blip(200, 0.2, 'square', 0.5); continue; }
        crash();
        break;
      }
    }
  }
  function crash() {
    cg.over = true;
    const score = Math.floor(cg.dist / 40);
    const best = ls.get('maipa-car-best', 0);
    const record = score > best;
    if (record) ls.set('maipa-car-best', score);
    burst(cg.x + cg.w, cg.y + cg.h / 2, 24, '#ffb347');
    blip(110, 0.35, 'sawtooth', 0.4);
    showToast(`${fill(T().carOver, { score })}${record ? `  ${T().newRecord}` : ''}`, 60);
    updateHud(true);
  }
  function carCamera(dt) {
    const want = clamp((cg.top + cg.bottom) / 2 - innerHeight * 0.5, 0, document.documentElement.scrollHeight - innerHeight);
    const diff = want - scrollY;
    if (Math.abs(diff) > 1) window.scrollTo({ top: scrollY + diff * Math.min(1, dt * 6), behavior: 'instant' });
  }

  // car sprite recoloured with the colour chosen in the garage
  const carSprites = new Map();
  function carColors() {
    const list = [{ id: 'classic', name: T().carClassic, body: '#d11717', shade: '#8f0f0f' }];
    (opts.cars ? opts.cars() : []).forEach((c) => {
      const col = c.color || DEFAULT_CAR_COLORS[c.id] || { body: '#3a6fd8', shade: '#22428a' };
      list.push({ id: c.id, name: c.name, body: col.body, shade: col.shade || col.body });
    });
    return list;
  }
  function carSprite(colorId) {
    if (!carImg) return null;
    if (carSprites.has(colorId)) return carSprites.get(colorId);
    const col = carColors().find((c) => c.id === colorId) || carColors()[0];
    const cv = document.createElement('canvas');
    cv.width = carImg.width; cv.height = carImg.height;
    const g = cv.getContext('2d');
    g.drawImage(carImg, 0, 0);
    if (col.id !== 'classic') {
      const d = g.getImageData(0, 0, cv.width, cv.height);
      const [br, bg, bb] = hexToRgb(col.body), [sr, sg, sb] = hexToRgb(col.shade);
      for (let i = 0; i < d.data.length; i += 4) {
        const r = d.data[i], gg = d.data[i + 1], b = d.data[i + 2];
        if (r === 209 && gg === 23 && b === 23) { d.data[i] = br; d.data[i + 1] = bg; d.data[i + 2] = bb; }
        else if (r === 143 && gg === 15 && b === 15) { d.data[i] = sr; d.data[i + 1] = sg; d.data[i + 2] = sb; }
      }
      g.putImageData(d, 0, 0);
    }
    carSprites.set(colorId, cv);
    return cv;
  }
  function drawObstacle(o, x, y) {
    const P = (px, py, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + px * S, y + py * S, w * S, h * S); };
    if (o.id === 'cone' || o.id === 'cones') {
      const n = o.id === 'cones' ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const ox = i * 12;
        P(ox + 3, 0, 2, 2, '#ff7a1a'); P(ox + 2, 2, 4, 2, '#ffffff'); P(ox + 2, 4, 4, 2, '#ff7a1a'); P(ox + 1, 6, 6, 2, '#ffffff');
        P(ox + 1, 8, 6, 1, '#ff7a1a'); P(ox + 0, 9, 8, 1, '#141414');
      }
    } else if (o.id === 'barrier') {
      for (let i = 0; i < 6; i++) P(i * 3, 0, 3, 4, i % 2 ? '#ffffff' : '#d11717');
      P(0, 0, 18, 1, '#141414'); P(0, 4, 18, 1, '#141414'); P(2, 5, 2, 4, '#4d4c4d'); P(14, 5, 2, 4, '#4d4c4d');
    } else {
      for (let i = 0; i < 3; i++) { P(0, i * 5, 10, 4, '#1a1a1a'); P(2, i * 5 + 1, 6, 2, '#3a3a3a'); }
    }
  }
  function drawCarGame(ox, oy) {
    const W = innerWidth;
    const top = cg.top - oy, road = cg.road - oy;
    // road
    ctx.fillStyle = 'rgba(10,10,10,.78)'; ctx.fillRect(0, road, W, cg.bottom - cg.road);
    ctx.fillStyle = '#d11717'; ctx.fillRect(0, road, W, S);
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    for (let x = -cg.scroll; x < W; x += 64) ctx.fillRect(Math.round(x), road + 14, 32, S);
    // top shade for contrast
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, top, W, road - top);
    cg.obstacles.forEach((o) => drawObstacle(o, Math.round(o.x - ox), Math.round(road - o.ph)));
    const img = carSprite(progress().equip.color || 'classic');
    if (img) {
      const frames = CAR.frames || [0];
      const fr = frames[Math.floor(cg.wheel / 18) % frames.length];
      const blink = cg.inv > 0 && Math.floor(t * 12) % 2 === 0;
      ctx.globalAlpha = blink ? 0.4 : 1;
      drawSpriteFrame(img, fr, CAR.frameWidth, CAR.frameHeight, Math.round(cg.x - ox - CAR.hitbox.x * S), Math.round(cg.y - oy - CAR.hitbox.y * S), false);
      ctx.globalAlpha = 1;
      if (cg.shield) { ctx.strokeStyle = 'rgba(111,195,255,.8)'; ctx.lineWidth = 2; ctx.strokeRect(Math.round(cg.x - ox) - 6, Math.round(cg.y - oy) - 6, cg.w + 12, cg.h + 12); }
    }
  }

  /* ---------- Drawing ---------- */
  function drawSpriteFrame(img, fr, fw, fh, dx, dy, flip, scale = S) {
    const cols = Math.max(1, Math.floor(img.width / fw));
    const sx = (fr % cols) * fw, sy = Math.floor(fr / cols) * fh;
    ctx.save();
    if (flip) { ctx.translate(dx + fw * scale, dy); ctx.scale(-1, 1); ctx.drawImage(img, sx, sy, fw, fh, 0, 0, fw * scale, fh * scale); }
    else ctx.drawImage(img, sx, sy, fw, fh, dx, dy, fw * scale, fh * scale);
    ctx.restore();
  }
  function draw() {
    const W = innerWidth, H = innerHeight, ox = scrollX, oy = scrollY;
    ctx.clearRect(0, 0, W, H);
    if (mode === 'challenge') {
      const cf = coinFrames[Math.floor(t * (C.fps || 8)) % coinFrames.length];
      for (const c of coins) {
        if (c.taken || !c.alive) continue;
        const x = Math.round(c.x - ox), y = Math.round(c.y - oy + Math.sin(t * 3 + c.phase) * 4);
        if (y < -40 || y > H + 40) continue;
        if (coinImg) ctx.drawImage(coinImg, cf * cw, 0, cw, ch, x, y, cw * S, ch * S);
        else { ctx.fillStyle = '#d11717'; ctx.fillRect(x, y, cw * S, ch * S); }
      }
    }
    if (mode === 'car') drawCarGame(ox, oy);
    for (const q of particles) { ctx.fillStyle = q.c || '#d11717'; ctx.fillRect(Math.round(q.x - ox), Math.round(q.y - oy), q.s, q.s); }
    if (mode !== 'car' && look) {
      const p = player;
      const a = look.anims[p.anim] || look.anims.idle || { frames: [0], fps: 1 };
      const fr = a.frames[Math.floor(p.animT * (a.fps || 1)) % a.frames.length];
      const dx = Math.round(p.x - ox - look.hb.x * S), dy = Math.round(p.y - oy - look.hb.y * S);
      if (p.ground) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(Math.round(p.x - ox) + 3, Math.round(p.y - oy + p.h) - 2, p.w - 6, 3); }
      const tired = p.wall && p.stamina < 1 && Math.floor(t * 10) % 2 === 0;
      ctx.globalAlpha = tired ? 0.45 : 1;
      if (look.img) drawSpriteFrame(look.img, fr, look.fw, look.fh, dx, dy, p.facing < 0);
      else { ctx.fillStyle = '#d11717'; ctx.fillRect(Math.round(p.x - ox), Math.round(p.y - oy), p.w, p.h); }
      ctx.globalAlpha = 1;
    }
    if (!bubble.hidden) {
      bubble.style.left = `${Math.round(player.x - ox + player.w / 2)}px`;
      bubble.style.top = `${Math.round(player.y - oy - 10)}px`;
    }
  }

  /* ---------- Character picker ---------- */
  function openPicker() {
    const list = characters();
    if (list.length < 2) { showToast(list[0]?.name || '', 2); return; }
    pickerOpen = true; pickTimer = 0;
    pickIndex = Math.max(0, list.findIndex((c) => c.id === charId));
    Object.keys(input).forEach((k) => { input[k] = false; });
    picker.innerHTML = `<div class="game-picker-box" role="dialog" aria-label="${escapeHTML(T().pick)}">
      <h2>${escapeHTML(T().pick)}</h2>
      <div class="game-picker-list">${list.map((c, i) => `<button type="button" class="game-picker-item" data-i="${i}" aria-pressed="${i === pickIndex}">
        <canvas width="16" height="16"></canvas>${escapeHTML(c.name)}</button>`).join('')}</div>
      <small>${escapeHTML(T().pickHint)}</small></div>`;
    picker.hidden = false;
    picker.querySelectorAll('.game-picker-item').forEach((b) => b.addEventListener('click', () => { pickIndex = +b.dataset.i; confirmPick(); }));
    list.forEach((c) => spriteFor(c));
  }
  function closePicker() { pickerOpen = false; picker.hidden = true; picker.innerHTML = ''; }
  function confirmPick() { const c = characters()[pickIndex]; closePicker(); if (c) setCharacter(c.id, { announce: true }); }
  function pickerKey(k) {
    const n = characters().length;
    if (k === 'left') pickIndex = (pickIndex - 1 + n) % n;
    if (k === 'right') pickIndex = (pickIndex + 1) % n;
    if (k === 'act' || k === 'jump') { confirmPick(); return; }
    if (k === 'pick') { closePicker(); return; }
    picker.querySelectorAll('.game-picker-item').forEach((b, i) => b.setAttribute('aria-pressed', String(i === pickIndex)));
  }
  function drawPicker(dt) {
    pickTimer += dt;
    const list = characters();
    const idle = (PL.animations && PL.animations.idle) || { frames: [0], fps: 2 };
    picker.querySelectorAll('canvas').forEach((cv, i) => {
      const c = list[i];
      spriteFor(c).then((img) => {
        if (!img) return;
        const g = cv.getContext('2d');
        const fw = c.game?.frameWidth || PL.frameWidth || 16, fh = c.game?.frameHeight || PL.frameHeight || 16;
        cv.width = fw; cv.height = fh; g.imageSmoothingEnabled = false;
        const a = (c.game?.animations && c.game.animations.idle) || idle;
        const anim = i === pickIndex && PL.animations?.wave ? PL.animations.wave : a;
        const fr = anim.frames[Math.floor(pickTimer * (anim.fps || 2)) % anim.frames.length];
        const cols = Math.max(1, Math.floor(img.width / fw));
        g.clearRect(0, 0, fw, fh);
        g.drawImage(img, (fr % cols) * fw, Math.floor(fr / cols) * fh, fw, fh, 0, 0, fw, fh);
      });
    });
  }

  /* =========================================================
     GARAGE — spend coins from completed challenges.
     Prices are weights scaled so that EVERYTHING costs exactly the coins that can be earned
     on all levels (data → levels → coins).
     ========================================================= */
  function shopItems() {
    const tx = T();
    const colors = carColors();
    const items = [];
    colors.forEach((c) => items.push({ id: `color:${c.id}`, kind: 'color', color: c.id, name: c.name, desc: tx.carColorDesc, weight: c.id === 'classic' ? 0 : (SHOP.colorWeight ?? 1) }));
    (SHOP.upgrades || []).forEach((u) => items.push({ id: `upgrade:${u.id}`, kind: 'upgrade', name: tx[`up_${u.id}`] || u.id, desc: tx[`up_${u.id}_desc`] || '', weight: u.weight || 1 }));
    const total = totalCoins();
    const W = items.reduce((a, i) => a + i.weight, 0) || 1;
    let assigned = 0;
    const paid = items.filter((i) => i.weight > 0);
    paid.forEach((i, n) => {
      i.price = n === paid.length - 1 ? Math.max(0, total - assigned) : Math.floor((i.weight / W) * total);
      assigned += i.price;
    });
    items.forEach((i) => { i.price ??= 0; });
    return items;
  }
  function openGarage() {
    if (mode !== 'free') { showToast(T().garageBusy, 2.5); return; }
    garageOpen = true;
    Object.keys(input).forEach((k) => { input[k] = false; });
    garageIndex = 0;
    renderGarage();
    garage.hidden = false;
  }
  function closeGarage() { garageOpen = false; garage.hidden = true; garage.innerHTML = ''; }
  function renderGarage() {
    const tx = T(), p = progress(), items = shopItems();
    const section = (kind, title) => `<h3>${escapeHTML(title)}</h3><div class="game-garage-list">${items.map((it, i) => it.kind !== kind ? '' : (() => {
      const own = p.owned.includes(it.id) || it.price === 0;
      const eq = it.kind === 'color' && (p.equip.color || 'classic') === it.color;
      const price = eq ? tx.equipped : own ? (it.kind === 'color' ? tx.equip : tx.owned) : `${it.price}`;
      return `<button type="button" class="game-garage-item${own ? ' owned' : ''}${eq ? ' equipped' : ''}${!own && p.wallet < it.price ? ' cant' : ''}" data-i="${i}" aria-pressed="${i === garageIndex}">
        ${it.kind === 'color' ? `<canvas width="32" height="16" data-color="${escapeHTML(it.color)}"></canvas>` : `<span class="up-icon">${it.id === 'upgrade:shield' ? '[+]' : it.id === 'upgrade:doubleJump' ? '^^' : '/\\'}</span>`}
        <span>${escapeHTML(it.name)}<small>${escapeHTML(it.desc)}</small></span>
        <span class="price">${escapeHTML(price)}</span></button>`;
    })()).join('')}</div>`;
    garage.innerHTML = `<div class="game-garage-box" role="dialog" aria-label="${escapeHTML(tx.garage)}">
      <h2>${escapeHTML(tx.garage)}</h2>
      <div class="wallet"><i></i>${escapeHTML(fill(tx.wallet, { coins: p.wallet, total: totalCoins() }))}</div>
      ${section('color', tx.garageColors)}${section('upgrade', tx.garageUpgrades)}
      <small class="hint">${escapeHTML(tx.garageHint)}</small></div>`;
    garage.querySelectorAll('canvas[data-color]').forEach((cv) => {
      const img = carSprite(cv.dataset.color);
      if (img) { const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, 32, 16, 0, 0, 32, 16); }
    });
    garage.querySelectorAll('.game-garage-item').forEach((b) => b.addEventListener('click', () => { garageIndex = +b.dataset.i; buyOrEquip(); }));
  }
  function buyOrEquip() {
    const tx = T(), p = progress(), it = shopItems()[garageIndex];
    if (!it) return;
    const own = p.owned.includes(it.id) || it.price === 0;
    if (!own) {
      if (p.wallet < it.price) { blip(150, 0.15, 'square'); showToast(fill(tx.notEnough, { coins: it.price - p.wallet }), 2.5); return; }
      p.wallet -= it.price; p.owned.push(it.id); blip(988, 0.08); setTimeout(() => blip(1319, 0.12), 70);
    }
    if (it.kind === 'color') p.equip.color = it.color;
    saveProgress(p);
    renderGarage();
    updateHud(true);
  }
  function garageKey(k) {
    const n = shopItems().length;
    if (k === 'up' || k === 'left') garageIndex = (garageIndex - 1 + n) % n;
    if (k === 'down' || k === 'right') garageIndex = (garageIndex + 1) % n;
    if (k === 'act' || k === 'jump') { buyOrEquip(); return; }
    if (k === 'garage') { closeGarage(); return; }
    garage.querySelectorAll('.game-garage-item').forEach((b, i) => b.setAttribute('aria-pressed', String(i === garageIndex)));
    garage.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- HUD / effects ---------- */
  function burst(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      particles.push({ x, y, vx: (Math.random() - 0.5) * 320, vy: -Math.random() * 320 - 60, life: 0.35 + Math.random() * 0.35, s: S + (Math.random() < 0.3 ? S : 0), c: color });
    }
  }
  let hudMode = '';
  function updateHud(full = false) {
    const tx = T();
    if (mode !== hudMode) { full = true; hudMode = mode; }
    if (mode === 'challenge') {
      if (full) {
        const total = coins.filter((c) => c.alive || c.taken).length, got = coins.filter((c) => c.taken).length;
        const best = ls.get(`maipa-best:${pageKey}`);
        hud.innerHTML = `<span class="coin-icon"></span><span class="hud-count">${got}/${total}</span><span class="hud-sep"></span>
          <span class="hud-time"></span>${best ? `<span class="hud-best">${escapeHTML(tx.best)} ${fmtTime(best)}</span>` : ''}`;
      }
      const el2 = hud.querySelector('.hud-time');
      if (el2) el2.textContent = `${tx.time} ${fmtTime(run.time)}`;
    } else if (mode === 'car') {
      if (full) hud.innerHTML = `<span class="hud-car"></span><span class="hud-score"></span><span class="hud-sep"></span><span class="hud-best">${escapeHTML(tx.best)} ${ls.get('maipa-car-best', 0)}</span>`;
      const sc = hud.querySelector('.hud-score');
      if (sc) sc.textContent = `${tx.score} ${Math.floor(cg.dist / 40)}`;
    } else if (full) {
      const p = progress();
      const level = isLevel() ? (p.done[pageKey] ? tx.levelDone : isUnlocked(pageKey) ? tx.levelOpen : tx.levelLocked) : '';
      hud.innerHTML = `<span class="hud-wallet"><span class="coin-icon"></span>${p.wallet}</span>
        ${level ? `<span class="hud-sep"></span><span>${escapeHTML(level)}</span>` : ''}
        <span class="hud-sep"></span><span class="hud-hint">${escapeHTML(isLevel() ? tx.hintFree : tx.hintFreeNoLevel)}</span>
        ${ls.get('maipa-secrets', {}).car ? '<span class="hud-car"></span>' : ''}`;
    }
  }
  function showToast(msg, secs) { toast.textContent = msg; toast.classList.remove('hide'); toastTimer = secs; }

  await setCharacter(charId, { save: false });
  return {
    start, stop, invalidate,
    toggle: () => (active ? stop() : start()),
    get active() { return active; },
    /** read-only snapshot for debugging: __maipaGame.debug */
    get debug() { return { mode, player, car: cg, run, coins: coins.length, taken: coins.filter((c) => c.taken).length, walls: walls.length, platforms: platforms.length, charId, progress: progress(), prices: shopItems().map((i) => [i.id, i.price]), total: totalCoins() }; },
  };
}

function el(tag, cls, html = '') { const n = document.createElement(tag); n.className = cls; n.innerHTML = html; return n; }
function escapeHTML(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
