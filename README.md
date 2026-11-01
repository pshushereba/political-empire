# Political Empire

A political strategy game where you build your empire and make impactful decisions that shape your society.

Built with [React](https://react.dev), [Vite](https://vite.dev), [TypeScript](https://www.typescriptlang.org), [Tailwind CSS](https://tailwindcss.com), [Zustand](https://zustand.docs.pmnd.rs), and [PixiJS](https://pixijs.com).

## Getting Started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Script              | Description                               |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Start the Vite dev server with HMR        |
| `npm run build`     | Type-check and build for production       |
| `npm run preview`   | Serve the production build locally        |
| `npm run lint`      | Run ESLint                                |
| `npm run typecheck` | Run the TypeScript compiler without emit  |

## Project Structure

```
index.html            Vite entry HTML
src/
  main.tsx            React entry point (mounts <App /> inside a BrowserRouter)
  App.tsx             Route definitions
  pages/              One component per route (HomePage, GamePage)
  components/game/    Game rendering components (canvas hex grid, Pixi stage)
  lib/                Game state (Zustand store) and map generation
  types/              Shared TypeScript types
  styles/globals.css  Tailwind entry point and global styles
docs/                 Design documents and planning notes
```

The `@/` import alias points at `src/`.
