// Generate sitemap.xml for lenafilatova.co.uk.
// Single source of truth: the STATIC list below + every recipe in recipes/recipes-data.js.
// Run after adding recipes/pages:  node build-sitemap.mjs
// (or the combined:  node recipes/build-recipe-pages.mjs && node build-sitemap.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = 'https://lenafilatova.co.uk';
// Bump on each release so <lastmod> reflects the deploy. Kept as a constant
// (not "today") so re-running produces no spurious diffs between deploys.
const LASTMOD = '2026-07-09';

// --- static / hand-curated pages (mirror of what was in the old sitemap) ---
// path: URL path. alt: true => emit EN + /ua/ hreflang pair for a bilingual page.
const STATIC = [
  { path: '/' },
  { path: '/about' },
  { path: '/shop' },
  { path: '/resources' },
  { path: '/resources/food-calculator' },
  { path: '/resources/exercise-calculator' },
  { path: '/resources/aid-comparison' },
  { path: '/contact' },
  { path: '/recipes/' },
  { path: '/carb-gi-table', uaPath: '/carb-gi-table-ua' },
  { path: '/cgm-comparison', uaPath: '/cgm-comparison-ua' },
  { path: '/blood-sugar-investigator', uaPath: '/blood-sugar-investigator-ua' },
  { path: '/blog/type-2-diabetes-research/', uaPath: '/ua/blog/type-2-diabetes-research/', lastmod: '2026-07-03' },
  { path: '/blog/collagen-and-skin/', uaPath: '/ua/blog/collagen-and-skin/', lastmod: '2026-07-03' },
  { path: '/blog/perimenopause-weight-myths/', uaPath: '/ua/blog/perimenopause-weight-myths/', lastmod: '2026-07-04' },
  { path: '/blog/protein-for-women-over-40/', uaPath: '/ua/blog/protein-for-women-over-40/', lastmod: '2026-07-04' },
  { path: '/blog/natural-sweeteners/', uaPath: '/ua/blog/natural-sweeteners/', lastmod: '2026-07-09' },
  { path: '/blog/hrt-prescriptions-doubling/', uaPath: '/ua/blog/hrt-prescriptions-doubling/', lastmod: '2026-07-10' },
  { path: '/blog/islet-transplant-insulin-independence/', uaPath: '/ua/blog/islet-transplant-insulin-independence/', lastmod: '2026-07-10' },
  { path: '/blog/carb-quality-healthy-aging/', uaPath: '/ua/blog/carb-quality-healthy-aging/', lastmod: '2026-07-10' },
  { path: '/blog/menopause-skin-oestrogen/', uaPath: '/ua/blog/menopause-skin-oestrogen/', lastmod: '2026-07-10' },
  { path: '/blog/glp1-drugs-less-movement/', uaPath: '/ua/blog/glp1-drugs-less-movement/', lastmod: '2026-07-10' },
];

// --- recipes ---
const dataJs = fs.readFileSync(path.join(HERE, 'recipes', 'recipes-data.js'), 'utf8');
const win = {};
new Function('window', dataJs)(win);
const RECIPES = win.LF_RECIPES || [];

const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

function urlEntry({ loc, lastmod = LASTMOD, image, alt }) {
  const lines = [`  <url>`, `    <loc>${esc(loc)}</loc>`, `    <lastmod>${lastmod}</lastmod>`];
  if (image) {
    lines.push(`    <image:image>`, `      <image:loc>${esc(image)}</image:loc>`, `    </image:image>`);
  }
  if (alt) {
    lines.push(
      `    <xhtml:link rel="alternate" hreflang="en" href="${esc(alt.en)}"/>`,
      `    <xhtml:link rel="alternate" hreflang="uk" href="${esc(alt.uk)}"/>`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(alt.en)}"/>`);
  }
  lines.push(`  </url>`);
  return lines.join('\n');
}

const entries = [];

for (const p of STATIC) {
  if (p.uaPath) {
    const en = SITE + p.path, uk = SITE + p.uaPath;
    entries.push(urlEntry({ loc: en, lastmod: p.lastmod, alt: { en, uk } }));
    entries.push(urlEntry({ loc: uk, lastmod: p.lastmod, alt: { en, uk } }));
  } else {
    entries.push(urlEntry({ loc: SITE + p.path, lastmod: p.lastmod }));
  }
}

for (const R of RECIPES) {
  entries.push(urlEntry({
    loc: `${SITE}/recipes/${R.slug}/`,
    image: R.img ? `${SITE}/recipes/images/${R.img}` : undefined,
  }));
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(HERE, 'sitemap.xml'), xml);
console.log(`Wrote sitemap.xml — ${entries.length} URLs (${RECIPES.length} recipes + ${entries.length - RECIPES.length} other).`);
