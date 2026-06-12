(function () {
  const env = window.BREW_LIBRARY_ENV || {};
  const url = (env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const anonKey = env.VITE_SUPABASE_ANON_KEY || '';

  function configured() {
    return Boolean(url && anonKey);
  }

  function normalize(value = '') {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/['’`]/g, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ');
  }

  async function select(table, params) {
    if (!configured()) return [];
    const search = new URLSearchParams(params);
    const response = await fetch(`${url}/rest/v1/${table}?${search}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
    if (!response.ok) throw new Error(`Supabase ${table} query failed`);
    return response.json();
  }

  function scoreRows(rows, query) {
    const q = normalize(query);
    const seen = new Set();
    return rows
      .map(row => {
        let score = 0;
        (row.search || []).map(normalize).forEach(field => {
          if (!field) return;
          if (field === q) score = Math.max(score, 100);
          else if (field.startsWith(q)) score = Math.max(score, 80);
          else if (field.includes(q)) score = Math.max(score, 50);
        });
        return { ...row, score };
      })
      .filter(row => row.score > 0)
      .sort((a, b) => b.score - a.score || rowLabel(a).localeCompare(rowLabel(b)))
      .filter(row => {
        const key = `${row.type}:${row.id || row.modelId || row.manufacturerId}:${row.label}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function rowLabel(row) {
    return row.label || row.modelName || row.manufacturerName || '';
  }

  async function manufacturerRows(table, aliasTable, query, limit) {
    if (normalize(query).length < 2) return [];
    const [manufacturers, aliases] = await Promise.all([
      select(table, {
        select: '*',
        or: `(canonical_name.ilike.*${query}*,normalized_canonical_name.ilike.*${normalize(query)}*)`,
        limit: String(limit),
      }),
      select(aliasTable, {
        select: '*',
        entity_type: 'eq.manufacturer',
        or: `(alias_text.ilike.*${query}*,normalized_alias_text.ilike.*${normalize(query)}*)`,
        limit: String(limit),
      }),
    ]);
    const aliasIds = [...new Set(aliases.map(alias => alias.entity_id))];
    const aliasManufacturers = aliasIds.length
      ? await select(table, { select: '*', id: `in.(${aliasIds.join(',')})` })
      : [];
    const manufacturerById = new Map(aliasManufacturers.map(m => [m.id, m]));
    const rows = [
      ...manufacturers.map(m => ({
        type: 'manufacturer',
        id: m.id,
        manufacturerId: m.id,
        manufacturerName: m.canonical_name,
        label: m.canonical_name,
        source: 'canonical_name',
        search: [m.canonical_name, m.normalized_canonical_name],
      })),
      ...aliases.map(alias => {
        const m = manufacturerById.get(alias.entity_id);
        return {
          type: 'manufacturer',
          id: alias.entity_id,
          manufacturerId: alias.entity_id,
          manufacturerName: m?.canonical_name || alias.alias_text,
          label: alias.alias_text,
          source: 'alias',
          search: [alias.alias_text, alias.normalized_alias_text, m?.canonical_name],
        };
      }),
    ];
    return scoreRows(rows, query).slice(0, limit);
  }

  async function modelRows(modelTable, aliasTable, manufacturerTable, query, manufacturerId, limit) {
    if (normalize(query).length < 1) return [];
    const modelParams = {
      select: '*',
      or: `(canonical_name.ilike.*${query}*,display_name.ilike.*${query}*,normalized_canonical_name.ilike.*${normalize(query)}*,normalized_display_name.ilike.*${normalize(query)}*)`,
      limit: String(limit),
    };
    if (manufacturerId) modelParams.manufacturer_id = `eq.${manufacturerId}`;
    const models = await select(modelTable, modelParams);
    const aliasParams = {
      select: '*',
      or: `(alias_text.ilike.*${query}*,normalized_alias_text.ilike.*${normalize(query)}*)`,
      limit: String(limit),
    };
    aliasParams.entity_type = modelTable === 'grinder_models' ? 'eq.grinder_model' : 'eq.machine_model';
    const aliases = await select(aliasTable, aliasParams);
    const aliasModelIds = [...new Set(aliases.map(alias => alias.entity_id))];
    let aliasModels = aliasModelIds.length
      ? await select(modelTable, { select: '*', id: `in.(${aliasModelIds.join(',')})` })
      : [];
    if (manufacturerId) aliasModels = aliasModels.filter(model => model.manufacturer_id === manufacturerId);
    const allModels = [...models, ...aliasModels];
    const manufacturerIds = [...new Set(allModels.map(model => model.manufacturer_id).filter(Boolean))];
    const manufacturers = manufacturerIds.length
      ? await select(manufacturerTable, { select: '*', id: `in.(${manufacturerIds.join(',')})` })
      : [];
    const manufacturerById = new Map(manufacturers.map(m => [m.id, m]));
    const modelById = new Map(allModels.map(model => [model.id, model]));
    const rows = [
      ...models.map(model => {
        const manufacturer = manufacturerById.get(model.manufacturer_id);
        return {
          type: modelTable === 'grinder_models' ? 'grinder_model' : 'machine_model',
          id: model.id,
          modelId: model.id,
          manufacturerId: model.manufacturer_id,
          manufacturerName: manufacturer?.canonical_name || model.manufacturer_name,
          modelName: model.canonical_name,
          label: model.display_name || [manufacturer?.canonical_name, model.canonical_name].filter(Boolean).join(' '),
          source: 'canonical_name/display_name',
          search: [model.canonical_name, model.display_name, model.normalized_canonical_name, model.normalized_display_name],
        };
      }),
      ...aliases.map(alias => {
        const model = modelById.get(alias.entity_id);
        if (!model || (manufacturerId && model.manufacturer_id !== manufacturerId)) return null;
        const manufacturer = manufacturerById.get(model.manufacturer_id);
        return {
          type: modelTable === 'grinder_models' ? 'grinder_model' : 'machine_model',
          id: model.id,
          modelId: model.id,
          manufacturerId: model.manufacturer_id,
          manufacturerName: manufacturer?.canonical_name || model.manufacturer_name,
          modelName: model.canonical_name,
          label: alias.alias_text,
          source: 'alias',
          search: [alias.alias_text, alias.normalized_alias_text, model.canonical_name, model.display_name],
        };
      }).filter(Boolean),
    ];
    return scoreRows(rows, query).slice(0, limit);
  }

  window.BrewLibrarySupabase = {
    isConfigured: configured,
    grinderManufacturers: (query, limit = 4) => manufacturerRows('grinder_manufacturers', 'grinder_aliases', query, limit),
    grinderModels: (query, manufacturerId, limit = 4) => modelRows('grinder_models', 'grinder_aliases', 'grinder_manufacturers', query, manufacturerId, limit),
    machineManufacturers: (query, limit = 4) => manufacturerRows('machine_manufacturers', 'machine_aliases', query, limit),
    machineModels: (query, manufacturerId, limit = 4) => modelRows('machine_models', 'machine_aliases', 'machine_manufacturers', query, manufacturerId, limit),
  };
})();
