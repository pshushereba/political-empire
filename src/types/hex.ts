import { Hex } from "honeycomb-grid";

export enum TileType {
  PLAINS = "PLAINS",
  FOREST = "FOREST",
  MOUNTAINS = "MOUNTAINS",
  RIVER = "RIVER",
  HILLS = "HILLS",
  DESERT = "DESERT",
  COAST = "COAST",
  LAKE = "LAKE",
}

export interface TileResource {
  food: number;
  wood: number;
  stone: number;
  metal: number;
  gold: number;
}

export interface HexTile extends Hex {
  id: string;
  type: TileType;
  resources: TileResource;
  ownerId: string | null;
  buildingId: string | null;
  castleId: string | null;
  isVisible: boolean;
}

export interface Castle {
  id: string;
  ownerId: string;
  position: { q: number; r: number };
  level: number;
  defenseRating: number;
  name: string;
}

export interface MapOptions {
  width: number;
  height: number;
  seed?: number;
  waterRatio?: number;
  mountainRatio?: number;
  forestRatio?: number;
}

export interface VisualHexOptions {
  size: number;
  origin: { x: number; y: number };
  selected: boolean;
  hovered: boolean;
}
