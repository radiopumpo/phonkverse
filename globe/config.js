// All tunables and content live here. Add a POI = add one object to LOCATIONS.
export const CONFIG = {
  radius: 1.6,
  spin: 0.075,          // rad/s idle rotation (≈ 84 s per revolution)
  idleResumeMs: 2200,   // auto-rotate resumes this long after the last interaction
  homePitch: 0.32,      // resting tilt (rad) so the northern hemisphere reads well
  homeLon: 8, homeLat: 40,
  zoom: { min: 3.6, max: 8, home: 6.4, scrollIn: 1.5 },
  maxPixelRatio: 2,     // cap: iPhones report 3, which triples GPU cost for little gain
  textures: {
    night:  "assets/globe/earth-night-4k.jpg",
    lights: "assets/globe/earth-lights-2k.jpg",
    clouds: "assets/globe/earth-clouds-1k.png",
  },
};

// Clickable points of interest (rendered as real DOM buttons → keyboard + touch friendly).
export const LOCATIONS = [
  { id: "italy", name: "PHONKITA", region: "ITALY · EUROPE", lat: 41.9, lon: 12.5, tone: "green",
    description: "The Italian phonk movement: regional identity, underground sound and a new cultural voice.",
    href: "phonkita.html", cta: "Discover Phonkita ↗" },
  { id: "spain", name: "PHONKAZO", region: "SPAIN · EUROPE", lat: 40.4, lon: -3.7, tone: "red",
    description: "The Spanish phonk movement: irreverence, sharp bars and a scene built to travel beyond borders.",
    href: "phonkazo.html", cta: "Discover Phonkazo ↗" },
  { id: "verse", name: "THE WIDER VERSE", region: "GLOBAL · OPEN MAP", lat: 18, lon: -64, tone: "lime",
    description: "PHONKVERSE is an open cultural map. Future pins can represent local scenes, creators, events and crews.",
    href: "#ecosystem", cta: "Explore the ecosystem ↗" },
];

// Decorative, non-clickable "signals" that make the network feel alive.
export const SIGNALS = [
  [51.5,-0.1],[52.5,13.4],[48.9,2.3],[38.7,-9.1],[41.4,2.2],[45.5,9.2],[40.8,14.3],
  [40.7,-74],[34,-118.2],[19.4,-99.1],[-23.5,-46.6],[-34.6,-58.4],[6.5,3.4],[-26.2,28],
  [35.7,139.7],[37.5,127],[28.6,77.2],[-33.9,151.2],[55.7,37.6],[25.2,55.3],
];
// Pairs of ids (LOCATIONS) or [lat,lon] that get an animated arc.
export const LINKS = [
  ["italy","spain"],["spain","verse"],["italy",[6.5,3.4]],["italy",[25.2,55.3]],["spain",[-23.5,-46.6]],
  ["verse",[40.7,-74]],["italy",[52.5,13.4]],["spain",[51.5,-0.1]],["italy",[35.7,139.7]],["verse",[34,-118.2]],
];
