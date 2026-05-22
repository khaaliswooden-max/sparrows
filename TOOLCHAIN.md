# Sparrows Phaser 4 Toolchain

This document covers the full asset and development pipeline for future Phaser 4 seasons.
Seasons 1–8 are complete standalone vanilla JS builds and do not use this pipeline.

---

## Overview

```
Aseprite (.aseprite) → Export → PNG + JSON atlas → Phaser 4 atlas loader
Tiled    (.tmx/.tsj) → Export → JSON tilemap    → Phaser 4 tilemap loader
Phaser 4 EraConfig   → era-appropriate retro camera filters (Quantize, Vignette, Glow…)
GB Studio (Season 1 only) → .gb ROM + WASM web player
```

---

## 1. Aseprite Workflow

### Install
Purchase at [aseprite.org](https://www.aseprite.org) (Steam or direct).

### Draw sprites at native resolution
Match the era from `shared/phaser/EraConfigs.js`:

| Era | Tile/sprite size |
|-----|------------------|
| atari2600 | 8×8 px |
| nes | 8×8 or 8×16 px |
| snes | 16×16 px |
| ps1 + later | 16×16 to 32×32 px |

### Restrict palette
1. **Sprite → Color Mode → Indexed**
2. Load the era palette (for Atari, use the 128-color NTSC array in `1977/src/config.js`)
3. Draw only using palette colors — Phaser’s Quantize filter enforces this visually at runtime

### Export as spritesheet + JSON atlas
1. **File → Export Sprite Sheet**
2. Sheet type: **Packed** (space-efficient) or **Horizontal Strip** (predictable)
3. JSON data: **Array** format (works with `generateFrameNames`)
4. Output filenames: `spritesheet.png` + `spritesheet.json`
5. Place in `seasons/your-season/assets/sprites/`

### Load in Phaser
```js
// Preload.js
this.load.atlas('sprites', 'assets/sprites/spritesheet.png', 'assets/sprites/spritesheet.json');

// GameScene.js create()
this.anims.create({
  key: 'walk',
  frames: this.anims.generateFrameNames('sprites', { prefix: 'player_walk_', start: 0, end: 7 }),
  frameRate: 8,
  repeat: -1,
});
const player = this.add.sprite(x, y, 'sprites', 'player_idle_0');
player.play('walk');
```

### CLI batch export (for automation)
```bash
aseprite -b input.aseprite --sheet output.png --data output.json --format json-array
```

### Source control
Commit both the `.aseprite` source files AND the PNG/JSON exports. Source files are small and prevent permanent asset loss.

---

## 2. Tiled Workflow

### Install
Download free at [mapeditor.org](https://www.mapeditor.org).

### Create a new map
1. **Map → New Map**
2. Orientation: **Orthogonal**
3. Tile size: match your sprite tile size (e.g., 16×16 for NES)
4. Map size in tiles (e.g., 16×14 tiles × 16px = 256×224 = full NES canvas)

### Tilesets
- Use **external tileset** (`.tsj` file) for sharing across multiple maps
- Import your Aseprite spritesheet PNG as the tileset image

### Layers
Create these layers (names must match exactly for Phaser loaders to work):

| Layer | Type | Purpose |
|-------|------|---------|
| `Ground` | Tile | Terrain, floors, background tiles |
| `Colliders` | Tile | Physics-enabled tiles (set tile property `collides: true`) |
| `Objects` | Object | Spawn points, triggers, item locations |
| `Foreground` | Tile | Tiles drawn in front of the player |

### Set collision via tile properties
1. Select a tile in the tileset panel
2. **Tileset → Tile Properties** → add: `collides` = `true` (boolean)
3. In Phaser: `layer.setCollisionByProperty({ collides: true })`

### Export
1. **File → Export As** → choose **JSON map files (*.json)**
2. **Not** TMX — Phaser reads Tiled JSON natively
3. Save to `seasons/your-season/assets/tilemaps/level1.json`

### Load in Phaser
```js
// Preload.js
this.load.tilemapTiledJSON('level1', 'assets/tilemaps/level1.json');
this.load.image('tileset', 'assets/tilesets/tiles.png');

// GameScene.js create()
const map = this.make.tilemap({ key: 'level1' });
const tileset = map.addTilesetImage('tileset-name-in-tiled', 'tileset');
const ground    = map.createLayer('Ground',    tileset, 0, 0);
const colliders = map.createLayer('Colliders', tileset, 0, 0);
colliders.setCollisionByProperty({ collides: true });

// Object layer spawn points
const objects = map.getObjectLayer('Objects').objects;
const spawnPoint = objects.find(o => o.name === 'PlayerSpawn');
```

---

## 3. Phaser 4 Filter Reference

Filters are applied to `this.cameras.main` via `camera.filters.internal` (pre-render) or `camera.filters.external` (post-render). `BaseScene.create()` applies the full filter stack from the era’s `EraConfig.filters` automatically.

**Important:** filters are per-scene-camera and must be re-applied in each scene’s `create()`. `super.create()` in BaseScene handles this.

### Built-in filters used by EraConfigs

| Filter | List | Key params | Seasons |
|--------|------|------------|--------|
| `addBlocky` | internal | `size` | Retro eras (1–4) |
| `addQuantize` | external | `steps[R,G,B,A]`, `dither`, `mode` | Seasons 1–4 |
| `addVignette` | external | `radius`, `strength`, `color` | All seasons |
| `addGlow` | external | `color`, `strength`, `outerStrength` | Seasons 6–8 |
| `addGradientMap` | external | `ramp { colorStart, colorEnd }` | Optional |

### Manual filter usage
```js
const cam = this.cameras.main;

// Pre-render: group pixels into blocky chunks
cam.filters.internal.addBlocky({ size: 2 });

// Post-render: crush color depth (simulates Atari/NES palettes)
cam.filters.external.addQuantize({ steps: [8, 8, 8, 8], dither: false, mode: 0 });

// Post-render: screen edge darkening
cam.filters.external.addVignette({ radius: 0.75, strength: 0.35, color: 0x000000 });

// Post-render: bloom/glow (modern eras)
cam.filters.external.addGlow({ color: 0x4466aa, strength: 0.15, outerStrength: 0.08 });
```

### Helper functions (RetroFilters.js)
```js
import { applyRetroFilters, clearRetroFilters, applyCRTApproximation } from '@shared/phaser/RetroFilters.js';

// Apply all filters from an EraConfig.filters descriptor
applyRetroFilters(camera, ERA.filters);

// Clear all filters (e.g., for a cutscene with no post-processing)
clearRetroFilters(camera);

// Quick CRT look without a full EraConfig
applyCRTApproximation(camera, 0.3); // 0–1 intensity
```

---

## 4. Adding a New Season

```bash
# 1. Copy the template
cp -r seasons/season-phaser-template seasons/season9-xxx

# 2. Edit the era config
# In seasons/season9-xxx/src/config.js:
#   export const ERA_KEY = 'currentGen';   (or whichever era)

# 3. Register in vite.config.js (root)
# In rollupOptions.input add:
#   season9: resolve(__dirname, 'seasons/season9-xxx/index.html')

# 4. Add a dev script to package.json (root)
#   "dev:season9": "vite seasons/season9-xxx"

# 5. Build assets
# assets/sprites/   ← Aseprite PNG + JSON exports
# assets/tilemaps/  ← Tiled JSON exports
# assets/audio/     ← .ogg + .mp3 pairs

# 6. Link from hub (no build step needed)
# Add a card to the root index.html pointing to seasons/season9-xxx/index.html
```

---

## 5. GB Studio (Season 1 / 1977 repo only)

See [`gb-studio/README.md`](https://github.com/khaaliswooden-max/1977/blob/claude/integrate-phaser-4-Cjt0p/gb-studio/README.md) in the `1977` repo for the full ROM + WASM web export workflow.

Key facts:
- GB Studio 4.x → real `.gb` ROM + WASM web player
- Resolution 160×144 (Game Boy) maps naturally to Atari 160×120 (just 24px taller)
- Sprites must be 4-shade greyscale PNG (Aseprite Indexed mode, 4 colors)
- Tiled maps cannot be imported into GB Studio — recreate manually in its visual scene editor
