/* =========================================================
   Small helpers used by every game module.
   ========================================================= */
export const loadImage = (src) => new Promise((resolve, reject) => {
  if (!src) return reject(new Error('no src'));
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});
export const loadImageOrNull = (src) => loadImage(src).catch(() => null);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** seconds → "m:ss.cc" */
export const fmtTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`;
/** "Hello {name}" + { name: 'X' } → "Hello X" */
export const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(v), String(s));
export { esc as escapeHTML } from '../core/dom.js';
/** localStorage / sessionStorage with JSON (shared with the rest of the site) */
export { store, session } from '../core/storage.js';
export function el(tag, cls, html = '') { const n = document.createElement(tag); n.className = cls; n.innerHTML = html; return n; }
/** weighted random pick: items with a "chance" field */
export function pickWeighted(items) {
  const total = items.reduce((a, i) => a + (i.chance ?? 1), 0);
  let r = Math.random() * total;
  for (const i of items) { r -= i.chance ?? 1; if (r <= 0) return i; }
  return items[items.length - 1];
}

