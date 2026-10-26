/** Publishes scroll progress (0..1 through the tall section) as CSS var --p and a callback. CSS does the choreography. */
export function bindScrollProgress(section, sticky, onProgress) {
  const label = document.getElementById("world-progress-label");
  let queued = false;
  const calc = () => {
    queued = false;
    const total = Math.max(1, section.offsetHeight - window.innerHeight);
    const p = Math.min(1, Math.max(0, -section.getBoundingClientRect().top / total));
    sticky.style.setProperty("--p", p.toFixed(4));
    if (label) label.textContent = p < .25 ? "01 — DISCOVER" : p < .7 ? "02 — INTERACT" : "03 — ENTER THE VERSE";
    onProgress(p);
  };
  window.addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(calc); } }, { passive: true });
  window.addEventListener("resize", calc); calc();
}
