import { useEffect, useRef } from 'react';
import { economy, ERAS, formatPopulation } from '../game';
import { Logo, signed } from './components/common';
import { CouncilScreen } from './screens/CouncilScreen';
import { DiplomacyScreen } from './screens/DiplomacyScreen';
import { Founding } from './screens/Founding';
import { MapScreen } from './screens/MapScreen';
import { NationScreen } from './screens/NationScreen';
import { useGame, useRoute, useStore } from './store';

const NAV = [
  { path: '/', label: 'Map' },
  { path: '/nation', label: 'Nation' },
  { path: '/council', label: 'Council' },
  { path: '/diplomacy', label: 'Diplomacy' },
];

function Header({ route }: { route: string }) {
  const { state } = useGame();
  const n = state.nations[state.playerId];
  const eco = economy(state, n.id);
  const open = state.dilemma && state.dilemma.choice === null ? 1 : 0;
  const section = '/' + (route.split('/')[1] ?? '');
  return (
    <header className="header">
      <div className="row" style={{ gap: 10 }}><Logo /><span className="wordmark">POLITICAL EMPIRE</span></div>
      <nav className="nav" aria-label="Main">
        {NAV.map((item) => (
          <a key={item.path} href={`#${item.path}`} aria-current={section === item.path ? 'page' : undefined}>
            {item.label}
            {item.path === '/council' && open > 0 && <span className="badge" aria-label={`${open} open question`}>{open}</span>}
          </a>
        ))}
      </nav>
      <div className="grow" />
      <dl className="resources">
        <div><dt className="eyebrow">Treasury</dt><dd>{Math.round(n.stats.treasury).toLocaleString()} <span className={eco.net >= 0 ? 'pos' : 'neg'}>{signed(eco.net)}</span></dd></div>
        <div><dt className="eyebrow">Supply</dt><dd className={eco.supply.net >= 0 ? '' : 'neg'}>{signed(eco.supply.net)}</dd></div>
        <div><dt className="eyebrow">Stability</dt><dd>{n.stats.stability}%</dd></div>
        <div><dt className="eyebrow">Influence</dt><dd>{n.stats.influence} <span className="pos">{signed(eco.influence)}</span></dd></div>
        <div><dt className="eyebrow">Population</dt><dd>{formatPopulation(n.stats.population)}</dd></div>
      </dl>
      <div className="era">
        <span className="eyebrow">{ERAS[n.era].short}</span>
        <span className="display" style={{ fontSize: 15 }}>Turn {state.turn}</span>
      </div>
    </header>
  );
}

function Dialog({ title, eyebrow, children, onClose, closeLabel }: { title: string; eyebrow: string; children: React.ReactNode; onClose: () => void; closeLabel: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="scrim" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="col gap-4"><span className="eyebrow amber">{eyebrow}</span><h2 className="h-panel">{title}</h2></div>
        {children}
        <button ref={ref} type="button" className="btn primary block" onClick={onClose}>{closeLabel}</button>
      </div>
    </div>
  );
}

function Overlays() {
  const { state, report, dismissReport, abandon } = useGame();
  if (state.status !== 'playing') {
    return (
      <Dialog title={state.status === 'won' ? 'Victory' : 'Your nation has fallen'} eyebrow={`Turn ${state.turn}`} onClose={abandon} closeLabel="Found a new nation">
        <p className="body-large">{state.outcome}</p>
      </Dialog>
    );
  }
  if (!report) return null;
  const important = report.entries.filter((e) => e.important);
  const rest = report.entries.filter((e) => !e.important);
  return (
    <Dialog title={`Turn ${report.turn} report`} eyebrow="While the council slept" onClose={dismissReport} closeLabel={`Begin turn ${state.turn}`}>
      {report.entries.length === 0 && <p className="muted">A quiet turn. Nothing to report.</p>}
      <ul className="log col gap-8">
        {important.map((e, i) => <li key={`i${i}`} className="important">{e.text}</li>)}
        {rest.map((e, i) => <li key={`r${i}`}>{e.text}</li>)}
      </ul>
      <p className="small muted">A new question is waiting for you at the Council.</p>
    </Dialog>
  );
}

export function App() {
  const { state } = useStore();
  const route = useRoute();
  if (!state) return <Founding />;
  const [, section, arg] = route.split('/');
  return (
    <div className="app">
      <Header route={route} />
      {section === 'nation' ? <NationScreen />
        : section === 'council' ? <CouncilScreen key={state.turn} />
        : section === 'diplomacy' ? <DiplomacyScreen nationId={arg} />
        : <MapScreen />}
      <Overlays />
    </div>
  );
}
