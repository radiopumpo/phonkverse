// The player: ONE <audio> element + the queue + persistence + Media Session. No DOM UI here (see js/ui/*).
// It lives in the persistent shell, so playback survives page changes. Tested with a fake audio element (tests/engine.test.mjs).
import { catalog as defaultCatalog } from "./catalog.js";
import { createQueue } from "./queue.js";

const KEY = "pv_player_v1";
const noop = () => {};

export function createPlayer({ catalog = defaultCatalog, audioFactory = () => new Audio(), storage = null, win = typeof window !== "undefined" ? window : null } = {}) {
  const audio = audioFactory(); audio.preload = "metadata";
  const queue = createQueue();
  const subs = { state: new Set(), track: new Set(), time: new Set(), error: new Set() };
  const emit = (k, v) => subs[k].forEach((f) => f(v));
  const touch = win && win.matchMedia ? win.matchMedia("(pointer: coarse)").matches : false;
  let ctx = null, an = null, buf = null, wired = false;
  let loadedId = null, pendingTime = 0, failures = 0, lastSave = 0, intent = false;   // intent = the listener wants sound (survives load errors)

  const cur = () => catalog.get(queue.current());
  const state = () => ({ playing: !audio.paused, id: queue.current(), track: cur(), time: audio.currentTime || 0, duration: audio.duration || 0, shuffle: queue.snapshot().shuffle, repeat: queue.snapshot().repeat });

  function save(force = false) {
    if (!storage) return; const n = Date.now(); if (!force && n - lastSave < 4000) return; lastSave = n;
    try { storage.setItem(KEY, JSON.stringify({ q: queue.serialize(), t: audio.currentTime || pendingTime || 0 })); } catch { /* quota */ }
  }
  function mediaSession() {
    const nav = win?.navigator; if (!nav || !("mediaSession" in nav) || typeof MediaMetadata === "undefined") return; const t = cur(); if (!t) return;
    nav.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.album, album: "PHONKVERSE", artwork: [{ src: new URL(t.art, win.location.href).href, sizes: "1536x1024" }] });
  }
  function wire() {                                                    // Web Audio analyser: desktop only (iOS mutes Web Audio in the background)
    if (wired) return; wired = true; if (touch || !win) return;
    try { const AC = win.AudioContext || win.webkitAudioContext; ctx = new AC(); const s = ctx.createMediaElementSource(audio); an = ctx.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = .8; s.connect(an); an.connect(ctx.destination); buf = new Uint8Array(an.frequencyBinCount); } catch { ctx = an = null; }
  }
  function load(id, { time = 0 } = {}) {                               // point the element at a track (does not play)
    const t = catalog.get(id); if (!t) return; loadedId = id; pendingTime = time;
    audio.src = t.src; audio.load(); mediaSession(); emit("track", t); emit("state", state());
  }
  function startPlayback() {
    intent = true; win?.dispatchEvent?.(new win.Event("phonkverse:track-play"));      // fades the background music out (js/bgm.js)
    wire(); if (ctx && ctx.state === "suspended") ctx.resume().catch(noop);
    return audio.play().catch((e) => { if (e && e.name === "NotAllowedError") emit("state", state()); });
  }
  function ensureLoaded() { const id = queue.current(); if (id && loadedId !== id) load(id); return id; }

  audio.addEventListener("loadedmetadata", () => { if (pendingTime > 0 && isFinite(audio.duration)) { audio.currentTime = Math.min(pendingTime, audio.duration - .5); pendingTime = 0; } emit("time", state()); });
  audio.addEventListener("timeupdate", () => { emit("time", state()); save(); const nav = win?.navigator; if (nav?.mediaSession?.setPositionState && isFinite(audio.duration) && audio.duration > 0) { try { nav.mediaSession.setPositionState({ duration: audio.duration, position: Math.min(audio.currentTime, audio.duration), playbackRate: 1 }); } catch { /* ignore */ } } });
  audio.addEventListener("playing", () => { failures = 0; });          // really audible (not just requested)
  audio.addEventListener("play", () => { if (win?.navigator?.mediaSession) win.navigator.mediaSession.playbackState = "playing"; emit("state", state()); });
  audio.addEventListener("pause", () => { if (win?.navigator?.mediaSession) win.navigator.mediaSession.playbackState = "paused"; emit("state", state()); save(true); });
  audio.addEventListener("ended", () => advance(true));
  audio.addEventListener("error", () => {                              // missing/unreadable file: tell the UI and keep the music flowing
    const t = cur(); emit("error", t); failures++;
    if (!intent) return;
    if (failures < Math.max(2, queue.snapshot().items.length)) advance(true, true);   // each track gets tried at most once per run
    else { intent = false; audio.pause(); emit("state", state()); }                   // everything failed: stop instead of looping
  });

  function advance(auto, skipping = false) {
    const n = queue.next({ auto: auto && !skipping });
    if (!n) { intent = false; audio.pause(); emit("state", state()); return null; }   // end of queue (or nothing playable left): really stop
    if (auto && queue.snapshot().repeat === "one" && n === loadedId && !skipping) { audio.currentTime = 0; startPlayback(); return n; }
    load(n); startPlayback(); return n;
  }
  queue.subscribe(() => { emit("state", state()); save(); });

  const api = {
    audio, queue, catalog, state, current: cur,
    on(ev, f) { subs[ev].add(f); return () => subs[ev].delete(f); },
    /** Replace the queue and (by default) start playing. ids = track ids, startId = where to begin. */
    playContext(ids, startId = null, { shuffle = queue.snapshot().shuffle, autoplay = true } = {}) {
      const valid = ids.filter((id) => catalog.has(id)); if (!valid.length) return;
      failures = 0; queue.set(valid, { startId, shuffle }); load(queue.current()); if (autoplay) startPlayback(); save(true);
    },
    play() { if (!ensureLoaded()) return; failures = 0; return startPlayback(); },
    pause() { intent = false; audio.pause(); },
    toggle() { return audio.paused ? api.play() : (api.pause(), undefined); },
    next() { failures = 0; const playing = !audio.paused, n = queue.next(); if (!n) return; load(n); if (playing) startPlayback(); },
    prev() { failures = 0; if (audio.currentTime > 3) { audio.currentTime = 0; return; } const playing = !audio.paused, p = queue.prev(); if (!p) return; load(p); if (playing) startPlayback(); },
    jumpTo(id) { failures = 0; if (queue.jumpTo(id)) { load(id); startPlayback(); } },
    seek(frac) { if (isFinite(audio.duration)) audio.currentTime = Math.max(0, Math.min(1, frac)) * audio.duration; },
    setShuffle: (on) => queue.setShuffle(on), cycleRepeat: () => queue.cycleRepeat(),
    playNext: (id) => { queue.playNext(id); if (queue.snapshot().items.length === 1) { load(id); } }, addToQueue: (id) => { queue.add(id); if (queue.snapshot().items.length === 1) load(id); },
    level() { if (!an || audio.paused) return audio.paused ? 0 : .35 + .15 * Math.sin((win?.performance?.now?.() || 0) / 260); an.getByteFrequencyData(buf); let s = 0; for (let i = 0; i < 12; i++) s += buf[i]; return Math.min(1, s / 12 / 200); },
    /** Restore the last session (paused). Returns true if a queue was restored. */
    restore() {
      if (!storage) return false; let raw; try { raw = JSON.parse(storage.getItem(KEY) || "null"); } catch { return false; }
      if (!raw || !queue.restore(raw.q, (id) => catalog.has(id)) || !queue.current()) return false;
      load(queue.current(), { time: raw.t || 0 }); return true;
    },
    save: () => save(true),
  };
  const ms = win?.navigator?.mediaSession;
  if (ms) { const h = (a, f) => { try { ms.setActionHandler(a, f); } catch { /* unsupported */ } };
    h("play", () => api.play()); h("pause", () => api.pause()); h("previoustrack", () => api.prev()); h("nexttrack", () => api.next());
    h("seekto", (e) => { if (e.seekTime != null) audio.currentTime = e.seekTime; }); }
  win?.addEventListener?.("pagehide", () => save(true));
  return api;
}
