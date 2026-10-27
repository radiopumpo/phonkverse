// Track player: one <audio>, one track at a time. Each .track-action carries data-src (assets/songs/<album>/NN-slug.mp3).
(() => {
  const buttons = [...document.querySelectorAll('.track-action[data-src]')];
  if (!buttons.length) return;
  const audio = new Audio(); audio.preload = 'none';
  const note = document.querySelector('.track-note');
  const defaultNote = note ? note.textContent : '';
  let current = null;
  const rowOf = (b) => b.closest('.track-row');
  const setState = (b, playing) => {
    b.textContent = playing ? '❚❚' : '▶'; b.setAttribute('aria-pressed', String(playing));
    rowOf(b).classList.toggle('is-playing', playing);
  };
  const stopAll = () => buttons.forEach((b) => setState(b, false));
  const play = (b) => {
    window.dispatchEvent(new Event('phonkverse:track-play'));   // stops the BGM
    if (current !== b) { stopAll(); current = b; audio.src = b.dataset.src; }
    if (note) note.textContent = defaultNote;
    audio.play().then(() => setState(b, true)).catch(() => fail(b));   // must be called inside the tap handler (iOS)
  };
  const fail = (b) => { setState(b, false); if (note) note.textContent = 'This track isn’t available yet — upload ' + b.dataset.src; };
  buttons.forEach((b) => {
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => { if (current === b && !audio.paused) { audio.pause(); setState(b, false); } else play(b); });
  });
  audio.addEventListener('timeupdate', () => { if (current && audio.duration) rowOf(current).style.setProperty('--prog', (audio.currentTime / audio.duration * 100).toFixed(1) + '%'); });
  audio.addEventListener('ended', () => {
    const i = buttons.indexOf(current); setState(current, false); rowOf(current).style.setProperty('--prog', '0%');
    if (buttons[i + 1]) play(buttons[i + 1]);
  });
  audio.addEventListener('error', () => { if (current) fail(current); });
})();
