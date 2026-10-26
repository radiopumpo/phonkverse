import { Vector3 } from "../../vendor/three.module.min.js";
const D2R = Math.PI / 180;
/** lat/lon → point on a SphereGeometry whose texture is equirectangular (u=0 at lon −180°). */
export function latLonToVec3(lat, lon, r = 1) {
  const p = (90 - lat) * D2R, t = (lon + 180) * D2R;
  return new Vector3(-r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t));
}
/** yaw/pitch that rotate the globe so (lat,lon) faces the camera (+Z). */
export function facingAngles(lat, lon) {
  const v = latLonToVec3(lat, lon);
  const rho = Math.hypot(v.x, v.z);
  return { yaw: Math.atan2(-v.x, v.z), pitch: Math.atan2(v.y, rho) };
}
export const wrapPI = (a) => Math.atan2(Math.sin(a), Math.cos(a));
