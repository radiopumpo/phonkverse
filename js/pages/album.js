// Album page lifecycle: wires the existing track rows to the global player (no per-page audio any more).
export function mount({ pv }) {
  const { player, catalog } = pv, rows = [...document.querySelectorAll(".track-row")];
  const albumKey = catalog.tracks.find((t) => document.querySelector(`.track-action[data-src="${t.src}"]`))?.albumKey;
  if (!albumKey) return;
  const ctxSpec = `album:${albumKey}`;

  const items = rows.map((row) => {
    const btn = row.querySelector(".track-action[data-src]"), t = btn && catalog.tracks.find((x) => x.src === btn.dataset.src);
    if (!t) return null;
    btn.dataset.pv = "play"; btn.dataset.ctx = ctxSpec; btn.dataset.start = t.id; btn.setAttribute("aria-pressed", "false");
    let wrap = btn.parentElement.classList.contains("track-btns") ? btn.parentElement : null;
    if (!wrap) { wrap = document.createElement("div"); wrap.className = "track-btns"; btn.replaceWith(wrap); wrap.append(btn); }
    if (!wrap.querySelector(".track-more")) wrap.insertAdjacentHTML("afterbegin", `<button type="button" class="track-more" data-pv="menu" data-start="${t.id}" aria-label="Add ${t.title.replace(/"/g, "")} to queue or playlist">＋</button>`);
    return { row, btn, t };
  }).filter(Boolean);

  const head = document.querySelector(".tracklist-heading");
  if (head && !head.querySelector(".tracklist-actions")) head.insertAdjacentHTML("afterend", `<div class="tracklist-actions"><button type="button" class="button button-lime" data-pv="play" data-ctx="${ctxSpec}">▶ Play all</button><button type="button" class="button button-ghost" data-pv="shuffle" data-ctx="${ctxSpec}">⤮ Shuffle</button></div>`);

  const note = document.querySelector(".track-note"), defaultNote = note?.textContent;
  const paint = (s) => items.forEach(({ row, btn, t }) => { const on = s.id === t.id, playing = on && s.playing; row.classList.toggle("is-playing", on); btn.textContent = playing ? "❚❚" : "▶"; btn.setAttribute("aria-pressed", String(playing)); if (!on) row.style.setProperty("--prog", "0%"); });
  const time = (s) => { const it = items.find((x) => x.t.id === s.id); if (it && s.duration) it.row.style.setProperty("--prog", (s.time / s.duration * 100).toFixed(1) + "%"); };
  paint(player.state());
  const off = [player.on("state", (s) => { paint(s); if (note && s.playing) note.textContent = defaultNote; }), player.on("time", time),
    player.on("error", (t) => { if (note && t && items.some((x) => x.t.id === t.id)) note.textContent = `This track isn’t available yet — upload ${t.src}`; })];
  return () => off.forEach((f) => f());
}
