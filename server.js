const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8787);
const DATA_FILE = process.env.DATA_FILE || path.join(ROOT, 'brew-library-data.json');
const EQUIPMENT_SEED_FILE = process.env.EQUIPMENT_SEED_FILE || path.join(ROOT, 'data', 'equipment-seed.json');
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
    return ensureDbShape({
      recipes: db.recipes || [],
      events: db.events || [],
      follows: db.follows || [],
      users: db.users || [],
      ratings: db.ratings || [],
      sessions: db.sessions || [],
      manufacturers: db.manufacturers || [],
      machine_models: db.machine_models || [],
      aliases: db.aliases || [],
      user_suggested_entries: db.user_suggested_entries || [],
      seed_imports: db.seed_imports || [],
    });
  } catch (error) {
    return ensureDbShape({ recipes: [], events: [], follows: [], users: [], ratings: [], sessions: [], manufacturers: [], machine_models: [], aliases: [], user_suggested_entries: [], seed_imports: [] });
  }
}

function writeDb(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function ensureDbShape(db) {
  db.manufacturers = db.manufacturers || [];
  db.machine_models = db.machine_models || [];
  db.aliases = db.aliases || [];
  db.user_suggested_entries = db.user_suggested_entries || [];
  db.seed_imports = db.seed_imports || [];
  if (!db.manufacturers.length && fs.existsSync(EQUIPMENT_SEED_FILE)) {
    const seed = JSON.parse(fs.readFileSync(EQUIPMENT_SEED_FILE, 'utf8'));
    importEquipmentSeed(db, seed, { sourceFile: path.basename(EQUIPMENT_SEED_FILE) });
  }
  return db;
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

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/['’`]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ');
}

function slugify(value = '') {
  return normalizeText(value).replace(/\s+/g, '-') || `entry-${Date.now()}`;
}

function importEquipmentSeed(db, seed, meta = {}) {
  const now = new Date().toISOString();
  const manufacturers = seed.manufacturers || [];
  const models = seed.machine_models || [];
  const aliases = seed.aliases || [];
  const importedManufacturers = new Set(db.manufacturers.map(m => m.id));
  const importedModels = new Set(db.machine_models.map(m => m.id));
  const importedAliases = new Set(db.aliases.map(a => `${a.entity_type}:${a.entity_id}:${normalizeText(a.alias_text)}`));

  manufacturers.forEach(manufacturer => {
    if (!importedManufacturers.has(manufacturer.id)) {
      db.manufacturers.push({ ...manufacturer, normalized_canonical_name: normalizeText(manufacturer.canonical_name), createdAt: manufacturer.createdAt || now, updatedAt: now });
      importedManufacturers.add(manufacturer.id);
    }
  });

  models.forEach(model => {
    if (!importedModels.has(model.id)) {
      db.machine_models.push({
        ...model,
        normalized_canonical_name: normalizeText(model.canonical_name),
        normalized_display_name: normalizeText(model.display_name),
        createdAt: model.createdAt || now,
        updatedAt: now,
      });
      importedModels.add(model.id);
    }
  });

  aliases.forEach(alias => {
    const key = `${alias.entity_type}:${alias.entity_id}:${normalizeText(alias.alias_text)}`;
    if (!importedAliases.has(key)) {
      db.aliases.push({ id: alias.id || randomUUID(), ...alias, normalized_alias_text: alias.normalized_alias_text || normalizeText(alias.alias_text), createdAt: alias.createdAt || now, updatedAt: now });
      importedAliases.add(key);
    }
  });

  db.seed_imports.push({
    id: randomUUID(),
    seed_name: seed.seed_name || meta.sourceFile || 'equipment-seed',
    schema_version: seed.schema_version || '',
    sourceFile: meta.sourceFile || '',
    importedAt: now,
    counts: {
      manufacturers: manufacturers.length,
      machine_models: models.length,
      aliases: aliases.length,
    },
  });
  return db;
}

function manufacturerById(db, id) {
  return db.manufacturers.find(m => m.id === id);
}

function modelById(db, id) {
  return db.machine_models.find(m => m.id === id);
}

function equipmentSearchRows(db) {
  const rows = [];
  db.manufacturers.forEach(manufacturer => {
    rows.push({
      type: 'manufacturer',
      id: manufacturer.id,
      manufacturerId: manufacturer.id,
      manufacturerName: manufacturer.canonical_name,
      label: manufacturer.canonical_name,
      normalized: normalizeText(manufacturer.canonical_name),
      source: 'canonical_name',
      manufacturer,
    });
  });
  db.machine_models.forEach(model => {
    const manufacturer = manufacturerById(db, model.manufacturer_id);
    rows.push({
      type: 'machine_model',
      id: model.id,
      modelId: model.id,
      manufacturerId: model.manufacturer_id,
      manufacturerName: manufacturer?.canonical_name || model.manufacturer_id,
      modelName: model.canonical_name,
      label: model.display_name || [manufacturer?.canonical_name, model.canonical_name].filter(Boolean).join(' '),
      normalized: normalizeText([model.canonical_name, model.display_name].filter(Boolean).join(' ')),
      source: 'canonical_name/display_name',
      model,
      manufacturer,
    });
  });
  db.aliases.forEach(alias => {
    const model = alias.entity_type === 'machine_model' ? modelById(db, alias.entity_id) : null;
    const manufacturer = alias.entity_type === 'manufacturer' ? manufacturerById(db, alias.entity_id) : manufacturerById(db, model?.manufacturer_id);
    rows.push({
      type: alias.entity_type,
      id: alias.entity_id,
      aliasId: alias.id,
      modelId: model?.id,
      manufacturerId: manufacturer?.id,
      manufacturerName: manufacturer?.canonical_name,
      modelName: model?.canonical_name,
      label: alias.alias_text,
      normalized: alias.normalized_alias_text || normalizeText(alias.alias_text),
      source: 'alias',
      alias,
      model,
      manufacturer,
    });
  });
  return rows;
}

function autocompleteEquipment(db, query, limit = 12) {
  const q = normalizeText(query);
  if (!q) return [];
  const scored = equipmentSearchRows(db)
    .map(row => {
      const fields = [row.label, row.normalized, row.manufacturerName, row.modelName, row.model?.display_name].map(normalizeText);
      let score = 0;
      fields.forEach(field => {
        if (!field) return;
        if (field === q) score = Math.max(score, 100);
        else if (field.startsWith(q)) score = Math.max(score, 80);
        else if (field.includes(q)) score = Math.max(score, 50);
      });
      return { ...row, score };
    })
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  const seen = new Set();
  return scored.filter(row => {
    const key = `${row.type}:${row.id}:${row.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

function findEquipmentMatch(db, input) {
  const q = normalizeText([input.manufacturer, input.model, input.text].filter(Boolean).join(' '));
  const manufacturerQ = normalizeText(input.manufacturer || input.text || '');
  const modelQ = normalizeText(input.model || input.text || '');
  return equipmentSearchRows(db).find(row => {
    const rowFull = normalizeText([row.manufacturerName, row.modelName, row.label].filter(Boolean).join(' '));
    return rowFull === q || row.normalized === q || row.normalized === manufacturerQ || row.normalized === modelQ;
  });
}

function createSuggestion(db, input) {
  const now = new Date().toISOString();
  const suggestion = {
    id: randomUUID(),
    manufacturer: input.manufacturer || '',
    model: input.model || '',
    display_name: input.display_name || [input.manufacturer, input.model].filter(Boolean).join(' '),
    text: input.text || '',
    normalized_text: normalizeText([input.manufacturer, input.model, input.display_name, input.text].filter(Boolean).join(' ')),
    status: 'pending',
    userId: input.userId || '',
    createdAt: now,
    updatedAt: now,
    notes: input.notes || '',
  };
  db.user_suggested_entries.unshift(suggestion);
  return suggestion;
}

function addAlias(db, entityType, entityId, aliasText, source = 'admin') {
  const normalized = normalizeText(aliasText);
  const exists = db.aliases.find(a => a.entity_type === entityType && a.entity_id === entityId && (a.normalized_alias_text || normalizeText(a.alias_text)) === normalized);
  if (exists) return exists;
  const alias = { id: randomUUID(), entity_type: entityType, entity_id: entityId, alias_text: aliasText, normalized_alias_text: normalized, source, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  db.aliases.unshift(alias);
  return alias;
}

function updateSuggestionStatus(db, suggestionId, status, resolution = {}) {
  const suggestion = db.user_suggested_entries.find(s => s.id === suggestionId);
  if (!suggestion) return null;
  suggestion.status = status;
  suggestion.resolution = resolution;
  suggestion.updatedAt = new Date().toISOString();
  return suggestion;
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
    return send(res, 200, { ok: true, recipes: db.recipes.length, users: db.users.length, follows: db.follows.length, ratings: db.ratings.length, events: db.events.length, manufacturers: db.manufacturers.length, machine_models: db.machine_models.length, aliases: db.aliases.length, user_suggested_entries: db.user_suggested_entries.length });
  }

  if (req.method === 'GET' && url.pathname === '/api/equipment/autocomplete') {
    const q = url.searchParams.get('q') || '';
    const limit = Math.min(50, Number(url.searchParams.get('limit') || 12));
    return send(res, 200, { results: autocompleteEquipment(db, q, limit) });
  }

  if (req.method === 'GET' && url.pathname === '/api/equipment/manufacturers') {
    return send(res, 200, { manufacturers: db.manufacturers });
  }

  if (req.method === 'GET' && url.pathname === '/api/equipment/models') {
    const manufacturerId = url.searchParams.get('manufacturerId');
    const models = manufacturerId ? db.machine_models.filter(model => model.manufacturer_id === manufacturerId) : db.machine_models;
    return send(res, 200, { machine_models: models });
  }

  if (req.method === 'GET' && url.pathname === '/api/equipment/aliases') {
    const entityId = url.searchParams.get('entityId');
    const aliases = entityId ? db.aliases.filter(alias => alias.entity_id === entityId) : db.aliases;
    return send(res, 200, { aliases });
  }

  if (req.method === 'POST' && url.pathname === '/api/equipment/suggestions') {
    const body = await readJson(req);
    const match = findEquipmentMatch(db, body);
    if (match) return send(res, 200, { matched: true, match });
    const suggestion = createSuggestion(db, body);
    writeDb(db);
    return send(res, 201, { matched: false, suggestion });
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/equipment/suggestions') {
    const status = url.searchParams.get('status');
    const suggestions = status ? db.user_suggested_entries.filter(s => s.status === status) : db.user_suggested_entries;
    return send(res, 200, { suggestions });
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/equipment/actions') {
    const body = await readJson(req);
    const suggestion = db.user_suggested_entries.find(s => s.id === body.suggestionId);
    if (!suggestion) return send(res, 404, { error: 'Suggestion not found' });
    const now = new Date().toISOString();
    let result = null;

    if (body.action === 'approve_as_new_manufacturer') {
      const canonicalName = body.canonical_name || suggestion.manufacturer || suggestion.display_name || suggestion.text;
      const manufacturer = {
        id: body.id || slugify(canonicalName),
        canonical_name: canonicalName,
        slug: body.slug || slugify(canonicalName),
        country: body.country || '',
        category_focus: body.category_focus || '',
        website_url: body.website_url || '',
        model_count_from_source: 0,
        notes: body.notes || suggestion.notes || '',
        source: 'admin',
        normalized_canonical_name: normalizeText(canonicalName),
        createdAt: now,
        updatedAt: now,
      };
      const existing = db.manufacturers.find(m => m.id === manufacturer.id);
      if (existing) Object.assign(existing, manufacturer, { createdAt: existing.createdAt || now });
      else db.manufacturers.unshift(manufacturer);
      result = existing || manufacturer;
      updateSuggestionStatus(db, suggestion.id, 'approved', { action: body.action, manufacturerId: result.id });
    } else if (body.action === 'approve_as_new_model') {
      const manufacturerId = body.manufacturer_id || suggestion.manufacturer_id || slugify(suggestion.manufacturer);
      if (!db.manufacturers.find(m => m.id === manufacturerId)) {
        const manufacturerName = body.manufacturer || suggestion.manufacturer || manufacturerId;
        db.manufacturers.unshift({ id: manufacturerId, canonical_name: manufacturerName, slug: slugify(manufacturerName), normalized_canonical_name: normalizeText(manufacturerName), source: 'admin', createdAt: now, updatedAt: now });
      }
      const canonicalName = body.canonical_name || suggestion.model || suggestion.display_name || suggestion.text;
      const model = {
        id: body.id || `${manufacturerId}_${slugify(canonicalName).replace(/-/g, '_')}`,
        manufacturer_id: manufacturerId,
        canonical_name: canonicalName,
        display_name: body.display_name || suggestion.display_name || [manufacturerById(db, manufacturerId)?.canonical_name, canonicalName].filter(Boolean).join(' '),
        slug: body.slug || slugify(canonicalName),
        category: body.category || '',
        machine_type: body.machine_type || '',
        country: body.country || '',
        lifecycle: body.lifecycle || '',
        home_relevance: body.home_relevance || '',
        is_home_machine: body.is_home_machine ?? true,
        notes: body.notes || suggestion.notes || '',
        source: 'admin',
        normalized_canonical_name: normalizeText(canonicalName),
        normalized_display_name: normalizeText(body.display_name || suggestion.display_name || canonicalName),
        createdAt: now,
        updatedAt: now,
      };
      const existing = db.machine_models.find(m => m.id === model.id);
      if (existing) Object.assign(existing, model, { createdAt: existing.createdAt || now });
      else db.machine_models.unshift(model);
      result = existing || model;
      updateSuggestionStatus(db, suggestion.id, 'approved', { action: body.action, modelId: result.id, manufacturerId });
    } else if (body.action === 'add_as_alias_to_existing_model') {
      const modelId = body.model_id;
      if (!modelById(db, modelId)) return send(res, 400, { error: 'model_id is required and must exist' });
      result = addAlias(db, 'machine_model', modelId, body.alias_text || suggestion.display_name || suggestion.text || suggestion.model, 'admin');
      updateSuggestionStatus(db, suggestion.id, 'approved', { action: body.action, aliasId: result.id, modelId });
    } else if (body.action === 'merge_with_existing_entry') {
      const entityType = body.entity_type || 'machine_model';
      const entityId = body.entity_id;
      if (!entityId) return send(res, 400, { error: 'entity_id is required' });
      result = addAlias(db, entityType, entityId, body.alias_text || suggestion.display_name || suggestion.text || suggestion.model || suggestion.manufacturer, 'admin-merge');
      updateSuggestionStatus(db, suggestion.id, 'merged', { action: body.action, entityType, entityId, aliasId: result.id });
    } else if (body.action === 'reject') {
      result = updateSuggestionStatus(db, suggestion.id, 'rejected', { action: body.action, reason: body.reason || '' });
    } else {
      return send(res, 400, { error: 'Unknown admin action' });
    }

    writeDb(db);
    return send(res, 200, { suggestion, result });
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
  console.log(`Brew Library app and API listening on http://localhost:${PORT}`);
});
