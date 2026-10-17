// Nav: transparent over the hero, solid once scrolled; highlights the current section.
(function () {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('nav-toggle');
  const links = Array.from(document.querySelectorAll('.nav__link'));
  const sections = links
    .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
    .filter(Boolean);

  function onScroll() {
    nav.classList.toggle('is-solid', window.scrollY > 40);

    let active = 'top';
    for (const el of sections) {
      if (el.getBoundingClientRect().top <= 120) active = el.id;
    }
    // At the very bottom the last section may never reach the threshold.
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      active = sections[sections.length - 1].id;
    }
    for (const a of links) {
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + active);
    }
  }

  function setOpen(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }

  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  links.forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.querySelector('.nav__brand').addEventListener('click', () => setOpen(false));

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
