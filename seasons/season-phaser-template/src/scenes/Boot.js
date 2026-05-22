import BaseScene from '@shared/phaser/BaseScene.js';
import { ERA } from '../config.js';

export default class Boot extends BaseScene {
  constructor() {
    super('Boot', ERA);
  }

  create() {
    super.create(); // applies ERA.filters to camera
    this.scene.start('Preload');
  }
}
