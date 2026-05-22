import BaseScene from '@shared/phaser/BaseScene.js';
import { ERA } from '../config.js';

export default class GameScene extends BaseScene {
  constructor() {
    super('GameScene', ERA);
  }

  create() {
    super.create(); // applies retro filters

    // Tiled map:
    // const map = this.make.tilemap({ key: 'level1' });
    // const tileset = map.addTilesetImage('tileset-name', 'tileset');
    // const ground = map.createLayer('Ground', tileset, 0, 0);
    // const colliders = map.createLayer('Colliders', tileset, 0, 0);
    // colliders.setCollisionByProperty({ collides: true });

    // Aseprite sprite with animation:
    // this.anims.create({
    //   key: 'walk',
    //   frames: this.anims.generateFrameNames('sprites', { prefix: 'player_walk_', start: 0, end: 7 }),
    //   frameRate: 8,
    //   repeat: -1,
    // });
    // this.player = this.add.sprite(ERA.width / 2, ERA.height / 2, 'sprites', 'player_idle_0');

    this.cursors = this.input.keyboard.createCursorKeys();
  }

  update(time, delta) {
    super.update(time, delta);
    // Game logic here
  }
}
