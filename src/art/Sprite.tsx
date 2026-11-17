import { SPRITES, SPRITE_H, SPRITE_W, type SpriteDef } from './sprites';

function Body({ def }: { def: SpriteDef }) {
  if ('image' in def) return <image href={def.image} width={SPRITE_W} height={SPRITE_H} preserveAspectRatio="xMidYMax meet" />;
  return (
    <>
      {def.layers.map((l, i) => (
        <path key={i} d={l.d} fill={l.fill} />
      ))}
    </>
  );
}

/** A sprite as a standalone element, for panels and cards. Decorative: label it nearby. */
export function Sprite({ id, size = 48, dim = false }: { id: string; size?: number; dim?: boolean }) {
  const def = SPRITES[id] ?? SPRITES.lot;
  return (
    <svg width={size} height={(size * SPRITE_H) / SPRITE_W} viewBox={`0 0 ${SPRITE_W} ${SPRITE_H}`} aria-hidden="true" style={{ opacity: dim ? 0.45 : 1, flex: 'none' }}>
      <Body def={def} />
    </svg>
  );
}

/** A sprite inside another SVG (the world map). (x, y) is where its ground-centre sits. */
export function SpriteG({ id, x, y, scale, opacity = 1 }: { id: string; x: number; y: number; scale: number; opacity?: number }) {
  const def = SPRITES[id] ?? SPRITES.lot;
  return (
    <g transform={`translate(${x - (SPRITE_W / 2) * scale} ${y - 86 * scale}) scale(${scale})`} opacity={opacity} aria-hidden="true">
      <Body def={def} />
    </g>
  );
}
