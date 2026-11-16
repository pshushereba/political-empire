import {
  AXES, BALANCE, coord, economy, ERAS, eraProgress, FACTIONS, formatPopulation, GOVERNMENTS, governmentOf, landCount, lean, modifiers, scaledEffects, unitCount,
  type AxisDef, type Nation,
} from '../../game';
import { EffectChips, Flag, signed } from '../components/common';
import { useGame } from '../store';

export function verdict(axis: AxisDef, value: number): string {
  const l = lean(value);
  const side = l >= 0 ? axis.high : axis.low;
  const m = Math.abs(l);
  if (m < 0.1) return 'Balanced';
  return `${m < 0.4 ? 'Leaning' : m < 0.75 ? 'Firmly' : 'Wholly'} ${side.toLowerCase()}`;
}

/** What the nation's current ideology is doing to the rules, in plain words. */
function doctrine(n: Nation): string[] {
  const m = modifiers(n);
  const pct = (x: number) => `${x > 0 ? '+' : '−'}${Math.abs(Math.round(x * 100))}%`;
  const out: string[] = [];
  if (m.commerceMult !== 1) out.push(`Business income ${pct(m.commerceMult - 1)}`);
  if (m.supplyMult !== 1) out.push(`Supply ${pct(m.supplyMult - 1)}`);
  if (m.upkeepMult !== 1) out.push(`Army upkeep ${pct(m.upkeepMult - 1)}`);
  if (m.recruitMult !== 1) out.push(`Recruitment cost ${pct(m.recruitMult - 1)}`);
  if (m.buildCostMult !== 1) out.push(`Building cost ${pct(m.buildCostMult - 1)}`);
  if (m.defenceMult !== 1) out.push(`Defence of your land ${pct(m.defenceMult - 1)}`);
  if (m.tradeMult !== 1) out.push(`Trade pact income ${pct(m.tradeMult - 1)}`);
  if (m.approval >= 0.5) out.push(`Approval +${Math.round(m.approval)}`);
  if (m.influence >= 0.5) out.push(`Influence +${Math.round(m.influence)} per turn`);
  if (m.stability >= 0.5) out.push(`Stability +${Math.round(m.stability)}`);
  if (m.incomeMult !== 1) out.push(`All income ${pct(m.incomeMult - 1)} (coast)`);
  if (m.supplyFlat) out.push(`Supply ${signed(m.supplyFlat)} (${n.startingLand === 'river' ? 'river valley' : 'highlands'})`);
  return out;
}

export function NationScreen() {
  const { state, abandon, dispatch, can } = useGame();
  const n = state.nations[state.playerId];
  const eco = economy(state, n.id);
  const land = landCount(state);
  const goal = Math.ceil(land * BALANCE.hegemonyShare);
  const progress = eraProgress(n, eco.hexes);
  const next = ERAS[n.era + 1];
  const effects = doctrine(n);
  const gov = governmentOf(n);

  return (
    <div className="page">
      <div className="wrap">
        <header className="row gap-24" style={{ alignItems: 'flex-start' }}>
          <Flag flag={n.flag} width={96} />
          <div className="col gap-4 grow">
            <h1 className="h-page">{n.name}</h1>
            <p className="muted">{gov.name} · “{n.motto}” · Founded turn {n.foundedTurn} · Capital at {coord(n.capital)}</p>
          </div>
        </header>

        <dl className="grid-4">
          <div className="card col gap-4"><dt className="eyebrow">Population</dt><dd className="mono" style={{ fontSize: 22 }}>{formatPopulation(n.stats.population)}</dd><dd className={`small ${eco.growthPct >= 0 ? 'pos' : 'neg'}`}>{signed(eco.growthPct)}% per turn</dd></div>
          <div className="card col gap-4"><dt className="eyebrow">Territory</dt><dd className="mono" style={{ fontSize: 22 }}>{eco.hexes} hexes</dd><dd className="small muted">{goal} of {land} wins by hegemony</dd></div>
          <div className="card col gap-4"><dt className="eyebrow">Stability</dt><dd className="mono" style={{ fontSize: 22 }}>{n.stats.stability}%</dd><dd className={`small ${eco.stabilityTarget >= n.stats.stability ? 'pos' : 'neg'}`}>Heading toward {eco.stabilityTarget}%</dd></div>
          <div className="card col gap-4"><dt className="eyebrow">Treasury</dt><dd className="mono" style={{ fontSize: 22 }}>{Math.round(n.stats.treasury).toLocaleString()}</dd><dd className={`small ${eco.net >= 0 ? 'pos' : 'neg'}`}>{signed(eco.net)} per turn</dd></div>
        </dl>

        <section className="col gap-16">
          <h2 className="h-section">Form of government</h2>
          <div className="grid-2" style={{ alignItems: 'start' }}>
            <div className="card col" style={{ borderColor: 'var(--accent)', background: 'var(--surface-amber)' }}>
              <span className="eyebrow amber">You are a</span>
              <strong className="h-panel">{gov.name}</strong>
              <p>{gov.blurb}</p>
              <ul className="col gap-4 small">{gov.notes.map((t) => <li key={t}>· {t}</li>)}</ul>
              <p className="small muted">Your answers to the daily question decide this. A change of government costs {BALANCE.upheaval} stability and swaps your powers.</p>
            </div>
            <div className="col">
              <h3 className="eyebrow">Powers of the state</h3>
              {gov.powers.map((p) => {
                const ok = can({ type: 'power', power: p.id });
                const cost = [p.cost?.treasury && `${p.cost.treasury} treasury`, p.cost?.influence && `${p.cost.influence} influence`].filter(Boolean).join(', ');
                return (
                  <div key={p.id} className="card col gap-8">
                    <div className="row spread"><strong>{p.name}</strong><span className="chip">{cost || 'Free'} · every {p.cooldown} turns</span></div>
                    <span className="small muted">{p.desc}</span>
                    <EffectChips effects={scaledEffects(state, p.effects)} />
                    <button type="button" className="btn small" disabled={!ok.ok} onClick={() => dispatch({ type: 'power', power: p.id })}>{ok.ok ? p.name : ok.reason}</button>
                  </div>
                );
              })}
            </div>
          </div>
          <details className="card">
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Other forms of government, and how to reach them</summary>
            <ul className="grid-3" style={{ marginTop: 16 }}>
              {GOVERNMENTS.filter((g) => g.id !== gov.id).map((g) => (
                <li key={g.id} className="col gap-4">
                  <strong>{g.name}</strong>
                  <span className="small amber">{g.path}</span>
                  <span className="small muted">{g.blurb}</span>
                  <span className="small">Powers: {g.powers.map((p) => p.name).join(' · ')}</span>
                </li>
              ))}
            </ul>
          </details>
        </section>

        <section className="col gap-16">
          <h2 className="h-section">The books</h2>
          <div className="grid-3">
            <div className="card">
              <h3 className="eyebrow" style={{ marginBottom: 8 }}>Income per turn</h3>
              <table className="ledger"><tbody>
                <tr><td>Capital administration</td><td>{eco.income.base}</td></tr>
                <tr><td>Land ({eco.hexes} hexes)</td><td>{eco.income.land}</td></tr>
                <tr><td>Taxes on the population</td><td>{eco.income.population}</td></tr>
                <tr><td>Businesses and tariffs</td><td>{eco.income.businesses}</td></tr>
                <tr><td>Trade pacts</td><td>{eco.income.trade}</td></tr>
                <tr><td>Stability and merchants</td><td>×{eco.income.multiplier.toFixed(2)}</td></tr>
                <tr><td>Army upkeep ({eco.units} units)</td><td>−{eco.upkeep}</td></tr>
                <tr className="total"><td>Net</td><td className={eco.net >= 0 ? 'pos' : 'neg'}>{signed(eco.net)}</td></tr>
              </tbody></table>
            </div>
            <div className="card">
              <h3 className="eyebrow" style={{ marginBottom: 8 }}>Supply</h3>
              <table className="ledger"><tbody>
                <tr><td>Produced by land and works</td><td>{eco.supply.produced}</td></tr>
                <tr><td>Used by people and troops</td><td>−{eco.supply.used}</td></tr>
                <tr className="total"><td>Surplus</td><td className={eco.supply.net >= 0 ? 'pos' : 'neg'}>{signed(eco.supply.net)}</td></tr>
              </tbody></table>
              <p className="small muted" style={{ marginTop: 8 }}>A surplus grows the population. A shortage shrinks it and drags stability down.</p>
            </div>
            <div className="card">
              <h3 className="eyebrow" style={{ marginBottom: 8 }}>State of the nation</h3>
              <table className="ledger"><tbody>
                <tr><td>Approval from services and doctrine</td><td>{signed(eco.approval)}</td></tr>
                <tr><td>Influence per turn</td><td>{signed(eco.influence)}</td></tr>
                <tr><td>Fortifications</td><td>{eco.security}</td></tr>
                <tr><td>Units under arms</td><td>{unitCount(state, n.id)}</td></tr>
                <tr className="total"><td>Wars</td><td className={eco.wars ? 'neg' : ''}>{eco.wars}</td></tr>
              </tbody></table>
              {n.stats.stability < gov.unrestBelow && <p className="small neg" style={{ marginTop: 8 }}>Unrest: below {gov.unrestBelow}% stability, border hexes may break away.</p>}
            </div>
          </div>
        </section>

        <section className="col gap-16">
          <h2 className="h-section">Growth of the nation</h2>
          <ol className="grid-4">
            {ERAS.map((e, i) => {
              const current = i === n.era;
              const locked = i > n.era;
              return (
                <li key={e.name} className="card col gap-8" aria-current={current ? 'step' : undefined}
                  style={{ borderColor: current ? 'var(--accent)' : undefined, background: current ? 'var(--surface-amber)' : undefined, borderStyle: locked ? 'dashed' : 'solid' }}>
                  <span className={`eyebrow ${current ? 'amber' : ''}`}>{current ? 'Current era' : locked ? 'Locked' : 'Reached'}</span>
                  <strong className="display">{e.name}</strong>
                  <span className="small muted">{e.note}</span>
                  {locked && <span className="small">Needs {e.hexes} hexes and {formatPopulation(e.population)} people</span>}
                  {current && next && (
                    <>
                      <div className="bar" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to the next era"><span style={{ width: `${progress * 100}%` }} /></div>
                      <span className="small muted">{Math.round(progress * 100)}% toward the next era</span>
                    </>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <div className="grid-2" style={{ gap: 32, alignItems: 'start' }}>
          <section className="col gap-16">
            <h2 className="h-section">Character of the state</h2>
            <p className="small muted">Shaped by your answers to the daily question. The hollow ring marks where you stood at the founding.</p>
            {AXES.map((a) => (
              <div key={a.id} className="card col gap-4">
                <div className="row spread small"><span>{a.low}</span><strong>{verdict(a, n.axes[a.id])}</strong><span>{a.high}</span></div>
                <div className="axis" role="img" aria-label={`${a.low} to ${a.high}: now ${n.axes[a.id]} of 100, at founding ${n.axesAtFounding[a.id]}`}>
                  <span className="mid" />
                  <span className="dot ghost" style={{ left: `${n.axesAtFounding[a.id]}%` }} />
                  <span className="dot" style={{ left: `${n.axes[a.id]}%` }} />
                </div>
                <span className="small muted">{lean(n.axes[a.id]) >= 0 ? a.highEffect : a.lowEffect}</span>
              </div>
            ))}
            <div className="card col gap-8">
              <span className="eyebrow">Your doctrine in effect</span>
              {effects.length ? <div className="row wrap-row gap-8">{effects.map((e) => <span key={e} className="chip">{e}</span>)}</div> : <span className="small muted">A centrist state: no bonuses, no penalties.</span>}
            </div>
          </section>

          <div className="col gap-24">
            <section className="col gap-16">
              <h2 className="h-section">Factions</h2>
              {FACTIONS.map((f) => (
                <div key={f.id} className="col gap-4">
                  <div className="row spread small"><span>{f.name} <span className="muted">· affects {f.effect}</span></span><span className="mono">{n.factions[f.id]}</span></div>
                  <div className="bar" role="progressbar" aria-valuenow={n.factions[f.id]} aria-valuemin={0} aria-valuemax={100} aria-label={`${f.name} approval`}><span style={{ width: `${n.factions[f.id]}%`, background: f.color }} /></div>
                </div>
              ))}
            </section>
            <section className="col gap-16">
              <h2 className="h-section">Decisions on record</h2>
              {n.decisions.length === 0 && <p className="muted small">No decrees yet. The council is waiting.</p>}
              <ol className="col">
                {n.decisions.slice(-6).reverse().map((d, i) => (
                  <li key={i} className="card col gap-8">
                    <span className="eyebrow">Turn {d.turn} · {d.title}</span>
                    <strong>{d.choice}</strong>
                    <EffectChips effects={d.effects} />
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>

        <section className="row spread card">
          <span className="small muted">The game saves in this browser after every action.</span>
          <button type="button" className="btn small danger" onClick={() => { if (window.confirm('Abandon this nation and found a new one? This cannot be undone.')) abandon(); }}>Abandon and start a new game</button>
        </section>
      </div>
    </div>
  );
}
