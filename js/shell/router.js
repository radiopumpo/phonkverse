// Soft navigation. A click on an internal page link fetches that page, swaps everything in <body> except [data-persist]
// elements and scripts, updates title/classes/styles/URL — and the <audio> element never reloads. Any failure falls back to a normal navigation.
const $head = () => document.head;
const base = (href) => href.split("?")[0];

export function createRouter({ beforeSwap = () => {}, afterSwap = () => {} } = {}) {
  let token = 0;
  history.scrollRestoration = "manual";

  function eligible(a, e) {
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
    if (a.target && a.target !== "_self" || a.hasAttribute("download") || a.dataset.noSoft !== undefined) return null;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || !/(?:\.html|\/)$/.test(u.pathname)) return null;
    if (u.pathname === location.pathname && u.search === location.search) return null;   // same page (hash only) → native scroll
    return u;
  }

  async function styles(doc) {
    const have = new Set([...$head().querySelectorAll('link[rel="stylesheet"]')].map((l) => base(l.getAttribute("href"))));
    const loads = [...doc.querySelectorAll('link[rel="stylesheet"]')].filter((l) => !have.has(base(l.getAttribute("href")))).map((l) => new Promise((res) => {
      const n = document.createElement("link"); n.rel = "stylesheet"; n.href = l.getAttribute("href"); n.onload = n.onerror = res; $head().append(n); setTimeout(res, 3000);
    }));
    await Promise.all(loads);
  }

  function swap(doc) {
    document.title = doc.title;
    const d = doc.querySelector('meta[name="description"]'), cur = document.querySelector('meta[name="description"]');
    if (d && cur) cur.content = d.content;
    document.body.className = doc.body.className;
    [...document.body.children].filter((n) => !n.hasAttribute("data-persist") && n.tagName !== "SCRIPT").forEach((n) => n.remove());
    const frag = document.createDocumentFragment();
    [...doc.body.children].filter((n) => n.tagName !== "SCRIPT").forEach((n) => frag.append(document.importNode(n, true)));
    document.body.prepend(frag);
  }

  async function go(href, { push = true, y = null } = {}) {
    const my = ++token, u = new URL(href, location.href);
    try {
      document.documentElement.classList.add("pv-loading");
      const res = await fetch(u.pathname + u.search, { credentials: "same-origin" });
      if (!res.ok) throw new Error(String(res.status));
      const doc = new DOMParser().parseFromString(await res.text(), "text/html");
      if (!doc.querySelector(".site-header") || !doc.body) throw new Error("not a page");
      await styles(doc);
      if (my !== token) return;                                            // a newer navigation won
      history.replaceState({ pv: 1, y: scrollY }, "");                     // remember where we were
      beforeSwap(u);
      swap(doc);
      if (push) history.pushState({ pv: 1, y: 0 }, "", u.pathname + u.search + u.hash);
      const target = u.hash && document.getElementById(decodeURIComponent(u.hash.slice(1)));
      if (target) target.scrollIntoView({ behavior: "instant", block: "start" }); else scrollTo({ top: y || 0, behavior: "instant" });
      afterSwap(u);
      const main = document.querySelector("main"); if (main) { main.tabIndex = -1; main.focus({ preventScroll: true }); }
    } catch (err) { location.href = u.href; }                              // hard navigation fallback (audio restarts, but nothing breaks)
    finally { if (my === token) document.documentElement.classList.remove("pv-loading"); }
  }

  document.addEventListener("click", (e) => { const a = e.target.closest?.("a[href]"); const u = eligible(a, e); if (u) { e.preventDefault(); go(u.href); } });
  window.addEventListener("popstate", (e) => { go(location.href, { push: false, y: e.state?.y || 0 }); });
  history.replaceState({ pv: 1, y: scrollY }, "");
  return { go };
}
