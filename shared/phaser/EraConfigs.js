/**
 * EraConfigs.js — Hardware constraint profiles for each Sparrows season era.
 *
 * Each config provides the full Phaser 4 Game init object for that era:
 * resolution, zoom, fps, render settings, Scale Manager config, retro filter
 * descriptors, and arcade physics defaults.
 *
 * Usage:
 *   import { EraConfigs, getEra } from '@shared/phaser/EraConfigs.js';
 *   const era = getEra('nes');
 *   new Phaser.Game({ width: era.width, height: era.height, ... });
 */

// Phaser.Scale numeric constants (avoids importing Phaser into a data module)
// Phaser.Scale.FIT = 1, Phaser.Scale.CENTER_BOTH = 1
const FIT = 1;
const CENTER_BOTH = 1;

const baseScale = (width, height, zoom) => ({
  mode: FIT,
  autoCenter: CENTER_BOTH,
  parent: 'game-container',
  width,
  height,
  zoom,
});

export const EraConfigs = {

  /**
   * Season 1 — Atari 2600 (1977–1983)
   * TIA chip: 160 color clocks × 262 scanlines NTSC. Safe area: 160×120.
   * 128 NTSC colors (16 hues × 8 luminance steps).
   */
  atari2600: {
    era: 'atari2600',
    season: 1,
    label: 'Atari 2600 (1977)',
    width: 160,
    height: 120,
    zoom: 4,
    fps: 60,
    backgroundColor: '#000000',
    renderConfig: { pixelArt: true, antialias: false, roundPixels: true },
    scaleConfig: baseScale(160, 120, 4),
    filters: {
      blocky:   { size: 1 },
      quantize: { steps: [8, 8, 8, 8], dither: false, mode: 0 },
      vignette: { radius: 0.75, strength: 0.35, color: 0x000000 },
    },
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  },

  /**
   * Season 2 — NES / Master System (1985–1992)
   * PPU: 256×240 NES, 224 visible lines. ~52 on-screen colors.
   */
  nes: {
    era: 'nes',
    season: 2,
    label: 'NES / SMS (1985)',
    width: 256,
    height: 224,
    zoom: 3,
    fps: 60,
    backgroundColor: '#000000',
    renderConfig: { pixelArt: true, antialias: false, roundPixels: true },
    scaleConfig: baseScale(256, 224, 3),
    filters: {
      quantize: { steps: [16, 16, 16, 16], dither: false, mode: 0 },
      vignette: { radius: 0.7, strength: 0.25, color: 0x000000 },
    },
    physics: { default: 'arcade', arcade: { gravity: { y: 300 }, debug: false } },
  },

  /**
   * Season 3 — SNES / Genesis (1991–1996)
   * SNES: 256×224 to 512×239. Genesis: 320×224. 32,768 colors (RGB555).
   * Using 320×224 as canonical. smoothPixelArt may suit this era — experiment.
   */
  snes: {
    era: 'snes',
    season: 3,
    label: 'SNES / Genesis (1991)',
    width: 320,
    height: 224,
    zoom: 3,
    fps: 60,
    backgroundColor: '#000000',
    renderConfig: { pixelArt: true, antialias: false, roundPixels: true },
    scaleConfig: baseScale(320, 224, 3),
    filters: {
      quantize: { steps: [32, 32, 32, 32], dither: true, mode: 0 },
      vignette: { radius: 0.65, strength: 0.2, color: 0x000000 },
    },
    physics: { default: 'arcade', arcade: { gravity: { y: 300 }, debug: false } },
  },

  /**
   * Season 4 — PS1 / N64 (1995–2000)
   * PS1: 320×240 to 640×480. Often ran at 30fps. Low-poly 3D era.
   * Phaser 4 is 2D — simulate PS1 look with heavy dithering.
   */
  ps1: {
    era: 'ps1',
    season: 4,
    label: 'PS1 / N64 (1995)',
    width: 320,
    height: 240,
    zoom: 3,
    fps: 30,
    backgroundColor: '#1a1a2e',
    renderConfig: { pixelArt: true, antialias: false, roundPixels: true },
    scaleConfig: baseScale(320, 240, 3),
    filters: {
      quantize: { steps: [64, 64, 64, 64], dither: true, mode: 0 },
      vignette: { radius: 0.6, strength: 0.15, color: 0x000000 },
    },
    physics: { default: 'arcade', arcade: { gravity: { y: 400 }, debug: false } },
  },

  /**
   * Season 5 — PS2 / Xbox (2000–2005)
   * PS2: 512×384 interlaced. Full color, dynamic lighting era.
   * pixelArt disabled — smoothed textures appropriate from this era onward.
   */
  ps2: {
    era: 'ps2',
    season: 5,
    label: 'PS2 / Xbox (2000)',
    width: 512,
    height: 384,
    zoom: 2,
    fps: 60,
    backgroundColor: '#0d0d1a',
    renderConfig: { pixelArt: false, antialias: true, roundPixels: false },
    scaleConfig: baseScale(512, 384, 2),
    filters: {
      vignette: { radius: 0.55, strength: 0.12, color: 0x000000 },
    },
    physics: { default: 'arcade', arcade: { gravity: { y: 500 }, debug: false } },
  },

  /**
   * Season 6 — PS3 / Xbox 360 (2005–2013)
   * 720p HD: 1280×720. HDR-like bloom/glow. Cinematic framing.
   */
  ps3: {
    era: 'ps3',
    season: 6,
    label: 'PS3 / Xbox 360 (2005)',
    width: 640,
    height: 360,
    zoom: 2,
    fps: 60,
    backgroundColor: '#080818',
    renderConfig: { pixelArt: false, antialias: true, roundPixels: false },
    scaleConfig: baseScale(640, 360, 2),
    filters: {
      vignette: { radius: 0.5, strength: 0.1, color: 0x000000 },
      glow:     { color: 0x4466aa, strength: 0.15, outerStrength: 0.08 },
    },
    physics: { default: 'arcade', arcade: { gravity: { y: 500 }, debug: false } },
  },

  /**
   * Season 7 — PS4 / Xbox One (2013–2020)
   * 1080p capable. Open-level design, companion AI, crafting systems.
   */
  ps4: {
    era: 'ps4',
    season: 7,
    label: 'PS4 / Xbox One (2013)',
    width: 640,
    height: 360,
    zoom: 2,
    fps: 60,
    backgroundColor: '#06060f',
    renderConfig: { pixelArt: false, antialias: true, roundPixels: false },
    scaleConfig: baseScale(640, 360, 2),
    filters: {
      vignette: { radius: 0.45, strength: 0.08, color: 0x000000 },
      glow:     { color: 0x2244cc, strength: 0.1, outerStrength: 0.05 },
    },
    physics: { default: 'arcade', arcade: { gravity: { y: 600 }, debug: false } },
  },

  /**
   * Season 8 — Current Gen (2020+)
   * PS5 / XSX era. Maximum fidelity. 4-character hot-swap, ultimate abilities.
   * Native at 960×540 ×2 zoom = 1920×1080 display.
   */
  currentGen: {
    era: 'currentGen',
    season: 8,
    label: 'Current Gen (2020+)',
    width: 960,
    height: 540,
    zoom: 2,
    fps: 60,
    backgroundColor: '#040408',
    renderConfig: { pixelArt: false, antialias: true, roundPixels: false },
    scaleConfig: baseScale(960, 540, 2),
    filters: {
      vignette: { radius: 0.4, strength: 0.05, color: 0x000000 },
    },
    physics: { default: 'arcade', arcade: { gravity: { y: 600 }, debug: false } },
  },
};

/** Look up an era config by key string (e.g., 'nes', 'ps1'). */
export const getEra = (key) => EraConfigs[key] ?? null;

/** Look up an era config by season number (1–8+). */
export const getEraBySeasonNumber = (n) =>
  Object.values(EraConfigs).find((c) => c.season === n) ?? null;
