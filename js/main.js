// Nav: transparent over the home hero, solid once scrolled (inner pages use .nav--solid); mobile menu.
(function () {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('nav-toggle');

  function onScroll() {
    nav.classList.toggle('is-solid', window.scrollY > 40);
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
