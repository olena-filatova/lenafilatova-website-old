// Build a standalone page per recipe at /recipes/<slug>/index.html
// Usage: node recipes/build-recipe-pages.mjs [slug1 slug2 ...]   (no args = all recipes)
// Each page reuses recipe.html verbatim (via <base href="/recipes/">) with a baked
// slug + per-recipe SEO <head> (title, description, canonical, Open Graph, JSON-LD Recipe).
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);       // .../recipes
const SITE = 'https://lenafilatova.co.uk';

// --- load recipe data (recipes-data.js sets window.LF_RECIPES) ---
const dataJs = fs.readFileSync(path.join(HERE, 'recipes-data.js'), 'utf8');
const win = {};
new Function('window', dataJs)(win);
const RECIPES = win.LF_RECIPES || [];

const CAT = { main:'Main course', dessert:'Dessert', baking:'Baking', snack:'Snack',
  breakfast:'Breakfast', bread:'Bread', sauce:'Sauce', drink:'Drink' };
const DIET = { 'sugar-free':'Sugar-free','gluten-free':'Gluten-free','low-carb':'Low carb',
  vegetarian:'Vegetarian','dairy-free':'Dairy-free' };

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const isHeader = s => /^—/.test(s);
const clip = (s, n) => { s = String(s).replace(/\s+/g,' ').trim(); return s.length > n ? s.slice(0, n-1).trimEnd() + '…' : s; };

// "20 min" -> PT20M ; "2 hours" -> PT2H ; best-effort, else null
function parseDur(t) {
  if (!t) return null;
  const m = String(t).match(/(\d+)\s*(min|хв|hour|hours|hr|год)/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return /min|хв/i.test(m[2]) ? `PT${n}M` : `PT${n}H`;
}
function kcal(t) { const m = String(t || '').match(/(\d+)\s*kcal/i); return m ? `${m[1]} calories` : null; }

const template = fs.readFileSync(path.join(HERE, 'recipe.html'), 'utf8');

function buildJsonLd(R) {
  const ld = {
    '@context': 'https://schema.org/', '@type': 'Recipe',
    name: R.title.en,
    image: [`${SITE}/recipes/images/${R.img}`],
    author: { '@type': 'Person', name: 'Lena Filatova' },
    description: clip(R.why.en, 300),
    recipeCategory: CAT[R.cat] || R.cat,
    keywords: ['low GI', CAT[R.cat] || R.cat, ...(R.tags || []).map(t => DIET[t] || t)].join(', '),
    recipeYield: R.meta?.serves?.en,
    recipeIngredient: (R.ingredients.en || []).filter(s => !isHeader(s)),
    recipeInstructions: (R.method.en || []).map(s => ({ '@type': 'HowToStep', text: s })),
  };
  const pt = parseDur(R.meta?.prep?.en), ct = parseDur(R.meta?.cook?.en);
  if (pt) ld.prepTime = pt;
  if (ct) ld.cookTime = ct;
  const cal = kcal(R.nutrition?.en);
  if (cal) ld.nutrition = { '@type': 'NutritionInformation', calories: cal };
  return JSON.stringify(ld);
}

function pageFor(R) {
  const url = `${SITE}/recipes/${R.slug}/`;
  const title = `${R.title.en} — Low-GI Recipe — Lena Filatova`;
  const desc = clip(R.why.en, 155);
  const img = `${SITE}/recipes/images/${R.img}`;
  const head = [
    `<base href="/recipes/">`,
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:image" content="${img}">`,
    `<meta property="og:url" content="${url}">`,
    `<script type="application/ld+json">${buildJsonLd(R)}</script>`,
  ].join('\n');

  let html = template;
  // inject <base> + SEO right after <head>
  html = html.replace('<head>', `<head>\n${head}`);
  // per-recipe <title> + description
  html = html.replace('<title>Low-GI Recipe — Lena Filatova</title>', `<title>${esc(title)}</title>`);
  html = html.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${esc(desc)}" />`);
  // pre-fill the H1 for crawlers / no-CLS (JS re-sets it to the active language)
  html = html.replace('<h1 id="rTitle"></h1>', `<h1 id="rTitle">${esc(R.title.en)}</h1>`);
  // bake the slug (no ?r= on a clean URL)
  html = html.replace(
    "var slug = param('r') || (recipes[0] && recipes[0].slug);",
    `var slug = param('r') || ${JSON.stringify(R.slug)} || (recipes[0] && recipes[0].slug);`);
  return html;
}

const args = process.argv.slice(2);
const list = args.length ? RECIPES.filter(r => args.includes(r.slug)) : RECIPES;
let n = 0;
for (const R of list) {
  const dir = path.join(HERE, R.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), pageFor(R));
  n++;
}
console.log(`Generated ${n} recipe page(s)${args.length ? ' for: ' + args.join(', ') : ' (all)'}.`);
