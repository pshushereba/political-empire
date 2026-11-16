import { useState } from 'react';
import { AXES, DEFAULT_FOUNDING, FLAG_PAIRS, FOUNDING_QUESTIONS, FOUNDING_VALUES, STARTING_LANDS, type FoundingChoices } from '../../game';
import { Flag, Logo } from '../components/common';
import { go, useStore } from '../store';

const PATTERNS = [
  { id: 'tricolour' as const, name: 'Tricolour' },
  { id: 'bands' as const, name: 'Bands' },
  { id: 'canton' as const, name: 'Canton' },
];

export function Founding() {
  const { newGame } = useStore();
  const [c, setC] = useState<FoundingChoices>(DEFAULT_FOUNDING);
  const land = STARTING_LANDS.find((l) => l.id === c.startingLand)!;

  return (
    <form className="founding" onSubmit={(e) => { e.preventDefault(); newGame(c); go('/'); }}>
      <div className="left">
        <div className="row"><Logo /><span className="wordmark">POLITICAL EMPIRE</span></div>
        <div className="col gap-8">
          <h1 className="h-page">Found a nation</h1>
          <p className="body-large">Four questions set where your nation starts. A new question every turn decides where it ends up, and three rivals share the map.</p>
        </div>

        <div className="grid-2">
          <label className="field"><span className="eyebrow">Name of the nation</span>
            <input value={c.name} maxLength={32} placeholder="Republic of Veyra" onChange={(e) => setC({ ...c, name: e.target.value })} />
          </label>
          <label className="field"><span className="eyebrow">Motto</span>
            <input value={c.motto} maxLength={48} placeholder="By our own hands" onChange={(e) => setC({ ...c, motto: e.target.value })} />
          </label>
        </div>

        {FOUNDING_QUESTIONS.map((q) => (
          <div key={q.axis} className="col gap-8" role="group" aria-label={q.question}>
            <h2 className="h-section">{q.question}</h2>
            <div className="toggle-group">
              {q.options.map((o, i) => (
                <button key={o} type="button" className="toggle" aria-pressed={c.answers[q.axis] === i} onClick={() => setC({ ...c, answers: { ...c.answers, [q.axis]: i } })}>{o}</button>
              ))}
            </div>
            <p className="small muted" aria-live="polite">
              {c.answers[q.axis] === 1 ? 'A middle road: no bonus and no penalty.' : (() => { const ax = AXES.find((x) => x.id === q.axis)!; return c.answers[q.axis] === 0 ? `${ax.low}: ${ax.lowEffect.toLowerCase()}.` : `${ax.high}: ${ax.highEffect.toLowerCase()}.`; })()}
            </p>
          </div>
        ))}

        <div className="col gap-8" role="group" aria-label="Starting land">
          <h2 className="h-section">Starting land</h2>
          <div className="toggle-group">
            {STARTING_LANDS.map((l) => (
              <button key={l.id} type="button" className="toggle" aria-pressed={c.startingLand === l.id} onClick={() => setC({ ...c, startingLand: l.id })}>
                <strong>{l.name}</strong><span className="small muted">{l.tradeoff}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <aside className="right" aria-label="Preview">
        <span className="eyebrow">Your nation</span>
        <Flag flag={c.flag} width={180} />
        <div className="col gap-8" role="group" aria-label="Flag pattern">
          <div className="toggle-group">
            {PATTERNS.map((p) => (
              <button key={p.id} type="button" className="toggle" aria-pressed={c.flag.pattern === p.id} onClick={() => setC({ ...c, flag: { ...c.flag, pattern: p.id } })}>{p.name}</button>
            ))}
          </div>
          <div className="row gap-8" role="group" aria-label="Flag colours">
            {FLAG_PAIRS.map((p) => (
              <button key={p.name} type="button" className="toggle" style={{ flexDirection: 'row', gap: 0, padding: 6, minHeight: 44, width: 64 }} aria-label={p.name} aria-pressed={c.flag.a === p.a}
                onClick={() => setC({ ...c, flag: { ...c.flag, a: p.a, b: p.b } })}>
                <span style={{ flex: 1, height: 28, background: p.a, borderRadius: '4px 0 0 4px' }} /><span style={{ flex: 1, height: 28, background: p.b, borderRadius: '0 4px 4px 0', border: '1px solid var(--line-strong)' }} />
              </button>
            ))}
          </div>
        </div>
        <div className="col gap-4">
          <h2 className="h-panel">{c.name.trim() || '[NATION NAME]'}</h2>
          <p className="muted">“{c.motto.trim() || 'By our own hands'}” · {land.name}</p>
        </div>
        <div className="col gap-8">
          {AXES.map((a) => (
            <div key={a.id}>
              <div className="row spread small muted"><span>{a.low}</span><span>{a.high}</span></div>
              <div className="axis" role="img" aria-label={`${a.low} to ${a.high}: ${FOUNDING_VALUES[c.answers[a.id]]} of 100`}>
                <span className="mid" /><span className="dot" style={{ left: `${FOUNDING_VALUES[c.answers[a.id]]}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button type="submit" className="btn primary block">Found the nation</button>
      </aside>
    </form>
  );
}
