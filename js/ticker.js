// Publications header ("paper fleet"): questions from the papers run in from the hillside and fade
// into a honeycomb wavefront; the papers leave it as folded paper boats across the bay.
(function () {
  const host = document.getElementById('pub-ticker');
  if (!host) return;

  const NS = 'http://www.w3.org/2000/svg';
  const RED = '#C23A2B', INK = '#8A2A1D', PAPER = '#FBF5EC', FOLD = '#EADCC6';
  const SANS = "'IBM Plex Sans', Helvetica, Arial, sans-serif";

  // One entry per paper: the label it sails under, the question it answers, and its entry in the list below.
  const PAPERS = [
    { label: 'MOIRÉ EXCITONS · SCIENCE 2022', q: 'can an electron beam see an exciton inside a moiré cell?', id: 'pub-1' },
    { label: 'BIDIRECTIONAL PHONONS · NAT. NANO 2023', q: 'where does the heat go when charge crosses an interface?', id: 'pub-2' },
    { label: 'FERROELECTRIC TiO₂ · SCIENCE 2026', q: 'can a few atomic layers of titanium dioxide hold a polarization?', id: 'pub-26' },
    { label: 'COULOMB ENGINEERING · NAT. COMM. 2017', q: 'can the surroundings tune a band gap without touching the crystal?', id: 'pub-5' },
    { label: 'DIELECTRIC DISORDER · NAT. NANO 2019', q: 'how does a disordered environment blur an exciton?', id: 'pub-6' },
    { label: 'RIGID BAND SHIFTS · PRL 2019', q: 'does screening move the bands rigidly?', id: 'pub-7' },
    { label: 'ANOMALOUS DIFFUSION · ACS NANO 2024', q: 'how do interlayer excitons travel through a moiré landscape?', id: 'pub-3' },
    { label: 'ABSORPTION VS. SCREENING · NANO LETT. 2016', q: 'does graphene quench a quantum dot by absorbing or by screening?', id: 'pub-8' },
    { label: 'EXCITONIC LINEWIDTH · NAT. COMM. 2016', q: 'what sets the linewidth of a monolayer exciton?', id: 'pub-9' },
    { label: 'EXCITON–PHONON SCATTERING · NANO LETT. 2018', q: 'why does a second layer scatter excitons faster?', id: 'pub-10' },
    { label: 'BURIED-INTERFACE CL · NANOSCALE 2022', q: 'how do you image light from a buried interface?', id: 'pub-4' },
    { label: 'INTERLAYER HYBRIDIZATION · NAT. REV. MATER. 2024', q: 'how strongly can two van der Waals layers share an electron?', id: 'pub-40' },
    { label: 'QUADRUPOLAR EXCITONS · NAT. MATER. 2023', q: 'what happens when an exciton spreads across three layers?', id: 'pub-43' },
    { label: 'NON-LOCAL DIELECTRICS · J. CHEM. PHYS. 2023', q: 'when does screening depend on distance?', id: 'pub-44' },
    { label: 'MOIRÉ RECONSTRUCTION · NAT. COMM. 2023', q: 'how does a twisted bilayer rearrange its atoms?', id: 'pub-45' },
    { label: 'DARK EXCITON NANOIMAGING · NANO LETT. 2023', q: 'can a nanoprobe light up a dark exciton?', id: 'pub-46' },
    { label: 'INVERSION SYMMETRY · NAT. MATER. 2023', q: 'can an electric field switch a crystal’s symmetry and keep it switched?', id: 'pub-49' },
    { label: 'QUANTUM DEFECT IN WS₂ · NAT. COMM. 2024', q: 'can a quantum defect be designed and placed atom by atom?', id: 'pub-42' },
    { label: 'RYDBERG POLARITONS · NAT. COMM. 2021', q: 'can Rydberg excitons make polaritons interact?', id: 'pub-55' },
    { label: 'MOIRÉ EXCITATIONS · NANO LETT. 2026', q: 'what new excitations does a moiré superlattice create?', id: 'pub-25' },
    { label: 'NANOGAP ELECTROLUMINESCENCE · NANO LETT. 2026', q: 'can a 5 nm gap make a monolayer glow in one sharp line?', id: 'pub-12' },
    { label: '1D CORRELATED STATES · NAT. COMM. 2025', q: 'can graphene drive correlated states along a line defect?', id: 'pub-35' },
  ];

  // Four lanes of questions, dealt round-robin from the papers.
  const LANES = 4;
  const LINES = Array.from({ length: LANES }, (_, i) => PAPERS.filter((_, k) => k % LANES === i).map((p) => p.q));

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  /* ---------- scene ---------- */
  const svg = el('svg', { viewBox: '0 0 1440 580', preserveAspectRatio: 'xMidYMid slice' });
  svg.innerHTML = `
    <defs>
      <path id="tk-q0" d="M -60,262 C 150,262 260,395 510,462"/>
      <path id="tk-q1" d="M -60,335 C 170,350 300,450 510,462"/>
      <path id="tk-q2" d="M -60,408 C 190,430 330,500 510,462"/>
      <path id="tk-q3" d="M -60,481 C 210,505 380,535 510,462"/>
      <path id="tk-boat-path" d="M 510,462 C 740,445 1120,370 1580,280"/>
      <radialGradient id="tk-fade-g" cx="510" cy="462" r="420" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#000"/><stop offset=".07" stop-color="#000"/><stop offset=".2" stop-color="#444"/>
        <stop offset=".4" stop-color="#bbb"/><stop offset=".6" stop-color="#fff"/>
      </radialGradient>
      <mask id="tk-fade" maskUnits="userSpaceOnUse" x="-100" y="-100" width="1700" height="800">
        <rect x="-100" y="-100" width="1700" height="800" fill="url(#tk-fade-g)"/>
      </mask>
      <radialGradient id="tk-glow">
        <stop offset="0" stop-color="#FFE7B0" stop-opacity=".9"/><stop offset="1" stop-color="#FFE7B0" stop-opacity="0"/>
      </radialGradient>
      <filter id="tk-lift" x="-10%" y="-30%" width="120%" height="170%">
        <feDropShadow dx="0" dy="3" stdDeviation="2.4" flood-color="#08203a" flood-opacity=".35"/>
      </filter>
      <filter id="tk-text-shadow" x="-5%" y="-30%" width="110%" height="160%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.3" flood-color="#000" flood-opacity=".6"/>
      </filter>
      <filter id="tk-arc-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.6" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <image href="assets/golden-gate.jpg" x="0" y="0" width="1440" height="580" preserveAspectRatio="xMidYMid slice"/>
    <g class="ticker__questions" mask="url(#tk-fade)" filter="url(#tk-text-shadow)"></g>
    <g class="ticker__fleet"></g>
    <g transform="translate(510,462)">
      <circle class="ticker__glow" r="46" fill="url(#tk-glow)"/>
      <g class="ticker__arcs" filter="url(#tk-arc-glow)"></g>
      <g class="ticker__source"></g>
    </g>`;
  host.appendChild(svg);

  // Show the photo from its top edge (so the bridge tower stays whole) down to y=540, matching the
  // CSS height; the wavefront at (510,462) sits clear of the trimmed bottom.
  // On narrower screens, crop the sides around the wavefront so the papers stay in view.
  const BAND_H = 540;
  function fit() {
    const W = host.clientWidth, H = host.clientHeight;
    if (!W || !H) return;
    let x = 0, w = 1440, h = BAND_H;
    if (W / H < w / h) {
      w = h * W / H;
      x = Math.min(Math.max(510 - w * .1, 0), 1440 - w);
    } else {
      h = w * H / W;
    }
    svg.setAttribute('viewBox', `${x.toFixed(1)} 0 ${w.toFixed(1)} ${h.toFixed(1)}`);
  }
  fit();
  if (window.ResizeObserver) new ResizeObserver(fit).observe(host);
  else window.addEventListener('resize', fit);

  /* ---------- wavefront: honeycomb source + pulsing arcs ---------- */
  function hexPts(r) {
    const p = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i + Math.PI / 6;
      p.push((r * Math.cos(a)).toFixed(2) + ',' + (r * Math.sin(a)).toFixed(2));
    }
    return p.join(' ');
  }
  function arcD(r, span) {
    const a = span * Math.PI / 180, x = (r * Math.cos(a)).toFixed(2), y = (r * Math.sin(a)).toFixed(2);
    return `M ${x},${-y} A ${r},${r} 0 0 1 ${x},${y}`;
  }
  svg.querySelector('.ticker__source').innerHTML =
    `<polygon points="${hexPts(11)}" fill="#E3A72F" stroke="#FFF6E2" stroke-width="2"/>
     <polygon points="${hexPts(4)}" fill="#FFF6E2"/>`;
  const glow = svg.querySelector('.ticker__glow');
  const arcsG = svg.querySelector('.ticker__arcs');
  const ARC_N = 6, ARC_PERIOD = 4.2, R0 = 16, R1 = 128;
  const arcs = Array.from({ length: ARC_N }, (_, i) =>
    el('path', { fill: 'none', 'stroke-linecap': 'round', stroke: i % 3 === 1 ? '#F2B640' : '#FFFFFF' }, arcsG));
  function drawArcs(t) {
    arcs.forEach((p, i) => {
      const ph = ((t / ARC_PERIOD) + i / ARC_N) % 1; // 0 at the source, 1 at the edge
      p.setAttribute('d', arcD(R0 + (R1 - R0) * ph, 52));
      p.setAttribute('stroke-width', (4.2 - 2.6 * ph).toFixed(2));
      p.setAttribute('opacity', (Math.min(ph / .12, 1) * (1 - ph) * .95).toFixed(3));
    });
    glow.setAttribute('r', (40 + 8 * Math.sin(t * 2 * Math.PI / (ARC_PERIOD / ARC_N))).toFixed(1));
  }

  /* ---------- questions converging on the source ---------- */
  const qGroup = svg.querySelector('.ticker__questions');
  const measureCtx = document.createElement('canvas').getContext('2d');
  const qLines = LINES.map((qs, i) => {
    const txt = qs.join(' · ') + ' · ';
    const tp = el('textPath', { href: `#tk-q${i}` }, el('text', {}, qGroup));
    tp.textContent = txt.repeat(2);
    return { tp, txt, unit: 900, lag: i * 2.7 };
  });
  const Q_SPEED = 30;
  function drawQuestions(t) {
    qLines.forEach((q) => q.tp.setAttribute('startOffset', (-q.unit + ((t + q.lag) * Q_SPEED) % q.unit).toFixed(1)));
  }

  /* ---------- fleet ---------- */
  const fleet = svg.querySelector('.ticker__fleet');
  const FS = 14;
  function textW(s) {
    measureCtx.font = `700 ${FS}px ${SANS}`;
    return measureCtx.measureText(s).width + s.length * 1.6;
  }
  function makeBoat(paper) {
    const w = textW(paper.label) + 44, h = 32, sail = 42;
    const g = el('a', { href: '#' + paper.id, tabindex: '-1' });
    g.innerHTML = `
      <g filter="url(#tk-lift)" transform="translate(${-w / 2},${-h * .55})">
        <path d="M ${w * .30},0 L ${w * .5},${-sail} L ${w * .70},0 Z" fill="${PAPER}" stroke="${RED}" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M ${w * .5},${-sail} L ${w * .70},0 L ${w * .5},0 Z" fill="${FOLD}"/>
        <path d="M ${w * .5},${-sail} L ${w * .5},0" stroke="${RED}" stroke-width="1" opacity=".55"/>
        <path d="M 0,0 L ${w},0 L ${w - 16},${h} L 16,${h} Z" fill="${PAPER}" stroke="${RED}" stroke-width="2.2" stroke-linejoin="round"/>
        <text x="${w / 2}" y="${h / 2 + 5}" text-anchor="middle" font-weight="700" font-size="${FS}" letter-spacing="1.6" fill="${INK}">${paper.label}</text>
      </g>`;
    return { g, w };
  }
  const SPEED = 34, GAP = 70, EMERGE = 210; // papers grow out of the wavefront over the first 210px
  const route = svg.querySelector('#tk-boat-path'), len = route.getTotalLength();
  let items = [], pubIdx = 0, pending = null;
  const ease = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
  const baseScale = (f) => 1 - .5 * f; // boats shrink to half size as they sail off

  function place(it, t) {
    const f = Math.min(it.d / len, 1), p = route.getPointAtLength(Math.max(it.d, 0));
    const grow = ease(it.d / EMERGE);
    const s = baseScale(f) * (.15 + .85 * grow);
    const dy = Math.sin(t * 1.5 + it.phase) * 1.6 * grow; // bob
    const rot = Math.sin(t * 1.1 + it.phase) * 1.2 * grow; // rock
    it.g.setAttribute('transform', `translate(${p.x},${p.y + dy}) rotate(${rot}) scale(${s})`);
    const fadeOut = f > .85 ? (1 - f) / .15 : 1;
    it.g.setAttribute('opacity', Math.max(0, Math.min(grow * 1.4, fadeOut)).toFixed(3));
  }
  function nextPaper() {
    const it = makeBoat(PAPERS[pubIdx++ % PAPERS.length]);
    it.phase = Math.random() * 6.28;
    return it;
  }
  // Distance along the path for `cur` so it trails `prev` by one gap.
  function behind(prev, cur) {
    const s = baseScale(prev.d / len);
    return prev.d - (prev.w / 2 + GAP + cur.w / 2) * s;
  }
  function fill(t) {
    fleet.replaceChildren();
    items = []; pubIdx = 0; pending = null;
    let prev = nextPaper();
    prev.d = len * .9;
    items.push(prev);
    for (;;) {
      const cur = nextPaper(), d = behind(prev, cur);
      if (d < 0) { pending = cur; break; }
      cur.d = d; items.push(cur); prev = cur;
    }
    items.forEach((it) => { fleet.appendChild(it.g); place(it, t); });
  }
  function step(dt, t) {
    for (const it of items) { it.d += SPEED * dt * Math.max(baseScale(it.d / len), .6); place(it, t); }
    while (items.length && items[0].d >= len) { items[0].g.remove(); items.shift(); }
    if (!pending) pending = nextPaper();
    const newest = items[items.length - 1];
    const d0 = newest ? behind(newest, pending) : 0;
    if (d0 >= 0) { pending.d = d0; fleet.appendChild(pending.g); items.push(pending); place(pending, t); pending = null; }
  }

  let t = 3;
  function draw() { drawArcs(t); drawQuestions(t); }
  function start() {
    measureCtx.font = `600 17px ${SANS}`;
    qLines.forEach((q) => { q.unit = measureCtx.measureText(q.txt).width; });
    fill(t);
    draw();
  }
  start();
  // Re-measure once the web fonts land so boat hulls fit their labels.
  if (document.fonts) document.fonts.ready.then(start);
  if (reducedMotion) return;

  // Animate only while the ticker is on screen.
  let raf = 0, last = null;
  function loop(now) {
    const dt = last == null ? 0 : Math.min(0.1, (now - last) / 1000);
    last = now;
    t += dt;
    step(dt, t);
    draw();
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
