/**
 * RetroFilters.js — Phaser 4 camera filter helpers for the Sparrows era system.
 *
 * Phaser 4 camera filter API:
 *   camera.filters.internal  — pre-render (applied before scene draws)
 *   camera.filters.external  — post-render (applied after scene draws)
 *
 * Filters are per-scene-camera. Re-apply them in each scene's create().
 * BaseScene.create() calls applyRetroFilters() automatically when given an EraConfig.
 */

/**
 * Apply the full filter stack described by an EraConfig.filters object.
 *
 * @param {Phaser.Cameras.Scene2D.Camera} camera
 * @param {object} filtersDescriptor - from EraConfigs[era].filters
 * @returns {object} Applied filter instances keyed by filter name
 */
export function applyRetroFilters(camera, filtersDescriptor) {
  const applied = {};

  if (filtersDescriptor.blocky) {
    applied.blocky = camera.filters.internal.addBlocky(filtersDescriptor.blocky);
  }
  if (filtersDescriptor.quantize) {
    applied.quantize = camera.filters.external.addQuantize(filtersDescriptor.quantize);
  }
  if (filtersDescriptor.vignette) {
    applied.vignette = camera.filters.external.addVignette(filtersDescriptor.vignette);
  }
  if (filtersDescriptor.glow) {
    applied.glow = camera.filters.external.addGlow(filtersDescriptor.glow);
  }
  if (filtersDescriptor.gradientMap) {
    applied.gradientMap = camera.filters.external.addGradientMap(filtersDescriptor.gradientMap);
  }

  return applied;
}

/**
 * Remove all filters from a camera. Use when transitioning between filter presets.
 *
 * @param {Phaser.Cameras.Scene2D.Camera} camera
 */
export function clearRetroFilters(camera) {
  camera.filters.internal.clear?.();
  camera.filters.external.clear?.();
}

/**
 * Quick CRT approximation: Quantize (color crush) + Vignette (edge falloff).
 * Not a true scanline shader, but period-appropriate within Phaser 4's built-in system.
 *
 * @param {Phaser.Cameras.Scene2D.Camera} camera
 * @param {number} [intensity=0.3] - 0 (none) to 1 (heavy)
 */
export function applyCRTApproximation(camera, intensity = 0.3) {
  camera.filters.external.addQuantize({ steps: [8, 8, 8, 8], dither: false });
  camera.filters.external.addVignette({ radius: 0.7, strength: intensity, color: 0x000000 });
}

/**
 * Modern-gen bloom/glow for Season 6–8 style.
 *
 * @param {Phaser.Cameras.Scene2D.Camera} camera
 * @param {number} [color=0x4466aa]
 * @param {number} [strength=0.15]
 */
export function applyModernGlow(camera, color = 0x4466aa, strength = 0.15) {
  camera.filters.external.addGlow({
    color,
    strength,
    outerStrength: strength * 0.5,
  });
}
