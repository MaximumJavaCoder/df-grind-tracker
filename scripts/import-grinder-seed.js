const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];
const outputPath = process.argv[3] || path.join(__dirname, '..', 'data', 'grinder-equipment-seed.json');

if (!inputPath) {
  console.error('Usage: node scripts/import-grinder-seed.js <seed-json-path> [output-path]');
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

const seed = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const now = new Date().toISOString();

const output = {
  database_name: seed.database_name || 'grinder_manufacturer_model_backend_database',
  version: seed.version || '1.0.0',
  importedAt: now,
  manufacturers: (seed.manufacturers || []).map(manufacturer => ({
    ...manufacturer,
    normalized_canonical_name: manufacturer.normalized_canonical_name || normalizeText(manufacturer.canonical_name),
    createdAt: manufacturer.createdAt || manufacturer.created_at || now,
    updatedAt: now,
  })),
  grinder_models: (seed.grinder_models || []).map(model => ({
    ...model,
    normalized_canonical_name: model.normalized_canonical_name || normalizeText(model.canonical_name),
    normalized_display_name: model.normalized_display_name || normalizeText(model.display_name),
    createdAt: model.createdAt || model.created_at || now,
    updatedAt: now,
  })),
  aliases: (seed.aliases || []).map(alias => ({
    id: alias.id || `${alias.entity_type}:${alias.entity_id}:${normalizeText(alias.alias_text)}`,
    ...alias,
    normalized_alias_text: alias.normalized_alias_text || normalizeText(alias.alias_text),
    createdAt: alias.createdAt || alias.created_at || now,
    updatedAt: now,
  })),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`Imported grinder seed to ${outputPath}`);
console.log(`Grinder manufacturers: ${output.manufacturers.length}`);
console.log(`Grinder models: ${output.grinder_models.length}`);
console.log(`Grinder aliases: ${output.aliases.length}`);
