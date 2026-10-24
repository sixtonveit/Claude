// Baut das Spiel zu einer einzigen HTML-Datei: dist/kaiser.html
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const out = await build({ entryPoints: ['src/main.ts'], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false });
const js = out.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const html = readFileSync('index.html', 'utf8').replace('/*BUNDLE*/', () => js);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/kaiser.html', html);
console.log(`dist/kaiser.html ${(html.length / 1024).toFixed(0)} KB`);
