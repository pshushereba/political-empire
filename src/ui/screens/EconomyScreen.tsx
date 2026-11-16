import { Sprite } from '../../art/Sprite';
import {
  BUILDING_BY_ID, buildingYield, economy, GOODS, MARKET, modifiers, ownedHexes, policyTotals, worldProducers,
} from '../../game';
import { signed } from '../components/common';
import { PolicyCard } from '../components/PolicyCard';
import { useGame } from '../store';

/** Where the money comes from: revenue, tax policy, the nation's businesses, and the export market. */
export function EconomyScreen() {
  const { state, me, dispatch } = useGame();
  const n = state.nations[me];
  const eco = economy(state, me);
  const m = modifiers(n);
  const world = worldProducers(state);
  const pol = policyTotals(n.policies);

  // Every finished building that earns money, grouped by kind.
  const rows = new Map<string, { count: number; income: number; bonus: number; building: number }>();
  let building = 0;
  for (const h of ownedHexes(state, me)) {
    h.buildings.forEach((b, i) => {
      const def = BUILDING_BY_ID[b.type];
      if (!(def.income && def.income > 0)) return;
      const row = rows.get(b.type) ?? { count: 0, income: 0, bonus: 0, building: 0 };
      if (b.turnsLeft > 0) { row.building++; building++; }
      else {
        const y = buildingYield(state, h, i);
        const scale = (def.category === 'commerce' ? m.commerceMult : 1) * pol.business;
        row.count++;
        row.income += y.income * scale;
        row.bonus += (y.income - def.income) * scale;
      }
      rows.set(b.type, row);
    });
  }
  const businesses = [...rows.entries()].sort((a, b) => b[1].income - a[1].income);
  const exportsOn = GOODS.filter((g) => n.exports[g.id]);
  const unsold = GOODS.reduce((s, g) => s + (n.exports[g.id] ? eco.exports.produced[g.id] - eco.exports.sold[g.id] : 0), 0);

  return (
    <div className="page">
      <div className="wrap">
        <header className="col gap-4">
          <h1 className="h-page">Economy</h1>
          <p className="muted">What {n.name} earns each turn, who pays it, and what it sells to the world.</p>
        </header>

        <dl className="grid-4">
          <div className="card col gap-4"><dt className="eyebrow">In the treasury</dt><dd className="mono" style={{ fontSize: 22 }}>{Math.round(n.stats.treasury).toLocaleString()}</dd><dd className="small muted">Available to spend now</dd></div>
          <div className="card col gap-4"><dt className="eyebrow">Revenue per turn</dt><dd className="mono" style={{ fontSize: 22 }}>{eco.income.gross}</dd><dd className="small muted">Before the army and services are paid</dd></div>
          <div className="card col gap-4"><dt className="eyebrow">Army and public services</dt><dd className="mono" style={{ fontSize: 22 }}>−{eco.upkeep + eco.spending}</dd><dd className="small muted">{eco.units} units · services {eco.spending >= 0 ? `cost ${eco.spending}` : `save ${-eco.spending}`}</dd></div>
          <div className="card col gap-4"><dt className="eyebrow">Left over per turn</dt><dd className={`mono ${eco.net >= 0 ? 'pos' : 'neg'}`} style={{ fontSize: 22 }}>{signed(eco.net)}</dd><dd className="small muted">Added to the treasury at the end of each turn</dd></div>
        </dl>

        <div className="grid-2" style={{ gap: 32, alignItems: 'start' }}>
          <section className="col gap-16">
            <h2 className="h-section">Where revenue comes from</h2>
            <div className="card">
              <table className="ledger"><tbody>
                <tr><td>Capital administration</td><td>{eco.income.base}</td></tr>
                <tr><td>Land ({eco.hexes} hexes)</td><td>{eco.income.land}</td></tr>
                <tr><td>Taxes on wages</td><td>{eco.income.population}</td></tr>
                <tr><td>Taxes on businesses</td><td>{eco.income.businesses}</td></tr>
                <tr><td>Trade pacts ({eco.exports.pacts})</td><td>{eco.income.trade}</td></tr>
                <tr><td>Exports</td><td>{eco.income.exports}</td></tr>
                <tr><td>Stability and the Merchant Houses</td><td>×{eco.income.multiplier.toFixed(2)}</td></tr>
                <tr className="total"><td>Revenue</td><td>{eco.income.gross}</td></tr>
              </tbody></table>
            </div>
          </section>

          <section className="col gap-16">
            <h2 className="h-section">Tax policy</h2>
            <PolicyCard id="tax" level={n.policies.tax} />
            <p className="small muted">You do not set this directly. It moves when the council’s daily question is about taxes. Schooling and workers’ protections also change what businesses earn: see <a href="#/nation">standing policies</a>.</p>
          </section>
        </div>

        <section className="col gap-16">
          <h2 className="h-section">Your businesses</h2>
          {businesses.length === 0 ? <p className="muted">No businesses yet. Build from the map or the district close-up.</p> : (
            <div className="card">
              <table className="ledger">
                <thead><tr><th scope="col" style={{ textAlign: 'left' }}>Business</th><th scope="col">Open</th><th scope="col">From good siting</th><th scope="col">Pays per turn</th></tr></thead>
                <tbody>
                  {businesses.map(([id, r]) => (
                    <tr key={id}>
                      <td><span className="row gap-8"><Sprite id={id} size={28} />{BUILDING_BY_ID[id].name}{r.building > 0 && <span className="small amber">+{r.building} being built</span>}</span></td>
                      <td className="num">{r.count}</td>
                      <td className={`num ${r.bonus > 0 ? 'pos' : ''}`}>{r.bonus ? signed(Math.round(r.bonus)) : '—'}</td>
                      <td>{Math.round(r.income)}</td>
                    </tr>
                  ))}
                  <tr className="total"><td>All businesses, after taxes and other policies</td><td /><td /><td>{eco.income.businesses}</td></tr>
                </tbody>
              </table>
            </div>
          )}
          {building > 0 && <p className="small muted">{building} more under construction will start paying when finished.</p>}
        </section>

        <section className="col gap-16">
          <div className="row spread">
            <h2 className="h-section">Export market</h2>
            <span className="chip pos">Exports earn {eco.exports.income} a turn</span>
          </div>
          <p className="small muted">Farms, timber yards, mines and factories each make one unit a turn. Whatever you can ship is sold abroad at the world price, dearest first, on top of what those businesses earn at home. Prices fall when many nations make the same thing and rise when few do.</p>
          <div className="card">
            <table className="ledger">
              <thead><tr><th scope="col" style={{ textAlign: 'left' }}>Good</th><th scope="col">World price</th><th scope="col">Made in the world</th><th scope="col">You make</th><th scope="col">You sell</th><th scope="col">Export</th></tr></thead>
              <tbody>
                {GOODS.map((g) => {
                  const price = state.market.prices[g.id];
                  const was = state.market.previous[g.id];
                  const on = n.exports[g.id];
                  return (
                    <tr key={g.id}>
                      <td><strong>{g.name}</strong><div className="small muted">{g.madeBy}{g.costsSupply ? ` · each unit sold costs ${g.costsSupply} supply` : ''}</div></td>
                      <td>{price.toFixed(1)} <span className={price > was ? 'pos' : price < was ? 'neg' : 'muted'}>{price > was ? '▲ rising' : price < was ? '▼ falling' : '– steady'}</span></td>
                      <td className="num">{world[g.id]}</td>
                      <td className="num">{eco.exports.produced[g.id]}</td>
                      <td className="num">{eco.exports.sold[g.id]}</td>
                      <td><button type="button" className="btn small" aria-pressed={on} style={on ? { borderColor: 'var(--accent)', background: 'var(--surface-amber)' } : undefined}
                        onClick={() => dispatch({ type: 'setExport', good: g.id, on: !on })} aria-label={`${on ? 'Stop exporting' : 'Export'} ${g.name}`}>{on ? 'Exporting' : 'Kept at home'}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid-2" style={{ alignItems: 'start' }}>
            <div className="card">
              <h3 className="eyebrow" style={{ marginBottom: 8 }}>What you can ship each turn</h3>
              <table className="ledger"><tbody>
                <tr><td>By road</td><td>{MARKET.baseCapacity}</td></tr>
                <tr><td>Port terminals ({eco.exports.ports})</td><td>{eco.exports.capacity - MARKET.baseCapacity - eco.exports.pacts * MARKET.capacityPerPact}</td></tr>
                <tr><td>Trade pacts ({eco.exports.pacts})</td><td>{eco.exports.pacts * MARKET.capacityPerPact}</td></tr>
                <tr className="total"><td>Units per turn</td><td>{eco.exports.capacity}</td></tr>
              </tbody></table>
            </div>
            <div className="card col gap-8">
              <h3 className="eyebrow">How to sell more</h3>
              {exportsOn.length === 0 && <p className="small neg">Nothing is marked for export.</p>}
              {unsold > 0
                ? <p className="small">You make {unsold} more unit{unsold > 1 ? 's' : ''} than you can ship. Build a port terminal on the coast (+3) or sign a trade pact (+{MARKET.capacityPerPact} each).</p>
                : <p className="small">You are shipping everything you make for export. Build more farms, timber yards, mines or factories to have more to sell.</p>}
              {m.tradeMult !== 1 && <p className="small pos">An open nation sells for more: export prices ×{m.tradeMult.toFixed(2)}.</p>}
              <p className="small muted">A trade pact is ended by war, and its shipping goes with it.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
