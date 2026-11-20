/* =========================================================
   GARAGE (G) — spend the coins from completed challenges on
   car bodies, wheels and tuning (data/game.json → car).
   Prices: weight / sum of all weights × all coins that can be
   earned on every level, so buying everything costs exactly
   what the whole portfolio pays. Items with weight 0 are free.
   ========================================================= */
import { escapeHTML, fill } from '../util.js';

export function installGarage(G) {
  const { ui } = G;
  let index = 0;

  G.shopItems = () => {
    const { bodies, wheels, upgrades } = G.carParts;
    const items = [
      ...bodies.map((b) => ({ id: `body:${b.id}`, kind: 'body', part: b, weight: b.weight ?? 1 })),
      ...wheels.map((w) => ({ id: `wheels:${w.id}`, kind: 'wheels', part: w, weight: w.weight ?? 1 })),
      ...upgrades.map((u) => ({ id: `upgrade:${u.id}`, kind: 'upgrade', part: u, weight: u.weight ?? 1 })),
    ];
    const total = G.totalCoins();
    const sum = items.reduce((a, i) => a + i.weight, 0) || 1;
    const paid = items.filter((i) => i.weight > 0);
    let assigned = 0;
    paid.forEach((i, n) => {
      // the last one gets the rest → the sum is exact
      i.price = n === paid.length - 1 ? Math.max(0, total - assigned) : Math.floor((i.weight / sum) * total);
      assigned += i.price;
    });
    items.forEach((i) => { i.price ??= 0; });
    return items;
  };

  G.openGarage = () => {
    if (G.mode !== 'free') { G.showToast(G.T().garageBusy, 2.5); return; }
    if (!G.carReady()) return;
    G.menu = 'garage';
    G.releaseAll();
    index = 0;
    render();
    ui.garage.hidden = false;
  };
  G.closeGarage = () => { if (G.menu === 'garage') G.menu = null; ui.garage.hidden = true; ui.garage.innerHTML = ''; };

  const isEquipped = (it, eq) => (it.kind === 'body' && eq.body?.id === it.part.id) || (it.kind === 'wheels' && eq.wheels?.id === it.part.id);

  function render() {
    const tx = G.T(), p = G.progress(), items = G.shopItems(), eq = G.carEquip();
    const row = (it, i) => {
      const own = p.owned.includes(it.id) || it.price === 0;
      const equipped = isEquipped(it, eq);
      const label = equipped ? tx.equipped : own ? (it.kind === 'upgrade' ? tx.owned : tx.equip) : `${it.price}`;
      const preview = it.kind === 'upgrade'
        ? `<img class="up-icon" src="${escapeHTML(it.part.icon)}" alt="" width="16" height="16">`
        : `<canvas width="32" height="16" data-kind="${it.kind}" data-id="${escapeHTML(it.part.id)}"></canvas>`;
      return `<button type="button" class="game-garage-item${own ? ' owned' : ''}${equipped ? ' equipped' : ''}${!own && p.wallet < it.price ? ' cant' : ''}" data-i="${i}" aria-pressed="${i === index}">
        ${preview}
        <span>${escapeHTML(G.tr(it.part.name) || it.part.id)}${it.part.description ? `<small>${escapeHTML(G.tr(it.part.description))}</small>` : ''}</span>
        <span class="price">${escapeHTML(label)}</span></button>`;
    };
    const section = (kind, title) => {
      const html = items.map((it, i) => (it.kind === kind ? row(it, i) : '')).join('');
      return html ? `<h3>${escapeHTML(title)}</h3><div class="game-garage-list">${html}</div>` : '';
    };
    ui.garage.innerHTML = `<div class="game-garage-box" role="dialog" aria-label="${escapeHTML(tx.garage)}">
      <h2>${escapeHTML(tx.garage)}</h2>
      <div class="wallet"><i></i>${escapeHTML(fill(tx.wallet, { coins: p.wallet, total: G.totalCoins() }))}</div>
      ${section('body', tx.garageBodies)}${section('wheels', tx.garageWheels)}${section('upgrade', tx.garageUpgrades)}
      <small class="hint">${escapeHTML(tx.garageHint)}</small></div>`;

    // previews: a body with your wheels / your body with these wheels
    ui.garage.querySelectorAll('canvas[data-kind]').forEach((cv) => {
      const c = cv.getContext('2d');
      c.imageSmoothingEnabled = false;
      const body = cv.dataset.kind === 'body' ? G.carParts.bodies.find((b) => b.id === cv.dataset.id) : eq.body;
      const wheels = cv.dataset.kind === 'wheels' ? G.carParts.wheels.find((w) => w.id === cv.dataset.id) : eq.wheels;
      G.drawCar(c, 0, 0, { body, wheels, scale: 1 });
    });
    ui.garage.querySelectorAll('.game-garage-item').forEach((b) => b.addEventListener('click', () => { index = +b.dataset.i; buyOrEquip(); }));
  }

  function buyOrEquip() {
    const tx = G.T(), p = G.progress(), it = G.shopItems()[index];
    if (!it) return;
    const own = p.owned.includes(it.id) || it.price === 0;
    if (!own) {
      if (p.wallet < it.price) { G.errorSound(); G.showToast(fill(tx.notEnough, { coins: it.price - p.wallet }), 2.5); return; }
      p.wallet -= it.price; p.owned.push(it.id);
      G.coinSound();
    }
    if (it.kind === 'body') p.equip.body = it.part.id;
    if (it.kind === 'wheels') p.equip.wheels = it.part.id;
    G.saveProgress(p);
    render();
    G.updateHud(true);
  }

  G.garageKey = (k) => {
    const n = G.shopItems().length;
    if (k === 'up' || k === 'left') index = (index - 1 + n) % n;
    if (k === 'down' || k === 'right') index = (index + 1) % n;
    if (k === 'act' || k === 'jump') { buyOrEquip(); return; }
    if (k === 'garage' || k === 'quit') { G.closeGarage(); return; }
    ui.garage.querySelectorAll('.game-garage-item').forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
    ui.garage.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest' });
  };
}
