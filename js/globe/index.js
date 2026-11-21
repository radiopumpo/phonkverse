import * as THREE from "../../vendor/three.module.min.js";
import { CONFIG, LOCATIONS } from "./config.js";
import { createEarth } from "./earth.js";
import { createNetwork } from "./network.js";
import { createMarkers } from "./markers.js";
import { createControls } from "./controls.js";
import { createUI } from "./ui.js";
import { bindScrollProgress } from "./scroll.js";

/** Starts the globe on the current page and returns destroy(). Called by js/pages/home.js on every visit to the home page. */
export function mount() {
  const section = document.querySelector(".world-scroll"), sticky = document.querySelector(".world-sticky");
  const stage = document.getElementById("globe-stage"), canvas = document.getElementById("phonkverse-globe");
  if (!section || !stage || !canvas) return () => {};
  const life = new AbortController();           // every window/document listener below uses life.signal
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, .1, 50);
  camera.position.z = CONFIG.zoom.home;

  const earth = createEarth(renderer), network = createNetwork();
  earth.group.add(network.group); scene.add(earth.group, earth.atmosphere);

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const controls = createControls(canvas, earth.group, camera, { reducedMotion: reduced, onRelease: () => { active = null; markers.setActive(null); ui.hide(); } });
  let active = null;
  const select = (loc) => { active = loc.id; markers.setActive(loc.id); ui.show(loc); controls.focusOn(loc.lat, loc.lon); controls.holdSpin(true); };
  const ui = createUI({ signal: life.signal, onZoom: controls.zoomBy, onReset: () => { active = null; markers.setActive(null); controls.reset(); },
    onTogglePause: controls.setPaused, onActivity: controls.poke, onClose: () => { active = null; markers.setActive(null); controls.holdSpin(false); } });
  const markers = createMarkers(stage.querySelector(".globe-markers"), earth.group, camera, select);
  bindScrollProgress(section, sticky, controls.setScroll, life.signal);

  let w = 1, h = 1;
  const resize = () => {                       // clientWidth ignores CSS transforms (getBoundingClientRect did not)
    w = Math.max(1, stage.clientWidth); h = Math.max(1, stage.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, CONFIG.maxPixelRatio));
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(stage); resize();

  let visible = true, last = performance.now(), hud = 0;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(sticky);
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); document.documentElement.classList.add("no-webgl"); });
  canvas.addEventListener("webglcontextrestored", () => document.documentElement.classList.remove("no-webgl"));

  renderer.setAnimationLoop((t) => {            // setAnimationLoop = rAF with correct iOS/WebXR handling
    const dt = Math.min(.05, (t - last) / 1000); last = t;
    if (!visible) return;
    controls.update(dt); earth.update(t / 1000, dt); network.update(t / 1000);
    markers.update(w, h);
    renderer.render(scene, camera);
    if ((hud += dt) > .15) { hud = 0; const q = earth.group.quaternion.clone().invert(), v = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
      const lat = Math.asin(v.y) * 180 / Math.PI; let lon = (Math.atan2(v.z, -v.x) * 180 / Math.PI) - 180; lon = ((lon + 540) % 360) - 180; ui.setCenter(lat, lon); }
  });

  return function destroy() {
    life.abort(); ro.disconnect(); io.disconnect(); renderer.setAnimationLoop(null);
    scene.traverse((o) => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => { x.map?.dispose?.(); x.dispose?.(); }); });
    renderer.dispose(); renderer.forceContextLoss();
  };
}
