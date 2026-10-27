import { UPCOMING } from "./upcoming.js";
const host = document.getElementById("upcoming-grid");
if (host) host.innerHTML = UPCOMING.map((u) => `
  <article class="soon-card" style="--c:${u.accent}">
    <span class="soon-badge">COMING SOON</span>
    <p class="soon-country">${u.country}</p>
    <h3>${u.name}</h3>
    <p>${u.blurb}</p>
  </article>`).join("");
