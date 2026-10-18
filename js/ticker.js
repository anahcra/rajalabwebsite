// Publications ticker: research questions loop into the R, papers ride out on the ribbon.
(function () {
  const host = document.getElementById('pub-ticker');
  if (!host) return;

  const NS = 'http://www.w3.org/2000/svg';
  const VIEW_W = 1440, VIEW_H = 860, VISIBLE_H = 620, REPEATS = 3, SPEED = 70; // px of path per second
  const QUESTIONS = 'can an electron beam see a single exciton? · how fast does charge cross a 2D interface · what does the dielectric environment do to a bandgap · why does the moiré potential move · where does the energy go after absorption · ';
  const PAPERS = [
    'Moiré excitons · Science 2022',
    'Bidirectional phonons · Nat. Nano 2023',
    'Ferroelectric TiO₂ · Science 2026',
    'Coulomb engineering · Nat. Comm. 2017',
    'Dielectric disorder · Nat. Nano 2019',
    'Interlayer hybridization · Nat. Rev. Mater. 2024',
    'Rigid band shifts · PRL 2019',
    'Anomalous diffusion · ACS Nano 2024',
    'Quadrupolar excitons · Nat. Mater. 2023',
    'Absorption vs. screening · Nano Lett. 2016',
    'Buried-interface CL · Nanoscale 2022',
    'Exciton–phonon scattering · Nano Lett. 2018',
    'Non-local dielectrics · J. Chem. Phys. 2023',
    'Excitonic linewidth · Nat. Comm. 2016',
  ];

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  const svg = el('svg', { viewBox: `0 0 ${VIEW_W} ${VIEW_H}` });
  const defs = el('defs', {}, svg);
  el('path', { id: 'ticker-in', d: 'M -2000 560 L 220 560 C 340 560 400 490 385 410 C 368 318 272 265 200 305 C 105 360 130 472 220 560 C 320 665 500 760 700 760', fill: 'none' }, defs);
  const outPath = el('path', { d: 'M 750 760 C 980 760 1150 640 1720 520 L 3430 160', fill: 'none' }, defs);
  const len = () => outPath.getTotalLength();
  const g = el('g', { transform: 'translate(0 -95)' }, svg);

  const text = el('text', { class: 'ticker__questions' }, g);
  const tp = el('textPath', { href: '#ticker-in', startOffset: '0' }, text);
  tp.textContent = QUESTIONS.repeat(REPEATS);
  el('path', { d: outPath.getAttribute('d'), class: 'ticker__ribbon' }, g);

  const pillLayer = el('g', {}, g);
  function makePills() {
    return PAPERS.map((label) => {
      const pg = el('g', { class: 'ticker__pill', opacity: '0' }, pillLayer);
      const rect = el('rect', { y: -22, height: 44, rx: 4 }, pg);
      const t = el('text', { y: 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, pg);
      t.textContent = label.toUpperCase();
      return { g: pg, rect, t };
    });
  }
  // Two copies so the stream stays continuous when it wraps.
  const A = makePills(), B = makePills();

  const box = el('g', { transform: 'translate(720 760)' }, g);
  el('rect', { x: -56, y: -56, width: 112, height: 112, rx: 8, class: 'ticker__box' }, box);
  const R = el('text', { x: 0, y: 2, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'ticker__r' }, box);
  R.textContent = 'R';
  host.appendChild(svg);

  let offsets = [], total = 0, period = 0;
  function measure() {
    offsets = [];
    let acc = 0;
    A.forEach((p, k) => {
      const w = Math.max(28, p.t.getComputedTextLength()) + 28;
      for (const q of [p, B[k]]) { q.rect.setAttribute('x', -w / 2); q.rect.setAttribute('width', w); }
      offsets.push(acc + w / 2);
      acc += w + 40;
    });
    total = acc;
    period = 0;
  }

  function fit() {
    const W = host.clientWidth, H = host.clientHeight;
    if (!W || !H) return;
    const s = Math.min(Math.max(W / VIEW_W, H / VIEW_H), H / VISIBLE_H);
    svg.style.width = VIEW_W * s + 'px';
    svg.style.height = VIEW_H * s + 'px';
  }

  function place(pill, d, L) {
    if (d < 0 || d > L) { pill.g.setAttribute('opacity', '0'); return; }
    const p = outPath.getPointAtLength(d), q = outPath.getPointAtLength(Math.min(L, d + 2));
    const a = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
    pill.g.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${a})`);
    pill.g.setAttribute('opacity', String(Math.min(1, d / 90, (L - d) / 90)));
  }

  function frame(t) {
    if (!period) period = tp.getComputedTextLength() / REPEATS;
    if (period > 0) tp.setAttribute('startOffset', String(-(period - ((t * SPEED) % period))));
    const L = len();
    for (let k = 0; k < A.length; k++) {
      const d = (t * SPEED + offsets[k]) % total;
      place(A[k], d, L);
      place(B[k], d + total, L);
    }
  }

  measure();
  fit();
  if (window.ResizeObserver) new ResizeObserver(fit).observe(host);
  else window.addEventListener('resize', fit);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let t = 0;
  if (document.fonts) document.fonts.ready.then(() => { measure(); frame(t); });
  frame(t);
  if (reducedMotion) return;

  // Animate only while the ticker is on screen.
  let raf = 0, last = null;
  function loop(now) {
    if (last != null) t += Math.min(0.05, (now - last) / 1000);
    last = now;
    frame(t);
    raf = requestAnimationFrame(loop);
  }
  function setRunning(on) {
    if (on && !raf) { last = null; raf = requestAnimationFrame(loop); }
    if (!on && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  if (window.IntersectionObserver) {
    new IntersectionObserver((entries) => setRunning(entries[0].isIntersecting)).observe(host);
  } else {
    setRunning(true);
  }
})();
