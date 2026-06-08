const fs = require('fs');
const path = require('path');

const files = [
  'index.html',
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

console.log(`Prepared ${files.length} files for Capacitor in ${outDir}`);
