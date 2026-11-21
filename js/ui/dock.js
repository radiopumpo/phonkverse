// The persistent mini player. Hidden until something is queued, and on the song page (which is the full "now playing" view).
const fmt = (s) => (isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");

export function mountDock(player, { openLibrary }) {
  const el = document.createElement("div");
  el.id = "pv-dock"; el.setAttribute("data-persist", ""); el.setAttribute("role", "region"); el.setAttribute("aria-label", "Player"); el.hidden = true;
  el.innerHTML = `
    <input class="dock-seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek" disabled>
    <a class="dock-track" href="index.html"><img class="dock-art" alt="" width="48" height="32"><span class="dock-meta"><b class="dock-title"></b><small class="dock-sub"></small></span></a>
    <div class="dock-controls">
      <button type="button" data-a="shuffle" class="dock-opt" aria-pressed="false" aria-label="Shuffle">⤮</button>
      <button type="button" data-a="prev" aria-label="Previous track">⏮</button>
      <button type="button" data-a="toggle" class="dock-play" aria-label="Play">▶</button>
      <button type="button" data-a="next" aria-label="Next track">⏭</button>
      <button type="button" data-a="repeat" class="dock-opt" aria-label="Repeat: off" data-mode="off">↻</button>
    </div>
    <span class="dock-time"><span class="dock-cur">0:00</span> / <span class="dock-dur">0:00</span></span>
    <button type="button" data-a="library" class="dock-lib" aria-label="Queue and library">☰<span class="dock-count"></span></button>`;
  document.body.append(el);
  const $ = (s) => el.querySelector(s), seek = $(".dock-seek"); let scrubbing = false;

  el.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-a]"); if (!b) return; const a = b.dataset.a;
    if (a === "toggle") player.toggle(); else if (a === "next") player.next(); else if (a === "prev") player.prev();
    else if (a === "shuffle") player.setShuffle(!player.state().shuffle); else if (a === "repeat") player.cycleRepeat(); else if (a === "library") openLibrary();
  });
  seek.addEventListener("input", () => { scrubbing = true; $(".dock-cur").textContent = fmt(seek.value / 1000 * (player.audio.duration || 0)); });
  seek.addEventListener("change", () => { player.seek(seek.value / 1000); scrubbing = false; });

  function paint() {
    const s = player.state(), t = s.track, onSong = document.body.classList.contains("song-page");
    el.hidden = !t || onSong; document.documentElement.classList.toggle("pv-has-dock", !!t && !onSong); if (!t) return;
    const art = $(".dock-art"); if (art.getAttribute("src") !== t.art) art.src = t.art;
    $(".dock-title").textContent = t.title; $(".dock-sub").textContent = `${t.album} · ${t.n}`; $(".dock-track").href = t.songUrl;
    const p = $(".dock-play"); p.textContent = s.playing ? "❚❚" : "▶"; p.setAttribute("aria-label", s.playing ? "Pause" : "Play");
    $(".dock-opt[data-a=shuffle]").setAttribute("aria-pressed", String(s.shuffle));
    const r = $(".dock-opt[data-a=repeat]"); r.dataset.mode = s.repeat; r.setAttribute("aria-label", `Repeat: ${s.repeat}`);
    $(".dock-count").textContent = player.queue.snapshot().items.length || "";
    $(".dock-dur").textContent = fmt(s.duration); seek.disabled = !s.duration;
  }
  function tick(s) { if (el.hidden || scrubbing) return; seek.value = s.duration ? (s.time / s.duration) * 1000 : 0; seek.style.setProperty("--fill", (s.duration ? s.time / s.duration * 100 : 0) + "%"); $(".dock-cur").textContent = fmt(s.time); $(".dock-dur").textContent = fmt(s.duration); }
  player.on("state", paint); player.on("track", paint); player.on("time", tick);
  return { el, refresh: paint };
}
