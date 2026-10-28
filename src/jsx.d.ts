import 'react';

// <piece> es el elemento que usa chessground (y su hoja de estilos de piezas).
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      piece: React.HTMLAttributes<HTMLElement>;
    }
  }
}
