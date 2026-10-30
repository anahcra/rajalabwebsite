// Home page footer: a small, slowly turning globe of where visitors are. It links to the Visitor Analytics
// page only in a browser that has opened that page before (js/visitor-analytics.js sets rl_owner), so
// visitors see the globe but don't click through. Land is drawn as dots (assets/land-dots.json) and each visiting city from js/visits.js as a gold
// point. Before the first visit, or if visits can't be loaded, it's the globe alone, captioned "Visitor map".
(function () {
  const link = document.getElementById('visitors');
  const canvas = document.getElementById('visitors-globe');
  if (!link || !canvas || !window.RajaVisits || !window.fetch) return;

  const TILT = 22 * Math.PI / 180;  // view from a little above the equator
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  let owner = false;
  try { owner = localStorage.getItem('rl_owner') === '1'; } catch (e) {}
  if (owner) link.href = 'analytics.html';
  let land = [], cities = [];
  let size = 0, dpr = 1, R = 0, lon0 = -82, last = 0, running = false, visible = false;

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

  function resize() {
    size = canvas.getBoundingClientRect().width;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = canvas.height = Math.round(size * dpr);
    R = size * 0.45;
    draw();
  }

  function draw() {
    const c = size / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    // A faint halo, then the ocean lit from the upper left.
    let g = ctx.createRadialGradient(c, c, R * 0.95, c, c, R * 1.1);
    g.addColorStop(0, 'rgba(0, 50, 98, .12)'); g.addColorStop(1, 'rgba(0, 50, 98, 0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, R * 1.1, 0, 7); ctx.fill();
    g = ctx.createRadialGradient(c - R * 0.35, c - R * 0.4, R * 0.1, c, c, R);
    g.addColorStop(0, '#0c4580'); g.addColorStop(0.75, '#03284f'); g.addColorStop(1, '#011a36');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, R, 0, 7); ctx.fill();

    // Land dots, brighter towards the centre of the disc, in a few batches of equal brightness.
    const BANDS = 5, paths = Array.from({ length: BANDS }, () => new Path2D());
    const d = Math.max(1, R / 60);
    for (const v of land) {
      const p = view(v);
      if (p[2] <= 0) continue;
      paths[Math.min(BANDS - 1, Math.floor(p[2] * BANDS))].rect(c + p[0] * R - d / 2, c - p[1] * R - d / 2, d, d);
    }
    ctx.fillStyle = '#b9cde6';
    paths.forEach((path, i) => { ctx.globalAlpha = 0.15 + 0.6 * (i + 0.5) / BANDS; ctx.fill(path); });

    // Visiting cities, sized by visits (radii are for a 120px globe, scaled to the actual size).
    ctx.fillStyle = '#FDB515';
    for (const city of cities) {
      const p = view(city.v);
      if (p[2] <= 0) continue;
      ctx.globalAlpha = 0.4 + 0.6 * p[2];
      ctx.beginPath(); ctx.arc(c + p[0] * R, c - p[1] * R, city.r * size / 120, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function frame(t) {
    if (!running) return;
    if (last) lon0 -= (t - last) * 0.003;
    last = t;
    draw();
    requestAnimationFrame(frame);
  }
  function play() {
    const go = visible && !document.hidden && !still;
    if (go && !running) { running = true; last = 0; requestAnimationFrame(frame); }
    if (!go) running = false;
  }

  const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

  // The globe shows as soon as the land has loaded; visits add their cities and the count when they arrive.
  const visits = window.RajaVisits.fetchAll().catch(() => []);
  fetch('assets/land-dots.json').then((r) => r.json()).then((dots) => {
    for (let i = 0; i < dots.length; i += 2) land.push(vec(dots[i] / 10, dots[i + 1] / 10));
    link.hidden = false;
    resize();
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; play(); }).observe(canvas);
    document.addEventListener('visibilitychange', play);
    return visits;
  }).then((rows) => {
    if (!rows || !rows.length) return;

    const byCity = new Map();
    for (const r of rows) {
      if (typeof r.lat !== 'number' || typeof r.lon !== 'number') continue;
      const key = r.city ? r.city + '|' + r.country : r.lat.toFixed(1) + ',' + r.lon.toFixed(1);
      const city = byCity.get(key) || { n: 0, lat: r.lat, lon: r.lon };
      city.n++;
      byCity.set(key, city);
    }
    const max = Math.max(1, ...Array.from(byCity.values(), (city) => city.n));
    cities = Array.from(byCity.values(), (city) => ({ v: vec(city.lat, city.lon), r: 1 + 1.6 * Math.sqrt(city.n / max) }));

    const countries = new Set(rows.map((r) => r.country).filter(Boolean)).size;
    const text = compact.format(rows.length) + (rows.length === 1 ? ' visit' : ' visits') + ' from ' + countries
      + (countries === 1 ? ' country' : ' countries') + (window.RajaVisits.demo ? ' (sample)' : '');
    document.getElementById('visitors-stats').textContent = text;
    if (owner) link.setAttribute('aria-label', 'Visitor analytics: ' + text);
    draw();
  }).catch(() => {});
})();
