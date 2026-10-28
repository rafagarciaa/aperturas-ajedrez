// Notación algebraica española: Nf3 → Cf3, Bb5 → Ab5, e8=Q → e8=D
const ES: Record<string, string> = { K: 'R', Q: 'D', R: 'T', B: 'A', N: 'C' };

export const toSpanish = (san: string) =>
  san.replace(/^[KQRBN]/, (c) => ES[c]).replace(/=([QRBN])/, (_, p: string) => `=${ES[p]}`);

/** Etiqueta con número de jugada: ply 0 → "1.e4", ply 1 → "1…c5" */
export const moveLabel = (ply: number, san: string) =>
  `${Math.floor(ply / 2) + 1}${ply % 2 === 0 ? '.' : '…'}${toSpanish(san)}`;

/** ["e4", "c5", "Nf3"] → "1.e4 c5 2.Cf3" */
export function formatLine(sans: string[]): string {
  return sans.map((s, i) => (i % 2 === 0 ? `${i / 2 + 1}.${toSpanish(s)}` : toSpanish(s))).join(' ');
}

/** ["a", "b", "c"] → "a, b o c" */
export const joinOr = (items: string[]) =>
  items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} o ${items[items.length - 1]}`;
