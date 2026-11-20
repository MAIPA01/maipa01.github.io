/* =========================================================
   SECRET CAR GAME — an endless runner inside the band with the car
   render (car.secretAt). Obstacles come from the right:
     ground  – jump over them (SPACE / ↑)
     air     – drones flying right after a ground obstacle: if you are
               still in the air, slam down with ↓
     ramp    – drive over it for a big jump (the car tilts back)
   R = restart, E = get out, ESC = quit the play mode.
   ========================================================= */
import { clamp, fill, pickWeighted, store } from '../util.js';

export function installCarRunner(G) {
  const { CAR, S, input, player, ui } = G;
  const ctx = ui.ctx;
  const hb = CAR.hitbox || { x: 1, y: 3, w: 30, h: 13 };
  const EXHAUST = [1, 11.5];                  // exhaust pipe in body pixels
  const MAX_TILT = 0.42;                      // radians (~24°)

  const cg = G.car = {
    x: 0, y: 0, w: hb.w * S, h: hb.h * S,     // hitbox in page px
    left: 0, right: 0, top: 0, bottom: 0, road: 0,
    vy: 0, ground: true, jumps: 0, speed: 0, dist: 0, scroll: 0, wheel: 0,
    obstacles: [], nextIn: 0, over: false, shield: false, inv: 0,
    tilt: 0, bounce: 0, ramp: null,
  };
  G.carScore = () => Math.floor(cg.dist / 40);
  const spriteX = () => cg.x - hb.x * S;
  const spriteY = () => cg.y - hb.y * S;
  const jumpPower = () => CAR.jumpVelocity * (G.owns('upgrade:springs') ? 1.22 : 1);

  /** the game area = the band element on the page */
  G.layoutCarGame = () => {
    const spot = document.querySelector(CAR.secretAt);
    const r = spot && G.rectOf(spot);
    if (!r) return;
    cg.left = r.x; cg.right = r.x + r.w; cg.top = r.y; cg.bottom = r.y + r.h;
    cg.road = r.y + r.h - 34;
    cg.x = r.x + Math.max(40, r.w * 0.14);
    if (cg.ground && !cg.ramp) cg.y = cg.road - cg.h;
  };

  G.startCarGame = () => {
    if (G.mode !== 'free' || !G.carReady()) return;
    G.mode = 'car';
    document.body.classList.add('game-car');
    G.setBubble('');
    const secrets = store.get('maipa-secrets', {});
    const first = !secrets.car;
    if (first) { secrets.car = true; store.set('maipa-secrets', secrets); }
    resetCarGame();
    G.showToast(first ? G.T().carFound : G.T().carStart, first ? 7 : 4);
    G.blip(220, 0.15, 'sawtooth', 2);
  };

  function resetCarGame() {
    G.hideToast();                              // e.g. the CRASH message
    G.layoutCarGame();
    Object.assign(cg, {
      vy: 0, ground: true, jumps: 0, speed: CAR.speed, dist: 0, obstacles: [], nextIn: 1.2,
      over: false, inv: 0, shield: G.owns('upgrade:shield'), tilt: 0, bounce: 0, ramp: null,
    });
    cg.y = cg.road - cg.h;
    G.updateHud(true);
  }

  G.exitCarGame = () => {
    if (G.mode !== 'car') return;
    G.mode = 'free';
    G.hideToast();
    document.body.classList.remove('game-car');
    G.particles = G.particles.filter((q) => !q.car);
    Object.assign(player, { x: clamp(cg.x, 0, G.docWidth() - player.w), y: cg.y - player.h, vy: -380, ground: null, wall: null });
    G.updateHud(true);
  };

  G.carPress = (k) => {
    if (k === 'act') { G.exitCarGame(); return; }
    if (k === 'restart' || ((k === 'jump' || k === 'up') && cg.over)) { resetCarGame(); return; }
    if (k === 'wave') { G.honk(); return; }
    if (cg.over || (k !== 'jump' && k !== 'up')) return;
    if (cg.ground) {
      cg.vy = -jumpPower(); cg.ground = false; cg.ramp = null; cg.jumps = 1; cg.tilt += 0.12;
      G.blip(330, 0.1, 'square', 1.6);
    } else if (G.owns('upgrade:doubleJump') && cg.jumps < 2) {
      cg.vy = -jumpPower() * 0.85; cg.jumps = 2; cg.tilt += 0.1;
      G.blip(440, 0.08, 'square', 1.5); G.burst(cg.x + cg.w / 2, cg.y + cg.h, 6, '#aaaaaa');
    }
  };

  /* ---------- obstacles ---------- */
  function addObstacle(def, x) {
    const frames = def.frames || 1;
    const pw = (def.img.width / frames) * S, ph = def.img.height * S;
    const o = { def, kind: def.kind || 'ground', x, pw, ph, frames, phase: Math.random() * 6 };
    // drones fly just above the roof of a car on the road: harmless on the road, dangerous in the air
    o.baseY = o.kind === 'air' ? cg.road - cg.h - (hb.y + 3) * S - ph : cg.road - ph;
    o.y = o.baseY;
    cg.obstacles.push(o);
    return o;
  }
  function spawnObstacles() {
    const all = G.carParts.obstacles;
    const ground = all.filter((o) => (o.kind || 'ground') === 'ground');
    const def = pickWeighted(all);
    const x = cg.right + 10;
    let extra = 0;
    if (def.kind === 'air' && ground.length) {
      // combo: jump over the ground obstacle, then slam down under the drone
      addObstacle(pickWeighted(ground), x);
      addObstacle(def, x + cg.speed * 0.45);
      extra = 0.5;
    } else {
      addObstacle(def, x);
      if (def.kind === 'ramp') extra = 0.9;     // room to land after the big jump
    }
    const gap = 0.75 + Math.random() * 0.9;
    cg.nextIn = gap * (CAR.speed / cg.speed) + 0.25 + extra;
  }

  /** while on a ramp the car follows its slope (rear and front wheel heights) */
  function rideRamps() {
    if (!cg.ground) return;
    const ws = CAR.wheelSize || 8, anchors = CAR.wheelAnchors || [[4, 8], [22, 8]];
    const rearX = spriteX() + (anchors[0][0] + ws / 2) * S;
    const frontX = spriteX() + (anchors[anchors.length - 1][0] + ws / 2) * S;
    const lift = (o, px) => clamp((px - o.x) / o.pw, 0, 1) * o.ph;
    const ramp = cg.obstacles.find((o) => o.kind === 'ramp' && frontX >= o.x && rearX <= o.x + o.pw);
    if (!ramp) {
      if (cg.ramp) cg.ramp = null;
      return;
    }
    if (frontX > ramp.x + ramp.pw) {         // front wheel left the ramp → launch!
      cg.ramp = null; cg.ground = false; cg.jumps = 1;
      cg.vy = -CAR.rampVelocity * (G.owns('upgrade:springs') ? 1.1 : 1);
      cg.tilt = Math.min(MAX_TILT, cg.tilt + 0.08);
      G.blip(260, 0.25, 'sawtooth', 2.2);
      G.burst(frontX, cg.road - ramp.ph, 8, '#cfcfcf');
      return;
    }
    cg.ramp = ramp;
    const rear = lift(ramp, rearX), front = lift(ramp, frontX);
    cg.y = cg.road - cg.h - rear;
    cg.tilt = Math.min(MAX_TILT, Math.atan2(front - rear, G.carWheelbase()));
  }

  G.updateCarGame = (dt) => {
    if (cg.over) return;
    cg.speed = Math.min(CAR.maxSpeed, cg.speed + CAR.speedUp * dt);
    const step = cg.speed * dt;
    cg.dist += step; cg.wheel += step; cg.scroll = (cg.scroll + step) % 64;
    cg.inv -= dt; cg.bounce -= dt;

    // jumping / falling (↓ = slam down)
    if (!cg.ground) {
      const slam = input.down && cg.vy < CAR.slamSpeed;
      cg.vy = slam ? CAR.slamSpeed : cg.vy + CAR.gravity * dt;
      cg.y += cg.vy * dt;
      // the car tilts back while going up and dips the nose when falling
      const want = cg.vy < 0 ? Math.min(MAX_TILT * 0.8, (-cg.vy / CAR.jumpVelocity) * 0.3) : -Math.min(0.2, (cg.vy / CAR.slamSpeed) * 0.25);
      cg.tilt += (want - cg.tilt) * Math.min(1, dt * 6);
      if (cg.y + cg.h >= cg.road) {
        const hard = cg.vy > 1000;
        cg.y = cg.road - cg.h; cg.vy = 0; cg.ground = true; cg.jumps = 0; cg.bounce = hard ? 0.16 : 0.1;
        G.burst(cg.x + cg.w / 2, cg.road, slam ? 10 : 4, '#9a9a9a');
        if (hard) G.blip(90, 0.12, 'square');
      }
    }

    // obstacles move left
    cg.nextIn -= dt;
    if (cg.nextIn <= 0 && G.carParts.obstacles.length) spawnObstacles();
    cg.obstacles.forEach((o) => {
      o.x -= step;
      if (o.kind === 'air') o.y = o.baseY + Math.sin(G.t * 6 + o.phase) * S;
    });
    cg.obstacles = cg.obstacles.filter((o) => o.x + o.pw > cg.left - 20);

    rideRamps();
    if (cg.ground && !cg.ramp) cg.tilt += (0 - cg.tilt) * Math.min(1, dt * 14);

    // exhaust: leaves the pipe and stays behind (does not follow the car)
    if (G.frame % 2 === 0) {
      const [ex, ey] = G.carPoint(spriteX(), spriteY(), EXHAUST[0], EXHAUST[1], cg.tilt);
      const life = 0.35 + Math.random() * 0.25;
      G.particles.push({
        car: true, x: ex - S, y: ey - S / 2, vx: -cg.speed * 0.55 - 30 - Math.random() * 50, vy: -20 - Math.random() * 40,
        g: -60, life, max: life, fade: true, s: Math.random() < 0.4 ? S * 2 : S, c: 'rgba(175,175,175,.8)',
      });
    }
    collide();
  };

  function collide() {
    const pad = 6;
    for (const o of cg.obstacles) {
      if (o.kind === 'ramp') continue;
      const hit = cg.x + pad < o.x + o.pw - pad && cg.x + cg.w - pad > o.x + pad && cg.y + pad < o.y + o.ph && cg.y + cg.h - pad > o.y + pad;
      if (!hit || cg.inv > 0) continue;
      if (cg.shield) {
        cg.shield = false; cg.inv = 1.2; o.x = -9999;
        G.burst(cg.x + cg.w, cg.y + cg.h / 2, 16, '#6fc3ff'); G.blip(200, 0.2, 'square', 0.5);
        continue;
      }
      crash();
      return;
    }
  }

  function crash() {
    cg.over = true;
    const score = G.carScore();
    const best = store.get('maipa-car-best', 0);
    const record = score > best;
    if (record) store.set('maipa-car-best', score);
    G.burst(cg.x + cg.w, cg.y + cg.h / 2, 24, '#ffb347');
    G.blip(110, 0.35, 'sawtooth', 0.4);
    // stays until restart / getting out (hideToast in resetCarGame / exitCarGame)
    G.showToast(`${fill(G.T().carOver, { score })}${record ? `  ${G.T().newRecord}` : ''}`, Infinity);
    G.updateHud(true);
  }

  G.carCamera = (dt) => G.scrollToward((cg.top + cg.bottom) / 2, dt, 6);

  /* ---------- drawing ---------- */
  G.drawCarGame = (ox, oy) => {
    const W = innerWidth;
    const top = cg.top - oy, road = cg.road - oy;
    // road + shade for contrast
    ctx.fillStyle = 'rgba(10,10,10,.78)'; ctx.fillRect(0, road, W, cg.bottom - cg.road);
    ctx.fillStyle = '#d11717'; ctx.fillRect(0, road, W, S);
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    for (let x = -cg.scroll; x < W; x += 64) ctx.fillRect(Math.round(x), road + 14, 32, S);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, top, W, road - top);

    for (const o of cg.obstacles) {
      const fr = o.frames > 1 ? Math.floor(G.t * (o.def.fps || 8)) % o.frames : 0;
      G.drawSpriteFrame(o.def.img, fr, o.def.img.width / o.frames, o.def.img.height, Math.round(o.x - ox), Math.round(o.y - oy));
    }

    const { body, wheels } = G.carEquip();
    const blink = cg.inv > 0 && Math.floor(G.t * 12) % 2 === 0;
    ctx.globalAlpha = blink ? 0.4 : 1;
    G.drawCar(ctx, Math.round(spriteX() - ox), Math.round(spriteY() - oy), {
      body, wheels, wheelPos: cg.wheel, tilt: cg.tilt, bodyDy: cg.bounce > 0 ? S : 0,
    });
    ctx.globalAlpha = 1;
    if (cg.shield) {
      ctx.strokeStyle = 'rgba(111,195,255,.8)'; ctx.lineWidth = 2;
      ctx.strokeRect(Math.round(cg.x - ox) - 6, Math.round(cg.y - oy) - 6, cg.w + 12, cg.h + 12);
    }
  };
}
