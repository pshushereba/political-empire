# Hexagonal Map and Resource System

## Map Structure

### Hex Grid System

- The game world is divided into hexagonal tiles forming a grid
- Each hex has 6 neighbors (except at map edges)
- Hex coordinates use the "axial" coordinate system (q,r)
- Map size is configurable but defaults to medium (e.g., 50x50 hexes)

### Tile Types

- **Plains**: Basic fertile land, good for agriculture
- **Forest**: Provides wood resources and hunting
- **Mountains**: Provides stone and metals, difficult to traverse
- **Rivers**: Fresh water, trade routes, fisheries
- **Hills**: Defensive advantage, moderate resources
- **Desert**: Low resources, difficult for agriculture
- **Coast**: Access to sea trade, fishing
- **Lakes**: Fresh water, fishing

### Map Generation

- Procedural generation using noise algorithms
- Configurable parameters (resources, water coverage, etc.)
- Resource distribution based on realistic geography
- Natural barriers (mountains, rivers) create strategic regions

## Castle and Building System

### Castle Components

```typescript
interface Castle {
  id: string;
  ownerId: string;
  position: { q: number; r: number };
  level: number;
  buildings: Building[];
  defenseRating: number;
  populationCapacity: number;
  resourceStorage: Resources;
}

interface Building {
  id: string;
  type: BuildingType;
  level: number;
  productionBonus: Partial<Resources>;
  specialEffects: Effect[];
}
```

### Building Types

- **Keep**: Central castle structure, determines overall level
- **Walls**: Increases defense rating
- **Barracks**: Military training and housing
- **Farms**: Food production
- **Mines**: Mineral extraction
- **Workshops**: Manufacturing goods
- **Market**: Trade and economy
- **University**: Research and technology
- **Temple**: Cultural and religious center
- **Housing**: Population capacity

### Construction System

- Buildings require resources (wood, stone, metal)
- Construction takes time (turns/days)
- Upgrades enhance building effectiveness
- Buildings can be damaged during attacks
- Repairs require fewer resources than initial construction

## Resource System

### Base Resources

```typescript
interface Resources {
  food: number;
  wood: number;
  stone: number;
  metal: number;
  gold: number;
  population: number;
  influence: number;
}
```

### Resource Generation

- Each tile produces base resources based on type
- Buildings enhance resource production
- Population consumes food and produces labor
- Seasons affect resource production rates
- Political decisions can modify resource yields

### Resource Management

- Resources stored in castles have maximum capacity
- Excess resources may be wasted if storage is full
- Trade allows exchange of resources between players
- Resource shortages create penalties (starvation, unhappiness)
- Balanced resource management is key to growth

## Military and Combat

### Army Units

```typescript
interface Army {
  id: string;
  ownerId: string;
  position: { q: number; r: number };
  units: Unit[];
  morale: number;
  experience: number;
}

interface Unit {
  type: UnitType;
  count: number;
  equipment: EquipmentLevel;
  experience: number;
}
```

### Unit Types

- **Infantry**: Basic foot soldiers
- **Cavalry**: Fast-moving mounted units
- **Archers**: Ranged attackers
- **Siege**: Specialized for attacking castles
- **Special**: Elite or unique units based on political system

### Combat Resolution

- Combat considers unit types, numbers, and terrain
- Defender advantage on certain terrain types
- Castle defense bonuses
- Morale and experience factors
- Political system affects combat effectiveness

### Territory Control

- Conquering a castle grants control of surrounding tiles
- Resource-producing tiles contribute to the controlling castle
- Border regions may be contested
- Natural borders (rivers, mountains) affect control zones

## Map Navigation

### Player Movement

- Players can navigate the map by scrolling/dragging
- Zoom in/out functionality
- Mini-map for overall orientation
- Fog of war hides unexplored areas

### Unit Movement

- Units move along hex paths
- Movement costs vary by terrain type
- Rivers and mountains create natural barriers
- Roads can be built to improve movement
- Friendly/enemy territory affects movement speed

## Implementation Considerations

### Frontend Rendering

- Canvas-based rendering for efficiency
- Tile sprites for different terrain types
- Building and unit sprites
- Visual effects for actions (construction, combat)
- Layer system for map elements

### Data Structure

- Efficient hex grid storage
- Spatial indexing for quick neighbor lookups
- Chunk-based loading for large maps
- Optimized path-finding algorithms

### Multiplayer Aspects

- Synchronized map state between players
- Visibility rules (fog of war)
- Territory control visualization
- Real-time updates for player actions
