import Phaser from 'phaser';
import { ERA } from './config.js';
import Boot      from './scenes/Boot.js';
import Preload   from './scenes/Preload.js';
import GameScene from './scenes/GameScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  width: ERA.width,
  height: ERA.height,
  backgroundColor: ERA.backgroundColor,
  render: ERA.renderConfig,
  scale: ERA.scaleConfig,
  fps: { target: ERA.fps, forceSetTimeOut: false },
  physics: ERA.physics,
  scene: [Boot, Preload, GameScene],
});
