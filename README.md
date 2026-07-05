# lenafilatova.co.uk

Static site hosted on GitHub Pages (custom domain via `CNAME`). The homepage is
a client-rendered app (a small React-based template framework loaded by
`support.js`); all page content lives in the content object inside `index.html`.

## Why there is a build step

GitHub Pages only returns HTTP 200 for paths that exist as real files. The app
uses clean URLs (`/about`, `/shop`, `/resources/...`) that are drawn in the
browser, so without a real file at each path GitHub Pages would answer 404 and
fall back to `404.html`. On top of that, the SEO tags (`<title>`, description,
canonical, Open Graph) are declared in the template and only applied by
JavaScript — so a crawler or social scraper that doesn't run JS would see a
page with no metadata.

`prerender.mjs` fixes both: it writes a real `index.html` for every route, with
the correct per-route SEO tags baked into the actual `<head>`. Each file is the
full, interactive app shell — it boots exactly like the homepage — so
interactivity is unchanged; only the `<head>` differs per route.

## Regenerating the pre-rendered pages

Run this after editing page content, SEO copy, or the route list:

```bash
npm run prerender      # or: node prerender.mjs
```

It rewrites `index.html`'s `<head>` and (re)generates `about/`, `shop/`,
`contact/`, `resources/` and the resource sub-pages. It is idempotent — safe to
run repeatedly — and needs only Node (no dependencies). Commit the result.

### Adding a new page / resource

1. Add the page to the app content and routing in `index.html` as usual.
2. Add an entry to the `ROUTES` array in `prerender.mjs` (its `dir`, `path`,
   `title`, `desc`).
3. Run `npm run prerender`.
4. Add the new URL to `sitemap.xml`.

## Third-party libraries

React and ReactDOM are vendored in `vendor/` and loaded from there (not a CDN),
so the site keeps working if a CDN is slow or down and boots faster. They are
the exact `18.3.1` UMD builds (their Subresource Integrity hashes match the ones
`support.js` checks). To update, replace the files with a new pinned version and
update the `REACT_URL` / `REACT_DOM_URL` / SRI constants in `support.js`.

## Blog posts

Articles under `blog/<slug>/` and `ua/blog/<slug>/` are standalone, fully
static pages (their own lightweight template, with Article/FAQ structured data).
They are not produced by `prerender.mjs`; they are generated/authored per
article and committed directly.
