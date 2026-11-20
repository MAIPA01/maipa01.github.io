/* =========================================================
   CHALLENGE (T): coins appear above cards/blocks, the timer starts
   on the first move. Collect all = level completed: best time,
   coins for the garage and the next level unlocked. When the last
   level is done the finale page (finale.html) is unlocked.
   ========================================================= */
import { fill, fmtTime, store } from './util.js';

export function installChallenge(G) {
  const { run, player, S } = G;

  /** starts the timer on the first movement */
  G.markRun = () => { if (G.mode === 'challenge' && !run.start && !run.done) run.start = performance.now(); };

  const endChallenge = () => {
    G.mode = 'free'; G.coins = [];
    document.body.classList.remove('game-challenge');
    G.applyLocks(); G.updateHud(true);
  };

  G.startChallenge = (restart = false) => {
    const tx = G.T();
    if (G.mode === 'car') return;
    if (!G.isLevel()) { G.showToast(tx.noChallenge, 3); return; }
    if (!G.isUnlocked(G.pageKey)) { G.showToast(fill(tx.locked, { level: G.previousLevel(G.pageKey)?.title || '' }), 3.5); return; }
    G.mode = 'challenge';
    document.body.classList.add('game-challenge');
    document.dispatchEvent(new Event('game:challenge'));   // pages show hidden content (filters, …)
    requestAnimationFrame(() => {
      G.buildCoins(); G.scanPlatforms();
      run.start = null; run.time = 0; run.done = false;
      G.spawn({ top: true });
      G.updateHud(true);
      G.showToast(restart ? tx.challengeRestart : tx.challengeStart, 4);
      G.blip(520, 0.1, 'square', 2);
    });
  };

  /** the page was re-rendered (e.g. language change) — coins point to old elements */
  G.abortChallenge = () => {
    if (G.mode !== 'challenge') return;
    endChallenge();
    G.showToast(G.T().challengeAborted, 2.5);
  };

  G.updateChallenge = () => {
    const cw = G.coinW() * S, ch = G.coinH() * S;
    for (const c of G.coins) {
      if (c.taken || !c.alive) continue;
      const cy = c.y + Math.sin(G.t * 3 + c.phase) * 4;
      if (player.x < c.x + cw && player.x + player.w > c.x && player.y < cy + ch && player.y + player.h > cy) {
        c.taken = true; G.markRun();
        G.coinSound();
        G.burst(c.x + cw / 2, cy + ch / 2, 10);
        G.updateHud(true);
      }
    }
    if (run.start && !run.done) run.time = (performance.now() - run.start) / 1000;
    const total = G.coins.filter((c) => c.alive || c.taken).length;
    const got = G.coins.filter((c) => c.taken).length;
    if (total && got === total && !run.done) complete();
  };

  function complete() {
    const tx = G.T();
    run.done = true;
    const bestKey = `maipa-best:${G.pageKey}`;
    const best = store.get(bestKey);
    const record = !best || run.time < best;
    if (record) store.set(bestKey, run.time);

    const p = G.progress();
    let reward = 0;
    if (!p.done[G.pageKey]) {
      reward = G.levels()[G.levelIndex(G.pageKey)]?.coins || 0;
      p.wallet += reward;
      p.done[G.pageKey] = true;
      G.saveProgress(p);
    }
    const next = G.levels()[G.levelIndex(G.pageKey) + 1];
    const finished = reward > 0 && G.isPortfolioComplete();
    const parts = [fill(tx.won, { time: fmtTime(run.time) })];
    if (record) parts.push(tx.newRecord);
    if (reward) parts.push(fill(tx.reward, { coins: reward }));
    if (next && reward) parts.push(fill(tx.unlocked, { level: next.title }));
    if (finished) parts.push(tx.allDone);
    G.showToast(parts.join('  '), finished ? 6 : 10);

    player.emote = 3;
    for (let i = 0; i < 6; i++) {
      setTimeout(() => { G.burst(scrollX + Math.random() * innerWidth, scrollY + innerHeight * 0.3, 18); G.blip(523 * (1 + i / 6), 0.1); }, i * 140);
    }
    setTimeout(() => { if (G.mode === 'challenge' && run.done) endChallenge(); }, 3500);
    // last level done → the finale page
    if (finished) setTimeout(() => { if (G.active) location.href = 'finale.html'; }, 4200);
    G.applyLocks();
    G.updateHud(true);
  }
}
