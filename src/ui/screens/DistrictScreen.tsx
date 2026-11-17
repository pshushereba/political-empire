import { Fragment, useState } from 'react';
import { Sprite } from '../../art/Sprite';
import { SPRITE_H, SPRITE_W } from '../../art/sprites';
import {
  BUILDING_BY_ID, BUILDINGS, buildCost, buildingYield, canBuild, CATEGORIES, centre, coord, corners, hexAt, key, LOTS_PER_HEX,
  neighbours, placementEffect, TERRAIN, type BuildingCategory, type BuildingDef, type GameState, type Hex, type PlacementEffect, type Yield,
} from '../../game';
import { Yield as YieldChip } from '../components/common';
import { go, useGame } from '../store';

const R = 118;
const W = Math.sqrt(3) * R;
const TILT = 56;
const SPRITE = 92;
const GROUND: Record<string, string> = {
  capital: '#333A44', coast: '#1F3340', forest: '#22332A', farmland: '#30352A', river: '#1D3039',
  hills: '#2F3238', highlands: '#35343C', plains: '#2A3138', sea: '#131C27',
};

const total = (e: PlacementEffect) => ({
  income: e.own.income + e.others.income, supply: e.own.supply + e.others.supply,
  security: e.own.security + e.others.security, approval: e.own.approval + e.others.approval, influence: e.own.influence,
});

function effectText(e: PlacementEffect): string {
  const t = total(e);
  const parts = ([['income', t.income], ['supply', t.supply], ['defence', t.security], ['approval', t.approval], ['influence', t.influence]] as const)
    .filter(([, v]) => v !== 0).map(([k, v]) => `${k} ${v > 0 ? '+' : '−'}${Math.abs(v)}`);
  return parts.join(', ') || 'no effect';
}

function YieldChips({ y }: { y: { income: number; supply: number; security: number; approval: number; influence?: number } }) {
  return (
    <>
      <YieldChip label="Income" value={y.income} />
      <YieldChip label="Supply" value={y.supply} />
      <YieldChip label="Defence" value={y.security} />
      <YieldChip label="Approval" value={y.approval} />
      <YieldChip label="Influence" value={y.influence ?? 0} />
    </>
  );
}

/** A close-up of one hex and the six around it, for planning where buildings go. */
export function DistrictScreen({ at }: { at?: string }) {
  const { state, me, dispatch } = useGame();
  const player = state.nations[me];
  const [tilted, setTilted] = useState(true);
  const [pick, setPick] = useState<string | null>(null);
  const [cat, setCat] = useState<BuildingCategory>('commerce');
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const [pc, pr] = (at ?? '').split(',').map(Number);
  const wanted = Number.isInteger(pc) && Number.isInteger(pr) && pc >= 0 && pc < state.cols && pr >= 0 && pr < state.rows ? hexAt(state, { c: pc, r: pr }) : null;
  const mid = wanted && wanted.owner === me ? wanted : hexAt(state, player.capital);
  const hexes = [mid, ...neighbours(mid, state.cols, state.rows).map((n) => hexAt(state, n))];
  const origin = centre(mid, R);
  const pos = (h: Hex) => { const p = centre(h, R); return { x: p.x - origin.x + 1.5 * W, y: p.y - origin.y + 2 * R }; };
  const width = 3 * W;
  const height = 4 * R;

  const mine = hexes.filter((h) => h.owner === me);
  const focus = mine.find((h) => key(h) === focusKey) ?? mid;
  const def = pick ? BUILDING_BY_ID[pick] : null;
  const options = new Map<string, { ok: boolean; reason?: string; effect?: PlacementEffect }>();
  if (def) {
    for (const h of mine) {
      const ok = canBuild(state, me, h, def);
      options.set(key(h), ok.ok ? { ok: true, effect: placementEffect(state, me, h, def) } : { ok: false, reason: ok.reason });
    }
  }
  const anywhere = [...options.values()].some((o) => o.ok);
  const best = [...options.entries()].filter(([, o]) => o.ok).sort((a, b) => worth(b[1].effect!) - worth(a[1].effect!))[0];

  const output = { income: 0, supply: 0, security: 0, approval: 0, influence: 0 };
  let lotsUsed = 0;
  for (const h of mine) {
    lotsUsed += h.buildings.length;
    h.buildings.forEach((b, i) => {
      if (b.turnsLeft > 0) return;
      const y = buildingYield(state, h, i);
      output.income += y.income; output.supply += y.supply; output.security += y.security; output.approval += y.approval; output.influence += y.influence;
    });
  }

  const click = (h: Hex) => {
    if (h.owner !== me) return;
    if (def) {
      if (options.get(key(h))?.ok) dispatch({ type: 'build', at: h, building: def.id });
      return;
    }
    setFocusKey(key(h));
  };

  const hint = !def
    ? 'Choose a building on the right to see where it fits. Select a hex to inspect it.'
    : !anywhere
      ? `Nowhere in this district can take a ${def.name.toLowerCase()} right now. ${[...options.values()][0]?.reason ?? ''}`
      : `Highlighted hexes can take a ${def.name.toLowerCase()}. Each shows what building there would change.${best && options.size > 1 ? ` Best site: ${coord(hexAt(state, parse(best[0])))}.` : ''}`;

  const lift = tilted ? `rotateX(-${TILT}deg)` : 'none';

  return (
    <div className="district-screen">
      <main className="district-main">
        <header className="row spread" style={{ padding: '20px 24px 0' }}>
          <div className="col gap-4">
            <a href="#/" className="small">← World map</a>
            <h1 className="h-panel">District around {coord(mid)}</h1>
            <p className="small muted">{mine.length} of {hexes.length} hexes are yours · {lotsUsed} of {mine.length * LOTS_PER_HEX} building lots used · {mine.length} of {state.hexes.filter((h) => h.owner === me).length} hexes in {player.name}</p>
          </div>
          <div className="tabs" role="group" aria-label="View" style={{ width: 200 }}>
            <button type="button" aria-pressed={!tilted} onClick={() => setTilted(false)}>Flat</button>
            <button type="button" aria-pressed={tilted} onClick={() => setTilted(true)}>Tilted</button>
          </div>
        </header>

        <div className="district-stage">
          <div className="district-plane" style={{ width, height, transform: tilted ? `rotateX(${TILT}deg) scale(1.18)` : 'none' }}>
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }} role="group" aria-label="District hexes">
              {hexes.map((h) => {
                const { x, y } = pos(h);
                const own = h.owner === me;
                const opt = options.get(key(h));
                const land = h.capitalOf === me && own ? 'capital' : h.terrain;
                const owner = h.owner ? state.nations[h.owner] : null;
                const names = h.buildings.map((b) => BUILDING_BY_ID[b.type].name + (b.turnsLeft ? ' (under construction)' : ''));
                const label = !own
                  ? `${TERRAIN[h.terrain].name}, ${h.terrain === 'sea' ? 'open sea' : owner ? owner.name : 'unclaimed'}, not yours`
                  : `${land === 'capital' ? 'Capital' : TERRAIN[h.terrain].name} at ${coord(h)}, ${h.buildings.length} of ${LOTS_PER_HEX} lots used${names.length ? ', ' + names.join(', ') : ''}`
                    + (def ? (opt?.ok ? `. Build ${def.name} here: ${effectText(opt.effect!)}` : `. Cannot build ${def.name}: ${opt?.reason}`) : '');
                const fill = own ? (opt?.ok ? '#4A3B22' : GROUND[land]) : h.terrain === 'sea' ? GROUND.sea : '#161B22';
                return (
                  <g key={key(h)} role={own ? 'button' : 'img'} tabIndex={own ? 0 : undefined} aria-label={label} aria-pressed={own && !def ? key(h) === key(focus) : undefined}
                    className={own ? 'hex' : undefined} opacity={def && own && !opt?.ok ? 0.45 : 1}
                    onClick={() => click(h)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); click(h); } }}>
                    <polygon className="fill" points={corners(x, y, R - 4)} fill={fill} />
                    {!own && owner && <polygon points={corners(x, y, R - 4)} fill={owner.color} fillOpacity="0.22" />}
                    <polygon points={corners(x, y, R - 4)} fill="none" strokeLinejoin="round"
                      stroke={opt?.ok ? '#E8A33D' : own ? 'rgba(232,163,61,0.55)' : '#2C3642'} strokeWidth={opt?.ok ? 4 : own ? 2.5 : 1.5} strokeDasharray={own ? undefined : '6 6'} />
                    {own && !def && key(h) === key(focus) && <polygon points={corners(x, y, R - 10)} fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinejoin="round" />}
                  </g>
                );
              })}
            </svg>

            {hexes.map((h) => {
              const { x, y } = pos(h);
              const own = h.owner === me;
              const opt = options.get(key(h));
              const owner = h.owner ? state.nations[h.owner] : null;
              const lots = own ? Array.from({ length: LOTS_PER_HEX }, (_, i) => h.buildings[i] ?? null) : [];
              const land = h.capitalOf === me && own ? 'Capital' : TERRAIN[h.terrain].name;
              const fade = def && own && !opt?.ok ? 0.45 : 1;
              return (
                <Fragment key={key(h)}>
                  {own && h.terrain === 'forest' && h.buildings.length === 0 && (
                    <div className="standee" aria-hidden="true" style={{ left: x - SPRITE / 2, top: y - 38 - (SPRITE * SPRITE_H) / SPRITE_W + 10, transform: lift, opacity: fade }}><Sprite id="trees" size={SPRITE} /></div>
                  )}
                  {lots.map((b, i) => {
                    const sx = x + (i === 0 ? -48 : 48);
                    const sy = y + 6;
                    const id = b ? (b.turnsLeft > 0 ? 'site' : b.type) : opt?.ok && i === h.buildings.length ? def!.id : 'lot';
                    return (
                      <div key={i} className="standee" aria-hidden="true" style={{ left: sx - SPRITE / 2, top: sy - (SPRITE * SPRITE_H) / SPRITE_W + 4, transform: lift, opacity: fade }}>
                        <Sprite id={id} size={SPRITE} dim={!b && id !== 'lot'} />
                        {b && b.turnsLeft > 0 && <span className="standee-badge">{b.turnsLeft} turn{b.turnsLeft > 1 ? 's' : ''}</span>}
                      </div>
                    );
                  })}
                  <div className="standee label" aria-hidden="true" style={{ left: x - 90, top: y + R * 0.52, width: 180, transform: lift, opacity: fade }}>
                    <span className="ground-label" style={opt?.ok ? { borderColor: 'var(--accent)', color: 'var(--accent-hover)' } : undefined}>
                      {own ? (opt?.ok ? effectText(opt.effect!) : land) : h.terrain === 'sea' ? 'Sea' : owner ? owner.short : 'Unclaimed'}
                    </span>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>

        <footer className="district-foot">
          <dl className="row gap-24">
            <div className="col gap-4"><dt className="eyebrow">District output</dt><dd className="row gap-8 wrap-row"><YieldChips y={output} />{!(output.income || output.supply || output.security || output.approval || output.influence) && <span className="muted small">Nothing built yet</span>}</dd></div>
          </dl>
          <p className="small grow" role="status" aria-live="polite" style={{ textAlign: 'right' }}>{hint}</p>
        </footer>
      </main>

      <aside className="side" style={{ width: 420 }} aria-label="Hex details and build menu">
        <div className="side-scroll">
          <FocusCard state={state} hex={focus} isCentre={key(focus) === key(mid)} />
          <section style={{ borderBottom: 0 }}>
            <div className="row spread">
              <h2 className="h-section">Build</h2>
              {def && <button type="button" className="btn small" onClick={() => setPick(null)}>Stop placing</button>}
            </div>
            <div className="tabs" role="group" aria-label="Building category">
              {CATEGORIES.map((c) => <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</button>)}
            </div>
            <ul className="col gap-8">
              {BUILDINGS.filter((b) => b.category === cat).map((b) => <BuildCard key={b.id} state={state} def={b} picked={pick === b.id} onPick={() => setPick(pick === b.id ? null : b.id)} />)}
            </ul>
          </section>
        </div>
      </aside>
    </div>
  );
}

const worth = (e: PlacementEffect): number => { const t = total(e); return t.income + t.supply * 2 + t.security + t.approval * 2 + t.influence * 2; };
const parse = (k: string) => { const [c, r] = k.split(',').map(Number); return { c, r }; };

function FocusCard({ state, hex, isCentre }: { state: GameState; hex: Hex; isCentre: boolean }) {
  const { dispatch } = useGame();
  const t = TERRAIN[hex.terrain];
  return (
    <section>
      <div className="row spread">
        <span className="eyebrow">Selected hex · {coord(hex)}</span>
        {!isCentre && <button type="button" className="btn small" onClick={() => go(`/district/${hex.c},${hex.r}`)}>Centre the view here</button>}
      </div>
      <h2 className="h-panel">{hex.capitalOf === hex.owner ? 'Capital' : t.name}</h2>
      <p className="small muted">The land gives {t.income} income and {t.supply} supply{t.defence !== 1 ? `, and +${Math.round((t.defence - 1) * 100)}% to defenders` : ''}. Buildings are affected by what stands on this hex and the six around it.</p>
      <ul className="col gap-8">
        {hex.buildings.map((b, i) => {
          const d = BUILDING_BY_ID[b.type];
          const y: Yield | null = b.turnsLeft === 0 ? buildingYield(state, hex, i) : null;
          return (
            <li key={i} className="lot" style={{ alignItems: 'flex-start' }}>
              <Sprite id={y ? b.type : 'site'} size={44} />
              <div className="grow col gap-4">
                <strong>{d.name}</strong>
                {y ? <div className="row wrap-row gap-4"><YieldChips y={y} /></div> : <span className="small amber">Under construction · {b.turnsLeft} turn{b.turnsLeft > 1 ? 's' : ''} left</span>}
                {y?.bonuses.map((x) => (
                  <span key={x.why} className={`small ${x.income + x.supply + x.security + x.approval > 0 ? 'pos' : 'neg'}`}>
                    {x.why}{x.count > 1 ? ` ×${x.count}` : ''}
                  </span>
                ))}
              </div>
              <button type="button" className="btn small" aria-label={`Remove ${d.name}`} onClick={() => dispatch({ type: 'demolish', at: hex, slot: i })}>Remove</button>
            </li>
          );
        })}
        {hex.buildings.length === 0 && <li className="lot empty"><Sprite id="lot" size={40} /><span className="muted">Two empty lots</span></li>}
      </ul>
    </section>
  );
}

function BuildCard({ state, def, picked, onPick }: { state: GameState; def: BuildingDef; picked: boolean; onPick: () => void }) {
  const { me } = useGame();
  const player = state.nations[me];
  const cost = buildCost(state, player.id, def);
  const locked = def.era > player.era ? 'Unlocks in a later era'
    : def.governments && !def.governments.includes(player.government as never) ? 'Not available to your form of government'
    : player.stats.treasury < cost ? `Needs ${cost} treasury` : null;
  return (
    <li>
      <button type="button" className="option" aria-pressed={picked} disabled={!!locked} onClick={onPick} style={picked ? { borderColor: 'var(--accent)', background: 'var(--surface-amber)' } : undefined}>
        <Sprite id={def.id} size={52} dim={!!locked} />
        <span className="col gap-4 grow">
          <span className="row spread"><strong>{def.name}</strong><span className="mono small">{cost}</span></span>
          <span className="small muted">{def.desc}</span>
          <span className="row wrap-row gap-4">
            <YieldChips y={{ income: def.income ?? 0, supply: def.supply ?? 0, security: def.security ?? 0, approval: def.approval ?? 0, influence: def.influence ?? 0 }} />
            <span className="chip">{def.turns} turn{def.turns > 1 ? 's' : ''}</span>
            {def.needs && <span className="chip">Needs {def.needs.map((n) => (n === 'capital' ? 'the capital' : n)).join(' or ')}</span>}
          </span>
          {def.synergies?.map((s) => {
            const gain = (s.income ?? 0) + (s.supply ?? 0) + (s.security ?? 0) + (s.approval ?? 0) > 0;
            return (
              <span key={s.why} className={`small ${gain ? 'pos' : 'neg'}`}>
                {gain ? 'Better' : 'Worse'} near {s.near.map((n) => BUILDING_BY_ID[n].name.toLowerCase()).join(', ')}
              </span>
            );
          })}
          {locked && <span className="small neg">{locked}</span>}
        </span>
      </button>
    </li>
  );
}
