/** <audio> + optional Web Audio analyser (energy 0..1). iOS rule: the AudioContext must be created/resumed inside a tap. */
export function createAudio({ onTime, onEnd, onError, onState }) {
  const el = new Audio(); el.preload = "metadata"; el.crossOrigin = "anonymous";
  let ctx = null, an = null, buf = null, tapped = false;
  const wire = () => {
    if (tapped) return; tapped = true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; ctx = new AC();
      const src = ctx.createMediaElementSource(el); an = ctx.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = .8;
      src.connect(an); an.connect(ctx.destination); buf = new Uint8Array(an.frequencyBinCount);
    } catch { ctx = an = null; }                                  // audio still plays; visuals fall back to idle pulse
  };
  el.addEventListener("timeupdate", () => onTime(el.currentTime, el.duration));
  el.addEventListener("loadedmetadata", () => onTime(el.currentTime, el.duration));
  el.addEventListener("ended", onEnd); el.addEventListener("error", onError);
  el.addEventListener("play", () => onState(true)); el.addEventListener("pause", () => onState(false));
  return {
    el,
    load(src) { el.src = src; el.load(); },
    async toggle() {
      if (el.paused) window.dispatchEvent(new Event("phonkverse:track-play"));   // stops the BGM
      wire(); if (ctx?.state === "suspended") await ctx.resume().catch(() => {});
      if (el.paused) return el.play().catch(onError); el.pause();
    },
    seek(frac) { if (isFinite(el.duration)) el.currentTime = frac * el.duration; },
    level() {                                                     // bass-weighted energy
      if (!an || el.paused) return el.paused ? 0 : .35 + .15 * Math.sin(performance.now() / 260);
      an.getByteFrequencyData(buf); let s = 0; for (let i = 0; i < 12; i++) s += buf[i]; return Math.min(1, s / 12 / 200);
    },
  };
}
