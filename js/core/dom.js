/* =========================================================
   Small DOM / string helpers used everywhere.
   ========================================================= */
import { tr } from './i18n.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const txt = (v) => esc(tr(v) ?? '');
export const visible = (item) => item && !item.hidden;
export const isExternal = (url) => /^(https?:)?\/\//.test(url) || /^mailto:/.test(url);
export const projectUrl = (id) => `project.html?id=${encodeURIComponent(id)}`;
export const teamUrl = (id) => `team.html?id=${encodeURIComponent(id)}`;
