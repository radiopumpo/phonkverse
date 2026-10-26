import { ALBUMS } from "../tracks.js";
import { createSynth } from "./visual.js";
import { createAudio } from "./audio.js";

const $ = (id) => document.getElementById(id), q = new URLSearchParams(location.search);
const albumKey = ALBUMS[q.get("a")] ? q.get("a") : "phonkita", album = ALBUMS[albumKey];
let i = Math.max(0, album.tracks.findIndex((t) => t.n === q.get("t")));
const fmt = (s) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");
const seek = $("seek"), playBtn = $("play"), status = (m = "") => ($("song-status").textContent = m);
let scrubbing = false;

document.documentElement.style.setProperty("--accent", album.palette[0]);
const synth = createSynth($("synth"), album.palette); synth.start();
const audio = createAudio({
  onTime(c, d) { if (!scrubbing && d) seek.value = (c / d) * 1000; $("t-cur").textContent = fmt(c); $("t-dur").textContent = fmt(d); seek.style.setProperty("--fill", (d ? c / d * 100 : 0) + "%"); },
  onEnd() { if (i < album.tracks.length - 1) go(i + 1, true); else playBtn.textContent = "▶"; },
  onError() { playBtn.textContent = "▶"; status(`Audio not found yet: ${album.tracks[i].src}`); },
  onState(p) { playBtn.textContent = p ? "❚❚" : "▶"; playBtn.setAttribute("aria-label", p ? "Pause" : "Play"); document.body.classList.toggle("is-playing", p); },
});
(function loop() { synth.setLevel(audio.level()); requestAnimationFrame(loop); })();

function render() {
  const t = album.tracks[i], url = `song.html?a=${albumKey}&t=${t.n}`;
  document.title = `${t.title} — ${album.name} | PHONKVERSE`;
  $("song-album").textContent = album.name; $("song-num").textContent = `${t.n} / ${String(album.tracks.length).padStart(2, "0")}`;
  $("song-title").textContent = t.title; $("song-mood").textContent = t.mood; $("song-desc").textContent = t.desc;
  const art = $("song-art"); art.href = album.page; art.setAttribute("aria-label", `${album.name} album`); $("song-art-img").src = album.art; $("song-art-img").alt = `${album.name} album artwork`;
  $("back-link").href = album.page + "#tracklist"; $("prev").disabled = i === 0; $("next").disabled = i === album.tracks.length - 1;
  seek.disabled = false; seek.value = 0; status();
  history.replaceState(null, "", url);
  if ("mediaSession" in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: album.name, album: "PHONKVERSE", artwork: [{ src: album.art, sizes: "1536x1024", type: "image/png" }] });
}
function go(n, autoplay) { i = n; render(); audio.load(album.tracks[i].src); if (autoplay) audio.toggle(); }

playBtn.addEventListener("click", () => audio.toggle());
$("prev").addEventListener("click", () => go(i - 1, !audio.el.paused));
$("next").addEventListener("click", () => go(i + 1, !audio.el.paused));
seek.addEventListener("input", () => { scrubbing = true; $("t-cur").textContent = fmt(seek.value / 1000 * audio.el.duration); });
seek.addEventListener("change", () => { audio.seek(seek.value / 1000); scrubbing = false; });
document.addEventListener("keydown", (e) => { if (e.code === "Space" && e.target === document.body) { e.preventDefault(); audio.toggle(); } });
if ("mediaSession" in navigator) { const m = navigator.mediaSession; m.setActionHandler("play", () => audio.toggle()); m.setActionHandler("pause", () => audio.toggle());
  m.setActionHandler("previoustrack", () => i > 0 && go(i - 1, true)); m.setActionHandler("nexttrack", () => i < album.tracks.length - 1 && go(i + 1, true)); }

$("share").addEventListener("click", async () => {
  const t = album.tracks[i], data = { title: `${t.title} — ${album.name}`, text: `Listen to “${t.title}” on PHONKVERSE`, url: `${location.origin}${location.pathname}?a=${albumKey}&t=${t.n}` };
  try { if (navigator.share) { await navigator.share(data); return; } await navigator.clipboard.writeText(data.url); status("Link copied to clipboard."); }
  catch (e) { if (e.name !== "AbortError") { prompt("Copy this link:", data.url); } }
});
go(i, false);
