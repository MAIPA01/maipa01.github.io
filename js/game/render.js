/* =========================================================
   Drawing on the full-screen canvas. World coordinates are page
   coordinates; the canvas is fixed, so everything is drawn shifted
   by the scroll position (ox, oy).
   ========================================================= */
export function installRender(G) {
  const { ui, S, player: p } = G;
  const ctx = ui.ctx;

  /** draws frame "fr" of a sprite sheet (frames left→right, then next row) */
  G.drawSpriteFrame = (img, fr, fw, fh, dx, dy, flip = false, scale = S, c = ctx) => {
    const cols = Math.max(1, Math.floor(img.width / fw));
    const sx = (fr % cols) * fw, sy = Math.floor(fr / cols) * fh;
    if (!flip) { c.drawImage(img, sx, sy, fw, fh, dx, dy, fw * scale, fh * scale); return; }
    c.save();
    c.translate(dx + fw * scale, dy); c.scale(-1, 1);
    c.drawImage(img, sx, sy, fw, fh, 0, 0, fw * scale, fh * scale);
    c.restore();
  };

  function drawCoins(ox, oy) {
    const { C } = G, cw = G.coinW(), ch = G.coinH(), H = innerHeight;
    const frames = C.frames || [0];
    const cf = frames[Math.floor(G.t * (C.fps || 8)) % frames.length];
    for (const c of G.coins) {
      if (c.taken || !c.alive) continue;
      const x = Math.round(c.x - ox), y = Math.round(c.y - oy + Math.sin(G.t * 3 + c.phase) * 4);
      if (y < -40 || y > H + 40) continue;
      if (G.coinImg) ctx.drawImage(G.coinImg, cf * cw, 0, cw, ch, x, y, cw * S, ch * S);
      else { ctx.fillStyle = '#d11717'; ctx.fillRect(x, y, cw * S, ch * S); }
    }
  }

  function drawParticles(ox, oy) {
    for (const q of G.particles) {
      ctx.globalAlpha = q.fade ? Math.max(0, q.life / q.max) : 1;
      ctx.fillStyle = q.c || '#d11717';
      ctx.fillRect(Math.round(q.x - ox), Math.round(q.y - oy), q.s, q.s);
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer(ox, oy) {
    const look = G.look;
    if (!look) return;
    const a = look.anims[p.anim] || look.anims.idle || { frames: [0], fps: 1 };
    const fr = a.frames[Math.floor(p.animT * (a.fps || 1)) % a.frames.length];
    const dx = Math.round(p.x - ox - look.hb.x * S), dy = Math.round(p.y - oy - look.hb.y * S);
    if (p.ground) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(Math.round(p.x - ox) + 3, Math.round(p.y - oy + p.h) - 2, p.w - 6, 3); }
    const tired = p.wall && p.stamina < 1 && Math.floor(G.t * 10) % 2 === 0;   // blinking = no stamina
    ctx.globalAlpha = tired ? 0.45 : 1;
    if (look.img) G.drawSpriteFrame(look.img, fr, look.fw, look.fh, dx, dy, p.facing < 0);
    else { ctx.fillStyle = '#d11717'; ctx.fillRect(Math.round(p.x - ox), Math.round(p.y - oy), p.w, p.h); }
    ctx.globalAlpha = 1;
  }

  G.draw = () => {
    const ox = scrollX, oy = scrollY;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    if (G.mode === 'challenge') drawCoins(ox, oy);
    if (G.mode === 'car') G.drawCarGame(ox, oy);
    drawParticles(ox, oy);
    if (G.mode !== 'car') {
      drawPlayer(ox, oy);
      G.positionBubble(p.x - ox + p.w / 2, p.y - oy - 10);
    }
  };
}
