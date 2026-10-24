import { readFile, writeFile } from 'node:fs/promises';

const catalog = JSON.parse(await readFile(new URL('../src/data-catalog.json', import.meta.url), 'utf8'));
const output = `globalThis.MH3_DATA = ${JSON.stringify(catalog)};\n`;
await writeFile(new URL('../data.js', import.meta.url), output);
console.log('Catálogo local generado en data.js');
