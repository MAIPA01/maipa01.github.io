/* =========================================================
   The level is the page itself: elements matching "platforms"
   (data/game.json) become platforms, "coinsOn" elements get a coin
   above them during a challenge. Re-scanned regularly because the
   page can change (images loading, filters, language…).
   ========================================================= */
export function installLevel(G) {
  const { S } = G;

  /** element → rectangle in page coordinates (null when not visible) */
  G.rectOf = (node) => {
    const r = node.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
  };

  G.scanPlatforms = () => {
    G.platforms = []; G.walls = [];
    document.querySelectorAll(G.platformSel).forEach((node) => {
      if (node.closest('[hidden]')) return;
      const r = G.rectOf(node);
      if (!r) return;
      G.platforms.push({ x: r.x, y: Math.round(r.y), w: r.w, h: r.h, el: node });
      if (G.phys.elementWalls && r.h >= 28) {
        G.walls.push({ x: r.x, side: 1, top: r.y, bottom: r.y + r.h, el: node });
        G.walls.push({ x: r.x + r.w, side: -1, top: r.y, bottom: r.y + r.h, el: node });
      }
    });
    // the bottom of the document is the floor
    G.platforms.push({ x: -1e5, y: document.documentElement.scrollHeight, w: 2e5, h: 0, el: document.documentElement });
    const cw = G.coinW(), ch = G.coinH();
    G.coins.forEach((c) => {
      const r = G.rectOf(c.el);
      c.alive = !!r && !c.el.closest('[hidden], .is-hidden');
      if (r) { c.x = r.x + r.w / 2 - (cw * S) / 2; c.y = r.y - ch * S - 18; }
    });
    if (G.mode === 'car') G.layoutCarGame();
  };

  G.coinW = () => G.C.frameWidth || 8;
  G.coinH = () => G.C.frameHeight || 8;
  G.buildCoins = () => {
    G.coins = [];
    if (!G.coinSel) return;
    document.querySelectorAll(G.coinSel).forEach((node) => G.coins.push({ el: node, x: 0, y: 0, taken: false, alive: true, phase: Math.random() * 6 }));
  };
  G.platformOf = (el) => G.platforms.find((q) => q.el === el);
}
