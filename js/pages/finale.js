/* =========================================================
   FINALE page (finale.html) — "Portfolio completed!"
   Unlocked after completing the challenge on every level of the play mode
   (then a link appears in the footer of every page). Without that → 404.

   Preview without playing everything:
     - http://localhost:8000/finale.html?preview   (works only on localhost)
     - or in the console (F12): maipa.completeAll()  → open finale.html
       and maipa.resetProgress() to start over.
   ========================================================= */
import { bootPage, $, esc, t, store, icon, isPortfolioComplete, levelList, playableCharacters } from '../core/index.js';
import { startFireworks } from './finale/fireworks.js';
import { startWaving } from './finale/wave.js';

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]', ''];
const previewAllowed = () => new URLSearchParams(location.search).has('preview')
  && (LOCAL_HOSTS.includes(location.hostname) || location.hostname.endsWith('.local'));

const fmtTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`;

/** "Congratulations!" → one <span> per letter (they drop in one by one, then wave) */
const animatedTitle = (text) => [...text].map((ch, i) => (ch === ' '
  ? '<span class="fl space"> </span>'
  : `<span class="fl" style="--i:${i}"><i>${esc(ch)}</i></span>`)).join('');

function stats(data) {
  const levels = levelList(data);
  const done = levels.filter((l) => store.get('maipa-progress', {})?.done?.[l.key]).length;
  const times = levels.map((l) => store.get(`maipa-best:${l.key}`)).filter((v) => typeof v === 'number');
  const coins = levels.reduce((a, l) => a + (l.coins || 0), 0);
  return [
    { value: `${done}/${levels.length}`, label: t('finale.levels') },
    { value: times.length ? fmtTime(times.reduce((a, b) => a + b, 0)) : '—', label: t('finale.time') },
    { value: coins, label: t('finale.coins') },
    { value: store.get('maipa-car-best', 0) || '—', label: t('finale.car') },
  ];
}

let stopFireworks = null, stopWaving = null;

function render(data) {
  const complete = isPortfolioComplete(data);
  const preview = !complete && previewAllowed();
  if (!complete && !preview) { location.replace('404.html'); return; }

  document.title = t('finale.pageTitle');
  const chars = playableCharacters();
  $('#main').innerHTML = `
    ${preview ? `<p class="finale-preview">${esc(t('finale.preview'))}</p>` : ''}
    <section class="finale-hero">
      <p class="pixel-label">&gt; portfolio.complete()_</p>
      <h1 class="finale-title" aria-label="${esc(t('finale.title'))}"><span aria-hidden="true">${animatedTitle(t('finale.title'))}</span></h1>
      <p class="finale-subtitle">${esc(t('finale.subtitle'))}</p>
      <div class="finale-chars">
        ${chars.map((c, i) => `<figure class="finale-char" style="--i:${i}">
          <canvas data-char-index="${i}" width="16" height="16" role="img" aria-label="${esc(c.name)}"></canvas>
          <figcaption>${esc(c.name)}</figcaption></figure>`).join('')}
      </div>
      <dl class="finale-stats">
        ${stats(data).map((s) => `<div class="finale-stat"><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join('')}
      </dl>
      <p class="finale-thanks">${esc(t('finale.thanks'))}</p>
      <div class="finale-actions">
        <a class="btn-pixel btn-pixel-lg" href="index.html">${icon('back')}${esc(t('finale.home'))}</a>
        <a class="btn btn-outline" href="index.html#projects">${esc(t('finale.projects'))}</a>
      </div>
    </section>`;

  stopWaving?.();
  stopWaving = startWaving($('#main'), chars, data.game?.player);
  stopFireworks ??= startFireworks($('.fireworks'));
}

bootPage({ page: 'finale', render });
