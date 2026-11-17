import { FACTIONS, POLICY_BY_ID, policyLevel, type PolicyId, type PolicyLevel } from '../../game';

const pct = (mult: number): string => `${mult >= 1 ? '+' : '−'}${Math.abs(Math.round((mult - 1) * 100))}%`;
const plus = (n: number): string => `${n > 0 ? '+' : '−'}${Math.abs(n)}`;

/** What a policy level does each turn, in plain words. `good` is from the nation's point of view. */
export function levelEffects(l: PolicyLevel): { text: string; good: boolean }[] {
  const out: { text: string; good: boolean }[] = [];
  if (l.business && l.wages && l.business === l.wages) out.push({ text: `Business and wage taxes ${pct(l.business)}`, good: l.business > 1 });
  else {
    if (l.business) out.push({ text: `Business income ${pct(l.business)}`, good: l.business > 1 });
    if (l.wages) out.push({ text: `Wage taxes ${pct(l.wages)}`, good: l.wages > 1 });
  }
  if (l.buildCost) out.push({ text: `Buildings cost ${pct(l.buildCost)}`, good: l.buildCost < 1 });
  if (l.upkeep) out.push({ text: `Army upkeep ${pct(l.upkeep)}`, good: l.upkeep < 1 });
  if (l.recruit) out.push({ text: `Raising troops costs ${pct(l.recruit)}`, good: l.recruit < 1 });
  if (l.defence) out.push({ text: `Defence of your land ${pct(l.defence)}`, good: l.defence > 1 });
  if (l.revolt) out.push({ text: `Risk of revolt ${pct(l.revolt)}`, good: l.revolt < 1 });
  if (l.growth) out.push({ text: `Population growth ${plus(l.growth)}% a turn`, good: l.growth > 0 });
  if (l.approval) out.push({ text: `Approval ${plus(l.approval)}`, good: l.approval > 0 });
  if (l.stability) out.push({ text: `Stability ${plus(l.stability)}`, good: l.stability > 0 });
  if (l.influence) out.push({ text: `Influence ${plus(l.influence)} a turn`, good: l.influence > 0 });
  if (l.spend) out.push({ text: l.spend > 0 ? `Costs ${l.spend} per million people a turn` : `Saves ${-l.spend} per million people a turn`, good: l.spend < 0 });
  if (l.drift) {
    const f = FACTIONS.find((x) => x.id === l.drift!.faction)!;
    out.push({ text: `${f.name} drifting toward ${l.drift.toward}`, good: l.drift.toward > 50 });
  }
  return out;
}

/** One standing policy: where it sits on its five levels, and what that is doing to the nation every turn. */
export function PolicyCard({ id, level }: { id: PolicyId; level: number }) {
  const def = POLICY_BY_ID[id];
  const now = policyLevel(id, level);
  const effects = levelEffects(now);
  return (
    <div className="card col">
      <div className="row spread"><span className="eyebrow">{def.name}</span><strong>{now.name}</strong></div>
      <ol className="row gap-4" aria-label={`${def.name}: level ${level + 3} of 5, ${now.name}`}>
        {def.levels.map((l, i) => (
          <li key={l.name} className="grow" title={l.name} style={{ height: 10, borderRadius: 4, background: i - 2 === level ? 'var(--accent)' : 'var(--surface-raised)' }} />
        ))}
      </ol>
      <div className="row spread small muted"><span>{def.levels[0].name}</span><span>{def.levels[4].name}</span></div>
      {effects.length ? (
        <div className="row wrap-row gap-4">{effects.map((e) => <span key={e.text} className={`chip ${e.good ? 'pos' : 'neg'}`}>{e.text}</span>)}</div>
      ) : <span className="small muted">The middle level: no bonus and no penalty.</span>}
      <p className="small muted">{def.blurb}</p>
    </div>
  );
}
