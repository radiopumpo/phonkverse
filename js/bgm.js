/* Background music (BGM). Loops quietly, stops for good once any track is played, returns only on page refresh.
   Config */
const BGM = { src: "assets/audio/phonkversebgm.mp3", volume: 0.2, fadeIn: 1.5, fadeOut: 0.6 };

(() => {
  const store = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} },
    del: (k) => { try { sessionStorage.removeItem(k); } catch {} },
  };
  // A refresh restarts the BGM (clears "a track was played"); plain navigation between pages does not.
  if (performance.getEntriesByType?.("navigation")[0]?.type === "reload") { store.del("pv_bgm_off"); store.del("pv_bgm_t"); }
  if (store.get("pv_bgm_off") === "1") return;

  const el = new Audio(BGM.src); el.loop = true; el.preload = "auto";
  let ctx = null, gain = null, stopped = false, muted = store.get("pv_bgm_muted") === "1";

  // iOS ignores audio.volume, so volume goes through a Web Audio GainNode (falls back to .volume elsewhere).
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC(); gain = ctx.createGain(); gain.gain.value = 0;
    ctx.createMediaElementSource(el).connect(gain); gain.connect(ctx.destination);
  } catch { ctx = gain = null; el.volume = 0; }

  const fadeTo = (v, secs) => {
    if (gain) { const t = ctx.currentTime, g = gain.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(v, t + secs); return; }
    const from = el.volume, t0 = performance.now();
    (function step(n) { const k = Math.min(1, (n - t0) / (secs * 1000)); el.volume = from + (v - from) * k; if (k < 1) requestAnimationFrame(step); })(t0);
  };

  // Must run synchronously inside the user's gesture. Never await ctx.resume(): without a real tap iOS leaves that
  // promise pending forever, which used to wedge the whole start routine after a swipe-first visit.
  function start() {
    if (stopped || muted) return;
    if (ctx && ctx.state !== "running") ctx.resume().catch(() => {});
    if (!el.paused) return;
    if (!el.currentTime) { const saved = parseFloat(store.get("pv_bgm_t")); if (saved > 0) el.currentTime = saved; }   // continue where the previous page left off
    el.play().then(() => fadeTo(BGM.volume, BGM.fadeIn)).catch(() => { /* blocked (e.g. swipe is not a tap) → stay armed for the next gesture */ });
  }
  function stopForTrack() {
    if (stopped) return; stopped = true; store.set("pv_bgm_off", "1");
    removeGesture(); fadeTo(0, BGM.fadeOut); setTimeout(() => el.pause(), BGM.fadeOut * 1000 + 50); toggle.hidden = true;
  }
  window.addEventListener("phonkverse:track-play", stopForTrack);   // fired by js/player.js and js/song/audio.js

  // Autoplay needs a user gesture on iOS and often on desktop: retry on the first tap/click/key.
  const gestures = ["click", "touchend", "keydown"], onGesture = () => { if (!muted) start(); };
  const removeGesture = () => gestures.forEach((g) => document.removeEventListener(g, onGesture));
  gestures.forEach((g) => document.addEventListener(g, onGesture, { passive: true }));
  // Stay armed until audio is genuinely playing AND the audio context is running (a swipe never counts as a tap on iOS).
  const disarmIfRunning = () => { if (!el.paused && (!ctx || ctx.state === "running")) removeGesture(); };
  el.addEventListener("playing", disarmIfRunning); ctx?.addEventListener("statechange", disarmIfRunning);

  // Visible on/off control (users must be able to silence audio that starts on its own).
  const toggle = document.createElement("button");
  toggle.type = "button"; toggle.className = "bgm-toggle"; toggle.textContent = "♪";
  const paint = () => { const on = !el.paused && !muted; toggle.classList.toggle("is-off", !on); toggle.setAttribute("aria-pressed", String(on)); toggle.setAttribute("aria-label", on ? "Mute background music" : "Play background music"); toggle.title = toggle.getAttribute("aria-label"); };
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!el.paused) { muted = true; store.set("pv_bgm_muted", "1"); fadeTo(0, .3); setTimeout(() => el.pause(), 350); }
    else { muted = false; store.del("pv_bgm_muted"); start(); }
  });
  ["play", "pause"].forEach((ev) => el.addEventListener(ev, paint));
  el.addEventListener("error", () => { toggle.remove(); removeGesture(); });   // file missing → stay silent, no console spam
  const mount = () => {
    const header = document.querySelector(".site-header"); if (!header) return document.body.append(toggle);
    let end = header.querySelector(".header-end");
    if (!end) { end = document.createElement("div"); end.className = "header-end"; header.append(end); header.querySelectorAll(".header-cta, .menu-toggle").forEach((n) => end.append(n)); }
    end.append(toggle);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
  paint();

  // remember position so the next page continues the loop
  const save = () => store.set("pv_bgm_t", String(el.currentTime || 0));
  el.addEventListener("timeupdate", () => { if (Math.floor(el.currentTime) % 2 === 0) save(); });
  window.addEventListener("pagehide", save);

  // Try immediately (works if the browser already allows autoplay for this site).
  if (!ctx || ctx.state === "running") start();
})();
