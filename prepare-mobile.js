const fs = require('fs');
const path = require('path');

const files = [
  'index.html',
  'env.js',
  'supabaseClient.js',
  'app.js',
  'styles.css',
  'manifest.json',
  'sw.js',
  'icon.svg',
  'brew-library-logo.svg',
];

const outDir = path.join(__dirname, 'www');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const file of files) {
  fs.copyFileSync(path.join(__dirname, file), path.join(outDir, file));
}

fs.writeFileSync(path.join(outDir, 'env.js'), `window.BREW_LIBRARY_ENV = {
  VITE_SUPABASE_URL: ${JSON.stringify(process.env.VITE_SUPABASE_URL || '')},
  VITE_SUPABASE_ANON_KEY: ${JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || '')}
};
`);

console.log(`Prepared ${files.length} files for Capacitor in ${outDir}`);
