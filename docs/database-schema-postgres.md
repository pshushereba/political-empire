# PostgreSQL Database Schema for Political Empire

## Overview

This document outlines the database schema for the Political Empire game using PostgreSQL with Prisma ORM. The schema is designed to efficiently store game state, player data, and support multiplayer gameplay.

## Schema Design

### Users

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  password      String?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  games         Game[]    @relation("PlayerGames")
  ownedGames    Game[]    @relation("GameOwner")
  empires       Empire[]
  accounts      Account[]
  sessions      Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Game Core

```prisma
model Game {
  id              String        @id @default(cuid())
  name            String
  description     String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  startedAt       DateTime?
  endedAt         DateTime?
  currentTurn     Int           @default(0)
  timeElapsed     Int           @default(0) // In game time units
  status          GameStatus    @default(LOBBY)
  mapId           String        @unique
  ownerId         String
  map             GameMap       @relation(fields: [mapId], references: [id])
  players         User[]        @relation("PlayerGames")
  owner           User          @relation("GameOwner", fields: [ownerId], references: [id])
  empires         Empire[]
  actionHistory   GameAction[]
  worldEvents     WorldEvent[]
  mapSettings     Json          // Configurable map generation parameters
  gameSettings    Json          // Game rules and settings
}

enum GameStatus {
  LOBBY
  ACTIVE
  PAUSED
  COMPLETED
}

model GameMap {
  id            String      @id @default(cuid())
  width         Int
  height        Int
  tiles         Json        // Array of tile data with terrain information
  createdAt     DateTime    @default(now())
  game          Game?
}

model GameAction {
  id            String      @id @default(cuid())
  gameId        String
  empireId      String
  actionType    String      // e.g., "BUILD", "ATTACK", "DECISION"
  actionData    Json        // Details of the action
  createdAt     DateTime    @default(now())
  turnNumber    Int
  processed     Boolean     @default(false)
  result        Json?       // Result of the action
  game          Game        @relation(fields: [gameId], references: [id])
  empire        Empire      @relation(fields: [empireId], references: [id])
}

model WorldEvent {
  id            String      @id @default(cuid())
  gameId        String
  eventType     String
  description   String
  effectData    Json        // Effect on game state
  triggerTurn   Int
  active        Boolean     @default(true)
  createdAt     DateTime    @default(now())
  game          Game        @relation(fields: [gameId], references: [id])
}
```

### Empire and Politics

```prisma
model Empire {
  id                String        @id @default(cuid())
  name              String
  userId            String
  gameId            String
  foundedAt         DateTime      @default(now())
  lastActive        DateTime      @default(now())
  color             String        // Color for map representation
  politicalIdeology PoliticalIdeology?
  resources         Resources?
  actions           GameAction[]
  decisions         Decision[]
  castles           Castle[]
  armies            Army[]
  user              User          @relation(fields: [userId], references: [id])
  game              Game          @relation(fields: [gameId], references: [id])
}

model PoliticalIdeology {
  id                String        @id @default(cuid())
  empireId          String        @unique
  economic          Float         @default(0.0) // -1 to 1 scale
  authority         Float         @default(0.0) // -1 to 1 scale
  traditional       Float         @default(0.0) // -1 to 1 scale
  regime            String?       // Derived regime type
  stabilityScore    Float         @default(0.75) // 0 to 1 scale
  empire            Empire        @relation(fields: [empireId], references: [id])
}

model Resources {
  id                String      @id @default(cuid())
  empireId          String      @unique
  food              Int         @default(100)
  wood              Int         @default(100)
  stone             Int         @default(50)
  metal             Int         @default(50)
  gold              Int         @default(200)
  population        Int         @default(50)
  influence         Int         @default(10)
  lastUpdated       DateTime    @default(now())
  empire            Empire      @relation(fields: [empireId], references: [id])
}

model Decision {
  id                String      @id @default(cuid())
  empireId          String
  decisionKey       String      // Reference to decision templates
  title             String
  description       String
  options           Json        // Available options
  chosenOption      String?     // Selected option ID
  turnTriggered     Int
  turnAnswered      Int?
  effects           Json?       // Resulting effects
  empire            Empire      @relation(fields: [empireId], references: [id])
}
```

### Military and Buildings

```prisma
model Castle {
  id                String      @id @default(cuid())
  empireId          String
  name              String
  position          Json        // {q, r} coordinates
  level             Int         @default(1)
  defenseRating     Int         @default(10)
  populationCapacity Int        @default(100)
  foundedAt         DateTime    @default(now())
  buildings         Building[]
  empire            Empire      @relation(fields: [empireId], references: [id])
}

model Building {
  id                String      @id @default(cuid())
  castleId          String
  type              String      // e.g., "KEEP", "FARM", "BARRACKS"
  level             Int         @default(1)
  constructedAt     DateTime    @default(now())
  upgradedAt        DateTime?
  productionBonus   Json?       // Resource production modifiers
  specialEffects    Json?       // Special building effects
  castle            Castle      @relation(fields: [castleId], references: [id])
}

model Army {
  id                String      @id @default(cuid())
  empireId          String
  name              String
  position          Json        // {q, r} coordinates
  morale            Float       @default(0.75) // 0 to 1 scale
  experience        Int         @default(0)
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  units             Json        // Array of unit types and counts
  empire            Empire      @relation(fields: [empireId], references: [id])
}
```

## Migrations and Deployment

### Initial Migration

1. Set up Prisma with PostgreSQL connection
2. Generate the initial migration
3. Apply the migration to create the schema

```bash
# Example commands
npx prisma migrate dev --name init
```

### Indexes for Performance

Create indexes on frequently queried fields:

```sql
CREATE INDEX idx_game_status ON "Game" (status);
CREATE INDEX idx_empire_game ON "Empire" (gameId);
CREATE INDEX idx_castle_empire ON "Castle" (empireId);
CREATE INDEX idx_army_empire ON "Army" (empireId);
```

## JSON Data Examples

### Tile Data Format

```json
{
  "tiles": [
    {
      "id": "tile_1",
      "q": 0,
      "r": 0,
      "type": "PLAINS",
      "resources": {
        "food": 5,
        "wood": 2
      },
      "ownerId": null,
      "buildingId": null
    }
    // More tiles...
  ]
}
```

### Units Format

```json
{
  "units": [
    {
      "type": "INFANTRY",
      "count": 50,
      "equipment": "BASIC",
      "experience": 5
    },
    {
      "type": "CAVALRY",
      "count": 20,
      "equipment": "STANDARD",
      "experience": 3
    }
  ]
}
```

## Schema Evolution Strategy

As the game develops beyond MVP:

1. Add relations for faction happiness and population demographics
2. Expand the decision system with more complex templates
3. Add diplomatic relations between empires
4. Create trade routes and economic relationships
5. Implement technology and research systems
