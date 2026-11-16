import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { SpriteG } from '../../art/Sprite';
import { TERRAIN_MARKS } from '../../art/sprites';
import { armySize, centre, corners, key, neighbours, relation, stance, TERRAIN, type GameState, type Hex, type HexRef, type MoveKind, type NationId } from '../../game';

const R = 38;
const W = Math.sqrt(3) * R;
/** Empty margin around the world, in world units. */
const PAD = 24;
const MAX_ZOOM = 1.6;
/** A large world opens no further out than this, so hexes stay readable. */
const MIN_READABLE = 0.85;
const MINI = 168;
const STAR = 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z';
const HIGHLIGHT: Record<MoveKind, { stroke: string; dash?: string; word: string }> = {
  move: { stroke: '#F4C374', dash: '5 4', word: 'your army can move here' },
  claim: { stroke: '#7FD1A8', dash: '2 4', word: 'your army can occupy this land' },
  attack: { stroke: '#FF8A6B', word: 'your army can attack here' },
};

function hexLabel(state: GameState, me: NationId, h: Hex, highlight?: MoveKind): string {
  const parts = [TERRAIN[h.terrain].name];
  if (h.terrain === 'sea') parts.push('open sea');
  else if (!h.owner) parts.push('unclaimed');
  else {
    const n = state.nations[h.owner];
    parts.push(h.owner === me ? `${n.name}, your land` : `${n.name}, ${stance(relation(state, me, h.owner)).toLowerCase()}`);
    if (h.capitalOf === h.owner) parts.push('capital');
  }
  const army = state.armies.find((a) => a.c === h.c && a.r === h.r);
  if (army) parts.push(`${armySize(army.units)} ${army.owner === me ? 'of your' : 'enemy'} units`);
  if (h.buildings.length) parts.push(`${h.buildings.length} building${h.buildings.length > 1 ? 's' : ''}`);
  if (highlight) parts.push(HIGHLIGHT[highlight].word);
  return parts.join(', ');
}

interface Props {
  state: GameState;
  /** The nation whose view this is. */
  me: NationId;
  selected: HexRef;
  target: HexRef | null;
  highlights: Map<string, { kind: MoveKind }>;
  onPick: (h: HexRef) => void;
}

/** The world map. One SVG; every hex is a keyboard-reachable button with a full label. */
export function HexMap({ state, me, selected, target, highlights, onPick }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const width = state.cols * W + W / 2;
  const height = (state.rows - 1) * 1.5 * R + 2 * R + 20;
  const player = me;
  const home = centre(state.nations[me].capital, R);

  // ---- The view: where on the world we are looking, and how closely -------
  // `z` is screen pixels per world unit; (x, y) is the world point at the centre.
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<{ z: number; x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const el = wrap.current!;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fit = size.w ? Math.min(size.w / (width + PAD * 2), size.h / (height + PAD * 2)) : 1;
  const clampView = (v: { z: number; x: number; y: number }) => {
    const z = Math.max(fit, Math.min(MAX_ZOOM, v.z));
    const halfW = size.w / 2 / z;
    const halfH = size.h / 2 / z;
    // If the whole world fits along an axis, centre it; otherwise stop at the edges.
    const x = halfW * 2 >= width + PAD * 2 ? width / 2 : Math.max(halfW - PAD, Math.min(width + PAD - halfW, v.x));
    const y = halfH * 2 >= height + PAD * 2 ? height / 2 : Math.max(halfH - PAD, Math.min(height + PAD - halfH, v.y));
    return { z, x, y };
  };
  // Small worlds open fully in view. Large ones open on your capital, close enough to read.
  const v = clampView(view ?? { z: Math.max(fit, MIN_READABLE), x: home.x, y: home.y });
  const fitsAll = v.z <= fit * 1.02;
  const zoomBy = (factor: number, around?: { x: number; y: number }) => {
    const z = Math.max(fit, Math.min(MAX_ZOOM, v.z * factor));
    const p = around ?? { x: v.x, y: v.y };
    // Keep the point under the cursor where it is.
    setView(clampView({ z, x: p.x + (v.x - p.x) * (v.z / z), y: p.y + (v.y - p.y) * (v.z / z) }));
  };
  const toWorld = (clientX: number, clientY: number) => {
    const box = wrap.current!.getBoundingClientRect();
    return { x: v.x + (clientX - box.left - size.w / 2) / v.z, y: v.y + (clientY - box.top - size.h / 2) / v.z };
  };
  const live = useRef({ v, zoomBy, toWorld });
  live.current = { v, zoomBy, toWorld };
  useEffect(() => {
    const el = wrap.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      live.current.zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, live.current.toWorld(e.clientX, e.clientY));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Dragging pans. A press that barely moves is still a click on a hex.
  const drag = useRef<{ sx: number; sy: number; vx: number; vy: number; moved: boolean } | null>(null);
  const onPointerDown = (e: ReactPointerEvent) => { if (e.button === 0) drag.current = { sx: e.clientX, sy: e.clientY, vx: v.x, vy: v.y, moved: false }; };
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    d.moved = true;
    setView(clampView({ z: v.z, x: d.vx - dx / v.z, y: d.vy - dy / v.z }));
  };
  const endDrag = () => { const d = drag.current; drag.current = d?.moved ? { ...d, sx: NaN } : null; };

  // Keep the selected hex in view: selecting by keyboard, from a list, or from the legend brings the map to it.
  const selKey = key(selected);
  useEffect(() => {
    if (!size.w) return;
    const p = centre(selected, R);
    const halfW = size.w / 2 / v.z - R * 1.5;
    const halfH = size.h / 2 / v.z - R * 1.5;
    if (Math.abs(p.x - v.x) > halfW || Math.abs(p.y - v.y) > halfH) setView(clampView({ z: v.z, x: p.x, y: p.y }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey, size.w, size.h]);
  const envoy = state.nations[me].seat!.envoy;

  const onKey = (e: KeyboardEvent, h: Hex) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPick(h);
      return;
    }
    // Arrow keys walk the grid. Up and down pick the neighbour that keeps the same heading.
    const all = neighbours(h, state.cols, state.rows);
    const here = centre(h, R);
    const want = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0.3, -1], ArrowDown: [-0.3, 1] }[e.key];
    if (!want) return;
    e.preventDefault();
    let best: HexRef | null = null;
    let bestDot = 0.3;
    for (const n of all) {
      const p = centre(n, R);
      const dx = p.x - here.x;
      const dy = p.y - here.y;
      const dot = (dx * want[0] + dy * want[1]) / (Math.hypot(dx, dy) * Math.hypot(want[0], want[1]));
      if (dot > bestDot) { best = n; bestDot = dot; }
    }
    if (best) {
      onPick(best);
      ref.current?.querySelector<SVGGElement>(`[data-hex="${key(best)}"]`)?.focus();
    }
  };

  const envoyAt = centre(envoy, R);
  const envoyDest = envoy.dest ? centre(envoy.dest, R) : null;
  const selAt = centre(selected, R);
  const targetAt = target ? centre(target, R) : null;

  return (
    <div ref={wrap} className="map-view" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerLeave={endDrag}
      onClickCapture={(e) => { if (drag.current?.moved) { e.stopPropagation(); drag.current = null; } }}
      onKeyDown={(e) => { if (e.key === '+' || e.key === '=') zoomBy(1.25); else if (e.key === '-') zoomBy(0.8); }}
      style={{ cursor: fitsAll ? undefined : 'grab' }}>
    <svg ref={ref} className="world" viewBox={`${v.x - size.w / 2 / v.z} ${v.y - size.h / 2 / v.z} ${size.w / v.z || 1} ${size.h / v.z || 1}`} role="group" aria-label="World map. Drag to move around; scroll or use the plus and minus keys to zoom.">
      {state.hexes.map((h) => {
        const { x, y } = centre(h, R);
        const n = h.owner ? state.nations[h.owner] : null;
        const capital = !!n && h.capitalOf === h.owner;
        const fill = h.terrain === 'sea' ? '#131C27' : n ? n.color : '#232B35';
        const opacity = !n ? 1 : capital ? 1 : h.owner === player ? 0.8 : 0.58;
        const hl = highlights.get(key(h));
        const isSel = h.c === selected.c && h.r === selected.r;
        const ink = n ? 'rgba(14,18,23,0.6)' : 'rgba(154,164,177,0.45)';
        const army = state.armies.find((a) => a.c === h.c && a.r === h.r);
        return (
          <g key={key(h)} className="hex" role="button" tabIndex={isSel ? 0 : -1} data-hex={key(h)}
            aria-label={hexLabel(state, me, h, hl?.kind)} aria-pressed={isSel}
            onClick={() => onPick(h)} onKeyDown={(e) => onKey(e, h)}>
            <polygon points={corners(x, y, R - 1.5)} fill="#0B0F14" />
            <polygon className="fill" points={corners(x, y, R - 1.5)} fill={fill} fillOpacity={opacity} />
            {capital ? (
              <path d={STAR} transform={`translate(${x - 8} ${y - 30}) scale(0.66)`} fill="#0E1217" />
            ) : (
              <path d={TERRAIN_MARKS[h.terrain]} transform={`translate(${x - 9} ${y - 31}) scale(0.75)`} fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            )}
            {h.buildings.map((b, i) => (
              <SpriteG key={i} id={b.turnsLeft > 0 ? 'site' : b.type} x={x + (i === 0 ? -14 : 14)} y={y + 29} scale={0.3} />
            ))}
            {army && (
              <g>
                <rect x={x - 13} y={y - 12} width="26" height="20" rx="5" fill="#0E1217" stroke={state.nations[army.owner].color} strokeWidth="2.5" />
                <path d="M-7 -4l3 3M-7 -1l3-3" transform={`translate(${x} ${y})`} stroke="#ECE9E2" strokeWidth="1.6" strokeLinecap="round" />
                <text x={x + 5} y={y + 3} textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontSize="12" fontWeight="600" fill="#ECE9E2">{armySize(army.units)}</text>
              </g>
            )}
            {hl && hl.kind === 'move' && <circle cx={x} cy={y + 17} r="3.5" fill="#0E1217" stroke="#FFFFFF" strokeWidth="1.5" />}
            {hl && hl.kind !== 'move' && <polygon points={corners(x, y, R - 4.5)} fill={hl.kind === 'attack' ? 'rgba(255,138,107,0.22)' : 'rgba(127,209,168,0.14)'} stroke={HIGHLIGHT[hl.kind].stroke} strokeWidth="3" strokeDasharray={HIGHLIGHT[hl.kind].dash} strokeLinejoin="round" />}
          </g>
        );
      })}

      <g aria-hidden="true" pointerEvents="none">
        {targetAt && <line x1={selAt.x} y1={selAt.y} x2={targetAt.x} y2={targetAt.y} stroke="#ECE9E2" strokeWidth="2.5" strokeLinecap="round" />}
        {targetAt && <polygon points={corners(targetAt.x, targetAt.y, R - 1)} fill="none" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="6 4" />}
        <polygon points={corners(selAt.x, selAt.y, R - 1)} fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinejoin="round" />
        {envoyDest && <line x1={envoyAt.x + 20} y1={envoyAt.y - 14} x2={envoyDest.x} y2={envoyDest.y} stroke="#ECE9E2" strokeWidth="2" strokeDasharray="4 6" strokeLinecap="round" />}
        <g transform={`translate(${envoyAt.x + 20} ${envoyAt.y - 14})`}>
          <circle r="10" fill="#ECE9E2" stroke="#0E1217" strokeWidth="2.5" />
          <path d="M-3.5 6V-5.5M-3.5 -5.5h8l-1.6 3 1.6 3h-8" fill="none" stroke="#0E1217" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        </g>
        {state.order.filter((id) => state.nations[id].alive).map((id) => {
          const n = state.nations[id];
          const p = centre(n.capital, R);
          const w = n.short.length * 8 + 16;
          return (
            <g key={id} transform={`translate(${p.x} ${p.y + R - 4})`}>
              <rect x={-w / 2} y="0" width={w} height="18" rx="4" fill="rgba(14,18,23,0.9)" />
              <text y="13" textAnchor="middle" fontFamily="'Space Grotesk', sans-serif" fontWeight="700" fontSize="11" letterSpacing="0.7" fill={n.color}>{n.short.toUpperCase()}</text>
            </g>
          );
        })}
      </g>
    </svg>

      <div className="map-controls" role="group" aria-label="Map view">
        <button type="button" aria-label="Zoom out" disabled={fitsAll} onClick={() => zoomBy(0.8)}><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></button>
        <button type="button" aria-label="Zoom in" disabled={v.z >= MAX_ZOOM} onClick={() => zoomBy(1.25)}><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></button>
        <button type="button" aria-label="Show the whole world" disabled={fitsAll} onClick={() => setView(clampView({ z: fit, x: width / 2, y: height / 2 }))}><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        <button type="button" aria-label="Go to your capital" onClick={() => { onPick(state.nations[me].capital); setView(clampView({ z: Math.max(v.z, MIN_READABLE), x: home.x, y: home.y })); }}><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d={STAR} fill="currentColor" /></svg></button>
      </div>

      {!fitsAll && (
        <svg className="minimap" viewBox={`0 0 ${width} ${height}`} width={MINI} height={(MINI * height) / width} role="img" aria-label="Overview of the whole world. Click to move the view."
          onClick={(e) => { const b = e.currentTarget.getBoundingClientRect(); setView(clampView({ z: v.z, x: ((e.clientX - b.left) / b.width) * width, y: ((e.clientY - b.top) / b.height) * height })); }}>
          {state.hexes.map((h) => {
            const p = centre(h, R);
            return <circle key={key(h)} cx={p.x} cy={p.y} r={R * 0.92} fill={h.terrain === 'sea' ? '#131C27' : h.owner ? state.nations[h.owner].color : '#2C3642'} />;
          })}
          <rect x={v.x - size.w / 2 / v.z} y={v.y - size.h / 2 / v.z} width={size.w / v.z} height={size.h / v.z} fill="rgba(255,255,255,0.08)" stroke="#FFFFFF" strokeWidth={width / MINI * 1.5} />
        </svg>
      )}
    </div>
  );
}
