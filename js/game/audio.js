/* =========================================================
   8-bit sound effects made with WebAudio (no sound files).
   ========================================================= */
export function installAudio(G) {
  let ctx = null;
  /** blip(frequency, duration, waveform, pitchSlide) */
  G.blip = (freq, dur = 0.08, type = 'square', slide = 0) => {
    if (G.cfg.sound === false) return;
    try {
      ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, ctx.currentTime + dur);
      g.gain.setValueAtTime(0.05, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
    } catch { /* no audio */ }
  };
  G.coinSound = () => { G.blip(988, 0.06); setTimeout(() => G.blip(1319, 0.12), 60); };
  G.errorSound = () => G.blip(150, 0.15, 'square');
  G.honk = () => { G.blip(330, 0.18, 'square'); setTimeout(() => G.blip(415, 0.22, 'square'), 120); };
}
