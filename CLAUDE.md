# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

nunuStudio is a web-based 3D/2D game engine and visual editor built on three.js. It supports VR/AR via WebXR, runs in browsers, and can be packaged as desktop apps (NW.js) or mobile apps (Cordova).

## Build & Development Commands

```bash
# Development server (hot reload)
npm start

# Build everything (runtime + editor + page)
npm run build

# Build individual targets
npm run build-runtime    # core engine → dist/nunu.min.js (UMD)
npm run build-editor     # visual editor → docs/editor/
npm run build-page       # Angular website
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
- **`source/page/`** — Angular 18 website for nunustudio.org.
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

### Webpack Configs

- `webpack.config.js` — Base editor config (entry: `source/editor/Main.js` → `docs/editor/bundle.js`)
- `webpack.dev.js` — Dev mode (source maps, HMR, git info injection)
- `webpack.prod.js` — Production editor (minified, no source maps)
- `webpack.runtime.js` — Standalone runtime library (entry: `source/core/Main.js` → `dist/nunu.min.js`)

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

- **three.js** v0.119.0 — 3D rendering
- **cannon-es** — Physics
- **CodeMirror** v5.64 — In-editor code editing with Tern autocomplete
- **spine** — 2D skeletal animation
- **brython** — Python scripting support in runtime
- **jszip** — Project file compression

## Testing

No formal test suite exists. Quality is maintained through ESLint (CI via GitHub Actions) and manual testing via the editor's runtime preview tab.
