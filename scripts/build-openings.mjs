// Convierte los TSV de lichess-org/chess-openings (CC0) en un JSON compacto:
//   [eco, nombre, "e2e4 c7c5 ...", epdFinal]
// Las jugadas se validan con chess.js y se guardan en notación UCI.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'data', 'lichess-openings');
const out = join(root, 'src', 'data', 'openings.json');

const epd = (fen) => fen.split(' ').slice(0, 4).join(' ');
const rows = [];
let errors = 0;

for (const letter of ['a', 'b', 'c', 'd', 'e']) {
  const lines = readFileSync(join(srcDir, `${letter}.tsv`), 'utf8').split(/\r?\n/).slice(1);
  for (const line of lines) {
    if (!line.trim()) continue;
    const [eco, name, pgn] = line.split('\t');
    const sans = pgn.replace(/\d+\.(\.\.)?/g, ' ').trim().split(/\s+/);
    const chess = new Chess();
    try {
      const ucis = sans.map((san) => {
        const m = chess.move(san);
        return m.from + m.to + (m.promotion ?? '');
      });
      rows.push([eco, name, ucis.join(' '), epd(chess.fen())]);
    } catch (e) {
      errors++;
      console.warn(`[openings] línea inválida: ${eco} ${name}: ${e.message}`);
    }
  }
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(rows));
console.log(`[openings] ${rows.length} líneas escritas en src/data/openings.json (${errors} errores)`);
