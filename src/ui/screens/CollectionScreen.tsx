import { useState } from 'react';
import { FLAG_COLOURS, FLAG_EMBLEMS, FLAG_PATTERNS } from '../../art/flags';
import { COSMETICS, ownsFlag, PRODUCTS } from '../../commerce/catalog';
import { Flag } from '../components/common';
import { colourIdOf, FlagEditor } from '../components/FlagEditor';
import { useGame } from '../store';

/** How your nation looks, and the packs that add more ways to dress it. Nothing here affects play. */
export function CollectionScreen() {
  const { state, me, dispatch, owned } = useGame();
  const n = state.nations[me];
  const [draft, setDraft] = useState(n.flag);
  const changed = JSON.stringify(draft) !== JSON.stringify(n.flag);
  const allowed = ownsFlag(owned, draft, colourIdOf(draft));

  return (
    <div className="page">
      <div className="wrap">
        <header className="col gap-4">
          <h1 className="h-page">Collection</h1>
          <p className="muted">How {n.name} looks to you and to every other player. Nothing here changes what a nation can do: every advantage in the game is earned in it.</p>
        </header>

        <section className="grid-2" style={{ gap: 32, alignItems: 'start' }}>
          <div className="col gap-16">
            <h2 className="h-section">Your flag</h2>
            <div className="row gap-24">
              <Flag flag={draft} width={210} />
              <div className="col gap-8">
                <button type="button" className="btn light" disabled={!changed || !allowed} onClick={() => dispatch({ type: 'setFlag', flag: draft })}>{changed ? 'Raise this flag' : 'This is your flag'}</button>
                {changed && <button type="button" className="btn small" onClick={() => setDraft(n.flag)}>Undo changes</button>}
              </div>
            </div>
            <FlagEditor flag={draft} owned={owned} onChange={setDraft} />
          </div>

          <div className="col gap-16">
            <h2 className="h-section">Packs</h2>
            {PRODUCTS.map((p) => {
              const mine = owned.includes(p.id) || (p.kind === 'pack' && owned.includes('membership'));
              const items = COSMETICS.filter((c) => c.pack === p.id);
              return (
                <article key={p.id} className="card col" style={mine ? { borderColor: 'var(--accent)' } : undefined}>
                  <div className="row spread"><strong style={{ fontSize: 17 }}>{p.name}</strong><span className={`chip ${mine ? 'pos' : ''}`}>{mine ? 'Owned' : p.onSale ? 'Available' : 'Not on sale yet'}</span></div>
                  <p className="small muted">{p.blurb}</p>
                  {items.length > 0 && (
                    <div className="row wrap-row gap-8" aria-label={`In the ${p.name}`}>
                      {items.map((c) => (
                        c.kind === 'pattern' ? <span key={c.id} title={FLAG_PATTERNS[c.id].name}><Flag flag={{ pattern: c.id, a: n.flag.a, b: n.flag.b }} width={42} /></span>
                          : c.kind === 'colours' ? <span key={c.id} title={FLAG_COLOURS[c.id].name} style={{ display: 'flex', width: 42, height: 28, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--line-strong)' }}><span style={{ flex: 1, background: FLAG_COLOURS[c.id].a }} /><span style={{ flex: 1, background: FLAG_COLOURS[c.id].b }} /></span>
                          : <svg key={c.id} width="28" height="28" viewBox="0 0 24 24" role="img" aria-label={`${FLAG_EMBLEMS[c.id].name} emblem`}><path d={FLAG_EMBLEMS[c.id].d} fill="#ECE9E2" fillRule="evenodd" /></svg>
                      ))}
                    </div>
                  )}
                  {p.perks && <ul className="col gap-4 small">{p.perks.map((x) => <li key={x}>· {x}</li>)}</ul>}
                </article>
              );
            })}
            <p className="small muted">Packs are not on sale yet. When they are, what you buy is tied to your account and follows you to any device.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
