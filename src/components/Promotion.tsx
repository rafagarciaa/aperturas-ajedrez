import { useEffect } from 'react';
import type { Key } from '@lichess-org/chessground/types';
import type { PromotionPiece } from '../lib/trainer';

const PIECES: [PromotionPiece, string, string][] = [
  ['q', 'queen', 'Dama'],
  ['n', 'knight', 'Caballo'],
  ['r', 'rook', 'Torre'],
  ['b', 'bishop', 'Alfil'],
];

interface Props {
  to: Key;
  color: 'white' | 'black';
  orientation: 'white' | 'black';
  onPick: (piece: PromotionPiece | null) => void;
}

/** Columna de piezas sobre la casilla de coronación; la dama queda en la propia casilla. */
export function Promotion({ to, color, orientation, onPick }: Props) {
  const file = to.charCodeAt(0) - 97;
  const col = orientation === 'white' ? file : 7 - file;
  const fromTop = (to[1] === '8') === (orientation === 'white');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onPick(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPick]);

  return (
    <div className="promo" onClick={() => onPick(null)}>
      <div
        className={`promo-col cg-wrap${fromTop ? '' : ' from-bottom'}`}
        style={{ left: `${col * 12.5}%`, [fromTop ? 'top' : 'bottom']: 0 }}
        role="dialog"
        aria-label="Elige la pieza de la coronación"
      >
        {PIECES.map(([p, role, name]) => (
          <button
            key={p}
            title={name}
            aria-label={name}
            onClick={(e) => {
              e.stopPropagation();
              onPick(p);
            }}
          >
            <piece className={`${role} ${color}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
