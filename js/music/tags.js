// Editorial metadata for the music library. Edit freely: the catalogue, browse tabs and playlists all read from here.
// A track inherits its album's countries/genres unless TRACK_META overrides them.
export const COUNTRIES = {
  IT: { name: "Italy", region: "Europe" },
  ES: { name: "Spain", region: "Europe" },
  FR: { name: "France", region: "Europe" },
  SE: { name: "Sweden", region: "Europe" },
  "GB-ENG": { name: "England", region: "Europe" },
  RU: { name: "Russia", region: "Europe / Asia" },
  JP: { name: "Japan", region: "Asia" },
  IN: { name: "India", region: "Asia" },
  PK: { name: "Pakistan", region: "Asia" },
  BR: { name: "Brazil", region: "South America" },   // ready for Phonkada
};

export const ALBUM_META = {
  phonkita:   { countries: ["IT"],        genres: ["phonk"] },
  phonkazo:   { countries: ["ES"],        genres: ["phonk"] },
  phonkami:   { countries: ["JP"],        genres: ["phonk"] },
  phonkssons: { countries: ["SE"],        genres: ["phonk"] },
  phonkov:    { countries: ["RU"],        genres: ["phonk"] },
  phonke:     { countries: ["FR"],        genres: ["phonk", "french rap", "drill", "grime"] },
  phonkdon:   { countries: ["GB-ENG"],    genres: ["phonk", "uk drill", "grime", "dnb", "dubstep", "garage"] },
  phonkhan:   { countries: ["IN", "PK"],  genres: ["phonk", "south asian phonk", "funk"] },
};

// Per-track overrides, keyed "albumKey:NN".
export const TRACK_META = {
  "phonkdon:02": { genres: ["phonk", "grime"] },
  "phonkdon:03": { genres: ["phonk", "jungle", "dnb"] },
  "phonkdon:04": { genres: ["phonk", "dubstep"] },
  "phonkdon:05": { genres: ["phonk", "garage"] },
  "phonkhan:02": { countries: ["IN"] },
  "phonkhan:03": { countries: ["PK"] },
};
