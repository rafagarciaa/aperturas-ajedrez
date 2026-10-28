// Envoltorio mínimo del protocolo UCI sobre Stockfish (WASM en un Web Worker).
// Las búsquedas se encolan de una en una; cancel() descarta la búsqueda en curso
// y las pendientes (devuelven null).

export type Strength =
  | { kind: 'skill'; skill: number; depth: number }
  | { kind: 'elo'; elo: number; movetime: number }
  | { kind: 'full'; movetime: number };

export interface Score {
  cp?: number; // centipeones desde el punto de vista del bando que mueve
  mate?: number;
}

export interface SearchResult {
  bestmove: string;
  score?: Score;
  pv: string[];
}

type Listener = (line: string) => void;

export class Engine {
  private worker: Worker;
  private listeners = new Set<Listener>();
  private options = new Map<string, string>();
  private chain: Promise<unknown> = Promise.resolve();
  private generation = 0;
  private searching = false;
  readonly ready: Promise<void>;

  constructor(url: string) {
    this.worker = new Worker(url);
    this.worker.onmessage = (e: MessageEvent) => {
      for (const line of String(e.data).split('\n')) {
        if (line) for (const l of [...this.listeners]) l(line);
      }
    };
    this.ready = new Promise<void>((resolve, reject) => {
      this.worker.onerror = (e) => reject(new Error(e.message || 'No se pudo cargar Stockfish'));
      this.send('uci');
      this.waitFor((l) => l === 'uciok')
        .then(() => {
          this.send('isready');
          return this.waitFor((l) => l === 'readyok');
        })
        .then(() => resolve());
    });
  }

  private send(cmd: string) {
    this.worker.postMessage(cmd);
  }

  private waitFor(done: (line: string) => boolean, onLine?: Listener): Promise<string> {
    return new Promise((resolve) => {
      const listener: Listener = (line) => {
        onLine?.(line);
        if (done(line)) {
          this.listeners.delete(listener);
          resolve(line);
        }
      };
      this.listeners.add(listener);
    });
  }

  private setOption(name: string, value: string | number | boolean) {
    const v = String(value);
    if (this.options.get(name) === v) return;
    this.options.set(name, v);
    this.send(`setoption name ${name} value ${v}`);
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const p = this.chain.then(() => this.ready).then(task);
    this.chain = p.catch(() => {});
    return p;
  }

  cancel() {
    this.generation++;
    if (this.searching) this.send('stop');
  }

  newGame() {
    this.cancel();
    this.enqueue(async () => {
      this.send('ucinewgame');
      this.send('isready');
      await this.waitFor((l) => l === 'readyok');
    });
  }

  search(fen: string, strength: Strength): Promise<SearchResult | null> {
    const gen = this.generation;
    return this.enqueue(async () => {
      if (gen !== this.generation) return null;
      if (strength.kind === 'skill') {
        this.setOption('UCI_LimitStrength', false);
        this.setOption('Skill Level', strength.skill);
      } else {
        this.setOption('Skill Level', 20);
        this.setOption('UCI_LimitStrength', strength.kind === 'elo');
        if (strength.kind === 'elo') this.setOption('UCI_Elo', strength.elo);
      }
      this.send(`position fen ${fen}`);
      this.send(strength.kind === 'skill' ? `go depth ${strength.depth}` : `go movetime ${strength.movetime}`);
      this.searching = true;

      let score: Score | undefined;
      let pv: string[] = [];
      const done = await this.waitFor(
        (l) => l.startsWith('bestmove'),
        (line) => {
          if (!line.startsWith('info') || !line.includes(' pv ')) return;
          const s = line.match(/ score (cp|mate) (-?\d+)/);
          if (s) score = s[1] === 'cp' ? { cp: +s[2] } : { mate: +s[2] };
          pv = line.slice(line.indexOf(' pv ') + 4).trim().split(' ');
        },
      );
      this.searching = false;
      const best = done.split(' ')[1];
      if (gen !== this.generation || !best || best === '(none)') return null;
      return { bestmove: best, score, pv };
    });
  }
}

let shared: Engine | null = null;

/** Una única instancia del motor para toda la app. */
export function getEngine(): Engine {
  shared ??= new Engine(`${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`);
  return shared;
}

export interface Level {
  label: string;
  hint: string;
  strength: Strength;
}

export const LEVELS: Level[] = [
  { label: 'Principiante', hint: 'unos 800', strength: { kind: 'skill', skill: 0, depth: 1 } },
  { label: 'Aficionado', hint: 'unos 1100', strength: { kind: 'skill', skill: 3, depth: 4 } },
  { label: 'Elo 1350', hint: 'jugador de club', strength: { kind: 'elo', elo: 1350, movetime: 600 } },
  { label: 'Elo 1500', hint: 'jugador de club', strength: { kind: 'elo', elo: 1500, movetime: 600 } },
  { label: 'Elo 1700', hint: 'club, primera categoría', strength: { kind: 'elo', elo: 1700, movetime: 700 } },
  { label: 'Elo 1900', hint: 'experto', strength: { kind: 'elo', elo: 1900, movetime: 700 } },
  { label: 'Elo 2100', hint: 'candidato a maestro', strength: { kind: 'elo', elo: 2100, movetime: 800 } },
  { label: 'Elo 2400', hint: 'maestro internacional', strength: { kind: 'elo', elo: 2400, movetime: 900 } },
  { label: 'Elo 2700', hint: 'gran maestro de élite', strength: { kind: 'elo', elo: 2700, movetime: 1000 } },
  { label: 'Sin límite', hint: 'Stockfish a plena fuerza', strength: { kind: 'full', movetime: 1500 } },
];

/** Evaluación en texto desde el punto de vista de las blancas: "+0,65", "mate en 3 para las negras". */
export function formatScore(score: Score | undefined, sideToMove: 'w' | 'b'): string {
  if (!score) return 'sin evaluación';
  const sign = sideToMove === 'w' ? 1 : -1;
  if (score.mate !== undefined) {
    const m = score.mate * sign;
    return `mate en ${Math.abs(m)} para las ${m > 0 ? 'blancas' : 'negras'}`;
  }
  const v = ((score.cp ?? 0) * sign) / 100;
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2).replace('.', ',')}`;
}
