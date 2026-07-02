const fs = require('fs');
const path = require('path');

const INDEX_PATH = path.join(__dirname, 'index.html');
const POSTS_DIR = path.join(__dirname, '_posts');

function parseFrontmatter(content) {
  const match = content.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]+([\s\S]*)$/);
  if (!match) return { data: {}, body: content.trim() };
  const data = {};
  match[1].split('\n').forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let value = line.slice(colonIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      data[key] = value;
    }
  });
  return { data, body: match[2].trim() };
}

function calcReadTime(text) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200)) + ' min read';
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) { return dateStr; }
}

function mdToParagraphs(md) {
  return md
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p && !p.startsWith('#') && !p.startsWith('---'))
    .map(p =>
      p.replace(/^#+\s*/gm, '')
       .replace(/\*\*([^*]+)\*\*/g, '$1')
       .replace(/\*([^*]+)\*/g, '$1')
       .replace(/`([^`]+)`/g, '$1')
       .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
       .replace(/\n/g, ' ')
       .trim()
    )
    .filter(p => p.length > 10);
}

let cmsArticles = [];
if (fs.existsSync(POSTS_DIR)) {
  const files = fs.readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort().reverse();

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
      const { data, body } = parseFrontmatter(raw);
      if (!data.title) continue;
      const paragraphs = mdToParagraphs(body);
      const dateStr = data.date
        ? formatDate(data.date)
        : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      cmsArticles.push({
        cat: data.category || data.tags || 'Health',
        title: data.title,
        excerpt: data.description || (paragraphs[0] ? paragraphs[0].substring(0, 150) + '...' : ''),
        meta: dateStr + ' · ' + calcReadTime(body),
        lead: data.description || paragraphs[0] || '',
        body: paragraphs
      });
    } catch (e) {
      console.warn('Skipping ' + file + ': ' + e.message);
    }
  }
}

if (cmsArticles.length === 0) {
  console.log('No CMS articles - keeping original content.');
  process.exit(0);
}

console.log('Injecting ' + cmsArticles.length + ' CMS article(s)...');

let html = fs.readFileSync(INDEX_PATH, 'utf8');
const newArray = 'articles: ' + JSON.stringify(cmsArticles, null, 2).replace(/\n/g, '\n      ');

const MARKER = 'articles: [';
const start = html.indexOf(MARKER);
if (start === -1) {
  console.error('Could not find articles array in index.html');
  process.exit(1);
}

let depth = 1, i = start + MARKER.length;
while (i < html.length && depth > 0) {
  if (html[i] === '[') depth++;
  else if (html[i] === ']') depth--;
  i++;
}

html = html.slice(0, start) + newArray + html.slice(i);
fs.writeFileSync(INDEX_PATH, html, 'utf8');
console.log('Done - articles injected.');
