// Renders the home page "Many voices" grid from data: live albums (js/tracks.js) first, then coming-soon chapters (js/upcoming.js).
import { ALBUMS } from "./tracks.js";
import { UPCOMING } from "./upcoming.js";

const live = Object.values(ALBUMS).map((a) => `
  <a class="album-card" href="${a.page}">
    <div class="album-card-bg" style="background-image:linear-gradient(120deg,${a.palette[0]}44,#090b1088),url('${a.art}')"></div>
    <div class="album-card-content">
      <span class="album-kicker">${a.kicker}</span><h3>${a.name}</h3><p style="color:${a.palette[0]}">${a.slogan}</p>
      ${a.flag ? `<span class="album-flag ${a.flag}"></span>` : ""}<span class="album-button">Explore album <b>↗</b></span>
    </div>
  </a>`);

const soon = UPCOMING.map((u) => `
  <article class="soon-card" style="--c:${u.accent}">
    <span class="soon-badge">COMING SOON</span>
    <div class="soon-body"><span class="album-kicker">${u.country.toUpperCase()}</span><h3>${u.name}</h3><p>${u.blurb}</p></div>
  </article>`);

const host = document.getElementById("voices-grid");
if (host) host.innerHTML = [...live, ...soon].join("");
