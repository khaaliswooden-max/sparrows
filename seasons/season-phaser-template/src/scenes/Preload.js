import BaseScene from '@shared/phaser/BaseScene.js';
import { ERA } from '../config.js';

export default class Preload extends BaseScene {
  constructor() {
    super('Preload', ERA);
  }

  preload() {
    // Aseprite atlas exports:
    // this.load.atlas('sprites', 'assets/sprites/spritesheet.png', 'assets/sprites/spritesheet.json');

    // Tiled JSON tilemaps:
    // this.load.tilemapTiledJSON('level1', 'assets/tilemaps/level1.json');
    // this.load.image('tileset', 'assets/tilesets/tiles.png');

    // Audio:
    // this.load.audio('bgm', ['assets/audio/theme.ogg', 'assets/audio/theme.mp3']);
  }

  create() {
    this.scene.start('GameScene');
  }
}
