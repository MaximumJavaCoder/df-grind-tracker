const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];
const outputPath = process.argv[3] || path.join(__dirname, '..', 'data', 'equipment-seed.json');

if (!inputPath) {
  console.error('Usage: node scripts/import-machine-seed.js <seed-json-path> [output-path]');
  process.exit(1);
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
  return normalizeText(String(value).replace(/\+/g, ' plus')).replace(/\s+/g, '_') || `entry_${Date.now()}`;
}

const seed = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const now = new Date().toISOString();
const modelIds = new Set();

const output = {
  schema_version: seed.schema_version || '1.0.0',
  seed_name: seed.seed_name || 'home_espresso_machines',
  importedAt: now,
  manufacturers: (seed.manufacturers || []).map(manufacturer => ({
    ...manufacturer,
    normalized_canonical_name: manufacturer.normalized_canonical_name || normalizeText(manufacturer.canonical_name),
    createdAt: manufacturer.createdAt || now,
    updatedAt: now,
  })),
  machine_models: (seed.machine_models || []).map(model => {
    let id = model.id;
    if (modelIds.has(id)) {
      const candidate = `${model.manufacturer_id}_${slugify(model.display_name || model.canonical_name)}`;
      id = modelIds.has(candidate) ? `${candidate}_${modelIds.size}` : candidate;
    }
    modelIds.add(id);
    return {
      ...model,
      id,
      original_id: id === model.id ? undefined : model.id,
      normalized_canonical_name: model.normalized_canonical_name || normalizeText(model.canonical_name),
      normalized_display_name: model.normalized_display_name || normalizeText(model.display_name),
      createdAt: model.createdAt || now,
      updatedAt: now,
    };
  }),
  aliases: (seed.aliases || []).map(alias => ({
    id: alias.id || `${alias.entity_type}:${alias.entity_id}:${normalizeText(alias.alias_text)}`,
    ...alias,
    normalized_alias_text: alias.normalized_alias_text || normalizeText(alias.alias_text),
    createdAt: alias.createdAt || now,
    updatedAt: now,
  })),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`Imported equipment seed to ${outputPath}`);
console.log(`Manufacturers: ${output.manufacturers.length}`);
console.log(`Machine models: ${output.machine_models.length}`);
console.log(`Aliases: ${output.aliases.length}`);
