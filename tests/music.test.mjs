import test from "node:test"; import assert from "node:assert/strict";
import { createQueue } from "../js/music/queue.js";
import { createCatalog, catalog } from "../js/music/catalog.js";
import { createPlaylistStore, encodeShare, decodeShare } from "../js/music/playlists.js";
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
const IDS = ["a:01", "a:02", "a:03", "b:01"];

test("queue: in order, end of queue, repeat all/one", () => {
  const q = createQueue(); assert.equal(q.set(IDS), "a:01");
  assert.equal(q.next(), "a:02"); assert.equal(q.next(), "a:03"); assert.equal(q.next(), "b:01"); assert.equal(q.next(), null);
  q.setRepeat("all"); assert.equal(q.next(), "a:01"); assert.equal(q.prev(), "b:01");
  q.setRepeat("one"); assert.equal(q.next({ auto: true }), "b:01"); assert.equal(q.next(), "a:01");   // manual next still skips
});
test("queue: shuffle keeps start track first, plays every track once, previous works", () => {
  const q = createQueue({ rng: seq([0.7, 0.1, 0.5, 0.9, 0.3]) }); q.set(IDS, { startId: "a:03", shuffle: true });
  assert.equal(q.current(), "a:03"); const seen = [q.current()]; let n; while ((n = q.next())) seen.push(n);
  assert.deepEqual([...seen].sort(), [...IDS].sort()); assert.equal(q.prev(), seen[seen.length - 2]);
});
test("queue: toggling shuffle never changes the current track", () => {
  const q = createQueue(); q.set(IDS); q.next(); q.setShuffle(true); assert.equal(q.current(), "a:02"); q.setShuffle(false); assert.equal(q.current(), "a:02"); assert.equal(q.next(), "a:03");
});
test("queue: playNext, add, remove, move", () => {
  const q = createQueue(); q.set(IDS); q.playNext("z:01"); assert.deepEqual(q.upcoming().slice(0, 1), ["z:01"]); q.add("z:02"); assert.equal(q.upcoming().at(-1), "z:02");
  q.remove(1); assert.equal(q.upcoming()[0], "a:02"); q.next(); q.move(2, 1); assert.equal(q.current(), "a:02"); assert.equal(q.upcoming()[0], "b:01");
  q.remove(1); assert.equal(q.current(), "a:02");   // removing a track before current keeps current
  q.set(["x"]); q.remove(0); assert.equal(q.current(), null);
});
test("queue: serialize/restore drops tracks that no longer exist", () => {
  const q = createQueue(); q.set(IDS); q.next(); q.next(); const s = q.serialize();
  const r = createQueue(); r.restore(s, (id) => id !== "a:01"); assert.equal(r.current(), "a:03"); assert.deepEqual(r.snapshot().items, ["a:02", "a:03", "b:01"]);
  assert.equal(createQueue().restore({ nonsense: 1 }), false);
});

test("catalogue: 34 unique tracks, every track has a country, Phonkhan splits India/Pakistan", () => {
  assert.equal(catalog.tracks.length, 34); assert.equal(new Set(catalog.tracks.map((t) => t.id)).size, 34);
  assert.ok(catalog.tracks.every((t) => t.countries.length && t.genres.length && t.src.endsWith(".mp3")));
  const c = Object.fromEntries(catalog.byCountry().map((x) => [x.code, x.tracks.map((t) => t.id)]));
  assert.deepEqual(c.IN.sort(), ["phonkhan:01", "phonkhan:02"]); assert.deepEqual(c.PK.sort(), ["phonkhan:01", "phonkhan:03"]);
  assert.equal(c["GB-ENG"].length, 5); assert.ok(catalog.byGenre().find((g) => g.name === "grime").tracks.length >= 2);
  assert.equal(catalog.get("phonkami:02").title, "Akai Tsuki (赤い月)"); assert.deepEqual(catalog.resolve(["phonkami:01", "nope:99"]).missing, ["nope:99"]);
  assert.equal(catalog.search("kage")[0].id, "phonkami:01");
});
test("catalogue: new countries/genres appear automatically from tags", () => {
  const cat = createCatalog({ x: { name: "X", page: "x.html", art: "x.jpg", palette: ["#fff"], tracks: [{ n: "01", title: "T", mood: "m", desc: "d", src: "a.mp3" }] } }, { x: { countries: ["BR"], genres: ["baile funk"] } }, {});
  assert.equal(cat.byCountry()[0].name, "Brazil"); assert.equal(cat.byGenre()[0].name, "baile funk");
});

test("playlists: CRUD, dedupe, reorder, persistence", () => {
  const st = mem(); const p = createPlaylistStore({ storage: st, uid: seq(["p1", "p2"]) }); const id = p.create("  Night drive ");
  assert.equal(p.get(id).name, "Night drive"); assert.equal(p.add(id, ["a:01", "a:02", "a:01"]), 2); assert.equal(p.add(id, ["a:01"]), 0);
  p.add(id, ["a:03"]); p.move(id, 2, 0); assert.deepEqual(p.get(id).tracks, ["a:03", "a:01", "a:02"]); p.removeAt(id, 1); assert.deepEqual(p.get(id).tracks, ["a:03", "a:02"]);
  const again = createPlaylistStore({ storage: st }); assert.equal(again.list().length, 1); again.rename(id, ""); assert.equal(again.get(id).name, "Untitled playlist"); again.remove(id); assert.equal(again.list().length, 0);
});
test("playlists: export/import round-trip and bad input", () => {
  const a = createPlaylistStore({ storage: mem() }); a.create("One", ["phonkami:01"]); const json = a.exportJSON();
  const b = createPlaylistStore({ storage: mem() }); assert.deepEqual(b.importJSON(json), { added: 1, skipped: 0 }); assert.equal(b.list()[0].tracks[0], "phonkami:01");
  assert.ok(b.importJSON("{{{").error); assert.ok(b.importJSON('{"app":"other"}').error);
  assert.equal(createPlaylistStore({ storage: { getItem: () => "garbage", setItem() {} } }).list().length, 0);
  const m = createPlaylistStore({ storage: mem() }); const id = m.create("Gone", ["phonkami:01", "old:99"]); assert.deepEqual(m.resolve(id, catalog).missing, ["old:99"]);
});
test("share links: round-trip, grouping, garbage and unknown ids", () => {
  const ids = ["phonkita:03", "phonkita:01", "phonkami:02", "phonkita:05"]; const tok = encodeShare("My mix & more", ids);
  assert.equal(tok, "My%20mix%20%26%20more!phonkita.03,01_phonkami.02_phonkita.05"); const d = decodeShare(tok, catalog);
  assert.equal(d.name, "My mix & more"); assert.deepEqual(d.ids, ids);
  assert.deepEqual(decodeShare("x!nope.01_phonkami.01", catalog), { name: "x", ids: ["phonkami:01"], missing: ["nope:01"] });
  assert.deepEqual(decodeShare("%E0%A4%A", catalog).ids, []); assert.deepEqual(decodeShare("", catalog).ids, []);
});

import { contextIds } from "../js/music/context.js";
test("contexts resolve groups consistently", () => {
  const playlists = createPlaylistStore({ storage: mem() }); const id = playlists.create("x", ["phonkami:02", "gone:01", "phonkita:01"]); const env = { catalog, playlists };
  assert.equal(contextIds("all", env).length, 34); assert.equal(contextIds("album:phonkdon", env).length, 5);
  assert.deepEqual(contextIds("country:PK", env).sort(), ["phonkhan:01", "phonkhan:03"]); assert.ok(contextIds("genre:grime", env).includes("phonke:01"));
  assert.deepEqual(contextIds(`playlist:${id}`, env), ["phonkami:02", "phonkita:01"]); assert.deepEqual(contextIds("ids:phonkami:01,nope:1", env), ["phonkami:01"]); assert.deepEqual(contextIds("zzz", env), []);
});
