import { useEffect, useRef } from 'react';
import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { DrawShape } from '@lichess-org/chessground/draw';
import type { Color, Key } from '@lichess-org/chessground/types';

interface Props {
  fen: string;
  orientation: Color;
  turnColor?: Color;
  movableColor?: Color;
  dests?: Map<Key, Key[]>;
  lastMove?: Key[];
  check?: boolean;
  shapes?: DrawShape[];
  nonce?: number;
  viewOnly?: boolean;
  coordinates?: boolean;
  onMove?: (orig: Key, dest: Key) => void;
}

const NO_DESTS = new Map<Key, Key[]>();
const NO_SHAPES: DrawShape[] = [];

// Colores de las flechas a juego con la tinta del resto de la app.
const BRUSHES = {
  green: { key: 'g', color: '#2f5d3a', opacity: 0.9, lineWidth: 10 },
  paleGreen: { key: 'pg', color: '#2f5d3a', opacity: 0.45, lineWidth: 12 },
  red: { key: 'r', color: '#9a2b20', opacity: 0.9, lineWidth: 10 },
  blue: { key: 'b', color: '#284870', opacity: 0.9, lineWidth: 10 },
  yellow: { key: 'y', color: '#a8781c', opacity: 0.9, lineWidth: 10 },
};

export function Board(props: Props) {
  const el = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const onMove = useRef(props.onMove);

  useEffect(() => {
    onMove.current = props.onMove;
  }, [props.onMove]);

  useEffect(() => {
    const cg = Chessground(el.current!, {
      coordinates: props.coordinates ?? true,
      ranksPosition: 'left',
      viewOnly: props.viewOnly,
      animation: { enabled: true, duration: 180 },
      highlight: { lastMove: true, check: true },
      movable: { free: false, showDests: true, events: { after: (o, d) => onMove.current?.(o, d) } },
      premovable: { enabled: false },
      draggable: { showGhost: true },
      drawable: { enabled: true, visible: true, brushes: BRUSHES },
    });
    api.current = cg;
    const ro = new ResizeObserver(() => cg.redrawAll());
    ro.observe(el.current!);
    return () => {
      ro.disconnect();
      cg.destroy();
      api.current = null;
    };
    // El tablero se crea una sola vez; los cambios llegan por el efecto de abajo.
  }, []);

  const { fen, orientation, turnColor, movableColor, dests, lastMove, check, shapes, nonce } = props;
  useEffect(() => {
    api.current?.set({
      fen,
      orientation,
      turnColor,
      lastMove,
      check: !!check,
      movable: { color: movableColor, dests: dests ?? NO_DESTS },
      drawable: { autoShapes: shapes ?? NO_SHAPES },
    });
  }, [fen, orientation, turnColor, movableColor, dests, lastMove, check, shapes, nonce]);

  return <div ref={el} className="cg-host" />;
}
