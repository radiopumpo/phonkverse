// "Now playing" page. It VIEWS a track; when the viewed track is the one playing it shows live controls that drive the global
// player, otherwise Play starts the album from that track. Previous/next move the view when not live.
import { ALBUMS } from "../tracks.js";
import { createSynth } from "../song/visual.js";

const fmt = (s) => (isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");

export function mount({ pv }) {
  const { player, catalog, library } = pv, $ = (id) => document.getElementById(id), life = new AbortController(), off = [];
  const q = new URLSearchParams(location.search);
  const wanted = catalog.get(`${q.get("a")}:${q.get("t")}`) || player.state().track || catalog.get("phonkita:01");
  let viewed = wanted.id, scrubbing = false, raf = 0;
  const seek = $("seek"), playBtn = $("play"), live = () => player.state().id === viewed;
  const albumIds = () => catalog.tracks.filter((t) => t.albumKey === catalog.get(viewed).albumKey).map((t) => t.id);

  let synth = null, palette = ALBUMS[wanted.albumKey].palette;
  const startSynth = (pal) => { synth?.stop(); palette = pal; synth = createSynth($("synth"), pal); synth.start(); };
  const loop = () => { synth?.setLevel(live() ? player.level() : 0); raf = requestAnimationFrame(loop); };

  function render() {
    const t = catalog.get(viewed), a = ALBUMS[t.albumKey], n = a.tracks.length;
    document.documentElement.style.setProperty("--accent", a.palette[0]); if (palette !== a.palette) startSynth(a.palette);
    document.title = `${t.title} — ${a.name} | PHONKVERSE`;
    $("song-album").textContent = a.name; $("song-num").textContent = `${t.n} / ${String(n).padStart(2, "0")}`;
    $("song-title").textContent = t.title; $("song-mood").textContent = t.mood; $("song-desc").textContent = t.desc;
    const art = $("song-art"); art.href = a.page; art.setAttribute("aria-label", `${a.name} album`); $("song-art-img").src = a.art; $("song-art-img").alt = `${a.name} album artwork`;
    $("back-link").href = a.page + "#tracklist"; $("prev").disabled = $("next").disabled = n < 2;
    $("song-menu").dataset.start = viewed;
    history.replaceState(history.state, "", `song.html?a=${t.albumKey}&t=${t.n}`);
    paint(player.state());
  }
  function paint(s) {
    const on = s.id === viewed, playing = on && s.playing;
    playBtn.textContent = playing ? "❚❚" : "▶"; playBtn.setAttribute("aria-label", playing ? "Pause" : "Play"); document.body.classList.toggle("is-playing", playing);
    seek.disabled = !on || !s.duration; if (!on) { seek.value = 0; seek.style.setProperty("--fill", "0%"); $("t-cur").textContent = "0:00"; $("t-dur").textContent = "0:00"; }
    $("shuffle").setAttribute("aria-pressed", String(s.shuffle)); $("repeat").dataset.mode = s.repeat; $("repeat").setAttribute("aria-label", `Repeat: ${s.repeat}`);
    const chip = $("song-nowchip"), other = s.track && !on ? s.track : null;       // something else is playing → offer to jump to it
    chip.hidden = !other; if (other) { chip.textContent = `${s.playing ? "Now playing" : "Last played"}: ${other.title}`; chip.dataset.id = other.id; }
  }
  function time(s) { if (s.id !== viewed || scrubbing) return; seek.value = s.duration ? s.time / s.duration * 1000 : 0; seek.style.setProperty("--fill", (s.duration ? s.time / s.duration * 100 : 0) + "%"); $("t-cur").textContent = fmt(s.time); $("t-dur").textContent = fmt(s.duration); }

  let curId = player.state().id;
  off.push(player.on("track", (t) => { const followed = curId === viewed; curId = t?.id ?? null; if (followed && t) { viewed = t.id; render(); } else paint(player.state()); }));
  off.push(player.on("state", paint), player.on("time", time));
  off.push(player.on("error", (t) => { if (t && t.id === viewed) $("song-status").textContent = `Audio not found yet: ${t.src}`; }));
  off.push(player.on("state", (s) => { if (s.playing) $("song-status").textContent = ""; }));

  const wrap = (i) => { const ids = albumIds(); return ids[(ids.indexOf(viewed) + i + ids.length) % ids.length]; };
  playBtn.addEventListener("click", () => { if (live()) player.toggle(); else player.playContext(albumIds(), viewed, { shuffle: false }); }, { signal: life.signal });
  $("prev").addEventListener("click", () => { if (live()) player.prev(); else { viewed = wrap(-1); render(); } }, { signal: life.signal });
  $("next").addEventListener("click", () => { if (live()) player.next(); else { viewed = wrap(1); render(); } }, { signal: life.signal });
  $("shuffle").addEventListener("click", () => player.setShuffle(!player.state().shuffle), { signal: life.signal });
  $("repeat").addEventListener("click", () => player.cycleRepeat(), { signal: life.signal });
  $("song-nowchip").addEventListener("click", (e) => { viewed = e.currentTarget.dataset.id; render(); }, { signal: life.signal });
  seek.addEventListener("input", () => { scrubbing = true; $("t-cur").textContent = fmt(seek.value / 1000 * (player.audio.duration || 0)); }, { signal: life.signal });
  seek.addEventListener("change", () => { player.seek(seek.value / 1000); scrubbing = false; }, { signal: life.signal });
  document.addEventListener("keydown", (e) => { if (e.code === "Space" && e.target === document.body) { e.preventDefault(); playBtn.click(); } }, { signal: life.signal });
  $("share").addEventListener("click", async () => {
    const t = catalog.get(viewed), data = { title: `${t.title} — ${t.album}`, text: `Listen to “${t.title}” on PHONKVERSE`, url: `${location.origin}${location.pathname}?a=${t.albumKey}&t=${t.n}` };
    try { if (navigator.share) { await navigator.share(data); return; } await navigator.clipboard.writeText(data.url); $("song-status").textContent = "Link copied to clipboard."; }
    catch (e) { if (e.name !== "AbortError") prompt("Copy this link:", data.url); }
  }, { signal: life.signal });

  startSynth(palette); render(); time(player.state()); raf = requestAnimationFrame(loop);
  return () => { life.abort(); off.forEach((f) => f()); cancelAnimationFrame(raf); synth?.stop(); document.body.classList.remove("is-playing"); };
}
