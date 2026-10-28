import { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Board } from './Board';
import { uciToMove } from '../lib/book';
import { LEVELS } from '../lib/engine';
import { breadcrumb, previewMoves, suggestedSide, type CatalogNode, type Side } from '../lib/openings';
import { formatLine } from '../lib/san';
import { getStats } from '../lib/storage';

export interface Settings {
  color: 'auto' | Side;
  level: number;
  strict: boolean;
  learn: boolean;
}

interface Props {
  node: CatalogNode | null;
  settings: Settings;
  onChange: (s: Settings) => void;
  onStart: () => void;
  engineState: 'loading' | 'ready' | 'error';
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function SetupPanel({ node, settings, onChange, onStart, engineState }: Props) {
  const [open, setOpen] = useState(false);
  const preview = useMemo(() => {
    if (!node) return null;
    const chess = new Chess();
    const sans = previewMoves(node).map((uci) => chess.move(uciToMove(uci)).san);
    return { fen: chess.fen(), text: formatLine(sans) };
  }, [node]);

  if (!node || !preview) {
    return (
      <aside className="sheet empty">
        <p className="note-empty">Elige una apertura del índice para empezar.</p>
      </aside>
    );
  }

  const suggested = suggestedSide(node);
  const side = settings.color === 'auto' ? suggested : settings.color;
  const stats = getStats(node.id);
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });
  const crumb = breadcrumb(node).slice(0, -1);

  return (
    <aside className={`sheet${open ? ' open' : ''}`}>
      <header className="sheet-head">
        <div>
          {crumb.length > 0 && <p className="kicker">{crumb.join(' · ')}</p>}
          <h2>{node.label}</h2>
        </div>
        <button className="link sheet-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? 'Cerrar' : 'Opciones'}
        </button>
      </header>

      <div className="sheet-body">
        <figure className="diagram">
          <div className="mini-board">
            <Board fen={preview.fen} orientation={side === 'w' ? 'white' : 'black'} viewOnly coordinates={false} />
          </div>
          <figcaption>
            <span className="line">{preview.text || 'Posición inicial'}</span>
            <span className="caption">
              {node.lines.length === 1
                ? 'Una sola línea.'
                : `${node.lines.length} líneas; el rival escoge una distinta cada vez.`}
            </span>
            {stats.played > 0 && (
              <span className="caption">
                La has practicado {plural(stats.played, 'vez', 'veces')}: {stats.completed} hasta el final,{' '}
                {stats.clean} sin errores.
              </span>
            )}
          </figcaption>
        </figure>

        <div className="option">
          <span className="option-label">Juegas con</span>
          <div className="choice" role="radiogroup">
            {(['w', 'b'] as const).map((c) => (
              <button key={c} role="radio" aria-checked={side === c} onClick={() => set({ color: c })}>
                {c === 'w' ? 'blancas' : 'negras'}
              </button>
            ))}
          </div>
          {side !== suggested && (
            <p className="option-help">
              Esta variante la suele escoger el jugador de {suggested === 'w' ? 'blancas' : 'negras'}; con{' '}
              {side === 'w' ? 'blancas' : 'negras'} practicarás cómo responderla.
            </p>
          )}
        </div>

        <label className="option">
          <span className="option-label">
            Fuerza de Stockfish <em>{LEVELS[settings.level].label}</em>
          </span>
          <input
            type="range"
            min={0}
            max={LEVELS.length - 1}
            value={settings.level}
            onChange={(e) => set({ level: +e.target.value })}
          />
          <span className="option-help">{LEVELS[settings.level].hint}; juega cuando se acaba la teoría.</span>
        </label>

        <label className="check">
          <input type="checkbox" checked={settings.strict} onChange={(e) => set({ strict: e.target.checked })} />
          <span>
            Corregir errores
            <small>Si te sales de la teoría, la jugada no vale y repites.</small>
          </span>
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.learn} onChange={(e) => set({ learn: e.target.checked })} />
          <span>
            Mostrar la teoría
            <small>Flechas con las jugadas del libro en tu turno. Útil la primera vez.</small>
          </span>
        </label>
      </div>

      <button className="go" onClick={onStart} disabled={engineState === 'error'}>
        {engineState === 'error' ? 'Stockfish no está disponible' : `Empezar con ${side === 'w' ? 'blancas' : 'negras'}`}
      </button>
    </aside>
  );
}
