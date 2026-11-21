// Queue engine: what plays next. No audio, no DOM, fully unit-tested.
// Natural order lives in `items`; play order is `order` (a permutation of indices), so shuffle never loses the original list.
export function createQueue({ rng = Math.random } = {}) {
  let items = [], order = [], pos = -1, shuffle = false, repeat = "off";   // repeat: off | all | one
  const subs = new Set();
  const emit = () => { const s = snapshot(); subs.forEach((f) => f(s)); };
  const idx = () => (pos >= 0 ? order[pos] : -1);

  function shuffled(indices, firstIdx) {                                   // Fisher–Yates, optional pinned first element
    const a = indices.filter((i) => i !== firstIdx);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return firstIdx != null && firstIdx >= 0 ? [firstIdx, ...a] : a;
  }
  const natural = () => items.map((_, i) => i);
  function rebuild(anchorIdx) {                                            // keep `anchorIdx` as the current track
    order = shuffle ? shuffled(natural(), anchorIdx) : natural();
    pos = items.length ? Math.max(0, order.indexOf(anchorIdx)) : -1;
  }
  function snapshot() { return { items: [...items], order: [...order], pos, shuffle, repeat, current: items[idx()] ?? null }; }

  return {
    subscribe(f) { subs.add(f); return () => subs.delete(f); },
    snapshot,
    /** Replace the queue. startId = which track to begin on (default: first, or random-first when shuffled). */
    set(ids, { startId = null, shuffle: sh = shuffle } = {}) {
      items = [...ids]; shuffle = !!sh;
      const start = startId != null && items.includes(startId) ? items.indexOf(startId) : (shuffle && items.length ? Math.floor(rng() * items.length) : 0);
      rebuild(items.length ? start : -1); emit(); return this.current();
    },
    current: () => items[idx()] ?? null,
    upcoming: () => order.slice(pos + 1).map((i) => items[i]),
    history: () => order.slice(0, Math.max(0, pos)).map((i) => items[i]),
    /** auto=true when a track ended by itself (repeat-one replays; manual next skips it). */
    next({ auto = false } = {}) {
      if (!items.length) return null;
      if (auto && repeat === "one") { emit(); return this.current(); }
      if (pos + 1 < order.length) pos++;
      else if (repeat === "all" || repeat === "one") { if (shuffle) { const last = idx(); do { order = shuffled(natural()); } while (items.length > 1 && order[0] === last); } pos = 0; }
      else { emit(); return null; }                                         // end of queue
      emit(); return this.current();
    },
    prev() { if (!items.length) return null; if (pos > 0) pos--; else if (repeat === "all") pos = order.length - 1; emit(); return this.current(); },
    jumpTo(id) { const i = items.indexOf(id); if (i < 0) return null; pos = order.indexOf(i); emit(); return id; },
    setShuffle(on) { if (on === shuffle) return; const keep = idx(); shuffle = !!on; rebuild(keep); emit(); },
    setRepeat(mode) { if (["off", "all", "one"].includes(mode)) { repeat = mode; emit(); } },
    cycleRepeat() { this.setRepeat({ off: "all", all: "one", one: "off" }[repeat]); return repeat; },
    /** Insert right after the current track ("play next"). */
    playNext(id) { items.push(id); order.splice(pos + 1, 0, items.length - 1); if (pos < 0) pos = 0; emit(); },
    /** Append to the end of the play order ("add to queue"). */
    add(id) { items.push(id); order.push(items.length - 1); if (pos < 0) pos = 0; emit(); },
    /** Remove by play-order position. */
    remove(p) {
      if (p < 0 || p >= order.length) return;
      const gone = order[p]; order.splice(p, 1); items.splice(gone, 1); order = order.map((i) => (i > gone ? i - 1 : i));
      if (p < pos) pos--; else if (p === pos && pos >= order.length) pos = order.length - 1;
      if (!order.length) pos = -1; emit();
    },
    /** Drag-to-reorder in play order; the current track stays current. */
    move(from, to) {
      if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) return;
      const cur = order[pos]; const [m] = order.splice(from, 1); order.splice(to, 0, m); pos = order.indexOf(cur); emit();
    },
    clear() { items = []; order = []; pos = -1; emit(); },
    serialize: () => ({ items: [...items], order: [...order], pos, shuffle, repeat }),
    restore(s, isValid = () => true) {                                      // drop ids that no longer exist
      if (!s || !Array.isArray(s.items) || !Array.isArray(s.order)) return false;
      const keepIdx = s.items.map((id, i) => (isValid(id) ? i : -1)), remap = new Map(); let n = 0;
      keepIdx.forEach((k) => { if (k >= 0) remap.set(k, n++); });
      items = s.items.filter((_, i) => keepIdx[i] >= 0); order = s.order.filter((i) => remap.has(i)).map((i) => remap.get(i));
      if (order.length !== items.length) { order = natural(); }
      shuffle = !!s.shuffle; repeat = ["off", "all", "one"].includes(s.repeat) ? s.repeat : "off";
      const curOld = s.order[s.pos]; pos = remap.has(curOld) ? order.indexOf(remap.get(curOld)) : (items.length ? 0 : -1);
      emit(); return true;
    },
  };
}
