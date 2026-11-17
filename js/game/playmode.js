/* =========================================================
   PLAY MODE — a tiny pixel-art platformer that uses the page itself as the level.
   - Platforms = top edges of the elements listed in data/game.json ("platforms").
   - Coins float above elements listed in "coinsOn" (projects, skills, models...).
   - Stand on a project card and press E to open its main link.
   Sprites are plain horizontal sprite sheets (Aseprite: Export Sprite Sheet → Horizontal strip).
   ========================================================= */

const loadImage = (src) => new Promise((resolve, reject) => {
  if (!src) return reject(new Error('no src'));
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export async function createPlayMode(cfg = {}, opts = {}) {
  const S = cfg.pixelScale || 3;
  const P = cfg.player || {};
  const C = cfg.collectible || {};
  const phys = { gravity: 2200, moveSpeed: 300, jumpVelocity: 760, doubleJump: true, maxFallSpeed: 1100, ...(cfg.physics || {}) };
  // texts come from data/i18n/<lang>.json → "game" (read every time, so a language switch applies at once)
  const T = () => ({ start: 'PLAY MODE', startTouch: 'PLAY MODE', open: 'E: open', collected: 'coins', won: 'GG!', ...(cfg.texts || {}), ...(opts.texts ? opts.texts() : {}) });
  const platformSel = (cfg.platforms || ['.project-card']).join(',');
  const coinSel = (cfg.coinsOn || []).join(',');

  const [sprite, coinImg] = await Promise.all([
    loadImage(P.sprite).catch(() => null),
    loadImage(C.sprite).catch(() => null),
  ]);

  const fw = P.frameWidth || 16, fh = P.frameHeight || 16;
  const hb = { x: 0, y: 0, w: fw, h: fh, ...(P.hitbox || {}) };
  const anims = P.animations || { idle: { frames: [0], fps: 1 } };
  const cw = C.frameWidth || 8, ch = C.frameHeight || 8;
  const coinFrames = C.frames || [0];

  /* ---------- DOM ---------- */
  const canvas = document.createElement('canvas');
  canvas.className = 'game-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');

  const hud = el('div', 'game-hud', `<span class="coin-icon"></span><span class="hud-count">0/0</span><span class="hud-label"></span>`);
  const toast = el('div', 'game-toast hide');
  const bubble = el('div', 'game-bubble');
  const touch = el('div', 'game-touch', `
      <div class="pad"><button data-k="left" aria-label="Left">◀</button><button data-k="right" aria-label="Right">▶</button><button data-k="quit" class="quit" aria-label="Quit">X</button></div>
      <div class="pad"><button data-k="down" aria-label="Drop">▼</button><button data-k="act" aria-label="Open">E</button><button data-k="jump" aria-label="Jump">▲</button></div>`);
  const isTouch = matchMedia('(pointer: coarse)').matches;
  if (isTouch) { touch.classList.add('enabled'); toast.classList.add('touch'); }
  [canvas, hud, toast, bubble, touch].forEach((n) => { n.hidden = true; document.body.appendChild(n); });

  /* ---------- State ---------- */
  const input = { left: false, right: false, down: false };
  let active = false, raf = 0, last = 0, frame = 0, t = 0;
  let platforms = [], coins = [], particles = [];
  let jumpBuffer = 0, coyote = 0, dropTimer = 0, dropEl = null, won = false, toastTimer = 0;
  const player = { x: 0, y: 0, vx: 0, vy: 0, w: hb.w * S, h: hb.h * S, facing: 1, ground: null, jumps: 0, anim: 'idle', animT: 0 };
  let audio = null;

  /* ---------- Level from the DOM ---------- */
  function rectOf(node) {
    const r = node.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
  }
  function scanPlatforms() {
    platforms = [];
    document.querySelectorAll(platformSel).forEach((node) => {
      const r = rectOf(node);
      if (r) platforms.push({ x: r.x, y: Math.round(r.y), w: r.w, el: node });
    });
    // page floor
    platforms.push({ x: -1e5, y: document.documentElement.scrollHeight, w: 2e5, el: document.documentElement });
    coins.forEach((c) => {
      const r = rectOf(c.el);
      c.alive = !!r;
      if (r) { c.x = r.x + r.w / 2 - (cw * S) / 2; c.y = r.y - ch * S - 18; }
    });
  }
  function buildCoins() {
    if (coins.length || !coinSel) return;
    document.querySelectorAll(coinSel).forEach((node) => coins.push({ el: node, x: 0, y: 0, taken: false, alive: true, phase: Math.random() * 6 }));
  }

  /* ---------- Controls ---------- */
  const KEY = {
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
    ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump',
    ArrowDown: 'down', s: 'down', S: 'down',
    e: 'act', E: 'act', Enter: 'act',
    r: 'respawn', R: 'respawn', Escape: 'quit',
  };
  function press(k) {
    if (k === 'left' || k === 'right' || k === 'down') input[k] = true;
    if (k === 'jump') jumpBuffer = 0.12;
    if (k === 'down' && player.ground && player.ground !== document.documentElement) { dropEl = player.ground; dropTimer = 0.25; player.ground = null; player.vy = 60; }
    if (k === 'act') interact();
    if (k === 'respawn') spawn(true);
    if (k === 'quit') stop();
  }
  function release(k) { if (k in input) input[k] = false; }
  function onKeyDown(e) {
    if (!active || document.querySelector('dialog[open]')) return;
    const k = KEY[e.key];
    if (!k) return;
    e.preventDefault();
    if (e.repeat && (k === 'jump' || k === 'act')) return;
    press(k);
  }
  function onKeyUp(e) { const k = KEY[e.key]; if (active && k) release(k); }
  function onWheel(e) { if (active) e.preventDefault(); }
  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', onKeyUp);
  addEventListener('wheel', onWheel, { passive: false });
  addEventListener('blur', () => { input.left = input.right = input.down = false; });
  addEventListener('resize', () => { if (active) { resize(); scanPlatforms(); } });
  document.addEventListener('portfolio:layout', () => { if (active) requestAnimationFrame(scanPlatforms); });
  touch.querySelectorAll('button').forEach((b) => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('down'); press(k); });
    const up = () => { b.classList.remove('down'); release(k); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  });

  function interactTarget() {
    const g = player.ground;
    if (!g || g === document.documentElement) return null;
    return g.closest('.project-card, .render-tile, .social-link, .filter-chip, .model-card');
  }
  function interact() {
    const target = interactTarget();
    if (!target) return;
    if (target.matches('.project-card')) {
      const link = target.querySelector('.project-link');
      if (link) link.click();
    } else if (target.matches('.model-card')) {
      target.querySelector('model-viewer')?.scrollIntoView({ block: 'center' });
    } else {
      target.click();
    }
    blip(660, 0.06);
  }

  /* ---------- Audio (tiny 8-bit blips) ---------- */
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
    } catch { /* audio not available */ }
  }

  /* ---------- Lifecycle ---------- */
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  function spawn(top = false) {
    const navH = document.querySelector('.site-nav')?.offsetHeight || 0;
    if (top) window.scrollTo({ top: 0, behavior: 'instant' });
    player.x = clamp(innerWidth * 0.5 - player.w / 2, 10, innerWidth - player.w - 10);
    player.y = (top ? 0 : scrollY) + navH + 30;
    player.vx = player.vy = 0; player.ground = null; player.jumps = 0;
    burst(player.x + player.w / 2, player.y + player.h / 2, 14);
  }
  function start() {
    if (active) return;
    active = true;
    document.body.classList.add('play-mode');
    [canvas, hud, toast, bubble, touch].forEach((n) => (n.hidden = false));
    resize(); buildCoins(); scanPlatforms(); spawn();
    updateHud();
    hud.querySelector('.hud-label').textContent = T().collected;
    showToast(isTouch ? T().startTouch : T().start, 6);
    blip(440, 0.1, 'square', 2);
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    if (!active) return;
    active = false;
    cancelAnimationFrame(raf);
    document.body.classList.remove('play-mode');
    [canvas, hud, toast, bubble, touch].forEach((n) => (n.hidden = true));
    document.querySelectorAll('.game-hover').forEach((n) => n.classList.remove('game-hover'));
    input.left = input.right = input.down = false;
  }

  /* ---------- Loop ---------- */
  function loop(now) {
    if (!active) return;
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now; t += dt; frame++;
    if (frame % 20 === 0) scanPlatforms();
    update(dt);
    camera(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    const p = player;
    // horizontal
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const target = dir * phys.moveSpeed;
    const accel = p.ground ? 18 : 9;
    p.vx += (target - p.vx) * Math.min(1, accel * dt);
    if (dir) p.facing = dir;
    p.x = clamp(p.x + p.vx * dt, 0, document.documentElement.clientWidth - p.w);

    // timers
    jumpBuffer -= dt; coyote -= dt; dropTimer -= dt;
    if (dropTimer <= 0) dropEl = null;

    // still standing on something?
    if (p.ground) {
      const plat = platforms.find((q) => q.el === p.ground);
      if (!plat || p.x + p.w < plat.x + 2 || p.x > plat.x + plat.w - 2) { p.ground = null; coyote = 0.1; }
      else { p.y = plat.y - p.h; p.vy = 0; }
    }

    // jump (with coyote time, jump buffer and optional double jump)
    if (jumpBuffer > 0) {
      if (p.ground || coyote > 0) {
        p.vy = -phys.jumpVelocity; p.ground = null; coyote = 0; jumpBuffer = 0; p.jumps = 1;
        blip(520, 0.09, 'square', 1.6); burst(p.x + p.w / 2, p.y + p.h, 5);
      } else if (phys.doubleJump && p.jumps < 2) {
        p.vy = -phys.jumpVelocity * 0.85; jumpBuffer = 0; p.jumps = 2;
        blip(700, 0.08, 'square', 1.5); burst(p.x + p.w / 2, p.y + p.h, 8);
      }
    }

    // vertical
    if (!p.ground) {
      const prevBottom = p.y + p.h;
      p.vy = Math.min(p.vy + phys.gravity * dt, phys.maxFallSpeed);
      p.y += p.vy * dt;
      if (p.vy >= 0) {
        const bottom = p.y + p.h;
        let hit = null;
        for (const q of platforms) {
          if (q.el === dropEl) continue;
          if (p.x + p.w <= q.x + 2 || p.x >= q.x + q.w - 2) continue;
          if (prevBottom <= q.y + 1 && bottom >= q.y && (!hit || q.y < hit.y)) hit = q;
        }
        if (hit) {
          p.y = hit.y - p.h; p.vy = 0; p.ground = hit.el; p.jumps = 0;
          if (prevBottom < hit.y - 30) burst(p.x + p.w / 2, hit.y, 4);
        }
      }
      if (p.y < 0) { p.y = 0; p.vy = Math.max(0, p.vy); }
    }

    // highlight interactive thing under the player
    const target2 = interactTarget();
    document.querySelectorAll('.game-hover').forEach((n) => { if (n !== target2) n.classList.remove('game-hover'); });
    if (target2) {
      target2.classList.add('game-hover');
      bubble.hidden = false;
      bubble.textContent = target2.matches('.project-card') && !target2.querySelector('.project-link') ? (target2.dataset.title || '') : T().open;
    } else bubble.hidden = true;

    // coins
    for (const c of coins) {
      if (c.taken || !c.alive) continue;
      const cx = c.x, cy = c.y + Math.sin(t * 3 + c.phase) * 4;
      if (p.x < cx + cw * S && p.x + p.w > cx && p.y < cy + ch * S && p.y + p.h > cy) {
        c.taken = true;
        blip(988, 0.06); setTimeout(() => blip(1319, 0.12), 60);
        burst(cx + (cw * S) / 2, cy + (ch * S) / 2, 10);
        updateHud();
      }
    }

    // particles
    particles = particles.filter((q) => (q.life -= dt) > 0);
    particles.forEach((q) => { q.vy += 900 * dt; q.x += q.vx * dt; q.y += q.vy * dt; });

    // animation state
    const next = !p.ground ? (p.vy < 0 ? 'jump' : 'fall') : Math.abs(p.vx) > 30 ? 'run' : 'idle';
    if (next !== p.anim) { p.anim = next; p.animT = 0; } else p.animT += dt;

    if (toastTimer > 0 && (toastTimer -= dt) <= 0) toast.classList.add('hide');
  }

  function camera(dt) {
    const want = clamp(player.y + player.h / 2 - innerHeight * 0.5, 0, document.documentElement.scrollHeight - innerHeight);
    const cur = scrollY;
    const diff = want - cur;
    if (Math.abs(diff) > 1) window.scrollTo({ top: cur + diff * Math.min(1, dt * 7), behavior: 'instant' });
  }

  function draw() {
    const W = innerWidth, H = innerHeight, ox = scrollX, oy = scrollY;
    ctx.clearRect(0, 0, W, H);

    // coins
    const cf = coinFrames[Math.floor(t * (C.fps || 8)) % coinFrames.length];
    for (const c of coins) {
      if (c.taken || !c.alive) continue;
      const x = Math.round(c.x - ox), y = Math.round(c.y - oy + Math.sin(t * 3 + c.phase) * 4);
      if (y < -40 || y > H + 40) continue;
      if (coinImg) ctx.drawImage(coinImg, cf * cw, 0, cw, ch, x, y, cw * S, ch * S);
      else { ctx.fillStyle = '#d11717'; ctx.fillRect(x, y, cw * S, ch * S); }
    }

    // particles
    ctx.fillStyle = '#d11717';
    for (const q of particles) ctx.fillRect(Math.round(q.x - ox), Math.round(q.y - oy), q.s, q.s);

    // player
    const p = player;
    const a = anims[p.anim] || anims.idle || { frames: [0], fps: 1 };
    const fr = a.frames[Math.floor(p.animT * (a.fps || 1)) % a.frames.length];
    const cols = sprite ? Math.max(1, Math.floor(sprite.width / fw)) : 1;
    const sx = (fr % cols) * fw, sy = Math.floor(fr / cols) * fh;
    const dx = Math.round(p.x - ox - hb.x * S), dy = Math.round(p.y - oy - hb.y * S);
    // ground shadow
    if (p.ground) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(Math.round(p.x - ox) + 3, Math.round(p.y - oy + p.h) - 2, p.w - 6, 3); }
    if (sprite) {
      ctx.save();
      if (p.facing < 0) { ctx.translate(dx + fw * S, dy); ctx.scale(-1, 1); ctx.drawImage(sprite, sx, sy, fw, fh, 0, 0, fw * S, fh * S); }
      else ctx.drawImage(sprite, sx, sy, fw, fh, dx, dy, fw * S, fh * S);
      ctx.restore();
    } else { ctx.fillStyle = '#d11717'; ctx.fillRect(Math.round(p.x - ox), Math.round(p.y - oy), p.w, p.h); }

    if (!bubble.hidden) {
      bubble.style.left = `${Math.round(p.x - ox + p.w / 2)}px`;
      bubble.style.top = `${Math.round(p.y - oy - 10)}px`;
    }
  }

  /* ---------- UI helpers ---------- */
  function burst(x, y, n) {
    for (let i = 0; i < n; i++) {
      particles.push({ x, y, vx: (Math.random() - 0.5) * 320, vy: -Math.random() * 320 - 60, life: 0.35 + Math.random() * 0.35, s: S + (Math.random() < 0.3 ? S : 0) });
    }
  }
  function updateHud() {
    const total = coins.length, got = coins.filter((c) => c.taken).length;
    hud.querySelector('.hud-count').textContent = `${got}/${total}`;
    if (total && got === total && !won) {
      won = true;
      showToast(T().won, 8);
      for (let i = 0; i < 6; i++) setTimeout(() => { burst(scrollX + Math.random() * innerWidth, scrollY + innerHeight * 0.3, 18); blip(523 * (1 + i / 6), 0.1); }, i * 140);
    }
  }
  function showToast(msg, secs) { toast.textContent = msg; toast.classList.remove('hide'); toastTimer = secs; }

  // after the page re-renders (e.g. language change) coins must be rebuilt for the new elements
  function invalidate() { coins = []; won = false; }

  return { start, stop, invalidate, toggle: () => (active ? stop() : start()), get active() { return active; } };
}

function el(tag, cls, html = '') { const n = document.createElement(tag); n.className = cls; n.innerHTML = html; return n; }
function escapeHTML(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
