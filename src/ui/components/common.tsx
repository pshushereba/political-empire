import { FLAG_EMBLEMS, FLAG_PATTERNS, IVORY } from '../../art/flags';
import { AXES, FACTIONS, POLICIES, type Effect, type Flag as FlagT } from '../../game';

/** A nation's flag, drawn from the flag art. Unknown designs fall back to plain bands. */
export function Flag({ flag, width = 60 }: { flag: FlagT; width?: number }) {
  const pattern = FLAG_PATTERNS[flag.pattern] ?? FLAG_PATTERNS.bands;
  const emblem = flag.emblem ? FLAG_EMBLEMS[flag.emblem] : null;
  const fill = { a: flag.a, b: flag.b, ivory: IVORY };
  return (
    <svg width={width} height={(width * 2) / 3} viewBox="0 0 60 40" aria-hidden="true" style={{ borderRadius: 4, flex: 'none', border: '1px solid rgba(236,233,226,0.25)' }}>
      {pattern.layers.map((l, i) => <path key={i} d={l.d} fill={fill[l.fill]} />)}
      {emblem && <path d={emblem.d} transform="translate(19.2 9.2) scale(0.9)" fill={IVORY} fillRule="evenodd" stroke="#0E1217" strokeWidth="1.3" strokeLinejoin="round" />}
    </svg>
  );
}

export function Logo() {
  return (
    <svg width="26" height="28" viewBox="0 0 26 28" aria-hidden="true">
      <path d="M13 1 L25 7.5 V20.5 L13 27 L1 20.5 V7.5 Z" fill="none" stroke="#E8A33D" strokeWidth="2" />
      <path d="M13 8 L19 11.5 V17 L13 20.5 L7 17 V11.5 Z" fill="#E8A33D" />
    </svg>
  );
}

/** "Authority +12" style wording for an effect. */
export function effectLabel(e: Effect): { text: string; good: boolean } {
  const axis = AXES.find((a) => a.id === e.target);
  if (axis) return { text: `${e.delta > 0 ? axis.high : axis.low} +${Math.abs(e.delta)}`, good: true };
  const policy = POLICIES.find((p) => p.id === e.target);
  if (policy) return { text: e.delta > 0 ? policy.up : policy.down, good: true };
  const faction = FACTIONS.find((f) => f.id === e.target);
  const sign = e.delta > 0 ? '+' : '−';
  const n = Math.abs(e.delta);
  if (faction) return { text: `${faction.name} ${sign}${n}`, good: e.delta > 0 };
  const names: Record<string, string> = { treasury: 'Treasury', stability: 'Stability', influence: 'Influence', population: 'Population', relations: 'Foreign relations' };
  return { text: `${names[e.target]} ${sign}${n}${e.target === 'population' ? '%' : ''}`, good: e.delta > 0 };
}

export function EffectChips({ effects }: { effects: Effect[] }) {
  return (
    <div className="row wrap-row gap-8">
      {effects.map((e, i) => {
        const l = effectLabel(e);
        const isAxis = POLICIES.some((p) => p.id === e.target) || AXES.some((a) => a.id === e.target);
        return <span key={i} className={`chip ${isAxis ? '' : l.good ? 'pos' : 'neg'}`}>{l.text}</span>;
      })}
    </div>
  );
}

export function Yield({ label, value, unit = '' }: { label: string; value: number; unit?: string }) {
  if (!value) return null;
  return <span className={`chip ${value > 0 ? 'pos' : 'neg'}`}>{label} {value > 0 ? '+' : '−'}{Math.abs(value)}{unit}</span>;
}

export const signed = (n: number): string => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);
