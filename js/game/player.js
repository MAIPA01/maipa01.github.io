/* =========================================================
   The player character: running, jumping (+ double jump),
   dropping through platforms (↓), grabbing the page edges and
   climbing like in Celeste (stamina), animations and camera.
   ========================================================= */
import { clamp, session } from './util.js';

export function installPlayer(G) {
  const { phys, input, player: p, S } = G;

  /** puts the player at the top of the page, or above the card we came from */
  G.spawn = ({ top = false } = {}) => {
    const navH = document.querySelector('.site-nav')?.offsetHeight || 0;
    const sp = session.get('maipa-spawn');
    let target = null;
    if (!top && sp && sp.page === G.pageKey) { target = document.querySelector(sp.sel); session.remove('maipa-spawn'); }
    const r = target && G.rectOf(target);
    if (r) {
      window.scrollTo({ top: Math.max(0, r.y - innerHeight * 0.45), behavior: 'instant' });
      p.x = clamp(r.x + r.w / 2 - p.w / 2, 0, G.docWidth() - p.w);
      p.y = r.y - p.h - 120;
    } else {
      if (top) window.scrollTo({ top: 0, behavior: 'instant' });
      p.x = clamp(innerWidth * 0.5 - p.w / 2, 10, innerWidth - p.w - 10);
      p.y = (top ? 0 : scrollY) + navH + 30;
    }
    Object.assign(p, { vx: 0, vy: 0, ground: null, jumps: 0, wall: null, stamina: phys.climbStamina, emote: 0 });
    G.burst(p.x + p.w / 2, p.y + p.h / 2, 14);
  };

  /** ↓ on a platform: fall through it */
  G.dropDown = () => {
    if (!p.ground || p.ground === document.documentElement) return;
    G.dropEl = p.ground; G.dropTimer = 0.25; p.ground = null; p.vy = 60;
  };

  G.updatePlayer = (dt) => {
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    p.lockT -= dt;
    if (p.emote > 0) p.emote = (dir || !p.ground || G.jumpBuffer > 0) ? 0 : p.emote - dt;
    if (p.ground) p.stamina = phys.climbStamina;

    if (p.wall && updateWall(dt, dir)) { animate(dt); return; }

    // horizontal movement (a short lock after a wall jump)
    const effDir = p.lockT > 0 ? Math.sign(p.vx) : dir;
    const accel = p.lockT > 0 ? 3 : p.ground ? 18 : 9;
    p.vx += (effDir * phys.moveSpeed - p.vx) * Math.min(1, accel * dt);
    if (dir && p.lockT <= 0) p.facing = dir;
    const prevX = p.x;
    p.x += p.vx * dt;
    const hit = G.crossWall(p, prevX);
    if (hit) {
      p.x = hit.side > 0 ? hit.x - p.w : hit.x; p.vx = 0;
      if (!p.ground && dir === hit.side) grabWall(hit);
    }
    // the page edges are climbable walls
    const W = G.docWidth();
    if (p.x <= 0) { p.x = 0; if (!p.ground && dir < 0 && !p.wall) grabWall({ x: 0, side: -1, el: null }); }
    if (p.x + p.w >= W) { p.x = W - p.w; if (!p.ground && dir > 0 && !p.wall) grabWall({ x: W, side: 1, el: null }); }
    if (p.wall) { animate(dt); return; }

    if (p.ground && !G.stick(p)) G.coyote = 0.1;

    if (G.jumpBuffer > 0) {
      if (p.ground || G.coyote > 0) {
        p.vy = -phys.jumpVelocity; p.ground = null; G.coyote = 0; G.jumpBuffer = 0; p.jumps = 1;
        G.blip(520, 0.09, 'square', 1.6); G.burst(p.x + p.w / 2, p.y + p.h, 5);
      } else if (phys.doubleJump && p.jumps < 2) {
        p.vy = -phys.jumpVelocity * 0.85; G.jumpBuffer = 0; p.jumps = 2;
        G.blip(700, 0.08, 'square', 1.5); G.burst(p.x + p.w / 2, p.y + p.h, 8);
      }
    }
    if (!p.ground) {
      const vyBefore = p.vy;
      const landed = G.fall(p, dt, G.dropEl);
      if (landed) { p.jumps = 0; if (vyBefore > 500) G.burst(p.x + p.w / 2, landed.y, 4); }
    }
    animate(dt);
  };

  function grabWall(w) {
    p.wall = { top: -1e9, bottom: 1e9, ...w }; p.jumps = 1; p.ground = null;
    p.vy = p.vy < 0 ? p.vy * 0.4 : p.vy * 0.2;
  }

  /** returns true while the player is still on the wall */
  function updateWall(dt, dir) {
    const w = p.wall;
    if (w.el) {
      const q = G.platformOf(w.el);
      if (!q) { p.wall = null; return false; }
      w.x = w.side > 0 ? q.x : q.x + q.w; w.top = q.y; w.bottom = q.y + q.h;
    } else {
      w.x = w.side > 0 ? G.docWidth() : 0;
    }
    // wall jump
    if (G.jumpBuffer > 0) {
      p.vy = -phys.jumpVelocity * 0.92; p.vx = -w.side * phys.wallJumpPush; p.facing = -w.side;
      p.lockT = 0.16; p.wall = null; p.jumps = 1; G.jumpBuffer = 0;
      G.blip(600, 0.08, 'square', 1.4); G.burst(p.x + (w.side > 0 ? p.w : 0), p.y + p.h / 2, 6);
      return false;
    }
    if (dir !== w.side && !input.up && !input.down) { p.wall = null; return false; }
    // climb / slide (stamina runs out → you slide faster)
    p.climbing = input.up && p.stamina > 0;
    if (p.climbing) { p.vy = -phys.climbSpeed; p.stamina -= dt; }
    else if (input.down) p.vy = phys.wallSlideSpeed * 2.5;
    else { p.vy = p.stamina > 0 ? phys.wallSlideSpeed : phys.wallSlideSpeed * 2; p.stamina -= dt * 0.15; }
    const prevBottom = p.y + p.h;
    p.y += p.vy * dt;
    p.x = w.side > 0 ? w.x - p.w : w.x; p.vx = 0; p.facing = w.side;
    // climbed over the top of an element
    if (w.el && p.y + p.h * 0.55 < w.top) {
      p.y = w.top - p.h; p.x = clamp(p.x + w.side * p.w * 0.7, 0, G.docWidth() - p.w);
      p.ground = w.el; p.wall = null; p.vy = 0; p.jumps = 0;
      G.burst(p.x + p.w / 2, w.top, 5); G.blip(500, 0.06);
      return true;
    }
    if (w.el && p.y + p.h * 0.3 > w.bottom) { p.wall = null; return false; }
    if (p.vy > 0 && G.landCheck(p, prevBottom, null)) { p.wall = null; p.jumps = 0; return true; }
    if (p.y < 0) p.y = 0;
    if (G.frame % 6 === 0 && p.vy > 0) G.particles.push({ x: p.x + (w.side > 0 ? p.w : 0), y: p.y + p.h * 0.7, vx: 0, vy: -20, life: 0.25, s: S, g: 0, c: '#bbbbbb' });
    return true;
  }

  function animate(dt) {
    let next;
    if (p.wall) next = p.climbing ? 'climb' : 'wallslide';
    else if (!p.ground) next = p.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(p.vx) > 30) next = 'run';
    else if (p.emote > 0) next = 'wave';
    else next = 'idle';
    if (!G.look?.anims[next]) next = p.wall ? 'fall' : 'idle';
    if (next !== p.anim) { p.anim = next; p.animT = 0; } else p.animT += dt;
  }

  /** the page scrolls to follow the player */
  G.camera = (dt) => G.scrollToward(p.y + p.h / 2, dt, 7);
  G.scrollToward = (centerY, dt, speed) => {
    const want = clamp(centerY - innerHeight * 0.5, 0, document.documentElement.scrollHeight - innerHeight);
    const diff = want - scrollY;
    if (Math.abs(diff) > 1) window.scrollTo({ top: scrollY + diff * Math.min(1, dt * speed), behavior: 'instant' });
  };
}
