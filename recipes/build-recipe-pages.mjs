// Build a standalone page per recipe at /recipes/<slug>/index.html
// Usage: node recipes/build-recipe-pages.mjs [slug1 slug2 ...]   (no args = all recipes)
// Each page reuses recipe.html verbatim (via <base href="/recipes/">) with a baked
// slug + per-recipe SEO <head> (title, description, canonical, Open Graph, JSON-LD Recipe).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));          // .../recipes (decodes %20 in paths with spaces)
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
// schema.org RestrictedDiet values (only the ones with a real enum match).
// Every recipe on this site is blood-sugar-friendly, so DiabeticDiet always applies.
const DIET_SCHEMA = { 'gluten-free':'GlutenFreeDiet', vegetarian:'VegetarianDiet' };

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const isHeader = s => /^—/.test(s);
const clip = (s, n) => { s = String(s).replace(/\s+/g,' ').trim(); return s.length > n ? s.slice(0, n-1).trimEnd() + '…' : s; };
// Short label for a HowToStep: text before a leading "…:" ("Make the marinade: …"),
// else the first sentence (periods inside numbers like "1.5" don't count), clipped.
function stepName(text) {
  const s = String(text).replace(/\s+/g, ' ').trim();
  const colon = s.indexOf(':');
  if (colon > 0 && colon <= 60) return s.slice(0, colon).trim();
  const m = s.match(/^(.+?[.!?])(?=\s|$)/);
  return clip((m ? m[1] : s).replace(/[.!?]+$/, ''), 60);
}

// "20 min" -> PT20M ; "2 hours" -> PT2H ; best-effort, else null
function parseDur(t) {
  if (!t) return null;
  const m = String(t).match(/(\d+)\s*(min|хв|hour|hours|hr|год)/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return /min|хв/i.test(m[2]) ? `PT${n}M` : `PT${n}H`;
}
// total minutes in a duration string ("2 hours (incl. marinating)" -> 120, "20 min" -> 20)
function toMinutes(t) {
  if (!t) return 0;
  const s = String(t);
  const h = s.match(/(\d+)\s*(hour|hours|hr|год)/i);
  const m = s.match(/(\d+)\s*(min|хв)/i);
  return (h ? parseInt(h[1], 10) * 60 : 0) + (m ? parseInt(m[1], 10) : 0);
}
function isoDuration(mins) {
  if (!mins) return null;
  const h = Math.floor(mins / 60), m = mins % 60;
  return 'PT' + (h ? `${h}H` : '') + (m ? `${m}M` : '');
}
// "Per serving (est.): ~600 kcal · Carbs 14 g · Fat 42 g · Protein 45 g"
function parseNutrition(t) {
  const s = String(t || '');
  const num = (re) => { const m = s.match(re); return m ? m[1] : null; };
  const n = {
    calories: num(/([\d.]+)\s*kcal/i),
    carbs: num(/carbs?\s*([\d.]+)\s*g/i),
    fat: num(/fat\s*([\d.]+)\s*g/i),
    protein: num(/protein\s*([\d.]+)\s*g/i),
  };
  if (!n.calories && !n.carbs) return null;
  const out = { '@type': 'NutritionInformation' };
  if (n.calories) out.calories = `${n.calories} calories`;
  if (n.carbs) out.carbohydrateContent = `${n.carbs} g`;
  if (n.fat) out.fatContent = `${n.fat} g`;
  if (n.protein) out.proteinContent = `${n.protein} g`;
  return out;
}

const template = fs.readFileSync(path.join(HERE, 'recipe.html'), 'utf8');

function buildJsonLd(R) {
  const url = `${SITE}/recipes/${R.slug}/`;
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
    recipeInstructions: (R.method.en || []).map((s, i) => ({
      '@type': 'HowToStep', name: stepName(s), text: s, url: `${url}#step-${i + 1}`,
    })),
  };
  const pt = parseDur(R.meta?.prep?.en), ct = parseDur(R.meta?.cook?.en);
  if (pt) ld.prepTime = pt;
  if (ct) ld.cookTime = ct;
  const total = isoDuration(toMinutes(R.meta?.prep?.en) + toMinutes(R.meta?.cook?.en));
  if (total) ld.totalTime = total;
  const nutrition = parseNutrition(R.nutrition?.en);
  if (nutrition) ld.nutrition = nutrition;
  // every recipe here is designed to be blood-sugar-friendly
  const diets = ['https://schema.org/DiabeticDiet',
    ...(R.tags || []).map(t => DIET_SCHEMA[t]).filter(Boolean).map(d => `https://schema.org/${d}`)];
  ld.suitableForDiet = diets;
  return JSON.stringify(ld);
}

function pageFor(R) {
  const url = `${SITE}/recipes/${R.slug}/`;
  const title = `${R.title.en} — Low-GI Recipe`;
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
  // bake the slug (standalone page has no ?r=; window.__LF_PAGE_SLUG also
  // tells recipe.html's script this is a real page, not a ?r= link to forward)
  html = html.replace(
    '<script src="recipes-data.js"></script>',
    `<script>window.__LF_PAGE_SLUG=${JSON.stringify(R.slug)};</script>\n<script src="recipes-data.js"></script>`);
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
