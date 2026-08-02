# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

iStudio is a web-based 3D/2D game engine and visual editor built on three.js. It supports VR/AR via WebXR, runs in browsers, and can be packaged as desktop apps (NW.js) or mobile apps (Cordova).

## Build & Development Commands

```bash
# Development server (hot reload, http://localhost:8080)
npm start

# Build everything (runtime + editor)
npm run build

# Build individual targets
npm run build-runtime    # core engine → dist/istudio.min.js (UMD) + istudio.module.min.js (ES)
npm run build-editor     # visual editor → docs/editor/ (also refreshes vendor + runtime)
npm run build-nwjs       # Desktop apps (all platforms)

# Linting
npm run lint             # ESLint on source/editor and source/core
npm run lint-fix         # Auto-fix

# Documentation
npm run docs             # YUIDoc → docs/docs/

# Desktop development
npm run start-nwjs       # Run in NW.js
```

## Architecture

### Source Layout

- **`source/core/`** — Runtime engine (~159 files). Entry: `Main.js`. Key classes: `App` (runtime controller), `Program` (project root/resource manager), `Scene` (scene graph).
- **`source/editor/`** — Visual editor (~248 files). Entry: `Main.js`. Key classes: `Editor` (main controller), `Interface` (GUI), `Settings` (preferences).
- **`source/files/`** — Static assets (icons, defaults, textures, WASM modules, Tern definitions).

### Core Engine Modules (`source/core/`)

| Module | Purpose |
|--------|---------|
| `objects/` | Scene graph nodes: cameras, lights, mesh, audio, physics, scripts, UI, particles, spine |
| `input/` | Keyboard, Mouse, Gamepad, Gyroscope handlers |
| `loaders/` | Asset loaders (fonts, images, video, audio, materials, geometry, objects) |
| `resources/` | Resource management (Font, Video, Audio, Image, Model, TextFile) |
| `texture/` | Texture types: Canvas, Video, Webcam, Cube, Data, Compressed, SpriteSheet |
| `postprocessing/` | Effect composer + passes (FXAA, SSAO, Bloom, Bokeh, etc.) with GLSL shaders |
| `renderer/` | Renderer config, CSS3D renderer |
| `xr/` | VR/AR handlers (WebXR) |
| `three/` | three.js extensions and serialization patches |

### Editor Architecture (`source/editor/`)

| Module | Purpose |
|--------|---------|
| `gui/tab/` | 17 tab types: scene-editor, code, inspector, material, texture, animation, console, etc. |
| `gui/preview/` | Asset preview renderers |
| `gui/form-snippet/` | Reusable form components for inspector panels |
| `history/action/` | Undo/redo actions for objects and resources |
| `components/` | Base UI components (Canvas, Division, TableForm) |
| `locale/` | Internationalization |

### Vite Configs

- `vite.config.mjs` — Editor SPA (dev server on port 8080 + production build → `docs/editor/`). Entry: `source/editor/index.html`. Build output uses a relative base so it works at NW.js `file://`, subpaths, and domain root.
- `vite.config.runtime.mjs` — Runtime engine as a UMD library (`dist/istudio.min.js`, global `IStudio`) + ES module (`dist/istudio.module.min.js`). Entry: `source/core/Main.js`.
- `vite.shared.mjs` — Shared plugins and aliases used by both configs: `injectThree` (auto-imports `THREE` into source files that reference it, replacing webpack's ProvidePlugin), `injectGlobals` (build-time `VERSION`/`TIMESTAMP`/`DEVELOPMENT`/git info, scoped to source files), `glslRaw` (`.glsl` → raw string), `brythonGlobalShim`/`brythonUmdWrap` (brython handling), and `copyStatic` (copies `source/files/` → `files/`).
- `scripts/build-vendor.js` — Concatenates vendored libraries (CodeMirror, Tern, acorn, JSHint, draco_encoder, brython) into `public/vendor/` as classic `<script>` globals; re-run after bumping those deps.
- `scripts/sync-runtime.js` — After `build-runtime`, copies `dist/istudio.min.js` into `docs/editor/files/runtime/` and the root `package.json` into `docs/editor/` (the NW.js app manifest).

### Key Patterns

- **Serialization**: Projects saved as `.nsp` (PSON binary) or `.isp` (JSON). Objects referenced by UUID.
- **Resource Management**: `ResourceManager` base class with `ResourceContainer` for asset storage and lifecycle.
- **History System**: Action-based undo/redo (`ActionBundle` for grouped operations).
- **Platform Abstraction**: `FileSystem.js` abstracts I/O across NW.js, browser, and Cordova.
- **Event/Lifecycle**: Objects have `initialize()`, `update()`, `render()`, `dispose()` hooks.

## Code Style

Defined in `CODESTYLE.md`. Key rules:

- **Indentation**: Tabs
- **ES5 patterns**: Use `function` keyword and prototype-based inheritance — no ES6 classes or arrow functions
- **Naming**: PascalCase (classes/files), camelCase (variables/functions), SCREAMING_CAPS (constants)
- **Documentation**: JSDoc format required for public APIs
- **Semicolons**: Always required
- **Brackets**: Always use curly braces, same line as statement

## Key Dependencies

- **three.js** v0.170.0 — 3D rendering
- **cannon-es** — Physics
- **CodeMirror** v5.64 — In-editor code editing with Tern autocomplete
- **spine** — 2D skeletal animation
- **brython** — Python scripting support in runtime
- **jszip** — Project file compression

## Testing

No formal test suite exists. Quality is maintained through ESLint (CI via GitHub Actions) and manual testing via the editor's runtime preview tab.
