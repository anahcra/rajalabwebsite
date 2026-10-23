// Publications header ("paper fleet"): questions from the papers run in from the hillside and fade
// into a wavefront; the papers leave it as folded paper boats across the bay.
(function () {
  const host = document.getElementById('pub-ticker');
  if (!host) return;

  const NS = 'http://www.w3.org/2000/svg';
  const BLUE = '#003262', INK = '#8A2A1D', PAPER = '#FBF5EC', FOLD = '#EADCC6';
  const WAVE = '#6B9DBC', WAVE_LIGHT = '#9CC3DA'; // lighter tints of the bay's blue (#3A6886)
  const SANS = "'IBM Plex Sans', Helvetica, Arial, sans-serif";

  // One entry per paper: the label it sails under, the question it answers, and its entry in the list below.
  const PAPERS = [
    { label: 'MOIRÉ EXCITONS · SCIENCE 2022', q: 'can an electron beam see an exciton inside a moiré cell?', id: 'pub-44' },
    { label: 'BIDIRECTIONAL PHONONS · NAT. NANO 2023', q: 'where does the heat go when charge crosses an interface?', id: 'pub-35' },
    { label: 'FERROELECTRIC TiO₂ · SCIENCE 2026', q: 'can a few atomic layers of titanium dioxide hold a polarization?', id: 'pub-17' },
    { label: 'COULOMB ENGINEERING · NAT. COMM. 2017', q: 'can the surroundings tune a band gap without touching the crystal?', id: 'pub-55' },
    { label: 'DIELECTRIC DISORDER · NAT. NANO 2019', q: 'how does a disordered environment blur an exciton?', id: 'pub-51' },
    { label: 'RIGID BAND SHIFTS · PRL 2019', q: 'does screening move the bands rigidly?', id: 'pub-52' },
    { label: 'ANOMALOUS DIFFUSION · ACS NANO 2024', q: 'how do interlayer excitons travel through a moiré landscape?', id: 'pub-30' },
    { label: 'ABSORPTION VS. SCREENING · NANO LETT. 2016', q: 'does graphene quench a quantum dot by absorbing or by screening?', id: 'pub-58' },
    { label: 'EXCITONIC LINEWIDTH · NAT. COMM. 2016', q: 'what sets the linewidth of a monolayer exciton?', id: 'pub-59' },
    { label: 'EXCITON–PHONON SCATTERING · NANO LETT. 2018', q: 'why does a second layer scatter excitons faster?', id: 'pub-54' },
    { label: 'BURIED-INTERFACE CL · NANOSCALE 2022', q: 'how do you image light from a buried interface?', id: 'pub-45' },
    { label: 'INTERLAYER HYBRIDIZATION · NAT. REV. MATER. 2024', q: 'how strongly can two van der Waals layers share an electron?', id: 'pub-32' },
    { label: 'QUADRUPOLAR EXCITONS · NAT. MATER. 2023', q: 'what happens when an exciton spreads across three layers?', id: 'pub-36' },
    { label: 'NON-LOCAL DIELECTRICS · J. CHEM. PHYS. 2023', q: 'when does screening depend on distance?', id: 'pub-37' },
    { label: 'MOIRÉ RECONSTRUCTION · NAT. COMM. 2023', q: 'how does a twisted bilayer rearrange its atoms?', id: 'pub-38' },
    { label: 'DARK EXCITON NANOIMAGING · NANO LETT. 2023', q: 'can a nanoprobe light up a dark exciton?', id: 'pub-39' },
    { label: 'INVERSION SYMMETRY · NAT. MATER. 2023', q: 'can an electric field switch a crystal’s symmetry and keep it switched?', id: 'pub-42' },
    { label: 'QUANTUM DEFECT IN WS₂ · NAT. COMM. 2024', q: 'can a quantum defect be designed and placed atom by atom?', id: 'pub-34' },
    { label: 'RYDBERG POLARITONS · NAT. COMM. 2021', q: 'can Rydberg excitons make polaritons interact?', id: 'pub-50' },
    { label: 'MOIRÉ EXCITATIONS · NANO LETT. 2026', q: 'what new excitations does a moiré superlattice create?', id: 'pub-16' },
    { label: 'NANOGAP ELECTROLUMINESCENCE · NANO LETT. 2026', q: 'can a 5 nm gap make a monolayer glow in one sharp line?', id: 'pub-3' },
    { label: '1D CORRELATED STATES · NAT. COMM. 2025', q: 'can graphene drive correlated states along a line defect?', id: 'pub-26' },
  ];

  // Three lanes of questions, dealt round-robin from the papers.
  const LANES = 3;
  const LINES = Array.from({ length: LANES }, (_, i) => PAPERS.filter((_, k) => k % LANES === i).map((p) => p.q));

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  // Boats cast their shadows onto the water toward the viewer, like the bridge deck's: the silhouette
  // flipped about the waterline, flattened by SH_K and leaning right (away from the upper-left light).
  // Like the deck's shadow it breaks up on the chop, into SH_N bands that sway sideways out of step,
  // more and with wider gaps between them the further they fall from the hull.
  const BOAT_H = 36, BOAT_S = 50, SH_K = .48, SH_SKEW = .3, SH_N = 8;
  const SH_DEPTH = (BOAT_H + BOAT_S) * SH_K;
  const SH_BANDS = Array.from({ length: SH_N }, (_, i) => {
    const y0 = SH_DEPTH * i / SH_N, y1 = SH_DEPTH * (i + 1) / SH_N;
    return [y0, y1 - (i ? .3 + .15 * i : 0)];
  });

  /* ---------- scene ---------- */
  const svg = el('svg', { viewBox: '0 0 1440 580', preserveAspectRatio: 'xMidYMid slice' });
  svg.innerHTML = `
    <defs>
      <path id="tk-q0" d="M -60,262 C 150,278 330,360 455,372"/>
      <path id="tk-q1" d="M -60,310 C 170,326 345,384 455,372"/>
      <path id="tk-q2" d="M -60,358 C 190,370 360,402 455,372"/>
      <path id="tk-boat-path" d="M 455,372 C 560,398 1000,366 1580,290"/>
      <radialGradient id="tk-fade-g" cx="455" cy="372" r="420" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#000"/><stop offset=".07" stop-color="#000"/><stop offset=".2" stop-color="#444"/>
        <stop offset=".4" stop-color="#bbb"/><stop offset=".6" stop-color="#fff"/>
      </radialGradient>
      <mask id="tk-fade" maskUnits="userSpaceOnUse" x="-100" y="-100" width="1700" height="800">
        <rect x="-100" y="-100" width="1700" height="800" fill="url(#tk-fade-g)"/>
      </mask>
      <radialGradient id="tk-glow">
        <stop offset="0" stop-color="${WAVE_LIGHT}" stop-opacity=".9"/><stop offset="1" stop-color="${WAVE_LIGHT}" stop-opacity="0"/>
      </radialGradient>
      <!-- Paper: fine fibre grain over the fill, resting on a soft shadow cast onto the water. -->
      <filter id="tk-paper" x="-15%" y="-40%" width="130%" height="190%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" seed="4" result="noise"/>
        <feColorMatrix in="noise" type="saturate" values="0" result="grain"/>
        <feComposite in="SourceGraphic" in2="grain" operator="arithmetic" k2="1" k3=".22" k4="-.11" result="tex"/>
        <feComposite in="tex" in2="SourceAlpha" operator="in" result="sheet"/>
        <feGaussianBlur in="SourceAlpha" stdDeviation="3.2" result="blur"/>
        <feOffset in="blur" dy="4" result="drop"/>
        <feFlood flood-color="#0b2a4a" flood-opacity=".28"/>
        <feComposite in2="drop" operator="in" result="shadow"/>
        <feMerge><feMergeNode in="shadow"/><feMergeNode in="sheet"/></feMerge>
      </filter>
      <!-- Boat lighting from the upper left: a lit hull darkening to the waterline, ends turning
           away from the light, the shaded inside of the far wall, a bright sail face and a shaded one. -->
      <linearGradient id="tk-hull" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFFCF6"/><stop offset=".5" stop-color="${PAPER}"/>
        <stop offset="1" stop-color="#D3BE9C"/>
      </linearGradient>
      <linearGradient id="tk-hull-ends" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#5a3c1e" stop-opacity=".3"/><stop offset=".2" stop-color="#5a3c1e" stop-opacity="0"/>
        <stop offset=".8" stop-color="#5a3c1e" stop-opacity="0"/><stop offset="1" stop-color="#5a3c1e" stop-opacity=".3"/>
      </linearGradient>
      <linearGradient id="tk-far-wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${FOLD}"/><stop offset="1" stop-color="#BBA27C"/>
      </linearGradient>
      <linearGradient id="tk-sail-lit" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="${PAPER}"/><stop offset="1" stop-color="#FFFDF9"/>
      </linearGradient>
      <linearGradient id="tk-sail-shade" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${FOLD}"/><stop offset="1" stop-color="#CDB590"/>
      </linearGradient>
      <!-- Cast shadow on the water: blurred more across than down, so its strips read as streaks. -->
      <filter id="tk-water-shadow" x="-10%" y="-20%" width="120%" height="140%">
        <feGaussianBlur stdDeviation="1.8 .6"/>
      </filter>
      ${SH_BANDS.map(([y0, y1], i) => `<clipPath id="tk-sh-${i}"><rect x="-4000" y="${y0.toFixed(1)}" width="8000" height="${(y1 - y0).toFixed(1)}"/></clipPath>`).join('')}
      <filter id="tk-text-shadow" x="-5%" y="-30%" width="110%" height="160%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.3" flood-color="#000" flood-opacity=".6"/>
      </filter>
    </defs>
    <image href="assets/golden-gate.jpg" x="0" y="0" width="1440" height="580" preserveAspectRatio="xMidYMid slice"/>
    <g class="ticker__questions" mask="url(#tk-fade)" filter="url(#tk-text-shadow)"></g>
    <g class="ticker__shadows"></g>
    <g class="ticker__fleet"></g>
    <g transform="translate(455,372)">
      <circle class="ticker__glow" r="46" fill="url(#tk-glow)" opacity=".4"/>
      <g class="ticker__arcs" filter="url(#tk-paper)"></g>
    </g>`;
  host.appendChild(svg);

  // Newsprint: justified columns of tiny pale-grey type, tiled over every face of the boats.
  // The flaps and sail faces get the same columns turned to follow their slope.
  const NEWS = ('excitons in moiré superlattices interlayer phonons heat across the interface dielectric screening ' +
    'tunes the band gap monolayer semiconductors cathodoluminescence of buried interfaces electron beam ' +
    'spectroscopy twisted bilayers reconstruct quantum defects atom by atom hexagonal boron nitride graphene ' +
    'ferroelectric polarization Rydberg polaritons linewidth of a dark exciton nanoscale imaging').split(' ');
  const NEWS_LH = 5.2, NEWS_ROWS = 12, NEWS_COL = 52;
  let newsTile = '', nk = 0;
  for (let c = 0; c < 2; c++) {
    for (let r = 0; r < NEWS_ROWS; r++) {
      let line = '';
      while (line.length < 26) line += NEWS[(nk++ * 7) % NEWS.length] + ' ';
      newsTile += `<text x="${c * (NEWS_COL + 4) + 2}" y="${(3.5 + r * NEWS_LH).toFixed(1)}" textLength="${NEWS_COL}" lengthAdjust="spacingAndGlyphs">${line.trim()}</text>`;
    }
  }
  svg.querySelector('defs').insertAdjacentHTML('beforeend', [['tk-news', 0], ['tk-news-l', -28], ['tk-news-r', 28]].map(([id, a]) =>
    `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${2 * NEWS_COL + 8}" height="${NEWS_ROWS * NEWS_LH}" patternTransform="rotate(${a})">
       <g fill="#6E6A64" font-size="3.9">${newsTile}</g>
     </pattern>`).join(''));

  // Show the full width of the photo from its top edge, so both bridge towers stay whole. Everything that
  // moves sits above y=390 (the wavefront is in the water just below the end of the deck, at (455,372), and
  // the boats dip under the deck before heading out), so a header too short to reach it gives up at most
  // the 12 of sky above the near tower. A tall, narrow header shows no more than 440 down and crops the
  // sides around the wavefront instead.
  const MIN_H = 390, MAX_H = 440;
  function fit() {
    const W = host.clientWidth, H = host.clientHeight;
    if (!W || !H) return;
    let x = 0, y = 0, w = 1440, h = w * H / W;
    if (h > MAX_H) {
      h = MAX_H;
      w = h * W / H;
      x = Math.min(Math.max(455 - w * .1, 0), 1440 - w);
    } else if (h < MIN_H) {
      y = Math.min(MIN_H - h, 12);
    }
    svg.setAttribute('viewBox', `${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
  }
  fit();
  if (window.ResizeObserver) new ResizeObserver(fit).observe(host);
  else window.addEventListener('resize', fit);

  /* ---------- wavefront: pulsing arcs ---------- */
  const glow = svg.querySelector('.ticker__glow');
  const arcsG = svg.querySelector('.ticker__arcs');
  const ARC_N = 6, ARC_PERIOD = 4.2, R0 = 16, R1 = 128, SQUASH = .74, SEG = 36;
  const arcs = Array.from({ length: ARC_N }, (_, i) => el('path', { fill: i % 2 ? WAVE : WAVE_LIGHT }, arcsG));
  const rnd = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  // A ripple as a filled ribbon: its radius wanders and its width swells and tapers to points at the
  // ends, both drifting with time; each new ripple gets its own span, tilt and wobble (seed k).
  function rippleD(r, w, t, k) {
    const span = (60 + 26 * rnd(k)) * Math.PI / 180, tilt = (rnd(k + 1) - .5) * .35;
    const p1 = rnd(k + 2) * 6.28, p2 = rnd(k + 3) * 6.28, out = [], inn = [];
    for (let j = 0; j <= SEG; j++) {
      const u = j / SEG * 2 - 1, a = u * span + tilt;
      const rr = r * (1 + .07 * Math.sin(3 * a + p1 + t * .8) + .04 * Math.sin(7 * a + p2 - t * 1.3));
      const ww = w * Math.pow(1 - u * u, .8) * (1 + .35 * Math.sin(4 * a + p2 + t));
      const c = Math.cos(a), sn = Math.sin(a) * SQUASH;
      out.push(((rr + ww / 2) * c).toFixed(1) + ',' + ((rr + ww / 2) * sn).toFixed(1));
      inn.push(((rr - ww / 2) * c).toFixed(1) + ',' + ((rr - ww / 2) * sn).toFixed(1));
    }
    return 'M' + out.join('L') + 'L' + inn.reverse().join('L') + 'Z';
  }
  function drawArcs(t) {
    arcs.forEach((p, i) => {
      const x = t / ARC_PERIOD + i / ARC_N, ph = x % 1; // 0 at the source, 1 at the edge
      p.setAttribute('d', rippleD(R0 + (R1 - R0) * ph, 8 - 5 * ph, t, (Math.floor(x) * ARC_N + i) * 4));
      p.setAttribute('opacity', (Math.min(ph / .12, 1) * Math.pow(1 - ph, .75)).toFixed(3));
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
  const fleet = svg.querySelector('.ticker__fleet'), shadows = svg.querySelector('.ticker__shadows');
  const FS = 14;
  function textW(s, fs = FS) {
    measureCtx.font = `700 ${fs}px ${SANS}`;
    return measureCtx.measureText(s).width + s.length * 1.6;
  }
  // Closed path through straight edges whose corners are rounded off by r (or a corner's own third value).
  function softPoly(pts, r) {
    const n = pts.length, f = (v) => v.toFixed(1);
    return pts.map((p, i) => {
      const rr = p[2] ?? r, a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
      const cut = (q) => { const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy), k = Math.min(rr, L / 2) / L; return [p[0] + dx * k, p[1] + dy * k]; };
      const p1 = cut(a), p2 = cut(b);
      return `${i ? 'L' : 'M'} ${f(p1[0])},${f(p1[1])} Q ${f(p[0])},${f(p[1])} ${f(p2[0])},${f(p2[1])}`;
    }).join(' ') + ' Z';
  }
  function makeBoat(paper) {
    // Folded newspaper boat, slightly see-through: a hull whose top edge curves gently up to its points,
    // the inside of the far wall showing above it, and a creased peak in the middle; edges come from
    // shading, not outlines. The ends slope in a long way (B); the label, a size down, is centred on the
    // hull's height, and the slope eases off on short labels so the letters' bottom corners clear it.
    const w = textW(paper.label) + 64, h = BOAT_H, T = 14, S = BOAT_S, edge = '#B9A27F';
    const base = h / 2 + 4.5, margin = (w - textW(paper.label, FS - 1)) / 2;
    const B = Math.min(52, (margin - 4) * (h + T) / (base + T));
    // Outline whose top runs tip to tip as one smooth curve dipping to y = mid at the centre, with the
    // tips rounded by 4, then down the right end and through `rest` (rounded corners) back to the left end.
    const f = (v) => v.toFixed(1);
    function hullD(mid, rest) {
      const c = (mid + T / 4) / .75, L = [0, -T], R = [w, -T];
      const toward = (p, q, r) => { const dx = q[0] - p[0], dy = q[1] - p[1], k = r / Math.hypot(dx, dy); return [p[0] + dx * k, p[1] + dy * k]; };
      const a = toward(L, rest[rest.length - 1], 4), s0 = toward(L, [w * .25, c], 4);
      const e0 = toward(R, [w * .75, c], 4), b = toward(R, rest[0], 4);
      let d = `M ${f(a[0])},${f(a[1])} Q ${L} ${f(s0[0])},${f(s0[1])} C ${f(w * .25)},${f(c)} ${f(w * .75)},${f(c)} ${f(e0[0])},${f(e0[1])} Q ${R} ${f(b[0])},${f(b[1])}`;
      rest.forEach((p, i) => {
        const prev = i ? rest[i - 1] : R, next = rest[i + 1] || L, r = p[2] || 0;
        if (!r) { d += ` L ${f(p[0])},${f(p[1])}`; return; }
        const p1 = toward(p, prev, r), p2 = toward(p, next, r);
        d += ` L ${f(p1[0])},${f(p1[1])} Q ${f(p[0])},${f(p[1])} ${f(p2[0])},${f(p2[1])}`;
      });
      return d + ' Z';
    }
    const front = hullD(0, [[w - B, h, 9], [B, h, 9]]);
    const inner = hullD(-9, [[w * .8, 2], [w * .2, 2]]);
    const peak = softPoly([[w * .34, 0], [w * .5, -S, 6], [w * .66, 0]], 8);
    const apex = -S + 3 * S / Math.hypot(w * .16, S); // where the rounded tip crosses the centre crease
    const shade = softPoly([[w * .5, apex, 0], [w * .66, 0], [w * .5, 0, 0]], 8);
    const face = (d, fill, news, extra = '') =>
      `<path d="${d}" fill="${fill}"${extra}/><path d="${d}" fill="url(#${news})" opacity=".5"/>`;
    const g = el('a', { href: '#' + paper.id, tabindex: '-1' });
    g.innerHTML = `
      <g transform="translate(${-w / 2},${-h * .55})"><g filter="url(#tk-paper)" opacity=".88">
        ${face(inner, 'url(#tk-far-wall)', 'tk-news-l')}
        ${face(peak, 'url(#tk-sail-lit)', 'tk-news-l', ` stroke="${edge}" stroke-width=".8"`)}
        ${face(shade, 'url(#tk-sail-shade)', 'tk-news-r')}
        <path d="M ${w * .5},${apex.toFixed(1)} L ${w * .5},0" stroke="${INK}" stroke-opacity=".22" stroke-width=".8"/>
        ${face(front, 'url(#tk-hull)', 'tk-news', ` stroke="${edge}" stroke-width=".9"`)}
        <path d="${front}" fill="url(#tk-hull-ends)"/>
        </g>
        <text x="${w / 2}" y="${base}" text-anchor="middle" font-weight="700" font-size="${FS - 1}" letter-spacing="1.6" fill="${BLUE}">${paper.label}</text>
      </g>`;
    // Shadow: the hull, far wall and sail outlines mapped so the waterline (y = h) lands on y = 0
    // and height above it becomes depth below it; one copy per band, each clipped to its band.
    const sil = [front, inner, peak].map((d) => `<path d="${d}"/>`).join('');
    const sh = el('g', {});
    sh.innerHTML = `<g transform="translate(${-w / 2},0)" fill="#06203a" filter="url(#tk-water-shadow)">${SH_BANDS.map((_, i) =>
      `<g clip-path="url(#tk-sh-${i})" opacity="${(.58 - .04 * i).toFixed(3)}"><g>
         <g transform="matrix(1,0,${-SH_SKEW},${-SH_K},${SH_SKEW * h},${SH_K * h})">${sil}</g>
       </g></g>`).join('')}</g>`;
    const bands = [...sh.querySelectorAll('[clip-path] > g')];
    return { g, w, sh, bands };
  }
  const SPEED = 34, GAP = 240, EMERGE = 210; // papers grow out of the wavefront over the first 210px
  const route = svg.querySelector('#tk-boat-path'), len = route.getTotalLength();
  let items = [], pubIdx = 0, pending = null;
  const ease = (x) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);
  const baseScale = (f) => .6 * (1 - .5 * f); // boats shrink to half size as they sail off

  function place(it, t) {
    const f = Math.min(it.d / len, 1), p = route.getPointAtLength(Math.max(it.d, 0));
    const grow = ease(it.d / EMERGE);
    const s = baseScale(f) * (.15 + .85 * grow);
    const dy = Math.sin(t * 1.5 + it.phase) * 1.6 * grow; // bob
    const rot = Math.sin(t * 1.1 + it.phase) * 1.2 * grow; // rock
    it.g.setAttribute('transform', `translate(${p.x},${p.y + dy}) rotate(${rot}) scale(${s})`);
    const fadeOut = f > .85 ? (1 - f) / .15 : 1, op = Math.max(0, Math.min(grow * 1.4, fadeOut)).toFixed(3);
    it.g.setAttribute('opacity', op);
    // The shadow rides the same swell but doesn't rock; it starts at the hull's waterline.
    it.sh.setAttribute('transform', `translate(${p.x},${p.y + dy + BOAT_H * .45 * s}) scale(${s})`);
    it.sh.setAttribute('opacity', op);
    it.bands.forEach((b, i) => {
      const dx = (.6 + 1.1 * i) * Math.sin(t * 2.3 - i * 1.1 + it.phase) + .6 * i * Math.sin(t * 3.7 + i * 2.3);
      b.setAttribute('transform', `translate(${dx.toFixed(2)},0)`);
    });
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
    shadows.replaceChildren();
    items = []; pubIdx = 0; pending = null;
    let prev = nextPaper();
    prev.d = len * .9;
    items.push(prev);
    for (;;) {
      const cur = nextPaper(), d = behind(prev, cur);
      if (d < 0) { pending = cur; break; }
      cur.d = d; items.push(cur); prev = cur;
    }
    items.forEach((it) => { fleet.appendChild(it.g); shadows.appendChild(it.sh); place(it, t); });
  }
  function step(dt, t) {
    for (const it of items) { it.d += SPEED * dt * Math.max(baseScale(it.d / len), .6); place(it, t); }
    while (items.length && items[0].d >= len) { items[0].g.remove(); items[0].sh.remove(); items.shift(); }
    if (!pending) pending = nextPaper();
    const newest = items[items.length - 1];
    const d0 = newest ? behind(newest, pending) : 0;
    if (d0 >= 0) { pending.d = d0; fleet.appendChild(pending.g); shadows.appendChild(pending.sh); items.push(pending); place(pending, t); pending = null; }
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
