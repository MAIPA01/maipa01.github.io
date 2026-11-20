/* =========================================================
   Every playable character waving (sprite sheets from
   data/characters.json → "game", animation "wave" from data/game.json).
   ========================================================= */
const images = new Map();
const load = (src) => {
  if (!images.has(src)) images.set(src, new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }));
  return images.get(src);
};

/** animates every <canvas data-char-index> inside root; returns stop() */
export function startWaving(root, characters, player = {}) {
  let raf = 0;
  const start = performance.now();
  const canvases = [...root.querySelectorAll('canvas[data-char-index]')];
  const draw = async (now) => {
    const time = (now - start) / 1000;
    await Promise.all(canvases.map(async (cv, n) => {
      const c = characters[+cv.dataset.charIndex];
      const img = c && await load(c.sprite);
      if (!img) return;
      const g = c.game || {};
      const fw = g.frameWidth || player.frameWidth || 16, fh = g.frameHeight || player.frameHeight || 16;
      const anims = { ...(player.animations || {}), ...(g.animations || {}) };
      const wave = anims.wave || anims.idle || { frames: [0], fps: 2 };
      // everyone waves, slightly out of sync
      const fr = wave.frames[Math.floor((time + n * 0.17) * (wave.fps || 4)) % wave.frames.length];
      const cols = Math.max(1, Math.floor(img.width / fw));
      if (cv.width !== fw) { cv.width = fw; cv.height = fh; }
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, fw, fh);
      ctx.drawImage(img, (fr % cols) * fw, Math.floor(fr / cols) * fh, fw, fh, 0, 0, fw, fh);
    }));
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(raf);
}
