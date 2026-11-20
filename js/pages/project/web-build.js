/* =========================================================
   Project page — games playable in the browser ("webBuild").

   Virtual resolution: games with a fixed pixel layout (e.g. p5.js createCanvas(windowWidth, windowHeight)
   + absolute positions) get webBuild.width/height — the iframe is rendered at that size and scaled to fit.

   Keyboard focus: click the game → the game gets every key and the page can't scroll
   (works for games from any domain); click anywhere else on the page → normal page again.
   For games on the same domain the arrow keys are additionally blocked inside the game document.
   ========================================================= */
import { $, esc, tr, t } from '../../core/index.js';

const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'PageUp', 'PageDown', 'Home', 'End']);
let focusedFrame = null;

export function startWebBuild(frame, title = '') {
  const vw = +frame.dataset.vw, vh = +frame.dataset.vh;
  frame.innerHTML = `<iframe src="${esc(frame.dataset.src)}" title="${esc(title)}" allow="fullscreen; autoplay; gamepad; accelerometer; gyroscope" allowfullscreen
    ${vw && vh ? `style="width:${vw}px;height:${vh}px"` : ''}></iframe>
    <span class="pp-play-focus" aria-hidden="true">${esc(t('project.playFocused'))}</span>`;
  frame.classList.add('running');
  const iframe = $('iframe', frame);
  if (vw && vh) fitVirtualResolution(frame, iframe, vw, vh);
  if (frame.dataset.keys !== '0') {
    iframe.addEventListener('load', () => blockScrollKeysInside(iframe));
    trackFocus(frame, iframe);
  }
  focusGame(frame, iframe);
}

function fitVirtualResolution(frame, iframe, vw, vh) {
  frame.classList.add('scaled');
  const fit = () => {
    const fs = document.fullscreenElement === frame;
    const s = Math.min(frame.clientWidth / vw, (fs ? frame.clientHeight : Infinity) / vh);
    iframe.style.transform = `scale(${s})`;
    iframe.style.left = `${Math.max(0, (frame.clientWidth - vw * s) / 2)}px`;
    iframe.style.top = `${Math.max(0, (frame.clientHeight - vh * s) / 2)}px`;
  };
  fit();
  new ResizeObserver(fit).observe(frame);
  document.addEventListener('fullscreenchange', fit);
}

// same-domain games only: stop arrow keys from scrolling inside the game document
function blockScrollKeysInside(iframe) {
  try {
    iframe.contentWindow.addEventListener('keydown', (e) => { if (SCROLL_KEYS.has(e.key)) e.preventDefault(); }, { capture: true });
  } catch { /* other domain — handled by the page-level scroll lock below */ }
}

/* ---------- focus: click inside = game, click outside = page ---------- */
function focusGame(frame, iframe) {
  focusedFrame = frame;
  frame.classList.add('focused');
  lockPageScroll(true);
  iframe.focus();
  try { iframe.contentWindow.focus(); } catch { /* other domain */ }
}
function releaseGame() {
  if (!focusedFrame) return;
  focusedFrame.classList.remove('focused');
  focusedFrame = null;
  lockPageScroll(false);
}
function trackFocus(frame, iframe) {
  // a click inside the iframe never reaches this page, but the page window loses focus → the game has it
  addEventListener('blur', () => setTimeout(() => { if (document.activeElement === iframe) focusGame(frame, iframe); }));
  // any click on the page itself (outside the game) gives the keyboard back to the page
  document.addEventListener('pointerdown', (e) => { if (focusedFrame && !frame.contains(e.target)) releaseGame(); }, true);
  frame.addEventListener('pointerdown', () => focusGame(frame, iframe));
  // keys that still reach the page while the game is focused (e.g. focus not yet inside the iframe)
  addEventListener('keydown', (e) => {
    if (focusedFrame !== frame) return;
    if (e.key === 'Escape') { releaseGame(); return; }
    if (SCROLL_KEYS.has(e.key)) e.preventDefault();
    iframe.focus();
  }, true);
}

// while a game has the keyboard the page must not scroll (also stops "scroll chaining" from the iframe)
function lockPageScroll(on) {
  const root = document.documentElement;
  if (on) {
    const gap = innerWidth - root.clientWidth;
    root.style.setProperty('--scrollbar-gap', `${gap}px`);
    root.classList.add('scroll-locked');
  } else {
    root.classList.remove('scroll-locked');
  }
}
