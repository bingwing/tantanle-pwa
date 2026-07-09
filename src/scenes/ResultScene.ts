import Phaser from 'phaser';
import { APP_WIDTH } from '../game/config';
import { LEVELS } from '../game/levels';
import { addButton } from './ui';

export class ResultScene extends Phaser.Scene {
  private levelId = 1;
  private won = false;
  private score = 0;
  private stars = 0;
  private nextLevelId?: number;

  constructor() {
    super('ResultScene');
  }

  init(data: { levelId: number; won: boolean; score: number; stars: number }): void {
    this.levelId = data.levelId;
    this.won = data.won;
    this.score = data.score;
    this.stars = data.stars;
    this.nextLevelId = LEVELS.find((level) => level.id === this.levelId + 1)?.id;
  }

  create(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x8ed8ff, 0xdff6ff, 0xfff0b5, 0xffffff, 1);
    bg.fillRect(0, 0, 900, 1200);
    if (this.won) {
      this.addVictorySparkles();
    }
    this.add
      .text(APP_WIDTH / 2, 260, this.won ? '甜甜胜利' : '再来一次', {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '68px',
        color: '#2e4057',
        fontStyle: '900',
        stroke: '#ffffff',
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(APP_WIDTH / 2, 380, this.won ? '★'.repeat(this.stars) + '☆'.repeat(3 - this.stars) : '换个角度试试', {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '62px',
        color: '#ffcf4d',
        fontStyle: '900',
        stroke: '#2e4057',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.add
      .text(APP_WIDTH / 2, 482, `分数 ${this.score}`, {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '34px',
        color: '#44627d',
        fontStyle: '800',
      })
      .setOrigin(0.5);

    if (this.won && this.nextLevelId) {
      addButton(this, APP_WIDTH / 2, 650, 310, 78, '下一关', () => this.scene.start('GameScene', { levelId: this.nextLevelId }));
      addButton(this, APP_WIDTH / 2, 760, 310, 78, '再玩一次', () => this.scene.start('GameScene', { levelId: this.levelId }));
      addButton(this, APP_WIDTH / 2, 870, 310, 78, '选关', () => this.scene.start('LevelScene'));
      return;
    }

    addButton(this, APP_WIDTH / 2, 680, 310, 78, '再玩一次', () => this.scene.start('GameScene', { levelId: this.levelId }));
    addButton(this, APP_WIDTH / 2, 790, 310, 78, '选关', () => this.scene.start('LevelScene'));
  }

  private addVictorySparkles(): void {
    for (let i = 0; i < 24; i += 1) {
      const x = 100 + ((i * 137) % 700);
      const y = 120 + ((i * 91) % 760);
      const sparkle = this.add
        .star(x, y, 5, 8, 22, i % 2 === 0 ? 0xffcf4d : 0xff6f91, 0.72)
        .setStrokeStyle(3, 0xffffff, 0.82)
        .setDepth(1);

      this.tweens.add({
        targets: sparkle,
        angle: 360,
        scale: { from: 0.8, to: 1.22 },
        alpha: { from: 0.35, to: 0.95 },
        duration: 820 + (i % 4) * 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
  }
}
