// Copia el motor Stockfish (versión lite, un solo hilo) a public/engine para
// que el navegador lo cargue como Web Worker. No requiere cabeceras COOP/COEP.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'stockfish', 'bin');
const dest = join(root, 'public', 'engine');
const files = ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm'];

if (!existsSync(src)) {
  console.warn('[copy-engine] node_modules/stockfish no encontrado; omitido.');
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
for (const f of files) copyFileSync(join(src, f), join(dest, f));
copyFileSync(join(root, 'node_modules', 'stockfish', 'Copying.txt'), join(dest, 'COPYING-stockfish.txt'));
console.log(`[copy-engine] ${files.length} archivos copiados a public/engine`);
