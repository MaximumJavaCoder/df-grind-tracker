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
    const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return {
      recipes: db.recipes || [],
      events: db.events || [],
      follows: db.follows || [],
      users: db.users || [],
      ratings: db.ratings || [],
      sessions: db.sessions || [],
    };
  } catch (error) {
    return { recipes: [], events: [], follows: [], users: [], ratings: [], sessions: [] };
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

function upsertUser(db, user) {
  const now = new Date().toISOString();
  const clean = {
    ...user,
    id: user.id || randomUUID(),
    handle: (user.handle || user.displayName || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `user-${Date.now()}`,
    updatedAt: now,
    createdAt: user.createdAt || now,
  };
  const idx = db.users.findIndex(u => u.id === clean.id || u.handle === clean.handle);
  if (idx >= 0) db.users[idx] = { ...db.users[idx], ...clean };
  else db.users.unshift(clean);
  return clean;
}

function upsertFollow(db, follow) {
  if (!follow.followerId || !follow.followeeId || follow.followerId === follow.followeeId) return null;
  const clean = {
    followerId: follow.followerId,
    followeeId: follow.followeeId,
    createdAt: follow.createdAt || new Date().toISOString(),
  };
  const exists = db.follows.some(f => f.followerId === clean.followerId && f.followeeId === clean.followeeId);
  if (!exists) db.follows.unshift(clean);
  return clean;
}

function upsertRating(db, rating) {
  if (!rating.recipeId || !rating.userId) return null;
  const clean = {
    ...rating,
    id: rating.id || `${rating.recipeId}:${rating.userId}`,
    rating: Math.max(1, Math.min(10, Number(rating.rating) || 1)),
    updatedAt: new Date().toISOString(),
    createdAt: rating.createdAt || new Date().toISOString(),
  };
  const idx = db.ratings.findIndex(r => r.recipeId === clean.recipeId && r.userId === clean.userId);
  if (idx >= 0) db.ratings[idx] = { ...db.ratings[idx], ...clean };
  else db.ratings.unshift(clean);
  const recipe = db.recipes.find(r => r.id === clean.recipeId);
  if (recipe) {
    const ratings = db.ratings.filter(r => r.recipeId === clean.recipeId);
    recipe.ratingCount = ratings.length;
    recipe.communityRating = Math.round((ratings.reduce((sum, r) => sum + Number(r.rating || 0), 0) / ratings.length) * 10) / 10;
  }
  return clean;
}

async function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const db = readDb();

  if (req.method === 'GET' && url.pathname === '/api/health') {
    return send(res, 200, { ok: true, recipes: db.recipes.length, users: db.users.length, follows: db.follows.length, ratings: db.ratings.length, events: db.events.length });
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/social') {
    const body = await readJson(req);
    const provider = body.provider || 'local';
    const providerUserId = body.providerUserId || `${provider}:${body.user?.id || randomUUID()}`;
    const user = upsertUser(db, {
      ...(body.user || {}),
      authProvider: provider,
      providerUserId,
      signedInAt: new Date().toISOString(),
    });
    const session = { id: randomUUID(), userId: user.id, provider, providerUserId, createdAt: new Date().toISOString() };
    db.sessions.unshift(session);
    db.sessions = db.sessions.slice(0, 1000);
    writeDb(db);
    return send(res, 200, { user, session });
  }

  if (req.method === 'GET' && url.pathname === '/api/users') {
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const users = db.users.filter(u => !q || [u.displayName, u.handle, u.bio, u.location?.city, u.location?.region, u.location?.country].join(' ').toLowerCase().includes(q));
    return send(res, 200, { users });
  }

  if (req.method === 'POST' && url.pathname === '/api/users') {
    const user = upsertUser(db, await readJson(req));
    writeDb(db);
    return send(res, 200, { user });
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
    if (body.user) upsertUser(db, body.user);
    const saved = (body.recipes || []).map(recipe => upsertRecipe(db, recipe)).filter(Boolean);
    (body.follows || []).forEach(follow => upsertFollow(db, follow));
    (body.ratings || []).forEach(rating => upsertRating(db, rating));
    writeDb(db);
    return send(res, 200, { recipes: saved, users: db.users, follows: db.follows, ratings: db.ratings });
  }

  if (req.method === 'GET' && url.pathname === '/api/follows') {
    const userId = url.searchParams.get('userId');
    const follows = userId ? db.follows.filter(f => f.followerId === userId || f.followeeId === userId) : db.follows;
    return send(res, 200, { follows });
  }

  if (req.method === 'POST' && url.pathname === '/api/follows') {
    const follow = upsertFollow(db, await readJson(req));
    if (!follow) return send(res, 400, { error: 'followerId and followeeId are required' });
    writeDb(db);
    return send(res, 200, { follow });
  }

  if (req.method === 'POST' && url.pathname === '/api/unfollow') {
    const body = await readJson(req);
    db.follows = db.follows.filter(f => !(f.followerId === body.followerId && f.followeeId === body.followeeId));
    writeDb(db);
    return send(res, 200, { ok: true });
  }

  if (req.method === 'GET' && url.pathname === '/api/ratings') {
    const recipeId = url.searchParams.get('recipeId');
    const ratings = recipeId ? db.ratings.filter(r => r.recipeId === recipeId) : db.ratings;
    return send(res, 200, { ratings });
  }

  if (req.method === 'POST' && url.pathname === '/api/ratings') {
    const rating = upsertRating(db, await readJson(req));
    if (!rating) return send(res, 400, { error: 'recipeId and userId are required' });
    writeDb(db);
    return send(res, 200, { rating });
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
