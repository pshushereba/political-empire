import { AXES, FACTIONS, type Effect, type Flag as FlagT } from '../../game';

export function Flag({ flag, width = 60 }: { flag: FlagT; width?: number }) {
  const h = (width * 2) / 3;
  return (
    <svg width={width} height={h} viewBox="0 0 60 40" aria-hidden="true" style={{ borderRadius: 4, flex: 'none', border: '1px solid rgba(236,233,226,0.25)' }}>
      {flag.pattern === 'tricolour' && (<><rect width="20" height="40" fill={flag.a} /><rect x="20" width="20" height="40" fill="#ECE9E2" /><rect x="40" width="20" height="40" fill={flag.b} /></>)}
      {flag.pattern === 'bands' && (<><rect width="60" height="40" fill={flag.a} /><rect y="13" width="60" height="14" fill={flag.b} /></>)}
      {flag.pattern === 'canton' && (<><rect width="60" height="40" fill={flag.b} /><rect width="28" height="20" fill={flag.a} /></>)}
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
        const isAxis = AXES.some((a) => a.id === e.target);
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
