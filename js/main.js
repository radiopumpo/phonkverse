const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.primary-nav');
if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  }));
}

// Demo controls deliberately do not pretend to play unreleased music.
// Replace each track-action button with a real official listening URL when available.
document.querySelectorAll('.track-action').forEach(button => {
  button.addEventListener('click', () => {
    const track = button.closest('.track-row')?.querySelector('h3')?.textContent || 'this track';
    alert(`Listening link for “${track}” can be added here when the release is available.`);
  });
});
