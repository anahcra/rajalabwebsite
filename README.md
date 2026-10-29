# Raja Labs website

Static multi-page site for Raja Labs (Light, Electrons & Quantum Interfaces; Molecular Foundry, LBNL). No build step.

```
index.html          home: hero, intro, lab updates, featured Foundry stories, then every other page (js/stream.js); a small visitors globe in the footer
research.html       research areas
facilities.html     optics labs, Montana s100 and attoDRY2100 (+ strain cell) microscopes, upcoming Qlibri fiber microcavity, stackers, Foundry user-proposal access
about.html          PI bio
publications.html   paper-boat header + all publications
team.html           group members and alumni
lab-life.html       what working in the lab is like
values.html         core values: embeds Berkeley Lab's stewardship.lbl.gov/values page
visit.html          getting to the Molecular Foundry
faq.html            joining, user access, visiting (<details> accordions)
join.html           Getting Started: ways to join, the path to working in the lab (approval, site access, safety training, instrument training), contact
analytics.html      Visitor Analytics dashboard (linked from the home globe; noindex, not in the nav, sitemap or stream)
css/styles.css      styles + responsive breakpoints
js/main.js          nav behaviour (transparent → solid on scroll, mobile menu)
js/ticker.js        animated paper-boat header (publications.html)
js/stream.js        home: appends each other page's sections, in nav order, as the reader scrolls (list in index.html #stream)
js/visits.js        records one visit per tab on the live site (Supabase) and loads them for the globe and analytics page
js/globe.js         home footer: the small turning globe of visitors, linking to analytics.html
js/visitor-analytics.js  analytics.html: map, trends, devices, busiest times, recent visits
js/news.js          home "Featured Stories": latest Foundry stories from foundry.lbl.gov (falls back to the cards in index.html)
assets/world.json   country outlines for the analytics map (Natural Earth 1:110m via world-atlas, Equal Earth projection)
assets/land-dots.json  land points for the globe
assets/             images, CV, logo (wordmark.svg: the RΛJΛ LΛBS nav wordmark, its letters take currentColor and its Λs stay gold; favicon.svg + apple-touch-icon.png: the RΛ icon); assets/news/ holds the fallback Foundry story images
sitemap.xml         page list for search engines (update <lastmod> when pages change)
robots.txt          points crawlers at the sitemap
google491bed8f45249d09.html  Google Search Console ownership check (keep it, or Search Console loses access)
```

Each page repeats the same nav and footer, and loads `js/visits.js` after `js/main.js`. The top nav has seven items; pages grouped under one item share a header (`.page-head--tabs`: the group name as eyebrow, the page name as title, same background) with a tab strip (`.subnav`) along its bottom: People = about + team, Join = join + lab-life + values + faq. On a grouped page, the parent nav item gets `is-active` and the page's own tab gets `is-active` plus `aria-current="page"`. When adding a page, copy an existing one, mark its nav link (and tab, if grouped) as above, give it its own `<title>`, description, canonical and Open Graph tags, and add it to `sitemap.xml` and, in nav order, to the `data-pages` list on the home page's `#stream`. Canonical/OG URLs use `https://rajalabs.lbl.gov/` (see `CNAME`).

## Local preview

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Deploys as-is to any static host (GitHub Pages, Netlify, etc.).

## Visitor analytics

`js/visits.js` records one visit per browser tab on `rajalabs.lbl.gov` in a [Supabase](https://supabase.com) table (project `aefiwtzmkyoyjxleabho`); the home globe and `analytics.html` read them back. Local previews read the same visits but never record any; add `?demo` to the URL to see generated sample data instead.

Setup (already done for this site; for reference, or if the project is ever recreated):

1. Create a free Supabase project. In its SQL editor, run:

   ```sql
   create table public.visits (
     id bigint generated always as identity primary key,
     created_at timestamptz not null default now(),
     page text, lat real, lon real, city text, region text, country text,
     browser text, os text, device text, lang text, source text, tz text,
     constraint visits_sizes check (
       length(coalesce(page, '')) <= 200 and length(coalesce(city, '')) <= 100 and
       length(coalesce(region, '')) <= 100 and length(coalesce(country, '')) <= 100 and
       length(coalesce(browser, '')) <= 40 and length(coalesce(os, '')) <= 40 and
       length(coalesce(device, '')) <= 20 and length(coalesce(lang, '')) <= 35 and
       length(coalesce(source, '')) <= 100 and length(coalesce(tz, '')) <= 60)
   );
   alter table public.visits enable row level security;
   -- Anyone can add a visit (timestamped by the database) and read them all; nobody can change or delete one.
   create policy "record visits" on public.visits for insert to anon
     with check (created_at between now() - interval '1 minute' and now() + interval '1 minute');
   create policy "read visits" on public.visits for select to anon using (true);
   grant select, insert on public.visits to anon;
   ```

2. In Project Settings → API, copy the project URL and the publishable (anon) key into `SUPABASE_URL` and `SUPABASE_KEY` at the top of `js/visits.js`. The key is meant to be public; the policies above are what limit it.

What's stored: an approximate location (city, from the IP address via ipwho.is, falling back to ipapi.co and geojs.io; the IP address itself isn't stored), browser, OS, device type, language, time zone, referring site and landing page. No cookies or persistent IDs. Browsers sending Do Not Track or Global Privacy Control, bots, and visits to `analytics.html` aren't counted.
