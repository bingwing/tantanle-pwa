import Phaser from 'phaser';
import { CandyAudio } from '../game/audio';
import { loadSave } from '../game/save';
import { LEVELS } from '../game/levels';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    createCircleTexture(this, 'candy-ball', 72, 0xffcf4d, 0x2e4057, 'classic');
    createCircleTexture(this, 'candy-ball-heavy', 76, 0xb66dff, 0x2e4057, 'heavy');
    createCircleTexture(this, 'candy-ball-bouncy', 68, 0x58d9ff, 0x2e4057, 'bouncy');
    createCircleTexture(this, 'candy-ball-blast', 74, 0xff7a59, 0x2e4057, 'blast');
    createCircleTexture(this, 'candy-ball-split', 74, 0x54d6bf, 0x2e4057, 'split');
    createCircleTexture(this, 'target-jar', 74, 0xff6f91, 0x2e4057);
    createTreasureChestTexture(this, 'treasure-chest', false);
    createTreasureChestTexture(this, 'treasure-chest-cracked', true);
    createCircleTexture(this, 'spark', 18, 0xffffff, 0xffffff);
    createCircleTexture(this, 'candy-firework', 22, 0xff6f91, 0xffffff);
    createStarTexture(this, 'bonus-star', 76);
    createBombTexture(this, 'frosting-bomb', 70);
    createBumperTexture(this, 'bounce-pad', 148, 42);
    createPortalTexture(this, 'rainbow-portal', 96);
    createBlockTexture(this, 'block-wood', 120, 38, 0xd99545, 0x8b5a3c, drawWoodGrain);
    createBlockTexture(this, 'block-glass', 120, 38, 0x87e8ff, 0x2e9fbd, drawGlassShine);
    createBlockTexture(this, 'block-stone', 120, 38, 0xa7adb8, 0x68717f, drawStoneSpeckles);
    createBlockTexture(this, 'block-jelly', 120, 38, 0x7fe3a1, 0x2e8e57, drawJellyBubbles);
    const save = loadSave(window.localStorage, LEVELS);
    this.registry.set('save', save);
    this.registry.set('audio', new CandyAudio(save.soundEnabled));
    this.scene.start('MenuScene');
  }
}

function createCircleTexture(
  scene: Phaser.Scene,
  key: string,
  size: number,
  fill: number,
  stroke: number,
  pattern: 'classic' | 'heavy' | 'bouncy' | 'blast' | 'split' = 'classic',
): void {
  const graphics = scene.add.graphics();
  graphics.fillStyle(fill, 1);
  graphics.fillCircle(size / 2, size / 2, size * 0.42);
  graphics.lineStyle(7, stroke, 0.9);
  graphics.strokeCircle(size / 2, size / 2, size * 0.42);
  graphics.fillStyle(0xffffff, 0.55);
  graphics.fillCircle(size * 0.36, size * 0.32, size * 0.12);
  if (pattern === 'heavy') {
    graphics.lineStyle(5, 0xffffff, 0.42);
    graphics.lineBetween(size * 0.28, size * 0.58, size * 0.72, size * 0.58);
    graphics.lineBetween(size * 0.36, size * 0.7, size * 0.64, size * 0.7);
  }
  if (pattern === 'bouncy') {
    graphics.lineStyle(5, 0xffffff, 0.46);
    graphics.strokeCircle(size * 0.5, size * 0.5, size * 0.24);
    graphics.strokeCircle(size * 0.5, size * 0.5, size * 0.12);
  }
  if (pattern === 'blast') {
    graphics.lineStyle(5, 0xffffff, 0.5);
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      graphics.lineBetween(
        size / 2 + Math.cos(angle) * size * 0.12,
        size / 2 + Math.sin(angle) * size * 0.12,
        size / 2 + Math.cos(angle) * size * 0.3,
        size / 2 + Math.sin(angle) * size * 0.3,
      );
    }
    graphics.fillStyle(0xffcf4d, 0.92);
    graphics.fillCircle(size * 0.5, size * 0.5, size * 0.13);
  }
  if (pattern === 'split') {
    graphics.lineStyle(5, 0xffffff, 0.82);
    for (const degrees of [-90, 30, 150]) {
      const angle = (degrees * Math.PI) / 180;
      graphics.lineBetween(
        size / 2 + Math.cos(angle) * size * 0.1,
        size / 2 + Math.sin(angle) * size * 0.1,
        size / 2 + Math.cos(angle) * size * 0.3,
        size / 2 + Math.sin(angle) * size * 0.3,
      );
    }
    graphics.fillStyle(0xffcf4d, 0.94);
    graphics.fillCircle(size * 0.5, size * 0.5, size * 0.14);
  }
  graphics.generateTexture(key, size, size);
  graphics.destroy();
}

function createTreasureChestTexture(scene: Phaser.Scene, key: string, cracked: boolean): void {
  const width = 118;
  const height = 92;
  const graphics = scene.add.graphics();
  graphics.fillStyle(0x2e4057, 1);
  graphics.fillRoundedRect(1, 8, width - 2, height - 9, 14);
  graphics.fillStyle(0xffcf4d, 1);
  graphics.fillRoundedRect(8, 15, width - 16, 67, 8);
  graphics.fillStyle(0xff8a3d, 1);
  graphics.fillRoundedRect(8, 49, width - 16, 33, 6);
  graphics.lineStyle(5, 0x2e4057, 0.92);
  graphics.lineBetween(7, 48, width - 7, 48);
  graphics.lineBetween(27, 16, 27, 81);
  graphics.lineBetween(width - 27, 16, width - 27, 81);
  graphics.fillStyle(0xffffff, 0.52);
  graphics.fillRoundedRect(14, 20, 48, 8, 4);
  graphics.fillStyle(0x2e4057, 1);
  graphics.fillRoundedRect(width / 2 - 13, 37, 26, 34, 7);
  graphics.fillStyle(0x58d9ff, 1);
  graphics.fillCircle(width / 2, 53, 8);
  graphics.fillStyle(0xffffff, 0.72);
  graphics.fillCircle(width / 2 - 3, 50, 2.5);

  if (cracked) {
    graphics.lineStyle(6, 0x2e4057, 1);
    graphics.lineBetween(82, 16, 72, 32);
    graphics.lineBetween(72, 32, 84, 42);
    graphics.lineBetween(84, 42, 73, 57);
    graphics.lineBetween(73, 57, 83, 70);
    graphics.lineStyle(3, 0xffffff, 0.72);
    graphics.lineBetween(86, 18, 77, 31);
  }

  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

function createBlockTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  fill: number,
  stroke: number,
  decorate: (graphics: Phaser.GameObjects.Graphics, width: number, height: number) => void,
): void {
  const graphics = scene.add.graphics();
  graphics.fillStyle(fill, 1);
  graphics.fillRoundedRect(0, 0, width, height, 8);
  decorate(graphics, width, height);
  graphics.lineStyle(5, stroke, 0.78);
  graphics.strokeRoundedRect(0, 0, width, height, 8);
  graphics.lineStyle(3, 0xffffff, 0.28);
  graphics.lineBetween(14, 10, width - 14, 10);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

function createStarTexture(scene: Phaser.Scene, key: string, size: number): void {
  const graphics = scene.add.graphics();
  graphics.fillStyle(0xffcf4d, 1);
  graphics.lineStyle(6, 0x2e4057, 0.9);
  const points = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? size * 0.42 : size * 0.19;
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 10;
    points.push(new Phaser.Math.Vector2(size / 2 + Math.cos(angle) * radius, size / 2 + Math.sin(angle) * radius));
  }
  graphics.fillPoints(points, true);
  graphics.strokePoints(points, true);
  graphics.fillStyle(0xffffff, 0.55);
  graphics.fillCircle(size * 0.42, size * 0.33, size * 0.08);
  graphics.generateTexture(key, size, size);
  graphics.destroy();
}

function createBombTexture(scene: Phaser.Scene, key: string, size: number): void {
  const graphics = scene.add.graphics();
  graphics.fillStyle(0xff8fb3, 1);
  graphics.fillCircle(size / 2, size / 2, size * 0.36);
  graphics.lineStyle(7, 0x2e4057, 0.9);
  graphics.strokeCircle(size / 2, size / 2, size * 0.36);
  graphics.fillStyle(0xffffff, 0.65);
  graphics.fillCircle(size * 0.38, size * 0.35, size * 0.1);
  graphics.lineStyle(5, 0xffcf4d, 1);
  graphics.lineBetween(size * 0.62, size * 0.18, size * 0.78, size * 0.06);
  graphics.fillStyle(0xffcf4d, 1);
  graphics.fillCircle(size * 0.8, size * 0.05, size * 0.06);
  graphics.generateTexture(key, size, size);
  graphics.destroy();
}

function createBumperTexture(scene: Phaser.Scene, key: string, width: number, height: number): void {
  const graphics = scene.add.graphics();
  graphics.fillStyle(0xff6f91, 1);
  graphics.fillRoundedRect(0, 0, width, height, 18);
  graphics.fillStyle(0xffcf4d, 1);
  graphics.fillRoundedRect(10, 7, width - 20, height - 14, 12);
  graphics.lineStyle(6, 0x2e4057, 0.82);
  graphics.strokeRoundedRect(0, 0, width, height, 18);
  graphics.lineStyle(4, 0xffffff, 0.62);
  for (let i = 0; i < 5; i += 1) {
    graphics.lineBetween(22 + i * 18, 8, 12 + i * 18, height - 8);
  }
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

function createPortalTexture(scene: Phaser.Scene, key: string, size: number): void {
  const graphics = scene.add.graphics();
  const center = size / 2;
  graphics.fillStyle(0x2e4057, 1);
  graphics.fillCircle(center, center, size * 0.47);
  graphics.fillStyle(0x58d9ff, 1);
  graphics.fillCircle(center, center, size * 0.4);
  graphics.fillStyle(0xffffff, 1);
  graphics.fillCircle(center, center, size * 0.31);
  graphics.fillStyle(0xff6f91, 1);
  graphics.fillCircle(center, center, size * 0.23);
  graphics.fillStyle(0xffcf4d, 1);
  graphics.fillCircle(center, center, size * 0.12);
  graphics.lineStyle(5, 0xffffff, 0.78);
  for (let index = 0; index < 4; index += 1) {
    const angle = (Math.PI * 2 * index) / 4;
    graphics.lineBetween(
      center + Math.cos(angle) * size * 0.29,
      center + Math.sin(angle) * size * 0.29,
      center + Math.cos(angle) * size * 0.39,
      center + Math.sin(angle) * size * 0.39,
    );
  }
  graphics.generateTexture(key, size, size);
  graphics.destroy();
}

function drawWoodGrain(graphics: Phaser.GameObjects.Graphics, width: number, height: number): void {
  graphics.lineStyle(3, 0x8b5a3c, 0.28);
  graphics.lineBetween(12, height * 0.42, width - 12, height * 0.28);
  graphics.lineBetween(18, height * 0.7, width - 18, height * 0.58);
  graphics.fillStyle(0x8b5a3c, 0.22);
  graphics.fillEllipse(width * 0.68, height * 0.54, 24, 10);
}

function drawGlassShine(graphics: Phaser.GameObjects.Graphics, width: number, height: number): void {
  graphics.fillStyle(0xffffff, 0.36);
  graphics.fillRoundedRect(12, 8, width * 0.34, 8, 4);
  graphics.fillStyle(0x2e9fbd, 0.18);
  graphics.fillTriangle(width * 0.55, 4, width * 0.82, 4, width * 0.66, height - 5);
}

function drawStoneSpeckles(graphics: Phaser.GameObjects.Graphics, width: number, height: number): void {
  graphics.fillStyle(0x68717f, 0.28);
  for (let i = 0; i < 8; i += 1) {
    graphics.fillCircle(14 + i * 13, 12 + (i % 3) * 7, 2 + (i % 2));
  }
  graphics.lineStyle(2, 0x68717f, 0.22);
  graphics.lineBetween(width * 0.18, height * 0.72, width * 0.42, height * 0.52);
  graphics.lineBetween(width * 0.58, height * 0.35, width * 0.82, height * 0.62);
}

function drawJellyBubbles(graphics: Phaser.GameObjects.Graphics, width: number, height: number): void {
  graphics.fillStyle(0xffffff, 0.28);
  graphics.fillCircle(width * 0.18, height * 0.42, 5);
  graphics.fillCircle(width * 0.4, height * 0.66, 4);
  graphics.fillCircle(width * 0.78, height * 0.36, 6);
}
