import { useState } from 'react';
import { AXES, DEFAULT_FOUNDING, FLAG_PAIRS, FOUNDING_QUESTIONS, FOUNDING_VALUES, GOVERNMENT_BY_ID, GOVERNMENTS, governmentFor, STARTING_LANDS, type FoundingChoices } from '../../game';
import { useEffect } from 'react';
import { backendConfigured } from '../../backend/client';
import { fetchRanking, type RankedScore } from '../../backend/cloud';
import { AccountPanel } from '../components/Account';
import { loadLegacy } from '../legacy';
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
  /** How many people are playing on this device, and the nations already founded. */
  const [count, setCount] = useState(1);
  const [done, setDone] = useState<FoundingChoices[]>([]);
  const seatNo = done.length + 1;
  const last = seatNo >= count;
  const submit = () => {
    if (last) { newGame([...done, c]); go('/'); return; }
    setDone([...done, c]);
    const pair = FLAG_PAIRS[seatNo % FLAG_PAIRS.length];
    setC({ ...DEFAULT_FOUNDING, flag: { pattern: 'tricolour', a: pair.a, b: pair.b } });
    window.scrollTo(0, 0);
  };
  const land = STARTING_LANDS.find((l) => l.id === c.startingLand)!;
  const gov = GOVERNMENT_BY_ID[governmentFor({
    liberty: FOUNDING_VALUES[c.answers.liberty], market: FOUNDING_VALUES[c.answers.market],
    reform: FOUNDING_VALUES[c.answers.reform], openness: FOUNDING_VALUES[c.answers.openness],
  })];
  const [hall] = useState(loadLegacy);
  const [world, setWorld] = useState<RankedScore[]>([]);
  useEffect(() => { if (backendConfigured) fetchRanking(5).then(setWorld, () => undefined); }, []);
  const wonAs = new Set(hall.filter((r) => r.outcome === 'won').map((r) => r.government));

  return (
    <form className="founding" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <div className="left">
        <div className="row"><Logo /><span className="wordmark">POLITICAL EMPIRE</span></div>
        <div className="col gap-8">
          <h1 className="h-page">{count > 1 ? `Player ${seatNo} of ${count}: found your nation` : 'Found a nation'}</h1>
          <p className="body-large">Four questions set where your nation starts. A new question every turn decides where it ends up, and three rivals share the map.</p>
        </div>

        {done.length === 0 && (
          <div className="col gap-8" role="group" aria-label="How will you play?">
            <h2 className="h-section">How will you play?</h2>
            <div className="toggle-group">
              <button type="button" className="toggle" aria-pressed={count === 1} onClick={() => setCount(1)}>
                <strong>Alone</strong><span className="small muted">Build your nation and take on three computer-run rivals.</span>
              </button>
              <button type="button" className="toggle" aria-pressed={count > 1} onClick={() => setCount(Math.max(2, count))}>
                <strong>Pass and play</strong><span className="small muted">Two to four people share this device. The computer runs the rest.</span>
              </button>
              <button type="button" className="toggle" disabled style={{ opacity: 0.6 }}>
                <strong>Online</strong><span className="small muted">Against other players, each on their own device. Not open yet.</span>
              </button>
            </div>
            {count > 1 && (
              <div className="row gap-8" role="group" aria-label="Number of players">
                <span className="small muted">Players</span>
                {[2, 3, 4].map((n) => <button key={n} type="button" className="btn small" aria-pressed={count === n} style={count === n ? { borderColor: 'var(--accent)', background: 'var(--surface-amber)' } : undefined} onClick={() => setCount(n)}>{n}</button>)}
              </div>
            )}
          </div>
        )}
        {done.length > 0 && <p className="small muted">Already founded: {done.map((d, i) => d.name.trim() || `Player ${i + 1}`).join(', ')}.</p>}

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
        <div className="card col gap-4" aria-live="polite" style={{ background: 'var(--surface-amber)', borderColor: 'var(--accent)' }}>
          <span className="eyebrow amber">You will begin as a</span>
          <strong className="display" style={{ fontSize: 18 }}>{gov.name}</strong>
          <span className="small">{gov.blurb}</span>
          <span className="small muted">Powers: {gov.powers.map((p) => p.name).join(' · ')}</span>
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
        {hall.length > 0 && (
          <section className="col gap-8" aria-label="Hall of nations">
            <span className="eyebrow">Hall of nations · best {Math.max(...hall.map((r) => r.score)).toLocaleString()}</span>
            <ol className="col gap-4 small">
              {hall.slice(0, 4).map((r, i) => (
                <li key={i} className="row spread"><span>{r.name} <span className="muted">· {GOVERNMENT_BY_ID[r.government].name} · {r.outcome} on turn {r.turns}</span></span><span className="mono">{r.score.toLocaleString()}</span></li>
              ))}
            </ol>
            <span className="small muted">Won as {wonAs.size} of {GOVERNMENTS.length} forms of government{wonAs.size < GOVERNMENTS.length ? `. Not yet: ${GOVERNMENTS.filter((g) => !wonAs.has(g.id)).map((g) => g.name).join(', ')}.` : '.'}</span>
          </section>
        )}
        {world.length > 0 && (
          <section className="col gap-8" aria-label="World ranking">
            <span className="eyebrow">World ranking</span>
            <ol className="col gap-4 small">
              {world.map((r, i) => (
                <li key={i} className="row spread"><span>{i + 1}. {r.nation} <span className="muted">· {GOVERNMENT_BY_ID[r.government]?.name ?? r.government}</span></span><span className="mono">{r.score.toLocaleString()}</span></li>
              ))}
            </ol>
          </section>
        )}
        <AccountPanel />
        <div style={{ flex: 1 }} />
        <button type="submit" className="btn primary block">{last ? 'Found the nation' : `Next: player ${seatNo + 1}`}</button>
      </aside>
    </form>
  );
}
