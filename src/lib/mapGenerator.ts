import { defineHex, Grid, rectangle } from "honeycomb-grid";
import { HexTile, MapOptions, TileResource, TileType } from "../types/hex";

// Define our hex factory
const HexFactory = defineHex({
  dimensions: { width: 60, height: 52 },
  origin: "topLeft",
});

// Simple deterministic seeded random function
const seededRandom = (seed: number) => {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
};

// Generate resource values based on tile type
const generateResources = (
  type: TileType,
  random: () => number
): TileResource => {
  const baseValues: Record<TileType, TileResource> = {
    [TileType.PLAINS]: { food: 5, wood: 1, stone: 0, metal: 0, gold: 0 },
    [TileType.FOREST]: { food: 2, wood: 5, stone: 0, metal: 0, gold: 1 },
    [TileType.MOUNTAINS]: { food: 0, wood: 1, stone: 5, metal: 3, gold: 2 },
    [TileType.RIVER]: { food: 3, wood: 1, stone: 0, metal: 0, gold: 1 },
    [TileType.HILLS]: { food: 2, wood: 2, stone: 3, metal: 1, gold: 1 },
    [TileType.DESERT]: { food: 0, wood: 0, stone: 2, metal: 1, gold: 1 },
    [TileType.COAST]: { food: 4, wood: 0, stone: 0, metal: 0, gold: 2 },
    [TileType.LAKE]: { food: 3, wood: 0, stone: 0, metal: 0, gold: 0 },
  };

  // Add some randomization
  const base = baseValues[type];
  return {
    food: Math.max(0, Math.floor(base.food + (random() * 3 - 1))),
    wood: Math.max(0, Math.floor(base.wood + (random() * 3 - 1))),
    stone: Math.max(0, Math.floor(base.stone + (random() * 3 - 1))),
    metal: Math.max(0, Math.floor(base.metal + (random() * 3 - 1))),
    gold: Math.max(0, Math.floor(base.gold + (random() * 2 - 0.5))),
  };
};

// Determine tile type based on position and random factors
const determineTileType = (
  q: number,
  r: number,
  width: number,
  height: number,
  random: () => number,
  options: MapOptions
): TileType => {
  const {
    waterRatio = 0.15,
    mountainRatio = 0.1,
    forestRatio = 0.25,
  } = options;

  // Border tiles have higher chance of being water
  const isBorder = q <= 1 || r <= 1 || q >= width - 2 || r >= height - 2;
  const borderWaterChance = 0.6;

  if (isBorder && random() < borderWaterChance) {
    return random() < 0.7 ? TileType.COAST : TileType.LAKE;
  }

  const rand = random();

  // Determine tile type based on random value and ratios
  if (rand < waterRatio) {
    return random() < 0.7 ? TileType.RIVER : TileType.LAKE;
  } else if (rand < waterRatio + mountainRatio) {
    return random() < 0.7 ? TileType.MOUNTAINS : TileType.HILLS;
  } else if (rand < waterRatio + mountainRatio + forestRatio) {
    return TileType.FOREST;
  } else if (rand < waterRatio + mountainRatio + forestRatio + 0.1) {
    return TileType.DESERT;
  } else {
    return TileType.PLAINS;
  }
};

// Calculate hex center position
const calculateHexCenter = (q: number, r: number): { x: number; y: number } => {
  // Use fixed hex dimensions from our factory
  const width = 60;
  const height = 52;

  // Calculate center based on axial coordinates (q,r)
  const x = q * width * 0.75;
  const y = r * height + (q % 2) * (height / 2);

  return { x, y };
};

// Return an array of HexTile objects and the grid
export const generateMap = (
  options: MapOptions
): {
  tiles: HexTile[];
  grid: Grid<InstanceType<ReturnType<typeof defineHex>>>;
} => {
  const { width, height, seed = Date.now() } = options;
  const random = seededRandom(seed);

  // Create base grid
  const grid = new Grid(HexFactory, rectangle({ width, height }));

  // Transform into our custom HexTile type
  const tiles = grid.toArray().map((hex) => {
    const type = determineTileType(
      hex.q,
      hex.r,
      width,
      height,
      random,
      options
    );

    // Calculate center position
    const center = calculateHexCenter(hex.q, hex.r);

    return {
      ...hex,
      id: `hex_${hex.q}_${hex.r}`,
      type,
      resources: generateResources(type, random),
      ownerId: null,
      buildingId: null,
      castleId: null,
      isVisible: true,
      center, // Add explicit center position
    } as HexTile;
  });

  // Return the array of HexTile objects
  return {
    tiles,
    grid: grid as Grid<InstanceType<ReturnType<typeof defineHex>>>,
  };
};

export { HexFactory };
