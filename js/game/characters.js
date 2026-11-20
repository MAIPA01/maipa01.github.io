/* =========================================================
   Playable characters (data/characters.json → "game") and the
   character picker (C). Each character has its own sprite sheet;
   frame size, hitbox and animations can be overridden per character.
   ========================================================= */
import { loadImageOrNull, store, escapeHTML } from './util.js';

export function installCharacters(G) {
  const { S, PL, ui, player } = G;
  const characters = () => (G.opts.characters ? G.opts.characters() : []);
  const spriteCache = new Map();
  const spriteFor = (c) => {
    if (!c) return Promise.resolve(null);
    if (!spriteCache.has(c.sprite)) spriteCache.set(c.sprite, loadImageOrNull(c.sprite));
    return spriteCache.get(c.sprite);
  };
  G.characters = characters;
  G.look = null;           // { img, fw, fh, hb, anims } of the current character
  G.charId = store.get('maipa-char');

  G.setCharacter = async (id, { announce = false, save = true } = {}) => {
    const list = characters();
    const c = list.find((x) => x.id === id) || list.find((x) => x.id === G.cfg.defaultCharacter) || list[0];
    const g = c?.game || {};
    const img = await spriteFor(c);
    const fw = g.frameWidth || PL.frameWidth || 16, fh = g.frameHeight || PL.frameHeight || 16;
    G.look = {
      img, fw, fh,
      hb: { x: 0, y: 0, w: fw, h: fh, ...(PL.hitbox || {}), ...(g.hitbox || {}) },
      anims: { ...(PL.animations || { idle: { frames: [0], fps: 1 } }), ...(g.animations || {}) },
    };
    const oldBottom = player.y + player.h;
    player.w = G.look.hb.w * S; player.h = G.look.hb.h * S;
    player.y = oldBottom - player.h;
    if (!c) return;
    G.charId = c.id;
    if (save) store.set('maipa-char', c.id);
    document.querySelectorAll('.mini-sprite').forEach((n) => { n.style.backgroundImage = `url("${c.sprite}")`; });
    if (announce) {
      G.showToast(c.name, 2);
      G.burst(player.x + player.w / 2, player.y + player.h / 2, 12);
      G.blip(660, 0.08, 'square', 1.5);
    }
  };

  /* ---------- picker (C) ---------- */
  let pickIndex = 0, pickTimer = 0;
  G.openPicker = () => {
    const list = characters();
    if (list.length < 2) { G.showToast(list[0]?.name || '', 2); return; }
    G.menu = 'picker'; pickTimer = 0;
    pickIndex = Math.max(0, list.findIndex((c) => c.id === G.charId));
    G.releaseAll();
    const tx = G.T();
    ui.picker.innerHTML = `<div class="game-picker-box" role="dialog" aria-label="${escapeHTML(tx.pick)}">
      <h2>${escapeHTML(tx.pick)}</h2>
      <div class="game-picker-list">${list.map((c, i) => `<button type="button" class="game-picker-item" data-i="${i}" aria-pressed="${i === pickIndex}">
        <canvas width="16" height="16"></canvas>${escapeHTML(c.name)}</button>`).join('')}</div>
      <small>${escapeHTML(tx.pickHint)}</small></div>`;
    ui.picker.hidden = false;
    ui.picker.querySelectorAll('.game-picker-item').forEach((b) => b.addEventListener('click', () => { pickIndex = +b.dataset.i; confirm(); }));
    list.forEach(spriteFor);
  };
  G.closePicker = () => { if (G.menu === 'picker') G.menu = null; ui.picker.hidden = true; ui.picker.innerHTML = ''; };
  const confirm = () => { const c = characters()[pickIndex]; G.closePicker(); if (c) G.setCharacter(c.id, { announce: true }); };

  G.pickerKey = (k) => {
    const n = characters().length;
    if (k === 'left' || k === 'up') pickIndex = (pickIndex - 1 + n) % n;
    if (k === 'right' || k === 'down') pickIndex = (pickIndex + 1) % n;
    if (k === 'act' || k === 'jump') { confirm(); return; }
    if (k === 'pick' || k === 'quit') { G.closePicker(); return; }
    ui.picker.querySelectorAll('.game-picker-item').forEach((b, i) => b.setAttribute('aria-pressed', String(i === pickIndex)));
  };

  /** animates the small previews: idle, the selected one waves */
  G.drawPicker = (dt) => {
    pickTimer += dt;
    const list = characters();
    const idle = PL.animations?.idle || { frames: [0], fps: 2 };
    ui.picker.querySelectorAll('canvas').forEach((cv, i) => {
      const c = list[i];
      spriteFor(c).then((img) => {
        if (!img) return;
        const fw = c.game?.frameWidth || PL.frameWidth || 16, fh = c.game?.frameHeight || PL.frameHeight || 16;
        const anims = { ...(PL.animations || {}), ...(c.game?.animations || {}) };
        const anim = (i === pickIndex && anims.wave) || anims.idle || idle;
        const fr = anim.frames[Math.floor(pickTimer * (anim.fps || 2)) % anim.frames.length];
        const cols = Math.max(1, Math.floor(img.width / fw));
        cv.width = fw; cv.height = fh;
        const g = cv.getContext('2d');
        g.imageSmoothingEnabled = false;
        g.drawImage(img, (fr % cols) * fw, Math.floor(fr / cols) * fh, fw, fh, 0, 0, fw, fh);
      });
    });
  };
}
