import { FLAG_COLOURS, FLAG_EMBLEMS, FLAG_PATTERNS } from '../../art/flags';
import { cosmeticsOf, owns, PRODUCT_BY_ID, type Cosmetic } from '../../commerce/catalog';
import type { Flag as FlagT } from '../../game';
import { Flag } from './common';

/** The colour pair a flag is using, if it is one from the art. */
export function colourIdOf(flag: FlagT): string | null {
  return Object.keys(FLAG_COLOURS).find((k) => FLAG_COLOURS[k].a === flag.a && FLAG_COLOURS[k].b === flag.b) ?? null;
}

function Option({ c, owned, picked, label, onPick, children }: { c: Cosmetic; owned: readonly string[]; picked: boolean; label: string; onPick: () => void; children: React.ReactNode }) {
  const mine = owns(owned, c);
  const pack = c.pack ? PRODUCT_BY_ID[c.pack].name : '';
  return (
    <button type="button" className={`swatch-option ${mine ? '' : 'locked'}`} aria-pressed={picked} disabled={!mine} onClick={onPick}
      aria-label={mine ? label : `${label}. Locked: part of the ${pack}`} title={mine ? label : `${label} · ${pack}`}>
      {children}
      {!mine && (
        <svg className="lock" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10V7a6 6 0 0 1 12 0v3h1v11H5V10zm3 0h6V7a3 3 0 0 0-6 0z" fill="currentColor" /></svg>
      )}
    </button>
  );
}

/**
 * Choose a flag's pattern, colours and emblem. Designs the account doesn't own
 * are shown, locked, with the pack they belong to.
 */
export function FlagEditor({ flag, owned, onChange }: { flag: FlagT; owned: readonly string[]; onChange: (f: FlagT) => void }) {
  const sample = { a: flag.a, b: flag.b };
  const colour = colourIdOf(flag);
  const locked = [...cosmeticsOf('pattern'), ...cosmeticsOf('colours'), ...cosmeticsOf('emblem')].filter((c) => !owns(owned, c)).length;
  return (
    <div className="col gap-8">
      <div className="row wrap-row gap-8" role="group" aria-label="Flag pattern">
        {cosmeticsOf('pattern').map((c) => (
          <Option key={c.id} c={c} owned={owned} picked={flag.pattern === c.id} label={FLAG_PATTERNS[c.id].name} onPick={() => onChange({ ...flag, pattern: c.id })}>
            <Flag flag={{ pattern: c.id, ...sample }} width={42} />
          </Option>
        ))}
      </div>
      <div className="row wrap-row gap-8" role="group" aria-label="Flag colours">
        {cosmeticsOf('colours').map((c) => {
          const p = FLAG_COLOURS[c.id];
          return (
            <Option key={c.id} c={c} owned={owned} picked={colour === c.id} label={p.name} onPick={() => onChange({ ...flag, a: p.a, b: p.b })}>
              <span style={{ display: 'flex', width: 42, height: 28, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--line-strong)' }}>
                <span style={{ flex: 1, background: p.a }} /><span style={{ flex: 1, background: p.b }} />
              </span>
            </Option>
          );
        })}
      </div>
      <div className="row wrap-row gap-8" role="group" aria-label="Flag emblem">
        <button type="button" className="swatch-option" aria-pressed={!flag.emblem} onClick={() => onChange({ pattern: flag.pattern, a: flag.a, b: flag.b })} aria-label="No emblem" title="No emblem">
          <span className="small muted" style={{ width: 42, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>None</span>
        </button>
        {cosmeticsOf('emblem').map((c) => (
          <Option key={c.id} c={c} owned={owned} picked={flag.emblem === c.id} label={`${FLAG_EMBLEMS[c.id].name} emblem`} onPick={() => onChange({ ...flag, emblem: c.id })}>
            <svg width="42" height="28" viewBox="0 0 24 24" aria-hidden="true"><path d={FLAG_EMBLEMS[c.id].d} fill="#ECE9E2" fillRule="evenodd" /></svg>
          </Option>
        ))}
      </div>
      {locked > 0 && <p className="small muted">{locked} locked designs belong to packs that are not on sale yet.</p>}
    </div>
  );
}
