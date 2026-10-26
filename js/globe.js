import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const canvas = document.querySelector("#phonkverse-globe");
const stage = document.querySelector("#globe-stage");
const scrollSection = document.querySelector(".world-scroll");
if (!canvas || !stage || !scrollSection) throw new Error("PHONKVERSE globe mount not found");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0, 5.3);

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const globe = new THREE.Group();
scene.add(globe);
const radius = 1.55;

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(radius, 64, 48),
  new THREE.MeshStandardMaterial({
    color: 0x0c2528, metalness: 0.25, roughness: 0.72,
    emissive: 0x06201e, emissiveIntensity: 0.65
  })
);
globe.add(sphere);

// A fine latitude/longitude cage creates a stylized, legible globe without a large texture download.
const grid = new THREE.Group();
const gridMaterial = new THREE.LineBasicMaterial({ color: 0x57e8c1, transparent: true, opacity: 0.38 });
for (let lat = -75; lat <= 75; lat += 15) {
  const points = [];
  const phi = THREE.MathUtils.degToRad(90 - lat);
  for (let i = 0; i <= 180; i++) {
    const theta = i / 180 * Math.PI * 2;
    points.push(new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    ));
  }
  grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMaterial));
}
for (let lon = 0; lon < 180; lon += 15) {
  const points = [];
  const theta = THREE.MathUtils.degToRad(lon);
  for (let i = 0; i <= 180; i++) {
    const phi = i / 180 * Math.PI;
    points.push(new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    ));
  }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMaterial);
  grid.add(line);
  const mirrored = line.clone();
  mirrored.rotation.y = Math.PI;
  grid.add(mirrored);
}
globe.add(grid);

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(radius * 1.035, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0x3effcf, transparent: true, opacity: 0.055, side: THREE.BackSide })
);
globe.add(atmosphere);

scene.add(new THREE.HemisphereLight(0x8bffe9, 0x12131b, 2.1));
const keyLight = new THREE.PointLight(0x72ffe1, 18, 10);
keyLight.position.set(-3, 2, 4);
scene.add(keyLight);
const warmLight = new THREE.PointLight(0xff543c, 11, 10);
warmLight.position.set(3, -1, -2);
scene.add(warmLight);

const locations = [
  { id: "italy", name: "PHONKITA", region: "ITALY · EUROPE", lat: 41.9, lon: 12.5,
    description: "The Italian phonk movement: regional identity, underground sound and a new cultural voice.", href: "phonkita.html", color: 0x4ce0b1 },
  { id: "spain", name: "PHONKAZO", region: "SPAIN · EUROPE", lat: 40.4, lon: -3.7,
    description: "The Spanish phonk movement: irreverence, sharp bars and a scene built to travel beyond borders.", href: "phonkazo.html", color: 0xff7059 },
  { id: "verse", name: "THE WIDER VERSE", region: "GLOBAL · OPEN MAP", lat: 18, lon: -35,
    description: "PHONKVERSE is an open cultural map. Future pins can represent local scenes, creators, events and crews.", href: "#ecosystem", color: 0xcaff3b }
];
const pinObjects = [];
const pinGeometry = new THREE.SphereGeometry(0.055, 16, 12);
locations.forEach((loc) => {
  const material = new THREE.MeshBasicMaterial({ color: loc.color });
  const pin = new THREE.Mesh(pinGeometry, material);
  const phi = THREE.MathUtils.degToRad(90 - loc.lat);
  const theta = THREE.MathUtils.degToRad(loc.lon + 180);
  pin.position.set(
    (radius + 0.035) * Math.sin(phi) * Math.cos(theta),
    (radius + 0.035) * Math.cos(phi),
    (radius + 0.035) * Math.sin(phi) * Math.sin(theta)
  );
  pin.userData.location = loc;
  globe.add(pin);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.105, 16, 12),
    new THREE.MeshBasicMaterial({ color: loc.color, transparent: true, opacity: 0.23 })
  );
  halo.position.copy(pin.position);
  globe.add(halo);
  pinObjects.push(pin);
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const poiCard = document.querySelector("#poi-card");
const poiTitle = document.querySelector("#poi-title");
const poiRegion = document.querySelector("#poi-region");
const poiDescription = document.querySelector("#poi-description");
const poiLink = document.querySelector("#poi-link");
const coordinates = document.querySelector("#globe-coordinates");
const hint = document.querySelector("#globe-hint");
let targetZoom = 5.3;
let dragging = false, moved = false, lastX = 0, lastY = 0;
let scrollProgress = 0;
let userInteracted = false;
let lastTime = 0;

function showLocation(loc) {
  poiTitle.textContent = loc.name;
  poiRegion.textContent = loc.region;
  poiDescription.textContent = loc.description;
  poiLink.href = loc.href;
  poiLink.textContent = loc.id === "verse" ? "Explore the ecosystem ↗" : `Discover ${loc.name} ↗`;
  poiCard.classList.add("is-open");
  coordinates.textContent = loc.region;
  hint.textContent = "PIN SELECTED · CLOSE THE CARD TO KEEP EXPLORING";
}
function hideLocation() {
  poiCard.classList.remove("is-open");
  coordinates.textContent = "ROTATE / EXPLORE";
  hint.textContent = "DRAG TO ROTATE · SCROLL TO ZOOM · TAP A PIN";
}
function setSize() {
  const rect = stage.getBoundingClientRect();
  const size = Math.max(1, Math.round(Math.min(rect.width, rect.height)));
  renderer.setSize(size, size, false);
  camera.aspect = 1;
  camera.updateProjectionMatrix();
}
function pointerFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}
function selectPin(event) {
  pointerFromEvent(event);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pinObjects, false)[0];
  if (hit) showLocation(hit.object.userData.location);
}
canvas.addEventListener("pointerdown", (e) => {
  dragging = true; moved = false; userInteracted = true; lastX = e.clientX; lastY = e.clientY;
  canvas.setPointerCapture?.(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
  globe.rotation.y += dx * 0.008;
  globe.rotation.x += dy * 0.006;
  globe.rotation.x = THREE.MathUtils.clamp(globe.rotation.x, -1.15, 1.15);
  lastX = e.clientX; lastY = e.clientY;
});
canvas.addEventListener("pointerup", (e) => {
  if (dragging && !moved) selectPin(e);
  dragging = false;
});
canvas.addEventListener("pointercancel", () => { dragging = false; });
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  targetZoom = THREE.MathUtils.clamp(targetZoom + e.deltaY * 0.003, 3.3, 8.5);
  userInteracted = true;
}, { passive: false });
document.querySelector("#globe-zoom-in").addEventListener("click", () => { targetZoom = Math.max(3.3, targetZoom - 0.45); userInteracted = true; });
document.querySelector("#globe-zoom-out").addEventListener("click", () => { targetZoom = Math.min(8.5, targetZoom + 0.45); userInteracted = true; });
document.querySelector("#globe-reset").addEventListener("click", () => {
  targetZoom = 5.3; globe.rotation.set(0, 0, 0); userInteracted = false; hideLocation();
});
document.querySelector("#poi-close").addEventListener("click", hideLocation);

function onScroll() {
  const rect = scrollSection.getBoundingClientRect();
  const total = Math.max(1, scrollSection.offsetHeight - window.innerHeight);
  scrollProgress = THREE.MathUtils.clamp(-rect.top / total, 0, 1);
  const scale = 0.72 + scrollProgress * 0.34;
  stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  const sideTravel = 30 + scrollProgress * 16;
  const avatarOpacity = Math.max(0.15, 1 - Math.max(0, scrollProgress - 0.78) * 3.5);
  document.querySelector("#avatar-italy").style.transform = `translate(${-scrollProgress * sideTravel}vw, -50%)`;
  document.querySelector("#avatar-spain").style.transform = `translate(${scrollProgress * sideTravel}vw, -50%)`;
  document.querySelector("#avatar-italy").style.opacity = avatarOpacity;
  document.querySelector("#avatar-spain").style.opacity = avatarOpacity;
  document.querySelector("#world-progress-label").textContent =
    scrollProgress < 0.25 ? "01 — DISCOVER" : scrollProgress < 0.7 ? "02 — INTERACT" : "03 — ENTER THE VERSE";
}
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", setSize);
setSize(); onScroll();

function animate(time) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (time - lastTime) / 1000 || 0.016); lastTime = time;
  if (!dragging && !userInteracted && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    globe.rotation.y += dt * 0.08;
  }
  camera.position.z += (targetZoom - camera.position.z) * 0.09;
  pinObjects.forEach((pin, i) => {
    const pulse = 1 + Math.sin(time * 0.003 + i * 1.8) * 0.14;
    pin.scale.setScalar(pulse);
  });
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
