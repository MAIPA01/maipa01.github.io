/* =========================================================
   Markdown (small & safe subset) for long descriptions.
   ========================================================= */
import { esc } from './dom.js';

/* =========================================================
   Markdown (small & safe subset) for long descriptions
   ========================================================= */
const mdFiles = new Map();
/** Loads every {"file": "..."} referenced in the given values (call before rendering, then render again). */
export async function loadMarkdownFiles(values) {
  const files = new Set();
  const walk = (v) => {
    if (!v || typeof v !== 'object') return;
    if (typeof v.file === 'string' && Object.keys(v).length === 1) { if (!mdFiles.has(v.file)) files.add(v.file); return; }
    Object.values(v).forEach(walk);
  };
  values.forEach(walk);
  if (!files.size) return false;
  await Promise.all([...files].map(async (f) => {
    try { const r = await fetch(f, { cache: 'no-cache' }); mdFiles.set(f, r.ok ? await r.text() : ''); } catch { mdFiles.set(f, ''); }
  }));
  return true;
}

/**
 * Markdown → HTML. Accepts a string, an array of lines ("" = new paragraph) or {"file": "x.md"}.
 * A single line break inside a paragraph is a space (so long text can be split into short lines);
 * end a line with two spaces or a backslash for a hard line break.
 */
export function markdown(src) {
  if (src == null) return '';
  if (typeof src === 'object' && !Array.isArray(src) && typeof src.file === 'string') src = mdFiles.get(src.file) ?? '';
  if (Array.isArray(src)) src = src.join('\n');
  let s = esc(String(src)).replace(/\r\n?/g, '\n');
  const codeBlocks = [];
  s = s.replace(/```([\w+-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    codeBlocks.push(`<pre class="md-code"${lang ? ` data-lang="${lang}"` : ''}><code>${code.replace(/\n$/, '')}</code></pre>`);
    return `\u0000${codeBlocks.length - 1}\u0000`;
  });
  const inline = (line) => {
    const codes = [];
    line = line.replace(/`([^`]+)`/g, (_, c) => { codes.push(`<code>${c}</code>`); return `\u0001${codes.length - 1}\u0001`; });
    line = line.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
      const u = url.replace(/&amp;/g, '&');
      if (/^\s*javascript:/i.test(u)) return label;
      const ext = /^(https?:)?\/\//.test(u);
      return `<a href="${esc(u)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
    });
    line = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
    return line.replace(/\u0001(\d+)\u0001/g, (_, i) => codes[i]);
  };
  const out = [];
  for (const block of s.split(/\n{2,}/)) {
    const b = block.trim();
    if (!b) continue;
    if (/^\u0000\d+\u0000$/.test(b)) { out.push(b); continue; }
    const lines = b.split('\n');
    const h = b.match(/^(#{1,4})\s+(.*)$/);
    if (h && lines.length === 1) { const lvl = Math.min(h[1].length + 2, 5); out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`); continue; }
    if (lines.every((l) => /^\s*[-*]\s+/.test(l))) { out.push(`<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ''))}</li>`).join('')}</ul>`); continue; }
    if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) { out.push(`<ol>${lines.map((l) => `<li>${inline(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>`).join('')}</ol>`); continue; }
    if (lines.every((l) => /^&gt;\s?/.test(l))) { out.push(`<blockquote>${inline(lines.map((l) => l.replace(/^&gt;\s?/, '')).join(' '))}</blockquote>`); continue; }
    out.push(`<p>${lines.map((l, i) => inline(l.replace(/(\s{2,}|\\)$/, '')) + (i < lines.length - 1 ? (/(\s{2,}|\\)$/.test(l) ? '<br>' : ' ') : '')).join('')}</p>`);
  }
  return out.join('\n').replace(/\u0000(\d+)\u0000/g, (_, i) => codeBlocks[i]);
}

