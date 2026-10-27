// "Coming soon" chapters. Add one object here and it appears on the home page (and as a globe pin if lat/lon are set).
// Fields: id, name, country, blurb, accent (hex), lat/lon (optional → globe pin). When a chapter launches, move it into
// LOCATIONS in js/globe/config.js, js/tracks.js and give it its own album page.
export const UPCOMING = [
  { id: "phonkami", name: "PHONKAMI", country: "Japan",  lat: 36.2,  lon: 138.3, accent: "#ff4d6d", blurb: "The Japanese chapter of the PHONKVERSE is on its way." },
  { id: "phonkada", name: "PHONKADA", country: "Brazil", lat: -14.2, lon: -51.9, accent: "#f4d03f", blurb: "The Brazilian chapter of the PHONKVERSE is on its way." },
  { id: "phonke",   name: "PHONKÉ",   country: "France", lat: 47, lon: 2.5, accent: "#b9a3ff", blurb: "A new voice is on its way. Stay tuned." },
];
