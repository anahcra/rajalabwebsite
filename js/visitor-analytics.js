// Visitor Analytics page: every visit recorded by js/visits.js, summarised for a time range and optional
// country and city filters, which live in the URL hash (#range=30d&country=Japan) so a view can be shared.
// Times are shown in the reader's time zone, except Busiest times, which uses each visitor's own.
(function () {
  const root = document.getElementById('va');
  if (!root || !window.RajaVisits || !window.fetch) return;

  const DAY = 864e5, HOUR = 36e5;
  const NS = 'http://www.w3.org/2000/svg';
  const RANGES = { '24h': 'last 24 hours', '7d': 'last 7 days', '30d': 'last 30 days', all: 'all time' };
  const PREV = { '24h': 'previous 24 hours', '7d': 'previous 7 days', '30d': 'previous 30 days' };
  // Country names from the geolocation services that differ from the map's.
  const ALIAS = {
    'United States': 'United States of America', 'Czech Republic': 'Czechia', 'Bosnia and Herzegovina': 'Bosnia and Herz.',
    'Dominican Republic': 'Dominican Rep.', 'Central African Republic': 'Central African Rep.',
    'Democratic Republic of the Congo': 'Dem. Rep. Congo', 'DR Congo': 'Dem. Rep. Congo', 'Republic of the Congo': 'Congo',
    'North Macedonia': 'Macedonia', 'Ivory Coast': "Côte d'Ivoire", 'Eswatini': 'eSwatini', 'South Sudan': 'S. Sudan',
    'Equatorial Guinea': 'Eq. Guinea', 'Western Sahara': 'W. Sahara', 'Solomon Islands': 'Solomon Is.',
    'Falkland Islands': 'Falkland Is.', 'Palestinian Territory': 'Palestine', 'Türkiye': 'Turkey', 'Korea, Republic of': 'South Korea',
    'Republic of Korea': 'South Korea', 'Russian Federation': 'Russia', 'Viet Nam': 'Vietnam', 'Lao PDR': 'Laos',
  };

  const $ = (id) => document.getElementById(id);
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svg(tag, attrs) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  // ---------- formatting ----------

  const num = new Intl.NumberFormat('en-US');
  const fmt = (n) => num.format(n);
  const compactFmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
  const compact = (n) => (n < 1000 ? String(n) : compactFmt.format(n));
  function pct(part, whole) {
    if (!whole) return '0%';
    const p = part / whole * 100;
    return p > 0 && p < 1 ? '<1%' : Math.round(p) + '%';
  }
  const D = (o) => new Intl.DateTimeFormat('en-US', o);
  const fDay = D({ month: 'short', day: 'numeric' });
  const fDayY = D({ month: 'short', day: 'numeric', year: 'numeric' });
  const fWdayDay = D({ weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const fMonth = D({ month: 'short', year: 'numeric' });
  const fClock = D({ hour: 'numeric', minute: '2-digit' });
  const fHour = D({ hour: 'numeric' });
  let zoneName = '';
  try { zoneName = D({ timeZoneName: 'short' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName').value; } catch (e) {}
  function ago(t) {
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) { const h = Math.floor(s / 3600); return h + (h === 1 ? ' hour ago' : ' hours ago'); }
    const d = Math.floor(s / 86400);
    return d + (d === 1 ? ' day ago' : ' days ago');
  }
  function when(t) {
    const today = startOfDay(Date.now());
    const day = t >= today ? 'Today' : t >= today - DAY ? 'Yesterday' : fDayY.format(t);
    return day + ', ' + fClock.format(t);
  }
  function hourName(h) { return h === 0 ? '12 AM' : h < 12 ? h + ' AM' : h === 12 ? '12 PM' : (h - 12) + ' PM'; }
  function hourSpan(h, len) {
    const a = hourName(h), b = hourName((h + (len || 1)) % 24);
    return a.slice(-2) === b.slice(-2) ? a.slice(0, -3) + '–' + b : a + '–' + b;
  }
  function plural(n, one, many) { return fmt(n) + ' ' + (n === 1 ? one : many || one + 's'); }
  let langNames = null;
  try { langNames = new Intl.DisplayNames(['en'], { type: 'language', languageDisplay: 'standard' }); } catch (e) {}
  function langLabel(code) {
    if (!code) return null;
    try { return langNames ? langNames.of(code) : code; } catch (e) { return code; }
  }

  function startOfDay(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function addDays(t, n) { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); }
  function mondayOf(t) { const d = new Date(startOfDay(t)); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); }
  function monthOf(t) { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); }
  function addMonths(t, n) { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth() + n, 1).getTime(); }

  // The visitor's own weekday (0 = Monday) and hour, from the time zone their browser reported.
  const zones = new Map();
  function localParts(t, tz) {
    let f = zones.get(tz || '');
    if (f === undefined) {
      try { f = tz ? D({ timeZone: tz, weekday: 'short', hour: 'numeric', hourCycle: 'h23' }) : null; } catch (e) { f = null; }
      zones.set(tz || '', f);
    }
    if (!f) { const d = new Date(t); return [(d.getDay() + 6) % 7, d.getHours()]; }
    let wd = 0, hr = 0;
    for (const p of f.formatToParts(t)) {
      if (p.type === 'weekday') wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.value);
      if (p.type === 'hour') hr = +p.value % 24;
    }
    return [wd, hr];
  }

  // ---------- state ----------

  let ROWS = [], WORLD = null, loadedAt = 0;
  const state = { range: 'all', country: null, city: null, placesTab: 'countries', devTab: 'browser', srcTab: 'source', recent: 10, trendTable: false };

  function prep(r) {
    const t = Date.parse(r.created_at);
    const [wd, hr] = localParts(t, r.tz);
    return {
      t, wd, hr,
      lat: typeof r.lat === 'number' ? r.lat : null, lon: typeof r.lon === 'number' ? r.lon : null,
      city: r.city || null, region: r.region || null, country: r.country || null,
      mapName: r.country ? ALIAS[r.country] || r.country : null,
      browser: r.browser || null, os: r.os || null, device: r.device || null,
      lang: r.lang || null, source: r.source || null, page: r.page || null,
    };
  }
  function cityKey(r) { return r.city ? r.city + '|' + (r.country || '') : null; }
  function place(r) { return [r.city, r.country].filter(Boolean).join(', '); }

  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    state.range = RANGES[p.get('range')] ? p.get('range') : 'all';
    state.country = p.get('country') || null;
    state.city = p.get('city') || null;
  }
  function writeHash() {
    const p = new URLSearchParams();
    if (/[?&#]demo\b/.test(location.search + location.hash)) p.set('demo', '');
    p.set('range', state.range);
    if (state.country) p.set('country', state.country);
    if (state.city) p.set('city', state.city);
    history.replaceState(null, '', '#' + p.toString().replace(/demo=(&|$)/, 'demo$1'));
  }

  // The window the range covers, and the one just before it for comparison.
  function windowOf() {
    const now = Date.now();
    if (state.range === '24h') return { start: now - 24 * HOUR, end: now, prev: now - 48 * HOUR };
    if (state.range === '7d' || state.range === '30d') {
      const n = state.range === '7d' ? 7 : 30, start = addDays(startOfDay(now), 1 - n);
      return { start, end: now, prev: addDays(start, -n) };
    }
    return { start: ROWS.length ? ROWS[0].t : now, end: now, prev: null };
  }
  function matches(r) {
    if (state.country && r.country !== state.country) return false;
    if (state.city && cityKey(r) !== state.city) return false;
    return true;
  }
  function compute() {
    const w = windowOf();
    const rows = [], prev = [];
    for (const r of ROWS) {
      if (!matches(r)) continue;
      if (r.t >= w.start && r.t <= w.end) rows.push(r);
      else if (w.prev != null && r.t >= w.prev && r.t < w.start) prev.push(r);
    }
    return { w, rows, prev };
  }
  function tally(rows, key) {
    const m = new Map();
    let missing = 0;
    for (const r of rows) {
      const k = key(r);
      if (k == null) { missing++; continue; }
      m.set(k, (m.get(k) || 0) + 1);
    }
    return { list: Array.from(m, ([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n), missing };
  }

  // ---------- tooltip ----------

  const tip = $('va-tip');
  function showTip(lines, x, y) {
    tip.replaceChildren();
    lines.forEach(([text, cls]) => tip.append(el('div', cls || '', text)));
    tip.hidden = false;
    const box = tip.getBoundingClientRect();
    let left = x + 14, top = y + 14;
    if (left + box.width > window.innerWidth - 8) left = x - box.width - 14;
    if (top + box.height > window.innerHeight - 8) top = y - box.height - 14;
    tip.style.left = Math.max(8, left) + 'px';
    tip.style.top = Math.max(8, top) + 'px';
  }
  function hideTip() { tip.hidden = true; }

  // ---------- header: range, filters, status ----------

  function renderBar(data) {
    root.querySelectorAll('[data-range]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.range === state.range)));
    const chips = $('va-chips');
    chips.replaceChildren();
    [['country', state.country], ['city', state.city && state.city.split('|')[0]]].forEach(([key, label]) => {
      if (!label) return;
      const b = el('button', 'va-chip');
      b.type = 'button';
      b.append(el('span', 'va-chip__k', key === 'country' ? 'Country' : 'City'), el('span', '', label), el('span', 'va-chip__x', '×'));
      b.setAttribute('aria-label', 'Remove filter: ' + label);
      b.addEventListener('click', () => {
        if (key === 'country') { state.country = null; state.city = null; } else state.city = null;
        commit();
      });
      chips.append(b);
    });

    const status = $('va-status');
    status.replaceChildren();
    const parts = [];
    if (window.RajaVisits.demo) parts.push(el('span', 'va-sample', 'Sample data'));
    const w = data.w;
    const span = state.range === '24h' ? fDay.format(w.start) + ', ' + fClock.format(w.start) + ' – ' + fDay.format(w.end) + ', ' + fClock.format(w.end)
      : fDay.format(w.start) + ' – ' + fDayY.format(w.end);
    parts.push(el('span', '', span));
    if (zoneName) parts.push(el('span', '', 'Times in ' + zoneName));
    const latest = data.rows[data.rows.length - 1];
    if (latest) parts.push(el('span', '', 'Latest visit ' + ago(latest.t) + (place(latest) ? ' from ' + place(latest) : '')));
    parts.push(el('span', '', 'Updated ' + fClock.format(loadedAt)));
    parts.forEach((p, i) => { if (i) status.append(el('span', 'va-dot', '·')); status.append(p); });
    const refresh = el('button', 'va-link', 'Refresh');
    refresh.type = 'button';
    refresh.addEventListener('click', load);
    status.append(el('span', 'va-dot', '·'), refresh);
  }

  // ---------- KPIs ----------

  function kpi(i, label, value, sub) {
    $('kl-' + i).textContent = label;
    $('kv-' + i).textContent = value;
    $('ks-' + i).textContent = sub || ' ';
  }
  function renderKPIs(data) {
    const { rows, prev } = data;
    let sub;
    if (state.range === 'all') sub = rows.length ? 'Since ' + fDayY.format(rows[0].t) : 'No visits yet';
    else if (!prev.length) sub = 'None in the ' + PREV[state.range];
    else {
      const d = (rows.length - prev.length) / prev.length * 100;
      sub = (d >= 0 ? '↑ ' : '↓ ') + Math.abs(Math.round(d)) + '% vs ' + PREV[state.range];
    }
    kpi(1, 'Visits', fmt(rows.length), sub);

    const countries = tally(rows, (r) => r.country).list;
    kpi(2, 'Countries & regions', fmt(countries.length),
      countries[0] ? 'Top: ' + countries[0].k + ' · ' + pct(countries[0].n, rows.length) : '');
    const cities = tally(rows, cityKey).list;
    kpi(3, 'Cities', fmt(cities.length), cities[0] ? 'Top: ' + cities[0].k.split('|')[0] + ' · ' + pct(cities[0].n, rows.length) : '');

    if (state.range === '24h') {
      const hours = tally(rows, (r) => Math.floor(r.t / HOUR)).list;
      kpi(4, 'Busiest hour', hours[0] ? fmt(hours[0].n) : '–', hours[0] ? hourSpan(new Date(hours[0].k * HOUR).getHours()) : '');
    } else {
      const days = tally(rows, (r) => startOfDay(r.t)).list;
      kpi(4, 'Busiest day', days[0] ? fmt(days[0].n) : '–', days[0] ? fWdayDay.format(days[0].k) : '');
    }

    const known = rows.filter((r) => r.device).length;
    const mobile = rows.filter((r) => r.device === 'Mobile' || r.device === 'Tablet').length;
    kpi(5, 'Mobile & tablet', known ? pct(mobile, known) : '–', known ? fmt(mobile) + ' of ' + plural(known, 'visit') : '');
  }

  // ---------- map ----------

  const map = { svg: null, countries: new Map(), dots: null, view: null, W: 0, H: 0, points: [], drag: null };
  function project(lat, lon) {
    const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;
    const l = lon * Math.PI / 180, t = Math.asin(M * Math.sin(lat * Math.PI / 180)), t2 = t * t, t6 = t2 * t2 * t2;
    const x = l * Math.cos(t) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)));
    const y = t * (A1 + A2 * t2 + t6 * (A3 + A4 * t2));
    const k = WORLD.w / (2 * Math.PI / (M * A1));  // x at the equator, 180°, spans half the width
    const top = ee(WORLD.top);
    return [x * k + WORLD.w / 2, (top - y) * k];
    function ee(p) { const tt = Math.asin(M * Math.sin(p * Math.PI / 180)), q = tt * tt; return tt * (A1 + A2 * q + q * q * q * (A3 + A4 * q)); }
  }

  function buildMap() {
    const host = $('va-map');
    map.W = WORLD.w; map.H = WORLD.h;
    map.view = { x: 0, y: 0, k: 1 };
    const s = svg('svg', { class: 'va-map__svg', viewBox: '0 0 ' + map.W + ' ' + map.H, role: 'img', 'aria-label': 'World map of visits by city' });
    const defs = svg('defs', {});
    const clip = svg('clipPath', { id: 'va-clip' });
    clip.append(svg('path', { d: WORLD.outline }));
    defs.append(clip);
    s.append(defs, svg('path', { d: WORLD.outline, class: 'va-map__sea' }));
    const g = svg('g', { 'clip-path': 'url(#va-clip)' });
    for (const [name, d] of WORLD.c) {
      const p = svg('path', { d, class: 'va-map__land' });
      p.dataset.name = name;
      map.countries.set(name, p);
      g.append(p);
    }
    map.dots = svg('g', { class: 'va-map__dots' });
    s.append(g, map.dots);
    host.prepend(s);
    map.svg = s;

    s.addEventListener('pointerdown', (e) => {
      map.drag = { x: e.clientX, y: e.clientY, vx: map.view.x, vy: map.view.y, moved: false };
      s.setPointerCapture(e.pointerId);
    });
    s.addEventListener('pointermove', (e) => {
      if (map.drag) {
        const u = unitsPerPx(), dx = e.clientX - map.drag.x, dy = e.clientY - map.drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) map.drag.moved = true;
        if (map.drag.moved && map.view.k > 1) {
          map.view.x = map.drag.vx - dx * u; map.view.y = map.drag.vy - dy * u;
          clampView(); applyView(); hideTip();
          return;
        }
      }
      hover(e);
    });
    s.addEventListener('pointerup', (e) => {
      const d = map.drag;
      map.drag = null;
      if (d && !d.moved) pick(e);
    });
    s.addEventListener('pointerleave', () => { hideTip(); setHover(null); });
    $('va-zoom-in').addEventListener('click', () => zoomBy(1.6));
    $('va-zoom-out').addEventListener('click', () => zoomBy(1 / 1.6));
    $('va-zoom-reset').addEventListener('click', () => { map.view = { x: 0, y: 0, k: 1 }; applyView(); });
  }
  function unitsPerPx() { return (map.W / map.view.k) / map.svg.clientWidth; }
  function clampView() {
    const vw = map.W / map.view.k, vh = map.H / map.view.k;
    map.view.x = Math.max(0, Math.min(map.W - vw, map.view.x));
    map.view.y = Math.max(0, Math.min(map.H - vh, map.view.y));
  }
  function applyView() {
    const v = map.view;
    map.svg.setAttribute('viewBox', [v.x, v.y, map.W / v.k, map.H / v.k].map((n) => n.toFixed(2)).join(' '));
    map.svg.classList.toggle('is-zoomed', v.k > 1);
    drawDots();
  }
  function zoomBy(f, cx, cy) {
    const v = map.view, vw = map.W / v.k, vh = map.H / v.k;
    cx = cx == null ? v.x + vw / 2 : cx; cy = cy == null ? v.y + vh / 2 : cy;
    v.k = Math.max(1, Math.min(12, v.k * f));
    v.x = cx - map.W / v.k / 2; v.y = cy - map.H / v.k / 2;
    clampView(); applyView();
  }
  function fitCountry(name) {
    const p = map.countries.get(name);
    if (!p) return;
    const b = p.getBBox();
    const k = Math.max(1, Math.min(8, 0.8 * Math.min(map.W / b.width, map.H / b.height)));
    map.view.k = k;
    map.view.x = b.x + b.width / 2 - map.W / k / 2;
    map.view.y = b.y + b.height / 2 - map.H / k / 2;
    clampView(); applyView();
  }

  let mapRows = [];
  function renderMap(data) {
    mapRows = data.rows;
    const byCountry = tally(data.rows, (r) => r.mapName);
    const counts = new Map(byCountry.list.map((c) => [c.k, c.n]));
    for (const [name, p] of map.countries) {
      p.classList.toggle('has-visits', counts.has(name));
      p.classList.toggle('is-selected', state.country != null && (ALIAS[state.country] || state.country) === name);
    }
    const byCity = new Map();
    for (const r of data.rows) {
      if (r.lat == null) continue;
      const key = cityKey(r) || r.lat.toFixed(1) + ',' + r.lon.toFixed(1);
      let c = byCity.get(key);
      if (!c) { c = { key, n: 0, lat: 0, lon: 0, r, last: 0 }; byCity.set(key, c); }
      c.n++; c.lat += r.lat; c.lon += r.lon;
      if (r.t > c.last) { c.last = r.t; c.r = r; }
    }
    const pts = Array.from(byCity.values(), (c) => {
      const [x, y] = project(c.lat / c.n, c.lon / c.n);
      return { x, y, n: c.n, key: c.key, r: c.r, last: c.last };
    }).sort((a, b) => b.n - a.n);
    map.max = pts.length ? pts[0].n : 1;
    const latest = data.rows[data.rows.length - 1];
    map.latestKey = latest && latest.lat != null ? cityKey(latest) || latest.lat.toFixed(1) + ',' + latest.lon.toFixed(1) : null;
    map.points = pts;

    const cityCount = tally(data.rows, cityKey).list.length;
    $('va-map-sub').textContent = data.rows.length
      ? plural(data.rows.length, 'visit') + ' from ' + plural(cityCount, 'city', 'cities') + ' in ' + plural(byCountry.list.length, 'country and region', 'countries and regions')
      : 'No visits in this period';
    const legend = $('va-map-legend');
    legend.replaceChildren();
    legend.hidden = !pts.length;
    const sizes = Array.from(new Set([1, Math.round(Math.sqrt(map.max)), map.max])).filter((n) => n >= 1);
    const key = el('div', 'va-legend__sizes');
    for (const n of sizes) {
      const item = el('span', 'va-legend__size');
      const d = el('span', 'va-legend__dot');
      const r = radiusPx(n);
      d.style.width = d.style.height = 2 * r + 'px';
      item.append(d, el('span', '', compact(n)));
      key.append(item);
    }
    legend.append(el('div', 'va-legend__title', 'Visits per city'), key);
    if (map.latestKey) {
      const l = el('div', 'va-legend__latest');
      l.append(el('span', 'va-legend__gold'), el('span', '', 'Latest visit'));
      legend.append(l);
    }
    drawDots();
  }
  // Zoom to the filtered country, or back out to the world.
  function frameMap() {
    if (state.country) fitCountry(ALIAS[state.country] || state.country);
    else { map.view = { x: 0, y: 0, k: 1 }; applyView(); }
  }
  function radiusPx(n) { return 2.5 + 11 * Math.sqrt(n / (map.max || 1)); }
  function drawDots() {
    if (!map.svg.clientWidth) return;
    const u = unitsPerPx();
    map.dots.replaceChildren();
    for (const p of map.points) {
      const latest = p.key === map.latestKey;
      const c = svg('circle', { cx: p.x, cy: p.y, r: radiusPx(p.n) * u, class: 'va-map__dot' + (latest ? ' is-latest' : '') });
      c.style.strokeWidth = 1.5 * u;
      p.el = c;
      if (!latest) map.dots.append(c);
    }
    const lp = map.points.find((p) => p.key === map.latestKey);
    if (lp) map.dots.append(lp.el);
  }
  function svgPoint(e) {
    const b = map.svg.getBoundingClientRect(), u = unitsPerPx();
    return [map.view.x + (e.clientX - b.left) * u, map.view.y + (e.clientY - b.top) * u, u];
  }
  // The city nearest the pointer, if it's within 14px of the dot's edge.
  function nearest(e) {
    const [x, y, u] = svgPoint(e);
    let best = null, bd = Infinity;
    for (const p of map.points) {
      const d = Math.hypot(p.x - x, p.y - y) / u - radiusPx(p.n);
      if (d < bd) { bd = d; best = p; }
    }
    return bd < 14 ? best : null;
  }
  let hovered = null;
  function setHover(node) {
    if (hovered) hovered.classList.remove('is-hover');
    hovered = node;
    if (node) node.classList.add('is-hover');
  }
  function hover(e) {
    const p = nearest(e);
    if (p) {
      setHover(p.el);
      showTip([[plural(p.n, 'visit'), 'va-tip__v'], [place(p.r) || 'Unknown city'], ['Latest ' + ago(p.last), 'va-tip__m']], e.clientX, e.clientY);
      map.svg.style.cursor = 'pointer';
      return;
    }
    const land = e.target.closest && e.target.closest('.va-map__land');
    if (land) {
      setHover(land);
      const n = mapRows.filter((r) => r.mapName === land.dataset.name).length;
      showTip([[n ? plural(n, 'visit') : 'No visits', 'va-tip__v'], [land.dataset.name]], e.clientX, e.clientY);
      map.svg.style.cursor = n ? 'pointer' : '';
      return;
    }
    setHover(null);
    hideTip();
    map.svg.style.cursor = '';
  }
  function pick(e) {
    const p = nearest(e);
    if (p && p.r.city) { state.country = p.r.country; state.city = cityKey(p.r); state.placesTab = 'cities'; commit(); return; }
    const land = e.target.closest && e.target.closest('.va-map__land');
    if (!land) return;
    const r = mapRows.find((row) => row.mapName === land.dataset.name);
    if (!r) return;
    state.country = r.country; state.city = null; state.placesTab = 'cities';
    commit();
  }

  // ---------- ranked lists ----------

  function tabs(host, items, current, onPick) {
    host.replaceChildren();
    for (const [key, label] of items) {
      const b = el('button', 'va-tab', label);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(key === current));
      b.addEventListener('click', () => onPick(key));
      host.append(b);
    }
  }
  // Rows of label, count, share and a bar. Long lists show the first `limit` with a "Show all" link.
  function barList(host, list, total, opts) {
    host.replaceChildren();
    const max = list.length ? list[0].n : 1;
    const head = el('div', 'va-list__head');
    head.append(el('span', '', opts.label), el('span', 'va-num', 'Visits'), el('span', 'va-num', 'Share'));
    host.append(head);
    if (!list.length) { host.append(el('p', 'va-empty', 'No visits in this period.')); return; }
    const limit = host.dataset.all ? list.length : opts.limit || 8;
    list.slice(0, limit).forEach((item) => {
      const row = el(opts.onPick ? 'button' : 'div', 'va-list__row');
      if (opts.onPick) { row.type = 'button'; row.addEventListener('click', () => opts.onPick(item)); }
      const name = el('span', 'va-list__name');
      name.append(el('span', '', opts.name ? opts.name(item) : item.k));
      if (opts.note) { const n = opts.note(item); if (n) name.append(el('span', 'va-list__note', n)); }
      const bar = el('span', 'va-list__bar');
      bar.style.width = Math.max(1.5, item.n / max * 100) + '%';
      row.append(name, el('span', 'va-num', fmt(item.n)), el('span', 'va-num va-list__share', pct(item.n, total)), bar);
      host.append(row);
    });
    if (list.length > (opts.limit || 8)) {
      const more = el('button', 'va-link va-list__more', host.dataset.all ? 'Show fewer' : 'Show all ' + fmt(list.length));
      more.type = 'button';
      more.addEventListener('click', () => {
        if (host.dataset.all) delete host.dataset.all; else host.dataset.all = '1';
        render();
      });
      host.append(more);
    }
    if (opts.missing) host.append(el('p', 'va-note', 'Not recorded for ' + plural(opts.missing, 'visit') + ' in this period.'));
  }

  function renderPlaces(data) {
    tabs($('va-places-tabs'), [['countries', 'Countries & regions'], ['cities', 'Cities']], state.placesTab, (k) => { state.placesTab = k; render(); });
    const host = $('va-places');
    if (state.placesTab === 'countries') {
      const t = tally(data.rows, (r) => r.country);
      const cities = new Map();
      for (const r of data.rows) if (r.country && r.city) (cities.get(r.country) || cities.set(r.country, new Set()).get(r.country)).add(r.city);
      barList(host, t.list, data.rows.length, {
        label: 'Country or region', limit: 12, missing: t.missing,
        note: (i) => cities.has(i.k) ? plural(cities.get(i.k).size, 'city', 'cities') : '',
        onPick: (i) => { state.country = i.k; state.city = null; state.placesTab = 'cities'; commit(); },
      });
    } else {
      const t = tally(data.rows, cityKey);
      const sample = new Map();
      for (const r of data.rows) if (r.city) sample.set(cityKey(r), r);
      barList(host, t.list, data.rows.length, {
        label: 'City', limit: 12, missing: t.missing,
        name: (i) => i.k.split('|')[0],
        note: (i) => { const r = sample.get(i.k); return state.country ? r.region : r.country; },
        onPick: (i) => { const r = sample.get(i.k); state.country = r.country; state.city = i.k; commit(); },
      });
    }
  }

  function renderDevices(data) {
    const items = [['browser', 'Browser'], ['os', 'OS'], ['device', 'Type']];
    tabs($('va-dev-tabs'), items, state.devTab, (k) => { state.devTab = k; render(); });
    const t = tally(data.rows, (r) => r[state.devTab]);
    barList($('va-dev'), t.list, data.rows.length - t.missing, { label: items.find((i) => i[0] === state.devTab)[1], missing: t.missing });
  }
  function renderLangs(data) {
    const t = tally(data.rows, (r) => langLabel(r.lang));
    barList($('va-lang'), t.list, data.rows.length - t.missing, { label: 'Language', missing: t.missing });
  }
  function renderSources(data) {
    const items = [['source', 'Referrers'], ['page', 'Landing pages']];
    tabs($('va-src-tabs'), items, state.srcTab, (k) => { state.srcTab = k; render(); });
    const t = state.srcTab === 'source'
      ? tally(data.rows, (r) => r.source || 'Direct or unknown')
      : tally(data.rows, (r) => r.page);
    barList($('va-src'), t.list, data.rows.length - t.missing, {
      label: state.srcTab === 'source' ? 'Came from' : 'First page', missing: t.missing,
      name: state.srcTab === 'page' ? (i) => i.k.replace(/\.html$/, '').replace(/^index$/, 'home') : null,
    });
  }

  // ---------- visits over time ----------

  function buckets(w) {
    const out = [];
    if (state.range === '24h') {
      let t = Math.floor((w.end - 23 * HOUR) / HOUR) * HOUR;
      for (let i = 0; i < 24; i++, t += HOUR) out.push({ t0: t, t1: t + HOUR, label: hourName(new Date(t).getHours()), tip: fDay.format(t) + ', ' + hourSpan(new Date(t).getHours()) });
      return { unit: 'Hour', list: out };
    }
    const days = (w.end - w.start) / DAY;
    if (state.range !== 'all' || days <= 62) {
      for (let t = startOfDay(w.start); t <= w.end; t = addDays(t, 1)) out.push({ t0: t, t1: addDays(t, 1), label: fDay.format(t), tip: fWdayDay.format(t) });
      return { unit: 'Day', list: out };
    }
    if (days <= 730) {
      for (let t = mondayOf(w.start); t <= w.end; t = addDays(t, 7)) out.push({ t0: t, t1: addDays(t, 7), label: fDay.format(t), tip: 'Week of ' + fDayY.format(t) });
      return { unit: 'Week', list: out };
    }
    for (let t = monthOf(w.start); t <= w.end; t = addMonths(t, 1)) out.push({ t0: t, t1: addMonths(t, 1), label: fMonth.format(t), tip: fMonth.format(t) });
    return { unit: 'Month', list: out };
  }
  function niceStep(max, n) {
    const raw = max / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  }

  let trend = null;
  function renderTrend(data) {
    const b = buckets(data.w), list = b.list;
    let i = 0;
    for (const k of list) k.n = 0;
    for (const r of data.rows) {
      while (i < list.length - 1 && r.t >= list[i].t1) i++;
      if (r.t >= list[i].t0 && r.t < list[i].t1) list[i].n++;
    }
    const now = Date.now();
    list.forEach((k) => { k.partial = k.t1 > now; k.early = k.t0 < data.w.start; });
    $('va-trend-title').textContent = 'Visits per ' + b.unit.toLowerCase();
    trend = { list, unit: b.unit };
    drawTrend();

    const btn = $('va-trend-toggle');
    btn.textContent = state.trendTable ? 'Show chart' : 'Show table';
    $('va-trend').hidden = state.trendTable;
    const table = $('va-trend-table');
    table.hidden = !state.trendTable;
    if (state.trendTable) {
      const body = table.querySelector('tbody');
      body.replaceChildren();
      list.slice().reverse().forEach((k) => {
        const tr = el('tr');
        tr.append(el('td', '', k.tip + (k.partial ? ' (so far)' : '')), el('td', 'va-num', fmt(k.n)));
        body.append(tr);
      });
      table.querySelector('th').textContent = b.unit;
    }
  }
  function drawTrend() {
    const host = $('va-trend');
    if (!trend || state.trendTable) return;
    const W = host.clientWidth, H = 260, m = { l: 48, r: 18, t: 18, b: 30 };
    if (!W) return;
    const list = trend.list, n = list.length;
    const maxV = Math.max(4, ...list.map((k) => k.n));
    const step = niceStep(maxV, 4), top = Math.ceil(maxV / step) * step;
    const x = (i) => m.l + (n === 1 ? (W - m.l - m.r) / 2 : i * (W - m.l - m.r) / (n - 1));
    const y = (v) => m.t + (H - m.t - m.b) * (1 - v / top);
    const s = svg('svg', { width: W, height: H, class: 'va-trend__svg', role: 'img',
      'aria-label': trend.unit + 'ly visits, ' + list.length + ' points; peak ' + fmt(Math.max(...list.map((k) => k.n))) });
    for (let v = 0; v <= top; v += step) {
      s.append(svg('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: 'va-grid' }));
      const t = svg('text', { x: m.l - 10, y: y(v) + 4, class: 'va-axis', 'text-anchor': 'end' });
      t.textContent = compact(v);
      s.append(t);
    }
    const labelsEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - m.l - m.r) / 84))));
    list.forEach((k, i) => {
      if (i % labelsEvery) return;
      const t = svg('text', { x: x(i), y: H - 8, class: 'va-axis', 'text-anchor': 'middle' });
      t.textContent = k.label;
      s.append(t);
    });
    // Complete buckets as a line over a light wash; the bucket still in progress dashed, with a hollow end.
    const full = list.map((k, i) => [x(i), y(k.n), k]).filter((p) => !p[2].partial);
    if (full.length) {
      const line = full.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('');
      s.append(svg('path', { d: line + 'L' + full[full.length - 1][0].toFixed(1) + ',' + y(0) + 'L' + full[0][0].toFixed(1) + ',' + y(0) + 'Z', class: 'va-trend__area' }));
      s.append(svg('path', { d: line, class: 'va-trend__line' }));
    }
    const last = list[n - 1];
    if (last.partial) {
      const lx = x(n - 1), ly = y(last.n);
      if (full.length) s.append(svg('path', { d: 'M' + full[full.length - 1][0] + ',' + full[full.length - 1][1] + 'L' + lx + ',' + ly, class: 'va-trend__line is-partial' }));
      s.append(svg('circle', { cx: lx, cy: ly, r: 4, class: 'va-trend__open' }));
      // Label it on the side away from the dashed line coming in.
      const from = full.length ? full[full.length - 1][1] : ly;
      const below = from < ly && ly + 22 < H - m.b;
      const t = svg('text', { x: lx - 8, y: below ? ly + 20 : ly - 12, class: 'va-axis va-axis--strong', 'text-anchor': 'end' });
      t.textContent = fmt(last.n) + ' so far';
      s.append(t);
    }
    const cross = svg('line', { y1: m.t, y2: H - m.b, class: 'va-cross', visibility: 'hidden' });
    const dot = svg('circle', { r: 4.5, class: 'va-trend__dot', visibility: 'hidden' });
    const hit = svg('rect', { x: m.l, y: 0, width: W - m.l - m.r, height: H, fill: 'transparent' });
    s.append(cross, dot, hit);
    function at(e) {
      const bx = s.getBoundingClientRect().left;
      const i = Math.round((e.clientX - bx - m.l) / ((W - m.l - m.r) / Math.max(1, n - 1)));
      return Math.max(0, Math.min(n - 1, i));
    }
    hit.addEventListener('pointermove', (e) => {
      const i = at(e), k = list[i];
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(k.n)); dot.setAttribute('visibility', 'visible');
      showTip([[plural(k.n, 'visit'), 'va-tip__v'], [k.tip], k.partial ? ['In progress', 'va-tip__m'] : k.early ? ['Partly before this range', 'va-tip__m'] : null].filter(Boolean), e.clientX, e.clientY);
    });
    hit.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); hideTip(); });
    host.replaceChildren(s);
  }

  // ---------- busiest times ----------

  const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  function renderHeat(data) {
    const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
    for (const r of data.rows) grid[r.wd][r.hr]++;
    const max = Math.max(1, ...grid.flat());
    const host = $('va-heat');
    host.replaceChildren();
    host.append(el('span'));
    for (let h = 0; h < 24; h++) host.append(el('span', 'va-heat__hour', h % 3 ? '' : hourName(h)));
    grid.forEach((row, d) => {
      host.append(el('span', 'va-heat__day', WEEKDAYS[d].slice(0, 3)));
      row.forEach((n, h) => {
        const c = el('span', 'va-heat__cell');
        c.dataset.level = n ? Math.min(5, 1 + Math.floor(n / max * 5)) : 0;
        c.addEventListener('pointerenter', (e) => showTip([[plural(n, 'visit'), 'va-tip__v'], [WEEKDAYS[d] + 's, ' + hourSpan(h)], ['Visitor’s local time', 'va-tip__m']], e.clientX, e.clientY));
        c.addEventListener('pointerleave', hideTip);
        host.append(c);
      });
    });
    const byDay = grid.map((row) => row.reduce((a, b) => a + b, 0));
    const byHour = grid[0].map((_, h) => grid.reduce((a, row) => a + row[h], 0));
    const summary = $('va-heat-sum');
    summary.replaceChildren();
    if (!data.rows.length) return;
    const topDay = byDay.indexOf(Math.max(...byDay));
    // The busiest three-hour stretch.
    let best = 0, bh = 0;
    for (let h = 0; h < 24; h++) { const s3 = byHour[h] + byHour[(h + 1) % 24] + byHour[(h + 2) % 24]; if (s3 > best) { best = s3; bh = h; } }
    const a = el('span'), b = el('span');
    a.append('Busiest day ', el('b', '', WEEKDAYS[topDay]));
    b.append('Busiest hours ', el('b', '', hourSpan(bh, 3)));
    summary.append(a, el('span', 'va-dot', '·'), b);
  }

  // ---------- recent visits ----------

  function renderRecent(data) {
    const body = $('va-recent').querySelector('tbody');
    body.replaceChildren();
    const rows = data.rows.slice(-state.recent).reverse();
    for (const r of rows) {
      const tr = el('tr');
      const time = el('td');
      time.append(el('div', '', when(r.t)), el('div', 'va-sub', ago(r.t)));
      const loc = el('td');
      if (r.city) loc.append(el('b', '', r.city), document.createTextNode(r.country ? ', ' + r.country : ''));
      else loc.textContent = r.country || 'Unknown';
      tr.append(time, loc,
        el('td', '', [r.browser, r.os].filter(Boolean).join(' on ') || '–'),
        el('td', '', r.device || '–'),
        el('td', '', langLabel(r.lang) || '–'),
        el('td', '', r.source || 'Direct'));
      body.append(tr);
    }
    if (!rows.length) {
      const tr = el('tr'), td = el('td', 'va-empty', 'No visits in this period.');
      td.colSpan = 6; tr.append(td); body.append(tr);
    }
    $('va-recent-count').textContent = rows.length ? 'Showing ' + fmt(rows.length) + ' of ' + fmt(data.rows.length) + ', newest first' : '';
    const more = $('va-recent-more');
    more.hidden = rows.length >= data.rows.length;
    more.textContent = 'Show ' + Math.min(25, data.rows.length - rows.length) + ' more';
  }

  // ---------- render ----------

  let current = null;
  function render() {
    current = compute();
    renderBar(current);
    renderKPIs(current);
    renderMap(current);
    renderPlaces(current);
    renderTrend(current);
    renderDevices(current);
    renderLangs(current);
    renderSources(current);
    renderHeat(current);
    renderRecent(current);
    hideTip();
  }
  function commit() {
    state.recent = 10;
    writeHash();
    render();
    frameMap();
  }

  function load() {
    root.classList.add('is-loading');
    return window.RajaVisits.fetchAll().then((rows) => {
      ROWS = rows.map(prep).filter((r) => !isNaN(r.t)).sort((a, b) => a.t - b.t);
      loadedAt = Date.now();
      root.classList.remove('is-loading', 'is-empty');
      const first = $('va-body').hidden;
      $('va-body').hidden = false;
      render();
      if (first) frameMap();
    }).catch((err) => {
      root.classList.remove('is-loading');
      const status = $('va-status');
      status.textContent = window.RajaVisits.configured
        ? 'Visits couldn’t be loaded just now. Please try again in a minute.'
        : 'Visitor analytics isn’t connected yet.';
      if (!ROWS.length) $('va-body').hidden = true;
      console.warn(err);
    });
  }

  root.querySelectorAll('[data-range]').forEach((b) => b.addEventListener('click', () => { state.range = b.dataset.range; commit(); }));
  $('va-trend-toggle').addEventListener('click', () => { state.trendTable = !state.trendTable; renderTrend(current); });
  $('va-recent-more').addEventListener('click', () => { state.recent += 25; renderRecent(current); });
  window.addEventListener('hashchange', () => { readHash(); render(); frameMap(); });
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { drawTrend(); drawDots(); }, 120);
  });

  readHash();
  fetch('assets/world.json').then((r) => r.json()).then((w) => {
    WORLD = w;
    buildMap();
    return load();
  }).catch((err) => {
    $('va-status').textContent = 'The analytics page couldn’t load. Please try again in a minute.';
    console.warn(err);
  });
})();
