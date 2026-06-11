const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('These are used only by this local import script. Do not expose the service role key in the client app.');
  process.exit(1);
}

const REST_URL = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1`;

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8'));
}

function iso(value) {
  return value || new Date().toISOString();
}

async function upsert(table, rows, onConflict, batchSize = 500) {
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const response = await fetch(`${REST_URL}/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(batch),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed upserting ${table}: ${response.status} ${text}`);
    }
    console.log(`Upserted ${Math.min(i + batchSize, rows.length)}/${rows.length} into ${table}`);
  }
}

function machineRows(seed) {
  return {
    manufacturers: seed.manufacturers.map(row => ({
      id: row.id,
      canonical_name: row.canonical_name,
      normalized_canonical_name: row.normalized_canonical_name,
      slug: row.slug,
      country: row.country,
      category_focus: row.category_focus,
      website_url: row.website_url,
      model_count_from_source: row.model_count_from_source,
      notes: row.notes,
      source: row.source,
      created_at: iso(row.created_at || row.createdAt),
      updated_at: iso(row.updated_at || row.updatedAt),
    })),
    models: seed.machine_models.map(row => ({
      id: row.id,
      manufacturer_id: row.manufacturer_id,
      canonical_name: row.canonical_name,
      display_name: row.display_name,
      normalized_canonical_name: row.normalized_canonical_name,
      normalized_display_name: row.normalized_display_name,
      slug: row.slug,
      category: row.category,
      machine_type: row.machine_type,
      country: row.country,
      lifecycle: row.lifecycle,
      home_relevance: row.home_relevance,
      is_home_machine: row.is_home_machine,
      notes: row.notes,
      manufacturer_website: row.manufacturer_website,
      source_url: row.source_url,
      source: row.source,
      created_at: iso(row.created_at || row.createdAt),
      updated_at: iso(row.updated_at || row.updatedAt),
    })),
    aliases: seed.aliases.map(row => ({
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      alias_text: row.alias_text,
      normalized_alias_text: row.normalized_alias_text,
      source: row.source,
      created_at: iso(row.created_at || row.createdAt),
      updated_at: iso(row.updated_at || row.updatedAt),
    })),
  };
}

function grinderRows(seed) {
  return {
    manufacturers: seed.manufacturers.map(row => ({
      id: row.id,
      canonical_name: row.canonical_name,
      normalized_canonical_name: row.normalized_canonical_name,
      slug: row.slug,
      source_url: row.source_url,
      model_count: row.model_count,
      hand_grinder_models: row.hand_grinder_models,
      electric_models: row.electric_models,
      source: row.source,
      created_at: iso(row.created_at || row.createdAt),
      updated_at: iso(row.updated_at || row.updatedAt),
    })),
    models: seed.grinder_models.map(row => ({
      id: row.id,
      manufacturer_id: row.manufacturer_id,
      manufacturer_name: row.manufacturer_name,
      canonical_name: row.canonical_name,
      display_name: row.display_name,
      normalized_canonical_name: row.normalized_canonical_name,
      normalized_display_name: row.normalized_display_name,
      slug: row.slug,
      category: row.category,
      burr_or_burr_size: row.burr_or_burr_size,
      power_type: row.power_type,
      primary_use: row.primary_use,
      status: row.status,
      source_url: row.source_url,
      backend_notes: row.backend_notes,
      is_hand_grinder: row.is_hand_grinder,
      is_electric_grinder: row.is_electric_grinder,
      source: row.source,
      created_at: iso(row.created_at || row.createdAt),
      updated_at: iso(row.updated_at || row.updatedAt),
    })),
    aliases: seed.aliases.map(row => ({
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      alias_text: row.alias_text,
      normalized_alias_text: row.normalized_alias_text,
      alias_type: row.alias_type,
      source: row.source,
      created_at: iso(row.created_at || row.createdAt),
      updated_at: iso(row.updated_at || row.updatedAt),
    })),
  };
}

async function main() {
  const machineSeed = readJson('data/equipment-seed.json');
  const grinderSeed = readJson('data/grinder-equipment-seed.json');
  const machines = machineRows(machineSeed);
  const grinders = grinderRows(grinderSeed);

  console.log('Importing espresso machine reference data...');
  await upsert('machine_manufacturers', machines.manufacturers, 'id');
  await upsert('machine_models', machines.models, 'id');
  await upsert('machine_aliases', machines.aliases, 'entity_type,entity_id,normalized_alias_text');

  console.log('Importing grinder reference data...');
  await upsert('grinder_manufacturers', grinders.manufacturers, 'id');
  await upsert('grinder_models', grinders.models, 'id');
  await upsert('grinder_aliases', grinders.aliases, 'entity_type,entity_id,normalized_alias_text');

  console.log('Done.');
  console.log(`Machines: ${machines.manufacturers.length} manufacturers, ${machines.models.length} models, ${machines.aliases.length} aliases`);
  console.log(`Grinders: ${grinders.manufacturers.length} manufacturers, ${grinders.models.length} models, ${grinders.aliases.length} aliases`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
