import { Suspense, lazy, useState } from 'react';
import type { GlobeFilter } from './Globe';
import { WorldPanel } from './WorldPanel';

// three.js is a large dependency — code-split so it only loads when the
// World tab is actually opened, same treatment EconomyChart/recharts gets.
const Globe = lazy(() => import('./Globe').then((m) => ({ default: m.Globe })));

const GLOBE_FILTERS: GlobeFilter[] = ['military', 'relations', 'trade', 'ideology'];
const GLOBE_FILTER_LABELS: Record<GlobeFilter, string> = {
  military: 'Military Strength',
  relations: 'Foreign Relations',
  trade: 'Economic Activity',
  ideology: 'Ideological Alignment',
};

export function WorldTab() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<GlobeFilter>('military');

  return (
    <div className="panel-columns">
      <section className="panel globe-panel">
        <div className="panel-header">
          <h2>Globe</h2>
          <span className="muted">Drag to orbit · scroll to zoom · click a marker to select</span>
        </div>
        <div className="billboard-tabs">
          {GLOBE_FILTERS.map((f) => (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
              {GLOBE_FILTER_LABELS[f]}
            </button>
          ))}
        </div>
        <Suspense fallback={<div className="globe-container" />}>
          <Globe selectedId={selectedId} onSelect={setSelectedId} filter={filter} />
        </Suspense>
      </section>
      <WorldPanel selectedId={selectedId} onSelect={setSelectedId} />
    </div>
  );
}
