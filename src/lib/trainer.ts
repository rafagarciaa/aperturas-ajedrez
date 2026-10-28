// Lógica de la sesión de entrenamiento:
//  - Mientras la posición está en el libro, el rival elige al azar una de las
//    variantes de la selección y tus jugadas se comparan con la teoría.
//  - Cuando la línea termina (o te sales de ella), Stockfish sigue la partida
//    con el nivel elegido.
import { Chess, type Move, type Square } from 'chess.js';
import type { DrawShape } from '@lichess-org/chessground/draw';
import type { Key } from '@lichess-org/chessground/types';
import { Book, START_EPD, toEpd, uciToMove, type BookMove, type BookPosition } from './book';
import { LEVELS, formatScore, type Engine } from './engine';
import { displayName, lineAtEpd, linesOf, nodeById, type Side } from './openings';
import { joinOr, moveLabel } from './san';
import { bumpStats } from './storage';

export interface TrainerConfig {
  nodeId: string;
  color: Side;
  level: number;
  strict: boolean; // rechazar jugadas fuera de teoría
  learn: boolean; // mostrar siempre las flechas de teoría
}

export interface PlayedMove {
  san: string;
  uci: string;
  color: Side;
  book: boolean;
  fen: string; // posición tras la jugada
}

export type BookStatus = 'book' | 'completed' | 'left';
export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export interface Feedback {
  kind: 'ok' | 'error' | 'warn' | 'info' | 'done';
  text: string;
}

export interface TrainerView {
  config: TrainerConfig | null;
  fen: string;
  turn: Side;
  history: PlayedMove[];
  status: BookStatus;
  bookMoves: BookMove[];
  openingName: string;
  feedback: Feedback | null;
  mistakes: number;
  hints: number;
  thinking: boolean;
  promotion: { from: Key; to: Key } | null; // esperando a que elijas pieza
  shapes: DrawShape[];
  dests: Map<Key, Key[]>;
  lastMove?: Key[];
  check: boolean;
  result?: string;
  nonce: number; // cambia para forzar que el tablero vuelva a la posición real
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const bookArrows = (pos: BookPosition): DrawShape[] =>
  pos.moves.slice(0, 5).map((m, i) => ({
    orig: m.uci.slice(0, 2) as Key,
    dest: m.uci.slice(2, 4) as Key,
    brush: i === 0 ? 'green' : 'paleGreen',
  }));

/** "2…d6, 2…Cc6 o 2…e6" */
const listMoves = (moves: BookMove[], ply: number) => joinOr(moves.slice(0, 4).map((m) => moveLabel(ply, m.san)));

export class Trainer {
  private engine: Engine;
  private chess = new Chess();
  private book: Book | null = null;
  private cfg: TrainerConfig | null = null;
  private history: PlayedMove[] = [];
  private feedback: Feedback | null = null;
  private mistakes = 0;
  private hints = 0;
  private failsHere = 0;
  private shapes: DrawShape[] = [];
  private thinking = false;
  private promotion: TrainerView['promotion'] = null;
  private completionRecorded = false; // estadística de «línea completada» ya guardada
  private nonce = 0;
  private token = 0; // invalida respuestas pendientes tras deshacer o reiniciar
  private listeners = new Set<() => void>();
  view: TrainerView;

  constructor(engine: Engine) {
    this.engine = engine;
    this.view = this.computeView();
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getView = () => this.view;

  private emit() {
    this.view = this.computeView();
    for (const fn of this.listeners) fn();
  }

  start(cfg: TrainerConfig) {
    const node = nodeById(cfg.nodeId);
    if (!node) return;
    this.token++;
    this.engine.newGame();
    this.cfg = cfg;
    this.book = new Book(linesOf(node));
    this.chess.reset();
    this.history = [];
    this.mistakes = this.hints = this.failsHere = 0;
    this.shapes = [];
    this.thinking = false;
    this.promotion = null;
    this.completionRecorded = false;
    this.nonce++;
    this.feedback = {
      kind: 'info',
      text: cfg.color === 'w' ? 'Juegas con blancas. Te toca mover.' : 'Juegas con negras. Empieza el rival.',
    };
    bumpStats(cfg.nodeId, { played: 1 });
    this.emit();
    void this.maybeBot();
  }

  restart() {
    if (this.cfg) this.start(this.cfg);
  }

  configure(patch: Partial<Pick<TrainerConfig, 'level' | 'strict' | 'learn'>>) {
    if (!this.cfg) return;
    this.cfg = { ...this.cfg, ...patch };
    this.emit();
  }

  userMove(from: Key, to: Key, promotion?: PromotionPiece) {
    const cfg = this.cfg;
    if (!cfg || this.thinking || this.chess.isGameOver() || this.chess.turn() !== cfg.color) return;
    const piece = this.chess.get(from as Square);
    if (piece?.type === 'p' && (to[1] === '8' || to[1] === '1') && !promotion) {
      // El tablero ya muestra el peón en la última fila; falta elegir la pieza.
      this.promotion = { from, to };
      this.emit();
      return;
    }
    this.promotion = null;
    const before = this.bookInfo();
    const ply = this.history.length;
    let move: Move;
    try {
      move = this.chess.move({ from, to, promotion });
    } catch {
      this.nonce++;
      this.emit();
      return;
    }
    const uci = move.from + move.to + (move.promotion ?? '');
    const label = moveLabel(ply, move.san);
    this.shapes = [];

    if (before.status === 'book' && before.pos) {
      const pos = before.pos;
      // También vale llegar por transposición a una posición del libro.
      const inTheory = pos.moves.some((m) => m.uci === uci) || this.book!.has(toEpd(this.chess.fen()));
      if (inTheory) {
        this.failsHere = 0;
        const others = pos.moves.filter((m) => m.uci !== uci);
        this.feedback = {
          kind: 'ok',
          text: `${label}. Correcto.` + (others.length ? ` También se juega ${listMoves(others, ply)}.` : ''),
        };
        this.record(move, true);
      } else if (cfg.strict) {
        this.chess.undo();
        this.mistakes++;
        this.failsHere++;
        this.nonce++;
        const reveal = this.failsHere >= 3;
        if (reveal) this.shapes = bookArrows(pos);
        this.feedback = {
          kind: 'error',
          text:
            `${label}? No es la teoría de esta línea. ` +
            (reveal ? `Aquí se juega ${listMoves(pos.moves, ply)}.` : 'Prueba otra vez o pide una pista.'),
        };
        this.emit();
        return;
      } else {
        this.mistakes++;
        this.feedback = {
          kind: 'warn',
          text: `${label}?! Te sales de la teoría; lo habitual es ${listMoves(pos.moves, ply)}. Seguimos contra Stockfish.`,
        };
        this.record(move, false);
      }
    } else {
      this.feedback = null;
      this.record(move, false);
    }
    this.afterMove();
  }

  /** Elige la pieza de la coronación pendiente, o null para anular la jugada. */
  promote(piece: PromotionPiece | null) {
    const pending = this.promotion;
    if (!pending) return;
    this.promotion = null;
    if (piece) this.userMove(pending.from, pending.to, piece);
    else {
      this.nonce++;
      this.emit();
    }
  }

  undo() {
    const cfg = this.cfg;
    if (!cfg || !this.history.some((m) => m.color === cfg.color)) return;
    this.token++;
    this.engine.cancel();
    this.thinking = false;
    this.promotion = null;
    while (this.history.length) {
      const m = this.history.pop()!;
      this.chess.undo();
      if (m.color === cfg.color) break;
    }
    this.shapes = [];
    this.failsHere = 0;
    this.nonce++;
    this.feedback = { kind: 'info', text: 'Jugada deshecha.' };
    this.emit();
  }

  async hint() {
    const cfg = this.cfg;
    if (!cfg || this.thinking || this.promotion || this.chess.isGameOver() || this.chess.turn() !== cfg.color) return;
    const info = this.bookInfo();
    const ply = this.history.length;
    if (info.status === 'book' && info.pos) {
      this.hints++;
      this.shapes = bookArrows(info.pos);
      this.feedback = { kind: 'info', text: `Aquí la teoría es ${listMoves(info.pos.moves, ply)}.` };
      this.emit();
      return;
    }
    const token = this.token;
    const fen = this.chess.fen();
    this.thinking = true;
    this.emit();
    try {
      const res = await this.engine.search(fen, { kind: 'full', movetime: 1200 });
      if (token !== this.token) return;
      if (res) {
        const m = uciToMove(res.bestmove);
        const san = new Chess(fen).move(m).san;
        this.shapes = [{ orig: m.from as Key, dest: m.to as Key, brush: 'blue' }];
        this.feedback = {
          kind: 'info',
          text: `Stockfish jugaría ${moveLabel(ply, san)} (${formatScore(res.score, cfg.color)}).`,
        };
      }
    } catch {
      this.feedback = { kind: 'error', text: 'Stockfish no está disponible. Prueba a recargar la página.' };
    }
    this.thinking = false;
    this.emit();
  }

  private bookInfo(): { status: BookStatus; pos?: BookPosition } {
    const book = this.book;
    if (!book) return { status: 'left' };
    let ply = 0;
    while (ply < this.history.length && book.has(toEpd(this.history[ply].fen))) ply++;
    const last = book.get(ply === 0 ? START_EPD : toEpd(this.history[ply - 1].fen))!;
    if (ply === this.history.length && last.moves.length) return { status: 'book', pos: last };
    return { status: last.moves.length ? 'left' : 'completed' };
  }

  private record(move: Move, book: boolean) {
    this.history.push({
      san: move.san,
      uci: move.from + move.to + (move.promotion ?? ''),
      color: move.color,
      book,
      fen: this.chess.fen(),
    });
  }

  private afterMove() {
    // this.view aún refleja la posición anterior a la jugada.
    if (this.bookInfo().status === 'completed' && this.view.status === 'book') {
      const clean = this.mistakes === 0 && this.hints === 0;
      if (!this.completionRecorded) bumpStats(this.cfg!.nodeId, { completed: 1, clean: clean ? 1 : 0 });
      this.completionRecorded = true;
      this.feedback = {
        kind: 'done',
        text:
          `Fin de la teoría: ${this.currentName()}.` +
          (clean ? ' Sin un solo error.' : '') +
          ' Desde aquí juegas contra Stockfish.',
      };
    }
    this.emit();
    void this.maybeBot();
  }

  private async maybeBot() {
    const cfg = this.cfg;
    if (!cfg || this.chess.isGameOver() || this.chess.turn() === cfg.color) return;
    const token = this.token;
    const inBook = this.bookInfo().status === 'book';
    this.thinking = true;
    this.emit();
    let uci: string | undefined;
    try {
      if (inBook) {
        await delay(450);
        uci = this.book!.pick(toEpd(this.chess.fen()))?.uci;
      } else {
        const [res] = await Promise.all([
          this.engine.search(this.chess.fen(), LEVELS[cfg.level].strength),
          delay(350),
        ]);
        uci = res?.bestmove;
      }
    } catch {
      if (token !== this.token) return;
      this.feedback = { kind: 'error', text: 'Stockfish no está disponible. Prueba a recargar la página.' };
    }
    if (token !== this.token) return;
    this.thinking = false;
    if (!uci) {
      this.emit();
      return;
    }
    this.record(this.chess.move(uciToMove(uci)), inBook);
    this.afterMove();
  }

  private currentName(): string {
    for (let i = this.history.length - 1; i >= 0; i--) {
      const line = lineAtEpd(toEpd(this.history[i].fen));
      if (line) return displayName(line.name);
    }
    return 'Posición inicial';
  }

  private result(): string | undefined {
    const c = this.chess;
    if (!c.isGameOver()) return undefined;
    if (c.isCheckmate()) return c.turn() === this.cfg?.color ? 'Jaque mate. Gana Stockfish.' : 'Jaque mate. Has ganado.';
    if (c.isStalemate()) return 'Tablas por ahogado.';
    if (c.isThreefoldRepetition()) return 'Tablas por triple repetición.';
    if (c.isInsufficientMaterial()) return 'Tablas por falta de material.';
    return 'Tablas por la regla de los cincuenta movimientos.';
  }

  private computeView(): TrainerView {
    const cfg = this.cfg;
    const info = this.bookInfo();
    const turn = this.chess.turn();
    const over = this.chess.isGameOver();
    const userTurn = !!cfg && turn === cfg.color && !over && !this.thinking && !this.promotion;
    const dests = new Map<Key, Key[]>();
    if (userTurn) {
      for (const m of this.chess.moves({ verbose: true })) {
        const list = dests.get(m.from as Key);
        if (!list) dests.set(m.from as Key, [m.to as Key]);
        else if (!list.includes(m.to as Key)) list.push(m.to as Key); // una por pieza al coronar
      }
    }
    let shapes = this.shapes;
    if (!shapes.length && cfg?.learn && userTurn && info.pos) shapes = bookArrows(info.pos);
    const last = this.history.at(-1);
    return {
      config: cfg,
      fen: this.chess.fen(),
      turn,
      history: [...this.history],
      status: info.status,
      bookMoves: info.pos?.moves ?? [],
      openingName: this.currentName(),
      feedback: this.feedback,
      mistakes: this.mistakes,
      hints: this.hints,
      thinking: this.thinking,
      promotion: this.promotion,
      shapes,
      dests,
      lastMove: last ? [last.uci.slice(0, 2) as Key, last.uci.slice(2, 4) as Key] : undefined,
      check: this.chess.inCheck(),
      result: this.result(),
      nonce: this.nonce,
    };
  }
}
