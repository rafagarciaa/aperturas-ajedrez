# Aperturas · Entrenador de ajedrez

App para practicar aperturas de ajedrez (con blancas o con negras) contra un rival que juega la
teoría y, al terminar la línea, contra **Stockfish 19**. Funciona en escritorio y en móvil como
**PWA** (se instala como una app y funciona sin conexión).

**Web publicada:** https://rafagarciaa.github.io/aperturas-ajedrez/
**App de Android:** https://github.com/rafagarciaa/aperturas-ajedrez/releases/latest/download/aperturas.apk

## Cómo funciona

1. Eliges una apertura **o cualquier variante concreta** del árbol (p. ej. *Defensa Siciliana ›
   Najdorf Variation › English Attack*). Hay 3.865 líneas con nombre agrupadas en familias, con
   buscador por nombre (español o inglés) y código ECO.
2. Eliges color (se sugiere el bando que "elige" esa variante), el nivel de Stockfish y el modo.
3. Mientras la posición está en el libro:
   - El rival elige **al azar una de las variantes** de tu selección (ponderando por cuántas
     sub-variantes tiene cada jugada), así cada partida recorre una rama distinta.
   - Tus jugadas se comparan con la teoría. Las transposiciones se reconocen.
   - **Corregir errores** (activado por defecto): si te sales de la teoría la jugada se rechaza y
     repites; tras 3 fallos se muestran las jugadas correctas. Desactivado, la desviación cuenta
     como error y la partida sigue contra Stockfish.
   - **Mostrar la teoría**: flechas con las jugadas del libro en tu turno.
4. Al llegar al final de la línea ("fin de la teoría") la partida continúa contra Stockfish con el
   nivel elegido (de ≈800 a sin límite; usa `UCI_LimitStrength`/`UCI_Elo` y `Skill Level`).
5. Botones: **Pista** (en teoría: jugadas del libro; fuera: mejor jugada de Stockfish y
   evaluación), **Deshacer**, **Otra línea** (reinicia con otra rama al azar) y **Girar**.
6. Al coronar eliges la pieza (dama, caballo, torre o alfil). Las jugadas se escriben en notación
   española (Cf3, Ab5, d8=D).

Se guardan en el dispositivo los ajustes y estadísticas por apertura (veces practicada, líneas
completadas y completadas sin errores).

## Uso

Requiere Node.js 20 o superior.

```bash
npm install
```

```bash
npm run dev
```

Abre http://localhost:5173. Otros comandos:

| Comando | Qué hace |
| --- | --- |
| `npm run build` | Comprueba tipos y genera la versión de producción en `dist/` |
| `npm run preview` | Sirve `dist/` en http://localhost:4173 |
| `npm run openings` | Regenera `src/data/openings.json` desde `data/lichess-openings/*.tsv` |

`npm install` copia automáticamente el motor (`stockfish-19-lite-single`, ~1,8 MB, un solo hilo,
no necesita cabeceras COOP/COEP) a `public/engine/`.

## Instalar como app

- **Windows / macOS / Linux**: abre la app en Chrome o Edge y pulsa el icono *Instalar* de la barra
  de direcciones. Queda como app propia en el menú Inicio / Dock.
- **Android**: Chrome → menú ⋮ → *Instalar aplicación*.
- **iPhone / iPad**: Safari → *Compartir* → *Añadir a pantalla de inicio*.

Una vez instalada funciona sin conexión y se actualiza sola cuando hay una versión nueva.

### Publicación

Cada `push` a `main` lanza el workflow `.github/workflows/deploy.yml`, que compila la app con
`BASE_PATH=/aperturas-ajedrez/` y la publica en GitHub Pages. Para probar en local la misma ruta:

```bash
BASE_PATH=/aperturas-ajedrez/ npm run build
```

### App de Android (APK)

El proyecto nativo está en `android/` ([Capacitor](https://capacitorjs.com/)). No hace falta Android
Studio: el workflow `.github/workflows/android.yml` compila el APK en GitHub en cada `push` a
`main`, lo firma con la clave de los secretos `ANDROID_KEYSTORE_BASE64` y
`ANDROID_KEYSTORE_PASSWORD`, y lo publica en *Releases*. Cada versión lleva un número mayor, así
que se instala encima de la anterior sin perder los datos.

La clave está en `keystore/` (fuera de git). **Guarda una copia**: sin ella no se pueden firmar
actualizaciones de la misma app.

Para compilar en local (con Android Studio instalado): `npm run build:android` y abrir `android/`.

En iPhone la opción es la PWA: una app nativa exige Mac, Xcode y cuenta de desarrollador de Apple.

## Estructura

```
src/
  lib/openings.ts   Catálogo: árbol de familias/variantes, traducciones, búsqueda
  lib/book.ts       Libro de teoría de la selección (posiciones indexadas por EPD)
  lib/engine.ts     Stockfish en Web Worker (UCI), niveles de fuerza
  lib/trainer.ts    Lógica de la sesión: validación, rival de libro, paso al motor
  lib/storage.ts    Ajustes y estadísticas en localStorage
  components/       Tablero (chessground), selector, panel de opciones, vista de partida
scripts/
  build-openings.mjs  TSV de Lichess → JSON (valida cada línea con chess.js)
  copy-engine.mjs     Copia Stockfish WASM a public/engine
data/lichess-openings/  Base de aperturas original
```

## Limitaciones conocidas

- La base de Lichess incluye también líneas raras con nombre (p. ej. 2…h6, *Variante Bücker*),
  que cuentan como teoría. Elegir una variante concreta acota el entrenamiento.
- El rival pondera sus elecciones por número de sub-variantes, no por estadísticas reales de
  partidas.

## Licencias

- [Stockfish](https://stockfishchess.org/) / [stockfish.js](https://github.com/nmrugg/stockfish.js): GPL-3.0
- [chessground](https://github.com/lichess-org/chessground) (tablero de Lichess): GPL-3.0-or-later
- [chess.js](https://github.com/jhlywa/chess.js): BSD-2-Clause
- [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings): CC0-1.0

Por incluir Stockfish y chessground, esta app se distribuye bajo **GPL-3.0-or-later**.
