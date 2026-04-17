import Phaser from 'phaser';
import { applyRetroFilters } from './RetroFilters.js';

/**
 * BaseScene — Extended Phaser.Scene with Sparrows-specific lifecycle.
 *
 * All future Phaser 4 seasons extend this instead of Phaser.Scene directly.
 * Automatically applies the era's retro filter stack in create() and exposes
 * this.era for easy access to hardware constraint values.
 *
 * Usage:
 *   import BaseScene from '@shared/phaser/BaseScene.js';
 *   import { EraConfigs } from '@shared/phaser/EraConfigs.js';
 *
 *   export default class MyScene extends BaseScene {
 *     constructor() { super('MyScene', EraConfigs.nes); }
 *     create() { super.create(); ... }
 *   }
 */
export default class BaseScene extends Phaser.Scene {
  /**
   * @param {string} key - Phaser scene key
   * @param {import('./EraConfigs.js').EraConfig} eraConfig
   */
  constructor(key, eraConfig) {
    super({ key });
    this.era = eraConfig;
  }

  /**
   * Applies era filters to the main camera. Call super.create() first in subclasses.
   */
  create() {
    if (this.era?.filters) {
      applyRetroFilters(this.cameras.main, this.era.filters);
    }

    if (import.meta.env.DEV) {
      this.input.keyboard.addKey('F1').on('down', () => {
        if (this.physics?.world?.debugGraphic) {
          this.physics.world.debugGraphic.visible = !this.physics.world.debugGraphic.visible;
        }
      });
    }
  }

  update(time, delta) {}
}
