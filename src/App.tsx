import { useEffect, useState, useSyncExternalStore } from 'react';
import { OpeningPicker } from './components/OpeningPicker';
import { SetupPanel, type Settings } from './components/SetupPanel';
import { TrainView } from './components/TrainView';
import { getEngine } from './lib/engine';
import { nodeById, suggestedSide, type CatalogNode } from './lib/openings';
import { usePersistentState } from './lib/storage';
import { Trainer } from './lib/trainer';

const DEFAULT_SETTINGS: Settings = { color: 'auto', level: 3, strict: true, learn: false };

export default function App() {
  const engine = getEngine();
  const [trainer] = useState(() => new Trainer(engine));
  const view = useSyncExternalStore(trainer.subscribe, trainer.getView);
  const [settings, setSettings] = usePersistentState<Settings>('aperturas.settings', DEFAULT_SETTINGS);
  const [last, setLast] = usePersistentState<{ nodeId: string | null }>('aperturas.last', {
    nodeId: 'Sicilian Defense',
  });
  const [screen, setScreen] = useState<'pick' | 'train'>('pick');
  const [engineState, setEngineState] = useState<'loading' | 'ready' | 'error'>('loading');
  const node = (last.nodeId && nodeById(last.nodeId)) || null;

  useEffect(() => {
    engine.ready.then(
      () => setEngineState('ready'),
      () => setEngineState('error'),
    );
  }, [engine]);

  // El botón «atrás» del móvil (o del navegador) vuelve al selector.
  useEffect(() => {
    const onPop = () => setScreen('pick');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const select = (n: CatalogNode) => {
    setLast({ nodeId: n.id });
    setSettings((s) => ({ ...s, color: 'auto' }));
  };

  const start = () => {
    if (!node) return;
    trainer.start({
      nodeId: node.id,
      color: settings.color === 'auto' ? suggestedSide(node) : settings.color,
      level: settings.level,
      strict: settings.strict,
      learn: settings.learn,
    });
    if (screen !== 'train') {
      history.pushState({ screen: 'train' }, '');
      setScreen('train');
    }
  };

  if (screen === 'train' && view.config) {
    const trainNode = nodeById(view.config.nodeId)!;
    return <TrainView trainer={trainer} view={view} node={trainNode} onBack={() => history.back()} />;
  }

  return (
    <main className="pick">
      <section className="pick-index">
        <header className="masthead">
          <h1>Aperturas</h1>
          <p className="engine">
            {engineState === 'ready'
              ? 'Stockfish 19, listo'
              : engineState === 'loading'
                ? 'Cargando Stockfish…'
                : 'Stockfish no se ha podido cargar'}
          </p>
        </header>
        <p className="intro">
          Elige una apertura, o una variante concreta, y el color con el que quieres practicarla. El rival sigue la
          teoría y en cada partida escoge una rama distinta; cuando se acaba el libro, sigues jugando contra Stockfish.
        </p>
        <OpeningPicker selectedId={node?.id ?? null} onSelect={select} />
      </section>
      <SetupPanel node={node} settings={settings} onChange={setSettings} onStart={start} engineState={engineState} />
    </main>
  );
}
