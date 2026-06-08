const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8787);
const DATA_FILE = process.env.DATA_FILE || path.join(ROOT, 'df-dial-data.json');
const JSON_LIMIT = 1024 * 1024;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
};

function readDb() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    return { recipes: [], events: [], follows: [] };
  }
}

function writeDb(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > JSON_LIMIT) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function publicRecipe(recipe) {
  return recipe && recipe.visibility === 'public' && recipe.id && recipe.ownerId;
}

function upsertRecipe(db, recipe) {
  const now = new Date().toISOString();
  const clean = {
    ...recipe,
    id: recipe.id || randomUUID(),
    visibility: recipe.visibility || 'public',
    updatedAt: now,
    createdAt: recipe.createdAt || now,
  };
  if (!publicRecipe(clean)) return null;
  const idx = db.recipes.findIndex(r => r.id === clean.id);
  if (idx >= 0) db.recipes[idx] = { ...db.recipes[idx], ...clean };
  else db.recipes.unshift(clean);
  return clean;
}

async function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const db = readDb();

  if (req.method === 'GET' && url.pathname === '/api/health') {
    return send(res, 200, { ok: true, recipes: db.recipes.length, events: db.events.length });
  }

  if (req.method === 'GET' && url.pathname === '/api/recipes') {
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const method = url.searchParams.get('method');
    const roast = url.searchParams.get('roast');
    const recipes = db.recipes
      .filter(publicRecipe)
      .filter(r => !method || r.method === method)
      .filter(r => !roast || r.roastLevel === roast)
      .filter(r => {
        if (!q) return true;
        return [r.title, r.ownerName, r.ownerHandle, r.method, r.beanName, r.roaster, r.origin, r.process, r.roastLevel, (r.tags || []).join(' '), r.notes].join(' ').toLowerCase().includes(q);
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    return send(res, 200, { recipes });
  }

  if (req.method === 'POST' && url.pathname === '/api/recipes') {
    const recipe = upsertRecipe(db, await readJson(req));
    if (!recipe) return send(res, 400, { error: 'Recipe must be public and include id and ownerId' });
    writeDb(db);
    return send(res, 200, { recipe });
  }

  if (req.method === 'POST' && url.pathname === '/api/recipes/bulk') {
    const body = await readJson(req);
    const saved = (body.recipes || []).map(recipe => upsertRecipe(db, recipe)).filter(Boolean);
    writeDb(db);
    return send(res, 200, { recipes: saved });
  }

  if (req.method === 'POST' && url.pathname === '/api/events') {
    const event = await readJson(req);
    db.events.unshift({ ...event, id: event.id || randomUUID(), receivedAt: new Date().toISOString() });
    db.events = db.events.slice(0, 5000);
    writeDb(db);
    return send(res, 200, { ok: true });
  }

  if (req.method === 'GET' && url.pathname === '/api/events') {
    return send(res, 200, { events: db.events.slice(0, 100) });
  }

  return send(res, 404, { error: 'Not found' });
}

function serveStatic(req, res, url) {
  let filePath = path.normalize(decodeURIComponent(url.pathname));
  if (filePath === '/' || filePath === '.') filePath = '/index.html';
  const resolved = path.join(ROOT, filePath);
  if (!resolved.startsWith(ROOT)) return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  fs.readFile(resolved, (error, content) => {
    if (error) {
      fs.readFile(path.join(ROOT, 'index.html'), (fallbackError, fallback) => {
        if (fallbackError) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
        send(res, 200, fallback, TYPES['.html']);
      });
      return;
    }
    send(res, 200, content, TYPES[path.extname(resolved)] || 'application/octet-stream');
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    return serveStatic(req, res, url);
  } catch (error) {
    return send(res, 500, { error: error.message || 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log(`DF Dial app and API listening on http://localhost:${PORT}`);
});
