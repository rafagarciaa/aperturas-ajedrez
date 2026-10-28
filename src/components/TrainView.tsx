import { useCallback, useEffect, useRef, useState } from 'react';
import type { Key } from '@lichess-org/chessground/types';
import { Board } from './Board';
import { Promotion } from './Promotion';
import { LEVELS } from '../lib/engine';
import type { CatalogNode } from '../lib/openings';
import { toSpanish } from '../lib/san';
import type { PromotionPiece, Trainer, TrainerView } from '../lib/trainer';

interface Props {
  trainer: Trainer;
  view: TrainerView;
  node: CatalogNode;
  onBack: () => void;
}

const STATUS_LABEL = { book: 'En teoría', completed: 'Teoría completada', left: 'Fuera de teoría' };

export function TrainView({ trainer, view, node, onBack }: Props) {
  const cfg = view.config!;
  const [flipped, setFlipped] = useState(false);
  const orientation = (cfg.color === 'w') !== flipped ? 'white' : 'black';
  const userColor = cfg.color === 'w' ? 'white' : 'black';
  const userTurn = view.turn === cfg.color && !view.result;
  const onPick = useCallback((p: PromotionPiece | null) => trainer.promote(p), [trainer]);

  let note = view.feedback;
  if (view.result) note = { kind: 'done', text: view.result };
  else if (!note && view.status !== 'book') {
    note = { kind: 'info', text: `Partida libre contra Stockfish (${LEVELS[cfg.level].label.toLowerCase()}).` };
  }

  const turnText = view.result
    ? 'Partida terminada'
    : view.thinking
      ? userTurn
        ? 'Analizando…'
        : view.status === 'book'
          ? 'El rival elige…'
          : 'Stockfish piensa…'
      : userTurn
        ? 'Te toca'
        : 'Mueve el rival';

  return (
    <div className="train">
      <header className="train-head">
        <button className="link back" onClick={onBack}>
          ← Índice
        </button>
        <p className="kicker">Con {cfg.color === 'w' ? 'blancas' : 'negras'}</p>
        <h1>{node.label}</h1>
      </header>

      <section className="train-note">
        <p className="state">
          <span className={`state-tag ${view.status}`}>{STATUS_LABEL[view.status]}</span>
          <span className="where" title={view.openingName}>
            {view.openingName}
          </span>
          <span className={`turn${view.thinking ? ' busy' : ''}`}>{turnText}</span>
        </p>
        {note && (
          <p className={`note ${note.kind}`} aria-live="polite">
            {note.text}
          </p>
        )}
      </section>

      <section className="train-board">
        <div className="board-wrap">
          <Board
            fen={view.fen}
            orientation={orientation}
            turnColor={view.turn === 'w' ? 'white' : 'black'}
            movableColor={userTurn && !view.thinking ? userColor : undefined}
            dests={view.dests}
            lastMove={view.lastMove}
            check={view.check}
            shapes={view.shapes}
            nonce={view.nonce}
            onMove={(o: Key, d: Key) => trainer.userMove(o, d)}
          />
          {view.promotion && (
            <Promotion to={view.promotion.to} color={userColor} orientation={orientation} onPick={onPick} />
          )}
        </div>
      </section>

      <nav className="train-actions">
        <button onClick={() => trainer.hint()} disabled={!userTurn || view.thinking}>
          Pista
        </button>
        <button onClick={() => trainer.undo()} disabled={!view.history.some((m) => m.color === cfg.color)}>
          Deshacer
        </button>
        <button onClick={() => trainer.restart()}>Otra línea</button>
        <button onClick={() => setFlipped(!flipped)}>Girar</button>
      </nav>

      <section className="train-moves">
        <MoveText view={view} />
        <footer className="train-foot">
          <span>
            {view.mistakes === 1 ? '1 error' : `${view.mistakes} errores`} ·{' '}
            {view.hints === 1 ? '1 pista' : `${view.hints} pistas`}
          </span>
          <label className="check small">
            <input type="checkbox" checked={cfg.learn} onChange={(e) => trainer.configure({ learn: e.target.checked })} />
            Mostrar la teoría
          </label>
        </footer>
      </section>
    </div>
  );
}

/** La partida escrita como en un libro: la teoría en negrita y una marca donde termina. */
function MoveText({ view }: { view: TrainerView }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [view.history.length]);

  const bookEnd = view.history.findIndex((m) => !m.book);
  const parts = view.history.flatMap((m, i) => {
    const out = [];
    if (i === bookEnd) {
      out.push(
        <span key={`end${i}`} className="book-end">
          {view.status === 'completed' ? 'fin de la teoría' : 'fuera de teoría'}
        </span>,
      );
    }
    const num = i % 2 === 0 ? `${i / 2 + 1}.` : i === bookEnd ? `${(i + 1) / 2}…` : '';
    out.push(
      <span key={i} className={`mv${m.book ? ' book' : ''}${i === view.history.length - 1 ? ' last' : ''}`}>
        {num && <span className="num">{num}</span>}
        {toSpanish(m.san)}
      </span>,
    );
    return out;
  });

  return (
    <div className="moves" ref={ref}>
      {parts.length ? <p className="score">{parts}</p> : <p className="moves-empty">La partida empieza en la posición inicial.</p>}
    </div>
  );
}
