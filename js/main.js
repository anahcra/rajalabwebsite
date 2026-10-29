// Nav: over the home hero it blends from a dusk band into the solid bar across the first SOLID_AT px of
// scroll, via --nav-p (0 to 1); inner pages use .nav--solid. Mobile menu.
(function () {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('nav-toggle');

  const SOLID_AT = 220;

  function onScroll() {
    if (nav.classList.contains('nav--solid')) return;
    const p = Math.min(Math.max(window.scrollY / SOLID_AT, 0), 1);
    nav.style.setProperty('--nav-p', p.toFixed(3));
  }

  function setOpen(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }

  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
