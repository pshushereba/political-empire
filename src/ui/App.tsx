import { useEffect, useRef } from 'react';
import { economy, ERAS, formatPopulation, governmentOf, score, turnDeadline } from '../game';
import { EffectChips, Logo, signed } from './components/common';
import { DistrictScreen } from './screens/DistrictScreen';
import { CouncilScreen } from './screens/CouncilScreen';
import { DiplomacyScreen } from './screens/DiplomacyScreen';
import { Founding } from './screens/Founding';
import { MapScreen } from './screens/MapScreen';
import { NationScreen } from './screens/NationScreen';
import { clockText, useGame, useNow, useRoute, useStore } from './store';

const NAV = [
  { path: '/', label: 'Map' },
  { path: '/district', label: 'District' },
  { path: '/nation', label: 'Nation' },
  { path: '/council', label: 'Council' },
  { path: '/diplomacy', label: 'Diplomacy' },
];

function Header({ route }: { route: string }) {
  const { state, me } = useGame();
  const n = state.nations[me];
  const today = n.seat!.dilemma;
  const offers = state.proposals.filter((p) => p.to === me).length;
  const ends = turnDeadline(state, me);
  const now = useNow(ends !== null);
  const eco = economy(state, n.id);
  const open = today && today.choice === null ? 1 : 0;
  const section = '/' + (route.split('/')[1] ?? '');
  return (
    <header className="header">
      <div className="row" style={{ gap: 10 }}><Logo /><span className="wordmark">POLITICAL EMPIRE</span></div>
      <nav className="nav" aria-label="Main">
        {NAV.map((item) => (
          <a key={item.path} href={`#${item.path}`} aria-current={section === item.path ? 'page' : undefined}>
            {item.label}
            {item.path === '/council' && open > 0 && <span className="badge" aria-label={`${open} open question`}>{open}</span>}
            {item.path === '/diplomacy' && offers > 0 && <span className="badge" aria-label={`${offers} proposals to answer`}>{offers}</span>}
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
        <span className="eyebrow">{state.humans.length > 1 ? `${n.short} · ` : ''}{governmentOf(n).name} · {ERAS[n.era].short}</span>
        <span className="display" style={{ fontSize: 15 }}>Turn {state.turn}{ends !== null && <span className={`mono ${ends - now < 30_000 ? 'neg' : 'amber'}`} role="timer" aria-label="Time left this turn"> · {clockText(ends - now)}</span>}</span>
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
  const { state, me, report, dismissReport, abandon, welcome, dismissWelcome, account, handoff, acceptHandoff } = useGame();
  const mine = state.nations[me];
  const shared = state.humans.length > 1;
  if (account.conflict) {
    const theirs = account.conflict.state;
    const cloudNation = theirs.nations[theirs.humans[0]];
    return (
      <Dialog title="Two nations, one account" eyebrow="Choose which game to continue" onClose={() => account.resolveConflict('cloud')} closeLabel={`Continue ${cloudNation.name} · turn ${theirs.turn} (saved online)`}>
        <p className="body-large">Your account already has a game saved online, and this browser has a different one. Only one can be kept.</p>
        <button type="button" className="btn block" onClick={() => account.resolveConflict('local')}>Keep {mine.name} · turn {state.turn} (this browser) and replace the online save</button>
      </Dialog>
    );
  }
  if (state.status !== 'playing') {
    const winner = state.winner ? state.nations[state.winner] : null;
    const title = shared ? (winner ? `${winner.name} wins` : 'The game is over') : state.winner === me ? 'Victory' : 'Your nation has fallen';
    return (
      <Dialog title={title} eyebrow={`Turn ${state.turn}`} onClose={abandon} closeLabel={shared ? 'Start a new game' : 'Found a new nation'}>
        <p className="body-large">{state.outcome}</p>
        {shared ? (
          <ol className="col gap-4">
            {[...state.humans].sort((x, y) => score(state, y) - score(state, x)).map((id) => (
              <li key={id} className="row spread"><span>{state.nations[id].name} <span className="muted">· {governmentOf(state.nations[id]).name}{state.nations[id].alive ? '' : ' · fallen'}</span></span><span className="mono">{score(state, id).toLocaleString()}</span></li>
            ))}
          </ol>
        ) : (
          <p className="muted">Final score {score(state, me).toLocaleString()} as a {governmentOf(mine).name.toLowerCase()}. It goes into the hall of nations. Could a different kind of state do better?</p>
        )}
      </Dialog>
    );
  }
  if (handoff) {
    const next = state.nations[handoff];
    const fallen = state.humans.filter((id) => !state.nations[id].alive).map((id) => state.nations[id].name);
    return (
      <Dialog title={`Pass the device to ${next.name}`} eyebrow={`Turn ${state.turn}`} onClose={acceptHandoff} closeLabel={`I am ${next.name}. Begin my turn`}>
        <p className="body-large">{mine.name} has ended its turn. No peeking: the next screen belongs to {next.name}.</p>
        {fallen.length > 0 && <p className="muted small">Out of the game: {fallen.join(', ')}.</p>}
      </Dialog>
    );
  }
  if (welcome) {
    return (
      <Dialog title={welcome.streak > 1 ? `Day ${welcome.streak} of your run` : 'Welcome back'} eyebrow="The nation kept going without you" onClose={dismissWelcome} closeLabel="Back to work">
        <p className="body-large">{welcome.streak > 1 ? 'You have returned on consecutive days, and the council has put a little aside for you.' : 'The council has put a little aside for your return.'}</p>
        <EffectChips effects={welcome.bonus} />
        <p className="small muted">Come back tomorrow and the bonus grows, up to day 5. Miss a day and the run starts again.</p>
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
        : section === 'district' ? <DistrictScreen at={arg} />
        : <MapScreen />}
      <Overlays />
    </div>
  );
}
