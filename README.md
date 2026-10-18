# Raja Labs website

Static multi-page site for Raja Labs (Nanoscale Spectroscopy, Molecular Foundry, LBNL). No build step.

```
index.html          home: hero, intro, news, key publications
research.html       research areas
about.html          PI bio
publications.html   publications ticker + all publications
team.html           group members and alumni
talks.html          invited talks
visit.html          getting to the Molecular Foundry
join.html           openings / contact
css/styles.css      styles + responsive breakpoints
js/main.js          nav behaviour (transparent → solid on scroll, mobile menu)
js/ticker.js        animated publications ticker (publications.html)
assets/             images, favicon, CV
sitemap.xml         page list for search engines (update <lastmod> when pages change)
robots.txt          points crawlers at the sitemap
```

Each page repeats the same nav and footer; when adding a page, copy an existing one, mark its nav link with `is-active` and `aria-current="page"` on that page only, give it its own `<title>`, description, canonical and Open Graph tags, and add it to `sitemap.xml`. Canonical/OG URLs use `https://rajalabs.lbl.gov/` (see `CNAME`).

## Local preview

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Deploys as-is to any static host (GitHub Pages, Netlify, etc.).
