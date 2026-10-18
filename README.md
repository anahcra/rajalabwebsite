# Raja Labs website

Static single-page site for Raja Labs (Nanoscale Spectroscopy, Molecular Foundry, LBNL). No build step.

```
index.html      page content (all sections)
css/styles.css  styles + responsive breakpoints
js/main.js      nav behaviour (transparent → solid on scroll, active section, mobile menu)
js/ticker.js    animated publications ticker above the full publication list
assets/         hero photo, CV
```

## Local preview

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Deploys as-is to any static host (GitHub Pages, Netlify, etc.).
