import * as THREE from "../../vendor/three.module.min.js";
import { CONFIG } from "./config.js";
import { facingAngles, wrapPI } from "./geo.js";

/**
 * Orbit state machine: IDLE (auto-rotate) → DRAGGING → INERTIA → IDLE after a pause,
 * plus FOCUS (ease to a POI). Auto-rotate always comes back — the old code disabled it forever
 * after the first wheel/touch, which is why Chrome "froze".
 */
export function createControls(el, globe, camera, { reducedMotion = false, onRelease } = {}) {
  const s = { yaw: 0, pitch: CONFIG.homePitch, vyaw: 0, vpitch: 0, dragging: false, lastInput: -1e9,
    focus: null, paused: false, holdSpin: false, zoom: CONFIG.zoom.home, scrollZoom: 0 };
  const home = facingAngles(CONFIG.homeLat, CONFIG.homeLon); s.yaw = home.yaw;
  const spinScale = reducedMotion ? .3 : 1;
  let lx = 0, ly = 0, touch = false;
  const now = () => performance.now();
  const poke = () => { s.lastInput = now(); };

  el.addEventListener("pointerdown", (e) => {
    s.dragging = true; s.focus = null; touch = e.pointerType === "touch"; lx = e.clientX; ly = e.clientY;
    s.vyaw = s.vpitch = 0; poke(); el.setPointerCapture?.(e.pointerId);
  });
  el.addEventListener("pointermove", (e) => {
    if (!s.dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    const k = .0068 * (3.2 / s.zoom) ** .5;                 // slower drag when zoomed in
    s.yaw += dx * k; s.vyaw = dx * k * 60;
    if (!touch) { s.pitch = THREE.MathUtils.clamp(s.pitch + dy * k, -1.1, 1.1); s.vpitch = dy * k * 60; }
    poke();
  });
  const end = () => { s.dragging = false; poke(); };
  el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
  // Plain wheel must scroll the page (the globe sits inside a scroll-driven section). Ctrl/⌘+wheel and trackpad pinch zoom.
  el.addEventListener("wheel", (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault(); s.zoom = THREE.MathUtils.clamp(s.zoom + e.deltaY * .01, CONFIG.zoom.min, CONFIG.zoom.max); poke();
  }, { passive: false });
  el.addEventListener("keydown", (e) => {
    const m = { ArrowLeft: [-.15, 0], ArrowRight: [.15, 0], ArrowUp: [0, -.12], ArrowDown: [0, .12] }[e.key];
    if (m) { e.preventDefault(); s.yaw += m[0]; s.pitch = THREE.MathUtils.clamp(s.pitch + m[1], -1.1, 1.1); poke(); }
  });

  return {
    state: s,
    zoomBy(d) { s.zoom = THREE.MathUtils.clamp(s.zoom + d, CONFIG.zoom.min, CONFIG.zoom.max); poke(); },
    setScroll(p) { s.scrollZoom = p; },
    setPaused(v) { s.paused = v; },
    holdSpin(v) { s.holdSpin = v; },                          // true while a POI card is open
    focusOn(lat, lon) { const f = facingAngles(lat, lon); s.focus = { yaw: f.yaw, pitch: Math.min(f.pitch, .75) }; poke(); },
    reset() { const h = facingAngles(CONFIG.homeLat, CONFIG.homeLon); s.focus = { yaw: h.yaw, pitch: CONFIG.homePitch }; s.zoom = CONFIG.zoom.home; s.holdSpin = false; poke(); },
    poke,
    update(dt) {
      if (s.holdSpin && !s.dragging && now() - s.lastInput > CONFIG.cardHoldMs) { s.holdSpin = false; onRelease?.(); }   // user is done → close card, resume spin
      const idle = !s.dragging && now() - s.lastInput > CONFIG.idleResumeMs && !s.paused && !s.holdSpin && !s.focus;
      if (s.focus) {
        const a = 1 - Math.exp(-dt * 3.2);
        s.yaw += wrapPI(s.focus.yaw - s.yaw) * a; s.pitch += (s.focus.pitch - s.pitch) * a;
        if (Math.abs(wrapPI(s.focus.yaw - s.yaw)) < .004) s.focus = null;
      } else if (!s.dragging) {
        s.yaw += s.vyaw * dt; s.pitch = THREE.MathUtils.clamp(s.pitch + s.vpitch * dt, -1.1, 1.1);
        const d = Math.exp(-dt * 3.5); s.vyaw *= d; s.vpitch *= d;
        if (idle) { s.yaw += CONFIG.spin * spinScale * dt; s.pitch += (CONFIG.homePitch - s.pitch) * (1 - Math.exp(-dt * .8)); }
      }
      globe.rotation.set(s.pitch, s.yaw, 0, "XYZ");
      const target = s.zoom - s.scrollZoom * CONFIG.zoom.scrollIn;
      camera.position.z += (target - camera.position.z) * (1 - Math.exp(-dt * 6));
    },
    get spinning() { return !s.dragging && !s.paused && !s.holdSpin && !s.focus && now() - s.lastInput > CONFIG.idleResumeMs; },
  };
}
