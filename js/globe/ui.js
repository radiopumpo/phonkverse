import { CONFIG } from "./config.js";
const $ = (id) => document.getElementById(id);

/** All DOM wiring for the globe widget (POI card, HUD, buttons). No three.js in here. */
export function createUI({ onZoom, onReset, onTogglePause, onClose }) {
  const card = $("poi-card"), hint = $("globe-hint"), coords = $("globe-coordinates"), pause = $("globe-pause");
  const HINT = "DRAG TO ROTATE · TAP A PIN";
  $("globe-zoom-in").addEventListener("click", () => onZoom(-.5));
  $("globe-zoom-out").addEventListener("click", () => onZoom(.5));
  $("globe-reset").addEventListener("click", () => { hide(); onReset(); });
  pause.addEventListener("click", () => { const p = pause.getAttribute("aria-pressed") !== "true"; pause.setAttribute("aria-pressed", p); pause.textContent = p ? "▶" : "❚❚"; onTogglePause(p); });
  $("poi-close").addEventListener("click", () => { hide(); onClose(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && card.classList.contains("is-open")) { hide(); onClose(); } });

  function show(loc) {
    $("poi-title").textContent = loc.name; $("poi-region").textContent = loc.region; $("poi-description").textContent = loc.description;
    const a = $("poi-link"); a.href = loc.href; a.textContent = loc.cta;
    card.classList.add("is-open"); hint.textContent = "PIN SELECTED · CLOSE CARD TO KEEP EXPLORING";
  }
  function hide() { card.classList.remove("is-open"); hint.textContent = HINT; }
  hint.textContent = HINT;
  return { show, hide, setCenter(lat, lon) { coords.textContent = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? "E" : "W"}`; } };
}
