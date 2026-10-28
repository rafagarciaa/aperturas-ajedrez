// Persistencia local (ajustes y estadísticas). Si el almacenamiento no está
// disponible (modo privado, etc.) la app funciona igual sin recordar nada.
import { useEffect, useState } from 'react';

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin persistencia */
  }
}

export function usePersistentState<T extends object>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => loadJSON(key, initial));
  useEffect(() => saveJSON(key, value), [key, value]);
  return [value, setValue] as const;
}

export interface NodeStats {
  played: number; // partidas empezadas
  completed: number; // líneas de teoría terminadas
  clean: number; // terminadas sin errores ni pistas
}

const STATS_KEY = 'aperturas.stats';

export function getStats(id: string): NodeStats {
  const all = loadJSON<Record<string, NodeStats>>(STATS_KEY, {});
  return all[id] ?? { played: 0, completed: 0, clean: 0 };
}

export function bumpStats(id: string, delta: Partial<NodeStats>) {
  const all = loadJSON<Record<string, NodeStats>>(STATS_KEY, {});
  const s = all[id] ?? { played: 0, completed: 0, clean: 0 };
  for (const [k, v] of Object.entries(delta) as [keyof NodeStats, number][]) s[k] += v;
  all[id] = s;
  saveJSON(STATS_KEY, all);
}
