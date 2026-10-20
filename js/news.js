// Home "Featured Stories": refresh the cards from the Molecular Foundry's stories tagged Archana Raja
// (foundry.lbl.gov/tag/archana-raja, tag 189) through its WordPress API. The cards written into
// index.html stay as they are if the request fails or JavaScript is off.
(function () {
  const grid = document.querySelector('.press__grid');
  if (!grid || !window.fetch) return;

  const SITE = 'https://foundry.lbl.gov/';
  const COUNT = grid.children.length || 8;
  const API = SITE + 'wp-json/wp/v2/posts?tags=189&per_page=' + COUNT +
    '&_embed=wp:featuredmedia&_fields=date,link,title,_links,_embedded';

  // Titles arrive as HTML (&#8217; and the like); read them back as plain text.
  function text(html) {
    return new DOMParser().parseFromString(html, 'text/html').body.textContent.trim();
  }

  // The smallest of Foundry's image sizes that still fills a card, or the original.
  function image(post) {
    const media = post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0];
    if (!media || !media.source_url) return '';
    const sizes = (media.media_details && media.media_details.sizes) || {};
    const fit = ['medium', 'medium_large', 'large'].map((k) => sizes[k]).find((s) => s && s.width >= 340);
    return (fit || media).source_url;
  }

  function card(post) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'press__card';
    a.href = post.link;
    const src = image(post);
    if (src.startsWith(SITE)) {
      const img = document.createElement('img');
      img.className = 'press__img';
      img.src = src;
      img.alt = '';
      img.loading = 'lazy';
      a.append(img);
    }
    const title = document.createElement('span');
    title.className = 'press__title';
    title.textContent = text(post.title.rendered);
    const date = document.createElement('time');
    date.className = 'press__date';
    date.dateTime = post.date.slice(0, 7);
    date.textContent = new Date(post.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    a.append(title, date);
    li.append(a);
    return li;
  }

  fetch(API)
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((posts) => {
      posts = posts.filter((p) => p && p.link && p.link.startsWith(SITE) && p.title && p.date);
      if (posts.length) grid.replaceChildren(...posts.map(card));
    })
    .catch(() => {});
})();
