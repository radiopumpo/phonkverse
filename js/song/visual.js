/** Synthwave scene (sun, mountains, scrolling perspective grid, stars). Pure canvas 2D, no deps.
 *  setLevel(0..1) feeds audio energy; without audio it idles with a gentle pulse. */
export function createSynth(canvas, palette) {
  const ctx = canvas.getContext("2d"), reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [c1, c2, c3] = palette;
  let w = 0, h = 0, dpr = 1, level = 0, smooth = 0, t = 0, run = false, last = 0;
  const stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * .55, p: Math.random() * 6 }));
  const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  new ResizeObserver(size).observe(canvas); size();

  function frame(now) {
    if (!run) return;
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt * (reduced ? .25 : 1);
    smooth += (level - smooth) * Math.min(1, dt * 10);
    const hz = h * .56, e = smooth;
    const sky = ctx.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, "#05030d"); sky.addColorStop(1, "#2a0c3a");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, hz);
    ctx.fillStyle = "#fff"; stars.forEach((s) => { ctx.globalAlpha = .35 + .35 * Math.sin(t * 2 + s.p); ctx.fillRect(s.x * w, s.y * h, 1.5, 1.5); }); ctx.globalAlpha = 1;
    // sun: gradient disc with horizontal cut-out stripes that creep downward
    const R = Math.min(w, h) * (.2 + e * .03), cx = w / 2, cy = hz - R * .35;
    ctx.save(); ctx.shadowColor = c1; ctx.shadowBlur = 50 + e * 90;
    const sg = ctx.createLinearGradient(0, cy - R, 0, cy + R); sg.addColorStop(0, c3); sg.addColorStop(.5, c2); sg.addColorStop(1, c1);
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 9; i++) { const f = ((i + (t * .25) % 1) / 9), y = cy + R * (-.05 + f * 1.05); ctx.fillStyle = "#000"; ctx.fillRect(cx - R, y, R * 2, 1 + f * R * .09); }
    ctx.restore();
    // mountains
    ctx.fillStyle = "#0a0414"; ctx.strokeStyle = c1; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, hz);
    for (let x = 0; x <= w; x += 12) { const n = Math.sin(x * .011) * .5 + Math.sin(x * .027 + 1.3) * .3 + Math.sin(x * .05) * .2; ctx.lineTo(x, hz - Math.max(0, n) * h * .1 * (.75 + e * .5) * Math.min(1, Math.abs(x - cx) / (w * .25) + .15)); }
    ctx.lineTo(w, hz); ctx.closePath(); ctx.fill(); ctx.stroke();
    // floor + perspective grid
    const fl = ctx.createLinearGradient(0, hz, 0, h); fl.addColorStop(0, "#1a0630"); fl.addColorStop(1, "#05020a"); ctx.fillStyle = fl; ctx.fillRect(0, hz, w, h - hz);
    ctx.strokeStyle = c1; ctx.shadowColor = c1; ctx.shadowBlur = 8 + e * 14; ctx.lineWidth = 1.2; ctx.globalAlpha = .55 + e * .4;
    for (let i = -14; i <= 14; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 12, hz); ctx.lineTo(cx + i * w * .14, h); ctx.stroke(); }
    const speed = .35 + e * 1.1;
    for (let i = 0; i < 14; i++) { const z = ((i + (t * speed) % 1) / 14), y = hz + (h - hz) * z * z; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
  return { setLevel(v) { level = v; }, start() { if (!run) { run = true; last = performance.now(); requestAnimationFrame(frame); } }, stop() { run = false; } };
}
