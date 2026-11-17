import {
  AXES, baseline, DIPLOMACY_ACTS, economy, envoyIsIn, formatPopulation, militaryStrength, relation, stance, unitCount,
  PROPOSAL_WORDS, wouldAcceptPeace, type GameState, type NationId,
} from '../../game';
import { Flag } from '../components/common';
import { go, useGame } from '../store';

function reasoning(state: GameState, me: NationId, them: NationId): string {
  const rel = relation(state, me, them);
  const n = state.nations[them];
  if (rel.war) return `You have been at war since turn ${rel.warSince}. ${n.seat ? `${n.short} is run by another player: peace is theirs to accept or refuse.` : wouldAcceptPeace(state, me, them) ? `${n.short} is ready to talk.` : `${n.short} believes it can still win.`}`;
  if (n.seat) return `${n.name} is run by another player. Pacts need their agreement, and nothing but their own judgement stops them attacking you.`;
  const target = baseline(state, me, them);
  const trend = target > rel.value ? 'warming' : target < rel.value ? 'cooling' : 'steady';
  const pacts = [rel.tradePact && 'a trade pact', rel.embassy.includes(me) && 'your embassy', rel.napUntil >= state.turn && `a non-aggression pact until turn ${rel.napUntil}`].filter(Boolean);
  return `Relations are ${trend}, drifting toward ${target}. Nations that think alike get along; shared borders without a pact cause friction.${pacts.length ? ` In force: ${pacts.join(', ')}.` : ''}`;
}

export function DiplomacyScreen({ nationId }: { nationId?: string }) {
  const { state, me, dispatch, can } = useGame();
  const player = state.nations[me];
  const envoy = player.seat!.envoy;
  const inbox = state.proposals.filter((p) => p.to === me);
  const rivals = state.order.filter((id) => id !== player.id);
  const id = nationId && state.nations[nationId] && nationId !== player.id ? nationId : rivals.find((r) => state.nations[r].alive) ?? rivals[0];
  const n = state.nations[id];
  const rel = relation(state, player.id, id);
  const here = envoyIsIn(state, me, id);
  const embassy = rel.embassy.includes(me);
  const eco = economy(state, id);
  const pct = (rel.value + 100) / 2;

  return (
    <div className="page">
      <div className="wrap">
        <div className="tabs" role="group" aria-label="Nation" style={{ alignSelf: 'flex-start', flexWrap: 'wrap', maxWidth: '100%' }}>
          {rivals.map((r) => (
            <button key={r} type="button" aria-pressed={r === id} onClick={() => go(`/diplomacy/${r}`)} style={{ flex: '0 0 auto', padding: '0 14px' }}>
              {state.nations[r].short}{state.nations[r].seat ? ' (player)' : ''}{state.nations[r].alive ? ` · ${stance(relation(state, player.id, r))}` : ' · Fallen'}
            </button>
          ))}
        </div>

        {inbox.length > 0 && (
          <section className="col" aria-label="Proposals awaiting your answer">
            <h2 className="h-section">Awaiting your answer</h2>
            {inbox.map((p) => {
              const yes = can({ type: 'respond', proposal: p.id, accept: true });
              return (
                <div key={p.id} className="card row spread" style={{ borderColor: 'var(--accent)', background: 'var(--surface-amber)' }}>
                  <span><strong>{state.nations[p.from].name}</strong> proposes {PROPOSAL_WORDS[p.act]}. <span className="muted small">Offered on turn {p.turn}; lapses if left unanswered.</span></span>
                  <span className="row gap-8">
                    <button type="button" className="btn small light" disabled={!yes.ok} onClick={() => dispatch({ type: 'respond', proposal: p.id, accept: true })}>{yes.ok ? 'Accept' : yes.reason}</button>
                    <button type="button" className="btn small" onClick={() => dispatch({ type: 'respond', proposal: p.id, accept: false })}>Decline</button>
                  </span>
                </div>
              );
            })}
          </section>
        )}

        <header className="card row gap-24" style={{ borderColor: n.color, background: `color-mix(in srgb, ${n.color} 10%, var(--surface-panel))`, padding: 24 }}>
          <Flag flag={n.flag} width={96} />
          <div className="col gap-4 grow">
            <span className="eyebrow">
              {!n.alive ? 'This nation has fallen' : here ? 'Your envoy is visiting' : envoy.dest ? `Your envoy is travelling · arrives turn ${envoy.arrivesTurn}` : 'Your envoy is elsewhere'}
            </span>
            <h1 className="h-page">{n.name}</h1>
            <p className="muted">“{n.motto}” · {n.description}</p>
          </div>
          <a className="btn" href="#/">Back to map</a>
        </header>

        {n.alive && (
          <div className="grid-2" style={{ gap: 32, alignItems: 'start' }}>
            <div className="col gap-24">
              <section className="col gap-16">
                <h2 className="h-section">Relations</h2>
                <div className="card col">
                  <div className="row spread"><strong className={rel.war ? 'neg' : ''} style={{ fontSize: 18 }}>{stance(rel)}</strong><span className="mono">{rel.value > 0 ? '+' : ''}{rel.value}</span></div>
                  <div className="axis" role="img" aria-label={`Relations ${rel.value} on a scale from −100 to +100`}>
                    <span className="mid" />
                    <span style={{ position: 'absolute', top: 0, height: 8, borderRadius: 4, background: rel.value >= 0 ? 'var(--positive)' : 'var(--negative)', left: `${Math.min(50, pct)}%`, width: `${Math.abs(pct - 50)}%` }} />
                  </div>
                  <div className="row spread small muted"><span>Hostile</span><span>Wary</span><span>Cordial</span><span>Allied</span></div>
                  <p className="small">{reasoning(state, me, id)}</p>
                </div>
              </section>

              <section className="col gap-16">
                <h2 className="h-section">How you compare</h2>
                {AXES.map((a) => (
                  <div key={a.id} className="col gap-4">
                    <div className="row spread small muted"><span>{a.low}</span><span>{a.high}</span></div>
                    <div className="axis" role="img" aria-label={`${a.low} to ${a.high}: you ${player.axes[a.id]}, ${n.short} ${n.axes[a.id]}`}>
                      <span className="mid" />
                      <span className="dot them" style={{ left: `${n.axes[a.id]}%`, background: n.color }} />
                      <span className="dot" style={{ left: `${player.axes[a.id]}%` }} />
                    </div>
                  </div>
                ))}
                <div className="row small muted gap-16">
                  <span className="row gap-8"><span className="swatch" style={{ background: 'var(--accent)', borderRadius: '50%' }} />You</span>
                  <span className="row gap-8"><span className="swatch" style={{ background: n.color }} />{n.short}</span>
                </div>
              </section>

              <section className="col gap-16">
                <h2 className="h-section">What your envoy learned</h2>
                <dl className="grid-2">
                  <div className="tile"><dt className="eyebrow">Population</dt><dd>{formatPopulation(n.stats.population)}</dd></div>
                  <div className="tile"><dt className="eyebrow">Territory</dt><dd>{eco.hexes} hexes</dd></div>
                  <div className="tile"><dt className="eyebrow">Treasury</dt><dd>{embassy ? `${Math.round(n.stats.treasury).toLocaleString()} (${eco.net >= 0 ? '+' : '−'}${Math.abs(eco.net)}/turn)` : 'Locked · open an embassy'}</dd></div>
                  <div className="tile"><dt className="eyebrow">Army</dt><dd>{embassy ? `${unitCount(state, id)} units · strength ${militaryStrength(state, id)}` : 'Locked · open an embassy'}</dd></div>
                </dl>
                <p className="small muted">Your own army’s strength is {militaryStrength(state, player.id)}. A rival that feels much stronger than a neighbour it dislikes will attack.</p>
              </section>
            </div>

            <section className="col gap-16">
              <h2 className="h-section">Diplomatic actions</h2>
              <p className="small muted">Envoy actions need your envoy inside their borders, one per turn. War and peace can be declared from anywhere.</p>
              <ul className="col">
                {DIPLOMACY_ACTS.map((a) => {
                  const ok = can({ type: 'diplomacy', nation: id, act: a.id });
                  if (a.id === 'peace' && !rel.war) return null;
                  if (a.id === 'war' && rel.war) return null;
                  const danger = a.id === 'war' || a.id === 'denounce';
                  return (
                    <li key={a.id} className="card col gap-8">
                      <div className="row spread"><strong>{a.name}</strong><span className="chip">{a.cost}</span></div>
                      <span className="small muted">{a.desc} {a.effect}.</span>
                      <button type="button" className={`btn small ${danger ? 'danger' : ''}`} disabled={!ok.ok}
                        onClick={() => { if (a.id !== 'war' || window.confirm(`Declare war on ${n.name}?`)) dispatch({ type: 'diplomacy', nation: id, act: a.id }); }}>
                        {ok.ok ? a.name : ok.reason}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
