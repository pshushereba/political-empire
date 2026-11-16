import { useState } from 'react';
import { DILEMMA_BY_ID, FACTIONS, requirementMet, scaledEffects } from '../../game';
import { EffectChips } from '../components/common';
import { useGame } from '../store';

/** The daily question: one political decision per turn that shapes the nation. */
export function CouncilScreen() {
  const { state, dispatch } = useGame();
  const [picked, setPicked] = useState<number | null>(null);
  if (!state.dilemma) return null;
  const d = DILEMMA_BY_ID[state.dilemma.id];
  const decided = state.dilemma.choice;
  const player = state.nations[state.playerId];

  if (decided !== null) {
    const choice = d.choices[decided];
    const record = player.decisions[player.decisions.length - 1];
    return (
      <div className="page">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <div className="col gap-8">
            <span className="eyebrow amber">Decree issued · Turn {state.turn}</span>
            <h1 className="h-dilemma">{d.title}</h1>
          </div>
          <div className="outcome">
            <h2 className="h-panel">{choice.title}</h2>
            <p className="body-large">{choice.outcome}</p>
            <EffectChips effects={record?.dilemmaId === d.id ? record.effects : scaledEffects(state, choice.effects)} />
          </div>
          <p className="muted">The council meets again tomorrow. End the turn on the map to see the next question.</p>
          <div className="row">
            <a className="btn light" href="#/nation">See your nation change</a>
            <a className="btn" href="#/">Back to the map</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="wrap council">
        <div className="col gap-24">
          <div className="row gap-8">
            <span className="chip">{d.category}</span>
            <span className="chip" style={{ background: 'var(--surface-amber)', color: 'var(--accent)' }}>Today’s question · Turn {state.turn}</span>
          </div>
          <h1 className="h-dilemma">{d.title}</h1>
          <p className="body-large">{d.body}</p>
          <div className="col">
            {d.voices.map((v, i) => {
              const f = FACTIONS.find((x) => x.id === v.faction)!;
              return (
                <figure key={i} className="voice" style={{ margin: 0 }}>
                  <span className="avatar" style={{ borderColor: f.color }} aria-hidden="true" />
                  <div className="col gap-4">
                    <blockquote style={{ margin: 0 }}>“{v.quote}”</blockquote>
                    <figcaption className="small muted">{v.name}, {f.name} · approval {player.factions[v.faction]}</figcaption>
                  </div>
                </figure>
              );
            })}
          </div>
        </div>

        <form className="col gap-16" onSubmit={(e) => { e.preventDefault(); if (picked !== null) dispatch({ type: 'decide', choice: picked }); }}>
          <h2 className="h-section">How will you respond?</h2>
          <fieldset className="col" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="eyebrow" style={{ marginBottom: 8 }}>Choose one</legend>
            {d.choices.map((c, i) => {
              const locked = !!c.requires && !requirementMet(state, c.requires);
              return (
                <label key={i} className="choice">
                  <input type="radio" name="choice" checked={picked === i} disabled={locked} onChange={() => setPicked(i)} />
                  <span className="col gap-4">
                    <strong>{c.title}</strong>
                    <span className="small muted">{c.desc}</span>
                    {c.requires && <span className={`small ${locked ? 'neg' : 'pos'}`}>{locked ? 'Locked' : 'Unlocked'} · {c.requires.label}</span>}
                  </span>
                </label>
              );
            })}
          </fieldset>
          <div className="card col" aria-live="polite">
            <span className="eyebrow">Expected result</span>
            {picked === null ? <span className="muted small">Pick a response to see what it will change.</span> : <EffectChips effects={scaledEffects(state, d.choices[picked].effects)} />}
          </div>
          <button type="submit" className="btn primary block" disabled={picked === null}>Issue decree</button>
          <a className="btn block" href="#/">Decide later</a>
          <p className="small muted">The turn cannot end until the council has its answer.</p>
        </form>
      </div>
    </div>
  );
}
