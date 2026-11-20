/* =========================================================
   Platformer physics helpers. A "body" is any object with
   x, y, w, h, vy, ground (the element it stands on).
   Platforms are one-way: you land on them from above and can
   jump through them from below.
   ========================================================= */
export function installPhysics(G) {
  /** lands the body on the highest platform crossed since prevBottom */
  G.landCheck = (b, prevBottom, ignoreEl) => {
    const bottom = b.y + b.h;
    let hit = null;
    for (const q of G.platforms) {
      if (q.el === ignoreEl) continue;
      if (b.x + b.w <= q.x + 2 || b.x >= q.x + q.w - 2) continue;
      if (prevBottom <= q.y + 1 && bottom >= q.y && (!hit || q.y < hit.y)) hit = q;
    }
    if (hit) { b.y = hit.y - b.h; b.vy = 0; b.ground = hit.el; }
    return hit;
  };

  /** gravity + landing; ignoreEl = platform we are dropping through (↓) */
  G.fall = (b, dt, ignoreEl) => {
    const prevBottom = b.y + b.h;
    b.vy = Math.min(b.vy + G.phys.gravity * dt, G.phys.maxFallSpeed);
    b.y += b.vy * dt;
    const hit = b.vy >= 0 ? G.landCheck(b, prevBottom, ignoreEl) : null;
    if (b.y < 0) { b.y = 0; b.vy = Math.max(0, b.vy); }
    return hit;
  };

  /** keeps the body on its platform (platforms move when the page reflows) */
  G.stick = (b) => {
    const q = G.platformOf(b.ground);
    if (!q || b.x + b.w < q.x + 2 || b.x > q.x + q.w - 2) { b.ground = null; return false; }
    b.y = q.y - b.h; b.vy = 0;
    return true;
  };

  /** first wall crossed while moving from prevX to b.x (only with physics.elementWalls) */
  G.crossWall = (b, prevX) => {
    let best = null;
    const right = b.x > prevX, left = b.x < prevX;
    if (!right && !left) return null;
    for (const w of G.walls) {
      if (b.y + b.h <= w.top + 6 || b.y >= w.bottom - 6) continue;
      if (right && w.side === 1 && prevX + b.w <= w.x + 0.5 && b.x + b.w > w.x && (!best || w.x < best.x)) best = w;
      if (left && w.side === -1 && prevX >= w.x - 0.5 && b.x < w.x && (!best || w.x > best.x)) best = w;
    }
    return best;
  };
}
