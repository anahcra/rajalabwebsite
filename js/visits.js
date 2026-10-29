// Visitor counting for the globe on the home page and the Visitor Analytics page. Each browser tab that
// opens the live site records one visit in a Supabase table: an approximate location (city level, looked
// up from the IP address, which itself is not stored), browser, OS, device type, language, time zone,
// referring site and landing page. No cookies or persistent IDs; Do Not Track and Global Privacy Control
// are honoured, and nothing is recorded off the live host. Setup steps are in the README.
//
// With ?demo in the URL, the globe and the analytics page show generated sample data instead (as they also
// do locally if SUPABASE_URL and SUPABASE_KEY are ever blanked).
(function () {
  const SUPABASE_URL = 'https://aefiwtzmkyoyjxleabho.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_z3gXDukvHUFPsU07VtcTTg_0tggeGgk';  // publishable: safe to be public
  const LIVE_HOST = 'rajalabs.lbl.gov';
  const FIELDS = 'created_at,page,lat,lon,city,region,country,browser,os,device,lang,source,tz';

  const configured = Boolean(SUPABASE_URL && SUPABASE_KEY);
  const live = location.hostname === LIVE_HOST;
  const demo = /[?&#]demo\b/.test(location.search + location.hash) || (!configured && !live);

  function headers(extra) {
    const h = Object.assign({ apikey: SUPABASE_KEY }, extra);
    // Legacy anon keys are JWTs and also go in Authorization; the newer sb_publishable_ keys don't.
    if (SUPABASE_KEY.startsWith('eyJ')) h.Authorization = 'Bearer ' + SUPABASE_KEY;
    return h;
  }

  function parseUA() {
    const ua = navigator.userAgent;
    const browser = /Edg\//.test(ua) ? 'Edge'
      : /OPR\/|Opera/.test(ua) ? 'Opera'
      : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
      : /Firefox\/|FxiOS/.test(ua) ? 'Firefox'
      : /Chrome\/|CriOS/.test(ua) ? 'Chrome'
      : /Safari\//.test(ua) ? 'Safari' : 'Other';
    const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS'
      : /Android/.test(ua) ? 'Android'
      : /Mac OS X|Macintosh/.test(ua) ? (navigator.maxTouchPoints > 1 ? 'iPadOS' : 'macOS')
      : /Windows/.test(ua) ? 'Windows'
      : /CrOS/.test(ua) ? 'ChromeOS'
      : /Linux/.test(ua) ? 'Linux' : 'Other';
    const device = /iPad|Tablet/.test(ua) || os === 'iPadOS' || (os === 'Android' && !/Mobile/.test(ua)) ? 'Tablet'
      : /Mobi|iPhone|Android/.test(ua) ? 'Mobile' : 'Desktop';
    return { browser, os, device };
  }

  // Free IP-geolocation services, tried in turn. Each sees the visitor's IP address; we keep only the result.
  const GEO = [
    () => fetch('https://ipwho.is/').then((r) => r.json()).then((d) => {
      if (!d || d.success === false) throw 0;
      return { lat: d.latitude, lon: d.longitude, city: d.city, region: d.region, country: d.country };
    }),
    () => fetch('https://ipapi.co/json/').then((r) => r.json()).then((d) => {
      if (!d || d.error) throw 0;
      return { lat: d.latitude, lon: d.longitude, city: d.city, region: d.region, country: d.country_name };
    }),
    () => fetch('https://get.geojs.io/v1/ip/geo.json').then((r) => r.json()).then((d) => {
      if (!d || !d.latitude) throw 0;
      return { lat: +d.latitude, lon: +d.longitude, city: d.city, region: d.region, country: d.country };
    }),
  ];
  function geolocate() {
    return GEO.reduce((p, next) => p.catch(next), Promise.reject());
  }

  function cut(s, n) { return s ? String(s).slice(0, n) : null; }

  // One visit per tab, from real browsers on the live site.
  function record() {
    if (!configured || !live || demo) return;
    if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) { console.info('Visit not counted: this browser asks not to be tracked.'); return; }
    if (navigator.webdriver || /bot|crawl|spider|slurp|headless|lighthouse/i.test(navigator.userAgent)) return;
    if (/analytics\.html$/.test(location.pathname)) return;
    try { if (sessionStorage.getItem('rl_visit')) return; sessionStorage.setItem('rl_visit', '1'); } catch (e) { return; }

    let source = null, tz = null;
    try {
      const host = document.referrer && new URL(document.referrer).hostname.replace(/^www\./, '');
      if (host && host !== location.hostname) source = host;
    } catch (e) {}
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
    const base = Object.assign(parseUA(), {
      page: cut(location.pathname.replace(/^\//, '') || 'index.html', 200),
      lang: cut(navigator.language, 35),
      source: cut(source, 100),
      tz: cut(tz, 60),
    });
    geolocate()
      .catch(() => ({}))
      .then((g) => {
        const row = Object.assign(base, {
          // Two decimals (about 1 km) is already finer than IP geolocation.
          lat: typeof g.lat === 'number' ? Math.round(g.lat * 100) / 100 : null,
          lon: typeof g.lon === 'number' ? Math.round(g.lon * 100) / 100 : null,
          city: cut(g.city, 100), region: cut(g.region, 100), country: cut(g.country, 100),
        });
        return fetch(SUPABASE_URL + '/rest/v1/visits', {
          method: 'POST',
          headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
          body: JSON.stringify(row),
          keepalive: true,
        });
      })
      .catch(() => {});
  }

  // Every visit, oldest first. Supabase returns at most 1,000 rows per request, so the first request asks
  // for the total and the rest are fetched in parallel.
  const PAGE = 1000;
  function page(from, count) {
    return fetch(SUPABASE_URL + '/rest/v1/visits?select=' + FIELDS + '&order=id.asc', {
      headers: headers(Object.assign({ Range: from + '-' + (from + PAGE - 1) }, count ? { Prefer: 'count=exact' } : {})),
    }).then((r) => {
      if (!r.ok) throw new Error('Supabase ' + r.status);
      const total = count ? +((r.headers.get('Content-Range') || '').split('/')[1]) : 0;
      return r.json().then((rows) => ({ rows, total }));
    });
  }
  function fetchAll() {
    if (demo) return Promise.resolve(sample());
    if (!configured) return Promise.reject(new Error('not configured'));
    return page(0, true).then(({ rows, total }) => {
      const rest = [];
      for (let from = PAGE; from < total; from += PAGE) rest.push(page(from));
      return Promise.all(rest).then((pages) => rows.concat(...pages.map((p) => p.rows)));
    });
  }

  // ---------- Sample data, for previewing the globe and the analytics page ----------

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(rand, list) {
    let total = 0;
    for (const item of list) total += item[item.length - 1];
    let x = rand() * total;
    for (const item of list) { x -= item[item.length - 1]; if (x <= 0) return item; }
    return list[list.length - 1];
  }
  // City, region, country, lat, lon, time zone, UTC offset (hours), language, weight.
  const CITIES = [
    ['Berkeley', 'California', 'United States', 37.87, -122.27, 'America/Los_Angeles', -7, 'en-US', 260],
    ['San Francisco', 'California', 'United States', 37.77, -122.42, 'America/Los_Angeles', -7, 'en-US', 120],
    ['Oakland', 'California', 'United States', 37.8, -122.27, 'America/Los_Angeles', -7, 'en-US', 45],
    ['Palo Alto', 'California', 'United States', 37.44, -122.14, 'America/Los_Angeles', -7, 'en-US', 40],
    ['San Jose', 'California', 'United States', 37.34, -121.89, 'America/Los_Angeles', -7, 'en-US', 25],
    ['Los Angeles', 'California', 'United States', 34.05, -118.24, 'America/Los_Angeles', -7, 'en-US', 40],
    ['Pasadena', 'California', 'United States', 34.15, -118.14, 'America/Los_Angeles', -7, 'en-US', 22],
    ['San Diego', 'California', 'United States', 32.72, -117.16, 'America/Los_Angeles', -7, 'en-US', 28],
    ['Seattle', 'Washington', 'United States', 47.61, -122.33, 'America/Los_Angeles', -7, 'en-US', 24],
    ['Denver', 'Colorado', 'United States', 39.74, -104.99, 'America/Denver', -6, 'en-US', 12],
    ['Austin', 'Texas', 'United States', 30.27, -97.74, 'America/Chicago', -5, 'en-US', 16],
    ['Chicago', 'Illinois', 'United States', 41.88, -87.63, 'America/Chicago', -5, 'en-US', 20],
    ['Urbana', 'Illinois', 'United States', 40.11, -88.21, 'America/Chicago', -5, 'en-US', 10],
    ['Ann Arbor', 'Michigan', 'United States', 42.28, -83.74, 'America/Detroit', -4, 'en-US', 10],
    ['Cambridge', 'Massachusetts', 'United States', 42.37, -71.11, 'America/New_York', -4, 'en-US', 36],
    ['New York', 'New York', 'United States', 40.71, -74.01, 'America/New_York', -4, 'en-US', 34],
    ['Ithaca', 'New York', 'United States', 42.44, -76.5, 'America/New_York', -4, 'en-US', 12],
    ['Princeton', 'New Jersey', 'United States', 40.35, -74.66, 'America/New_York', -4, 'en-US', 12],
    ['Washington', 'District of Columbia', 'United States', 38.91, -77.04, 'America/New_York', -4, 'en-US', 18],
    ['Toronto', 'Ontario', 'Canada', 43.65, -79.38, 'America/Toronto', -4, 'en-CA', 14],
    ['Vancouver', 'British Columbia', 'Canada', 49.28, -123.12, 'America/Vancouver', -7, 'en-CA', 10],
    ['Mexico City', 'Mexico City', 'Mexico', 19.43, -99.13, 'America/Mexico_City', -6, 'es-MX', 6],
    ['São Paulo', 'São Paulo', 'Brazil', -23.55, -46.63, 'America/Sao_Paulo', -3, 'pt-BR', 6],
    ['London', 'England', 'United Kingdom', 51.51, -0.13, 'Europe/London', 1, 'en-GB', 24],
    ['Cambridge', 'England', 'United Kingdom', 52.21, 0.12, 'Europe/London', 1, 'en-GB', 14],
    ['Paris', 'Île-de-France', 'France', 48.86, 2.35, 'Europe/Paris', 2, 'fr-FR', 12],
    ['Berlin', 'Berlin', 'Germany', 52.52, 13.4, 'Europe/Berlin', 2, 'de-DE', 12],
    ['Munich', 'Bavaria', 'Germany', 48.14, 11.58, 'Europe/Berlin', 2, 'de-DE', 10],
    ['Zurich', 'Zurich', 'Switzerland', 47.38, 8.54, 'Europe/Zurich', 2, 'de-CH', 10],
    ['Lausanne', 'Vaud', 'Switzerland', 46.52, 6.63, 'Europe/Zurich', 2, 'fr-CH', 6],
    ['Delft', 'South Holland', 'Netherlands', 52.01, 4.36, 'Europe/Amsterdam', 2, 'nl-NL', 6],
    ['Copenhagen', 'Capital Region', 'Denmark', 55.68, 12.57, 'Europe/Copenhagen', 2, 'da-DK', 5],
    ['Madrid', 'Madrid', 'Spain', 40.42, -3.7, 'Europe/Madrid', 2, 'es-ES', 6],
    ['Milan', 'Lombardy', 'Italy', 45.46, 9.19, 'Europe/Rome', 2, 'it-IT', 5],
    ['Tel Aviv', 'Tel Aviv', 'Israel', 32.09, 34.78, 'Asia/Jerusalem', 3, 'he-IL', 4],
    ['Dubai', 'Dubai', 'United Arab Emirates', 25.2, 55.27, 'Asia/Dubai', 4, 'en-US', 3],
    ['Bengaluru', 'Karnataka', 'India', 12.97, 77.59, 'Asia/Kolkata', 5.5, 'en-IN', 16],
    ['Mumbai', 'Maharashtra', 'India', 19.08, 72.88, 'Asia/Kolkata', 5.5, 'en-IN', 10],
    ['New Delhi', 'Delhi', 'India', 28.61, 77.21, 'Asia/Kolkata', 5.5, 'en-IN', 10],
    ['Singapore', 'Singapore', 'Singapore', 1.35, 103.82, 'Asia/Singapore', 8, 'en-SG', 12],
    ['Beijing', 'Beijing', 'China', 39.9, 116.41, 'Asia/Shanghai', 8, 'zh-CN', 16],
    ['Shanghai', 'Shanghai', 'China', 31.23, 121.47, 'Asia/Shanghai', 8, 'zh-CN', 12],
    ['Shenzhen', 'Guangdong', 'China', 22.54, 114.06, 'Asia/Shanghai', 8, 'zh-CN', 8],
    ['Hong Kong', 'Hong Kong', 'Hong Kong', 22.32, 114.17, 'Asia/Hong_Kong', 8, 'zh-HK', 10],
    ['Taipei', 'Taipei', 'Taiwan', 25.03, 121.57, 'Asia/Taipei', 8, 'zh-TW', 8],
    ['Seoul', 'Seoul', 'South Korea', 37.57, 126.98, 'Asia/Seoul', 9, 'ko-KR', 14],
    ['Tokyo', 'Tokyo', 'Japan', 35.68, 139.69, 'Asia/Tokyo', 9, 'ja-JP', 14],
    ['Sydney', 'New South Wales', 'Australia', -33.87, 151.21, 'Australia/Sydney', 11, 'en-AU', 8],
    ['Melbourne', 'Victoria', 'Australia', -37.81, 144.96, 'Australia/Melbourne', 11, 'en-AU', 6],
    ['Cape Town', 'Western Cape', 'South Africa', -33.92, 18.42, 'Africa/Johannesburg', 2, 'en-ZA', 3],
    ['Lagos', 'Lagos', 'Nigeria', 6.52, 3.38, 'Africa/Lagos', 1, 'en-NG', 2],
  ];
  const DEVICES = [
    ['Desktop', [['macOS', 58], ['Windows', 32], ['Linux', 8], ['ChromeOS', 2]], 77],
    ['Mobile', [['iOS', 62], ['Android', 38]], 20],
    ['Tablet', [['iPadOS', 80], ['Android', 20]], 3],
  ];
  const BROWSERS = { macOS: [['Chrome', 52], ['Safari', 38], ['Firefox', 6], ['Edge', 4]],
    Windows: [['Chrome', 66], ['Edge', 24], ['Firefox', 10]], Linux: [['Chrome', 55], ['Firefox', 45]],
    ChromeOS: [['Chrome', 1]], iOS: [['Safari', 80], ['Chrome', 20]],
    Android: [['Chrome', 80], ['Samsung Internet', 16], ['Firefox', 4]], iPadOS: [['Safari', 85], ['Chrome', 15]] };
  const SOURCES = [[null, 54], ['google.com', 24], ['scholar.google.com', 6], ['linkedin.com', 5],
    ['foundry.lbl.gov', 4], ['lbl.gov', 3], ['bsky.app', 2], ['x.com', 2]];
  const PAGES = [['index.html', 72], ['research.html', 7], ['about.html', 6], ['join.html', 5],
    ['publications.html', 5], ['team.html', 2], ['visit.html', 2], ['facilities.html', 1]];
  // Weight of each local hour of the day.
  const HOUR_W = [2, 1, 1, 1, 1, 1, 2, 3, 6, 9, 11, 12, 11, 12, 12, 12, 11, 9, 7, 6, 6, 5, 4, 3].map((w, h) => [h, w]);

  function sample() {
    const rand = rng(1101);
    const start = Date.UTC(2026, 5, 2);
    const end = Date.now();
    const rows = [];
    for (let day = start; day < end; day += 864e5) {
      const date = new Date(day);
      const dow = date.getUTCDay();
      const sinceStart = (day - start) / 864e5;
      let rate = (34 + sinceStart * 0.12) * (dow === 0 || dow === 6 ? 0.55 : 1);
      // A few busy days, e.g. after a paper or a talk.
      for (const [d, boost] of [[29, 3.2], [74, 2.1], [118, 2.6], [140, 1.8]]) {
        const gap = sinceStart - d;
        if (gap >= 0 && gap < 5) rate *= 1 + (boost - 1) * Math.exp(-gap * 0.8);
      }
      const n = Math.round(rate * (0.8 + rand() * 0.4));
      for (let i = 0; i < n; i++) {
        const c = pick(rand, CITIES);
        const hour = pick(rand, HOUR_W)[0];
        const t = day + ((hour - c[6] + 24) % 24) * 36e5 + rand() * 36e5;
        if (t > end) continue;
        const dev = pick(rand, DEVICES);
        const os = pick(rand, dev[1])[0];
        rows.push({
          created_at: new Date(t).toISOString(),
          page: pick(rand, PAGES)[0],
          lat: c[3] + (rand() - 0.5) * 0.04, lon: c[4] + (rand() - 0.5) * 0.04,
          city: c[0], region: c[1], country: c[2],
          browser: pick(rand, BROWSERS[os])[0], os, device: dev[0],
          lang: rand() < 0.12 ? 'en-US' : c[7],
          source: pick(rand, SOURCES)[0],
          tz: c[5],
        });
      }
    }
    rows.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    return rows;
  }

  window.RajaVisits = { configured, live, demo, fetchAll, record };
  record();
})();
