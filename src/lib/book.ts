// Libro de teoría para una selección de líneas. Las posiciones se indexan por EPD,
// así que las transposiciones (mismo puesto por otro orden de jugadas) se reconocen.
import { Chess } from 'chess.js';
import type { OpeningLine } from './openings';

export interface BookMove {
  uci: string;
  san: string;
  weight: number; // nº de líneas de la selección que pasan por esta jugada
}

export interface BookPosition {
  moves: BookMove[]; // ordenadas de más a menos frecuente; vacío = final de línea
}

export const toEpd = (fen: string) => fen.split(' ').slice(0, 4).join(' ');
export const START_EPD = toEpd(new Chess().fen());

export const uciToMove = (uci: string) => ({
  from: uci.slice(0, 2),
  to: uci.slice(2, 4),
  promotion: uci[4],
});

export class Book {
  private positions = new Map<string, BookPosition>();

  constructor(lines: OpeningLine[]) {
    for (const line of lines) {
      const chess = new Chess();
      for (const uci of line.moves) {
        const pos = this.at(toEpd(chess.fen()));
        const move = chess.move(uciToMove(uci));
        let entry = pos.moves.find((m) => m.uci === uci);
        if (!entry) pos.moves.push((entry = { uci, san: move.san, weight: 0 }));
        entry.weight++;
      }
      this.at(toEpd(chess.fen()));
    }
    for (const pos of this.positions.values()) pos.moves.sort((a, b) => b.weight - a.weight);
  }

  private at(epd: string): BookPosition {
    let pos = this.positions.get(epd);
    if (!pos) this.positions.set(epd, (pos = { moves: [] }));
    return pos;
  }

  has = (epd: string) => this.positions.has(epd);
  get = (epd: string) => this.positions.get(epd);

  /** Elige una jugada al azar, ponderada por cuántas variantes la siguen. */
  pick(epd: string): BookMove | undefined {
    const moves = this.positions.get(epd)?.moves ?? [];
    const total = moves.reduce((s, m) => s + m.weight, 0);
    let r = Math.random() * total;
    for (const m of moves) if ((r -= m.weight) < 0) return m;
    return moves[0];
  }
}
