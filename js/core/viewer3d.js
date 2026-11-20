/* =========================================================
   3D viewer: .glb/.gltf → <model-viewer>, .vrm → js/core/vrm.js (three-vrm).
   ========================================================= */
import { t } from './i18n.js';
import { $, $$, esc, txt } from './dom.js';

/* =========================================================
   3D viewer: .glb/.gltf → <model-viewer>, .vrm → three-vrm.
   Supports several versions of one model (e.g. HighPoly / LowPoly / 250)
   and obfuscated files (*.obf, made with tools/obfuscate-model.py).
   ========================================================= */
let modelViewerLib = null;
export function loadModelViewer() {
  // decoders for compressed models are served from this site (no Google CDN needed)
  self.ModelViewerElement = { ...(self.ModelViewerElement || {}), dracoDecoderLocation: new URL('js/vendor/draco/', document.baseURI).href };
  modelViewerLib ??= import('../vendor/model-viewer.min.js').catch((err) => console.error('[portfolio] model-viewer failed', err));
  return modelViewerLib;
}

const OBF_MAGIC = 'MAIPAOBF1';
const objectUrls = new Map();
/** Returns a URL the viewer can load. Obfuscated files are decoded in memory. */
export async function resolveModelUrl(src) {
  if (!/\.obf$/i.test(src)) return src;
  if (objectUrls.has(src)) return objectUrls.get(src);
  const res = await fetch(src);
  if (!res.ok) throw new Error(`${src}: HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const magic = new TextDecoder().decode(buf.subarray(0, OBF_MAGIC.length));
  if (magic !== OBF_MAGIC) throw new Error(`${src}: not an obfuscated model`);
  const data = buf.slice(OBF_MAGIC.length + 16);
  const salt = buf.subarray(OBF_MAGIC.length, OBF_MAGIC.length + 16);
  let x = 0x9e3779b9;
  for (let i = 0; i < data.length; i++) {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    data[i] ^= (x ^ salt[i & 15]) & 0xff;
  }
  const url = URL.createObjectURL(new Blob([data], { type: 'model/gltf-binary' }));
  objectUrls.set(src, url);
  return url;
}
const isVrm = (src) => /\.vrm(\.obf)?$/i.test(src);

/**
 * Mounts a 3D viewer into `host`.
 * model = { variants:[{label, src, poster}], src?, cameraOrbit?, autoRotate?, environment?, exposure? }
 * opts.fallbackImage → shown when the file can't be loaded.
 */
export function mountModel(host, model, opts = {}) {
  const variants = (model.variants && model.variants.length ? model.variants : [{ label: '', src: model.src, poster: model.poster }])
    .filter((v) => v && v.src && !v.hidden);
  if (!variants.length) return null;
  host.classList.add('viewer-host');
  host.innerHTML = `
    <div class="viewer-stage"></div>
    ${variants.length > 1 ? `<div class="variant-bar" role="group" aria-label="${esc(t('project.variant'))}">${variants.map((v, i) =>
      `<button type="button" class="variant-btn" data-i="${i}" aria-pressed="${i === 0}">${txt(v.label) || i + 1}</button>`).join('')}</div>` : ''}`;
  const stage = $('.viewer-stage', host);
  let dispose = null, token = 0;

  const fail = (src) => {
    stage.innerHTML = `<div class="model-fallback">${opts.fallbackImage ? `<img src="${esc(opts.fallbackImage)}" alt="">` : ''}<p>${esc(t('project.modelMissing'))}</p></div>`;
    console.warn('[portfolio] model not available:', src);
  };

  const show = async (i) => {
    const my = ++token;
    dispose?.(); dispose = null;
    const v = variants[i];
    $$('.variant-btn', host).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.i === i)));
    stage.innerHTML = '<div class="viewer-loading"><span></span></div>';
    let url;
    try { url = await resolveModelUrl(v.src); } catch { if (my === token) fail(v.src); return; }
    if (my !== token) return;
    if (isVrm(v.src)) {
      try {
        const { mountVRM } = await import('./vrm.js');
        if (my !== token) return;
        stage.innerHTML = '';
        dispose = await mountVRM(stage, url, { autoRotate: model.autoRotate !== false });
      } catch (err) { if (my === token) fail(v.src); }
      return;
    }
    await loadModelViewer();
    if (my !== token) return;
    const poster = v.poster || model.poster;
    stage.innerHTML = `<model-viewer src="${esc(url)}" ${poster ? `poster="${esc(poster)}"` : ''} alt="${txt(opts.alt || v.label || 'model')}"
      camera-controls touch-action="pan-y" ${model.autoRotate !== false ? 'auto-rotate' : ''} auto-rotate-delay="0"
      ${model.cameraOrbit ? `camera-orbit="${esc(model.cameraOrbit)}"` : ''}
      environment-image="${esc(model.environment || 'neutral')}" shadow-intensity="${model.shadowIntensity ?? 1}"
      exposure="${model.exposure ?? 1}" interaction-prompt="auto"></model-viewer>`;
    $('model-viewer', stage).addEventListener('error', () => { if (my === token) fail(v.src); });
  };
  host.addEventListener('click', (e) => { const b = e.target.closest('.variant-btn'); if (b) show(+b.dataset.i); });
  show(0);
  return { destroy() { token++; dispose?.(); host.innerHTML = ''; } };
}

