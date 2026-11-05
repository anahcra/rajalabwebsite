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

  // Tab strips too wide for the screen (phones): bring the current tab into view and fade whichever edge
  // has more tabs beyond it, so it's clear the strip scrolls sideways.
  document.querySelectorAll('.subnav').forEach((strip) => {
    const active = strip.querySelector('.is-active');
    if (active) strip.scrollLeft = active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2;
    function edges() {
      strip.classList.toggle('subnav--more-left', strip.scrollLeft > 1);
      strip.classList.toggle('subnav--more-right', strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1);
    }
    strip.addEventListener('scroll', edges, { passive: true });
    window.addEventListener('resize', edges);
    edges();
  });
})();
