// Catálogo de aperturas a partir de la base de Lichess (CC0).
// Cada línea tiene un nombre jerárquico "Familia: Variante, Subvariante" que
// convertimos en un árbol navegable. Elegir un nodo del árbol = practicar todas
// las líneas que cuelgan de él.
import raw from '../data/openings.json';

export type Side = 'w' | 'b';

export interface OpeningLine {
  id: number;
  eco: string;
  name: string;
  moves: string[]; // UCI
  epd: string; // posición final (FEN sin contadores)
}

export interface CatalogNode {
  id: string;
  path: string[]; // nombres originales (inglés)
  label: string; // nombre mostrado (español si hay traducción)
  original: string;
  depth: number;
  parent?: CatalogNode;
  children: CatalogNode[];
  own: number[]; // líneas cuyo nombre es exactamente este nodo
  lines: number[]; // todas las líneas del subárbol
  ecoFrom: string;
  ecoTo: string;
  search: string;
}

type RawRow = [eco: string, name: string, moves: string, epd: string];

export const LINES: OpeningLine[] = (raw as unknown as RawRow[]).map(([eco, name, moves, epd], id) => ({
  id,
  eco,
  name,
  moves: moves.split(' '),
  epd,
}));

const FAMILY_ES: Record<string, string> = {
  'Sicilian Defense': 'Defensa Siciliana',
  'Ruy Lopez': 'Apertura Española (Ruy López)',
  'French Defense': 'Defensa Francesa',
  "Queen's Gambit": 'Gambito de Dama',
  'Italian Game': 'Apertura Italiana',
  'English Opening': 'Apertura Inglesa',
  "King's Gambit": 'Gambito de Rey',
  "King's Indian Defense": 'Defensa India de Rey',
  'Caro-Kann Defense': 'Defensa Caro-Kann',
  'Nimzo-Indian Defense': 'Defensa Nimzoindia',
  "Queen's Pawn Game": 'Apertura de Peón de Dama',
  'Semi-Slav Defense': 'Defensa Semieslava',
  'Dutch Defense': 'Defensa Holandesa',
  'Benoni Defense': 'Defensa Benoni',
  'Grünfeld Defense': 'Defensa Grünfeld',
  "Queen's Indian Defense": 'Defensa India de Dama',
  'Alekhine Defense': 'Defensa Alekhine',
  'Indian Defense': 'Defensa India',
  'Scotch Game': 'Apertura Escocesa',
  'Slav Defense': 'Defensa Eslava',
  "Petrov's Defense": 'Defensa Petrov',
  'Four Knights Game': 'Apertura de los Cuatro Caballos',
  'Zukertort Opening': 'Apertura Zukertort',
  'Scandinavian Defense': 'Defensa Escandinava',
  'Philidor Defense': 'Defensa Philidor',
  'Réti Opening': 'Apertura Réti',
  'Nimzowitsch Defense': 'Defensa Nimzowitsch',
  "Bishop's Opening": 'Apertura de Alfil',
  'Vienna Game': 'Apertura Vienesa',
  'Modern Defense': 'Defensa Moderna',
  "King's Pawn Game": 'Apertura de Peón de Rey',
  'Van Geet Opening': 'Apertura Van Geet',
  'Pterodactyl Defense': 'Defensa Pterodáctilo',
  'Catalan Opening': 'Apertura Catalana',
  'Bird Opening': 'Apertura Bird',
  'Pirc Defense': 'Defensa Pirc',
  'Tarrasch Defense': 'Defensa Tarrasch',
  'Polish Opening': 'Apertura Polaca',
  'Neo-Grünfeld Defense': 'Defensa Neo-Grünfeld',
  'Blackmar-Diemer Gambit': 'Gambito Blackmar-Diemer',
  'Bogo-Indian Defense': 'Defensa Bogoindia',
  'Grob Opening': 'Apertura Grob',
  'Hungarian Opening': 'Apertura Húngara',
  "King's Indian Attack": 'Ataque Indio de Rey',
  'Nimzo-Larsen Attack': 'Ataque Nimzo-Larsen',
  'Center Game': 'Apertura del Centro',
  'Latvian Gambit': 'Gambito Letón',
  'Ponziani Opening': 'Apertura Ponziani',
  'Old Indian Defense': 'Defensa India Antigua',
  'Rat Defense': 'Defensa Rata',
  'Trompowsky Attack': 'Ataque Trompowsky',
  'Benko Gambit': 'Gambito Benko',
  'Englund Gambit': 'Gambito Englund',
  'Owen Defense': 'Defensa Owen',
  'Richter-Veresov Attack': 'Ataque Richter-Veresov',
  'English Defense': 'Defensa Inglesa',
  'Torre Attack': 'Ataque Torre',
  'Danish Gambit': 'Gambito Danés',
  'Three Knights Opening': 'Apertura de los Tres Caballos',
  'London System': 'Sistema Londres',
  'Colle System': 'Sistema Colle',
  'Elephant Gambit': 'Gambito Elefante',
  'Rapport-Jobava System': 'Sistema Rapport-Jobava',
  'Blumenfeld Countergambit': 'Contragambito Blumenfeld',
  'Hippopotamus Defense': 'Defensa Hipopótamo',
  'Kangaroo Defense': 'Defensa Canguro',
  'Lion Defense': 'Defensa León',
  'Borg Defense': 'Defensa Borg',
  'St. George Defense': 'Defensa San Jorge',
  'Polish Defense': 'Defensa Polaca',
  'Czech Defense': 'Defensa Checa',
  'Mexican Defense': 'Defensa Mexicana',
  'Portuguese Opening': 'Apertura Portuguesa',
  "King's Knight Opening": 'Apertura de Caballo de Rey',
  'Vienna Gambit, with Max Lange Defense': 'Gambito Vienés con Defensa Max Lange',
};

const LABEL_ES: Record<string, [masc: string, fem: string]> = {
  Accepted: ['Aceptado', 'Aceptada'],
  Declined: ['Rehusado', 'Rehusada'],
};

/** Accesos rápidos a las aperturas más jugadas: [familia, nombre corto]. */
export const POPULAR: [string, string][] = [
  ['Sicilian Defense', 'Siciliana'],
  ['Ruy Lopez', 'Española'],
  ['Italian Game', 'Italiana'],
  ['French Defense', 'Francesa'],
  ['Caro-Kann Defense', 'Caro-Kann'],
  ["Queen's Gambit", 'Gambito de Dama'],
  ['Slav Defense', 'Eslava'],
  ["King's Indian Defense", 'India de Rey'],
  ['Nimzo-Indian Defense', 'Nimzoindia'],
  ['English Opening', 'Inglesa'],
  ['London System', 'Londres'],
  ['Scandinavian Defense', 'Escandinava'],
];

const familyOf = (name: string) => {
  const i = name.indexOf(':');
  return i < 0 ? name : name.slice(0, i);
};
const FAMILIES = new Set(LINES.map((l) => familyOf(l.name)));

/** "King's Gambit Accepted: Bishop's Gambit" → ["King's Gambit", "Accepted", "Bishop's Gambit"] */
export function namePath(name: string): string[] {
  const fam = familyOf(name);
  const rest = fam === name ? [] : name.slice(fam.length + 1).split(',').map((s) => s.trim()).filter(Boolean);
  const suffix = fam.match(/^(.+) (Accepted|Declined)$/);
  if (suffix && FAMILIES.has(suffix[1])) return [suffix[1], suffix[2], ...rest];
  const comma = fam.indexOf(', ');
  if (comma > 0 && FAMILIES.has(fam.slice(0, comma))) {
    return [fam.slice(0, comma), ...fam.slice(comma + 2).split(', '), ...rest];
  }
  return [fam, ...rest];
}

function translatePath(path: string[]): string[] {
  const family = FAMILY_ES[path[0]] ?? path[0];
  const fem = /^(Apertura|Defensa)/.test(family) ? 1 : 0;
  return path.map((segment, depth) => (depth === 0 ? family : (LABEL_ES[segment]?.[fem] ?? segment)));
}

/** "Queen's Gambit Declined: Pillsbury Attack" → "Gambito de Dama Rehusado: Pillsbury Attack" */
export function displayName(name: string): string {
  const path = namePath(name);
  const labels = translatePath(path);
  if (labels.length > 1 && LABEL_ES[path[1]]) labels.splice(0, 2, `${labels[0]} ${labels[1]}`);
  return labels.length > 1 ? `${labels[0]}: ${labels.slice(1).join(', ')}` : labels[0];
}

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`´]/g, '');

// --- Construcción del árbol ---------------------------------------------------

type BuildNode = CatalogNode & { kids: Map<string, BuildNode>; ecos: Set<string> };

const roots = new Map<string, BuildNode>();
const byId = new Map<string, CatalogNode>();

for (const line of LINES) {
  const path = namePath(line.name);
  let level = roots;
  let parent: BuildNode | undefined;
  path.forEach((segment, depth) => {
    let node = level.get(segment);
    if (!node) {
      const id = path.slice(0, depth + 1).join(' › ');
      node = {
        id,
        path: path.slice(0, depth + 1),
        label: translatePath(path.slice(0, depth + 1))[depth],
        original: segment,
        depth,
        parent,
        children: [],
        own: [],
        lines: [],
        ecoFrom: line.eco,
        ecoTo: line.eco,
        search: '',
        kids: new Map(),
        ecos: new Set(),
      };
      level.set(segment, node);
      byId.set(id, node);
    }
    node.lines.push(line.id);
    if (line.eco < node.ecoFrom) node.ecoFrom = line.eco;
    if (line.eco > node.ecoTo) node.ecoTo = line.eco;
    if (depth === path.length - 1) {
      node.own.push(line.id);
      node.ecos.add(line.eco);
    }
    parent = node;
    level = node.kids;
  });
}

function finalize(map: Map<string, BuildNode>): CatalogNode[] {
  const list = [...map.values()].sort((a, b) => b.lines.length - a.lines.length || a.label.localeCompare(b.label));
  for (const n of list) {
    n.children = finalize(n.kids);
    const labels = translatePath(n.path);
    n.search = normalize([...n.path, ...labels, ...n.ecos].join(' '));
  }
  return list;
}

export const CATALOG: CatalogNode[] = finalize(roots);
export const ALL_NODES: CatalogNode[] = [...byId.values()];
export const nodeById = (id: string) => byId.get(id);

/** Nombre de la apertura correspondiente a una posición (detecta transposiciones). */
const byEpd = new Map<string, OpeningLine>();
for (const line of LINES) if (!byEpd.has(line.epd)) byEpd.set(line.epd, line);
export const lineAtEpd = (epd: string) => byEpd.get(epd);

export function searchCatalog(query: string, limit = 80): CatalogNode[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return ALL_NODES.filter((n) => terms.every((t) => n.search.includes(t)))
    .sort((a, b) => a.depth - b.depth || b.lines.length - a.lines.length)
    .slice(0, limit);
}

export const linesOf = (node: CatalogNode) => node.lines.map((i) => LINES[i]);

/** Jugadas que definen el nodo: su propia línea más corta o el prefijo común de sus líneas. */
export function previewMoves(node: CatalogNode): string[] {
  if (node.own.length) {
    return node.own.map((i) => LINES[i].moves).reduce((a, b) => (b.length < a.length ? b : a));
  }
  const lines = linesOf(node).map((l) => l.moves);
  const prefix: string[] = [];
  for (let i = 0; lines.every((m) => i < m.length && m[i] === lines[0][i]); i++) prefix.push(lines[0][i]);
  return prefix;
}

/** El bando que hace la última jugada que define la variante suele ser quien la elige. */
export const suggestedSide = (node: CatalogNode): Side => (previewMoves(node).length % 2 === 1 ? 'w' : 'b');

export const breadcrumb = (node: CatalogNode) => translatePath(node.path);
