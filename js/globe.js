// Home page: a slowly turning globe of where visitors are, below the last section. Land is drawn as dots
// (assets/land-dots.json), each visiting city as a gold point, and the latest visits arc back to Berkeley.
// Drag to turn it. The card stays hidden until js/visits.js has at least one visit to show.
(function () {
  const card = document.getElementById('visitors');
  const canvas = document.getElementById('visitors-globe');
  if (!card || !canvas || !window.RajaVisits || !window.fetch) return;

  const BERKELEY = [37.876, -122.247];
  const TILT = 22 * Math.PI / 180;  // view from a little above the equator
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  let land = [], cities = [], arcs = [], stars = [];
  let w = 0, h = 0, dpr = 1, cx = 0, cy = 0, R = 0;
  let lon0 = BERKELEY[1] + 40, drag = null, last = 0, running = false, visible = false;

  function vec(lat, lon) {
    const p = lat * Math.PI / 180, l = lon * Math.PI / 180;
    return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)];
  }
  // Rotate a world vector into view: turn about the pole by lon0, then tilt towards the viewer.
  function view(v) {
    const l = -lon0 * Math.PI / 180, s = Math.sin(l), c = Math.cos(l);
    const x = v[0] * c + v[2] * s, z0 = -v[0] * s + v[2] * c;
    return [x, v[1] * Math.cos(TILT) - z0 * Math.sin(TILT), v[1] * Math.sin(TILT) + z0 * Math.cos(TILT)];
  }

  // Great-circle arc from a to b, lifted off the surface in proportion to its length.
  function arc(a, b) {
    const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
    const ang = Math.acos(dot);
    if (ang < 0.02) return null;
    const lift = 0.05 + 0.22 * ang / Math.PI, pts = [];
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      const ka = Math.sin((1 - t) * ang) / Math.sin(ang), kb = Math.sin(t * ang) / Math.sin(ang);
      const r = 1 + lift * Math.sin(Math.PI * t);
      pts.push([(a[0] * ka + b[0] * kb) * r, (a[1] * ka + b[1] * kb) * r, (a[2] * ka + b[2] * kb) * r]);
    }
    return pts;
  }

  function resize() {
    const box = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = box.width; h = box.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    cx = w / 2; cy = h * 0.45; R = Math.min(h * 0.355, w * 0.36);
    const rand = (n) => { n = Math.sin(n * 12.9898) * 43758.5453; return n - Math.floor(n); };
    stars = Array.from({ length: Math.round(w * h / 2600) }, (_, i) => ({
      x: rand(i + 1) * w, y: rand(i + 101) * h, r: 0.4 + rand(i + 201) * 0.9, a: 0.25 + rand(i + 301) * 0.6, p: rand(i + 401) * 6.3,
    }));
    draw(last);
  }

  // A point is hidden when it's behind the globe and inside its outline.
  function shown(p) { return p[2] > 0 || p[0] * p[0] + p[1] * p[1] > 1; }

  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    for (const s of stars) {
      ctx.globalAlpha = still ? s.a : s.a * (0.65 + 0.35 * Math.sin(t / 900 + s.p));
      ctx.fillStyle = '#fff';
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    // Atmosphere, then the ocean lit from the upper left.
    let g = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.22);
    g.addColorStop(0, 'rgba(120, 170, 235, .32)'); g.addColorStop(1, 'rgba(120, 170, 235, 0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, 7); ctx.fill();
    g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    g.addColorStop(0, '#0e4a86'); g.addColorStop(0.7, '#03284f'); g.addColorStop(1, '#011a36');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();

    // Land dots, brighter towards the centre of the disc, in a few batches of equal brightness.
    const BANDS = 6, paths = Array.from({ length: BANDS }, () => new Path2D());
    const size = Math.max(1.2, R / 110);
    for (const v of land) {
      const p = view(v);
      if (p[2] <= 0) continue;
      paths[Math.min(BANDS - 1, Math.floor(p[2] * BANDS))].rect(cx + p[0] * R - size / 2, cy - p[1] * R - size / 2, size, size);
    }
    ctx.fillStyle = '#b9cde6';
    paths.forEach((path, i) => { ctx.globalAlpha = 0.18 + 0.62 * (i + 0.5) / BANDS; ctx.fill(path); });
    ctx.globalAlpha = 1;

    // Arcs from the latest visits to Berkeley, each with a light travelling along it.
    ctx.lineWidth = 1.2;
    arcs.forEach((pts, k) => {
      const q = pts.map(view);
      ctx.strokeStyle = 'rgba(253, 181, 21, .55)';
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      let on = false;
      for (const p of q) {
        if (!shown(p)) { on = false; continue; }
        const x = cx + p[0] * R, y = cy - p[1] * R;
        if (on) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        on = true;
      }
      ctx.stroke();
      ctx.setLineDash([]);
      if (still) return;
      const f = ((t / 2600 + k / arcs.length) % 1), p = q[Math.floor(f * (q.length - 1))];
      if (!shown(p)) return;
      ctx.fillStyle = 'rgba(255, 236, 190, .95)';
      ctx.beginPath(); ctx.arc(cx + p[0] * R, cy - p[1] * R, 1.8, 0, 7); ctx.fill();
    });

    // Visiting cities: a soft halo and a gold core, sized by visits.
    for (const c of cities) {
      const p = view(c.v);
      if (p[2] <= 0) continue;
      const x = cx + p[0] * R, y = cy - p[1] * R, a = 0.35 + 0.65 * p[2];
      ctx.globalAlpha = a * 0.22;
      ctx.fillStyle = '#FDB515';
      ctx.beginPath(); ctx.arc(x, y, c.r * 2.4, 0, 7); ctx.fill();
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(x, y, c.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Berkeley, with a slow pulse.
    const b = view(vec(BERKELEY[0], BERKELEY[1]));
    if (b[2] > 0) {
      const x = cx + b[0] * R, y = cy - b[1] * R, f = still ? 0.5 : (t / 2200) % 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, ' + (0.7 * (1 - f)) + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x, y, 4 + f * 12, 0, 7); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
    }

    // A rim of light on the upper-left edge.
    g = ctx.createRadialGradient(cx + R * 0.25, cy + R * 0.3, R * 0.6, cx, cy, R);
    g.addColorStop(0, 'rgba(1, 16, 34, 0)'); g.addColorStop(1, 'rgba(1, 16, 34, .45)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
  }

  function frame(t) {
    if (!running) return;
    if (!drag && last) lon0 -= (t - last) * 0.004;
    last = t;
    draw(t);
    requestAnimationFrame(frame);
  }
  function play() {
    const go = visible && !document.hidden && !still;
    if (go && !running) { running = true; last = 0; requestAnimationFrame(frame); }
    if (!go) running = false;
  }

  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, lon: lon0 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    lon0 = drag.lon - (e.clientX - drag.x) * 90 / R;
    if (!running) draw(last);
  });
  ['pointerup', 'pointercancel'].forEach((type) => canvas.addEventListener(type, () => { drag = null; }));

  const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
  function place(r) { return [r.city, r.country].filter(Boolean).join(', '); }

  Promise.all([
    fetch('assets/land-dots.json').then((r) => r.json()),
    window.RajaVisits.fetchAll(),
  ]).then(([dots, rows]) => {
    for (let i = 0; i < dots.length; i += 2) land.push(vec(dots[i] / 10, dots[i + 1] / 10));

    const byCity = new Map();
    for (const r of rows) {
      if (typeof r.lat !== 'number' || typeof r.lon !== 'number') continue;
      const key = place(r) || r.lat.toFixed(1) + ',' + r.lon.toFixed(1);
      const c = byCity.get(key) || { n: 0, lat: r.lat, lon: r.lon };
      c.n++;
      byCity.set(key, c);
    }
    const max = Math.max(1, ...Array.from(byCity.values(), (c) => c.n));
    cities = Array.from(byCity.values(), (c) => ({ v: vec(c.lat, c.lon), r: 1.4 + 3.2 * Math.sqrt(c.n / max) }));

    // The latest visits from six different places, each arcing home to Berkeley.
    const home = vec(BERKELEY[0], BERKELEY[1]), seen = new Set();
    for (let i = rows.length - 1; i >= 0 && arcs.length < 6; i--) {
      const r = rows[i], key = place(r);
      if (typeof r.lat !== 'number' || !key || seen.has(key)) continue;
      seen.add(key);
      const pts = arc(vec(r.lat, r.lon), home);
      if (pts) arcs.push(pts);
    }

    const latest = rows[rows.length - 1];
    const countries = new Set(rows.map((r) => r.country).filter(Boolean)).size;
    document.getElementById('visitors-total').textContent = compact.format(rows.length);
    document.getElementById('visitors-regions').textContent = countries;
    document.getElementById('visitors-latest').textContent = latest ? place(latest) || 'Unknown location' : '—';
    canvas.setAttribute('aria-label', 'Globe showing ' + rows.length.toLocaleString('en-US') + ' visits from ' + countries
      + ' countries and regions' + (latest && place(latest) ? ', most recently from ' + place(latest) : ''));
    if (window.RajaVisits.demo) card.classList.add('is-sample');

    if (!rows.length) return;
    card.hidden = false;
    resize();
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; play(); }).observe(canvas);
    document.addEventListener('visibilitychange', play);
  }).catch(() => {});
})();
