import * as THREE from "../../vendor/three.module.min.js";
import { CONFIG, LOCATIONS, SIGNALS, LINKS } from "./config.js";
import { latLonToVec3 } from "./geo.js";

function glowTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(.25, "rgba(255,255,255,.55)"); grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const TONES = { green: 0x4ce0b1, red: 0xff6a4d, lime: 0xcaff3b, amber: 0xffa23a, soon: 0xb9a3ff };

/** Glowing signal nodes + animated arcs with travelling light pulses (the "living" network). */
export function createNetwork() {
  const R = CONFIG.radius, group = new THREE.Group(), glow = glowTexture();
  const byId = Object.fromEntries(LOCATIONS.map((l) => [l.id, [l.lat, l.lon]]));
  const pos = (ref) => { const [la, lo] = typeof ref === "string" ? byId[ref] : ref; return latLonToVec3(la, lo, R * 1.004); };

  const nodes = [...SIGNALS.map((s, i) => [s, i % 3 ? TONES.amber : TONES.lime]), ...LOCATIONS.map((l) => [[l.lat, l.lon], TONES[l.tone]])];
  const g = new THREE.BufferGeometry(), p = [], c = [];
  nodes.forEach(([ll, col]) => { const v = pos(ll); p.push(v.x, v.y, v.z); const k = new THREE.Color(col); c.push(k.r, k.g, k.b); });
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
  const nodeMat = new THREE.PointsMaterial({ size: .16, map: glow, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  group.add(new THREE.Points(g, nodeMat));

  const arcs = LINKS.map(([a, b], i) => {
    const A = pos(a), B = pos(b), ang = A.angleTo(B);
    const mid = A.clone().add(B).normalize().multiplyScalar(R * (1 + .08 + ang * .22));
    const curve = new THREE.QuadraticBezierCurve3(A, mid, B);
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(64)),
      new THREE.LineBasicMaterial({ color: i % 2 ? 0xff7a45 : 0x5cffd0, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false })));
    const pulse = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xfff2b0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    pulse.scale.setScalar(.2); group.add(pulse);
    return { curve, pulse, speed: .11 + (i % 4) * .03, offset: i * .17 };
  });

  return { group, update(t) {
    arcs.forEach((a) => a.pulse.position.copy(a.curve.getPoint((t * a.speed + a.offset) % 1)));
    nodeMat.opacity = .82 + Math.sin(t * 2.2) * .18;
  } };
}
