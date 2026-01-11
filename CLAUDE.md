# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mari is a minimalist Time Tracker app for macOS built with Electron, React, TypeScript, and Tailwind CSS. The app runs primarily as a menubar/system tray application (without a dock icon).

## Development Commands

### Package Manager

This project uses `pnpm` as its package manager.

```bash
# Install dependencies
pnpm install

# Development mode with hot reload
pnpm dev

# Type checking
pnpm typecheck              # Check both node and web
pnpm typecheck:node         # Main/preload processes only
pnpm typecheck:web          # Renderer process only

# Linting and formatting
pnpm lint
pnpm format

# Building
pnpm build                  # Type check + build
pnpm build:mac             # Build for macOS
pnpm build:win             # Build for Windows
pnpm build:linux           # Build for Linux
pnpm build:unpack          # Build without packaging (for testing)
```

## Architecture

### Three-Process Model

Electron apps use a multi-process architecture. This project follows the standard pattern:

1. **Main Process** (`src/main/`)
   - Entry point: `src/main/index.ts`
   - Controls app lifecycle, creates windows, manages system tray
   - Handles IPC communication with renderer processes
   - Has access to all Node.js and Electron APIs

2. **Preload Scripts** (`src/preload/`)
   - Bridge between main and renderer processes
   - Exposes limited APIs to renderer via `contextBridge`
   - Security layer that prevents direct Node.js access from renderer

3. **Renderer Process** (`src/renderer/src/`)
   - React application that runs in browser windows
   - Uses web technologies (HTML/CSS/JS)
   - Communicates with main process via exposed APIs

### Tray-Based Application Pattern

This app is **tray-only** (no main window by default):

- Main window creation is commented out in `src/main/index.ts:167`
- Dock icon is hidden on macOS (`app.dock.hide()`)
- App stays running when all windows close
- Clicking the tray icon shows a small popup window positioned near the tray

### Window Routing Pattern

The app uses a single HTML file with query parameter routing:

- Normal window: `index.html` → renders `App` component
- Tray window: `index.html?tray=true` → renders `TrayWindow` component
- Routing logic: `src/renderer/src/main.tsx` checks `URLSearchParams`

### IPC Communication

Current IPC channels:

- `ping`: Test channel (renderer → main)
- `tray-window-hide`: Closes tray window (exposed as `window.api.hideTrayWindow()`)

To add new IPC:

1. Add handler in `src/main/index.ts` (use `ipcMain.on()` or `ipcMain.handle()`)
2. Expose function in `src/preload/index.ts` via `api` object
3. Update types in `src/preload/index.d.ts`

### UI Components

Uses shadcn/ui component system:

- Config: `components.json` with "new-york" style
- Components installed in `src/renderer/src/components/ui/`
- Utility function `cn()` in `src/renderer/src/lib/utils.ts` for className merging
- Uses Radix UI primitives + Tailwind CSS v4 + Lucide icons
- Install new components from shadcn/ui as needed

### Path Aliases

TypeScript/Vite aliases configured:

- `@renderer/*` → `src/renderer/src/*`
- Components: `@renderer/components`
- Utils: `@renderer/lib/utils`
- UI: `@renderer/components/ui`

## Build Configuration

- **Bundler**: electron-vite (Vite for all three processes)
- **React**: Vite React plugin with JSX runtime
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite` plugin
- **Builder**: electron-builder for packaging

## Styling

- Tailwind CSS v4 with CSS variables for theming
- Global styles: `src/renderer/src/styles/globals.css`
- Base color: neutral
- Uses `@tailwindcss/vite` plugin (not PostCSS)

## Database

`better-sqlite3` is installed but not yet integrated into the codebase. When implementing database features:

- Initialize in main process (Node.js context)
- Expose database operations via IPC handlers
- Store database file in `app.getPath('userData')`

## Resources

Icon files in `resources/`:

- `icon.png`: Default app icon
- `binto.png`: Custom tray icon (22x22 on macOS, 16x16 elsewhere)

Icon loading logic includes fallback from PNG to default icon if the file is missing or empty.
