import * as THREE from "../../vendor/three.module.min.js";
import { CONFIG, LOCATIONS } from "./config.js";
import { latLonToVec3 } from "./geo.js";

/**
 * Clickable POIs as real <button>s projected onto the canvas each frame.
 * Why DOM instead of raycasting WebGL meshes: ≥44px touch targets, native click on iOS,
 * keyboard/screen-reader access, and no hit-test maths to get wrong behind the globe.
 */
export function createMarkers(container, globe, camera, onSelect) {
  const tmp = new THREE.Vector3(), world = new THREE.Vector3();
  const items = LOCATIONS.map((loc) => {
    const el = document.createElement("button");
    el.type = "button"; el.className = `globe-pin tone-${loc.tone}${loc.soon ? " is-soon" : ""}`; el.dataset.id = loc.id;
    el.setAttribute("aria-label", `${loc.name} — ${loc.region}`);
    el.innerHTML = `<i class="pin-ring"></i><i class="pin-dot"></i><span class="pin-label">${loc.name}</span>`;
    el.addEventListener("click", (e) => { e.stopPropagation(); onSelect(loc); });
    container.appendChild(el);
    return { loc, el, local: latLonToVec3(loc.lat, loc.lon, CONFIG.radius * 1.004) };
  });
  return {
    setActive(id) { items.forEach((i) => i.el.classList.toggle("is-active", i.loc.id === id)); },
    update(w, h) {
      globe.updateMatrixWorld();
      for (const it of items) {
        world.copy(it.local).applyMatrix4(globe.matrixWorld);
        const facing = world.clone().normalize().dot(tmp.copy(camera.position).sub(world).normalize());
        tmp.copy(world).project(camera);
        const vis = THREE.MathUtils.clamp((facing - .08) * 6, 0, 1);
        it.el.style.opacity = vis;
        it.el.style.pointerEvents = vis > .5 ? "auto" : "none";
        it.el.style.transform = `translate3d(${(tmp.x * .5 + .5) * w}px,${(-tmp.y * .5 + .5) * h}px,0) translate(-50%,-50%)`;
      }
    },
  };
}
