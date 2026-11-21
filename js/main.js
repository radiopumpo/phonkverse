// Mobile menu. Delegated on document because the header is swapped on every soft navigation.
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.menu-toggle'), nav = document.querySelector('.primary-nav');
  if (btn && nav) { const open = nav.classList.toggle('open'); btn.setAttribute('aria-expanded', String(open)); return; }
  if (nav && e.target.closest('.primary-nav a')) { nav.classList.remove('open'); document.querySelector('.menu-toggle')?.setAttribute('aria-expanded', 'false'); }
});
