import { create } from "zustand";
import { Grid, defineHex } from "honeycomb-grid";
import { Castle, HexTile, MapOptions, TileType } from "../types/hex";
import { generateMap } from "./mapGenerator";

interface PoliticalIdeology {
  economic: number; // -1 to 1 scale
  authority: number; // -1 to 1 scale
  traditional: number; // -1 to 1 scale
}

interface Resources {
  food: number;
  wood: number;
  stone: number;
  metal: number;
  gold: number;
  population: number;
  influence: number;
}

// Define a basic Decision type to replace any[]
interface Decision {
  id: string;
  text: string;
  effect: Record<string, number>;
  turnTaken: number;
}

interface GameState {
  // Map and tiles
  tiles: HexTile[];
  grid: Grid<InstanceType<ReturnType<typeof defineHex>>> | null;
  selectedTileId: string | null;
  hoveredTileId: string | null;
  mapOptions: MapOptions;
  castles: Castle[];
  viewPosition: { x: number; y: number };
  zoomLevel: number;

  // Player data
  resources: Resources;
  politicalIdeology: PoliticalIdeology;
  decisions: Decision[]; // Replaced any[] with proper type
  turnNumber: number;

  // Actions
  generateNewMap: (options?: Partial<MapOptions>) => void;
  selectTile: (tileId: string | null) => void;
  hoverTile: (tileId: string | null) => void;
  panView: (dx: number, dy: number) => void;
  zoomView: (factor: number) => void;
  placeCastle: (tileId: string, name: string) => void;
}

export const useGameStore = create<GameState>((set, get) => {
  // Default map options
  const defaultMapOptions: MapOptions = {
    width: 15,
    height: 15,
    seed: Date.now(),
    waterRatio: 0.15,
    mountainRatio: 0.1,
    forestRatio: 0.25,
  };

  // Generate initial map
  const { tiles, grid } = generateMap(defaultMapOptions);
  console.log("Initial map generated with", tiles.length, "tiles");

  return {
    // Initial state
    tiles,
    grid,
    selectedTileId: null,
    hoveredTileId: null,
    mapOptions: defaultMapOptions,
    castles: [],
    viewPosition: { x: 0, y: 0 },
    zoomLevel: 1,

    resources: {
      food: 100,
      wood: 100,
      stone: 50,
      metal: 50,
      gold: 200,
      population: 50,
      influence: 10,
    },

    politicalIdeology: {
      economic: 0,
      authority: 0,
      traditional: 0,
    },

    decisions: [],
    turnNumber: 1,

    // Actions
    generateNewMap: (options = {}) => {
      console.log("Generating new map with options:", options);
      const newOptions = { ...get().mapOptions, ...options };
      const { tiles, grid } = generateMap(newOptions);
      console.log("Generated map with", tiles.length, "tiles");

      set({
        tiles,
        grid,
        mapOptions: newOptions,
        selectedTileId: null,
        hoveredTileId: null,
        castles: [],
      });
      console.log("State updated with new map");
    },

    selectTile: (tileId) => {
      set({ selectedTileId: tileId });
    },

    hoverTile: (tileId) => {
      set({ hoveredTileId: tileId });
    },

    panView: (dx, dy) => {
      set((state) => ({
        viewPosition: {
          x: state.viewPosition.x + dx,
          y: state.viewPosition.y + dy,
        },
      }));
    },

    zoomView: (factor) => {
      set((state) => ({
        zoomLevel: Math.max(0.5, Math.min(2, state.zoomLevel * factor)),
      }));
    },

    placeCastle: (tileId, name) => {
      const tile = get().tiles.find((t) => t.id === tileId);
      if (!tile) return;

      // Check if tile is valid for castle placement
      if (
        tile.type === TileType.MOUNTAINS ||
        tile.type === TileType.RIVER ||
        tile.type === TileType.LAKE ||
        tile.type === TileType.COAST
      ) {
        console.error("Cannot place castle on this terrain type");
        return;
      }

      // Check if there's already a castle here
      if (tile.castleId) {
        console.error("There's already a castle on this tile");
        return;
      }

      const castle: Castle = {
        id: `castle_${Date.now()}`,
        ownerId: "player", // Hardcoded for now
        position: { q: tile.q, r: tile.r },
        level: 1,
        defenseRating: 10,
        name,
      };

      // Update the tile with castle reference
      const updatedTiles = get().tiles.map((t) =>
        t.id === tileId ? ({ ...t, castleId: castle.id } as HexTile) : t
      );

      set((state) => ({
        castles: [...state.castles, castle],
        tiles: updatedTiles,
      }));
    },
  };
});
