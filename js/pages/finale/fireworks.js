/* =========================================================
   Pixel fireworks on a full-screen canvas.
   startFireworks(canvas) → stop()
   Rockets fly up from the bottom and explode into square "pixels".
   ========================================================= */
const COLORS = ['#d11717', '#ff2d2d', '#ffffff', '#ffd34d', '#ff8a1a', '#ff6b6b'];
const PX = 4;                       // size of one "pixel"

export function startFireworks(canvas, { calm = matchMedia('(prefers-reduced-motion: reduce)').matches } = {}) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, raf = 0, last = performance.now(), nextRocket = 0;
  const rockets = [], sparks = [];

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  function launch() {
    rockets.push({ x: rand(W * 0.1, W * 0.9), y: H + 10, vx: rand(-60, 60), vy: -rand(H * 0.9, H * 1.25), fuse: rand(0.75, 1.15), color: pick(COLORS) });
  }
  function explode(r) {
    const n = calm ? 26 : Math.round(rand(40, 70));
    const second = pick(COLORS);
    const ring = Math.random() < 0.35;            // some fireworks are perfect rings
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.08, 0.08);
      const speed = ring ? 260 : rand(80, 320);
      const life = rand(0.9, 1.6);
      sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life, max: life, color: Math.random() < 0.7 ? r.color : second, twinkle: Math.random() < 0.3 });
    }
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    nextRocket -= dt;
    if (nextRocket <= 0) { launch(); nextRocket = calm ? rand(1.8, 2.8) : rand(0.25, 0.75); }

    ctx.clearRect(0, 0, W, H);
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.vy += 380 * dt; r.x += r.vx * dt; r.y += r.vy * dt; r.fuse -= dt;
      ctx.fillStyle = r.color;
      ctx.fillRect(Math.round(r.x / PX) * PX, Math.round(r.y / PX) * PX, PX, PX * 2);
      if (Math.random() < 0.6) sparks.push({ x: r.x, y: r.y + PX * 2, vx: rand(-20, 20), vy: rand(20, 60), life: 0.35, max: 0.35, color: '#ffd34d' });
      if (r.fuse <= 0 || r.vy > -40) { explode(r); rockets.splice(i, 1); }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life -= dt;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      s.vx *= 1 - 1.6 * dt; s.vy = s.vy * (1 - 1.6 * dt) + 160 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      const k = s.life / s.max;
      ctx.globalAlpha = s.twinkle && Math.random() < 0.3 ? 0.2 : Math.min(1, k * 1.5);
      ctx.fillStyle = s.color;
      ctx.fillRect(Math.round(s.x / PX) * PX, Math.round(s.y / PX) * PX, PX, PX);
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }

  resize();
  addEventListener('resize', resize);
  for (let i = 0; i < (calm ? 1 : 3); i++) setTimeout(launch, i * 250);
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); ctx.clearRect(0, 0, W, H); };
}
