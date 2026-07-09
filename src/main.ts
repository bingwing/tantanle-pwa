import Phaser from 'phaser';
import './style.css';
import { APP_HEIGHT, APP_WIDTH } from './game/config';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { LevelScene } from './scenes/LevelScene';
import { MenuScene } from './scenes/MenuScene';
import { ResultScene } from './scenes/ResultScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: APP_WIDTH,
  height: APP_HEIGHT,
  backgroundColor: '#8ed8ff',
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 1.05 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: APP_WIDTH,
    height: APP_HEIGHT,
  },
  scene: [BootScene, MenuScene, LevelScene, GameScene, ResultScene],
};

new Phaser.Game(config);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((error: unknown) => {
      console.warn('Failed to register tantanle service worker.', error);
    });
  });
}
