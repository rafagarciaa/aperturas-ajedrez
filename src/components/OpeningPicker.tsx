import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { CATALOG, POPULAR, breadcrumb, nodeById, searchCatalog, type CatalogNode } from '../lib/openings';

interface Props {
  selectedId: string | null;
  onSelect: (node: CatalogNode) => void;
}

const eco = (n: CatalogNode) => (n.ecoFrom === n.ecoTo ? n.ecoFrom : `${n.ecoFrom}–${n.ecoTo}`);
const count = (n: CatalogNode) => (n.lines.length === 1 ? '1 línea' : `${n.lines.length} líneas`);

/** El catálogo como el índice de un libro de aperturas. */
export function OpeningPicker({ selectedId, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Abre la rama de la última apertura elegida.
    const open = new Set<string>();
    for (let n = selectedId ? nodeById(selectedId)?.parent : undefined; n; n = n.parent) open.add(n.id);
    return open;
  });
  const results = useMemo(() => searchCatalog(query), [query]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const entry = (node: CatalogNode, meta: ReactNode, crumb?: string) => (
    <button className="entry-main" onClick={() => onSelect(node)}>
      {crumb && <span className="entry-crumb">{crumb}</span>}
      <span className="entry-line">
        <span className="entry-name">{node.label}</span>
        <span className="leader" aria-hidden />
        <span className="entry-eco">{eco(node)}</span>
      </span>
      <span className="entry-meta">{meta}</span>
    </button>
  );

  const renderNode = (node: CatalogNode): ReactNode => {
    const open = expanded.has(node.id);
    const meta =
      node.depth === 0 && node.label !== node.original ? (
        <>
          <i>{node.original}</i> · {count(node)}
        </>
      ) : (
        count(node)
      );
    return (
      <li key={node.id} className={`depth-${Math.min(node.depth, 3)}`}>
        <div className={`entry${node.id === selectedId ? ' selected' : ''}`}>
          {node.children.length ? (
            <button
              className="toggle"
              onClick={() => toggle(node.id)}
              aria-label={open ? 'Plegar variantes' : 'Ver variantes'}
              aria-expanded={open}
            >
              {open ? '−' : '+'}
            </button>
          ) : (
            <span className="toggle" />
          )}
          {entry(node, meta)}
        </div>
        {open && node.children.length > 0 && <ul>{node.children.map(renderNode)}</ul>}
      </li>
    );
  };

  return (
    <div className="index">
      <div className="search">
        <input
          type="search"
          placeholder="Buscar: najdorf, francesa, B90…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar apertura"
        />
      </div>

      {!query && (
        <p className="popular">
          <span className="popular-label">Las más jugadas:</span>{' '}
          {POPULAR.map(([id, short], i) => (
            <Fragment key={id}>
              {i > 0 && ' · '}
              <button className={`link${id === selectedId ? ' current' : ''}`} onClick={() => onSelect(nodeById(id)!)}>
                {short}
              </button>
            </Fragment>
          ))}
        </p>
      )}

      {query ? (
        <ul className="toc results">
          {results.length === 0 && <li className="toc-empty">Nada con «{query}». Prueba con otro nombre o un código ECO.</li>}
          {results.map((node) => (
            <li key={node.id}>
              <div className={`entry${node.id === selectedId ? ' selected' : ''}`}>
                {entry(node, count(node), breadcrumb(node).slice(0, -1).join(' · '))}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="toc">{CATALOG.map(renderNode)}</ul>
      )}
    </div>
  );
}
