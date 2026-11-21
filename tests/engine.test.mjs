import test from "node:test"; import assert from "node:assert/strict";
import { createPlayer } from "../js/music/engine.js";
import { createCatalog } from "../js/music/catalog.js";

class FakeAudio { constructor() { this.l = {}; this.paused = true; this.currentTime = 0; this.duration = NaN; this.src = ""; }
  addEventListener(e, f) { (this.l[e] ||= []).push(f); } fire(e) { (this.l[e] || []).forEach((f) => f()); }
  load() {} play() { this.paused = false; this.fire("play"); return Promise.resolve(); } pause() { this.paused = true; this.fire("pause"); } }
const albums = { a: { name: "A", page: "a.html", art: "a.jpg", palette: ["#fff"], tracks: ["01", "02", "03"].map((n) => ({ n, title: "T" + n, mood: "", desc: "", src: `a/${n}.mp3` })) } };
const mk = () => { const store = new Map(); const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  return { p: createPlayer({ catalog: createCatalog(albums, {}, {}), audioFactory: () => new FakeAudio(), storage, win: null }), storage }; };

test("playContext starts the first track, ended advances, end of queue stops", () => {
  const { p } = mk(); p.playContext(["a:01", "a:02", "a:03"]); assert.equal(p.state().id, "a:01"); assert.equal(p.audio.paused, false); assert.ok(p.audio.src.endsWith("a/01.mp3"));
  p.audio.fire("ended"); assert.equal(p.state().id, "a:02"); p.audio.fire("ended"); p.audio.fire("ended"); assert.equal(p.state().id, "a:03");
});
test("repeat-one replays; repeat-all wraps", () => {
  const { p } = mk(); p.playContext(["a:01", "a:02"]); p.queue.setRepeat("one"); p.audio.currentTime = 50; p.audio.fire("ended"); assert.equal(p.state().id, "a:01"); assert.equal(p.audio.currentTime, 0);
  p.queue.setRepeat("all"); p.audio.fire("ended"); p.audio.fire("ended"); assert.equal(p.state().id, "a:01");
});
test("a failing file is skipped, but a fully broken queue does not loop forever", () => {
  const { p } = mk(); p.playContext(["a:01", "a:02", "a:03"]); let errors = 0; p.on("error", () => errors++);
  p.audio.fire("error"); assert.equal(p.state().id, "a:02"); p.audio.fire("error"); p.audio.fire("error"); p.audio.fire("error"); p.audio.fire("error"); assert.ok(errors >= 3); assert.ok(errors < 10);
});
test("prev restarts the track after 3s, otherwise goes back; next keeps paused state", () => {
  const { p } = mk(); p.playContext(["a:01", "a:02", "a:03"], "a:02"); p.audio.currentTime = 10; p.prev(); assert.equal(p.state().id, "a:02"); assert.equal(p.audio.currentTime, 0); p.prev(); assert.equal(p.state().id, "a:01");
  p.pause(); p.next(); assert.equal(p.state().id, "a:02"); assert.equal(p.audio.paused, true);
});
test("session is saved and restored paused at the same track and position", () => {
  const { p, storage } = mk(); p.playContext(["a:01", "a:02", "a:03"], "a:03", { shuffle: false }); p.audio.currentTime = 42; p.pause(); p.save();
  const q = createPlayer({ catalog: createCatalog(albums, {}, {}), audioFactory: () => new FakeAudio(), storage, win: null }); assert.equal(q.restore(), true); assert.equal(q.state().id, "a:03"); assert.equal(q.audio.paused, true);
  q.audio.duration = 200; q.audio.fire("loadedmetadata"); assert.equal(q.audio.currentTime, 42);
  assert.equal(createPlayer({ catalog: createCatalog(albums, {}, {}), audioFactory: () => new FakeAudio(), storage: { getItem: () => "junk", setItem() {} }, win: null }).restore(), false);
});
test("unknown ids are ignored; empty context does nothing", () => {
  const { p } = mk(); p.playContext(["zzz:99"]); assert.equal(p.state().id, null); p.playContext(["zzz:99", "a:02"]); assert.equal(p.state().id, "a:02");
});

test("after every file failed, the element is stopped, and a new context can skip failures again", () => {
  const { p } = mk(); p.playContext(["a:01", "a:02"]); p.audio.fire("error"); p.audio.fire("error"); assert.equal(p.audio.paused, true);
  p.playContext(["a:01", "a:02", "a:03"]); p.audio.fire("error"); assert.equal(p.state().id, "a:02"); assert.equal(p.audio.paused, false);
});
