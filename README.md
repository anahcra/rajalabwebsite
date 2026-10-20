# Raja Labs website

Static multi-page site for Raja Labs (Light, Electrons & Quantum Interfaces; Molecular Foundry, LBNL). No build step.

```
index.html          home: hero, intro, lab updates, featured Foundry stories, then every other page (js/stream.js)
research.html       research areas
facilities.html     stacker + optics labs, Foundry user-proposal access
about.html          PI bio
publications.html   paper-boat header + all publications
team.html           group members and alumni
lab-life.html       what working in the lab is like
visit.html          getting to the Molecular Foundry
faq.html            joining, user access, visiting (<details> accordions)
join.html           openings / contact
css/styles.css      styles + responsive breakpoints
js/main.js          nav behaviour (transparent → solid on scroll, mobile menu)
js/ticker.js        animated paper-boat header (publications.html)
js/stream.js        home: appends each other page's sections, in nav order, as the reader scrolls (list in index.html #stream)
js/news.js          home "Featured Stories": latest Foundry stories from foundry.lbl.gov (falls back to the cards in index.html)
assets/             images, favicon, CV; assets/news/ holds the fallback Foundry story images
sitemap.xml         page list for search engines (update <lastmod> when pages change)
robots.txt          points crawlers at the sitemap
```

Each page repeats the same nav and footer. The top nav has eight items; pages grouped under one item share a header (`.page-head--tabs`: the group name as eyebrow, the page name as title, same background) with a tab strip (`.subnav`) along its bottom: People = about + team, Join = join + lab-life + faq. On a grouped page, the parent nav item gets `is-active` and the page's own tab gets `is-active` plus `aria-current="page"`. When adding a page, copy an existing one, mark its nav link (and tab, if grouped) as above, give it its own `<title>`, description, canonical and Open Graph tags, and add it to `sitemap.xml` and, in nav order, to the `data-pages` list on the home page's `#stream`. Canonical/OG URLs use `https://rajalabs.lbl.gov/` (see `CNAME`).

## Local preview

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Deploys as-is to any static host (GitHub Pages, Netlify, etc.).
