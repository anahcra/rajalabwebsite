// Home page: after the home sections, the other pages follow one after another as the reader scrolls, in
// nav order. Each page is fetched as it nears the viewport; its <main> sections are appended under a short
// banner made from its page header. The nav highlights the page being read. Without JavaScript, or if a
// request fails, the home page simply ends where it does in index.html.
(function () {
  const stream = document.getElementById('stream');
  if (!stream || !window.fetch || !window.IntersectionObserver) return;

  const queue = stream.dataset.pages.trim().split(/\s+/);
  // Pages grouped under one nav item highlight that item.
  const NAV = { 'team.html': 'about.html', 'lab-life.html': 'join.html', 'faq.html': 'join.html' };
  const navLinks = Array.from(document.querySelectorAll('.nav__link'));
  const sentinel = document.createElement('div');
  stream.after(sentinel);

  // The page's header as a banner: same eyebrow, title and background, without the tabs. The title links
  // to the page itself.
  function banner(doc, url) {
    const src = doc.querySelector('.page-head');
    const head = document.createElement('header');
    head.className = 'page-head';
    src.classList.forEach((c) => { if (/^page-head--(?!tabs$)/.test(c)) head.classList.add(c); });
    if (src.querySelector('.join__glow')) {
      const glow = document.createElement('div');
      glow.className = 'join__glow';
      glow.setAttribute('aria-hidden', 'true');
      head.append(glow);
    }
    const inner = document.createElement('div');
    inner.className = 'page-head__inner';
    const eyebrow = src.querySelector('.eyebrow');
    if (eyebrow) inner.append(eyebrow.cloneNode(true));
    const title = document.createElement('h2');
    title.className = 'page-head__title';
    const link = document.createElement('a');
    link.href = url;
    link.textContent = src.querySelector('.page-head__title').textContent;
    title.append(link);
    inner.append(title);
    head.append(inner);
    return head;
  }

  function load(url) {
    return fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(r.status)))
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const page = document.createElement('div');
        page.className = 'stream__page';
        page.dataset.nav = NAV[url] || url;
        page.append(banner(doc, url), ...doc.querySelectorAll('main > section'));
        stream.append(page);
      });
  }

  // Load the next page while the end of the stream is within reach; stop at the first failure.
  let near = false, busy = false;
  function pump() {
    if (busy || !near) return;
    if (!queue.length) { observer.disconnect(); sentinel.remove(); return; }
    busy = true;
    load(queue.shift())
      .then(() => { busy = false; requestAnimationFrame(pump); })
      .catch(() => { queue.length = 0; busy = false; pump(); });
  }
  const observer = new IntersectionObserver((entries) => {
    near = entries[entries.length - 1].isIntersecting;
    pump();
  }, { rootMargin: '0px 0px 1500px 0px' });
  observer.observe(sentinel);

  // Highlight the nav item for the page under the middle of the viewport (Home above the stream).
  let ticking = false;
  function highlight() {
    ticking = false;
    let current = 'index.html';
    for (const page of stream.children) {
      if (page.getBoundingClientRect().top > window.innerHeight / 2) break;
      current = page.dataset.nav;
    }
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === current));
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(highlight); }
  }, { passive: true });
})();
