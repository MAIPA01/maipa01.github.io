/* =========================================================
   PLAY MODE — a pixel-art platformer that uses the page itself as the level.
   - Platforms = top edges of elements from data/game.json → "platforms".
   - Their sides are walls: push against one in the air to grab it (Celeste-style),
     ↑ climbs (limited stamina), ↓ slides, SPACE wall-jumps. Climbing over the top edge
     pulls you up onto the platform.
   - Coins float above "coinsOn" elements. Collect them all = run finished (speedrun timer,
     best time per page in localStorage).
   - E uses things (open project, go back, pick a character, click a link), F waves,
     C opens the character picker, R restarts the run.
   - A hidden car (data/game.json → "car") can be found and driven.
   - Works on every page: the mode stays on while you navigate (sessionStorage).
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

export async function createPlayMode(cfg = {}, opts = {}) {
  const S = cfg.pixelScale || 4;
  const PL = cfg.player || {};
  const C = cfg.collectible || {};
  const CAR = { enabled: true, frameWidth: 32, frameHeight: 16, frames: [0, 1], maxSpeed: 720, accel: 900, jumpVelocity: 560,
    hitbox: { x: 1, y: 3, w: 30, h: 13 }, side: 'right', ...(cfg.car || {}) };
  const phys = {
    gravity: 2200, moveSpeed: 340, jumpVelocity: 820, doubleJump: true, maxFallSpeed: 1100,
    wallSlideSpeed: 140, climbSpeed: 170, climbStamina: 4, wallJumpPush: 360, ...(cfg.physics || {}),
  };
  const T = () => ({
    start: 'PLAY MODE', startTouch: 'PLAY MODE', open: 'E', collected: 'coins', won: 'GG! {time}', time: 'time', best: 'best',
    newRecord: 'NEW RECORD!', pick: 'CHOOSE YOUR CHARACTER', pickHint: '← → / ENTER', car: 'E', carExit: 'E', carFound: 'SECRET!',
    openProject: 'E', back: 'E', pickHere: 'E: {name}', ...(opts.texts ? opts.texts() : {}),
  });
  const pageKey = opts.pageKey || location.pathname;
  const platformSel = (cfg.platforms || ['.project-card']).join(',');
  const coinSel = (cfg.coinsOn || []).join(',');
  const interactMap = Object.entries(cfg.interact || {});

  const coinImg = await loadImage(C.sprite).catch(() => null);
  const carImg = CAR.enabled && CAR.sprite ? await loadImage(CAR.sprite).catch(() => null) : null;
  const cw = C.frameWidth || 8, ch = C.frameHeight || 8;
  const coinFrames = C.frames || [0];

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
      document.querySelectorAll('.mini-sprite').forEach((el) => { el.style.backgroundImage = `url("${c.sprite}")`; });
      if (announce) { showToast(c.name, 2); burst(player.x + player.w / 2, player.y + player.h / 2, 12); blip(660, 0.08, 'square', 1.5); }
    }
  }

  /* ---------- DOM ---------- */
  const canvas = el('canvas', 'game-canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  const hud = el('div', 'game-hud', `<span class="coin-icon"></span><span class="hud-count">0/0</span><span class="hud-label"></span>
    <span class="hud-sep"></span><span class="hud-time">0:00.00</span><span class="hud-best"></span><span class="hud-car" hidden></span>`);
  const toast = el('div', 'game-toast hide');
  const bubble = el('div', 'game-bubble');
  const touch = el('div', 'game-touch', `
    <div class="pad pad-left"><button class="small" data-k="pick">C</button><button class="small" data-k="restart">R</button>
      <button data-k="left" aria-label="Left">◀</button><button data-k="right" aria-label="Right">▶</button></div>
    <div class="pad pad-right"><button class="small" data-k="act">E</button><button class="small" data-k="wave">F</button><span></span>
      <button data-k="down" aria-label="Down">▼</button><button data-k="up" aria-label="Up">▲</button><button class="jump" data-k="jump" aria-label="Jump">A</button></div>
    <button data-k="quit" class="quit" aria-label="Quit">X</button>`);
  touch.querySelector('.pad-left').style.gridTemplateColumns = 'repeat(2, 54px)';
  touch.querySelector('.pad-left').style.gridAutoFlow = 'row';
  const isTouch = matchMedia('(pointer: coarse)').matches;
  if (isTouch) { touch.classList.add('enabled'); toast.classList.add('touch'); }
  const picker = el('div', 'game-picker');
  const uiNodes = [canvas, hud, toast, bubble, touch];
  [...uiNodes, picker].forEach((n) => { n.hidden = true; document.body.appendChild(n); });

  /* ---------- State ---------- */
  const input = { left: false, right: false, up: false, down: false };
  let active = false, raf = 0, last = 0, frame = 0, t = 0;
  let platforms = [], walls = [], coins = [], particles = [];
  let jumpBuffer = 0, coyote = 0, dropTimer = 0, dropEl = null, won = false, toastTimer = 0;
  const player = { x: 0, y: 0, vx: 0, vy: 0, w: 11 * S, h: 16 * S, facing: 1, ground: null, jumps: 0, anim: 'idle', animT: 0,
    wall: null, climbing: false, stamina: phys.climbStamina, lockT: 0, emote: 0 };
  const carW = (CAR.hitbox.w) * S, carH = (CAR.hitbox.h) * S;
  const car = { x: 0, y: 0, vx: 0, vy: 0, w: carW, h: carH, facing: CAR.side === 'left' ? 1 : -1, ground: null, atHome: true, present: false, wheel: 0 };
  let inCar = false;
  const run = { start: null, time: 0, done: false };
  const waved = new Set();
  let pickerOpen = false, pickIndex = 0, pickTimer = 0, hudTick = 0;
  let audio = null;
  const hideoutKey = { hideout: true };

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
      if (r.h >= 28) {
        walls.push({ x: r.x, side: 1, top: r.y, bottom: r.y + r.h, el: node });
        walls.push({ x: r.x + r.w, side: -1, top: r.y, bottom: r.y + r.h, el: node });
      }
    });
    const docH = document.documentElement.scrollHeight;
    platforms.push({ x: -1e5, y: docH, w: 2e5, h: 0, el: document.documentElement });
    // hidden car spot: the bottom edge of the "hideAt" element becomes a floor
    const hide = CAR.enabled && carImg && CAR.hideAt ? document.querySelector(CAR.hideAt) : null;
    car.present = !!hide || !car.atHome;
    if (hide) {
      const r = rectOf(hide);
      if (r) {
        platforms.push({ x: r.x, y: Math.round(r.y + r.h), w: r.w, h: 0, el: hideoutKey });
        if (car.atHome) {
          car.x = CAR.side === 'left' ? r.x + 30 : r.x + r.w - car.w - 30;
          car.y = Math.round(r.y + r.h) - car.h; car.ground = hideoutKey; car.vy = 0;
        }
      }
    }
    coins.forEach((c) => {
      const r = rectOf(c.el);
      c.alive = !!r && !c.el.closest('[hidden], .is-hidden');
      if (r) { c.x = r.x + r.w / 2 - (cw * S) / 2; c.y = r.y - ch * S - 18; }
    });
  }
  function buildCoins() {
    if (coins.length || !coinSel) return;
    document.querySelectorAll(coinSel).forEach((node) => coins.push({ el: node, x: 0, y: 0, taken: false, alive: true, phase: Math.random() * 6 }));
  }
  const platformOf = (key) => platforms.find((q) => q.el === key);

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
    r: 'restart', R: 'restart', Escape: 'quit',
  };
  const markRun = () => { if (!run.start && !run.done) run.start = performance.now(); };
  function press(k) {
    if (pickerOpen) { pickerKey(k); return; }
    if (k in input) { input[k] = true; if (k !== 'down') markRun(); }
    if (k === 'up' && !inCar && (player.ground || coyote > 0) && !player.wall) jumpBuffer = 0.12;
    if (k === 'jump') { jumpBuffer = 0.12; markRun(); }
    if (k === 'down' && !inCar && player.ground && player.ground !== document.documentElement) {
      dropEl = player.ground; dropTimer = 0.25; player.ground = null; player.vy = 60;
    }
    if (k === 'act') interact();
    if (k === 'wave') { if (inCar) honk(); else { player.emote = 1.6; blip(880, 0.05); } }
    if (k === 'pick') openPicker();
    if (k === 'restart') restartRun();
    if (k === 'quit') stop();
  }
  function release(k) { if (k in input) input[k] = false; }
  function onKeyDown(e) {
    if (!active || (document.querySelector('dialog[open]'))) return;
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
  document.addEventListener('portfolio:layout', () => { if (active) requestAnimationFrame(scanPlatforms); });
  touch.querySelectorAll('button').forEach((b) => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('down'); press(k); });
    const up = () => { b.classList.remove('down'); release(k); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  });

  /* ---------- Interaction ---------- */
  function nearCar() {
    if (!car.present || inCar) return false;
    const p = player;
    return p.x + p.w > car.x - 10 && p.x < car.x + car.w + 10 && p.y + p.h > car.y - 6 && p.y < car.y + car.h;
  }
  function interactTarget() {
    if (inCar) return { action: 'car-exit' };
    if (nearCar()) return { action: 'car-enter' };
    const g = player.ground;
    if (!g || !g.closest) return null;
    for (const [sel, action] of interactMap) {
      const target = g.closest(sel);
      if (target) {
        if (action === 'select-character' && !characters().some((c) => c.id === target.dataset.char)) continue;
        return { el: target, action };
      }
    }
    return null;
  }
  function bubbleText(it) {
    const tx = T();
    switch (it.action) {
      case 'car-enter': return tx.car;
      case 'car-exit': return tx.carExit;
      case 'open-project': return tx.openProject;
      case 'back': return tx.back;
      case 'select-character': return fill(tx.pickHere, { name: characters().find((c) => c.id === it.el.dataset.char)?.name || '' });
      default: return tx.open;
    }
  }
  function interact() {
    const it = interactTarget();
    if (!it) return;
    blip(660, 0.06);
    if (it.action === 'car-enter') return enterCar();
    if (it.action === 'car-exit') return exitCar();
    if (it.action === 'open-project') {
      const href = it.el.querySelector('a.card-link')?.href;
      if (!href) return;
      if (it.el.dataset.id) ss.set('maipa-spawn', { page: pageKey, sel: `[data-id="${CSS.escape(it.el.dataset.id)}"]` });
      location.href = href;
      return;
    }
    if (it.action === 'back') {
      const id = pageKey.startsWith('project:') ? pageKey.slice(8) : '';
      if (id) ss.set('maipa-spawn', { page: 'home', sel: `[data-id="${CSS.escape(id)}"]` });
      it.el.click();
      return;
    }
    if (it.action === 'select-character') { setCharacter(it.el.dataset.char, { announce: true }); return; }
    it.el.click();
  }

  /* ---------- Car ---------- */
  function enterCar() {
    inCar = true; car.atHome = false; car.vx = 0; car.facing = player.facing;
    burst(car.x + car.w / 2, car.y, 14, '#aaaaaa');
    blip(220, 0.15, 'sawtooth', 2);
    const secrets = ls.get('maipa-secrets', {});
    if (!secrets.car) { secrets.car = true; ls.set('maipa-secrets', secrets); }
    showToast(T().carFound, 6);
    updateHud(true);
  }
  function exitCar() {
    inCar = false;
    player.x = clamp(car.x + car.w / 2 - player.w / 2, 0, docWidth() - player.w);
    player.y = car.y - player.h; player.vy = -380; player.vx = 0; player.ground = null; player.wall = null;
    car.vx = 0;
  }
  function honk() { blip(330, 0.18, 'square'); setTimeout(() => blip(415, 0.22, 'square'), 120); }

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
  function restartRun(scrollTop = true) {
    coins.forEach((c) => { c.taken = false; });
    won = false; run.start = null; run.time = 0; run.done = false;
    if (inCar) exitCar();
    car.atHome = true; car.vx = 0; car.vy = 0;
    scanPlatforms();
    spawn({ top: scrollTop });
    updateHud(true);
  }
  async function start({ resumed = false } = {}) {
    if (active) return;
    active = true;
    opts.onActiveChange?.(true);
    document.body.classList.add('play-mode');
    uiNodes.forEach((n) => { n.hidden = false; });
    resize(); buildCoins(); scanPlatforms();
    if (!look) await setCharacter(charId, { save: false });
    spawn({ top: resumed && !ss.get('maipa-spawn') });
    run.start = null; run.time = 0; run.done = false; won = false;
    updateHud(true);
    showToast(isTouch ? T().startTouch : T().start, 7);
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
    closePicker();
    document.body.classList.remove('play-mode');
    uiNodes.forEach((n) => { n.hidden = true; });
    document.querySelectorAll('.game-hover').forEach((n) => n.classList.remove('game-hover'));
    Object.keys(input).forEach((k) => { input[k] = false; });
  }
  function invalidate() {
    coins = []; won = false;
    if (active) requestAnimationFrame(() => { buildCoins(); scanPlatforms(); run.start = null; run.done = false; updateHud(true); });
  }

  /* ---------- Loop ---------- */
  function loop(now) {
    if (!active) return;
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now; t += dt; frame++;
    if (frame % 20 === 0) scanPlatforms();
    if (!pickerOpen) update(dt);
    else drawPicker(dt);
    camera(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    jumpBuffer -= dt; coyote -= dt; dropTimer -= dt;
    if (dropTimer <= 0) dropEl = null;
    if (inCar) updateCar(dt); else updatePlayer(dt);
    if (!inCar && car.present) { // parked car keeps standing on something
      if (car.ground && !stick(car)) car.ground = null;
      if (!car.ground) fall(car, dt);
    }
    const body = inCar ? car : player;

    // interaction highlight + bubble
    const it = interactTarget();
    document.querySelectorAll('.game-hover').forEach((n) => { if (!it || n !== it.el) n.classList.remove('game-hover'); });
    if (it) { it.el?.classList.add('game-hover'); bubble.hidden = false; bubble.textContent = bubbleText(it); } else bubble.hidden = true;

    // auto-wave on contact links
    const social = !inCar && player.ground?.closest?.('.social-link');
    if (social && !waved.has(social)) { waved.add(social); player.emote = 1.4; }

    // coins
    for (const c of coins) {
      if (c.taken || !c.alive) continue;
      const cx = c.x, cy = c.y + Math.sin(t * 3 + c.phase) * 4;
      if (body.x < cx + cw * S && body.x + body.w > cx && body.y < cy + ch * S && body.y + body.h > cy) {
        c.taken = true; markRun();
        blip(988, 0.06); setTimeout(() => blip(1319, 0.12), 60);
        burst(cx + (cw * S) / 2, cy + (ch * S) / 2, 10);
        updateHud(true);
      }
    }
    if (run.start && !run.done) run.time = (performance.now() - run.start) / 1000;
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

    // horizontal
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
  // returns true while the player is still on the wall
  function updateWall(dt, dir) {
    const p = player, w = p.wall;
    if (w.el) {
      const q = platforms.find((x) => x.el === w.el);
      if (!q) { p.wall = null; return false; }
      w.x = w.side > 0 ? q.x : q.x + q.w; w.top = q.y; w.bottom = q.y + q.h;
    }
    if (jumpBuffer > 0) { // wall jump
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
    if (w.el && p.y + p.h * 0.55 < w.top) { // pull up over the edge
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

  function updateCar(dt) {
    const c = car;
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir) {
      if (Math.sign(c.vx) === -dir && Math.abs(c.vx) > 200 && c.ground) skid(c);
      c.vx += dir * CAR.accel * dt * (Math.sign(c.vx) === -dir ? 1.8 : 1);
      if (frame % 3 === 0 && c.ground) particles.push({ x: c.x + (c.facing > 0 ? 0 : c.w), y: c.y + c.h - 10, vx: -c.facing * 60, vy: -30, life: 0.5, s: S * 2, g: -60, c: 'rgba(160,160,160,.6)' });
    } else {
      c.vx *= 1 - Math.min(1, (c.ground ? 2.2 : 0.4) * dt);
    }
    c.vx = clamp(c.vx, -CAR.maxSpeed, CAR.maxSpeed);
    if (Math.abs(c.vx) > 15) c.facing = Math.sign(c.vx);
    const prevX = c.x;
    c.x += c.vx * dt;
    const hit = crossWall(c, prevX);
    if (hit) { c.x = hit.side > 0 ? hit.x - c.w : hit.x; if (Math.abs(c.vx) > 400) { burst(c.x + (hit.side > 0 ? c.w : 0), c.y + c.h / 2, 8); blip(120, 0.1, 'sawtooth'); } c.vx = 0; }
    const W = docWidth();
    if (c.x < 0) { c.x = 0; c.vx = 0; }
    if (c.x + c.w > W) { c.x = W - c.w; c.vx = 0; }
    if (c.ground && !stick(c)) coyote = 0.08;
    if (jumpBuffer > 0 && (c.ground || coyote > 0)) { c.vy = -CAR.jumpVelocity; c.ground = null; coyote = 0; jumpBuffer = 0; blip(300, 0.1, 'square', 1.5); }
    if (!c.ground) { const vb = c.vy; const l = fall(c, dt, dropEl); if (l && vb > 600) { burst(c.x + c.w / 2, l.y, 10, '#999999'); blip(90, 0.12, 'sawtooth'); } }
    c.wheel += Math.abs(c.vx) * dt;
  }
  function skid(c) { if (frame % 2 === 0) particles.push({ x: c.x + c.w / 2, y: c.y + c.h - 4, vx: (Math.random() - 0.5) * 80, vy: -40, life: 0.4, s: S * 2, g: -40, c: 'rgba(200,200,200,.7)' }); }

  function animate(dt) {
    const p = player;
    let next;
    if (p.wall) next = p.climbing ? 'climb' : 'wallslide';
    else if (!p.ground) next = p.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(p.vx) > 30) next = 'run';
    else if (p.emote > 0) next = 'wave';
    else next = 'idle';
    if (!look?.anims[next]) next = next === 'wave' || next === 'climb' || next === 'wallslide' ? (p.wall ? 'fall' : 'idle') : 'idle';
    if (next !== p.anim) { p.anim = next; p.animT = 0; } else p.animT += dt;
  }

  function camera(dt) {
    const b = inCar ? car : player;
    const want = clamp(b.y + b.h / 2 - innerHeight * 0.5, 0, document.documentElement.scrollHeight - innerHeight);
    const diff = want - scrollY;
    if (Math.abs(diff) > 1) window.scrollTo({ top: scrollY + diff * Math.min(1, dt * 7), behavior: 'instant' });
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

    const cf = coinFrames[Math.floor(t * (C.fps || 8)) % coinFrames.length];
    for (const c of coins) {
      if (c.taken || !c.alive) continue;
      const x = Math.round(c.x - ox), y = Math.round(c.y - oy + Math.sin(t * 3 + c.phase) * 4);
      if (y < -40 || y > H + 40) continue;
      if (coinImg) ctx.drawImage(coinImg, cf * cw, 0, cw, ch, x, y, cw * S, ch * S);
      else { ctx.fillStyle = '#d11717'; ctx.fillRect(x, y, cw * S, ch * S); }
    }

    for (const q of particles) { ctx.fillStyle = q.c || '#d11717'; ctx.fillRect(Math.round(q.x - ox), Math.round(q.y - oy), q.s, q.s); }

    if (car.present && carImg) {
      const hb = CAR.hitbox;
      const dx = Math.round(car.x - ox - hb.x * S), dy = Math.round(car.y - oy - hb.y * S);
      if (dy > -100 && dy < H + 100) {
        const frames = CAR.frames || [0];
        const fr = frames[Math.floor(car.wheel / 18) % frames.length];
        drawSpriteFrame(carImg, fr, CAR.frameWidth, CAR.frameHeight, dx, dy, car.facing < 0);
      }
    }

    if (!inCar && look) {
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
      const b = inCar ? car : player;
      bubble.style.left = `${Math.round(b.x - ox + b.w / 2)}px`;
      bubble.style.top = `${Math.round(b.y - oy - 10)}px`;
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
    if (k === 'quit' || k === 'pick') { closePicker(); return; }
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
        const sel = i === pickIndex;
        const anim = sel && PL.animations?.wave ? PL.animations.wave : a;
        const fr = anim.frames[Math.floor(pickTimer * (anim.fps || 2)) % anim.frames.length];
        const cols = Math.max(1, Math.floor(img.width / fw));
        g.clearRect(0, 0, fw, fh);
        g.drawImage(img, (fr % cols) * fw, Math.floor(fr / cols) * fh, fw, fh, 0, 0, fw, fh);
      });
    });
  }

  /* ---------- HUD / effects ---------- */
  function burst(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      particles.push({ x, y, vx: (Math.random() - 0.5) * 320, vy: -Math.random() * 320 - 60, life: 0.35 + Math.random() * 0.35, s: S + (Math.random() < 0.3 ? S : 0), c: color });
    }
  }
  function updateHud(full = false) {
    const tx = T();
    const total = coins.filter((c) => c.alive || c.taken).length, got = coins.filter((c) => c.taken).length;
    if (full) {
      hud.querySelector('.hud-count').textContent = `${got}/${total}`;
      hud.querySelector('.hud-label').textContent = tx.collected;
      const best = ls.get(`maipa-best:${pageKey}`);
      hud.querySelector('.hud-best').textContent = best ? `${tx.best} ${fmtTime(best)}` : '';
      hud.querySelector('.hud-car').hidden = !ls.get('maipa-secrets', {}).car;
    }
    hud.querySelector('.hud-time').textContent = `${tx.time} ${fmtTime(run.time)}`;
    if (total && got === total && !won) {
      won = true; run.done = true;
      const best = ls.get(`maipa-best:${pageKey}`);
      const record = !best || run.time < best;
      if (record) ls.set(`maipa-best:${pageKey}`, run.time);
      showToast(`${fill(tx.won, { time: fmtTime(run.time) })}${record ? `  ${tx.newRecord}` : ''}`, 9);
      player.emote = 3;
      for (let i = 0; i < 6; i++) setTimeout(() => { burst(scrollX + Math.random() * innerWidth, scrollY + innerHeight * 0.3, 18); blip(523 * (1 + i / 6), 0.1); }, i * 140);
      updateHud(true);
    }
  }
  function showToast(msg, secs) { toast.textContent = msg; toast.classList.remove('hide'); toastTimer = secs; }

  await setCharacter(charId, { save: false });
  return {
    start, stop, invalidate,
    toggle: () => (active ? stop() : start()),
    get active() { return active; },
    /** read-only snapshot for debugging in the console: __maipaGame.debug */
    get debug() { return { player, car, inCar, run, coins: coins.length, taken: coins.filter((c) => c.taken).length, walls: walls.length, platforms: platforms.length, charId }; },
  };
}

function el(tag, cls, html = '') { const n = document.createElement(tag); n.className = cls; n.innerHTML = html; return n; }
function escapeHTML(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
