// Library & queue sheet + track menu + toast. All data comes from the catalogue / playlist store; all playing goes through the player.
import { encodeShare } from "../music/playlists.js";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const TABS = [["queue", "Queue"], ["countries", "Countries"], ["genres", "Genres"], ["voices", "Voices"], ["playlists", "Playlists"]];

export function createLibrary({ player, catalog, playlists, ctx }) {
  let tab = "queue", shared = null; const q = player.queue;
  const root = document.createElement("section");
  root.id = "pv-library"; root.setAttribute("data-persist", ""); root.hidden = true; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Queue and library");
  root.innerHTML = `<div class="lib-backdrop" data-act="close"></div><div class="lib-sheet"><header class="lib-head"><div class="lib-tabs" role="tablist"></div><button type="button" class="lib-close" data-act="close" aria-label="Close">✕</button></header><div class="lib-body"></div></div>`;
  const menu = document.createElement("div"); menu.id = "pv-menu"; menu.setAttribute("data-persist", ""); menu.hidden = true; menu.setAttribute("role", "menu");
  const toastEl = document.createElement("div"); toastEl.id = "pv-toast"; toastEl.setAttribute("data-persist", ""); toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-live", "polite");
  document.body.append(root, menu, toastEl);
  const body = root.querySelector(".lib-body"), tabs = root.querySelector(".lib-tabs");

  let toastT; const toast = (m) => { toastEl.textContent = m; toastEl.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), 2400); };
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

  /* ---------- row + group templates ---------- */
  const row = (t, extra = "", ctxSpec = "") => `<li class="lib-row${player.state().id === t.id ? " is-current" : ""}" data-id="${t.id}">
      <button type="button" class="lib-play" data-act="play-track" data-id="${t.id}" data-ctx="${esc(ctxSpec)}" aria-label="Play ${esc(t.title)}">▶</button>
      <span class="lib-title"><b>${esc(t.title)}</b><small>${esc(t.album)}</small></span>${extra}
      <button type="button" class="lib-icon" data-act="menu" data-id="${t.id}" aria-label="More actions for ${esc(t.title)}">＋</button></li>`;
  const group = (title, count, spec, tracks, open = false) => `<details class="lib-group"${open ? " open" : ""}><summary><span class="lib-gname">${esc(title)} <em>${count}</em></span>
      <span class="lib-gact"><button type="button" class="lib-icon" data-act="play-ctx" data-ctx="${esc(spec)}" aria-label="Play ${esc(title)}">▶</button><button type="button" class="lib-icon" data-act="shuffle-ctx" data-ctx="${esc(spec)}" aria-label="Shuffle ${esc(title)}">⤮</button></span></summary>
      <ul class="lib-list">${tracks.map((t) => row(t, "", spec)).join("")}</ul></details>`;

  /* ---------- tabs ---------- */
  function viewQueue() {
    const s = q.snapshot(), cur = s.pos;
    if (!s.items.length) return `<p class="lib-empty">Nothing queued yet. Press ▶ on any track, album, country or genre — or shuffle the whole world.</p><div class="lib-actions"><button class="lib-btn primary" data-act="shuffle-ctx" data-ctx="all">⤮ Shuffle everything</button></div>`;
    const items = s.order.map((i, p) => ({ t: catalog.get(s.items[i]), p })).filter((x) => x.t);
    return `<div class="lib-actions"><button class="lib-btn${s.shuffle ? " on" : ""}" data-act="shuffle">⤮ Shuffle ${s.shuffle ? "on" : "off"}</button><button class="lib-btn${s.repeat !== "off" ? " on" : ""}" data-act="repeat">↻ Repeat: ${s.repeat}</button><button class="lib-btn" data-act="save-queue">Save as playlist</button><button class="lib-btn" data-act="clear">Clear</button></div>
      <ul class="lib-list queue">${items.map(({ t, p }) => `<li class="lib-row${p === cur ? " is-current" : ""}${p < cur ? " is-past" : ""}">
        <button type="button" class="lib-play" data-act="jump" data-id="${t.id}" aria-label="Play ${esc(t.title)}">${p === cur ? (player.state().playing ? "❚❚" : "▶") : "▶"}</button>
        <span class="lib-title"><b>${esc(t.title)}</b><small>${esc(t.album)}</small></span>
        <button type="button" class="lib-icon" data-act="q-up" data-pos="${p}" aria-label="Move up">▲</button><button type="button" class="lib-icon" data-act="q-down" data-pos="${p}" aria-label="Move down">▼</button><button type="button" class="lib-icon" data-act="q-remove" data-pos="${p}" aria-label="Remove from queue">✕</button></li>`).join("")}</ul>`;
  }
  const viewCountries = () => catalog.byCountry().map((c) => group(c.name + (c.region ? ` · ${c.region}` : ""), c.tracks.length, `country:${c.code}`, c.tracks)).join("");
  const viewGenres = () => catalog.byGenre().map((g) => group(g.name, g.tracks.length, `genre:${g.name}`, g.tracks)).join("");
  const viewVoices = () => `<div class="lib-actions"><button class="lib-btn primary" data-act="shuffle-ctx" data-ctx="all">⤮ Shuffle the whole world</button><button class="lib-btn" data-act="play-ctx" data-ctx="all">▶ Play everything in order</button></div>` + catalog.byAlbum().map((a) => group(a.name, a.tracks.length, `album:${a.key}`, a.tracks)).join("");
  function viewPlaylists() {
    const lists = playlists.list();
    const sharedBanner = shared ? `<div class="lib-shared"><b>${esc(shared.name)}</b> <small>shared playlist · ${plural(shared.ids.length, "track")}${shared.missing.length ? ` (${shared.missing.length} unavailable)` : ""}</small><div class="lib-actions"><button class="lib-btn primary" data-act="shared-play">▶ Play</button><button class="lib-btn" data-act="shared-save">Save to my playlists</button><button class="lib-btn" data-act="shared-dismiss">Dismiss</button></div></div>` : "";
    return sharedBanner + `<div class="lib-actions"><button class="lib-btn primary" data-act="pl-new">＋ New playlist</button><button class="lib-btn" data-act="pl-import">Import</button><button class="lib-btn" data-act="pl-export"${lists.length ? "" : " disabled"}>Export all</button><input type="file" accept="application/json,.json" hidden id="pl-file"></div>`
      + (lists.length ? lists.map((l) => { const { found, missing } = playlists.resolve(l.id, catalog);
        return `<details class="lib-group" data-pl="${l.id}"><summary><span class="lib-gname">${esc(l.name)} <em>${l.tracks.length}</em></span><span class="lib-gact"><button type="button" class="lib-icon" data-act="play-ctx" data-ctx="playlist:${l.id}" aria-label="Play ${esc(l.name)}">▶</button><button type="button" class="lib-icon" data-act="shuffle-ctx" data-ctx="playlist:${l.id}" aria-label="Shuffle ${esc(l.name)}">⤮</button></span></summary>
          <ul class="lib-list">${found.map((t, i) => row(t, `<button type="button" class="lib-icon" data-act="pl-up" data-pl="${l.id}" data-i="${i}" aria-label="Move up">▲</button><button type="button" class="lib-icon" data-act="pl-down" data-pl="${l.id}" data-i="${i}" aria-label="Move down">▼</button><button type="button" class="lib-icon" data-act="pl-remove" data-pl="${l.id}" data-i="${i}" aria-label="Remove">✕</button>`, `playlist:${l.id}`).replace(/<button type="button" class="lib-icon" data-act="menu"[^>]*>＋<\/button>/, "")).join("") || `<li class="lib-empty">Empty — add tracks with ＋ anywhere.</li>`}${missing.length ? `<li class="lib-empty">${plural(missing.length, "track")} no longer available</li>` : ""}</ul>
          <div class="lib-actions"><button class="lib-btn" data-act="pl-rename" data-pl="${l.id}">Rename</button><button class="lib-btn" data-act="pl-share" data-pl="${l.id}">Share link</button><button class="lib-btn danger" data-act="pl-delete" data-pl="${l.id}">Delete</button></div></details>`; }).join("")
        : `<p class="lib-empty">No playlists yet. Create one, then add tracks with the ＋ button on any song.</p>`);
  }
  const VIEWS = { queue: viewQueue, countries: viewCountries, genres: viewGenres, voices: viewVoices, playlists: viewPlaylists };

  function render() {
    tabs.innerHTML = TABS.map(([k, l]) => `<button type="button" role="tab" class="lib-tab${k === tab ? " on" : ""}" aria-selected="${k === tab}" data-act="tab" data-tab="${k}">${l}</button>`).join("");
    const open = new Set([...body.querySelectorAll("details[open]")].map((d) => d.dataset.pl || d.querySelector(".lib-gname")?.textContent));   // keep groups open across re-renders
    const keep = body.scrollTop; body.innerHTML = VIEWS[tab]();
    body.querySelectorAll("details").forEach((d) => { if (open.has(d.dataset.pl || d.querySelector(".lib-gname")?.textContent)) d.open = true; }); body.scrollTop = keep;
  }
  const refresh = () => { if (!root.hidden) render(); };
  player.on("track", refresh); q.subscribe(refresh); playlists.subscribe(refresh);
  player.on("state", (() => { let last = ""; return (s) => { const k = `${s.playing}|${s.id}`; if (k !== last) { last = k; refresh(); } }; })());

  function open(t = tab) { tab = t; root.hidden = false; document.documentElement.classList.add("pv-lib-open"); render(); root.querySelector(".lib-close").focus(); }
  function close() { root.hidden = true; document.documentElement.classList.remove("pv-lib-open"); }

  /* ---------- track menu (play next / add to queue / add to playlist) ---------- */
  function closeMenu() { menu.hidden = true; menu.innerHTML = ""; }
  function openTrackMenu(anchor, id, mode = "main") {
    const t = catalog.get(id); if (!t) return;
    const lists = playlists.list();
    menu.innerHTML = mode === "main"
      ? `<p class="menu-title">${esc(t.title)}</p><button role="menuitem" data-m="next">Play next</button><button role="menuitem" data-m="queue">Add to queue</button><button role="menuitem" data-m="pl">Add to playlist…</button><a role="menuitem" href="${t.songUrl}">Open song page</a>`
      : `<p class="menu-title">Add to playlist</p>${lists.map((l) => `<button role="menuitem" data-m="add" data-pl="${l.id}">${esc(l.name)} <small>${l.tracks.length}</small></button>`).join("")}<button role="menuitem" data-m="new">＋ New playlist…</button>`;
    menu.dataset.id = id; menu.hidden = false;
    const r = anchor.getBoundingClientRect(), w = menu.offsetWidth, h = menu.offsetHeight;
    menu.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + "px"; menu.style.top = Math.max(8, Math.min(innerHeight - h - 8, r.bottom + 6)) + "px"; menu._anchor = anchor;
    menu.querySelector("button,a")?.focus();
  }
  menu.addEventListener("click", (e) => {
    const b = e.target.closest("[data-m]"), id = menu.dataset.id, t = catalog.get(id); if (!b) { closeMenu(); return; }
    const m = b.dataset.m;
    if (m === "next") { player.playNext(id); toast(`“${t.title}” plays next`); closeMenu(); }
    else if (m === "queue") { player.addToQueue(id); toast(`Added “${t.title}” to the queue`); closeMenu(); }
    else if (m === "pl") openTrackMenu(menu._anchor, id, "pl");
    else if (m === "add") { const n = playlists.add(b.dataset.pl, [id]); toast(n ? `Added to “${playlists.get(b.dataset.pl).name}”` : "Already in that playlist"); closeMenu(); }
    else if (m === "new") { const name = prompt("Name your playlist:"); if (name !== null) { const pid = playlists.create(name, [id]); toast(`Created “${playlists.get(pid).name}”`); } closeMenu(); }
  });
  document.addEventListener("click", (e) => { if (!menu.hidden && !e.composedPath().includes(menu) && !e.target.closest('[data-act="menu"],[data-pv="menu"]')) closeMenu(); });   // composedPath: the tapped button may already have been re-rendered away
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!menu.hidden) closeMenu(); else if (!root.hidden) close(); } });

  /* ---------- actions ---------- */
  const pls = (id) => playlists.get(id);
  root.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return; if (b.closest("summary")) e.preventDefault();
    const a = b.dataset.act, id = b.dataset.id, pos = +b.dataset.pos, i = +b.dataset.i, pid = b.dataset.pl;
    switch (a) {
      case "close": close(); break;
      case "tab": tab = b.dataset.tab; render(); break;
      case "play-track": { const ids = b.dataset.ctx ? ctx(b.dataset.ctx) : [id]; if (player.state().id === id) player.toggle(); else player.playContext(ids, id, { shuffle: false }); break; }
      case "play-ctx": player.playContext(ctx(b.dataset.ctx), null, { shuffle: false }); toast("Playing"); break;
      case "shuffle-ctx": player.playContext(ctx(b.dataset.ctx), null, { shuffle: true }); toast("Shuffling"); break;
      case "menu": openTrackMenu(b, id); break;
      case "shuffle": player.setShuffle(!q.snapshot().shuffle); break;
      case "repeat": player.cycleRepeat(); break;
      case "clear": q.clear(); player.pause(); break;
      case "jump": player.jumpTo(id); break;
      case "q-up": q.move(pos, pos - 1); break; case "q-down": q.move(pos, pos + 1); break; case "q-remove": q.remove(pos); break;
      case "save-queue": { const name = prompt("Name this playlist:", "My queue"); if (name !== null) { playlists.create(name, [...new Set(q.snapshot().order.map((k) => q.snapshot().items[k]))]); toast("Playlist saved"); tab = "playlists"; render(); } break; }
      case "pl-new": { const name = prompt("Name your playlist:"); if (name !== null) playlists.create(name); break; }
      case "pl-rename": { const name = prompt("Rename playlist:", pls(pid).name); if (name !== null) playlists.rename(pid, name); break; }
      case "pl-delete": if (confirm(`Delete “${pls(pid).name}”?`)) playlists.remove(pid); break;
      case "pl-up": playlists.move(pid, i, i - 1); break; case "pl-down": playlists.move(pid, i, i + 1); break;
      case "pl-remove": playlists.removeAt(pid, i); break;
      case "pl-share": { const l = pls(pid), url = `${location.origin}${location.pathname.replace(/[^/]*$/, "")}index.html?pl=${encodeShare(l.name, l.tracks)}`;
        try { if (navigator.share) await navigator.share({ title: l.name, text: `${l.name} on PHONKVERSE`, url }); else { await navigator.clipboard.writeText(url); toast("Link copied"); } } catch (err) { if (err.name !== "AbortError") prompt("Copy this link:", url); } break; }
      case "pl-export": { const blob = new Blob([playlists.exportJSON()], { type: "application/json" }), a2 = document.createElement("a"); a2.href = URL.createObjectURL(blob); a2.download = "phonkverse-playlists.json"; a2.click(); setTimeout(() => URL.revokeObjectURL(a2.href), 2000); break; }
      case "pl-import": body.querySelector("#pl-file").click(); break;
      case "shared-play": player.playContext(shared.ids, null, { shuffle: false }); shared = null; close(); break;
      case "shared-save": playlists.create(shared.name, shared.ids); toast("Saved to your playlists"); shared = null; render(); break;
      case "shared-dismiss": shared = null; render(); break;
    }
  });
  root.addEventListener("change", async (e) => {
    if (e.target.id !== "pl-file" || !e.target.files[0]) return; const r = playlists.importJSON(await e.target.files[0].text());
    toast(r.error ? r.error : `Imported ${plural(r.added, "playlist")}`);
  });

  return { open, close, openTrackMenu, closeMenu, toast, showShared(d) { shared = d; open("playlists"); } };
}
