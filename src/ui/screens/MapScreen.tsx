import { useMemo, useState } from 'react';
import { Sprite } from '../../art/Sprite';
import {
  armyAt, armySize, armySpeed, BUILDING_BY_ID, BUILDINGS, buildCost, CATEGORIES, check as checkAction, claimCost, coord, defencePower, describeUnits,
  DILEMMA_BY_ID, envoyTravelTurns, forecast, hexAt, isCutOff, isRecruitSite, key, LOTS_PER_HEX, MAX_STACK, movingUnits, reachable,
  recruitCost, relation, same, stance, TERRAIN, UNIT_BY_ID, UNIT_IDS, UNITS,
  type Army, type BuildingCategory, type GameState, type Hex, type HexRef, type MoveOption, type UnitCounts,
} from '../../game';
import { HexMap } from '../components/HexMap';
import { Yield } from '../components/common';
import { useGame } from '../store';

export function MapScreen() {
  const { state, dispatch, can } = useGame();
  const player = state.nations[state.playerId];
  const [sel, setSel] = useState<HexRef>(player.capital);
  const [target, setTarget] = useState<HexRef | null>(null);
  const [split, setSplit] = useState<UnitCounts | null>(null);
  const [building, setBuilding] = useState(false);

  const hex = hexAt(state, sel);
  const army = armyAt(state, sel);
  const myArmy = army && army.owner === player.id ? army : null;
  const moving = myArmy ? movingUnits(myArmy, split ?? undefined) : null;
  const options = useMemo(
    () => (myArmy && moving && armySize(moving) > 0 ? reachable(state, player.id, myArmy, moving, myArmy.moved) : new Map<string, MoveOption>()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, sel.c, sel.r, JSON.stringify(split)],
  );
  const order = target && options.get(key(target)) ? { to: target, option: options.get(key(target))! } : null;

  const select = (h: HexRef) => {
    setSel(h);
    setTarget(null);
    setSplit(null);
    setBuilding(false);
  };
  const pick = (h: HexRef) => {
    if (myArmy && options.has(key(h))) setTarget(h);
    else select(h);
  };
  const confirmOrder = () => {
    if (!myArmy || !order) return;
    const next = dispatch({ type: 'moveArmy', armyId: myArmy.id, to: order.to, units: split ?? undefined });
    const there = armyAt(next, order.to);
    if (there && there.owner === player.id) select(order.to);
    else { setTarget(null); setSplit(null); }
  };

  const question = state.dilemma ? DILEMMA_BY_ID[state.dilemma.id] : null;
  const answered = state.dilemma?.choice != null;
  const endTurn = can({ type: 'endTurn' });
  const myArmies = state.armies.filter((a) => a.owner === player.id);

  return (
    <div className="map-screen">
      <main className="map-area">
        <HexMap state={state} selected={sel} target={order ? order.to : null} highlights={options} onPick={pick} />
        {myArmy && options.size > 0 && !order && (
          <p className="map-hint" role="status">Choose a highlighted hex to give this army its orders</p>
        )}
        <div className="legend">
          <span className="eyebrow">Nations</span>
          {state.order.map((id) => {
            const n = state.nations[id];
            return (
              <div key={id} className="row gap-8" style={{ opacity: n.alive ? 1 : 0.5 }}>
                <span className="swatch" style={{ background: n.color }} />
                {n.name}
                <span className="muted">{id === player.id ? '(you)' : n.alive ? `· ${stance(relation(state, player.id, id))}` : '· fallen'}</span>
              </div>
            );
          })}
          <div className="row gap-8"><span className="swatch" style={{ background: '#3A4452' }} />Unclaimed</div>
        </div>
      </main>

      <aside className="side" aria-label="Selected hex">
        <div className="side-scroll">
          {building && hex.owner === player.id ? (
            <BuildMenu state={state} hex={hex} onClose={() => setBuilding(false)} />
          ) : (
            <>
          <HexSummary state={state} hex={hex} />
          {order && myArmy && moving && (
            <OrderCard state={state} from={hex} to={hexAt(state, order.to)} option={order.option} moving={moving} onConfirm={confirmOrder} onCancel={() => setTarget(null)} />
          )}
          {army && <ArmyCard state={state} army={army} mine={!!myArmy} split={split} setSplit={(s) => { setSplit(s); setTarget(null); }} canOrder={options.size > 0} />}
          {hex.owner === player.id && (
            <LotsCard hex={hex} onBuild={() => setBuilding(true)} />
          )}
          {hex.owner === player.id && isRecruitSite(hex, player.id) && <RecruitCard state={state} hex={hex} />}
          <HexActions state={state} hex={hex} />
          {myArmies.length > 0 && (
            <section>
              <h3 className="eyebrow">Your armies</h3>
              <ul className="col gap-8">
                {myArmies.map((a) => {
                  const left = Math.max(0, armySpeed(a.units) - a.moved);
                  return (
                    <li key={a.id}>
                      <button type="button" className="btn small block spread" onClick={() => select(a)} aria-pressed={same(a, sel)}>
                        <span>{coord(a)} · {describeUnits(a.units)}</span>
                        <span className={left ? 'amber' : 'muted'}>{left ? 'Ready' : 'Moved'}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
            </>
          )}
        </div>

        <div className="side-foot">
          {question && (
            <a href="#/council" className={`question-card ${answered ? '' : 'open'}`}>
              <span className="small" style={{ fontWeight: 600, color: answered ? 'var(--text-muted)' : 'var(--accent)' }}>
                {answered ? 'Today’s question · Decided' : `Today’s question · ${question.category}`}
              </span>
              <span className="display" style={{ fontSize: 17 }}>{question.title}</span>
              {answered && <span className="small muted">{question.choices[state.dilemma!.choice!].title}</span>}
            </a>
          )}
          <button type="button" className="btn primary block" disabled={!endTurn.ok} onClick={() => dispatch({ type: 'endTurn' })}>
            {endTurn.ok ? `End turn ${state.turn}` : 'Answer today’s question first'}
          </button>
        </div>
      </aside>
    </div>
  );
}

function HexSummary({ state, hex }: { state: GameState; hex: Hex }) {
  const player = state.playerId;
  const owner = hex.owner ? state.nations[hex.owner] : null;
  const t = TERRAIN[hex.terrain];
  const sea = hex.terrain === 'sea';
  const title = owner ? owner.name : sea ? 'Open sea' : 'Unclaimed land';
  return (
    <section>
      <div className="row spread">
        <span className="eyebrow">Selected hex · {coord(hex)}</span>
        <span className="small muted">{t.name}{hex.capitalOf === hex.owner && owner ? ' · Capital' : ''}</span>
      </div>
      <div className="row">
        <span className="swatch" style={{ background: owner ? owner.color : sea ? '#131C27' : '#3A4452', width: 16, height: 16 }} />
        <h2 className="h-panel">{title}</h2>
      </div>
      {!sea && (
        <dl className="grid-2">
          <div className="tile"><dt className="eyebrow">Land yield</dt><dd style={{ fontFamily: 'inherit', fontSize: 14 }}>Income {t.income} · Supply {t.supply}</dd></div>
          {owner ? (
            <div className="tile">
              <dt className="eyebrow">Defence</dt>
              <dd>{Math.round(defencePower(state, hex, false))}{isCutOff(state, hex) ? ' · cut off' : ''}</dd>
            </div>
          ) : (
            <div className="tile"><dt className="eyebrow">Defence</dt><dd>Undefended</dd></div>
          )}
          {owner && hex.owner !== player && (
            <div className="tile"><dt className="eyebrow">Stance to you</dt><dd style={{ fontFamily: 'inherit' }}>{stance(relation(state, player, owner.id))}</dd></div>
          )}
          {t.defence !== 1 && (
            <div className="tile"><dt className="eyebrow">Terrain</dt><dd>+{Math.round((t.defence - 1) * 100)}% to defenders</dd></div>
          )}
        </dl>
      )}
    </section>
  );
}

function OrderCard({ state, from, to, option, moving, onConfirm, onCancel }: {
  state: GameState; from: Hex; to: Hex; option: MoveOption; moving: UnitCounts; onConfirm: () => void; onCancel: () => void;
}) {
  const f = option.kind === 'attack' ? forecast(state, moving, to) : null;
  const defender = to.owner ? state.nations[to.owner] : null;
  const enemy = armyAt(state, to);
  const label = option.kind === 'move' ? `Move to ${coord(to)}` : option.kind === 'claim' ? `Occupy ${coord(to)}` : `Attack ${coord(to)}`;
  return (
    <section style={{ background: 'var(--surface-amber)' }} aria-live="polite">
      <h3 className="eyebrow amber">Orders · {coord(from)} → {coord(to)}</h3>
      <p className="small">
        {option.kind === 'move' && `${describeUnits(moving)} will march ${option.cost} hex${option.cost > 1 ? 'es' : ''}.`}
        {option.kind === 'claim' && `${describeUnits(moving)} will occupy this unclaimed ${TERRAIN[to.terrain].name.toLowerCase()} and add it to your nation. This ends their move.`}
        {option.kind === 'attack' && defender && `${describeUnits(moving)} will attack ${defender.name}${enemy ? `, defended by ${describeUnits(enemy.units)}` : ', held by local militia'}.`}
      </p>
      {f && (
        <dl className="grid-3">
          <div className="tile"><dt className="eyebrow">Your attack</dt><dd>{f.attack}</dd></div>
          <div className="tile"><dt className="eyebrow">Their defence</dt><dd>{f.defence}</dd></div>
          <div className="tile"><dt className="eyebrow">Odds</dt><dd className={f.ratio >= 1.15 ? 'pos' : f.ratio >= 0.9 ? 'amber' : 'neg'} style={{ fontFamily: 'inherit', fontWeight: 600 }}>{f.label}</dd></div>
        </dl>
      )}
      {f && <p className="small muted">Battles vary by up to 15% either way. A failed attack costs you units and they fall back.</p>}
      <div className="row">
        <button type="button" className="btn light grow" onClick={onConfirm}>{label}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

function ArmyCard({ state, army, mine, split, setSplit, canOrder }: {
  state: GameState; army: Army; mine: boolean; split: UnitCounts | null; setSplit: (s: UnitCounts | null) => void; canOrder: boolean;
}) {
  const { dispatch } = useGame();
  const owner = state.nations[army.owner];
  const size = armySize(army.units);
  const left = Math.max(0, armySpeed(army.units) - army.moved);
  const sending = split ?? army.units;
  const change = (u: keyof UnitCounts, d: number) => {
    const next = { ...sending, [u]: Math.max(0, Math.min(army.units[u], sending[u] + d)) };
    setSplit(UNIT_IDS.every((x) => next[x] === army.units[x]) ? null : next);
  };
  return (
    <section>
      <div className="row spread">
        <h3 className="eyebrow">{mine ? 'Your army' : `Army of ${owner.short}`} · {size} of {MAX_STACK} units</h3>
        {mine && <span className={`small ${left ? 'amber' : 'muted'}`}>{left ? `${left} move${left > 1 ? 's' : ''} left` : 'No moves left'}</span>}
      </div>
      <ul className="col gap-8">
        {UNIT_IDS.filter((u) => army.units[u] > 0).map((u) => (
          <li key={u} className="lot">
            <Sprite id={u} size={36} />
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{army.units[u]} × {UNIT_BY_ID[u].name}</div>
              <div className="small muted">Attack {UNIT_BY_ID[u].attack} · Defence {UNIT_BY_ID[u].defence} · Upkeep {UNIT_BY_ID[u].upkeep}</div>
            </div>
            {mine && size > 1 && left > 0 && (
              <div className="stepper" role="group" aria-label={`${UNIT_BY_ID[u].name} to send`}>
                <button type="button" aria-label={`Send one fewer ${UNIT_BY_ID[u].name}`} disabled={sending[u] === 0} onClick={() => change(u, -1)}>−</button>
                <span className="mono" style={{ minWidth: 18, textAlign: 'center' }}>{sending[u]}</span>
                <button type="button" aria-label={`Send one more ${UNIT_BY_ID[u].name}`} disabled={sending[u] === army.units[u]} onClick={() => change(u, 1)}>+</button>
              </div>
            )}
            {mine && (size === 1 || left === 0) && (
              <button type="button" className="btn small" onClick={() => dispatch({ type: 'disband', armyId: army.id, unit: u })} aria-label={`Disband one ${UNIT_BY_ID[u].name}`}>Disband</button>
            )}
          </li>
        ))}
      </ul>
      {mine && size > 1 && left > 0 && (
        <p className="small muted">
          {split ? `Sending ${armySize(split)} of ${size}. The rest stay here.` : 'Sending the whole army. Use − to leave units behind as a garrison.'}
        </p>
      )}
      {mine && left > 0 && !canOrder && <p className="small muted">Nowhere to go from here this turn.</p>}
    </section>
  );
}

function LotsCard({ hex, onBuild }: { hex: Hex; onBuild: () => void }) {
  const { dispatch } = useGame();
  const free = hex.buildings.length < LOTS_PER_HEX;
  return (
    <section>
      <h3 className="eyebrow">Building lots · {hex.buildings.length} of {LOTS_PER_HEX} used</h3>
      <ul className="col gap-8">
        {hex.buildings.map((b, i) => {
          const d = BUILDING_BY_ID[b.type];
          return (
            <li key={i} className="lot">
              <Sprite id={b.turnsLeft > 0 ? 'site' : b.type} size={40} />
              <div className="grow">
                <div style={{ fontWeight: 600 }}>{d.name}</div>
                {b.turnsLeft > 0 ? (
                  <div className="small amber">Under construction · {b.turnsLeft} turn{b.turnsLeft > 1 ? 's' : ''} left</div>
                ) : (
                  <div className="row wrap-row gap-4" style={{ marginTop: 2 }}><BuildingYields id={b.type} /></div>
                )}
              </div>
              <button type="button" className="btn small" aria-label={`Remove ${d.name}`} onClick={() => dispatch({ type: 'demolish', at: hex, slot: i })}>Remove</button>
            </li>
          );
        })}
        {Array.from({ length: LOTS_PER_HEX - hex.buildings.length }, (_, i) => (
          <li key={`e${i}`} className="lot empty"><Sprite id="lot" size={40} /><span className="muted">Empty lot</span></li>
        ))}
      </ul>
      {free && <button type="button" className="btn light block" onClick={onBuild}>Build here…</button>}
    </section>
  );
}

/** Takes over the side panel while the player chooses what to build. */
function BuildMenu({ state, hex, onClose }: { state: GameState; hex: Hex; onClose: () => void }) {
  const { dispatch } = useGame();
  const [cat, setCat] = useState<BuildingCategory>('commerce');
  const player = state.nations[state.playerId];
  return (
    <section style={{ borderBottom: 0 }}>
      <div className="row spread">
        <span className="eyebrow">Build at {coord(hex)} · {hex.capitalOf === player.id ? 'Capital' : TERRAIN[hex.terrain].name}</span>
        <button type="button" className="btn small" onClick={onClose}>← Back</button>
      </div>
      <h2 className="h-panel">What will you build?</h2>
      <div className="tabs" role="group" aria-label="Building category">
        {CATEGORIES.map((c) => (
          <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</button>
        ))}
      </div>
      <ul className="col gap-8">
        {BUILDINGS.filter((b) => b.category === cat).map((b) => {
          const ok = checkAction(state, { type: 'build', at: hex, building: b.id });
          return (
            <li key={b.id}>
              <button type="button" className="option" disabled={!ok.ok} onClick={() => { dispatch({ type: 'build', at: hex, building: b.id }); onClose(); }}>
                <Sprite id={b.id} size={48} dim={b.era > player.era} />
                <span className="col gap-4 grow">
                  <span className="row spread"><strong>{b.name}</strong><span className="mono small">{buildCost(state, player.id, b)}</span></span>
                  <span className="small muted">{b.desc}</span>
                  <span className="row wrap-row gap-4"><BuildingYields id={b.id} /><span className="chip">{b.turns} turn{b.turns > 1 ? 's' : ''}</span></span>
                  {!ok.ok && <span className="small neg">{ok.reason}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="small muted">Each building you own makes the next one cost a little more.</p>
    </section>
  );
}

function BuildingYields({ id }: { id: string }) {
  const d = BUILDING_BY_ID[id];
  return (
    <>
      <Yield label="Income" value={d.income ?? 0} />
      <Yield label="Supply" value={d.supply ?? 0} />
      <Yield label="Defence" value={d.security ?? 0} />
      <Yield label="Approval" value={d.approval ?? 0} />
      <Yield label="Influence" value={d.influence ?? 0} />
      {d.recruits && <span className="chip">Raises troops</span>}
    </>
  );
}

function RecruitCard({ state, hex }: { state: GameState; hex: Hex }) {
  const { dispatch } = useGame();
  return (
    <section>
      <h3 className="eyebrow">Raise troops here</h3>
      <ul className="col gap-8">
        {UNITS.map((u) => {
          const ok = checkAction(state, { type: 'recruit', at: hex, unit: u.id });
          return (
            <li key={u.id}>
              <button type="button" className="option" disabled={!ok.ok} onClick={() => dispatch({ type: 'recruit', at: hex, unit: u.id })}>
                <Sprite id={u.id} size={40} dim={!ok.ok} />
                <span className="col gap-4 grow">
                  <span className="row spread"><strong>{u.name}</strong><span className="mono small">{recruitCost(state, state.playerId, u)} · {u.upkeep}/turn</span></span>
                  <span className="small muted">{u.desc}</span>
                  <span className="row wrap-row gap-4"><span className="chip">Attack {u.attack}</span><span className="chip">Defence {u.defence}</span><span className="chip">Moves {u.move}</span></span>
                  {!ok.ok && <span className="small neg">{ok.reason}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="small muted">New units spend the turn mustering and can move next turn.</p>
    </section>
  );
}

function HexActions({ state, hex }: { state: GameState; hex: Hex }) {
  const { dispatch } = useGame();
  const player = state.playerId;
  if (hex.terrain === 'sea') return null;
  const claim = checkAction(state, { type: 'claimHex', at: hex });
  const envoy = checkAction(state, { type: 'moveEnvoy', to: hex });
  const turns = envoyTravelTurns(state, hex);
  const here = same(state.envoy, hex) && !state.envoy.dest;
  return (
    <section>
      {hex.owner === null && (
        <>
          <button type="button" className="btn light block" disabled={!claim.ok} onClick={() => dispatch({ type: 'claimHex', at: hex })}>
            Claim this land · {claimCost(state, player)} influence
          </button>
          <p className="small muted">{claim.ok ? 'Or march an army onto it to occupy it for free.' : `${claim.reason}. An army can also occupy unclaimed land.`}</p>
        </>
      )}
      {hex.owner && hex.owner !== player && (
        <a className="btn block" href={`#/diplomacy/${hex.owner}`}>Diplomacy with {state.nations[hex.owner].short}</a>
      )}
      {hex.owner === player && <a className="btn block" href="#/nation">Open nation ledger</a>}
      <button type="button" className="btn block" disabled={!envoy.ok} onClick={() => dispatch({ type: 'moveEnvoy', to: hex })}>
        {here ? 'Your envoy is here' : envoy.ok ? `Send envoy here · ${turns} turn${turns > 1 ? 's' : ''}` : envoy.reason}
      </button>
    </section>
  );
}
