// Home page lifecycle: globe + voices grid + "play the world" buttons. Returns a teardown for the shell.
import { mount as mountGlobe } from "../globe/index.js";
import { renderVoices } from "../voices.js";

export function mount() {
  renderVoices();
  let stopGlobe = null;
  try { stopGlobe = mountGlobe(); } catch (err) { console.error("PHONKVERSE globe failed:", err); document.documentElement.classList.add("no-webgl"); }
  const intro = document.querySelector(".voices-section .albums-intro");
  if (intro && !intro.querySelector(".intro-actions")) {
    intro.insertAdjacentHTML("beforeend", `<div class="intro-actions"><button type="button" class="button button-lime" data-pv="shuffle" data-ctx="all">⤮ Shuffle the world</button><button type="button" class="button button-ghost" data-pv="library" data-tab="voices">Browse the library</button></div>`);
  }
  return () => { stopGlobe?.(); document.documentElement.classList.remove("no-webgl"); };
}
