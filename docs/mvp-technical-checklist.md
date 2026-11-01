# MVP Technical Checklist

This document provides a technical checklist for the first 5 days of implementing the Political Empire game MVP.

## Day 1: Project Setup & Environment

### Project Initialization

- [ ] Set up Next.js project with TypeScript
  ```bash
  npx create-next-app political-empire --typescript
  ```
- [ ] Install Tailwind CSS for styling
  ```bash
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p
  ```
- [ ] Configure ESLint and Prettier
- [ ] Create basic directory structure:
  ```
  /src
    /app
      /api
      /components
      /game
      /auth
    /lib
    /hooks
    /styles
    /types
    /utils
  ```

### Database Setup with Supabase

- [ ] Create a Supabase account and project
- [ ] Install Supabase client library
  ```bash
  npm install @supabase/supabase-js
  ```
- [ ] Configure Supabase connection in `.env.local`
  ```
  NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
  SUPABASE_SERVICE_KEY=your-supabase-service-key
  ```
- [ ] Create Supabase client utility

  ```typescript
  // lib/supabase.ts
  import { createClient } from "@supabase/supabase-js";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

  export const supabase = createClient(supabaseUrl, supabaseAnonKey);
  ```

- [ ] Set up database tables in Supabase dashboard based on schema design
- [ ] Configure row-level security policies

### Authentication

- [ ] Use Supabase Auth for authentication
  ```bash
  npm install @supabase/auth-helpers-nextjs @supabase/auth-helpers-react
  ```
- [ ] Set up auth API routes
- [ ] Create login/signup components
- [ ] Configure social login providers if needed

## Day 2: Core Game State & PixiJS Setup

### PixiJS Rendering

- [ ] Install PixiJS and React integration
  ```bash
  npm install pixi.js @pixi/react honeycomb-grid
  ```
- [ ] Create basic PixiJS component for hexagonal grid
- [ ] Implement hex grid rendering function
- [ ] Add pan and zoom functionality
- [ ] Create tile selection and highlighting

### Game State Management

- [ ] Install Zustand
  ```bash
  npm install zustand
  ```
- [ ] Create core game state store:
  ```typescript
  // Example structure
  interface GameState {
    map: HexTile[];
    selectedTile: HexTile | null;
    resources: Resources;
    politicalIdeology: PoliticalIdeology;
    // Other state
  }
  ```
- [ ] Connect PixiJS component to game state
- [ ] Create map generation utility for testing

### API Routes

- [ ] Create Supabase hooks for game data access
- [ ] Create functions for game creation/listing
- [ ] Implement basic error handling

## Day 3: Map Generation & Navigation

### Map Generation

- [ ] Implement procedural map generation with different terrain types
- [ ] Create tile type definitions with resource yields
- [ ] Add map options/parameters to affect generation
- [ ] Store generated map in Supabase

### Map Interaction

- [ ] Implement map navigation controls in PixiJS
- [ ] Add tile information display
- [ ] Create minimap component
- [ ] Add basic fog of war concept

### UI Framework

- [ ] Create reusable UI components (buttons, panels, cards)
- [ ] Design game interface layout
- [ ] Implement responsive design for different screen sizes
- [ ] Add basic game status indicators

## Day 4: Political System & Resources

### Political System

- [ ] Implement the three-axis political spectrum
- [ ] Create political ideology visualization
- [ ] Add regime type determination
- [ ] Create political effects system

### Political Decisions

- [ ] Create decision system framework
- [ ] Implement 5-8 sample decisions from `docs/sample-political-decisions.md`
- [ ] Design decision UI component
- [ ] Connect decisions to political ideology shifts

### Resource Management

- [ ] Implement basic resource types (food, wood, stone, gold, etc.)
- [ ] Create resource production logic
- [ ] Build resource display UI
- [ ] Add resource consumption mechanics

## Day 5: Castle Building & Basic Military

### Castle Construction

- [ ] Implement castle placement on map
- [ ] Create basic castle model with PixiJS
- [ ] Add building construction interface
- [ ] Implement resource costs for buildings

### Building Types

- [ ] Create 3-5 basic building types
- [ ] Implement building effects on resources
- [ ] Add building upgrade mechanics
- [ ] Design building UI

### Basic Military

- [ ] Implement simple military unit types
- [ ] Create unit training interface
- [ ] Add basic army movement on map
- [ ] Implement army visualization with PixiJS

## Technical Considerations

### Performance Optimization

- [ ] Use React.memo for expensive components
- [ ] Implement PixiJS layer system for efficient rendering
- [ ] Optimize Supabase queries using indexes
- [ ] Consider using Web Workers for pathfinding/AI

### State Management Best Practices

- [ ] Keep Zustand stores modular and focused
- [ ] Use selectors to prevent unnecessary re-renders
- [ ] Implement proper state persistence with Supabase
- [ ] Add devtools for state debugging

### Testing Approach

- [ ] Create basic component tests
- [ ] Test Supabase operations
- [ ] Implement API endpoint tests
- [ ] Set up continuous integration

### Deployment Preparation

- [ ] Set up environment configuration
- [ ] Optimize Supabase connection for production
- [ ] Implement proper error logging
- [ ] Create build and deployment scripts

## Next Steps (Day 6+)

- Implement basic combat system
- Create multiplayer synchronization with Supabase Realtime
- Add chat functionality
- Polish UI and fix critical bugs
